use crate::{Coordinates, GameY, YEN, error::ErrorResponse, state::AppState};
use axum::{Json, extract::{Query, State}};
use serde::{Deserialize, Serialize};

/// We define the query parameters expected by the competition.
/// The 'position' field arrives as a URL-encoded JSON string.
#[derive(Deserialize)]
pub struct PlayQuery {
    pub position: String,
    pub bot_id: Option<String>,
}

/// We represent the bot's decision using an untagged enum.
/// This allows the JSON output to switch between "coords" and "action" 
/// formats automatically to meet the competition requirements.
#[derive(Serialize)]
#[serde(untagged)]
pub enum BotResponse {
    Movement { coords: Coordinates },
    Action { action: String },
}

/// GET endpoint that takes a board state 
/// and returns the bot's next calculated move.
#[axum::debug_handler]
pub async fn play(
    State(state): State<AppState>,
    Query(query): Query<PlayQuery>,
) -> Result<Json<BotResponse>, Json<ErrorResponse>> {
    
    // We attempt to parse the 'position' query string into our YEN format.
    let yen: YEN = serde_json::from_str(&query.position).map_err(|e| {
        Json(ErrorResponse::error(
            &format!("Invalid YEN JSON: {}", e),
            None,
            query.bot_id.clone(),
        ))
    })?;

    // We convert the YEN representation into our internal GameY logic.
    let game = GameY::try_from(yen).map_err(|e| {
        Json(ErrorResponse::error(
            &format!("Invalid game state: {}", e),
            None,
            query.bot_id.clone(),
        ))
    })?;

    // Check if the game has already concluded.
    if game.check_game_over() {
        return Err(Json(ErrorResponse::error(
            "Game is already over",
            None,
            query.bot_id.clone(),
        )));
    }

    let bot_id = query.bot_id.unwrap_or_else(|| "heuristic_bot".to_string());
    let bot = state.bots().find(&bot_id).ok_or_else(|| {
        Json(ErrorResponse::error(
            &format!("Bot not found: {}", bot_id),
            None,
            Some(bot_id.clone()),
        ))
    })?;

    // We ask our bot to choose the best move based on the provided state.
    // Since we are using barycentric coordinates, our 'Coordinates' struct 
    // already contains the necessary x, y, and z values.
    match bot.choose_move(&game) {
        Some(coords) => {
            // We return the movement coordinates as the primary response.
            Ok(Json(BotResponse::Movement { coords }))
        }
        None => {
            // If our bot determines it must swap or resign, we handle that here.
            // For now, if no move is found, we treat it as an error or a resignation.
            Ok(Json(BotResponse::Action { action: "resign".to_string() }))
        }
    }
}