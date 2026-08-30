fn main() {
    let pdfium = std::path::Path::new("binaries/pdfium.dll");
    if !pdfium.exists() {
        panic!(
            "binaries/pdfium.dll missing; run `pnpm prepare:bin` in apps/client (or `pnpm sidecar bootstrap --app client` at repo root)"
        );
    }
    let meta = std::fs::metadata(pdfium).expect("stat pdfium.dll");
    if meta.len() == 0 {
        panic!(
            "binaries/pdfium.dll is empty; run `pnpm prepare:bin` (no placeholder allowed)"
        );
    }
    tauri_build::build()
}
