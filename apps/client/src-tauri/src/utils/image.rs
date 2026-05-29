use base64::{engine::general_purpose, Engine};

pub enum Format {
    Png,
    Jpg,
    Base64,
}

fn transfrom(data: &[u8], format: Format) -> Result<Vec<u8>, String> {
    match format {
        Format::Png => {}
        Format::Jpg => {}
        Format::Base64 => {
            let mut buf: Vec<u8> = Vec::new();
            img.write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
                .map_err(|e| e.to_string())?;
            Ok(general_purpose::STANDARD.encode(&buf))
        }
    }
}
