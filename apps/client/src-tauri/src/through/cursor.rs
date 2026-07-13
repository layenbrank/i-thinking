//! Cross-platform global cursor position helper (returns physical pixels).

#[cfg(target_os = "windows")]
pub fn get_cursor_position() -> Option<(i32, i32)> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut p = POINT { x: 0, y: 0 };
    unsafe {
        if GetCursorPos(&mut p).is_ok() {
            return Some((p.x, p.y));
        }
    }
    None
}

#[cfg(target_os = "macos")]
pub fn get_cursor_position() -> Option<(i32, i32)> {
    use core_graphics::event::{CGEvent, CGEventSource, CGEventSourceStateID};
    let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState).ok()?;
    let evt = CGEvent::new(source).ok()?;
    let p = evt.location();
    Some((p.x as i32, p.y as i32))
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub fn get_cursor_position() -> Option<(i32, i32)> {
    None
}
