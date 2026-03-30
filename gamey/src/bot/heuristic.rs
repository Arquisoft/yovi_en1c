//! A heuristic bot implementation for the Game of Y.
//!
//! This module provides two bots:
//! - [`HeuristicBot`]: Always picks the best move using a heuristic evaluation function.
//! - [`EasyBot`]: Plays heuristically 60% of the time, randomly the other 80%.
//!
//! ## Decision priority (HeuristicBot)
//! 1. **Immediate win** – if any move wins the game right now, take it.
//! 2. **Block opponent** – if the opponent would win on their next turn at some cell, block it.
//! 3. **Best heuristic score** – evaluate every remaining cell and pick the highest-scoring one.
//!
//! ## Heuristic scoring
//! The score for placing at a given cell is:
//! ```text
//! score = sides_connected × 100 + friendly_neighbours × 10 − centrality_distance
//! ```
//! - **sides_connected**: how many of the three board sides the bot's connected group would touch
//!   after this placement (found via BFS on already-placed friendly pieces).
//! - **friendly_neighbours**: how many of the 6 adjacent cells already belong to the bot.
//! - **centrality_distance**: Manhattan-like distance from the board centroid (n/3, n/3, n/3).

use crate::{Cell, Coordinates, GameStatus, GameY, Movement, PlayerId, YBot};
use rand::prelude::IndexedRandom;
use std::collections::HashSet;

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

fn other_player(player: PlayerId) -> PlayerId {
    if player.id() == 0 {
        PlayerId::new(1)
    } else {
        PlayerId::new(0)
    }
}

/// Returns the 6 (or fewer, on edges/corners) neighbours of a cell.
/// Mirrors the private `GameY::get_neighbors`.
fn neighbours(coords: Coordinates) -> Vec<Coordinates> {
    let mut nb = Vec::with_capacity(6);
    let (x, y, z) = (coords.x(), coords.y(), coords.z());
    if x > 0 {
        nb.push(Coordinates::new(x - 1, y + 1, z));
        nb.push(Coordinates::new(x - 1, y, z + 1));
    }
    if y > 0 {
        nb.push(Coordinates::new(x + 1, y - 1, z));
        nb.push(Coordinates::new(x, y - 1, z + 1));
    }
    if z > 0 {
        nb.push(Coordinates::new(x + 1, y, z - 1));
        nb.push(Coordinates::new(x, y + 1, z - 1));
    }
    nb
}

/// BFS from `start` following friendly pieces.
/// `start` is treated as belonging to `player` even before it is placed,
/// so call this on the *original* board (before simulating the move).
/// Returns which of the three sides the resulting group would touch.
fn group_sides(board: &GameY, start: Coordinates, player: PlayerId) -> (bool, bool, bool) {
    let mut touches_a = start.touches_side_a();
    let mut touches_b = start.touches_side_b();
    let mut touches_c = start.touches_side_c();

    let mut visited: HashSet<Coordinates> = HashSet::new();
    let mut stack = vec![start];
    visited.insert(start);

    while let Some(current) = stack.pop() {
        for nb in neighbours(current) {
            if !visited.contains(&nb) && board.cell_at(&nb) == Cell::Occupied(player) {
                visited.insert(nb);
                stack.push(nb);
                touches_a |= nb.touches_side_a();
                touches_b |= nb.touches_side_b();
                touches_c |= nb.touches_side_c();
            }
        }
    }

    (touches_a, touches_b, touches_c)
}

