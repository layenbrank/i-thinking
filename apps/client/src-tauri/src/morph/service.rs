use pdfium_render::prelude::*;

fn bootstrap() -> Result<Pdfium, String> {
    let bindings =
        Pdfium::bind_to_system_library().map_err(|e| format!("pdfium library not found: {e}"))?;
    Ok(Pdfium::new(bindings))
}
