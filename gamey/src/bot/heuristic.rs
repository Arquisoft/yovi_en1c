use crate::{Cell, Coordinates, GameStatus, GameY, Movement, PlayerId, YBot};
use std::collections::{HashMap, HashSet, VecDeque};
use rand::Rng;
use rand::prelude::IndexedRandom;

const WIN_SCORE: i32 = 1_000_000;
const MINIMAX_DEPTH: u32 = 3;
const STEAL_THRESHOLD: f32 = 0.82;

// ─────────────────────────────────────────────────────────────
// Small utilities
// ─────────────────────────────────────────────────────────────

// Returns the opponent player ID.
fn other_player(player: PlayerId) -> PlayerId {
    if player.id() == 0 { PlayerId::new(1) } else { PlayerId::new(0) }
}

// Returns the 6 neighboring coordinates of a given cell, filtering out those that are out of bounds.
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

// Generates all valid coordinates for a given board size.
fn all_coords(size: u32) -> Vec<Coordinates> {
    let n = size - 1;
    (0..=n)
        .flat_map(move |x| (0..=(n - x)).map(move |y| Coordinates::new(x, y, n - x - y)))
        .collect()
}

// ─────────────────────────────────────────────────────────────
// Virtual connection cost
// ─────────────────────────────────────────────────────────────

// Computes a heuristic cost of how well the given player is connected to all three sides, by performing a BFS from each side and summing the distances.
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

// BFS from a given side to compute the cost to connect to that side for all cells.
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

// The virtual connection cost is the minimum sum of distances to all three sides, which estimates how close the player is to winning. A cost of 0 means already connected.
fn virtual_connection_cost(board: &GameY, player: PlayerId) -> u32 {
    let all = all_coords(board.board_size());

    let side_a: Vec<_> = all.iter().copied().filter(|c| c.touches_side_a()).collect();
    let side_b: Vec<_> = all.iter().copied().filter(|c| c.touches_side_b()).collect();
    let side_c: Vec<_> = all.iter().copied().filter(|c| c.touches_side_c()).collect();

    let dist_a = bfs_from_side(board, &side_a, player);
    let dist_b = bfs_from_side(board, &side_b, player);
    let dist_c = bfs_from_side(board, &side_c, player);

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
// Static board evaluation
// ─────────────────────────────────────────────────────────────

fn evaluate_board(board: &GameY, bot_player: PlayerId) -> i32 {
    let my_cost  = virtual_connection_cost(board, bot_player)               as i32;
    let opp_cost = virtual_connection_cost(board, other_player(bot_player)) as i32;
    opp_cost - my_cost
}

// ─────────────────────────────────────────────────────────────
// Move ordering heuristic
// ─────────────────────────────────────────────────────────────


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

// Scores a potential placement based on how it connects to existing groups and how close it is to the center. Higher score means more promising move.
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
// Includes steal moves so the bot reasons about rob mode properly.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

fn minimax(
    board: &GameY,
    depth: u32,
    mut alpha: i32,
    mut beta: i32,
    maximizing: bool,
    bot_player: PlayerId,
    rob_mode: bool,
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
    let opponent = other_player(current_player);
    let size = board.board_size();

    let mut placement_candidates: Vec<Coordinates> = available
        .iter()
        .map(|&idx| Coordinates::from_index(idx, size))
        .collect();
    placement_candidates.sort_by_key(|&c| -score_placement(board, c, current_player));
    placement_candidates.truncate(12);

    let steal_candidates: Vec<Coordinates> = if rob_mode {
        let mut opp: Vec<(Coordinates, u32)> = all_coords(size)
            .into_iter()
            .filter(|c| board.cell_at(c) == Cell::Occupied(opponent))
            .filter_map(|c| {
                let mut sim = board.clone();
                sim.add_move(Movement::Steal { player: current_player, coords: c }).ok()?;
                Some((c, virtual_connection_cost(&sim, current_player)))
            })
            .collect();
        opp.sort_by_key(|&(_, cost)| cost);
        opp.truncate(3);
        opp.into_iter().map(|(c, _)| c).collect()
    } else {
        vec![]
    };

    if maximizing {
        let mut value = i32::MIN;
        for coords in &placement_candidates {
            let mut sim = board.clone();
            if sim.add_move(Movement::Placement { player: current_player, coords: *coords }).is_ok() {
                value = value.max(minimax(&sim, depth - 1, alpha, beta, false, bot_player, rob_mode));
                alpha = alpha.max(value);
                if alpha >= beta { break; }
            }
        }
        for coords in &steal_candidates {
            let mut sim = board.clone();
            if sim.add_move(Movement::Steal { player: current_player, coords: *coords }).is_ok() {
                value = value.max(minimax(&sim, depth - 1, alpha, beta, false, bot_player, rob_mode));
                alpha = alpha.max(value);
                if alpha >= beta { break; }
            }
        }
        value
    } else {
        // minimizing opponent
        let mut value = i32::MAX;
        for coords in &placement_candidates {
            let mut sim = board.clone();
            if sim.add_move(Movement::Placement { player: current_player, coords: *coords }).is_ok() {
                value = value.min(minimax(&sim, depth - 1, alpha, beta, true, bot_player, rob_mode));
                beta = beta.min(value);
                if alpha >= beta { break; }
            }
        }
        for coords in &steal_candidates {
            let mut sim = board.clone();
            if sim.add_move(Movement::Steal { player: current_player, coords: *coords }).is_ok() {
                value = value.min(minimax(&sim, depth - 1, alpha, beta, true, bot_player, rob_mode));
                beta = beta.min(value);
                if alpha >= beta { break; }
            }
        }
        value
    }
}

// ─────────────────────────────────────────────────────────────
// Core placement selection
// ─────────────────────────────────────────────────────────────

// Returns the best move for the bot player using minimax with the specified depth.
fn best_move_with_depth(board: &GameY, depth: u32) -> Option<Coordinates> {
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
                minimax(&sim, depth - 1, i32::MIN + 1, i32::MAX, false, bot_player, false)
            } else {
                i32::MIN
            };
            (coords, score)
        })
        .max_by_key(|&(_, score)| score)
        .map(|(coords, _)| coords)
}

