//! HTTP server for Y game bots.
//!
//! This module provides an Axum-based REST API for querying Y game bots.
//! The server exposes endpoints for checking bot status and requesting moves.
//!
//! # Endpoints
//! - `GET /status` - Health check endpoint
//! - `POST /{api_version}/ybot/choose/{bot_id}` - Request a move from a bot
//!
//! # Example
//! ```no_run
//! use gamey::run_bot_server;
//!
//! #[tokio::main]
//! async fn main() {
//!     if let Err(e) = run_bot_server(3000).await {
//!         eprintln!("Server error: {}", e);
//!     }
//! }
//! ```

pub mod choose;
pub mod error;
pub mod state;
pub mod version;
pub mod play;
use axum::response::IntoResponse;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
pub use choose::MoveResponse;
pub use error::ErrorResponse;
pub use version::*;

use crate::{EasyBot, GameYError, HeuristicBot, RandomBot, RobBot, YBotRegistry, state::AppState};

/// Creates the Axum router with the given state.
///
/// This is useful for testing the API without binding to a network port.
pub fn create_router(state: AppState) -> axum::Router {
    axum::Router::new()
        .route("/status", axum::routing::get(status))
        .route(
            "/{api_version}/ybot/choose/{bot_id}",
            axum::routing::post(choose::choose),
        )
        .route("/{api_version}/play", axum::routing::get(play::play))
        .layer(CorsLayer::permissive())
        .with_state(state)
}

/// Creates the default application state with all the standard bot registry.
///
/// Registered bots:
/// - `random_bot`    – picks a random empty cell
/// - `easy_bot`      – shallow minimax (depth 1)
/// - `heuristic_bot` – full minimax + virtual connection evaluation
/// - `rob_bot`       – rob-mode bot: compares best steal vs best placement
///                     each turn and picks whichever lowers its own
///                     virtual connection cost the most
pub fn create_default_state() -> AppState {
    let bots = YBotRegistry::new()
        .with_bot(Arc::new(RandomBot))
        .with_bot(Arc::new(EasyBot))
        .with_bot(Arc::new(HeuristicBot))
        .with_bot(Arc::new(RobBot::random()))
        .with_bot(Arc::new(RobBot::easy()))
        .with_bot(Arc::new(RobBot::hard()));
    AppState::new(bots)
}

/// Starts the bot server on the specified port.
///
/// This function blocks until the server is shut down.
///
/// # Arguments
/// * `port` - The TCP port to listen on
///
/// # Errors
/// Returns `GameYError::ServerError` if:
/// - The TCP port cannot be bound (e.g., port already in use, permission denied)
/// - The server encounters an error while running
pub async fn run_bot_server(port: u16) -> Result<(), GameYError> {
    let state = create_default_state();
    let app = create_router(state);

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Failed to bind to {}: {}", addr, e),
        })?;

    println!("Server mode: Listening on http://{}", addr);
    axum::serve(listener, app)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Server error: {}", e),
        })?;

    Ok(())
}

/// Health check endpoint handler.
///
/// Returns "OK" to indicate the server is running.
pub async fn status() -> impl IntoResponse {
    "OK"
}