/// Computes the heuristic score for placing `player`'s stone at `coords`.
fn score_placement(board: &GameY, coords: Coordinates, player: PlayerId) -> i32 {
    // How many sides the resulting connected group would touch
    let (a, b, c) = group_sides(board, coords, player);
    let sides: i32 = a as i32 + b as i32 + c as i32;

    // Friendly neighbours already on the board
    let friendly_neighbours: i32 = neighbours(coords)
        .iter()
        .filter(|&&nb| board.cell_at(&nb) == Cell::Occupied(player))
        .count() as i32;

    // Prefer cells closer to the board centroid (more flexible connections)
    let centroid = (board.board_size() as f32 - 1.0) / 3.0;
    let centrality_dist = ((coords.x() as f32 - centroid).abs()
        + (coords.y() as f32 - centroid).abs()
        + (coords.z() as f32 - centroid).abs()) as i32;

    sides * 15 + friendly_neighbours * 15 - centrality_dist * 10
}

// ─────────────────────────────────────────────────────────────
// Core move-selection logic (shared by both bots)
// ─────────────────────────────────────────────────────────────

fn best_move(board: &GameY) -> Option<Coordinates> {
    let available = board.available_cells().clone();
    if available.is_empty() {
        return None;
    }

    let bot_player = board.next_player()?;
    let opponent = other_player(bot_player);
    let size = board.board_size();

    // ── Priority 1: win immediately ───────────────────────────
    for &idx in &available {
        let coords = Coordinates::from_index(idx, size);
        let mut sim = board.clone();
        if sim
            .add_move(Movement::Placement { player: bot_player, coords })
            .is_ok()
        {
            if matches!(sim.status(), GameStatus::Finished { winner } if *winner == bot_player) {
                return Some(coords);
            }
        }
    }

    // ── Priority 2: block opponent's immediate win ────────────
    // We simulate the opponent placing regardless of whose turn it is.
    let mut block: Option<Coordinates> = None;
    for &idx in &available {
        let coords = Coordinates::from_index(idx, size);
        let mut sim = board.clone();
        if sim
            .add_move(Movement::Placement { player: opponent, coords })
            .is_ok()
        {
            if matches!(sim.status(), GameStatus::Finished { winner } if *winner == opponent) {
                // Multiple threats? Keep the one with the best score for us.
                block = Some(match block {
                    None => coords,
                    Some(prev) => {
                        if score_placement(board, coords, bot_player)
                            > score_placement(board, prev, bot_player)
                        {
                            coords
                        } else {
                            prev
                        }
                    }
                });
            }
        }
    }
    if let Some(b) = block {
        return Some(b);
    }

    // ── Priority 3: best heuristic score ─────────────────────
    available
        .iter()
        .map(|&idx| {
            let coords = Coordinates::from_index(idx, size);
            (coords, score_placement(board, coords, bot_player))
        })
        .max_by_key(|&(_, score)| score)
        .map(|(coords, _)| coords)
}

// ─────────────────────────────────────────────────────────────
// Public bot structs
// ─────────────────────────────────────────────────────────────

/// A bot that always plays the best available move.
///
/// Uses a three-priority system: win > block > heuristic score.
pub struct HeuristicBot;

impl YBot for HeuristicBot {
    fn name(&self) -> &str {
        "heuristic_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        // Small artificial delay so the bot feels more human
        std::thread::sleep(std::time::Duration::from_millis(600));
        best_move(board)
    }
}

/// A bot that plays heuristically 20 % of the time and randomly 80 % of the time.
///
/// Good for an "easy" difficulty level: it occasionally makes smart moves
/// (wins or blocks) but is beatable with basic strategy.
pub struct EasyBot;

