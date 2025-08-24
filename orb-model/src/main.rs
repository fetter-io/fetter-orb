use axum::{
    body::Body,
    extract::FromRef,
    extract::Query,
    extract::State,
    http::Request,
    http::StatusCode,
    middleware::from_fn_with_state,
    middleware::Next,
    response::Response,
    routing::{get, post},
    Json, Router,
};
// use chrono::Local;
use orb_model::db_context::DBContext;
use orb_model::db_context::Tenant;
use orb_model::db_context::User;
use orb_model::db_via_container::get_db_pool;
use orb_model::env_loader::load_env;
use serde::Deserialize;
use serde::Serialize;
use serde_json::json;
use serde_json::Value;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions, PgSslMode};
use sqlx::PgPool;
use std::env;
use std::net::SocketAddr;
use std::str::FromStr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower::ServiceBuilder;
use tower_http::catch_panic::CatchPanicLayer;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

//------------------------------------------------------------------------------
// endpoint implementations

pub async fn post_monitor_scan(
    State(db): State<Arc<DBContext>>,
    body: String,
) -> Result<StatusCode, (StatusCode, String)> {
    // println!("monitor_scan: {:?}", body);
    match db.monitor_scan_load_from_json(&body).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn post_dep_manifest(
    State(db): State<Arc<DBContext>>,
    body: String,
) -> Result<StatusCode, (StatusCode, String)> {
    match db.dep_manifest_load_from_json(&body).await {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

//------------------------------------------------------------------------------

#[derive(Deserialize, Debug)]
pub struct TenantQueryParams {
    pub user_id: Option<Uuid>,
}

pub async fn get_tenant(
    State(db): State<Arc<DBContext>>,
    Query(params): Query<TenantQueryParams>,
) -> Result<Json<Vec<(i32, Tenant)>>, (StatusCode, String)> {
    match params.user_id {
        Some(user_id) => db
            .get_tenants(Some(user_id))
            .await
            .map(Json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
        None => db
            .get_tenants(None)
            .await
            .map(Json)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

//------------------------------------------------------------------------------
#[derive(Deserialize, Debug)]
pub struct DepManifestParams {
    pub system_tag_id: Option<i32>,
    pub tenant_id: Option<i32>,
}

pub async fn get_dep_manifest(
    State(db): State<Arc<DBContext>>,
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
    State(db): State<Arc<DBContext>>,
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
    State(db): State<Arc<DBContext>>,
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
    State(db): State<Arc<DBContext>>,
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
    State(db): State<Arc<DBContext>>,
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
    State(db): State<Arc<DBContext>>,
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
    pub github_login: String,
    pub github_id: i32,
    pub email: String,
    pub name: String,
}

pub async fn post_on_login(
    State(db): State<Arc<DBContext>>,
    Json(payload): Json<OnLoginParams>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let user_id = db
        .user_tenant_init(
            &payload.github_login,
            payload.github_id,
            &payload.email,
            &payload.name,
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(json!({ "user_id": user_id })))
}

//------------------------------------------------------------------------------
#[derive(Deserialize)]
pub struct TenantSetParams {
    name: String,
    user_id: Uuid,
}

// This is used to create a new Tenant, given the tenant's name and the user_id. NOTE: this does not automatically set thew tenant as the tenant last.
pub async fn set_tenant(
    State(db): State<Arc<DBContext>>,
    Json(input): Json<TenantSetParams>,
) -> Result<Json<i32>, (StatusCode, String)> {
    let tenant_key = db
        .get_next_tenant_key(input.user_id, &input.name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let tenant = Tenant {
        key: tenant_key,
        name: input.name.clone(),
        ping_limit: db.default_ping_limit,
        created_by: input.user_id,
    };

    let tenant_id = db
        .tenant_insert_or_get(&tenant)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    db.tenant_assign_user(tenant_id, input.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(tenant_id))
}
//------------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct UserParams {
    pub user_id: Uuid,
}

pub async fn get_user_term_accept(
    State(db): State<Arc<DBContext>>,
    Query(params): Query<UserParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    db.user_term_accepted(params.user_id)
        .await
        .map(|accepted| Json(json!({ "term_accepted": accepted })))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn set_user_term_accept(
    State(db): State<Arc<DBContext>>,
    Json(body): Json<UserParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    db.user_set_term_accepted(body.user_id)
        .await
        .map(|_| Json(json!({ "status": "ok" })))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn get_user(
    State(db): State<Arc<DBContext>>,
    Query(params): Query<UserParams>,
) -> Result<Json<User>, (StatusCode, String)> {
    db.user_from_user_id(params.user_id)
        .await
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

#[derive(Serialize)]
pub struct TenantCountResponse {
    count: i64,
}

pub async fn get_tenant_count(
    State(db): State<Arc<DBContext>>,
    Query(params): Query<UserParams>,
) -> Result<Json<TenantCountResponse>, (StatusCode, String)> {
    db.tenant_count(params.user_id)
        .await
        .map(|count| Json(TenantCountResponse { count }))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn get_tenant_limit(
    State(db): State<Arc<DBContext>>,
    Query(params): Query<UserParams>,
) -> Result<Json<TenantCountResponse>, (StatusCode, String)> {
    db.tenant_limit(params.user_id)
        .await
        .map(|count| {
            Json(TenantCountResponse {
                count: count.into(),
            })
        })
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn post_delete_user(
    State(db): State<Arc<DBContext>>,
    Json(body): Json<UserParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    db.user_delete(body.user_id)
        .await
        .map(|_| Json(json!({ "status": "ok" })))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn get_user_tenant_last(
    State(db): State<Arc<DBContext>>,
    Query(params): Query<UserParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    db.user_tenant_last(params.user_id)
        .await
        .map(|id| Json(json!({ "tenant_id": id })))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

#[derive(Deserialize)]
pub struct UserTenantParams {
    pub user_id: Uuid,
    pub tenant_id: i32,
}

pub async fn set_user_tenant_last(
    State(db): State<Arc<DBContext>>,
    Json(body): Json<UserTenantParams>,
) -> Result<Json<Value>, (StatusCode, String)> {
    db.user_set_tenant_last(body.user_id, body.tenant_id)
        .await
        .map(|_| Json(json!({ "status": "ok" })))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

async fn get_health() -> &'static str {
    "OK"
}

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

#[derive(Clone)]
struct AppState {
    db: Arc<DBContext>,
    tenant_secret: Arc<String>,
}

impl FromRef<AppState> for Arc<DBContext> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.db.clone() // just clones the Arc, cheap
    }
}

impl FromRef<AppState> for Arc<String> {
    fn from_ref(app_state: &AppState) -> Self {
        app_state.tenant_secret.clone()
    }
}

pub async fn require_internal_header(
    State(secret): State<Arc<String>>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    // Ok(next.run(req).await)
    if let Some(value) = req.headers().get("x-orb-internal") {
        // println!("{:?} {:?}", value, secret);
        if value == secret.as_str() {
            return Ok(next.run(req).await);
        }
    }
    Err(StatusCode::UNAUTHORIZED)
}

//------------------------------------------------------------------------------
#[tokio::main]
async fn main() {
    load_env(); // Loads .env, .env.local
    let pool = pick_db_pool().await;
    let dbx = DBContext::new(pool, None);

    // TODO: only if testing
    dbx.tables_drop().await.expect("failed to drop tables");
    dbx.tables_create(true)
        .await
        .expect("failed to create tables");

    let app_state = AppState {
        db: Arc::new(dbx),
        tenant_secret: Arc::new(env::var("TENANT_SECRET").unwrap_or_default()),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any) // TODO: tighten later
        .allow_methods(Any)
        .allow_headers(Any);

    let route_protected = Router::new()
        .route("/audit", get(get_audit))
        .route("/dep_manifest", post(post_dep_manifest))
        .route("/on_login", post(post_on_login))
        .route("/package_versions", get(get_package_versions))
        .route("/package_counts", get(get_package_counts))
        .route("/system_tag_pings", get(get_system_tag_pings))
        .route("/tenant", get(get_tenant).post(set_tenant))
        .route("/tenant_count", get(get_tenant_count))
        .route("/tenant_limit", get(get_tenant_limit))
        .route(
            "/user_tenant_last",
            get(get_user_tenant_last).post(set_user_tenant_last),
        )
        .route("/user", get(get_user))
        .route("/user_delete", post(post_delete_user))
        .route(
            "/user_terms",
            get(get_user_term_accept).post(set_user_term_accept),
        )
        .route("/validate", get(get_validate))
        .with_state(app_state.clone())
        .layer(from_fn_with_state(
            app_state.clone(),
            require_internal_header,
        ));

    let route_monitor_scan = {
        let is_local = match env::var("NEXTAUTH_URL") {
            Ok(url) => url.starts_with("http://localhost"),
            Err(_) => false,
        };
        let r = Router::new().route("/monitor_scan", post(post_monitor_scan));
        if is_local {
            println!("/monitor_scan unprotected");
            r
        } else {
            r.layer(from_fn_with_state(
                app_state.clone(),
                require_internal_header,
            ))
        }
    };

    let route_unprotected = Router::new().route("/health", get(get_health));

    let app = route_unprotected
        .merge(route_protected)
        .merge(route_monitor_scan)
        .layer(
            ServiceBuilder::new()
                .layer(CatchPanicLayer::new())
                .layer(cors),
        )
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    let listener = TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}
