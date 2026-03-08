
use crate::core::{GameY, GameStatus};
use crate::{Coordinates, GameAction, GameYError, Movement, PlayerId, RenderOptions, YEN};
use std::path::Path;

/// Game gateway client that can operate in local or remote mode.
///
/// - **Local mode**: Uses a local GameY instance
/// - **Remote mode**: Communicates with a remote HTTP server
pub enum GameGatewayClientMode {
    /// Local game instance
    Local(LocalClient),
    /// Remote HTTP connection
    Remote(RemoteClient),
}

/// Local game client - wraps GameY
pub struct LocalClient {
    game: GameY,
}

/// Remote game client - communicates over HTTP
pub struct RemoteClient {
    base_url: String,
    client: reqwest::Client,
}

pub struct GameGatewayClient {
    mode: GameGatewayClientMode,
}

impl LocalClient {
    pub fn new(board_size: u32) -> Self {
        Self {
            game: GameY::new(board_size),
        }
    }

    pub fn status(&self) -> &GameStatus {
        self.game.status()
    }

    pub fn check_game_over(&self) -> bool {
        self.game.check_game_over()
    }

    pub fn available_cells(&self) -> &Vec<u32> {
        self.game.available_cells()
    }

    pub fn total_cells(&self) -> u32 {
        self.game.total_cells()
    }

    pub fn check_player_turn(&self, movement: &Movement) -> Result<(), GameYError> {
        self.game.check_player_turn(movement)
    }

    pub fn next_player(&self) -> Option<PlayerId> {
        self.game.next_player()
    }

    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self, GameYError> {
        let game = GameY::load_from_file(path)?;
        Ok(Self { game })
    }

    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<(), GameYError> {
        self.game.save_to_file(path)
    }

    pub fn add_move(&mut self, movement: Movement) -> Result<(), GameYError> {
        self.game.add_move(movement)
    }

    pub fn board_size(&self) -> u32 {
        self.game.board_size()
    }

    pub fn render(&self, options: &RenderOptions) -> String {
        self.game.render(options)
    }
}

impl RemoteClient {
    /// Creates a new remote client connected to a gateway server.
    ///
    /// # Arguments
    /// * `base_url` - The base URL of the gateway (e.g., "http://localhost:8000")
    pub fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    /// Checks if the remote server is reachable.
    pub async fn health_check(&self) -> Result<(), GameYError> {
        let url = format!("{}/gamey/status", self.base_url);
        self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| GameYError::ServerError {
                message: format!("Failed to connect to gateway: {}", e),
            })?;
        Ok(())
    }

    /// Creates a new game on the remote server.
    pub async fn create_game(&self, board_size: u32) -> Result<String, GameYError> {
        let url = format!("{}/gamey/games", self.base_url);
        let response = self.client
            .post(&url)
            .json(&serde_json::json!({ "board_size": board_size }))
            .send()
            .await
            .map_err(|e| GameYError::ServerError {
                message: format!("Failed to create game: {}", e),
            })?;

        if !response.status().is_success() {
            return Err(GameYError::ServerError {
                message: format!("Failed to create game: {}", response.status()),
            });
        }

        let body: serde_json::Value = response.json().await
            .map_err(|e| GameYError::ServerError {
                message: format!("Failed to parse response: {}", e),
            })?;

        body.get("game_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| GameYError::ServerError {
                message: "No game_id in response".to_string(),
            })
    }

    /// Gets the current game status from the remote server.
    pub async fn get_status(&self, game_id: &str) -> Result<GameStatus, GameYError> {
        let url = format!("{}/gamey/games/{}/status", self.base_url, game_id);
        let response = self.client
            .get(&url)
            .send()
            .await
            .map_err(|e| GameYError::ServerError {
                message: format!("Failed to get status: {}", e),
            })?;

        if !response.status().is_success() {
            return Err(GameYError::ServerError {
                message: format!("Failed to get status: {}", response.status()),
            });
        }

        response.json().await
            .map_err(|e| GameYError::ServerError {
                message: format!("Failed to parse status: {}", e),
            })
    }

    /// Sends a move to the remote server.
    pub async fn add_move_remote(&self, game_id: &str, movement: &Movement) -> Result<(), GameYError> {
        let url = format!("{}/gamey/games/{}/moves", self.base_url, game_id);
        let response = self.client
            .post(&url)
            .json(movement)
            .send()
            .await
            .map_err(|e| GameYError::ServerError {
                message: format!("Failed to add move: {}", e),
            })?;

        if !response.status().is_success() {
            return Err(GameYError::ServerError {
                message: format!("Failed to add move: {}", response.status()),
            });
        }

        Ok(())
    }
}

