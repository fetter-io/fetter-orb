use chrono::Utc;
use fetter::{
    AuditReport, DepManifest, DirectURL, FlagCacheRefresh, FlagLog, LockFile, Package, PathShared,
    ResultDynError, ScanFS, SystemTag, UreqClientLive, ValidationExplain, ValidationFlags,
    ValidationReport, VcsInfo, VersionSpec,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::postgres::PgRow;
use sqlx::types::chrono::DateTime;
use sqlx::Executor;
use sqlx::{Arguments, PgPool, Row};
// use sqlx::{Postgres, Transaction};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use std::time::UNIX_EPOCH;

fn package_from_row(row: &PgRow) -> (i32, Package) {
    let id: i32 = row.get("id");
    let name: String = row.get("name");
    let key: String = row.get("key");
    let version = VersionSpec::new(&row.get::<String, _>("version"));

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

    (
        id,
        Package {
            name,
            key,
            version,
            direct_url,
        },
    )
}

//------------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct Tenant {
    pub key: String,
    pub name: String,
}

//------------------------------------------------------------------------------
// NOTE: DBContext is cloneable as PgPoll is an Arc.
#[derive(Clone)]
pub struct DBContext {
    pub pool: PgPool,
    suffix: Option<String>,
}

impl DBContext {
    pub fn new(pool: PgPool, suffix: Option<String>) -> Self {
        Self { pool, suffix }
    }

    // Get a table name with the defined suffix.
    fn get_table(&self, root: &str) -> String {
        match &self.suffix {
            Some(sfx) => format!("{root}_{sfx}"),
            None => root.to_string(),
        }
    }

