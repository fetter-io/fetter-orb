use chrono::Utc;
use fetter::{DirectURL, Package, PathShared, ScanFS, SystemTag, VcsInfo, VersionSpec};
use sqlx::types::chrono::DateTime;
use sqlx::{Arguments, Executor, PgPool, Row, postgres::PgArguments};
use std::collections::HashMap;
use std::collections::HashSet;

use std::time::Duration;
use std::time::UNIX_EPOCH;

pub struct DBContext {
    pub pool: PgPool,
    suffix: Option<String>,
}

impl DBContext {
    pub fn new<S: Into<String>>(pool: PgPool, suffix: Option<S>) -> Self {
        let suffix = suffix.map(|s| s.into());
        Self { pool, suffix }
    }

    fn get_table(&self, root: &str) -> String {
        match &self.suffix {
            Some(sfx) => format!("{}_{}", root, sfx),
            None => root.to_string(),
        }
    }

    pub async fn tables_create(&self) -> Result<(), sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let monitor_scan_table = self.get_table("monitor_scan");

        let create_system_tag = format!(
            r#"
            CREATE TABLE IF NOT EXISTS {system_tag_table} (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                hostname TEXT NOT NULL,
                os_name TEXT NOT NULL,
                os_version TEXT NOT NULL,
                architecture TEXT NOT NULL,
                logical_cores SMALLINT NOT NULL
            );
            "#
        );

        let create_package = format!(
            r#"
            CREATE TABLE IF NOT EXISTS {package_table} (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                key TEXT NOT NULL,
                version TEXT NOT NULL,
                url TEXT,
                commit_id VARCHAR(40),
                vcs TEXT,
                revision TEXT
            );
            "#
        );

        let create_site_packages = format!(
            r#"
            CREATE TABLE IF NOT EXISTS {site_packages_table} (
                id SERIAL PRIMARY KEY,
                path TEXT UNIQUE NOT NULL
            );
            "#
        );

        let create_monitor_scan = format!(
            r#"
            CREATE TABLE IF NOT EXISTS {monitor_scan_table} (
                system_tag_id INTEGER NOT NULL REFERENCES {system_tag_table}(id) ON DELETE RESTRICT,
                package_id INTEGER NOT NULL REFERENCES {package_table}(id) ON DELETE RESTRICT,
                site_packages_id INTEGER NOT NULL REFERENCES {site_packages_table}(id) ON DELETE RESTRICT,
                timestamp TIMESTAMPTZ NOT NULL,
                PRIMARY KEY (system_tag_id, package_id, site_packages_id, timestamp)
            );
            "#
        );

        self.pool.execute(&*create_system_tag).await?;
        self.pool.execute(&*create_package).await?;
        self.pool.execute(&*create_site_packages).await?;
        self.pool.execute(&*create_monitor_scan).await?;

