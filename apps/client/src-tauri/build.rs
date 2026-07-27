fn main() {
    let pdfium = std::path::Path::new("binaries/pdfium.dll");
    if !pdfium.exists() {
        if let Err(e) = std::fs::create_dir_all("binaries") {
            panic!("create binaries dir: {e}");
        }
        if let Err(e) = std::fs::write(pdfium, []) {
            panic!("create pdfium.dll placeholder for bundle check: {e}");
        }
        println!("cargo:warning=binaries/pdfium.dll missing; using empty placeholder (run prepare.ts after building corex-serve)");
    }
    tauri_build::build()
}
