//! Bot module for the Game of Y.
//!
//! This module provides the infrastructure for creating and managing AI bots
//! that can play the Game of Y. It includes:
//!
//! - [`YBot`] - A trait that defines the interface for all bots
//! - [`YBotRegistry`] - A registry for managing multiple bot implementations
//! - [`RandomBot`] - A simple bot that makes random valid moves
//! - [`HeuristicBot`] - A smart bot: wins if it can, blocks if needed, else scores moves


pub mod random;
pub mod ybot;
pub mod ybot_registry;
pub mod heuristic;

pub use random::*;
pub use ybot::*;
pub use ybot_registry::*;
pub use heuristic::*;