impl GameGatewayClient {
    /// Creates a new local game client.
    pub fn new(board_size: u32) -> Self {
        Self {
            mode: GameGatewayClientMode::Local(LocalClient::new(board_size)),
        }
    }

    /// Creates a new remote game client connected to a gateway server.
    ///
    /// # Arguments
    /// * `gateway_url` - The base URL of the gateway (e.g., "http://localhost:8000")
    pub fn new_remote(gateway_url: String) -> Self {
        Self {
            mode: GameGatewayClientMode::Remote(RemoteClient::new(gateway_url)),
        }
    }

    /// Returns a reference to the current game status (local mode only).
    ///
    /// This only works in local mode. For remote mode, use the local client methods.
    pub fn status(&self) -> Result<&GameStatus, GameYError> {
        match &self.mode {
            GameGatewayClientMode::Local(client) => Ok(client.status()),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "status() only available in local mode. Use get_status() for remote.".to_string(),
            }),
        }
    }

    /// Checks whether the game has ended (local mode only).
    pub fn check_game_over(&self) -> Result<bool, GameYError> {
        match &self.mode {
            GameGatewayClientMode::Local(client) => Ok(client.check_game_over()),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "check_game_over() only available in local mode".to_string(),
            }),
        }
    }

    /// Provides the list of available cells (local mode only).
    pub fn available_cells(&self) -> Result<&Vec<u32>, GameYError> {
        match &self.mode {
            GameGatewayClientMode::Local(client) => Ok(client.available_cells()),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "available_cells() only available in local mode".to_string(),
            }),
        }
    }

    /// Returns the total number of cells on the board (local mode only).
    pub fn total_cells(&self) -> Result<u32, GameYError> {
        match &self.mode {
            GameGatewayClientMode::Local(client) => Ok(client.total_cells()),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "total_cells() only available in local mode".to_string(),
            }),
        }
    }

    /// Validates that the supplied movement belongs to the current player's turn (local mode only).
    pub fn check_player_turn(&self, movement: &Movement) -> Result<(), GameYError> {
        match &self.mode {
            GameGatewayClientMode::Local(client) => client.check_player_turn(movement),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "check_player_turn() only available in local mode".to_string(),
            }),
        }
    }

    /// Returns the player who should act next, if any (local mode only).
    pub fn next_player(&self) -> Result<Option<PlayerId>, GameYError> {
        match &self.mode {
            GameGatewayClientMode::Local(client) => Ok(client.next_player()),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "next_player() only available in local mode".to_string(),
            }),
        }
    }

    /// Constructs a client by loading a game from a file (local mode only).
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self, GameYError> {
        let client = LocalClient::load_from_file(path)?;
        Ok(Self {
            mode: GameGatewayClientMode::Local(client),
        })
    }

    /// Saves the current game to a file (local mode only).
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<(), GameYError> {
        match &self.mode {
            GameGatewayClientMode::Local(client) => client.save_to_file(path),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "save_to_file() only available in local mode".to_string(),
            }),
        }
    }

    /// Adds a move to the underlying game state (local mode only).
    pub fn add_move(&mut self, movement: Movement) -> Result<(), GameYError> {
        match &mut self.mode {
            GameGatewayClientMode::Local(client) => client.add_move(movement),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "add_move() only available in local mode. Use add_move_remote() for remote.".to_string(),
            }),
        }
    }

    /// Returns the configured board size (local mode only).
    pub fn board_size(&self) -> Result<u32, GameYError> {
        match &self.mode {
            GameGatewayClientMode::Local(client) => Ok(client.board_size()),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "board_size() only available in local mode".to_string(),
            }),
        }
    }

    /// Renders the board according to the provided options (local mode only).
    pub fn render(&self, options: &RenderOptions) -> Result<String, GameYError> {
        match &self.mode {
            GameGatewayClientMode::Local(client) => Ok(client.render(options)),
            GameGatewayClientMode::Remote(_) => Err(GameYError::ClientError {
                message: "render() only available in local mode".to_string(),
            }),
        }
    }
}

