use crate::{Coordinates, GameAction, PlayerId};
use std::fmt::Display;

/// Represents a move that a player can make during the game.
///
/// A movement can either be placing a piece on the board at specific coordinates,
/// or performing a special game action like swapping or resigning.
#[derive(Debug, Clone)]
pub enum Movement {
    /// A piece placement on the board.
    Placement {
        /// The player making the placement.
        player: PlayerId,
        /// The coordinates where the piece is placed.
        coords: Coordinates,
    },
    /// Steal an opponent's piece, converting it to your own.
    /// Only valid in game modes that allow stealing (e.g. Rob Mode).
    /// The target cell must be occupied by the opponent.
    Steal {
        /// The player performing the steal.
        player: PlayerId,
        /// The coordinates of the opponent's piece to steal.
        coords: Coordinates,
    },
    /// A special game action (not a piece placement).
    Action {
        /// The player performing the action.
        player: PlayerId,
        /// The action being performed.
        action: GameAction,
    },
}

impl Display for Movement {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Movement::Placement { player, coords } => {
                write!(f, "Player {} places at {}", player, coords)
            }
            Movement::Steal { player, coords } => {
                write!(f, "Player {} steals at {}", player, coords)
            }
            Movement::Action { player, action } => {
                write!(f, "Player {} performs action {}", player, action)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_placement_display() {
        let movement = Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(1, 2, 3),
        };
        assert_eq!(format!("{}", movement), "Player 0 places at (1, 2, 3)");
    }

    #[test]
    fn test_steal_display() {
        let movement = Movement::Steal {
            player: PlayerId::new(1),
            coords: Coordinates::new(2, 1, 0),
        };
        assert_eq!(format!("{}", movement), "Player 1 steals at (2, 1, 0)");
    }

    #[test]
    fn test_action_swap_display() {
        let movement = Movement::Action {
            player: PlayerId::new(1),
            action: GameAction::Swap,
        };
        assert_eq!(format!("{}", movement), "Player 1 performs action Swap");
    }

    #[test]
    fn test_action_resign_display() {
        let movement = Movement::Action {
            player: PlayerId::new(0),
            action: GameAction::Resign,
        };
        assert_eq!(format!("{}", movement), "Player 0 performs action Resign");
    }

    #[test]
    fn test_clone_placement() {
        let movement = Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(1, 2, 3),
        };
        let cloned = movement.clone();
        assert_eq!(format!("{}", movement), format!("{}", cloned));
    }

    #[test]
    fn test_clone_steal() {
        let movement = Movement::Steal {
            player: PlayerId::new(0),
            coords: Coordinates::new(1, 2, 3),
        };
        let cloned = movement.clone();
        assert_eq!(format!("{}", movement), format!("{}", cloned));
    }
}