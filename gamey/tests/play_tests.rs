use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use gamey::{YBotRegistry, YEN, create_default_state, create_router, state::AppState, RandomBot, ErrorResponse};
use http_body_util::BodyExt;
use serde_json::Value;
use std::sync::Arc;
use tower::ServiceExt;

// ============================================================================
// Helpers
// ============================================================================

fn test_app() -> axum::Router {
    create_router(create_default_state())
}

fn empty_board_size3() -> YEN {
    YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string())
}

async fn post_play(app: axum::Router, body: serde_json::Value) -> (StatusCode, Value) {
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/play")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_string(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&bytes).unwrap();
    (status, json)
}

// ============================================================================
// Success cases — human move only (no bot)
// ============================================================================

#[tokio::test]
async fn test_play_human_move_returns_200() {
    let app = test_app();
    let yen = empty_board_size3();

    let (status, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["api_version"], "v1");
    assert_eq!(body["status"], "ongoing");
    assert!(body["winner"].is_null());
}

#[tokio::test]
async fn test_play_updates_yen_layout() {
    let app = test_app();
    let yen = empty_board_size3();

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    // Layout should no longer be all dots — B played at position 0
    let layout = body["yen"]["layout"].as_str().unwrap();
    assert!(layout.contains('B'));
}

#[tokio::test]
async fn test_play_advances_turn() {
    let app = test_app();
    let yen = empty_board_size3(); // turn = 0

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    // After player 0 (B) plays, turn should be 1 (R)
    assert_eq!(body["yen"]["turn"], 1);
}

#[tokio::test]
async fn test_play_position_last_cell() {
    let app = test_app();
    let yen = empty_board_size3();

    // Position 5 is the last cell in a size-3 board (0..5)
    let (status, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 5 }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["api_version"], "v1");
}

// ============================================================================
// Success cases — human move + bot response
// ============================================================================

#[tokio::test]
async fn test_play_with_bot_returns_two_moves() {
    let app = test_app();
    let yen = empty_board_size3();

    let (status, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0, "bot_id": "random_bot" }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);

    // Both B and R should have played — layout has both chars
    let layout = body["yen"]["layout"].as_str().unwrap();
    assert!(layout.contains('B'));
    assert!(layout.contains('R'));
}

#[tokio::test]
async fn test_play_with_bot_turn_is_back_to_human() {
    let app = test_app();
    let yen = empty_board_size3(); // turn = 0 (B)

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0, "bot_id": "random_bot" }),
    )
    .await;

    // After human (0) and bot (1) both play, turn is back to 0
    assert_eq!(body["yen"]["turn"], 0);
}

#[tokio::test]
async fn test_play_without_bot_id_field() {
    let app = test_app();
    let yen = empty_board_size3();

    // bot_id is optional — omitting it should work fine
    let (status, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "ongoing");
}

#[tokio::test]
async fn test_play_with_null_bot_id() {
    let app = test_app();
    let yen = empty_board_size3();

    let (status, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0, "bot_id": null }),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "ongoing");
}

#[tokio::test]
async fn test_play_ongoing_when_no_winner_yet() {
    let app = test_app();
    let yen = empty_board_size3();

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 2 }),
    )
    .await;

    assert_eq!(body["status"], "ongoing");
    assert!(body["winner"].is_null());
}

#[tokio::test]
async fn test_play_winner_is_null_when_ongoing() {
    let app = test_app();
    let yen = empty_board_size3();

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    assert!(body["winner"].is_null());
}

// ============================================================================
// Error cases
// ============================================================================

#[tokio::test]
async fn test_play_invalid_api_version() {
    let app = test_app();
    let yen = empty_board_size3();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v2/play")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "yen": yen, "position": 0 }))
                        .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let error: ErrorResponse = serde_json::from_slice(&bytes).unwrap();

    assert!(error.message.contains("Unsupported API version"));
    assert_eq!(error.api_version, Some("v2".to_string()));
}

#[tokio::test]
async fn test_play_occupied_cell_returns_error() {
    let app = test_app();

    // B already occupies position 0 (top cell) — trying to play there again
    let yen = YEN::new(3, 1, vec!['B', 'R'], "B/../...".to_string());

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    assert!(body["message"]
        .as_str()
        .unwrap()
        .contains("Invalid move"));
}

#[tokio::test]
async fn test_play_game_already_over_returns_error() {
    let app = test_app();

    // Full winning board for B: B/BB/... — B wins
    let yen = YEN::new(2, 0, vec!['B', 'R'], "B/BB".to_string());

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    assert!(body["message"]
        .as_str()
        .unwrap()
        .contains("Game is already over"));
}

#[tokio::test]
async fn test_play_unknown_bot_returns_error() {
    let app = test_app();
    let yen = empty_board_size3();

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0, "bot_id": "nonexistent_bot" }),
    )
    .await;

    assert!(body["message"]
        .as_str()
        .unwrap()
        .contains("Bot not found"));
    assert!(body["message"]
        .as_str()
        .unwrap()
        .contains("nonexistent_bot"));
}

#[tokio::test]
async fn test_play_invalid_yen_layout_returns_error() {
    let app = test_app();

    // Wrong number of rows for size 3 (4 rows instead of 3)
    let body = serde_json::json!({
        "yen": {
            "size": 3,
            "turn": 0,
            "players": ["B", "R"],
            "layout": "./../.../..."
        },
        "position": 0
    });

    let (_, response_body) = post_play(app, body).await;

    assert!(response_body["message"]
        .as_str()
        .unwrap()
        .contains("Invalid YEN"));
}

#[tokio::test]
async fn test_play_invalid_json_returns_client_error() {
    let app = test_app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/play")
                .header("content-type", "application/json")
                .body(Body::from("{ not valid json }"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(response.status().is_client_error());
}

#[tokio::test]
async fn test_play_missing_content_type_returns_error() {
    let app = test_app();
    let yen = empty_board_size3();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/play")
                // No content-type header
                .body(Body::from(
                    serde_json::to_string(&serde_json::json!({ "yen": yen, "position": 0 }))
                        .unwrap(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(response.status().is_client_error());
}

// ============================================================================
// HTTP method tests
// ============================================================================

#[tokio::test]
async fn test_play_get_method_returns_405() {
    let app = test_app();

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/play")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

// ============================================================================
// Response structure tests
// ============================================================================

#[tokio::test]
async fn test_play_response_contains_all_fields() {
    let app = test_app();
    let yen = empty_board_size3();

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    assert!(body.get("api_version").is_some());
    assert!(body.get("yen").is_some());
    assert!(body.get("status").is_some());
    assert!(body.get("winner").is_some());
}

#[tokio::test]
async fn test_play_yen_response_contains_all_fields() {
    let app = test_app();
    let yen = empty_board_size3();

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    let yen_response = &body["yen"];
    assert!(yen_response.get("size").is_some());
    assert!(yen_response.get("turn").is_some());
    assert!(yen_response.get("players").is_some());
    assert!(yen_response.get("layout").is_some());
}

#[tokio::test]
async fn test_play_preserves_board_size() {
    let app = test_app();
    let yen = empty_board_size3(); // size = 3

    let (_, body) = post_play(
        app,
        serde_json::json!({ "yen": yen, "position": 0 }),
    )
    .await;

    assert_eq!(body["yen"]["size"], 3);
}