impl YBot for EasyBot {
    fn name(&self) -> &str {
        "easy_bot"
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        std::thread::sleep(std::time::Duration::from_millis(500));

        let use_heuristic: bool = rand::random::<f32>() < 0.60;

        if use_heuristic {
            best_move(board)
        } else {
            // Fall back to random selection
            let available = board.available_cells();
            let &cell_idx = available.choose(&mut rand::rng())?;
            Some(Coordinates::from_index(cell_idx, board.board_size()))
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Movement, PlayerId};

    fn make_placement(player: u32, coords: Coordinates) -> Movement {
        Movement::Placement {
            player: PlayerId::new(player),
            coords,
        }
    }

    #[test]
    fn test_heuristic_bot_name() {
        assert_eq!(HeuristicBot.name(), "heuristic_bot");
    }

    #[test]
    fn test_easy_bot_name() {
        assert_eq!(EasyBot.name(), "easy_bot");
    }

    #[test]
    fn test_returns_valid_move_on_empty_board() {
        let game = GameY::new(5);
        let mv = best_move(&game);
        assert!(mv.is_some());
        let coords = mv.unwrap();
        assert!(game.available_cells().contains(&coords.to_index(game.board_size())));
    }

    #[test]
    fn test_returns_none_on_full_board() {
        let mut game = GameY::new(2);
        game.add_move(make_placement(0, Coordinates::new(1, 0, 0))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(0, 1, 0))).unwrap();
        game.add_move(make_placement(0, Coordinates::new(0, 0, 1))).unwrap();
        assert!(best_move(&game).is_none());
    }

    /// Bot must take a winning move rather than doing anything else.
    #[test]
    fn test_takes_winning_move() {
        let mut game = GameY::new(3);
        game.add_move(make_placement(0, Coordinates::new(0, 0, 2))).unwrap(); 
        game.add_move(make_placement(1, Coordinates::new(2, 0, 0))).unwrap(); 
        game.add_move(make_placement(0, Coordinates::new(1, 1, 0))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(0, 2, 0))).unwrap();

        let chosen = best_move(&game).expect("bot must return a move");
        let mut sim = game.clone();
        sim.add_move(make_placement(0, chosen)).unwrap();
        assert!(
            matches!(sim.status(), GameStatus::Finished { winner } if *winner == PlayerId::new(0)),
            "Bot should have taken the winning move, chose {:?}",
            chosen
        );
    }

    /// Bot must block the opponent rather than ignoring the threat.
    #[test]
    fn test_blocks_opponent_win() {
        let mut game = GameY::new(3);
        game.add_move(make_placement(0, Coordinates::new(0, 2, 0))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(2, 0, 0))).unwrap();
        game.add_move(make_placement(0, Coordinates::new(1, 1, 0))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(1, 0, 1))).unwrap();
        game.add_move(make_placement(0, Coordinates::new(0, 1, 1))).unwrap();
        let chosen = best_move(&game).expect("bot must return a move");
        assert_eq!(
            chosen,
            Coordinates::new(0, 0, 2),
            "Bot should block the winning cell, chose {:?}",
            chosen
        );
    }

    /// Assert it picks a cell near the centroid instead
    #[test]
    fn test_prefers_central_cell_on_empty_board() {
        let game = GameY::new(7);
        let chosen = best_move(&game).expect("should have a move");
        let centroid = (game.board_size() as f32 - 1.0) / 3.0;
        let dist = (chosen.x() as f32 - centroid).abs()
            + (chosen.y() as f32 - centroid).abs()
            + (chosen.z() as f32 - centroid).abs();
        assert!(
            dist < 3.0,
            "Bot should prefer a central cell on an empty board, chose {:?} (dist {:.1})",
            chosen, dist
        );
}

    /// Cells adjacent to friendly pieces should score higher than isolated ones
    /// when side-touching is equal (tests the friendly_neighbours bonus).
    #[test]
    fn test_prefers_cell_adjacent_to_friendly_pieces() {
        let mut game = GameY::new(5);
        game.add_move(make_placement(0, Coordinates::new(0, 2, 2))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(4, 0, 0))).unwrap();

        let bot_player = game.next_player().unwrap();

        let adjacent = Coordinates::new(0, 1, 3);
        let isolated  = Coordinates::new(0, 4, 0);

        let score_adj = score_placement(&game, adjacent, bot_player);
        let score_iso = score_placement(&game, isolated,  bot_player);

        assert!(
            score_adj > score_iso,
            "Adjacent cell ({:?}, score {}) should outscore isolated ({:?}, score {})",
            adjacent, score_adj, isolated, score_iso
        );
    }
}