use tauri::{
    AppHandle, Result, Wry,
    menu::{MenuBuilder, MenuItem},
};

fn run(handle: AppHandle<Wry>) -> Result<()> {
    MenuBuilder::new(&handle)
        .item(&MenuItem::new(&handle, "显示窗口", true, None::<&str>)?)
        .item(&MenuItem::new(&handle, "退出", true, None::<&str>)?)
        .build()?;
    Ok(())
}
