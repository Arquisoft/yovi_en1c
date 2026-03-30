use crate::{Cell, Coordinates, GameStatus, GameY, Movement, PlayerId, YBot};
use rand::prelude::IndexedRandom;
use std::collections::{HashMap, HashSet, VecDeque};

const WIN_SCORE: i32 = 1_000_000;
const MINIMAX_DEPTH: u32 = 3;

// ─────────────────────────────────────────────────────────────
// Small utilities
// ─────────────────────────────────────────────────────────────

fn other_player(player: PlayerId) -> PlayerId {
    if player.id() == 0 { PlayerId::new(1) } else { PlayerId::new(0) }
}

// Returns up to 6 neighbours of a cell. All neighbours keep x+y+z = n-1.
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

// All valid cells on a board of `size` (where x+y+z == size-1).
fn all_coords(size: u32) -> Vec<Coordinates> {
    let n = size - 1;
    (0..=n)
        .flat_map(move |x| (0..=(n - x)).map(move |y| Coordinates::new(x, y, n - x - y)))
        .collect()
}

// ─────────────────────────────────────────────────────────────
// Virtual connection cost  (core evaluation idea)
// ─────────────────────────────────────────────────────────────
//
// To win Y you must connect all three sides simultaneously.
// The "virtual connection cost" is the minimum number of *additional*
// stones you would need to place to achieve that connection.
//
// Algorithm:
//   1. Run a 0-1 BFS from each side through the board:
//        - your own stones cost 0 to traverse (already there)
//        - empty cells cost 1 (need to be filled)
//        - opponent stones are impassable
//   2. For every cell C on the board, compute:
//        dist_A[C] + dist_B[C] + dist_C[C]
//      This is the cost of a "Steiner tree" routed through C.
//   3. The minimum over all cells is a tight lower bound on how many
//      moves you need to win. Subtract opponent's cost → evaluation.

// Cost to traverse a cell for `player`:
//   0    → already our stone (free)
//   1    → empty (we need to place here)
//   None → opponent's stone (impassable)
fn traverse_cost(board: &GameY, coords: Coordinates, player: PlayerId) -> Option<u32> {
    let cell = board.cell_at(&coords);
    if cell == Cell::Occupied(player) {
        Some(0)
    } else if cell == Cell::Occupied(other_player(player)) {
        None
    } else {
        Some(1)
    }
}

// Multi-source 0-1 BFS from a list of side cells.
// Returns the minimum cost to reach every reachable cell on the board.
fn bfs_from_side(
    board: &GameY,
    sources: &[Coordinates],
    player: PlayerId,
) -> HashMap<Coordinates, u32> {
    let mut dist: HashMap<Coordinates, u32> = HashMap::new();
    let mut deque: VecDeque<Coordinates> = VecDeque::new();

    for &start in sources {
        if let Some(cost) = traverse_cost(board, start, player) {
            if !dist.contains_key(&start) {
                dist.insert(start, cost);
                // 0-cost nodes go to the front, 1-cost to the back
                if cost == 0 { deque.push_front(start); } else { deque.push_back(start); }
            }
        }
    }

    while let Some(current) = deque.pop_front() {
        let d = *dist.get(&current).unwrap();
        for nb in neighbours(current) {
            if dist.contains_key(&nb) { continue; }
            if let Some(cost) = traverse_cost(board, nb, player) {
                let new_dist = d + cost;
                dist.insert(nb, new_dist);
                if cost == 0 { deque.push_front(nb); } else { deque.push_back(nb); }
            }
        }
    }

    dist
}

// Returns the minimum number of stones still needed to connect all 3 sides.
// Returns 999 if a win is impossible (fully blocked).
fn virtual_connection_cost(board: &GameY, player: PlayerId) -> u32 {
    let all = all_coords(board.board_size());

    let side_a: Vec<_> = all.iter().copied().filter(|c| c.touches_side_a()).collect();
    let side_b: Vec<_> = all.iter().copied().filter(|c| c.touches_side_b()).collect();
    let side_c: Vec<_> = all.iter().copied().filter(|c| c.touches_side_c()).collect();

    let dist_a = bfs_from_side(board, &side_a, player);
    let dist_b = bfs_from_side(board, &side_b, player);
    let dist_c = bfs_from_side(board, &side_c, player);

    // The Steiner-point cost through cell C = dist_a[C] + dist_b[C] + dist_c[C].
    // The minimum over all cells is how close we are to connecting all three sides.
    // A central cell (equidistant from all sides) minimises this naturally.
    all.iter()
        .filter_map(|c| {
            let da = dist_a.get(c).copied()?;
            let db = dist_b.get(c).copied()?;
            let dc = dist_c.get(c).copied()?;
            Some(da + db + dc)
        })
        .min()
        .unwrap_or(999)
}

// ─────────────────────────────────────────────────────────────
// Static board evaluation (used at minimax leaf nodes)
// ─────────────────────────────────────────────────────────────

// Full board score from the bot's perspective.
// Higher = better: we want our cost low and the opponent's cost high.
fn evaluate_board(board: &GameY, bot_player: PlayerId) -> i32 {
    let my_cost  = virtual_connection_cost(board, bot_player)               as i32;
    let opp_cost = virtual_connection_cost(board, other_player(bot_player)) as i32;
    opp_cost - my_cost
}