// -------------------------------- tests --------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{Coordinates, Movement, PlayerId, RenderOptions};
    use crate::{GameAction, GameYError};
    use std::fs;
    use std::path::PathBuf;

    // ============ LOCAL CLIENT / GATEWAY CLIENT LOCAL MODE TESTS ============

    #[test]
    fn new_client_defaults() {
        let client = GameGatewayClient::new(4);
        assert_eq!(client.board_size().unwrap(), 4);
        assert!(!client.check_game_over().unwrap());
        assert_eq!(client.available_cells().unwrap().len(), 10); // 4*5/2
    }

    #[test]
    fn add_moves_and_status() {
        let mut client = GameGatewayClient::new(3);
        let mv = Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 2, 0),
        };
        client.add_move(mv.clone()).unwrap();
        assert!(!client.check_game_over().unwrap());
        // playing a losing sequence not necessary; just check history progressed via available_cells change
        assert_eq!(
            client.available_cells().unwrap().len(),
            client.total_cells().unwrap() as usize - 1
        );
        assert!(client
            .check_player_turn(&Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(2, 0, 0)
            })
            .is_ok());
    }

    #[test]
    fn save_and_load_roundtrip() {
        let mut client = GameGatewayClient::new(2);
        let file = PathBuf::from("test_game.json");
        // add a move to change state
        client
            .add_move(Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 1, 1),
            })
            .unwrap();
        client.save_to_file(&file).unwrap();

        let loaded = GameGatewayClient::load_from_file(&file).unwrap();
        assert_eq!(
            loaded.board_size().unwrap(),
            client.board_size().unwrap()
        );
        assert_eq!(
            loaded.available_cells().unwrap(),
            client.available_cells().unwrap()
        );

        // cleanup
        let _ = fs::remove_file(&file);
    }

    #[test]
    fn render_output_contains_board_size() {
        let client = GameGatewayClient::new(3);
        let s = client.render(&RenderOptions::default()).unwrap();
        assert!(s.contains("Size 3"));
    }

    #[test]
    fn next_player_and_turn_check() {
        let mut client = GameGatewayClient::new(2);
        assert_eq!(client.next_player().unwrap(), Some(PlayerId::new(0)));
        let mv = Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(1, 0, 0),
        };
        assert!(client.check_player_turn(&mv).is_ok());
        client.add_move(mv).unwrap();
        assert_eq!(client.next_player().unwrap(), Some(PlayerId::new(1)));
    }

    #[test]
    fn invalid_player_turn_returns_error() {
        let client = GameGatewayClient::new(2);
        let mv = Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(0, 0, 0),
        };
        let res = client.check_player_turn(&mv);
        assert!(res.is_err());
        if let Err(GameYError::InvalidPlayerTurn { expected, found }) = res {
            assert_eq!(expected, PlayerId::new(0));
            assert_eq!(found, PlayerId::new(1));
        } else {
            panic!("expected InvalidPlayerTurn error");
        }
    }

    // ============ LOCAL CLIENT DIRECT TESTS ============

    #[test]
    fn local_client_new() {
        let client = LocalClient::new(3);
        assert_eq!(client.board_size(), 3);
    }

    #[test]
    fn local_client_status() {
        let client = LocalClient::new(2);
        let status = client.status();
        assert!(status.move_history.is_empty());
    }

    #[test]
    fn local_client_check_game_over() {
        let client = LocalClient::new(2);
        assert!(!client.check_game_over());
    }

    #[test]
    fn local_client_available_cells() {
        let client = LocalClient::new(2);
        let cells = client.available_cells();
        assert!(!cells.is_empty());
    }

    #[test]
    fn local_client_total_cells() {
        let client = LocalClient::new(3);
        assert!(client.total_cells() > 0);
    }

    #[test]
    fn local_client_next_player() {
        let client = LocalClient::new(2);
        let next = client.next_player();
        assert_eq!(next, Some(PlayerId::new(0)));
    }

    // ============ REMOTE CLIENT TESTS ============

    #[test]
    fn remote_client_new() {
        let url = "http://localhost:8000".to_string();
        let client = RemoteClient::new(url.clone());
        assert_eq!(client.base_url, url);
    }

    #[tokio::test]
    async fn remote_client_health_check_success() {
        let mut server = mockito::Server::new_async().await;

        let _mock = server
            .mock("GET", mockito::Matcher::Regex(r"^/gamey/status$".to_string()))
            .with_status(200)
            .with_body("OK")
            .create_async()
            .await;

        let client = RemoteClient::new(server.url());
        assert!(client.health_check().await.is_ok());
    }

    #[tokio::test]
    async fn remote_client_health_check_failure() {
        let client = RemoteClient::new("http://localhost:9999".to_string());
        let result = client.health_check().await;
        assert!(result.is_err());
        if let Err(GameYError::ServerError { message }) = result {
            assert!(message.contains("Failed to connect"));
        } else {
            panic!("Expected ServerError");
        }
    }

    #[tokio::test]
    async fn remote_client_create_game_success() {
        let mut server = mockito::Server::new_async().await;

        let response = serde_json::json!({ "game_id": "game-123" });
        let _mock = server
            .mock("POST", mockito::Matcher::Regex(r"^/gamey/games$".to_string()))
            .with_status(201)
            .with_header("content-type", "application/json")
            .with_body(response.to_string())
            .create_async()
            .await;

        let client = RemoteClient::new(server.url());
        let game_id = client.create_game(4).await.unwrap();
        assert_eq!(game_id, "game-123");
    }

    #[tokio::test]
    async fn remote_client_create_game_network_error() {
        let client = RemoteClient::new("http://localhost:9999".to_string());
        let result = client.create_game(4).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn remote_client_create_game_invalid_response() {
        let mut server = mockito::Server::new_async().await;

        let response = serde_json::json!({ "invalid_field": "value" });
        let _mock = server
            .mock("POST", mockito::Matcher::Regex(r"^/gamey/games$".to_string()))
            .with_status(201)
            .with_header("content-type", "application/json")
            .with_body(response.to_string())
            .create_async()
            .await;

        let client = RemoteClient::new(server.url());
        let result = client.create_game(4).await;
        assert!(result.is_err());
        if let Err(GameYError::ServerError { message }) = result {
            assert!(message.contains("No game_id"));
        }
    }

    #[tokio::test]
    async fn remote_client_get_status_success() {
        let mut server = mockito::Server::new_async().await;

        let response = serde_json::json!({
            "move_history": [],
            "board_size": 4,
            "current_player": 0
        });
        let _mock = server
            .mock(
                "GET",
                mockito::Matcher::Regex(r"^/gamey/games/game-123/status$".to_string()),
            )
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(response.to_string())
            .create_async()
            .await;

        let client = RemoteClient::new(server.url());
        let status = client.get_status("game-123").await;
        assert!(status.is_ok());
    }

    #[tokio::test]
    async fn remote_client_add_move_remote_success() {
        let mut server = mockito::Server::new_async().await;

        let _mock = server
            .mock(
                "POST",
                mockito::Matcher::Regex(r"^/gamey/games/game-123/moves$".to_string()),
            )
            .with_status(200)
            .create_async()
            .await;

        let client = RemoteClient::new(server.url());
        let movement = Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 1, 1),
        };
        let result = client.add_move_remote("game-123", &movement).await;
        assert!(result.is_ok());
    }

    // ============ GATEWAY CLIENT REMOTE MODE TESTS ============

    #[test]
    fn gateway_client_new_remote() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        // Verify it's in remote mode by checking that local-only operations fail
        assert!(client.board_size().is_err());
    }

    #[test]
    fn gateway_client_remote_status_error() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let result = client.status();
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("status() only available in local mode"));
        } else {
            panic!("Expected ClientError");
        }
    }

    #[test]
    fn gateway_client_remote_check_game_over_error() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let result = client.check_game_over();
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("check_game_over() only available in local mode"));
        }
    }

    #[test]
    fn gateway_client_remote_available_cells_error() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let result = client.available_cells();
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("available_cells() only available in local mode"));
        }
    }

    #[test]
    fn gateway_client_remote_total_cells_error() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let result = client.total_cells();
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("total_cells() only available in local mode"));
        }
    }

    #[test]
    fn gateway_client_remote_check_player_turn_error() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let mv = Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 0, 0),
        };
        let result = client.check_player_turn(&mv);
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("check_player_turn() only available in local mode"));
        }
    }

    #[test]
    fn gateway_client_remote_next_player_error() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let result = client.next_player();
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("next_player() only available in local mode"));
        }
    }

    #[test]
    fn gateway_client_remote_save_to_file_error() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let result = client.save_to_file("test.json");
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("save_to_file() only available in local mode"));
        }
    }

    #[test]
    fn gateway_client_remote_add_move_error() {
        let mut client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let mv = Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 0, 0),
        };
        let result = client.add_move(mv);
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("add_move() only available in local mode"));
            assert!(message.contains("add_move_remote()"));
        }
    }

    #[test]
    fn gateway_client_remote_board_size_error() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let result = client.board_size();
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("board_size() only available in local mode"));
        }
    }

    #[test]
    fn gateway_client_remote_render_error() {
        let client = GameGatewayClient::new_remote("http://localhost:8000".to_string());
        let result = client.render(&RenderOptions::default());
        assert!(result.is_err());
        if let Err(GameYError::ClientError { message }) = result {
            assert!(message.contains("render() only available in local mode"));
        }
    }

    #[test]
    fn gateway_client_remote_load_from_file_error() {
        let result = GameGatewayClient::load_from_file("nonexistent.json");
        // This should fail because the file doesn't exist, not because of mode issues
        assert!(result.is_err());
    }
}