        Ok(())
    }

    pub async fn tables_drop(&self) -> Result<(), sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let monitor_scan_table = self.get_table("monitor_scan");

        let drop_monitor_scan = format!(r#"DROP TABLE IF EXISTS {monitor_scan_table};"#);
        let drop_site_packages = format!(r#"DROP TABLE IF EXISTS {site_packages_table};"#);
        let drop_package = format!(r#"DROP TABLE IF EXISTS {package_table};"#);
        let drop_system_tag = format!(r#"DROP TABLE IF EXISTS {system_tag_table};"#);

        self.pool.execute(&*drop_monitor_scan).await?;
        self.pool.execute(&*drop_site_packages).await?;
        self.pool.execute(&*drop_package).await?;
        self.pool.execute(&*drop_system_tag).await?;

        Ok(())
    }
    //--------------------------------------------------------------------------
    pub async fn system_tag_insert_or_get(&self, tag: &SystemTag) -> Result<i32, sqlx::Error> {
        let table_name = self.get_table("system_tag");

        let query = format!(
            r#"
            SELECT id FROM {table_name}
            WHERE username = $1 AND hostname = $2 AND os_name = $3 AND os_version = $4
              AND architecture = $5 AND logical_cores = $6
            "#
        );

        if let Some(row) = sqlx::query(&query)
            .bind(&tag.username)
            .bind(&tag.hostname)
            .bind(&tag.os_name)
            .bind(&tag.os_version)
            .bind(&tag.architecture)
            .bind(tag.logical_cores as i32) // usize to i32
            .fetch_optional(&self.pool)
            .await?
        {
            return Ok(row.get("id"));
        }

        let insert_query = format!(
            r#"
            INSERT INTO {table_name}
            (username, hostname, os_name, os_version, architecture, logical_cores)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            "#
        );

        let row = sqlx::query(&insert_query)
            .bind(&tag.username)
            .bind(&tag.hostname)
            .bind(&tag.os_name)
            .bind(&tag.os_version)
            .bind(&tag.architecture)
            .bind(tag.logical_cores as i32)
            .fetch_one(&self.pool)
            .await?;

        Ok(row.get("id"))
    }

    pub async fn system_tag_from_id(&self, id: i32) -> Result<Option<SystemTag>, sqlx::Error> {
        let table_name = self.get_table("system_tag");

        let query = format!(
            r#"
            SELECT username, hostname, os_name, os_version, architecture, logical_cores
            FROM {table_name}
            WHERE id = $1
            "#
        );

        if let Some(row) = sqlx::query(&query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
        {
            Ok(Some(SystemTag {
                username: row.get("username"),
                hostname: row.get("hostname"),
                os_name: row.get("os_name"),
                os_version: row.get("os_version"),
                architecture: row.get("architecture"),
                logical_cores: row.get::<i16, _>("logical_cores") as usize,
            }))
        } else {
            Ok(None)
        }
    }

    //--------------------------------------------------------------------------
    pub async fn package_insert_or_get(&self, package: &Package) -> Result<i32, sqlx::Error> {
        let table_name = self.get_table("package");

        let version = package.version.to_string();
        let url = package.direct_url.as_ref().map(|d| d.url.as_str());

        let vcs_info = package
            .direct_url
            .as_ref()
            .and_then(|d| d.vcs_info.as_ref());

        let commit_id = vcs_info.map(|v| v.commit_id.as_str());
        let vcs = vcs_info.map(|v| v.vcs.as_str());
        let revision = vcs_info.and_then(|v| v.revision.as_deref());

        let query = format!(
            r#"
            SELECT id FROM {table_name}
            WHERE name = $1 AND key = $2 AND version = $3
              AND url IS NOT DISTINCT FROM $4
              AND commit_id IS NOT DISTINCT FROM $5
              AND vcs IS NOT DISTINCT FROM $6
              AND revision IS NOT DISTINCT FROM $7
            "#
        );

        if let Some(row) = sqlx::query(&query)
            .bind(&package.name)
            .bind(&package.key)
            .bind(&version)
            .bind(url)
            .bind(commit_id)
            .bind(vcs)
            .bind(revision)
            .fetch_optional(&self.pool)
            .await?
        {
            return Ok(row.get("id"));
        }

        let insert_query = format!(
            r#"
            INSERT INTO {table_name} (
                name, key, version, url, commit_id, vcs, revision
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            "#
        );

        let row = sqlx::query(&insert_query)
            .bind(&package.name)
            .bind(&package.key)
            .bind(&version)
            .bind(url)
            .bind(commit_id)
            .bind(vcs)
            .bind(revision)
            .fetch_one(&self.pool)
            .await?;

        Ok(row.get("id"))
    }

    pub async fn package_from_id(&self, id: i32) -> Result<Option<Package>, sqlx::Error> {
        let table_name = self.get_table("package");

        let query = format!(
            r#"
            SELECT name, key, version, url, commit_id, vcs, revision
            FROM {table_name}
            WHERE id = $1
            "#
        );

        if let Some(row) = sqlx::query(&query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
        {
            let name: String = row.get("name");
            let key: String = row.get("key");
            let version_str: String = row.get("version");
            let version = VersionSpec::new(&version_str);

            let url: Option<String> = row.get("url");
            let commit_id: Option<String> = row.get("commit_id");
            let vcs: Option<String> = row.get("vcs");
            let revision: Option<String> = row.get("revision");

            let direct_url = url.map(|url_val| {
                let vcs_info = match (commit_id, vcs) {
                    (Some(commit_id), Some(vcs)) => Some(VcsInfo {
                        commit_id,
                        vcs,
                        revision,
                    }),
                    _ => None,
                };
                DirectURL {
                    url: url_val,
                    vcs_info,
                }
            });

            Ok(Some(Package {
                name,
                key,
                version,
                direct_url,
            }))
        } else {
            Ok(None)
        }
    }
    //--------------------------------------------------------------------------
    pub async fn site_packages_insert_or_get(&self, fp: PathShared) -> Result<i32, sqlx::Error> {
        let table_name = self.get_table("site_packages");
        let path_str = fp.to_string();

        let query = format!("SELECT id FROM {table_name} WHERE path = $1");

        if let Some(row) = sqlx::query(&query)
            .bind(&path_str)
            .fetch_optional(&self.pool)
            .await?
        {
            return Ok(row.get("id"));
        }

        let insert_query = format!("INSERT INTO {table_name} (path) VALUES ($1) RETURNING id");

        let row = sqlx::query(&insert_query)
            .bind(&path_str)
            .fetch_one(&self.pool)
            .await?;

        Ok(row.get("id"))
    }

    pub async fn site_packages_from_id(&self, id: i32) -> Result<Option<PathShared>, sqlx::Error> {
        let table_name = self.get_table("site_packages");

        let query = format!("SELECT path FROM {table_name} WHERE id = $1");

        if let Some(row) = sqlx::query(&query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
        {
            let path: String = row.get("path");
            Ok(Some(PathShared::from(path.as_str())))
        } else {
            Ok(None)
        }
    }
    //--------------------------------------------------------------------------
    pub async fn monitor_scan_load(
        &self,
        scan_fs: &ScanFS,
        st_id: i32,
        ts: &Duration,
    ) -> Result<(), sqlx::Error> {
        let table_name = self.get_table("monitor_scan");
        let timestamp: DateTime<Utc> = (UNIX_EPOCH + *ts).into();

        for (pkg, sites) in scan_fs.package_to_sites.iter() {
            let pkg_id = self.package_insert_or_get(pkg).await?;

            for sp in sites.iter() {
                let sp_id = self.site_packages_insert_or_get(sp.clone()).await?;

                let insert_query = format!(
                    r#"
                    INSERT INTO {table_name} (system_tag_id, package_id, site_packages_id, timestamp)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                    "#
                );

                sqlx::query(&insert_query)
                    .bind(st_id)
                    .bind(pkg_id)
                    .bind(sp_id)
                    .bind(timestamp)
                    .execute(&self.pool)
                    .await?;
            }
        }

        Ok(())
    }

    pub async fn monitor_scan_load_from_json(&self, payload: &str) -> Result<(), sqlx::Error> {
        let (st, scan_fs, ts): (SystemTag, ScanFS, Duration) =
            serde_json::from_str(payload).expect("Invalid JSON payload");

        let st_id = self.system_tag_insert_or_get(&st).await?;
        self.monitor_scan_load(&scan_fs, st_id, &ts).await
    }

    pub async fn monitor_scan_site_to_packages(
        &self,
        timestamp_filter: Option<DateTime<Utc>>,
    ) -> Result<HashMap<i32, HashMap<i32, Vec<i32>>>, sqlx::Error> {
        let table_name = self.get_table("monitor_scan");

        let mut query = format!(
            r#"
            SELECT system_tag_id, site_packages_id, package_id
            FROM {table_name}
            "#
        );

        let rows = if let Some(ts) = timestamp_filter {
            query.push_str("WHERE timestamp >= $1");
            sqlx::query(&query).bind(ts).fetch_all(&self.pool).await?
        } else {
            sqlx::query(&query).fetch_all(&self.pool).await?
        };

        let mut map: HashMap<i32, HashMap<i32, Vec<i32>>> = HashMap::new();

        for row in rows {
            let system_tag_id: i32 = row.get("system_tag_id");
            let site_packages_id: i32 = row.get("site_packages_id");
            let package_id: i32 = row.get("package_id");

            map.entry(system_tag_id)
                .or_default()
                .entry(site_packages_id)
                .or_default()
                .push(package_id);
        }

        Ok(map)
    }

    pub async fn monitor_scan_get_packages(
        &self,
        system_tag_ids: &HashSet<i32>,
        timestamp_filter: Option<DateTime<Utc>>,
    ) -> Result<HashSet<i32>, sqlx::Error> {
        if system_tag_ids.is_empty() {
            return Ok(HashSet::new());
        }

        let table_name = self.get_table("monitor_scan");

        let mut placeholders = Vec::with_capacity(system_tag_ids.len());
        let mut args = PgArguments::default();

        for (i, tag_id) in system_tag_ids.iter().enumerate() {
            placeholders.push(format!("${}", i + 1));
            let _ = args.add(*tag_id);
        }

        let mut query = format!(
            r#"
            SELECT DISTINCT package_id
            FROM {table_name}
            WHERE system_tag_id IN ({})
            "#,
            placeholders.join(", ")
        );

        if let Some(ts) = timestamp_filter {
            query.push_str(&format!(" AND timestamp >= ${}", system_tag_ids.len() + 1));
            let _ = args.add(ts);
        }

        let rows = sqlx::query_with(&query, args).fetch_all(&self.pool).await?;

        let mut result = HashSet::new();
        for row in rows {
            let pkg_id: i32 = row.get("package_id");
            result.insert(pkg_id);
        }

        Ok(result)
    }
}
