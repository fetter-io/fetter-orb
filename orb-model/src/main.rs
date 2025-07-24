use axum::{
    extract::Query,
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;
use serde_json::Value;
use std::fs;
use std::net::SocketAddr;
use std::path::PathBuf;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

use orb_model::db_context::DBContext;
use orb_model::db_context::Tenant;
use orb_model::db_via_container::get_db_pool;

//------------------------------------------------------------------------------
pub async fn db_bootstrap(db: &DBContext) {
    let _ = db.monitor_scan_load_from_json(r#"["team-a",{"username":"alpha","hostname":"alpha-p1g7","os_name":"linux","os_version":"24.04","architecture":"x86_64","logical_cores":22},null,{"secs":1743632088,"nanos":72262432}]"#).await;

    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");
    db.monitor_scan_load_from_json(&msg1).await.unwrap();

    let mut path2 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path2.push("tests/fixtures/monitor-scan-01.json");
    let msg2 = fs::read_to_string(path2).expect("Failed to read JSON file");
    db.monitor_scan_load_from_json(&msg2).await.unwrap();

    let mut path3 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path3.push("tests/fixtures/monitor-scan-01.json");
    let msg3 = fs::read_to_string(path3).expect("Failed to read JSON file");
    db.monitor_scan_load_from_json(&msg3).await.unwrap();
}

//------------------------------------------------------------------------------
// endpoint implementations

pub async fn post_monitor_scan(
    State(db): State<DBContext>,
    body: String,
) -> Result<StatusCode, (StatusCode, String)> {
    match db.monitor_scan_load_from_json(&body).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn post_dep_manifest(
    State(db): State<DBContext>,
    body: String,
) -> Result<StatusCode, (StatusCode, String)> {
    match db.dep_manifest_load_from_json(&body).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

//------------------------------------------------------------------------------
pub async fn get_tenant_all(
    State(db): State<DBContext>,
) -> Result<Json<Vec<(i32, Tenant)>>, (StatusCode, String)> {
    match db.tenant_all().await {
        Ok(sts) => Ok(Json(sts)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

//------------------------------------------------------------------------------
#[derive(Deserialize, Debug)]
pub struct DepManifestParams {
    pub system_tag_id: Option<i32>,
    pub tenant_id: Option<i32>,
}

pub async fn get_dep_manifest(
    State(db): State<DBContext>,
    Query(params): Query<DepManifestParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    // println!("{:?}", params);
    match params.tenant_id {
        Some(tenant_id) => db
            .dep_manifest_from_tenant_id(tenant_id)
            .await
            .map(|opt| {
                Json(match opt {
                    Some(text) => serde_json::json!({ "dep_manifest": text }),
                    None => serde_json::json!(null),
                })
            })
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        None => Ok(Json(serde_json::json!([]))),
    }
}

pub async fn get_validate(
    State(db): State<DBContext>,
    Query(params): Query<DepManifestParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    match params.tenant_id {
        Some(tenant_id) => db
            .validate(params.system_tag_id, Some(tenant_id))
            .await
            .map(Json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        None => Ok(Json(json!({
            "dep_manifest": "",
            "missing": [],
            "unrequired": [],
            "misdefined": [],
            "undefined": []
        }))),
    }
}

//------------------------------------------------------------------------------

#[derive(Deserialize, Debug)]
pub struct PackageVersionsParams {
    pub system_tag_id: Option<i32>,
    pub tenant_id: Option<i32>,
}

pub async fn get_package_versions(
    State(db): State<DBContext>,
    Query(params): Query<PackageVersionsParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    // println!("{:?}", params);
    match params.tenant_id {
        Some(tenant_id) => db
            .package_versions(params.system_tag_id, Some(tenant_id))
            .await
            .map(Json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        None => Ok(Json(serde_json::json!({}))),
    }
}

//------------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct PackageCountsParams {
    pub system_tag_id: Option<i32>,
    pub tenant_id: Option<i32>,
    pub limit: Option<usize>,
}

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

#[derive(Deserialize, Debug)]
pub struct OnLoginParams {
    // pub github_id: i64,
    pub login: String,
    pub email: String,
    pub name: String,
}

pub async fn on_login(
    State(db): State<DBContext>,
    Json(payload): Json<OnLoginParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    // let secret = std::env::var("NEXTAUTH_SECRET").map_err(|e| {
    //     (
    //         StatusCode::INTERNAL_SERVER_ERROR,
    //         format!("Missing NEXTAUTH_SECRET: {}", e),
    //     )
    // })?;
    let salt = "42";

    let user_id = db
        .user_tenant_init(
            &payload.login,
            &payload.email,
            &payload.name,
            salt,
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "user_id": user_id })))
}

//------------------------------------------------------------------------------
#[tokio::main]
async fn main() {
    // tracing_subscriber::fmt::init();

    // can branch when given a URL for a live DB
    let pool = get_db_pool().await;
    let dbx = DBContext::new(pool, None);

    // NOTE: testing
    dbx.tables_drop().await.expect("failed to drop tables");

    // let _ = dbx.tables_create(true).await;
    dbx.tables_create(true)
        .await
        .expect("failed to create tables");
    // NOTE: could read-in tenant definitions from a flat file on init

    // NOTE: for testing
    db_bootstrap(&dbx).await;

    let cors = CorsLayer::new()
        .allow_origin(Any) // TODO: tighten later
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/tenant", get(get_tenant_all))
        .route("/system_tag_pings", get(get_system_tag_pings))
        .route("/package_versions", get(get_package_versions))
        .route("/package_counts", get(get_package_counts))
        .route("/audit", get(get_audit))
        .route("/validate", get(get_validate))
        // post requests
        .route("/on_login", post(on_login))
        .route("/monitor_scan", post(post_monitor_scan))
        .route("/dep_manifest", post(post_dep_manifest))
        .layer(cors)
        .with_state(dbx);

    // let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    let listener = TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}
