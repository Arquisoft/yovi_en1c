use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use gamey::{YEN, create_default_state, create_router};
use http_body_util::BodyExt;
use serde_json::Value;
use tower::ServiceExt;

// ============================================================================
// CONFIGURATION
// ============================================================================

// Updated to match your working Postman URL
const PATH_PREFIX: &str = "/v1";

// ============================================================================
// Helpers
// ============================================================================

fn test_app() -> axum::Router {
    create_router(create_default_state())
}

fn empty_board_size3() -> YEN {
    YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string())
}

/// Robust helper for GET requests to the play endpoint
async fn get_play(app: axum::Router, yen: &YEN, bot_id: Option<&str>) -> (StatusCode, Value) {
    let yen_json = serde_json::to_string(yen).unwrap();
    
    let mut uri = format!("{}/play?position={}", PATH_PREFIX, urlencoding::encode(&yen_json));
    
    if let Some(id) = bot_id {
        uri.push_str(&format!("&bot_id={}", urlencoding::encode(id)));
    }
    
    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(&uri)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    
    // Safety: If 404 or empty, return Null instead of panicking on JSON parse
    if bytes.is_empty() {
        return (status, Value::Null);
    }

    let json: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, json)
}

// ============================================================================
// Tests
// ============================================================================

#[tokio::test]
async fn test_get_play_success() {
    let app = test_app();
    let yen = empty_board_size3();
    let (status, body) = get_play(app, &yen, Some("heuristic_bot")).await;

    assert_eq!(status, StatusCode::OK, "Check if PATH_PREFIX matches your router configuration");
    assert!(body.get("coords").is_some());
}

#[tokio::test]
async fn test_get_play_no_bot_id_defaults_to_heuristic() {
    let app = test_app();
    let yen = empty_board_size3();

    // Passing None simulates the absence of the &bot_id= parameter in the URL
    let (status, body) = get_play(app, &yen, None).await;

    // It should succeed (200) because the code defaults to "heuristic_bot"
    assert_eq!(status, StatusCode::OK, "Should default to heuristic_bot and return 200");
    assert!(body.get("coords").is_some(), "Response should contain coordinates from the default bot");
}

#[tokio::test]
async fn test_get_play_game_over_returns_error_message() {
    let app = test_app();
    
    // Use the layout that works in Postman: "B/RR/BBB"
    // Turn 5 (or any number) is fine as long as the layout is complete
    let yen = YEN::new(3, 5, vec!['B', 'R'], "B/RR/BBB".to_string());

    let (status, body) = get_play(app, &yen, Some("heuristic_bot")).await;

    // Based on your play.rs, this returns 200 OK with an error JSON
    assert_eq!(status, StatusCode::OK);
    
    // Ensure we are checking the "message" field
    assert!(
        body["message"].as_str().expect("Body should have a message field").contains("Game is already over"),
        "Body was: {:?}", body
    );
}

#[tokio::test]
async fn test_method_not_allowed() {
    let app = test_app();
    let response = app.oneshot(
        Request::builder()
            .method("POST") // play is GET only
            .uri(format!("{}/play", PATH_PREFIX))
            .body(Body::empty()).unwrap(),
    ).await.unwrap();

    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn test_invalid_yen_json() {
    let app = test_app();
    
    // Malformed JSON string (missing a closing brace)
    let malformed_json = "{\"size\":3, \"turn\":0"; 
    let uri = format!("/v1/play?position={}", urlencoding::encode(malformed_json));

    let response = app.oneshot(
        Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap()
    ).await.unwrap();

    // play.rs returns 200 OK even for errors
    assert_eq!(response.status(), StatusCode::OK);

    let body: Value = serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    
    // Verify the error message matches the 'Invalid YEN JSON' pattern
    assert!(body["message"].as_str().unwrap().contains("Invalid YEN JSON"));
}

#[tokio::test]
async fn test_invalid_game_state() {
    let app = test_app();
    
    // Valid JSON, but the layout is wrong for a size 3 board (too many segments)
    let yen = YEN::new(3, 0, vec!['B', 'R'], "B/B/B/B/B".to_string());
    let yen_json = serde_json::to_string(&yen).unwrap();

    let uri = format!("/v1/play?position={}", urlencoding::encode(&yen_json));

    let response = app.oneshot(
        Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap()
    ).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body: Value = serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    
    // Verify the error message matches the 'Invalid game state' pattern
    assert!(body["message"].as_str().unwrap().contains("Invalid game state"));
}

#[tokio::test]
async fn test_bot_not_found() {
    let app = test_app();
    let yen = YEN::new(3, 0, vec!['B', 'R'], "./../...".to_string());
    let yen_json = serde_json::to_string(&yen).unwrap();

    // Use a bot_id that is not in the registry
    let uri = format!("/v1/play?position={}&bot_id=unknown_bot", urlencoding::encode(&yen_json));

    let response = app.oneshot(
        Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap()
    ).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body: Value = serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    
    // Matches the 'Bot not found' error logic
    assert!(body["message"].as_str().unwrap().contains("Bot not found: unknown_bot"));
    assert_eq!(body["bot_id"], "unknown_bot");
}

//Extra
#[tokio::test]
async fn test_play_normal_move_returns_coords() {
    let app = test_app();
    let yen = YEN::new(3, 2, vec!['B', 'R'], "B/R./...".to_string());
    let yen_json = serde_json::to_string(&yen).unwrap();

    let uri = format!("/v1/play?position={}&bot_id=heuristic_bot", urlencoding::encode(&yen_json));

    let response = app.oneshot(
        Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap()
    ).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body: Value = serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    
    // 1. Verify 'coords' exists
    assert!(body.get("coords").is_some(), "Expected 'coords' property, got: {:?}", body);
    
    // 2. Verify the specific coordinate fields returned in Postman (x, y, z)
    let coords = body.get("coords").unwrap();
    assert!(coords.get("x").is_some(), "Missing 'x' in coords");
    assert!(coords.get("y").is_some(), "Missing 'y' in coords");
    assert!(coords.get("z").is_some(), "Missing 'z' in coords");
}

#[tokio::test]
async fn test_play_blue_winning_move() {
    let app = test_app();
    // Blue (B) is one move away from completing a vertical connection in a size 3 board
    // Layout: B at top, B at middle-right. Bottom row is empty.
    let yen = YEN::new(3, 4, vec!['B', 'R'], "B/.B/...".to_string());
    let yen_json = serde_json::to_string(&yen).unwrap();

    let uri = format!("/v1/play?position={}&bot_id=heuristic_bot", urlencoding::encode(&yen_json));

    let response = app.oneshot(
        Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap()
    ).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body: Value = serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    
    // The bot should return a coordinate to attempt to complete the path
    assert!(body.get("coords").is_some(), "Winning move should still return 'coords'");
}

#[tokio::test]
async fn test_play_red_winning_move() {
    let app = test_app();
    // Red (R) is one move away from a horizontal connection
    let yen = YEN::new(3, 4, vec!['B', 'R'], "./R./R..".to_string());
    let yen_json = serde_json::to_string(&yen).unwrap();

    let uri = format!("/v1/play?position={}&bot_id=heuristic_bot", urlencoding::encode(&yen_json));

    let response = app.oneshot(
        Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap()
    ).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body: Value = serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap();
    
    // Ensure the untagged enum correctly serializes the movement
    assert!(body.get("coords").is_some());
    assert!(body.get("action").is_none(), "Should not return an action when a move is available");
}