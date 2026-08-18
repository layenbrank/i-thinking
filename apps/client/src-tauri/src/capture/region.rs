//! 枚举可见顶层窗口，换算为 overlay 局部逻辑像素。不 hide overlay；忽略自身 HWND。
//! 过滤与矩形取法对照 ShareX WindowsRectangleList / CaptureHelpers（GPL，仅算法，不拷贝源码）。

use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

use crate::capture::schema::CaptureRegion;
use crate::overlay::command::OVERLAY_LABEL;

const MIN_SIDE_PX: i32 = 8;

/// NVIDIA overlay + 桌面宿主（Progman/WorkerW）+ 无意义 Button
const IGNORE_CLASSES: &[&str] = &["CEF-OSC-WIDGET", "Progman", "WorkerW", "Button"];

pub fn find_overlay_regions(app: &AppHandle) -> Vec<CaptureRegion> {
    let Some(window) = app.get_webview_window(OVERLAY_LABEL) else {
        return Vec::new();
    };
    let Ok(Some(monitor)) = app.primary_monitor() else {
        return Vec::new();
    };
    let origin = *monitor.position();
    let size = *monitor.size();
    let scale = window.scale_factor().unwrap_or(1.0).max(0.01);

    #[cfg(windows)]
    {
        let ignore = window.hwnd().ok();
        find_windows_regions(ignore, origin, size, scale)
    }
    #[cfg(not(windows))]
    {
        let _ = (origin, size, scale);
        Vec::new()
    }
}

#[cfg(windows)]
fn find_windows_regions(
    ignore: Option<windows::Win32::Foundation::HWND>,
    origin: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    scale: f64,
) -> Vec<CaptureRegion> {
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, LPARAM, POINT, RECT, TRUE};
    use windows::Win32::Graphics::Dwm::{
        DwmGetWindowAttribute, DWMWA_CLOAKED, DWMWA_EXTENDED_FRAME_BOUNDS,
    };
    use windows::Win32::Graphics::Gdi::ClientToScreen;
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetClassNameW, GetClientRect, GetWindowLongW, GetWindowRect, IsIconic,
        IsWindowVisible, GWL_EXSTYLE, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
    };

    struct EnumState {
        ignore: Option<HWND>,
        origin: PhysicalPosition<i32>,
        size: PhysicalSize<u32>,
        scale: f64,
        regions: Vec<CaptureRegion>,
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let state = unsafe { &mut *(lparam.0 as *mut EnumState) };
        if state.ignore == Some(hwnd) {
            return TRUE;
        }
        if !unsafe { IsWindowVisible(hwnd) }.as_bool() {
            return TRUE;
        }
        if unsafe { IsIconic(hwnd) }.as_bool() {
            return TRUE;
        }
        if is_cloaked(hwnd) {
            return TRUE;
        }

        let class_name = window_class(hwnd);
        if IGNORE_CLASSES
            .iter()
            .any(|name| class_name.eq_ignore_ascii_case(name))
        {
            return TRUE;
        }

        let ex_style = unsafe { GetWindowLongW(hwnd, GWL_EXSTYLE) } as u32;
        let is_tool = ex_style & WS_EX_TOOLWINDOW.0 != 0;
        let is_noactivate = ex_style & WS_EX_NOACTIVATE.0 != 0;
        if is_tool && is_noactivate {
            return TRUE;
        }

        let Some(frame) = window_frame(hwnd) else {
            return TRUE;
        };
        // 客户区先入列：同窗内悬停优先内容区（对照 ShareX 先 Add client 再 Add window）
        if let Some(client) = client_frame(hwnd) {
            if !same_rect(&client, &frame) {
                if let Some(region) = clip_to_overlay(client, state.origin, state.size, state.scale)
                {
                    state.regions.push(region);
                }
            }
        }
        if let Some(region) = clip_to_overlay(frame, state.origin, state.size, state.scale) {
            state.regions.push(region);
        }
        TRUE
    }

    fn is_cloaked(hwnd: HWND) -> bool {
        let mut cloaked: u32 = 0;
        let ok = unsafe {
            DwmGetWindowAttribute(
                hwnd,
                DWMWA_CLOAKED,
                &mut cloaked as *mut u32 as *mut _,
                std::mem::size_of::<u32>() as u32,
            )
        };
        ok.is_ok() && cloaked != 0
    }

    fn window_class(hwnd: HWND) -> String {
        let mut buf = [0u16; 256];
        let len = unsafe { GetClassNameW(hwnd, &mut buf) };
        if len <= 0 {
            return String::new();
        }
        String::from_utf16_lossy(&buf[..len as usize])
    }

    fn window_frame(hwnd: HWND) -> Option<RECT> {
        let mut rect = RECT::default();
        let extended = unsafe {
            DwmGetWindowAttribute(
                hwnd,
                DWMWA_EXTENDED_FRAME_BOUNDS,
                &mut rect as *mut RECT as *mut _,
                std::mem::size_of::<RECT>() as u32,
            )
        };
        if extended.is_ok() {
            return Some(rect);
        }
        unsafe { GetWindowRect(hwnd, &mut rect) }.ok()?;
        Some(rect)
    }

    fn client_frame(hwnd: HWND) -> Option<RECT> {
        let mut rect = RECT::default();
        unsafe { GetClientRect(hwnd, &mut rect) }.ok()?;
        let mut origin = POINT {
            x: rect.left,
            y: rect.top,
        };
        if !unsafe { ClientToScreen(hwnd, &mut origin) }.as_bool() {
            return None;
        }
        Some(RECT {
            left: origin.x,
            top: origin.y,
            right: origin.x + (rect.right - rect.left),
            bottom: origin.y + (rect.bottom - rect.top),
        })
    }

    fn same_rect(a: &RECT, b: &RECT) -> bool {
        a.left == b.left && a.top == b.top && a.right == b.right && a.bottom == b.bottom
    }

    fn clip_to_overlay(
        rect: RECT,
        origin: PhysicalPosition<i32>,
        size: PhysicalSize<u32>,
        scale: f64,
    ) -> Option<CaptureRegion> {
        let mx = origin.x;
        let my = origin.y;
        let right = mx.saturating_add(size.width as i32);
        let bottom = my.saturating_add(size.height as i32);
        let left = rect.left.max(mx);
        let top = rect.top.max(my);
        let clip_right = rect.right.min(right);
        let clip_bottom = rect.bottom.min(bottom);
        let pw = clip_right - left;
        let ph = clip_bottom - top;
        if pw < MIN_SIDE_PX || ph < MIN_SIDE_PX {
            return None;
        }
        Some(CaptureRegion {
            x: f64::from(left - mx) / scale,
            y: f64::from(top - my) / scale,
            w: f64::from(pw) / scale,
            h: f64::from(ph) / scale,
        })
    }

    let mut state = EnumState {
        ignore,
        origin,
        size,
        scale,
        regions: Vec::new(),
    };
    let _ = unsafe { EnumWindows(Some(enum_proc), LPARAM(&mut state as *mut EnumState as isize)) };
    state.regions
}
