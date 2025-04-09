use chrono::Utc;
use fetter::{
    AuditReport, DirectURL, Package, PathShared, ScanFS, SystemTag, UreqClientLive, VcsInfo,
    VersionSpec,
};
use serde_json::{json, Value};
use sqlx::postgres::PgRow;
use sqlx::types::chrono::DateTime;
use sqlx::{Arguments, Executor, PgPool, Row};
use std::collections::{HashMap, HashSet};
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
            Some(sfx) => format!("{}_{}", root, sfx),
            None => root.to_string(),
        }
    }

    pub async fn tables_create(&self, if_not_exists: bool) -> Result<(), sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let monitor_scan_table = self.get_table("monitor_scan");
        let ping_table = self.get_table("ping");

        let if_clause = if if_not_exists { "IF NOT EXISTS " } else { "" };

        let create_system_tag = format!(
            r#"
            CREATE TABLE {if_clause}{system_tag_table} (
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

        self.pool.execute(&*create_system_tag).await?;
        self.pool.execute(&*create_package).await?;
        self.pool.execute(&*create_site_packages).await?;
        self.pool.execute(&*create_ping).await?;
        self.pool.execute(&*create_monitor_scan).await?;

        Ok(())
    }

    pub async fn tables_drop(&self) -> Result<(), sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let ping_table = self.get_table("ping");
        let monitor_scan_table = self.get_table("monitor_scan");

        let drop_monitor_scan = format!(r#"DROP TABLE IF EXISTS {monitor_scan_table} CASCADE;"#);
        let drop_ping = format!(r#"DROP TABLE IF EXISTS {ping_table} CASCADE;"#);
        let drop_site_packages = format!(r#"DROP TABLE IF EXISTS {site_packages_table} CASCADE;"#);
        let drop_package = format!(r#"DROP TABLE IF EXISTS {package_table} CASCADE;"#);
        let drop_system_tag = format!(r#"DROP TABLE IF EXISTS {system_tag_table} CASCADE;"#);

        self.pool.execute(&*drop_monitor_scan).await?;
        self.pool.execute(&*drop_ping).await?;
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

    // Return all SystemTag, in pairs of int, SystemTag.
    pub async fn system_tag_all(&self) -> Result<Vec<(i32, SystemTag)>, sqlx::Error> {
        let table_name = self.get_table("system_tag");

        let query = format!(
            r#"
            SELECT id, username, hostname, os_name, os_version, architecture, logical_cores
            FROM {table_name}
            "#
        );

        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;

        let result = rows
            .into_iter()
            .map(|row| {
                let id: i32 = row.get("id");
                let tag = SystemTag {
                    username: row.get("username"),
                    hostname: row.get("hostname"),
                    os_name: row.get("os_name"),
                    os_version: row.get("os_version"),
                    architecture: row.get("architecture"),
                    logical_cores: row.get::<i16, _>("logical_cores") as usize,
                };
                (id, tag)
            })
            .collect();

        Ok(result)
    }

    pub async fn system_tag_pings(&self, limit: Option<usize>) -> Result<Value, sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");
        let ping_table = self.get_table("ping");

        // Step 1: fetch all system tags
        let tag_rows = sqlx::query(&format!(
            r#"
            SELECT id, username, hostname, os_name, os_version, architecture, logical_cores
            FROM {system_tag_table}
            "#
        ))
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
            ) sub
            WHERE rn <= $1
            "#
        ))
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
            WHERE scanned = true
            ORDER BY system_tag_id, timestamp DESC
            "#
        ))
        .fetch_all(&self.pool)
        .await?;

        // Step 4: group all pings by system_tag_id, deduplicated by timestamp
        let mut st_to_pings: HashMap<i32, Vec<Value>> = HashMap::new();
        let mut st_to_pings_seen: HashMap<i32, HashSet<DateTime<Utc>>> = HashMap::new();

        let mut insert_ping = |id: i32, timestamp: DateTime<Utc>, scanned: bool| {
            let pings = st_to_pings.entry(id).or_default();
            let pings_seen = st_to_pings_seen.entry(id).or_default();
            // only push on pings if this is the first time we have seen the ping
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
                "pings": st_to_pings.remove(&id).unwrap_or_default()
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

    pub async fn package_all(&self) -> Result<Vec<(i32, Package)>, sqlx::Error> {
        let table_name = self.get_table("package");

        let query = format!(
            r#"
            SELECT id, name, key, version, url, commit_id, vcs, revision
            FROM {table_name}
            ORDER BY key
            "#
        );

        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;

        let result = rows.into_iter().map(|row| package_from_row(&row)).collect();
        Ok(result)
    }

    pub async fn package_versions(&self, system_tag_id: Option<i32>) -> Result<Value, sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let monitor_scan_table = self.get_table("monitor_scan");
        let ping_table = self.get_table("ping");

        let query = format!(
            r#"
            SELECT p.key, p.name, p.version, sp.path,
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
            {}
            "#,
            if system_tag_id.is_some() {
                "WHERE pi.system_tag_id = $1"
            } else {
                ""
            }
        );

        let mut args = sqlx::postgres::PgArguments::default();
        if let Some(id) = system_tag_id {
            let _ = args.add(id);
        }

        let rows = sqlx::query_with(&query, args).fetch_all(&self.pool).await?;

        let mut summary: HashMap<String, Value> = HashMap::new();

        for row in rows {
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
        limit: Option<usize>,
    ) -> Result<Value, sqlx::Error> {
        let ping_table = self.get_table("ping");
        let monitor_scan_table = self.get_table("monitor_scan");
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
                GROUP BY pi.timestamp, pi.system_tag_id
            ),
            filtered AS (
                SELECT * FROM ranked_scans WHERE rank <= $1
            )
            SELECT timestamp, system_tag_id, package_count
            FROM filtered
            ORDER BY timestamp ASC
            "#
        );

        let mut args = sqlx::postgres::PgArguments::default();
        let _ = args.add(limit as i64);

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
                    // move group into tuple, then replace it with an empty one
                    timestamp_groups.push((gts, std::mem::take(&mut group)));
                    group_ts = Some(ts);
                }
                None => {
                    group_ts = Some(ts);
                }
                _ => {} // ts == gts
            }
            group.push((tag_id, count));
        }

        if let Some(ts) = group_ts {
            timestamp_groups.push((ts, group));
        }

        // accumulate state and compute running totals
        // for each timestamp, update all SystemTag counts, then sum
        let mut st_to_count_latest: HashMap<i32, i64> = HashMap::new();
        let mut ts_counts: Vec<(DateTime<Utc>, i64)> = Vec::new();

        for (ts, updates) in timestamp_groups {
            for (tag_id, count) in updates {
                st_to_count_latest.insert(tag_id, count);
            }
            let sum: i64 = st_to_count_latest.values().sum();
            ts_counts.push((ts, sum));
        }

        // derive pairs
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
    pub async fn audit(&self, system_tag_id: Option<i32>) -> Result<Value, sqlx::Error> {
        let ping_table = self.get_table("ping");
        let package_table = self.get_table("package");
        let monitor_scan_table = self.get_table("monitor_scan");

        let (query, args): (String, sqlx::postgres::PgArguments) = if let Some(id) = system_tag_id {
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
            let _ = args.add(id);
            (query, args)
        } else {
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

        let mut ids = Vec::new();
        let mut packages = Vec::new();

        for row in rows {
            let (id, pkg) = package_from_row(&row); // returns (i32, Package)
            ids.push(id);
            packages.push(pkg);
        }

        let client = Arc::new(UreqClientLive);
        let audit = AuditReport::from_packages(client, &packages);

        let paired: Vec<Value> = ids
            .into_iter()
            .zip(audit.records.into_iter())
            .map(|(id, record)| json!({ "id": id, "record": record }))
            .collect();

        Ok(json!(paired))
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
        let (st, scan_fs, ts): (SystemTag, Option<ScanFS>, Duration) =
            serde_json::from_str(payload).expect("Invalid JSON payload");

        let st_id = self.system_tag_insert_or_get(&st).await?;
        self.monitor_scan_load(&scan_fs, st_id, &ts).await
    }
}

