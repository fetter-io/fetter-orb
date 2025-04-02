use sqlx::PgPool;
use std::process::{Command, Stdio};
use std::{thread::sleep, time::Duration};
use tokio::sync::OnceCell;

const DB_USER: &str = "postgres";
const DB_PASSWORD: &str = "postgres";
const DB_NAME: &str = "postgres";
const DB_PORT: u16 = 55432;
const CONTAINER_NAME: &str = "rust-test-postgres";
const IMAGE: &str = "postgres:14";

static INIT: OnceCell<()> = OnceCell::const_new();

async fn wait_for_db(db_url: &str) {
    let max_attempts = 20;

    for attempt in 1..=max_attempts {
        match PgPool::connect(db_url).await {
            Ok(pool) => {
                if pool.acquire().await.is_ok() {
                    return;
                }
            }
            Err(_) => {}
        }
        println!("⏳ Waiting for DB... attempt {}/{}", attempt, max_attempts);
        sleep(Duration::from_millis(500));
    }
    panic!("Timed out waiting for Postgres to become ready");
}

pub async fn start_postgres_container() {
    let _ = Command::new("docker")
        .args([
            "run",
            "--rm",
            "--name",
            CONTAINER_NAME,
            "-e",
            &format!("POSTGRES_USER={}", DB_USER),
            "-e",
            &format!("POSTGRES_PASSWORD={}", DB_PASSWORD),
            "-e",
            &format!("POSTGRES_DB={}", DB_NAME),
            "-p",
            &format!("{}:5432", DB_PORT),
            "-d",
            IMAGE,
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .expect("Failed to start docker container");

    let db_url = format!(
        "postgres://{}:{}@localhost:{}/{}",
        DB_USER, DB_PASSWORD, DB_PORT, DB_NAME
    );

    wait_for_db(&db_url).await;
}

// fn stop_postgres_container() {
//     let _ = Command::new("docker")
//         .args(["stop", CONTAINER_NAME])
//         .status();
// }

pub async fn get_db_pool() -> PgPool {
    INIT.get_or_init(|| async {
        start_postgres_container().await; //
    })
    .await;

    let db_url = format!(
        "postgres://{}:{}@localhost:{}/{}",
        DB_USER, DB_PASSWORD, DB_PORT, DB_NAME
    );

    PgPool::connect(&db_url)
        .await
        .expect("DB connection failed")
}
