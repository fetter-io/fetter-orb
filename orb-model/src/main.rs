use axum::{
    extract::Query,
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
// use serde::Serialize;
use serde::Deserialize;
use serde_json::Value;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

use fetter::{Package, SystemTag};
use orb_model::db_context::DBContext;
use orb_model::db_via_container::get_db_pool;

//------------------------------------------------------------------------------
// endpoint implementations

pub async fn post_monitor_scan_load(
    State(db): State<DBContext>,
    body: String,
) -> Result<StatusCode, (StatusCode, String)> {
    match db.monitor_scan_load_from_json(&body).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn get_system_tag_all(
    State(db): State<DBContext>,
) -> Result<Json<Vec<(i32, SystemTag)>>, (StatusCode, String)> {
    match db.system_tag_all().await {
        Ok(sts) => Ok(Json(sts)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn get_package_all(
    State(db): State<DBContext>,
) -> Result<Json<Vec<(i32, Package)>>, (StatusCode, String)> {
    match db.package_all().await {
        Ok(sts) => Ok(Json(sts)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

#[derive(Deserialize)]
pub struct PackageVersionsParams {
    pub system_tag_id: Option<i32>,
}

pub async fn get_package_versions(
    State(db): State<DBContext>,
    Query(params): Query<PackageVersionsParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    db.package_versions(params.system_tag_id)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

//------------------------------------------------------------------------------
#[tokio::main]
async fn main() {
    // tracing_subscriber::fmt::init();

    // can branch when given a URL for a live DB
    let pool = get_db_pool().await;
    let dbx = DBContext::new(pool, None);
    let _ = dbx.tables_create().await;

    let cors = CorsLayer::new()
        .allow_origin(Any) // TODO: tighten later
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/system_tag", get(get_system_tag_all))
        .route("/package", get(get_package_all))
        .route("/package_versions", get(get_package_versions))
        .route("/monitor_scan", post(post_monitor_scan_load))
        .layer(cors)
        .with_state(dbx);

    // let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    let listener = TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}