// pub async fn monitor_scan_site_to_packages(
//     &self,
//     timestamp_filter: Option<DateTime<Utc>>,
// ) -> Result<HashMap<i32, HashMap<i32, Vec<i32>>>, sqlx::Error> {
//     let table_name = self.get_table("monitor_scan");

//     let mut query = format!(
//         r#"
//         SELECT system_tag_id, site_packages_id, package_id
//         FROM {table_name}
//         "#
//     );

//     let rows = if let Some(ts) = timestamp_filter {
//         query.push_str("WHERE timestamp >= $1");
//         sqlx::query(&query).bind(ts).fetch_all(&self.pool).await?
//     } else {
//         sqlx::query(&query).fetch_all(&self.pool).await?
//     };

//     let mut map: HashMap<i32, HashMap<i32, Vec<i32>>> = HashMap::new();

//     for row in rows {
//         let system_tag_id: i32 = row.get("system_tag_id");
//         let site_packages_id: i32 = row.get("site_packages_id");
//         let package_id: i32 = row.get("package_id");

//         map.entry(system_tag_id)
//             .or_default()
//             .entry(site_packages_id)
//             .or_default()
//             .push(package_id);
//     }

//     Ok(map)
// }

// pub async fn monitor_scan_get_packages(
//     &self,
//     system_tag_ids: &HashSet<i32>,
//     timestamp_filter: Option<DateTime<Utc>>,
// ) -> Result<HashSet<i32>, sqlx::Error> {
//     if system_tag_ids.is_empty() {
//         return Ok(HashSet::new());
//     }

//     let table_name = self.get_table("monitor_scan");

//     let mut placeholders = Vec::with_capacity(system_tag_ids.len());
//     let mut args = PgArguments::default();

//     for (i, tag_id) in system_tag_ids.iter().enumerate() {
//         placeholders.push(format!("${}", i + 1));
//         let _ = args.add(*tag_id);
//     }

//     let mut query = format!(
//         r#"
//         SELECT DISTINCT package_id
//         FROM {table_name}
//         WHERE system_tag_id IN ({})
//         "#,
//         placeholders.join(", ")
//     );

//     if let Some(ts) = timestamp_filter {
//         query.push_str(&format!(" AND timestamp >= ${}", system_tag_ids.len() + 1));
//         let _ = args.add(ts);
//     }

//     let rows = sqlx::query_with(&query, args).fetch_all(&self.pool).await?;

//     let mut result = HashSet::new();
//     for row in rows {
//         let pkg_id: i32 = row.get("package_id");
//         result.insert(pkg_id);
//     }

//     Ok(result)
// }