fn best_move(board: &GameY) -> Option<Coordinates> {
    best_move_with_depth(board, MINIMAX_DEPTH)
}

// ─────────────────────────────────────────────────────────────
// Rob-mode helpers
// ─────────────────────────────────────────────────────────────

// Returns all coordinates occupied by the opponent, which are potential steal targets.
fn opponent_cells(board: &GameY, opponent: PlayerId) -> Vec<Coordinates> {
    all_coords(board.board_size())
        .into_iter()
        .filter(|c| board.cell_at(c) == Cell::Occupied(opponent))
        .collect()
}

fn cost_after_steal(board: &GameY, thief: PlayerId, target: Coordinates) -> Option<u32> {
    let mut sim = board.clone();
    sim.add_move(Movement::Steal { player: thief, coords: target }).ok()?;
    Some(virtual_connection_cost(&sim, thief))
}

fn cost_after_placement(board: &GameY, player: PlayerId, coords: Coordinates) -> Option<u32> {
    let mut sim = board.clone();
    sim.add_move(Movement::Placement { player, coords }).ok()?;
    Some(virtual_connection_cost(&sim, player))
}

fn best_steal(board: &GameY, bot_player: PlayerId) -> Option<(Coordinates, u32)> {
    let opponent = other_player(bot_player);
    opponent_cells(board, opponent)
        .into_iter()
        .filter_map(|c| Some((c, cost_after_steal(board, bot_player, c)?)))
        .min_by_key(|&(_, cost)| cost)
}

fn best_placement_by_cost(board: &GameY, bot_player: PlayerId) -> Option<(Coordinates, u32)> {
    let size = board.board_size();
    board
        .available_cells()
        .iter()
        .filter_map(|&idx| {
            let coords = Coordinates::from_index(idx, size);
            Some((coords, cost_after_placement(board, bot_player, coords)?))
        })
        .min_by_key(|&(_, cost)| cost)
}

fn steal_is_worth_it(s_cost: u32, p_cost: u32) -> bool {
    if p_cost == 0 {
        return false; 
    }
    (s_cost as f32) < (p_cost as f32) * STEAL_THRESHOLD
}

// ─────────────────────────────────────────────────────────────
// RobBot difficulty strategy
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RobDifficulty {
    Random,
    Easy,
    Hard,
}