    pub async fn tables_create(&self, if_not_exists: bool) -> Result<(), sqlx::Error> {
        let user_table = self.get_table("users");
        let user_to_tenant_table = self.get_table("user_to_tenant");
        let tenant_table = self.get_table("tenant");
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let monitor_scan_table = self.get_table("monitor_scan");
        let ping_table = self.get_table("ping");
        let dep_manifest_table = self.get_table("dep_manifest");

        let if_clause = if if_not_exists { "IF NOT EXISTS " } else { "" };

        let create_user = format!(
            r#"
            CREATE TABLE {if_clause} {user_table} (
                id SERIAL PRIMARY KEY,
                github_id BIGINT NOT NULL UNIQUE,
                login TEXT NOT NULL,
                email TEXT,
                name TEXT,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            "#
        );

        let create_tenant = format!(
            r#"
            CREATE TABLE {if_clause}{tenant_table} (
                id SERIAL PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL
            );
            "#
        );

        let create_user_to_tenant = format!(
            r#"
            CREATE TABLE {if_clause}{user_to_tenant_table} (
                user_id INTEGER NOT NULL REFERENCES {user_table}(id) ON DELETE CASCADE,
                tenant_id INTEGER NOT NULL REFERENCES {tenant_table}(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, tenant_id)
            );
            "#
        );

        let create_dep_manifest = format!(
            r#"
            CREATE TABLE {if_clause}{dep_manifest_table} (
                tenant_id INTEGER PRIMARY KEY REFERENCES {tenant_table}(id) ON DELETE RESTRICT,
                content TEXT NOT NULL
            );
            "#
        );

        let create_system_tag = format!(
            r#"
            CREATE TABLE {if_clause}{system_tag_table} (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES {tenant_table}(id) ON DELETE RESTRICT,
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
            CREATE TABLE {if_clause}{package_table} (
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
            CREATE TABLE {if_clause}{site_packages_table} (
                id SERIAL PRIMARY KEY,
                path TEXT UNIQUE NOT NULL
            );
            "#
        );

        let create_ping = format!(
            r#"
            CREATE TABLE {if_clause}{ping_table} (
                id SERIAL PRIMARY KEY,
                system_tag_id INTEGER NOT NULL REFERENCES {system_tag_table}(id) ON DELETE RESTRICT,
                timestamp TIMESTAMPTZ NOT NULL,
                scanned BOOLEAN NOT NULL
            );
            "#
        );

        let create_monitor_scan = format!(
            r#"
            CREATE TABLE {if_clause}{monitor_scan_table} (
                ping_id INTEGER NOT NULL REFERENCES {ping_table}(id) ON DELETE RESTRICT,
                package_id INTEGER NOT NULL REFERENCES {package_table}(id) ON DELETE RESTRICT,
                site_packages_id INTEGER NOT NULL REFERENCES {site_packages_table}(id) ON DELETE RESTRICT,
                PRIMARY KEY (ping_id, package_id, site_packages_id)
            );
            "#
        );

        self.pool.execute(&*create_tenant).await?;
        self.pool.execute(&*create_user).await?;
        self.pool.execute(&*create_user_to_tenant).await?;
        self.pool.execute(&*create_dep_manifest).await?;
        self.pool.execute(&*create_system_tag).await?;
        self.pool.execute(&*create_package).await?;
        self.pool.execute(&*create_site_packages).await?;
        self.pool.execute(&*create_ping).await?;
        self.pool.execute(&*create_monitor_scan).await?;

        // Create indexes for join/filter performance
        for stmt in [
            format!("CREATE INDEX IF NOT EXISTS monitor_scan_package_id_idx ON {monitor_scan_table}(package_id);"),
            format!("CREATE INDEX IF NOT EXISTS monitor_scan_ping_id_idx ON {monitor_scan_table}(ping_id);"),
            format!("CREATE INDEX IF NOT EXISTS ping_system_tag_id_idx ON {ping_table}(system_tag_id);"),
            format!("CREATE INDEX IF NOT EXISTS system_tag_tenant_id_idx ON {system_tag_table}(tenant_id);"),
            format!("CREATE INDEX IF NOT EXISTS package_key_idx ON {package_table}(key);"),
        ] {
            sqlx::query(&stmt).execute(&self.pool).await?;
        }

        Ok(())
    }

    pub async fn tables_drop(&self) -> Result<(), sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let ping_table = self.get_table("ping");
        let monitor_scan_table = self.get_table("monitor_scan");
        let dep_manifest_table = self.get_table("dep_manifest");
        let user_to_tenant_table = self.get_table("user_to_tenant");
        let tenant_table = self.get_table("tenant");
        let user_table = self.get_table("users");

        let drop_monitor_scan = format!(r#"DROP TABLE IF EXISTS {monitor_scan_table} CASCADE;"#);
        let drop_ping = format!(r#"DROP TABLE IF EXISTS {ping_table} CASCADE;"#);
        let drop_site_packages = format!(r#"DROP TABLE IF EXISTS {site_packages_table} CASCADE;"#);
        let drop_package = format!(r#"DROP TABLE IF EXISTS {package_table} CASCADE;"#);
        let drop_system_tag = format!(r#"DROP TABLE IF EXISTS {system_tag_table} CASCADE;"#);
        let drop_dep_manifest = format!(r#"DROP TABLE IF EXISTS {dep_manifest_table} CASCADE;"#);
        let drop_user_to_tenant =
            format!(r#"DROP TABLE IF EXISTS {user_to_tenant_table} CASCADE;"#);
        let drop_tenant = format!(r#"DROP TABLE IF EXISTS {tenant_table} CASCADE;"#);
        let drop_user = format!(r#"DROP TABLE IF EXISTS {user_table} CASCADE;"#);

        self.pool.execute(&*drop_monitor_scan).await?;
        self.pool.execute(&*drop_ping).await?;
        self.pool.execute(&*drop_site_packages).await?;
        self.pool.execute(&*drop_package).await?;
        self.pool.execute(&*drop_system_tag).await?;
        self.pool.execute(&*drop_dep_manifest).await?;
        self.pool.execute(&*drop_user_to_tenant).await?;
        self.pool.execute(&*drop_tenant).await?;
        self.pool.execute(&*drop_user).await?;

        Ok(())
    }

    //--------------------------------------------------------------------------
    pub async fn tenant_insert_or_get(&self, tenant: &Tenant) -> Result<i32, sqlx::Error> {
        let table_name = self.get_table("tenant");
        let select_query = format!(
            r#"
            SELECT id FROM {table_name}
            WHERE key = $1
            "#
        );

        if let Some(row) = sqlx::query(&select_query)
            .bind(&tenant.key)
            .fetch_optional(&self.pool)
            .await?
        {
            return Ok(row.get("id"));
        }
        let insert_query = format!(
            r#"
            INSERT INTO {table_name}
            (key, name)
            VALUES ($1, $2)
            RETURNING id
            "#
        );
        let row = sqlx::query(&insert_query)
            .bind(&tenant.key)
            .bind(&tenant.name)
            .fetch_one(&self.pool)
            .await?;

        Ok(row.get("id"))
    }

    pub async fn tenant_all(&self) -> Result<Vec<(i32, Tenant)>, sqlx::Error> {
        let table_name = self.get_table("tenant");

        let query = format!(
            r#"
            SELECT id, key, name
            FROM {table_name}
            ORDER BY name
            "#
        );

        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;

        let result = rows
            .into_iter()
            .map(|row| {
                let id: i32 = row.get("id");
                let tenant = Tenant {
                    key: row.get("key"),
                    name: row.get("name"),
                };
                (id, tenant)
            })
            .collect();

        Ok(result)
    }

    //--------------------------------------------------------------------------
    pub async fn system_tag_insert_or_get(
        &self,
        tenant_id: i32,
        tag: &SystemTag,
    ) -> Result<i32, sqlx::Error> {
        let table_name = self.get_table("system_tag");

        let select_query = format!(
            r#"
            SELECT id FROM {table_name}
            WHERE tenant_id = $1 AND username = $2 AND hostname = $3
              AND os_name = $4 AND os_version = $5 AND architecture = $6 AND logical_cores = $7
            "#
        );

        if let Some(row) = sqlx::query(&select_query)
            .bind(tenant_id)
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
            (tenant_id, username, hostname, os_name, os_version, architecture, logical_cores)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            "#
        );

        let row = sqlx::query(&insert_query)
            .bind(tenant_id)
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

    pub async fn system_tag_pings(
        &self,
        tenant_id: i32,
        limit: Option<usize>,
    ) -> Result<Value, sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");
        let ping_table = self.get_table("ping");
        let site_packages_table = self.get_table("site_packages");
        let monitor_scan_table = self.get_table("monitor_scan");

        // Step 1: fetch all system tags for the given tenant
        let tag_rows = sqlx::query(&format!(
            r#"
            SELECT id, username, hostname, os_name, os_version, architecture, logical_cores
            FROM {system_tag_table}
            WHERE tenant_id = $1
            "#
        ))
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        // Step 2: fetch up to N most recent pings per tag
        let ping_limit = limit.unwrap_or(20) as i64;

        let last_count_ping_rows = sqlx::query(&format!(
            r#"
            SELECT system_tag_id, timestamp, scanned
            FROM (
                SELECT
                    system_tag_id,
                    timestamp,
                    scanned,
                    ROW_NUMBER() OVER (
                        PARTITION BY system_tag_id ORDER BY timestamp DESC
                    ) as rn
                FROM {ping_table}
                WHERE system_tag_id IN (
                    SELECT id FROM {system_tag_table} WHERE tenant_id = $1
                )
            ) sub
            WHERE rn <= $2
            "#
        ))
        .bind(tenant_id)
        .bind(ping_limit)
        .fetch_all(&self.pool)
        .await?;

        // Step 3: fetch the last scanned ping per tag
        let last_scan_ping_rows = sqlx::query(&format!(
            r#"
            SELECT DISTINCT ON (system_tag_id)
                system_tag_id,
                timestamp,
                scanned
            FROM {ping_table}
            WHERE scanned = true AND system_tag_id IN (
                SELECT id FROM {system_tag_table} WHERE tenant_id = $1
            )
            ORDER BY system_tag_id, timestamp DESC
            "#
        ))
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        // Step 3.5: fetch site_packages paths from most recent scan per system_tag
        let site_package_rows = sqlx::query(&format!(
            r#"
            SELECT DISTINCT ON (pi.system_tag_id, sp.path)
                pi.system_tag_id, sp.path
            FROM {ping_table} pi
            JOIN {monitor_scan_table} ms ON ms.ping_id = pi.id
            JOIN {site_packages_table} sp ON sp.id = ms.site_packages_id
            JOIN (
                SELECT DISTINCT ON (system_tag_id)
                    id, system_tag_id
                FROM {ping_table}
                WHERE scanned = true AND system_tag_id IN (
                    SELECT id FROM {system_tag_table} WHERE tenant_id = $1
                )
                ORDER BY system_tag_id, timestamp DESC
            ) latest ON pi.id = latest.id
            "#
        ))
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        let mut st_to_site_packages: HashMap<i32, Vec<String>> = HashMap::new();

        for row in site_package_rows {
            let id: i32 = row.get("system_tag_id");
            let path: String = row.get("path");
            st_to_site_packages.entry(id).or_default().push(path);
        }

        // Step 4: group all pings by system_tag_id, deduplicated by timestamp
        let mut st_to_pings: HashMap<i32, Vec<Value>> = HashMap::new();
        let mut st_to_pings_seen: HashMap<i32, HashSet<DateTime<Utc>>> = HashMap::new();

        let mut insert_ping = |id: i32, timestamp: DateTime<Utc>, scanned: bool| {
            let pings = st_to_pings.entry(id).or_default();
            let pings_seen = st_to_pings_seen.entry(id).or_default();
            if pings_seen.insert(timestamp) {
                pings.push(json!({ "timestamp": timestamp, "scanned": scanned }));
            }
        };

        for row in last_scan_ping_rows {
            let id: i32 = row.get("system_tag_id");
            insert_ping(id, row.get("timestamp"), row.get("scanned"));
        }

        for row in last_count_ping_rows {
            let id: i32 = row.get("system_tag_id");
            insert_ping(id, row.get("timestamp"), row.get("scanned"));
        }

        // Step 5: build final result
        let mut result = Vec::new();

        for tag in tag_rows {
            let id: i32 = tag.get("id");
            result.push(json!({
                "id": id,
                "username": tag.get::<String, _>("username"),
                "hostname": tag.get::<String, _>("hostname"),
                "os_name": tag.get::<String, _>("os_name"),
                "os_version": tag.get::<String, _>("os_version"),
                "architecture": tag.get::<String, _>("architecture"),
                "logical_cores": tag.get::<i16, _>("logical_cores") as usize,
                "pings": st_to_pings.remove(&id).unwrap_or_default(),
                "site_packages": st_to_site_packages.remove(&id).unwrap_or_default()
            }));
        }

        Ok(Value::Array(result))
    }

    //--------------------------------------------------------------------------
    // Package

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
            SELECT id, name, key, version, url, commit_id, vcs, revision
            FROM {table_name}
            WHERE id = $1
            "#
        );

        if let Some(row) = sqlx::query(&query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
        {
            let (_, pkg) = package_from_row(&row);
            Ok(Some(pkg))
        } else {
            Ok(None)
        }
    }

    pub async fn package_versions(
        &self,
        system_tag_id: Option<i32>,
        tenant_id: Option<i32>,
    ) -> Result<Value, sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let monitor_scan_table = self.get_table("monitor_scan");
        let ping_table = self.get_table("ping");

        let mut where_clauses = Vec::new();
        let mut args = sqlx::postgres::PgArguments::default();
        let mut param_index = 1;

        if let Some(id) = system_tag_id {
            where_clauses.push(format!("pi.system_tag_id = ${param_index}"));
            let _ = args.add(id);
            param_index += 1;
        }
        if let Some(tid) = tenant_id {
            where_clauses.push(format!("st.tenant_id = ${param_index}"));
            let _ = args.add(tid);
        }

        let where_clause = if !where_clauses.is_empty() {
            format!("WHERE {}", where_clauses.join(" AND "))
        } else {
            "".to_string()
        };

        let query = format!(
            r#"
            SELECT p.id AS package_id, p.key, p.name, p.version, sp.path,
                   pi.system_tag_id, st.username, st.hostname
            FROM {monitor_scan_table} ms
            JOIN (
                SELECT DISTINCT ON (system_tag_id) id, system_tag_id
                FROM {ping_table}
                WHERE scanned = true
                ORDER BY system_tag_id, timestamp DESC
            ) pi ON ms.ping_id = pi.id
            JOIN {package_table} p ON ms.package_id = p.id
            JOIN {site_packages_table} sp ON ms.site_packages_id = sp.id
            JOIN {system_tag_table} st ON pi.system_tag_id = st.id
            {where_clause}
            "#
        );

        let rows = sqlx::query_with(&query, args).fetch_all(&self.pool).await?;

        let mut summary: HashMap<String, Value> = HashMap::new();

        for row in rows {
            let package_id: i32 = row.get("package_id");
            let key: String = row.get("key");
            let name: String = row.get("name");
            let version: String = row.get("version");
            let path: String = row.get("path");
            let system_tag_id: i32 = row.get("system_tag_id");
            let system_tag_username: String = row.get("username");
            let system_tag_hostname: String = row.get("hostname");

            summary
                .entry(key.clone())
                .and_modify(|entry| {
                    if let Some(data) = entry.get_mut("data").and_then(|v| v.as_array_mut()) {
                        data.push(json!({
                            "package_id": package_id,
                            "version": version,
                            "path": path,
                            "system_tag_id": system_tag_id,
                            "system_tag_username": system_tag_username,
                            "system_tag_hostname": system_tag_hostname
                        }));
                    }
                })
                .or_insert_with(|| {
                    json!({
                        "name": name,
                        "data": [{
                            "package_id": package_id,
                            "version": version,
                            "path": path,
                            "system_tag_id": system_tag_id,
                            "system_tag_username": system_tag_username,
                            "system_tag_hostname": system_tag_hostname
                        }]
                    })
                });
        }

        Ok(json!(summary))
    }

    /// Return a time line of package counts, either for a single SystemTag or a moving aggregation of all last scanned counts.
    pub async fn package_counts(
        &self,
        system_tag_id: Option<i32>,
        tenant_id: Option<i32>,
        limit: Option<usize>,
    ) -> Result<Value, sqlx::Error> {
        let ping_table = self.get_table("ping");
        let monitor_scan_table = self.get_table("monitor_scan");
        let system_tag_table = self.get_table("system_tag");
        let limit = limit.unwrap_or(20);

        if let Some(id) = system_tag_id {
            let query = format!(
                r#"
            WITH ranked_scans AS (
                SELECT
                    pi.timestamp,
                    COUNT(DISTINCT ms.package_id) AS package_count,
                    ROW_NUMBER() OVER (
                        ORDER BY pi.timestamp DESC
                    ) AS rank
                FROM {monitor_scan_table} ms
                JOIN {ping_table} pi ON ms.ping_id = pi.id
                WHERE pi.scanned = true AND pi.system_tag_id = $1
                GROUP BY pi.timestamp
            ),
            filtered AS (
                SELECT * FROM ranked_scans WHERE rank <= $2
            )
            SELECT timestamp, package_count
            FROM filtered
            ORDER BY timestamp ASC
            "#
            );

            let mut args = sqlx::postgres::PgArguments::default();
            let _ = args.add(id);
            let _ = args.add(limit as i64);

            let rows = sqlx::query_with(&query, args).fetch_all(&self.pool).await?;
            let mut result = Vec::new();

            for window in rows.windows(2) {
                let start: DateTime<Utc> = window[0].get("timestamp");
                let stop: DateTime<Utc> = window[1].get("timestamp");
                let count: i64 = window[0].get("package_count");
                result.push(json!([start, stop, count]));
            }

            if let Some(last) = rows.last() {
                let start: DateTime<Utc> = last.get("timestamp");
                let count: i64 = last.get("package_count");
                result.push(json!([start, Value::Null, count]));
            }

            return Ok(json!(result));
        }

        // Multi-tag case with partitioned row limiting
        let query = format!(
            r#"
        WITH ranked_scans AS (
            SELECT
                pi.timestamp,
                pi.system_tag_id,
                COUNT(DISTINCT ms.package_id) AS package_count,
                ROW_NUMBER() OVER (
                    PARTITION BY pi.system_tag_id
                    ORDER BY pi.timestamp DESC
                ) AS rank
            FROM {monitor_scan_table} ms
            JOIN {ping_table} pi ON ms.ping_id = pi.id
            WHERE pi.scanned = true
            {tenant_filter}
            GROUP BY pi.timestamp, pi.system_tag_id
        ),
        filtered AS (
            SELECT * FROM ranked_scans WHERE rank <= $1
        )
        SELECT timestamp, system_tag_id, package_count
        FROM filtered
        ORDER BY timestamp ASC
        "#,
            tenant_filter = if tenant_id.is_some() {
                format!(
                "AND pi.system_tag_id IN (SELECT id FROM {system_tag_table} WHERE tenant_id = $2)"
            )
            } else {
                "".to_string()
            }
        );

        let mut args = sqlx::postgres::PgArguments::default();
        let _ = args.add(limit as i64);
        if let Some(tid) = tenant_id {
            let _ = args.add(tid);
        }

        let rows = sqlx::query_with(&query, args).fetch_all(&self.pool).await?;

        // grouping and aggregation
        type VecSTCount = Vec<(i32, i64)>;
        let mut timestamp_groups: Vec<(DateTime<Utc>, VecSTCount)> = Vec::new();
        let mut group_ts: Option<DateTime<Utc>> = None;
        let mut group: VecSTCount = Vec::new();

        for row in rows {
            let ts: DateTime<Utc> = row.get("timestamp");
            let tag_id: i32 = row.get("system_tag_id");
            let count: i64 = row.get("package_count");

            match group_ts {
                Some(gts) if ts != gts => {
                    timestamp_groups.push((gts, std::mem::take(&mut group)));
                    group_ts = Some(ts);
                }
                None => {
                    group_ts = Some(ts);
                }
                _ => {}
            }
            group.push((tag_id, count));
        }

        if let Some(ts) = group_ts {
            timestamp_groups.push((ts, group));
        }

        // accumulate state and compute running totals
        let mut st_to_count_latest: HashMap<i32, i64> = HashMap::new();
        let mut ts_counts: Vec<(DateTime<Utc>, i64)> = Vec::new();

        for (ts, updates) in timestamp_groups {
            for (tag_id, count) in updates {
                st_to_count_latest.insert(tag_id, count);
            }
            let sum: i64 = st_to_count_latest.values().sum();
            ts_counts.push((ts, sum));
        }

        let mut result = Vec::new();
        for window in ts_counts.windows(2) {
            let (start, count) = window[0];
            let (stop, _) = window[1];
            result.push(json!([start, stop, count]));
        }
        if let Some((start, count)) = ts_counts.last() {
            result.push(json!([start, Value::Null, count]));
        }

        Ok(json!(result))
    }

    //--------------------------------------------------------------------------

    async fn get_latest_packages(
        &self,
        system_tag_id: Option<i32>,
        tenant_id: Option<i32>,
    ) -> Result<(Vec<Package>, HashMap<Package, i32>), sqlx::Error> {
        let ping_table = self.get_table("ping");
        let package_table = self.get_table("package");
        let monitor_scan_table = self.get_table("monitor_scan");

        let (query, args): (String, sqlx::postgres::PgArguments) =
            if let Some(system_id) = system_tag_id {
                let query = format!(
                    r#"
                    WITH latest_scan AS (
                        SELECT MAX(timestamp) as latest_ts
                        FROM {ping_table}
                        WHERE scanned = true AND system_tag_id = $1
                    )
                    SELECT
                        p.id,
                        p.name,
                        p.key,
                        p.version,
                        p.url,
                        p.commit_id,
                        p.vcs,
                        p.revision
                    FROM {monitor_scan_table} ms
                    JOIN {ping_table} pi ON ms.ping_id = pi.id
                    JOIN latest_scan ls ON pi.timestamp = ls.latest_ts
                    JOIN {package_table} p ON ms.package_id = p.id
                    WHERE pi.system_tag_id = $1
                    "#
                );
                let mut args = sqlx::postgres::PgArguments::default();
                let _ = args.add(system_id);
                (query, args)
            } else if let Some(tenant_id) = tenant_id {
                let query = format!(
                    r#"
                    WITH latest_scans AS (
                        SELECT pi.system_tag_id, MAX(pi.timestamp) as latest_ts
                        FROM {ping_table} pi
                        JOIN system_tag st ON pi.system_tag_id = st.id
                        WHERE pi.scanned = true AND st.tenant_id = $1
                        GROUP BY pi.system_tag_id
                    )
                    SELECT
                        p.id,
                        p.name,
                        p.key,
                        p.version,
                        p.url,
                        p.commit_id,
                        p.vcs,
                        p.revision
                    FROM {monitor_scan_table} ms
                    JOIN {ping_table} pi ON ms.ping_id = pi.id
                    JOIN latest_scans ls
                        ON pi.system_tag_id = ls.system_tag_id
                       AND pi.timestamp = ls.latest_ts
                    JOIN {package_table} p ON ms.package_id = p.id
                    "#
                );
                let mut args = sqlx::postgres::PgArguments::default();
                let _ = args.add(tenant_id);
                (query, args)
            } else {
                // latest of all tenants and systems
                let query = format!(
                    r#"
                    WITH latest_scans AS (
                        SELECT system_tag_id, MAX(timestamp) as latest_ts
                        FROM {ping_table}
                        WHERE scanned = true
                        GROUP BY system_tag_id
                    )
                    SELECT
                        p.id,
                        p.name,
                        p.key,
                        p.version,
                        p.url,
                        p.commit_id,
                        p.vcs,
                        p.revision
                    FROM {monitor_scan_table} ms
                    JOIN {ping_table} pi ON ms.ping_id = pi.id
                    JOIN latest_scans ls
                        ON pi.system_tag_id = ls.system_tag_id
                       AND pi.timestamp = ls.latest_ts
                    JOIN {package_table} p ON ms.package_id = p.id
                    "#
                );
                let args = sqlx::postgres::PgArguments::default();
                (query, args)
            };

        let rows = sqlx::query_with(&query, args).fetch_all(&self.pool).await?;
        let mut package_to_id: HashMap<Package, i32> = HashMap::new();

        for row in rows {
            let (id, pkg) = package_from_row(&row);
            package_to_id.insert(pkg, id);
        }

        let packages: Vec<Package> = package_to_id.keys().cloned().collect();
        Ok((packages, package_to_id))
    }

    pub async fn get_latest_packages_to_sites(
        &self,
        system_tag_id: Option<i32>,
        tenant_id: Option<i32>,
    ) -> ResultDynError<(HashMap<Package, Vec<PathShared>>, HashMap<Package, i32>)> {
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let monitor_scan_table = self.get_table("monitor_scan");
        let ping_table = self.get_table("ping");

        let query = format!(
            r#"
            SELECT DISTINCT ON (p.id, sp.id)
                p.id AS id,
                p.name, p.key, p.version, p.url, p.commit_id, p.vcs, p.revision,
                sp.path
            FROM {monitor_scan_table} ms
            JOIN (
                SELECT DISTINCT ON (system_tag_id) id, system_tag_id
                FROM {ping_table}
                WHERE scanned = true
                ORDER BY system_tag_id, timestamp DESC
            ) pi ON ms.ping_id = pi.id
            JOIN {system_tag_table} st ON pi.system_tag_id = st.id
            JOIN {package_table} p ON ms.package_id = p.id
            JOIN {site_packages_table} sp ON ms.site_packages_id = sp.id
            {where_clause}
            "#,
            where_clause = if let Some(id) = system_tag_id {
                format!("WHERE pi.system_tag_id = {id}")
            } else if let Some(tid) = tenant_id {
                format!("WHERE st.tenant_id = {tid}")
            } else {
                "".to_string()
            }
        );

        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;

        let mut package_to_sites: HashMap<Package, Vec<PathShared>> = HashMap::new();
        let mut package_to_id: HashMap<Package, i32> = HashMap::new();

        for row in rows {
            let (id, package) = package_from_row(&row);
            package_to_id.insert(package.clone(), id);
            let path: String = row.get("path");
            package_to_sites
                .entry(package)
                .or_default()
                .push(PathShared::from_path_buf(PathBuf::from(path)));
        }

        Ok((package_to_sites, package_to_id))
    }

    pub async fn audit(
        &self,
        system_tag_id: Option<i32>,
        tenant_id: Option<i32>,
    ) -> Result<Value, sqlx::Error> {
        let (packages, package_to_id) = self.get_latest_packages(system_tag_id, tenant_id).await?;
        let client = Arc::new(UreqClientLive);
        let audit =
            AuditReport::from_packages(client, &packages, FlagCacheRefresh(false), FlagLog(false));
        let mut records = audit.records;

        // Sort by key, then version
        records.sort_by(|a, b| {
            a.package
                .key
                .cmp(&b.package.key)
                .then_with(|| a.package.version.cmp(&b.package.version))
        });

        let paired: Vec<Value> = records
            .into_iter()
            .map(|record| {
                json!({
                    "package_id": package_to_id.get(&record.package).unwrap_or(&-1),
                    "record": record
                })
            })
            .collect();

        Ok(json!(paired))
    }

    pub async fn validate(
        &self,
        system_tag_id: Option<i32>,
        tenant_id: Option<i32>,
    ) -> ResultDynError<Value> {
        let dm_content = match tenant_id {
            Some(t_id) => match self.dep_manifest_from_tenant_id(t_id).await? {
                Some(text) => text,
                None => "".to_string(),
            },
            None => "".to_string(),
        };

        let lf = LockFile::new(dm_content.clone());
        let deps = lf.get_dependencies(None)?; // can provide Vec<String> of options
        let dm = DepManifest::try_from_iter(deps.iter())?;
        // these need to come from the ui
        let vf = ValidationFlags {
            permit_superset: false,
            permit_subset: false,
        };
        let (package_to_sites, package_to_id) = self
            .get_latest_packages_to_sites(system_tag_id, tenant_id)
            .await?;
        let packages: Vec<_> = package_to_sites.keys().cloned().collect();
        // packages.sort();
        let site_to_exe: HashMap<PathShared, PathBuf> = HashMap::new();

        let vr = ValidationReport::from_components(
            &packages,
            &package_to_sites,
            &site_to_exe,
            &None,
            &dm,
            &vf,
            None,
        );

        let mut missing: Vec<(i32, Option<String>)> = Vec::new();
        let mut unrequired: Vec<(i32, Option<String>)> = Vec::new();
        let mut misdefined: Vec<(i32, Option<String>)> = Vec::new();
        let mut undefined: Vec<(i32, Option<String>)> = Vec::new();

        for record in vr.records {
            if let Some(ref pkg) = record.package {
                let pkg_id = package_to_id.get(pkg).unwrap_or(&-1);
                let target = match record.explain() {
                    ValidationExplain::Missing => &mut missing,
                    ValidationExplain::Unrequired => &mut unrequired,
                    ValidationExplain::Misdefined => &mut misdefined,
                    ValidationExplain::Undefined => &mut undefined,
                };
                if let Some(sites) = record.sites {
                    for site in sites {
                        target.push((*pkg_id, Some(site.to_string())));
                    }
                } else {
                    target.push((*pkg_id, None));
                }
            }
            // else, package is missing... will need to insert new packages?
        }
        // println!("misdefined: {:?}", misdefined);

        Ok(json!({
            "dep_manifest": dm_content,
            "missing": missing,
            "unrequired": unrequired,
            "misdefined": misdefined,
            "undefined": undefined,
        }))
    }

    //--------------------------------------------------------------------------
    pub async fn dep_manifest_from_tenant_id(
        &self,
        tenant_id: i32,
    ) -> Result<Option<String>, sqlx::Error> {
        let table_name = self.get_table("dep_manifest");

        let query = format!(
            r#"
            SELECT content
            FROM {table_name}
            WHERE tenant_id = $1
            "#
        );

        if let Some(row) = sqlx::query(&query)
            .bind(tenant_id)
            .fetch_optional(&self.pool)
            .await?
        {
            let content: String = row.get("content");
            // println!("dep_manifest_from_tenant_id: {:?} {:?}", tenant_id, content);
            Ok(Some(content))
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

    //--------------------------------------------------------------------------
    pub async fn monitor_scan_load(
        &self,
        scan_fs: &Option<ScanFS>,
        st_id: i32, // system tag id
        ts: &Duration,
    ) -> Result<(), sqlx::Error> {
        let monitor_scan_table = self.get_table("monitor_scan");
        let ping_table = self.get_table("ping");

        let timestamp: DateTime<Utc> = (UNIX_EPOCH + *ts).into();
        let scanned = scan_fs.is_some();

        let ping_id: i32 = sqlx::query_scalar(&format!(
            r#"
            INSERT INTO {ping_table} (system_tag_id, timestamp, scanned)
            VALUES ($1, $2, $3)
            RETURNING id
            "#
        ))
        .bind(st_id)
        .bind(timestamp)
        .bind(scanned)
        .fetch_one(&self.pool)
        .await?;

        if let Some(sfs) = scan_fs {
            for (pkg, sites) in sfs.package_to_sites.iter() {
                let pkg_id = self.package_insert_or_get(pkg).await?;

                for sp in sites.iter() {
                    let sp_id = self.site_packages_insert_or_get(sp.clone()).await?;

                    let insert_query = format!(
                        r#"
                        INSERT INTO {monitor_scan_table} (ping_id, package_id, site_packages_id)
                        VALUES ($1, $2, $3)
                        ON CONFLICT DO NOTHING
                        "#
                    );

                    sqlx::query(&insert_query)
                        .bind(ping_id)
                        .bind(pkg_id)
                        .bind(sp_id)
                        .execute(&self.pool)
                        .await?;
                }
            }
        }

        Ok(())
    }

    pub async fn monitor_scan_load_from_json(&self, payload: &str) -> Result<(), sqlx::Error> {
        let (tenant, st, scan_fs, ts): (String, SystemTag, Option<ScanFS>, Duration) =
            serde_json::from_str(payload).expect("Invalid JSON payload");

        // TODO: validate tenant against defined list
        let t = Tenant {
            key: tenant.clone(),
            name: tenant.clone(),
        };

        let tenant_id = self.tenant_insert_or_get(&t).await?;
        let st_id = self.system_tag_insert_or_get(tenant_id, &st).await?;
        self.monitor_scan_load(&scan_fs, st_id, &ts).await
    }

    pub async fn dep_manifest_load(
        &self,
        tenant_id: i32,
        content: &String,
    ) -> Result<(), sqlx::Error> {
        let dep_manifest_table = self.get_table("dep_manifest");

        let insert_query = format!(
            r#"
            INSERT INTO {dep_manifest_table} (tenant_id, content)
            VALUES ($1, $2)
            ON CONFLICT (tenant_id)
            DO UPDATE SET content = EXCLUDED.content
            "#
        );

        sqlx::query(&insert_query)
            .bind(tenant_id)
            .bind(content)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn dep_manifest_load_from_json(&self, payload: &str) -> Result<(), sqlx::Error> {
        let (tenant_id, body): (i32, String) =
            serde_json::from_str(payload).expect("Invalid JSON payload");
        // TODO: validate tenant against defined list
        self.dep_manifest_load(tenant_id, &body).await
    }
}