// ─────────────────────────────────────────────────────────────
// Cheap heuristic — only used to ORDER moves before expanding
// them in minimax (better ordering → more alpha-beta pruning)
// ─────────────────────────────────────────────────────────────

// BFS from `start` through already-placed friendly pieces.
fn group_info(
    board: &GameY,
    start: Coordinates,
    player: PlayerId,
) -> (HashSet<Coordinates>, bool, bool, bool) {
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
    (visited, touches_a, touches_b, touches_c)
}

fn score_placement(board: &GameY, coords: Coordinates, player: PlayerId) -> i32 {
    let (_, a, b, c) = group_info(board, coords, player);
    let sides = a as i32 + b as i32 + c as i32;

    let friendly_neighbours = neighbours(coords)
        .iter()
        .filter(|&&nb| board.cell_at(&nb) == Cell::Occupied(player))
        .count() as i32;

    let centroid = (board.board_size() as f32 - 1.0) / 3.0;
    let centrality_dist = ((coords.x() as f32 - centroid).abs()
        + (coords.y() as f32 - centroid).abs()
        + (coords.z() as f32 - centroid).abs()) as i32;

    sides * 40 + friendly_neighbours * 30 - centrality_dist * 5
}

// ─────────────────────────────────────────────────────────────
// Minimax with alpha-beta pruning
// ─────────────────────────────────────────────────────────────

fn minimax(
    board: &GameY,
    depth: u32,
    mut alpha: i32,
    mut beta: i32,
    maximizing: bool,
    bot_player: PlayerId,
) -> i32 {
    match board.status() {
        GameStatus::Finished { winner } if *winner == bot_player => return WIN_SCORE,
        GameStatus::Finished { .. } => return -WIN_SCORE,
        _ => {}
    }

    let available = board.available_cells().clone();
    if available.is_empty() || depth == 0 {
        return evaluate_board(board, bot_player);
    }

    let current_player = if maximizing { bot_player } else { other_player(bot_player) };
    let size = board.board_size();

    // Sort moves best-first so alpha-beta prunes more branches.
    let mut candidates: Vec<Coordinates> = available
        .iter()
        .map(|&idx| Coordinates::from_index(idx, size))
        .collect();
    candidates.sort_by_key(|&c| -score_placement(board, c, current_player));

    if maximizing {
        let mut value = i32::MIN;
        for coords in candidates {
            let mut sim = board.clone();
            if sim.add_move(Movement::Placement { player: current_player, coords }).is_ok() {
                value = value.max(minimax(&sim, depth - 1, alpha, beta, false, bot_player));
                alpha = alpha.max(value);
                if alpha >= beta { break; }
            }
        }
        value
    } else {
        let mut value = i32::MAX;
        for coords in candidates {
            let mut sim = board.clone();
            if sim.add_move(Movement::Placement { player: current_player, coords }).is_ok() {
                value = value.min(minimax(&sim, depth - 1, alpha, beta, true, bot_player));
                beta = beta.min(value);
                if alpha >= beta { break; }
            }
        }
        value
    }
}

// ─────────────────────────────────────────────────────────────
// Core move selection
// ─────────────────────────────────────────────────────────────

fn best_move(board: &GameY) -> Option<Coordinates> {
    let available = board.available_cells().clone();
    if available.is_empty() {
        return None;
    }

    let bot_player = board.next_player()?;
    let size = board.board_size();

    available
        .iter()
        .map(|&idx| {
            let coords = Coordinates::from_index(idx, size);
            let mut sim = board.clone();
            let score = if sim
                .add_move(Movement::Placement { player: bot_player, coords })
                .is_ok()
            {
                minimax(&sim, MINIMAX_DEPTH - 1, i32::MIN + 1, i32::MAX, false, bot_player)
            } else {
                i32::MIN
            };
            (coords, score)
        })
        .max_by_key(|&(_, score)| score)
        .map(|(coords, _)| coords)
}

// ─────────────────────────────────────────────────────────────
// Public bot structs
// ─────────────────────────────────────────────────────────────

/// Always plays the best move via minimax + virtual connection evaluation.
pub struct HeuristicBot;

impl YBot for HeuristicBot {
    fn name(&self) -> &str { "heuristic_bot" }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        std::thread::sleep(std::time::Duration::from_millis(600));
        best_move(board)
    }
}

/// Plays heuristically 20% of the time, randomly 80% of the time.
pub struct EasyBot;

impl YBot for EasyBot {
    fn name(&self) -> &str { "easy_bot" }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        std::thread::sleep(std::time::Duration::from_millis(500));
        if rand::random::<f32>() < 0.20 {
            best_move(board)
        } else {
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
        Movement::Placement { player: PlayerId::new(player), coords }
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
            "Bot should have taken the winning move, chose {:?}", chosen
        );
    }

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
            "Bot should block the winning cell, chose {:?}", chosen
        );
    }

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

    // Virtual connection cost should not increase after placing a central stone.
    #[test]
    fn test_virtual_cost_decreases_with_better_positions() {
        let mut game = GameY::new(5);
        let cost_empty = virtual_connection_cost(&game, PlayerId::new(0));

        game.add_move(make_placement(0, Coordinates::new(1, 1, 2))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(4, 0, 0))).unwrap();
        let cost_after = virtual_connection_cost(&game, PlayerId::new(0));

        assert!(
            cost_after <= cost_empty,
            "Cost should not increase after placing a central stone ({} -> {})",
            cost_empty, cost_after
        );
    }
}