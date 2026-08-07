fn main() {
    let pdfium = std::path::Path::new("binaries/pdfium.dll");
    if !pdfium.exists() {
        panic!(
            "binaries/pdfium.dll missing; run `node scripts/prepare/index.ts` in apps/client first"
        );
    }
    let meta = std::fs::metadata(pdfium).expect("stat pdfium.dll");
    if meta.len() == 0 {
        panic!(
            "binaries/pdfium.dll is empty; run `node scripts/prepare/index.ts` (no placeholder allowed)"
        );
    }
    tauri_build::build()
}
