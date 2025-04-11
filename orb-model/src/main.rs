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

// use fetter::Package;
use orb_model::db_context::DBContext;
use orb_model::db_context::Tenant;
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

pub async fn get_tenant_all(
    State(db): State<DBContext>,
) -> Result<Json<Vec<(i32, Tenant)>>, (StatusCode, String)> {
    match db.tenant_all().await {
        Ok(sts) => Ok(Json(sts)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

// pub async fn get_package_all(
//     State(db): State<DBContext>,
// ) -> Result<Json<Vec<(i32, Package)>>, (StatusCode, String)> {
//     // TODO: get tenant
//     match db.package_all(1).await {
//         Ok(sts) => Ok(Json(sts)),
//         Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
//     }
// }

//------------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct PackageVersionsParams {
    pub system_tag_id: Option<i32>,
    pub tenant_id: Option<i32>,
}

pub async fn get_package_versions(
    State(db): State<DBContext>,
    Query(params): Query<PackageVersionsParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    match params.tenant_id {
        Some(tenant_id) => db
            .package_versions(params.system_tag_id, Some(tenant_id))
            .await
            .map(Json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        None => Ok(Json(serde_json::json!({}))),
    }
}

#[derive(Deserialize)]
pub struct PackageCountsParams {
    pub system_tag_id: Option<i32>,
    pub tenant_id: Option<i32>,
    pub limit: Option<usize>,
}

// pub async fn get_package_counts(
//     State(db): State<DBContext>,
//     Query(params): Query<PackageCountsParams>,
// ) -> Result<Json<Value>, (StatusCode, String)> {
//     // TODO: get tenant
//     db.package_counts(params.system_tag_id, Some(1), None)
//         .await
//         .map(Json)
//         .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
// }

pub async fn get_package_counts(
    State(db): State<DBContext>,
    Query(params): Query<PackageCountsParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    match params.tenant_id {
        Some(tenant_id) => db
            .package_counts(params.system_tag_id, Some(tenant_id), params.limit)
            .await
            .map(Json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        None => Ok(Json(serde_json::json!([]))),
    }
}
//------------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct SystemTagPingsParams {
    pub tenant_id: Option<i32>,
    pub limit: Option<usize>,
}

// pub async fn get_system_tag_pings(
//     State(db): State<DBContext>,
//     Query(params): Query<SystemTagPingsParams>,
// ) -> Result<Json<Value>, (StatusCode, String)> {
//     // TODO: get tenant
//     db.system_tag_pings(1, params.limit)
//         .await
//         .map(Json)
//         .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
// }

pub async fn get_system_tag_pings(
    State(db): State<DBContext>,
    Query(params): Query<SystemTagPingsParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    match params.tenant_id {
        Some(tenant_id) => db
            .system_tag_pings(tenant_id, params.limit)
            .await
            .map(Json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        None => Ok(Json(Value::Array(vec![]))),
    }
}

//------------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct AuditParams {
    pub system_tag_id: Option<i32>,
    pub tenant_id: Option<i32>,
}

pub async fn get_audit(
    State(db): State<DBContext>,
    Query(params): Query<AuditParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    match params.tenant_id {
        Some(tenant_id) => db
            .audit(params.system_tag_id, Some(tenant_id))
            .await
            .map(Json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        None => Ok(Json(serde_json::json!([]))),
    }
}

//------------------------------------------------------------------------------
#[tokio::main]
async fn main() {
    // tracing_subscriber::fmt::init();

    // can branch when given a URL for a live DB
    let pool = get_db_pool().await;
    let dbx = DBContext::new(pool, None);
    // dbx.tables_drop().await;
    let _ = dbx.tables_create(true).await;

    let cors = CorsLayer::new()
        .allow_origin(Any) // TODO: tighten later
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // .route("/system_tag", get(get_system_tag_all))
        .route("/tenant", get(get_tenant_all))
        .route("/system_tag_pings", get(get_system_tag_pings))
        // .route("/package", get(get_package_all))
        .route("/package_versions", get(get_package_versions))
        .route("/package_counts", get(get_package_counts))
        .route("/audit", get(get_audit))
        // post requests
        .route("/monitor_scan", post(post_monitor_scan_load))
        .layer(cors)
        .with_state(dbx);

    // let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    let listener = TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}