fn rob_choose(board: &GameY, difficulty: RobDifficulty) -> Option<(Coordinates, bool)> {
    let bot_player = board.next_player()?;
    let opponent   = other_player(bot_player);

    match difficulty {
        // Random difficulty picks randomly between a steal and a placement, without any evaluation.
        RobDifficulty::Random => {
            let opp_cells = opponent_cells(board, opponent);
            let try_steal = !opp_cells.is_empty() && rand::rng().random_bool(0.5);

            if try_steal {
                let cell = opp_cells.choose(&mut rand::rng())?;
                return Some((*cell, true));
            }

            let size = board.board_size();
            let available = board.available_cells();
            if available.is_empty() {
                return None;
            }
            let idx = available.choose(&mut rand::rng())?;
            Some((Coordinates::from_index(*idx, size), false))
        }

        // Easy difficulty evaluates the best placement and the best steal, and chooses the steal if it significantly improves connectivity.
        RobDifficulty::Easy => {
            let place_opt = best_placement_by_cost(board, bot_player);
            let steal_opt = best_steal(board, bot_player);

            if let (Some((sc, s_cost)), Some((_, p_cost))) = (steal_opt, place_opt) {
                if steal_is_worth_it(s_cost, p_cost) {
                    return Some((sc, true));
                }
            }

            best_move_with_depth(board, 1).map(|c| (c, false))
        }

        // Hard difficulty evaluates both placements and steals with a deeper minimax, using the heuristic for move ordering.
        RobDifficulty::Hard => {
            let size = board.board_size();
            let available = board.available_cells().clone();
            let steal_candidates: Vec<Coordinates> = {
                let mut opp: Vec<(Coordinates, u32)> = opponent_cells(board, opponent)
                    .into_iter()
                    .filter_map(|c| Some((c, cost_after_steal(board, bot_player, c)?)))
                    .collect();
                opp.sort_by_key(|&(_, cost)| cost);
                opp.truncate(5);
                opp.into_iter().map(|(c, _)| c).collect()
            };

            let mut best_score = i32::MIN;
            let mut best_coords = None;
            let mut best_is_steal = false;

            // Evaluate placements
            let mut placement_candidates: Vec<Coordinates> = available
                .iter()
                .map(|&idx| Coordinates::from_index(idx, size))
                .collect();
            placement_candidates.sort_by_key(|&c| -score_placement(board, c, bot_player));
            placement_candidates.truncate(15);

            for coords in placement_candidates {
                let mut sim = board.clone();
                if sim.add_move(Movement::Placement { player: bot_player, coords }).is_ok() {
                    let score = minimax(
                        &sim,
                        MINIMAX_DEPTH - 1,
                        i32::MIN + 1,
                        i32::MAX,
                        false,
                        bot_player,
                        true,
                    );
                    if score > best_score {
                        best_score = score;
                        best_coords = Some(coords);
                        best_is_steal = false;
                    }
                }
            }

            // Evaluate steals
             for coords in steal_candidates {
            let mut sim = board.clone();
            if sim.add_move(Movement::Steal { player: bot_player, coords }).is_ok() {
                let score = minimax(
                    &sim,
                    MINIMAX_DEPTH - 1,
                    i32::MIN + 1,
                    i32::MAX,
                    false,
                    bot_player,
                    true,
                );
    let adjusted_score = if score > 0 {
                    (score as f32 * STEAL_THRESHOLD) as i32
                } else {
                    score
                };

                if adjusted_score > best_score {
                    best_score = adjusted_score;
                    best_coords = Some(coords);
                    best_is_steal = true;
                }
            }
        }

        best_coords.map(|c| (c, best_is_steal))
            }
        }
    }


// ─────────────────────────────────────────────────────────────
// Public bot structs
// ─────────────────────────────────────────────────────────────

// EasyBot: uses a shallow minimax (depth 1) for quick decisions, no steal logic.
pub struct EasyBot;
impl YBot for EasyBot {
    fn name(&self) -> &str { "easy_bot" }
    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        std::thread::sleep(std::time::Duration::from_millis(500));
        best_move_with_depth(board, 1)
    }
}

