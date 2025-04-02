use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;
use tokio::net::TcpListener;
use tower_http::cors::{CorsLayer, Any};
use std::net::SocketAddr;

#[derive(Serialize)]
struct HealthResponse {
    status: String,
}

async fn root() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok fetter orb!".to_string(),
    })
}

async fn create_user() -> &'static str {
    "user created"
}

//------------------------------------------------------------------------------
#[tokio::main]
async fn main() {
    // tracing_subscriber::fmt::init();

    let cors = CorsLayer::new()
        .allow_origin(Any) // TODO: tighten later
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(root))
        .route("/users", post(create_user))
        .layer(cors);

    // let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    let listener = TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}
