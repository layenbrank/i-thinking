//! Region-based click-through controller.
//!
//! Background:
//!   The `countdown` window is a transparent borderless overlay. We want
//!   blank/transparent areas to pass mouse events through to whatever is
//!   behind (desktop, other windows), while card regions remain clickable.
//!
//! Strategy:
//!   - Frontend reports interactive rectangles (physical px) via the
//!     `click_through_update_rects` command.
//!   - A background tokio task polls the global cursor position every ~50ms.
//!   - If the cursor sits inside the window AND inside any registered rect,
//!     call `set_ignore_cursor_events(false)`. Otherwise `true`.
//!
//! Platforms:
//!   - Windows: GetCursorPos via the `windows` crate.
//!   - macOS:   CGEventSource::location via `core-graphics`.
//!   - Linux:   no-op (cursor::get_cursor_position returns None) -> window
//!              stays fully clickable, identical to the previous behaviour.

pub mod command;
pub mod cursor;
pub mod state;
pub mod worker;

pub use command::click_through_update_rects;
pub use state::ClickThroughState;
pub use worker::spawn_worker;
