fn main() {
    let pdfium = std::path::Path::new("binaries/pdfium.dll");
    if !pdfium.exists() {
        panic!(
            "binaries/pdfium.dll missing; run `pnpm sidecar bootstrap client` at repo root"
        );
    }
    let meta = std::fs::metadata(pdfium).expect("stat pdfium.dll");
    if meta.len() == 0 {
        panic!(
            "binaries/pdfium.dll is empty; run `pnpm sidecar bootstrap client` at repo root"
        );
    }

    let host = std::env::var("TAURI_ENV_TARGET_TRIPLE")
        .or_else(|_| std::env::var("TARGET"))
        .unwrap_or_else(|_| {
            std::process::Command::new("rustc")
                .args(["--print", "host-tuple"])
                .output()
                .ok()
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| "x86_64-pc-windows-msvc".into())
        });
    let goose_name = if cfg!(windows) {
        format!("binaries/goose-{host}.exe")
    } else {
        format!("binaries/goose-{host}")
    };
    let goose = std::path::Path::new(&goose_name);
    if !goose.exists() {
        panic!(
            "{goose_name} missing; run `pnpm sidecar bootstrap client` at repo root"
        );
    }

    tauri_build::build()
}
