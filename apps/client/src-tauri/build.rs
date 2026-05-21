use std::{env, fs, path::PathBuf};

fn main() {
    // ── Copy pdfium native library to target/{profile}/ so `tauri dev` finds it ──
    // Platform-specific filename
    let lib_name = if cfg!(target_os = "windows") {
        "pdfium.dll"
    } else if cfg!(target_os = "macos") {
        "libpdfium.dylib"
    } else {
        "libpdfium.so"
    };

    let src = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap()).join(lib_name);

    if src.exists() {
        // OUT_DIR is  .../target/{profile}/build/{pkg}-{hash}/out
        // ancestors().nth(3) == .../target/{profile}/
        if let Some(profile_dir) = PathBuf::from(env::var("OUT_DIR").unwrap())
            .ancestors()
            .nth(3)
        {
            let dest = profile_dir.join(lib_name);
            if !dest.exists() {
                fs::copy(&src, &dest)
                    .unwrap_or_else(|e| panic!("failed to copy {lib_name}: {e}"));
                println!("cargo:warning=Copied {lib_name} → {}", dest.display());
            }
        }
    } else {
        println!(
            "cargo:warning=pdfium native library not found at {}. \
             PDF features will be unavailable until you download it. \
             See: https://github.com/bblanchon/pdfium-binaries/releases",
            src.display()
        );
    }

    tauri_build::build()
}
