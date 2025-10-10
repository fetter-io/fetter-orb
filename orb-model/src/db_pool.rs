use crate::db_via_container::get_db_pool;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions, PgSslMode};
use sqlx::PgPool;
use std::env;
use std::str::FromStr;

//------------------------------------------------------------------------------
pub async fn pick_db_pool() -> PgPool {
    // max_connections ≈ (num_cores × 2) to (num_cores × 4), but less than 100
    // connection consumes ~5–10 MB RAM idle, and more under heavy load.
    if let Some(db_url) = env::var("DATABASE_URL").ok().filter(|s| !s.is_empty()) {
        println!("attempting to create a pool from URL");
        let options = PgConnectOptions::from_str(&db_url)
            .expect("DB url failed")
            .ssl_mode(PgSslMode::Require);
        let pool = PgPoolOptions::new()
            .max_connections(20)
            .acquire_timeout(std::time::Duration::from_secs(120))
            .idle_timeout(None)
            .max_lifetime(None)
            .connect_with(options)
            .await
            .expect("DB connection failed");
        println!("pool created");
        pool
    } else {
        // Fallback to local containers
        get_db_pool().await
    }
}