// HeuristicBot: uses a deeper minimax and a heuristic for move ordering, but no steal logic.
pub struct HeuristicBot;
impl YBot for HeuristicBot {
    fn name(&self) -> &str { "heuristic_bot" }
    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        std::thread::sleep(std::time::Duration::from_millis(600));
        best_move(board)
    }
}


// RobBot with multiple difficulty levels, including steal logic
pub struct RobBot {
    difficulty: RobDifficulty,
}

impl RobBot {
    pub const fn random() -> Self { Self { difficulty: RobDifficulty::Random } }
    pub const fn easy()   -> Self { Self { difficulty: RobDifficulty::Easy } }
    pub const fn hard()   -> Self { Self { difficulty: RobDifficulty::Hard } }
}

impl YBot for RobBot {
    fn name(&self) -> &str {
        match self.difficulty {
            RobDifficulty::Random => "rob_bot_random",
            RobDifficulty::Easy   => "rob_bot_easy",
            RobDifficulty::Hard   => "rob_bot_hard",
        }
    }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        std::thread::sleep(std::time::Duration::from_millis(550));
        rob_choose(board, self.difficulty).map(|(coords, _)| coords)
    }

    fn choose_action(&self, board: &GameY) -> Option<(Coordinates, bool)> {
        std::thread::sleep(std::time::Duration::from_millis(550));
        rob_choose(board, self.difficulty)
    }

    fn wants_to_steal(&self, board: &GameY) -> bool {
        rob_choose(board, self.difficulty)
            .map(|(_, is_steal)| is_steal)
            .unwrap_or(false)
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
    fn test_heuristic_bot_name() { assert_eq!(HeuristicBot.name(), "heuristic_bot"); }

    #[test]
    fn test_easy_bot_name() { assert_eq!(EasyBot.name(), "easy_bot"); }

    #[test]
    fn test_returns_valid_move_on_empty_board() {
        let game = GameY::new(5);
        let mv = best_move(&game).unwrap();
        assert!(game.available_cells().contains(&mv.to_index(game.board_size())));
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
        let chosen = best_move(&game).unwrap();
        let mut sim = game.clone();
        sim.add_move(make_placement(0, chosen)).unwrap();
        assert!(matches!(
            sim.status(),
            GameStatus::Finished { winner } if *winner == PlayerId::new(0)
        ));
    }

    #[test]
    fn test_blocks_opponent_win() {
        let mut game = GameY::new(3);
        game.add_move(make_placement(0, Coordinates::new(0, 2, 0))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(2, 0, 0))).unwrap();
        game.add_move(make_placement(0, Coordinates::new(1, 1, 0))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(1, 0, 1))).unwrap();
        game.add_move(make_placement(0, Coordinates::new(0, 1, 1))).unwrap();
        let chosen = best_move(&game).unwrap();
        assert_eq!(chosen, Coordinates::new(0, 0, 2));
    }

    #[test]
    fn test_virtual_cost_zero_when_already_connected() {
        let mut game = GameY::new(3);
        game.add_move(make_placement(0, Coordinates::new(0, 1, 1))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(2, 0, 0))).unwrap();
        game.add_move(make_placement(0, Coordinates::new(1, 0, 1))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(0, 2, 0))).unwrap();
        game.add_move(make_placement(0, Coordinates::new(1, 1, 0))).unwrap();
        assert_eq!(virtual_connection_cost(&game, PlayerId::new(0)), 0);
    }

    #[test]
    fn test_virtual_cost_decreases_with_better_positions() {
        let mut game = GameY::new(5);
        let cost_empty = virtual_connection_cost(&game, PlayerId::new(0));
        game.add_move(make_placement(0, Coordinates::new(1, 1, 2))).unwrap();
        game.add_move(make_placement(1, Coordinates::new(4, 0, 0))).unwrap();
        let cost_after = virtual_connection_cost(&game, PlayerId::new(0));
        assert!(cost_after <= cost_empty);
    }


    #[test]
    fn test_rob_bot_names() {
        assert_eq!(RobBot::random().name(), "rob_bot_random");
        assert_eq!(RobBot::easy().name(),   "rob_bot_easy");
        assert_eq!(RobBot::hard().name(),   "rob_bot_hard");
    }

 
    #[test]
    fn test_all_rob_difficulties_return_valid_move_on_empty_board() {
        for bot in [RobBot::random(), RobBot::easy(), RobBot::hard()] {
            let game = GameY::new(5);
            let mv = bot.choose_move(&game).expect("should return a move");
            assert!(
                game.available_cells().contains(&mv.to_index(game.board_size())),
                "{} chose an invalid cell on empty board", bot.name()
            );
        }
    }


    #[test]
    fn test_all_rob_difficulties_no_steal_on_empty_board() {
        for bot in [RobBot::random(), RobBot::easy(), RobBot::hard()] {
            let game = GameY::new(5);
            let (_, is_steal) = bot.choose_action(&game).expect("should return an action");
            assert!(
                !is_steal,
                "{} should not want to steal with no opponent cells", bot.name()
            );
        }
    }

    #[test]
    fn test_steal_target_is_opponent_cell_easy() {
        let mut game = GameY::new(5);
        game.add_move(make_placement(0, Coordinates::new(1, 1, 2))).unwrap();
        let bot = RobBot::easy();
        let (coords, is_steal) = bot.choose_action(&game).unwrap();
        if is_steal {
            assert_eq!(
                game.cell_at(&coords),
                Cell::Occupied(PlayerId::new(0)),
                "easy bot stole its own cell"
            );
        }
    }

    #[test]
    fn test_steal_target_is_opponent_cell_hard() {
        let mut game = GameY::new(5);
        game.add_move(make_placement(0, Coordinates::new(1, 1, 2))).unwrap();
        let bot = RobBot::hard();
        let (coords, is_steal) = bot.choose_action(&game).unwrap();
        if is_steal {
            assert_eq!(
                game.cell_at(&coords),
                Cell::Occupied(PlayerId::new(0)),
                "hard bot stole its own cell"
            );
        }
    }

    #[test]
    fn test_choose_action_consistent_with_steal_flag() {
        let mut game = GameY::new(5);
        game.add_move(make_placement(0, Coordinates::new(2, 1, 1))).unwrap();
        game.add_move(make_placement(0, Coordinates::new(1, 2, 1))).unwrap();

        for bot in [RobBot::easy(), RobBot::hard()] {
            let (coords, is_steal) = bot.choose_action(&game).unwrap();
            if is_steal {
                assert_eq!(
                    game.cell_at(&coords),
                    Cell::Occupied(PlayerId::new(0)),
                    "{} stole a non-opponent cell", bot.name()
                );
            } else {
                assert_eq!(
                    game.cell_at(&coords),
                    Cell::Empty,
                    "{} placed on a non-empty cell", bot.name()
                );
            }
        }
    }

    #[test]
    fn test_steal_threshold_rejects_marginal_steal() {
        assert!(!steal_is_worth_it(9, 10));
    }

    #[test]
    fn test_steal_threshold_accepts_good_steal() {
        assert!(steal_is_worth_it(5, 10));
    }

    #[test]
    fn test_steal_threshold_rejects_when_placement_wins() {
        assert!(!steal_is_worth_it(0, 0));
    }

    // ── Helper unit tests ─────────────────────────────────────

    #[test]
    fn test_best_steal_none_when_no_opponent_cells() {
        let game = GameY::new(5);
        assert!(best_steal(&game, PlayerId::new(1)).is_none());
    }

    #[test]
    fn test_best_steal_returns_opponent_cell() {
        let mut game = GameY::new(5);
        game.add_move(make_placement(0, Coordinates::new(1, 1, 2))).unwrap();
        let (coords, _) = best_steal(&game, PlayerId::new(1)).unwrap();
        assert_eq!(game.cell_at(&coords), Cell::Occupied(PlayerId::new(0)));
    }

    #[test]
    fn test_cost_after_steal_does_not_worsen_connectivity() {
        let mut game = GameY::new(5);
        game.add_move(make_placement(0, Coordinates::new(1, 1, 2))).unwrap();
        let before = virtual_connection_cost(&game, PlayerId::new(1));
        let after  = cost_after_steal(&game, PlayerId::new(1), Coordinates::new(1, 1, 2)).unwrap();
        assert!(after <= before, "steal worsened connectivity: {} -> {}", before, after);
    }
}