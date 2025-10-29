use chrono::Duration as ChronoDuration;
use chrono::{DateTime, Utc};
use std::env;

use fetter::{
    path_cache, AuditReport, CacheConfig, CliAnchor, CvssFilter, DepManifest, DirectURL,
    FlagCacheRefresh, FlagLog, LockFile, Package, PathShared, ResultDynError, ScanFS, SystemTag,
    Tableable, UreqClientLive, ValidationExplain, ValidationFlags, ValidationReport, VcsInfo,
    VersionSpec,
};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::postgres::PgRow;
use sqlx::Executor;
use sqlx::{Arguments, PgPool, Row};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use std::time::UNIX_EPOCH;
use uuid::Uuid;

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

pub fn strings_to_hash(values: Vec<&str>) -> String {
    let mut hasher = Sha256::new();
    for value in values {
        hasher.update(value.as_bytes());
    }
    let hash = hasher.finalize();

    hash.iter().fold(String::new(), |mut acc, byte| {
        use std::fmt::Write;
        write!(&mut acc, "{byte:02x}").unwrap();
        acc
    })
}

//------------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct Tenant {
    pub key: String,
    pub name: String,
    pub ping_limit: i32,
    pub created_by: Uuid,
}

impl Tenant {
    pub fn from_key(key: &str, created_by: Uuid) -> Self {
        Tenant {
            key: key.to_string(),
            name: key.to_string(),
            ping_limit: 1,
            created_by,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct User {
    pub id: Uuid,
    pub github_login: String,
    pub github_id: i32,
    pub email: Option<String>,
    pub name: Option<String>,
    pub tenant_limit: i32,
    pub term_accepted: bool,
    pub created_at: String,
}

#[derive(serde::Deserialize, Debug)]
struct DepManifestRequest {
    user_id: String,
    tenant_id: i32,
    content: String,
    superset: bool,
    subset: bool,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct DepManifestData {
    pub content: String,
    pub superset: bool,
    pub subset: bool,
}

//------------------------------------------------------------------------------
// NOTE: DBContext is cloneable as PgPoll is an Arc.
#[derive(Clone)]
pub struct DBContext {
    pub pool: PgPool,
    suffix: Option<String>,
    pub default_ping_limit: i32,
    pub default_tenant_limit: i32,
    cache_config: CacheConfig,
    salt: String,
}

impl DBContext {
    pub fn new(pool: PgPool, suffix: Option<String>) -> Self {
        let default_ping_limit: i32 = env::var("DEFAULT_PING_LIMIT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(1);

        let default_tenant_limit: i32 = env::var("DEFAULT_TENANT_LIMIT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(1);

        let salt = env::var("TENANT_SECRET").unwrap_or_else(|_| "".to_string());

        // NOTE: as we defer updating audit data unless (a) user explicitly asks for it or (b) shouldAuditUpdate is true (packages change / duration limit passed), we may not need to use cache_dur here, which will use file-based caching on the back-end
        let cache_dur = Duration::from_secs(0);
        let cache_dir = path_cache(true).expect("Could not create path");
        let cache_config = CacheConfig::new(cache_dur, cache_dir);

        Self {
            pool,
            suffix,
            default_ping_limit,
            default_tenant_limit,
            cache_config,
            salt,
        }
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
        let user_tenant_last_table = self.get_table("user_tenant_last");
        let tenant_table = self.get_table("tenant");
        let system_tag_table = self.get_table("system_tag");
        let package_table = self.get_table("package");
        let site_packages_table = self.get_table("site_packages");
        let monitor_scan_table = self.get_table("monitor_scan");
        let ping_table = self.get_table("ping");
        let dep_manifest_table = self.get_table("dep_manifest");

        let if_clause = if if_not_exists { "IF NOT EXISTS " } else { "" };

        let create_extensions = "CREATE EXTENSION IF NOT EXISTS pgcrypto;".to_string();

        let create_user = format!(
            r#"
            CREATE TABLE {if_clause} {user_table} (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                github_login TEXT NOT NULL,
                github_id INTEGER NOT NULL,
                email TEXT,
                name TEXT,
                tenant_limit INTEGER NOT NULL,
                term_accepted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT now()
            );
            "#
        );

        let create_tenant = format!(
            r#"
            CREATE TABLE {if_clause}{tenant_table} (
                id SERIAL PRIMARY KEY,
                key TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                ping_limit INTEGER NOT NULL,
                created_by UUID NOT NULL REFERENCES {user_table}(id)
            );
            "#
        );

        let create_user_to_tenant = format!(
            r#"
            CREATE TABLE {if_clause}{user_to_tenant_table} (
                user_id UUID NOT NULL REFERENCES {user_table}(id) ON DELETE CASCADE,
                tenant_id INTEGER NOT NULL REFERENCES {tenant_table}(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, tenant_id)
            );
            "#
        );

        let create_user_tenant_last_table = format!(
            r#"
            CREATE TABLE {if_clause}{user_tenant_last_table} (
                user_id UUID PRIMARY KEY REFERENCES {user_table}(id) ON DELETE CASCADE,
                tenant_id INTEGER REFERENCES {tenant_table}(id) ON DELETE SET NULL
            );
            "#
        );

        let create_dep_manifest = format!(
            r#"
            CREATE TABLE {if_clause}{dep_manifest_table} (
                tenant_id INTEGER PRIMARY KEY REFERENCES {tenant_table}(id) ON DELETE RESTRICT,
                content TEXT NOT NULL,
                superset BOOLEAN NOT NULL DEFAULT FALSE,
                subset BOOLEAN NOT NULL DEFAULT FALSE
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
                logical_cores SMALLINT NOT NULL,
                active BOOLEAN NOT NULL DEFAULT true
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
        self.pool.execute(&*create_extensions).await?;
        self.pool.execute(&*create_user).await?;
        self.pool.execute(&*create_tenant).await?;
        self.pool.execute(&*create_user_to_tenant).await?;
        self.pool.execute(&*create_user_tenant_last_table).await?;
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
        let user_tenant_last_table = self.get_table("user_tenant_last");
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
        let drop_user_tenant_last =
            format!(r#"DROP TABLE IF EXISTS {user_tenant_last_table} CASCADE;"#);
        let drop_tenant = format!(r#"DROP TABLE IF EXISTS {tenant_table} CASCADE;"#);
        let drop_user = format!(r#"DROP TABLE IF EXISTS {user_table} CASCADE;"#);

        self.pool.execute(&*drop_monitor_scan).await?;
        self.pool.execute(&*drop_ping).await?;
        self.pool.execute(&*drop_site_packages).await?;
        self.pool.execute(&*drop_package).await?;
        self.pool.execute(&*drop_system_tag).await?;
        self.pool.execute(&*drop_dep_manifest).await?;
        self.pool.execute(&*drop_user_to_tenant).await?;
        self.pool.execute(&*drop_user_tenant_last).await?;
        self.pool.execute(&*drop_tenant).await?;
        self.pool.execute(&*drop_user).await?;

        Ok(())
    }

    /// Migration: Add active column to system_tag table if it doesn't exist
    pub async fn migrate_add_system_tag_active(&self) -> Result<(), sqlx::Error> {
        let system_tag_table = self.get_table("system_tag");

        // if the column already exists
        let check_query = r#"
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = 'active'
            "#
        .to_string();

        let exists = sqlx::query(&check_query)
            .bind(&system_tag_table)
            .fetch_optional(&self.pool)
            .await?;

        if exists.is_none() {
            let add_column_query = format!(
                "ALTER TABLE {system_tag_table} ADD COLUMN active BOOLEAN NOT NULL DEFAULT true"
            );
            self.pool.execute(&*add_column_query).await?;
        }
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
            (key, name, ping_limit, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#
        );
        let row = sqlx::query(&insert_query)
            .bind(&tenant.key)
            .bind(&tenant.name)
            .bind(tenant.ping_limit)
            .bind(tenant.created_by)
            .fetch_one(&self.pool)
            .await?;

        Ok(row.get("id"))
    }

    /// Get all tenant this user has access too, not just those created by this user.
    pub async fn get_tenants(
        &self,
        user_id: Option<Uuid>,
    ) -> Result<Vec<(i32, Tenant)>, sqlx::Error> {
        let tenant_table = self.get_table("tenant");

        let rows = if let Some(uid) = user_id {
            let user_to_tenant_table = self.get_table("user_to_tenant");
            let query = format!(
                r#"
                SELECT t.id, t.key, t.name, t.ping_limit, t.created_by
                FROM {tenant_table} t
                JOIN {user_to_tenant_table} ut ON t.id = ut.tenant_id
                WHERE ut.user_id = $1
                ORDER BY t.name
                "#
            );
            sqlx::query(&query).bind(uid).fetch_all(&self.pool).await?
        } else {
            let query = format!(
                r#"
                SELECT id, key, name, ping_limit, created_by
                FROM {tenant_table}
                ORDER BY name
                "#
            );
            sqlx::query(&query).fetch_all(&self.pool).await?
        };

        let result = rows
            .into_iter()
            .map(|row| {
                let id: i32 = row.get("id");
                let tenant = Tenant {
                    key: row.get("key"),
                    name: row.get("name"),
                    ping_limit: row.get("ping_limit"),
                    created_by: row.get("created_by"),
                };
                (id, tenant)
            })
            .collect();

        Ok(result)
    }

    // Get the count of tenants created by the supplied user_id.
    pub async fn tenant_count(&self, user_id: Uuid) -> Result<i64, sqlx::Error> {
        let tenant_table = self.get_table("tenant");

        let query = format!("SELECT COUNT(*) FROM {tenant_table} WHERE created_by = $1");

        let count: i64 = sqlx::query_scalar(&query)
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;

        Ok(count)
    }

    // Get the tenant_limit for the supplied user.
    pub async fn tenant_limit(&self, user_id: Uuid) -> Result<i32, sqlx::Error> {
        let user_table = self.get_table("users");
        let query = format!("SELECT tenant_limit FROM {user_table} WHERE id = $1");
        let limit: i32 = sqlx::query_scalar(&query)
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(limit)
    }

    pub async fn tenant_assign_user(
        &self,
        tenant_id: i32,
        user_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        let user_to_tenant_table = self.get_table("user_to_tenant");

        let query = format!(
            r#"
            INSERT INTO {user_to_tenant_table} (user_id, tenant_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#
        );

        sqlx::query(&query)
            .bind(user_id)
            .bind(tenant_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn tenant_id_and_ping_limit_from_key(
        &self,
        key: &str, // tenant key
    ) -> Result<Option<(i32, i32)>, sqlx::Error> {
        let table_name = self.get_table("tenant");
        let query = format!("SELECT id, ping_limit FROM {table_name} WHERE key = $1");

        sqlx::query_as::<_, (i32, i32)>(&query)
            .bind(key)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn tenant_rename(
        &self,
        tenant_id: i32,
        user_id: Option<Uuid>,
        name: &str,
    ) -> Result<bool, sqlx::Error> {
        let table_name = self.get_table("tenant");

        // If user_id is provided, verify ownership
        if let Some(user_id) = user_id {
            let check_query = format!("SELECT created_by FROM {table_name} WHERE id = $1");

            if let Some(row) = sqlx::query(&check_query)
                .bind(tenant_id)
                .fetch_optional(&self.pool)
                .await?
            {
                let created_by: Uuid = row.get("created_by");
                if created_by != user_id {
                    return Ok(false); // User is not authorized to rename this tenant
                }
            } else {
                return Ok(false); // Tenant not found
            }
        }

        // Update the tenant name
        let update_query = format!("UPDATE {table_name} SET name = $1 WHERE id = $2");

        let result = sqlx::query(&update_query)
            .bind(name)
            .bind(tenant_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn tenant_set_ping_limit(
        &self,
        tenant_id: i32,
        user_id: Option<Uuid>,
        ping_limit: i32,
    ) -> Result<bool, sqlx::Error> {
        let table_name = self.get_table("tenant");

        // If user_id is provided, verify ownership
        if let Some(user_id) = user_id {
            let check_query = format!("SELECT created_by FROM {table_name} WHERE id = $1");

            if let Some(row) = sqlx::query(&check_query)
                .bind(tenant_id)
                .fetch_optional(&self.pool)
                .await?
            {
                let created_by: Uuid = row.get("created_by");
                if created_by != user_id {
                    return Ok(false); // User is not authorized to modify this tenant
                }
            } else {
                return Ok(false); // Tenant not found
            }
        }
        let update_query = format!("UPDATE {table_name} SET ping_limit = $1 WHERE id = $2");
        let result = sqlx::query(&update_query)
            .bind(ping_limit)
            .bind(tenant_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn count_recent_pings_for_tenant(
        &self,
        tenant_id: i32,
        since: chrono::DateTime<chrono::Utc>,
    ) -> Result<i64, sqlx::Error> {
        let ping_table = self.get_table("ping");
        let system_tag_table = self.get_table("system_tag");

        let query = format!(
            r#"
            SELECT COUNT(*) FROM {ping_table} p
            JOIN {system_tag_table} st ON p.system_tag_id = st.id
            WHERE st.tenant_id = $1 AND p.timestamp >= $2
            "#
        );

        sqlx::query_scalar(&query)
            .bind(tenant_id)
            .bind(since)
            .fetch_one(&self.pool)
            .await
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

    pub async fn system_tag_set_active(
        &self,
        system_tag_id: i32,
        user_id: Option<Uuid>,
        active: bool,
    ) -> Result<bool, sqlx::Error> {
        let table_name = self.get_table("system_tag");

        // If user_id is provided, verify ownership via tenant
        if let Some(user_id) = user_id {
            let tenant_table = self.get_table("tenant");
            let check_query = format!(
                r#"
                SELECT st.id
                FROM {table_name} st
                JOIN {tenant_table} t ON st.tenant_id = t.id
                WHERE st.id = $1 AND t.created_by = $2
                "#
            );
            if sqlx::query(&check_query)
                .bind(system_tag_id)
                .bind(user_id)
                .fetch_optional(&self.pool)
                .await?
                .is_none()
            {
                return Ok(false);
            }
        }

        let update_query = format!("UPDATE {table_name} SET active = $1 WHERE id = $2");
        let result = sqlx::query(&update_query)
            .bind(active)
            .bind(system_tag_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
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
            SELECT id, username, hostname, os_name, os_version, architecture, logical_cores, active
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
                "active": tag.get::<bool, _>("active"),
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
        // Always filter to only active systems
        where_clauses.push("st.active = true".to_string());

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

    /// Return a timeline of unique package counts.
    ///
    /// For a single SystemTag: returns the count of distinct packages on that system over time.
    ///
    /// For multiple SystemTags: maintains a running state of each system's package set (by package_id).
    /// When any system pings:
    ///  - Updates that system's package set in the state HashMap
    ///  - Counts unique packages across ALL systems' latest known package sets
    ///  - This gives the count of unique packages across all systems at each point in time
    ///
    /// Note: This counts unique package_ids, not unique (name, version) combinations. The same
    /// package version on different systems will have the same package_id and only be counted once.
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
            // we include `limit` ($2) past scans per system_tag_id
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
        // Get package_ids instead of counts so we can compute unique packages
        // we include `limit` ($2) past scans per system_tag_id
        let query = format!(
            r#"
        WITH ranked_scans AS (
            SELECT
                pi.id as ping_id,
                pi.timestamp,
                pi.system_tag_id,
                ROW_NUMBER() OVER (
                    PARTITION BY pi.system_tag_id
                    ORDER BY pi.timestamp DESC
                ) AS rank
            FROM {ping_table} pi
            WHERE pi.scanned = true
            {tenant_filter}
        ),
        filtered AS (
            SELECT ping_id, timestamp, system_tag_id FROM ranked_scans WHERE rank <= $1
        )
        SELECT f.timestamp, f.system_tag_id, ms.package_id
        FROM filtered f
        JOIN {monitor_scan_table} ms ON ms.ping_id = f.ping_id
        ORDER BY f.timestamp ASC
        "#,
            tenant_filter = if tenant_id.is_some() {
                format!(
                "AND pi.system_tag_id IN (SELECT id FROM {system_tag_table} WHERE tenant_id = $2 AND active = true)"
            )
            } else {
                format!("AND pi.system_tag_id IN (SELECT id FROM {system_tag_table} WHERE active = true)")
            }
        );

        let mut args = sqlx::postgres::PgArguments::default();
        let _ = args.add(limit as i64);
        if let Some(tid) = tenant_id {
            let _ = args.add(tid);
        }

        let rows = sqlx::query_with(&query, args).fetch_all(&self.pool).await?;

        // Single-pass aggregation: accumulate state and compute running totals
        let mut st_to_packages_latest: HashMap<i32, HashSet<i32>> = HashMap::new();
        let mut ts_counts: Vec<(DateTime<Utc>, i64)> = Vec::new();
        let mut current_ts: Option<DateTime<Utc>> = None;
        let mut current_packages: HashMap<i32, HashSet<i32>> = HashMap::new();

        for row in rows {
            let ts: DateTime<Utc> = row.get("timestamp");
            let tag_id: i32 = row.get("system_tag_id");
            let package_id: i32 = row.get("package_id");

            // When timestamp changes, finalize the previous timestamp
            if let Some(prev_ts) = current_ts {
                if prev_ts != ts {
                    // Update global state with packages from systems that pinged
                    for (tag_id, package_set) in current_packages.drain() {
                        st_to_packages_latest.insert(tag_id, package_set);
                    }
                    // Count unique packages across all systems by computing the union size
                    let count = st_to_packages_latest
                        .values()
                        .flatten()
                        .copied()
                        .collect::<HashSet<i32>>()
                        .len() as i64;
                    ts_counts.push((prev_ts, count));
                }
            }

            // Accumulate packages for the current timestamp
            current_ts = Some(ts);
            current_packages
                .entry(tag_id)
                .or_default()
                .insert(package_id);
        }

        // Finalize the last timestamp
        if let Some(ts) = current_ts {
            for (tag_id, package_set) in current_packages {
                st_to_packages_latest.insert(tag_id, package_set);
            }
            let count = st_to_packages_latest
                .values()
                .flatten()
                .copied()
                .collect::<HashSet<i32>>()
                .len() as i64;
            ts_counts.push((ts, count));
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
                        WHERE pi.scanned = true AND st.tenant_id = $1 AND st.active = true
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
                let system_tag_table = self.get_table("system_tag");
                let query = format!(
                    r#"
                    WITH latest_scans AS (
                        SELECT pi.system_tag_id, MAX(pi.timestamp) as latest_ts
                        FROM {ping_table} pi
                        JOIN {system_tag_table} st ON pi.system_tag_id = st.id
                        WHERE pi.scanned = true AND st.active = true
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

    /// From the DB, thus builds two mappings: package_to_sites (versioned Package to a Vec of sites) and package_to_id (versioned Package to its DB ID)
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
                format!("WHERE pi.system_tag_id = {id} AND st.active = true")
            } else if let Some(tid) = tenant_id {
                format!("WHERE st.tenant_id = {tid} AND st.active = true")
            } else {
                "WHERE st.active = true".to_string()
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

        if packages.is_empty() {
            let empty: Vec<Value> = vec![];
            return Ok(json!(empty));
        }
        let client = Arc::new(UreqClientLive);

        let audit = AuditReport::from_packages(
            client,
            &packages,
            FlagCacheRefresh(false), // keep vuln-level caches
            self.cache_config.clone(),
            FlagLog(false),
            CvssFilter::All,
        );
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

    /// Returns partitioned validation results, where known package-versions are identified by their package_id. The returned results may have multiple entries for each site with the same package-version
    pub async fn validate(
        &self,
        system_tag_id: Option<i32>,
        tenant_id: Option<i32>,
    ) -> ResultDynError<Value> {
        // Always get dep_manifest content first, regardless of packages
        let (dm_content, permit_superset, permit_subset) = match tenant_id {
            Some(t_id) => match self.dep_manifest_from_tenant_id(t_id).await? {
                Some(data) => (data.content, data.superset, data.subset),
                None => ("".to_string(), false, false),
            },
            None => ("".to_string(), false, false),
        };

        let (package_to_sites, package_to_id) = self
            .get_latest_packages_to_sites(system_tag_id, tenant_id)
            .await?;

        // we return pkg_id or -1, optional dependency (name, spec), optional site
        type ValidationEntry = (i32, Option<(String, String)>, Option<String>);

        if package_to_sites.is_empty() {
            let empty: Vec<ValidationEntry> = Vec::new();
            return Ok(json!({
                "dep_manifest": dm_content,
                "superset": permit_superset,
                "subset": permit_subset,
                "missing": empty,
                "unrequired": empty,
                "misdefined": empty,
            }));
        }

        let lf = LockFile::new(dm_content.clone());
        let deps = lf.get_dependencies(None)?; // can provide Vec<String> of options
        let dm = DepManifest::try_from_iter(deps.iter())?;
        let vf = ValidationFlags {
            permit_superset,
            permit_subset,
        };

        let packages: Vec<_> = package_to_sites.keys().cloned().collect();
        // packages.sort();
        let site_to_exe: HashMap<PathShared, Vec<PathShared>> = HashMap::new();

        let vr = ValidationReport::from_components(
            &packages,
            &package_to_sites,
            &site_to_exe,
            &None,
            &dm,
            &vf,
            None,
        );

        let mut missing: Vec<ValidationEntry> = Vec::new();
        let mut unrequired: Vec<ValidationEntry> = Vec::new();
        let mut misdefined: Vec<ValidationEntry> = Vec::new();
        // this is defined but should never be filled
        let mut undefined: Vec<ValidationEntry> = Vec::new();

        for record in vr.records {
            if let Some(ref pkg) = record.package {
                let pkg_id = package_to_id.get(pkg).unwrap_or(&-1);
                let target = match record.explain() {
                    ValidationExplain::Missing => &mut missing,
                    ValidationExplain::Unrequired => &mut unrequired,
                    ValidationExplain::Misdefined => &mut misdefined,
                    ValidationExplain::Undefined => &mut undefined,
                };
                // NOTE: we duplicate the pkg_id for different sites
                if let Some(sites) = record.sites {
                    for site in sites {
                        target.push((*pkg_id, None, Some(site.to_string())));
                    }
                } else {
                    target.push((*pkg_id, None, None));
                }
            } else {
                // package is missing, get dep spec
                if let Some(dep_spec) = record.dep_spec {
                    missing.push((-1, Some((dep_spec.name.clone(), dep_spec.to_spec())), None));
                }
            }
        }

        Ok(json!({
            "dep_manifest": dm_content,
            "superset": permit_superset,
            "subset": permit_subset,
            "missing": missing,
            "unrequired": unrequired,
            "misdefined": misdefined,
        }))
    }

    pub async fn dep_manifest_derive(
        &self,
        system_tag_id: Option<i32>,
        tenant_id: Option<i32>,
    ) -> ResultDynError<Value> {
        let (package_to_sites, _package_to_id) = self
            .get_latest_packages_to_sites(system_tag_id, tenant_id)
            .await?;
        let dm = DepManifest::from_packages(package_to_sites.keys(), CliAnchor::Lower.into())
            .expect("could not derive DepManifest from packages");
        let dmr = dm.to_dep_manifest_report();
        let dss: Vec<String> = dmr
            .get_records()
            .iter()
            .map(|r| r.dep_spec.to_string())
            .collect();
        Ok(json!(dss))
    }

    //--------------------------------------------------------------------------
    pub async fn dep_manifest_from_tenant_id(
        &self,
        tenant_id: i32,
    ) -> Result<Option<DepManifestData>, sqlx::Error> {
        let table_name = self.get_table("dep_manifest");

        let query = format!(
            r#"
            SELECT content, superset, subset
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
            let superset: bool = row.get("superset");
            let subset: bool = row.get("subset");

            Ok(Some(DepManifestData {
                content,
                superset,
                subset,
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

    //--------------------------------------------------------------------------

    pub async fn user_from_user_id(&self, user_id: Uuid) -> Result<User, sqlx::Error> {
        let user_table = self.get_table("users");

        let query = format!(
            r#"
            SELECT id, github_login, github_id, email, name, tenant_limit, term_accepted, created_at
            FROM {user_table}
            WHERE id = $1
            "#
        );

        let row = sqlx::query(&query)
            .bind(user_id)
            .map(|row: sqlx::postgres::PgRow| {
                Ok(User {
                    id: row.get("id"),
                    github_login: row.get("github_login"),
                    github_id: row.get("github_id"),
                    email: row.get("email"),
                    name: row.get("name"),
                    tenant_limit: row.get("tenant_limit"),
                    term_accepted: row.get("term_accepted"),
                    created_at: row
                        .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                        .to_rfc3339(),
                })
            })
            .fetch_one(&self.pool)
            .await?;
        row
    }

    pub async fn user_delete(&self, user_id: Uuid) -> Result<(), sqlx::Error> {
        let tenant_table = self.get_table("tenant");
        let system_tag_table = self.get_table("system_tag");
        let ping_table = self.get_table("ping");
        let monitor_scan_table = self.get_table("monitor_scan");
        let dep_manifest_table = self.get_table("dep_manifest");
        let user_tenant_last_table = self.get_table("user_tenant_last");
        let user_table = self.get_table("users");

        let mut tx = self.pool.begin().await?;

        // Step 1: Get all tenant IDs created by the user
        let tenant_ids: Vec<i32> = sqlx::query_scalar(&format!(
            "SELECT id FROM {tenant_table} WHERE created_by = $1"
        ))
        .bind(user_id)
        .fetch_all(&mut *tx)
        .await?;

        // Step 2: Delete monitor scans (by joining to ping -> system_tag -> tenant)
        let _ = sqlx::query(&format!(
            r#"
            DELETE FROM {monitor_scan_table}
            WHERE ping_id IN (
              SELECT p.id FROM {ping_table} p
              JOIN {system_tag_table} st ON p.system_tag_id = st.id
              WHERE st.tenant_id = ANY($1)
            )
            "#
        ))
        .bind(&tenant_ids)
        .execute(&mut *tx)
        .await?;

        // Step 3: Delete pings
        let _ = sqlx::query(&format!(
            r#"
            DELETE FROM {ping_table}
            WHERE system_tag_id IN (
              SELECT id FROM {system_tag_table}
              WHERE tenant_id = ANY($1)
            )
            "#
        ))
        .bind(&tenant_ids)
        .execute(&mut *tx)
        .await?;

        // Step 4: Delete system tags
        let _ = sqlx::query(&format!(
            "DELETE FROM {system_tag_table} WHERE tenant_id = ANY($1)"
        ))
        .bind(&tenant_ids)
        .execute(&mut *tx)
        .await?;

        // Step 5: Delete dep manifests
        let _ = sqlx::query(&format!(
            "DELETE FROM {dep_manifest_table} WHERE tenant_id = ANY($1)"
        ))
        .bind(&tenant_ids)
        .execute(&mut *tx)
        .await?;

        // Step 6: Delete tenants
        let _ = sqlx::query(&format!("DELETE FROM {tenant_table} WHERE created_by = $1"))
            .bind(user_id)
            .execute(&mut *tx)
            .await?;

        // Step 6.5: Delete user_tenant_last
        let _ = sqlx::query(&format!(
            "DELETE FROM {user_tenant_last_table} WHERE user_id = $1"
        ))
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

        // Step 7: Delete user
        let _ = sqlx::query(&format!("DELETE FROM {user_table} WHERE id = $1"))
            .bind(user_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    pub async fn get_users(&self) -> Result<Vec<User>, sqlx::Error> {
        let user_table = self.get_table("users");

        let query = format!(
            r#"
            SELECT id, github_login, github_id, email, name, tenant_limit, term_accepted, created_at
            FROM {user_table}
            ORDER BY created_at DESC
            "#
        );

        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;

        let result = rows
            .into_iter()
            .map(|row| User {
                id: row.get("id"),
                github_login: row.get("github_login"),
                github_id: row.get("github_id"),
                email: row.get("email"),
                name: row.get("name"),
                tenant_limit: row.get("tenant_limit"),
                term_accepted: row.get("term_accepted"),
                created_at: row
                    .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                    .to_rfc3339(),
            })
            .collect();

        Ok(result)
    }

    pub async fn get_next_tenant_key(&self, user_id: Uuid) -> Result<String, sqlx::Error> {
        let tenant_table = self.get_table("tenant");

        let query = format!(
            r#"
            SELECT COUNT(*) FROM {tenant_table}
            WHERE created_by = $1
            "#
        );

        let tenant_count: i64 = sqlx::query_scalar(&query)
            .bind(user_id)
            .fetch_one(&self.pool)
            .await?;

        let tenant_key = strings_to_hash(vec![
            &self.salt,
            &user_id.to_string(),
            &tenant_count.to_string(),
        ]);

        Ok(tenant_key)
    }

    /// Check if a user exists; if not, add that user. Also check that user has a default "Self" tenant and that that tenant is mapped to this User
    pub async fn user_tenant_init(
        &self,
        github_login: &str,
        github_id: i32,
        email: &str,
        name: &str,
    ) -> Result<Uuid, sqlx::Error> {
        let user_table = self.get_table("users");
        let tenant_table = self.get_table("tenant");
        let user_to_tenant_table = self.get_table("user_to_tenant");

        // Step 1: ensure user exists; grab UUID id
        let select_user = format!("SELECT id FROM {user_table} WHERE github_id = $1");
        let user_id: Uuid = if let Some(id) = sqlx::query_scalar::<_, Uuid>(&select_user)
            .bind(github_id)
            .fetch_optional(&self.pool)
            .await?
        {
            id
        } else {
            let insert_user = format!(
                "INSERT INTO {user_table} (github_login, github_id, email, name, tenant_limit)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id"
            );
            sqlx::query_scalar::<_, Uuid>(&insert_user)
                .bind(github_login)
                .bind(github_id)
                .bind(email)
                .bind(name)
                .bind(self.default_tenant_limit)
                .fetch_one(&self.pool)
                .await?
        };

        // Step 2: if user has no tenant, create one and map it
        if self.tenant_count(user_id).await? == 0 {
            let tenant_key = self.get_next_tenant_key(user_id).await?;
            let tenant_name = String::from("Self");

            let insert_tenant = format!(
                "INSERT INTO {tenant_table} (key, name, ping_limit, created_by)
             VALUES ($1, $2, $3, $4)
             RETURNING id"
            );
            let tenant_id: i32 = sqlx::query_scalar::<_, i32>(&insert_tenant)
                .bind(&tenant_key)
                .bind(&tenant_name)
                .bind(self.default_ping_limit)
                .bind(user_id)
                .fetch_one(&self.pool)
                .await?;

            let insert_mapping = format!(
                "INSERT INTO {user_to_tenant_table} (user_id, tenant_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING"
            );
            sqlx::query(&insert_mapping)
                .bind(user_id)
                .bind(tenant_id)
                .execute(&self.pool)
                .await?;

            self.user_set_tenant_last(user_id, tenant_id).await?;
        }
        Ok(user_id)
    }

    // pub async fn user_id_from_login(
    //     &self,
    //     github_login: &str,
    // ) -> Result<Option<Uuid>, sqlx::Error> {
    //     let user_table = self.get_table("users");
    //     let query = format!("SELECT id FROM {user_table} WHERE github_login = $1");

    //     let row = sqlx::query(&query)
    //         .bind(github_login)
    //         .fetch_optional(&self.pool)
    //         .await?;

    //     Ok(row.map(|r| r.get("id")))
    // }

    pub async fn user_term_accepted(&self, user_id: Uuid) -> Result<bool, sqlx::Error> {
        let user_table = self.get_table("users");

        let query = format!(
            r#"
            SELECT term_accepted
            FROM {user_table}
            WHERE id = $1
            "#
        );

        let result: Option<bool> = sqlx::query_scalar(&query)
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(result.unwrap_or(false))
    }

    pub async fn user_set_term_accepted(&self, user_id: Uuid) -> Result<(), sqlx::Error> {
        let user_table = self.get_table("users");

        let query = format!(
            r#"
            UPDATE {user_table}
            SET term_accepted = TRUE
            WHERE id = $1
            "#
        );
        sqlx::query(&query)
            .bind(user_id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn user_tenant_last(&self, user_id: Uuid) -> Result<Option<i32>, sqlx::Error> {
        let user_tenant_last_table = self.get_table("user_tenant_last");

        let query = format!(
            r#"
            SELECT tenant_id
            FROM {user_tenant_last_table}
            WHERE user_id = $1
            "#
        );

        let result: Option<i32> = sqlx::query_scalar(&query)
            .bind(user_id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(result)
    }

    pub async fn user_set_tenant_last(
        &self,
        user_id: Uuid,
        tenant_id: i32,
    ) -> Result<(), sqlx::Error> {
        let user_tenant_last_table = self.get_table("user_tenant_last");

        let query = format!(
            r#"
            INSERT INTO {user_tenant_last_table} (user_id, tenant_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET tenant_id = EXCLUDED.tenant_id
            "#
        );
        sqlx::query(&query)
            .bind(user_id)
            .bind(tenant_id)
            .execute(&self.pool)
            .await?;

        Ok(())
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

        let mut tx = self.pool.begin().await?;

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
        .fetch_one(&mut *tx)
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
                        .execute(&mut *tx)
                        .await?;
                }
            }
        }
        tx.commit().await?;
        Ok(())
    }

    pub async fn monitor_scan_load_from_json(&self, payload: &str) -> Result<(), sqlx::Error> {
        // TODO: return more rebust error message on malformed json
        let (tenant_key, st, scan_fs, ts): (String, SystemTag, Option<ScanFS>, Duration) =
            serde_json::from_str(payload).expect("Invalid JSON payload");

        let (tenant_id, ping_limit) =
            match self.tenant_id_and_ping_limit_from_key(&tenant_key).await? {
                Some(v) => v,
                None => {
                    return Err(sqlx::Error::Protocol(format!(
                        "Tenant key not found: {tenant_key}"
                    )));
                }
            };

        let recent_cutoff = Utc::now() - ChronoDuration::hours(24);
        let ping_count = self
            .count_recent_pings_for_tenant(tenant_id, recent_cutoff)
            .await?;

        if ping_count >= ping_limit as i64 {
            return Err(sqlx::Error::Protocol(format!(
                "Ping limit exceeded for tenant: {tenant_key} (limit: {ping_limit}, found: {ping_count})"
            )));
        }
        let st_id = self.system_tag_insert_or_get(tenant_id, &st).await?;

        self.monitor_scan_load(&scan_fs, st_id, &ts).await
    }

    pub async fn dep_manifest_load(
        &self,
        tenant_id: i32,
        user_id: Option<Uuid>,
        content: &String,
        superset: bool,
        subset: bool,
    ) -> Result<bool, sqlx::Error> {
        // If user_id is provided, verify ownership
        if let Some(user_id) = user_id {
            let tenant_table = self.get_table("tenant");
            let check_query = format!("SELECT created_by FROM {tenant_table} WHERE id = $1");
            if let Some(row) = sqlx::query(&check_query)
                .bind(tenant_id)
                .fetch_optional(&self.pool)
                .await?
            {
                let created_by: Uuid = row.get("created_by");
                if created_by != user_id {
                    return Ok(false); // User is not authorized to modify this tenant
                }
            } else {
                return Ok(false); // Tenant not found
            }
        }
        let dep_manifest_table = self.get_table("dep_manifest");

        let insert_query = format!(
            r#"
            INSERT INTO {dep_manifest_table} (tenant_id, content, superset, subset)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id)
            DO UPDATE SET content = EXCLUDED.content, superset = EXCLUDED.superset, subset = EXCLUDED.subset
            "#
        );
        sqlx::query(&insert_query)
            .bind(tenant_id)
            .bind(content)
            .bind(superset)
            .bind(subset)
            .execute(&self.pool)
            .await?;

        Ok(true)
    }

    pub async fn dep_manifest_load_from_json(&self, payload: &str) -> Result<bool, sqlx::Error> {
        let request: DepManifestRequest =
            serde_json::from_str(payload).expect("Invalid JSON payload");

        let user_id = Uuid::parse_str(&request.user_id).map_err(|_| sqlx::Error::RowNotFound)?;

        self.dep_manifest_load(
            request.tenant_id,
            Some(user_id),
            &request.content,
            request.superset,
            request.subset,
        )
        .await
    }
}
