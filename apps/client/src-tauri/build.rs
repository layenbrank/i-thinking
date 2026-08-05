fn main() {
    let pdfium = std::path::Path::new("binaries/pdfium.dll");
    if !pdfium.exists() {
        panic!(
            "binaries/pdfium.dll missing; run `bun run scripts/prepare.ts` in apps/client first"
        );
    }
    let meta = std::fs::metadata(pdfium).expect("stat pdfium.dll");
    if meta.len() == 0 {
        panic!(
            "binaries/pdfium.dll is empty; run `bun run scripts/prepare.ts` (no placeholder allowed)"
        );
    }
    tauri_build::build()
}
