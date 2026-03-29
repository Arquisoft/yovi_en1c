use crate::{Coordinates, GameY, GameStatus, Movement, YEN, 
            check_api_version, error::ErrorResponse, state::AppState};
use axum::{Json, extract::{Path, State}};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct PlayParams {
    pub api_version: String,
}

#[derive(Deserialize)]
pub struct PlayRequest {
    pub yen: YEN,
    pub position: u32,
    pub bot_id: Option<String>,
}

#[derive(Serialize)]
pub struct PlayResponse {
    pub api_version: String,
    pub yen: YEN,
    pub status: String,   // "ongoing" | "finished"
    pub winner: Option<u32>,
}

#[axum::debug_handler]
pub async fn play(
    State(state): State<AppState>,
    Path(params): Path<PlayParams>,
    Json(body): Json<PlayRequest>,
) -> Result<Json<PlayResponse>, Json<ErrorResponse>> {
    check_api_version(&params.api_version)?;

    let mut game = GameY::try_from(body.yen).map_err(|e| {
        Json(ErrorResponse::error(
            &format!("Invalid YEN: {}", e),
            Some(params.api_version.clone()),
            None,
        ))
    })?;

    // Apply the human move
    let next = game.next_player().ok_or_else(|| {
        Json(ErrorResponse::error(
            "Game is already over",
            Some(params.api_version.clone()),
            None,
        ))
    })?;

    let coords = Coordinates::from_index(body.position, game.board_size());
    game.add_move(Movement::Placement { player: next, coords })
        .map_err(|e| Json(ErrorResponse::error(
            &format!("Invalid move: {}", e),
            Some(params.api_version.clone()),
            None,
        )))?;

    // If bot_id provided and game still ongoing, bot plays
    if let Some(bot_id) = &body.bot_id {
        if !game.check_game_over() {
            let bot = state.bots().find(bot_id).ok_or_else(|| {
                Json(ErrorResponse::error(
                    &format!("Bot not found: {}", bot_id),
                    Some(params.api_version.clone()),
                    Some(bot_id.clone()),
                ))
            })?;

            if let Some(bot_coords) = bot.choose_move(&game) {
                let bot_player = game.next_player().unwrap();
                game.add_move(Movement::Placement {
                    player: bot_player,
                    coords: bot_coords,
                }).ok();
            }
        }
    }

    let (status, winner) = match game.status() {
        GameStatus::Finished { winner } => ("finished".to_string(), Some(winner.id())),
        GameStatus::Ongoing { .. }      => ("ongoing".to_string(),  None),
    };

    Ok(Json(PlayResponse {
        api_version: params.api_version,
        yen: (&game).into(),
        status,
        winner,
    }))
}