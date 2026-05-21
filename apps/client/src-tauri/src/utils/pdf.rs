use base64::{engine::general_purpose, Engine as _};
use pdfium_render::prelude::*;
use serde::{Deserialize, Serialize};
use std::io::Cursor;

// ─── Data Structures ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PdfMeta {
    pub path:        String,
    pub title:       String,
    pub author:      String,
    pub page_count:  u32,
    pub page_width:  f32,
    pub page_height: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageImage {
    pub data_base64: String,
    pub width:       u32,
    pub height:      u32,
    pub page_index:  u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchMatch {
    pub page_index: u32,
    pub x:          f32,
    pub y:          f32,
    pub width:      f32,
    pub height:     f32,
    pub snippet:    String,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Bind to the pdfium shared library found on the system PATH / next to the binary.
fn load_pdfium() -> Result<Pdfium, String> {
    let bindings = Pdfium::bind_to_system_library()
        .map_err(|e| format!("pdfium library not found: {e}"))?;
    Ok(Pdfium::new(bindings))
}

fn image_to_base64_png(img: image::DynamicImage) -> Result<String, String> {
    let mut buf: Vec<u8> = Vec::new();
    img.write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    Ok(general_purpose::STANDARD.encode(&buf))
}

fn render_page_to_image(
    page: &PdfPage,
    scale: f32,
) -> Result<(image::DynamicImage, u32, u32), String> {
    let target_w = (page.width().value  * scale) as i32;
    let target_h = (page.height().value * scale) as i32;

    let config = PdfRenderConfig::new()
        .set_target_width(target_w)
        .set_maximum_height(target_h);

    let bitmap = page.render_with_config(&config).map_err(|e| e.to_string())?;
    let img    = bitmap.as_image();
    let (w, h) = (img.width(), img.height());
    Ok((img, w, h))
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

/// Open a PDF file and return its metadata.
#[tauri::command]
pub fn pdf_open_file(path: String) -> Result<PdfMeta, String> {
    let pdfium = load_pdfium()?;
    let doc    = pdfium.load_pdf_from_file(&path, None).map_err(|e| e.to_string())?;

    let page_count = doc.pages().len() as u32;
    let meta       = doc.metadata();
    let title  = meta.get(PdfDocumentMetadataTagType::Title)
        .map(|t| t.value().to_string())
        .unwrap_or_default();
    let author = meta.get(PdfDocumentMetadataTagType::Author)
        .map(|t| t.value().to_string())
        .unwrap_or_default();

    let (page_width, page_height) = if page_count > 0 {
        let page = doc.pages().get(0).map_err(|e| e.to_string())?;
        (page.width().value, page.height().value)
    } else {
        (595.0_f32, 842.0_f32)
    };

    Ok(PdfMeta { path, title, author, page_count, page_width, page_height })
}

/// Render a single page to a base64-encoded PNG.
/// `scale` — pixels-per-point multiplier (e.g. 2.0 ≈ 144 dpi for a 72-dpi PDF point).
#[tauri::command]
pub fn pdf_render_page(
    path:       String,
    page_index: u32,
    scale:      f32,
) -> Result<PageImage, String> {
    let pdfium = load_pdfium()?;
    let doc    = pdfium.load_pdf_from_file(&path, None).map_err(|e| e.to_string())?;
    let page   = doc.pages().get(page_index as u16).map_err(|e| e.to_string())?;

    let (img, w, h) = render_page_to_image(&page, scale)?;
    Ok(PageImage { data_base64: image_to_base64_png(img)?, width: w, height: h, page_index })
}

/// Render every page at thumbnail scale and return one PageImage per page.
/// Recommended `scale`: 0.5 – 0.7 (covers 2× DPR screens at ~180 px CSS display width).
#[tauri::command]
pub fn pdf_render_thumbnails(
    path:  String,
    scale: f32,
) -> Result<Vec<PageImage>, String> {
    let pdfium     = load_pdfium()?;
    let doc        = pdfium.load_pdf_from_file(&path, None).map_err(|e| e.to_string())?;
    let page_count = doc.pages().len();
    let mut results: Vec<PageImage> = Vec::with_capacity(page_count as usize);

    for i in 0..page_count {
        let page        = doc.pages().get(i).map_err(|e| e.to_string())?;
        let (img, w, h) = render_page_to_image(&page, scale)?;
        results.push(PageImage {
            data_base64: image_to_base64_png(img)?,
            width:       w,
            height:      h,
            page_index:  i as u32,
        });
    }

    Ok(results)
}

/// Full-text search across all pages; returns one match per occurrence.
/// Coordinates are page-relative PDF points (origin bottom-left).
#[tauri::command]
pub fn pdf_search_text(
    path:  String,
    query: String,
) -> Result<Vec<SearchMatch>, String> {
    let pdfium     = load_pdfium()?;
    let doc        = pdfium.load_pdf_from_file(&path, None).map_err(|e| e.to_string())?;
    let page_count = doc.pages().len();
    let query_lower = query.to_lowercase();
    let mut matches: Vec<SearchMatch> = Vec::new();

    for i in 0..page_count {
        let page    = doc.pages().get(i).map_err(|e| e.to_string())?;
        let text    = page.text().map_err(|e| e.to_string())?;
        let content = text.all();
        let content_lower = content.to_lowercase();

        let mut offset = 0usize;
        while let Some(rel) = content_lower[offset..].find(&query_lower) {
            let abs          = offset + rel;
            let snippet_s    = abs.saturating_sub(15);
            let snippet_e    = (abs + query.len() + 15).min(content.len());
            let snippet      = content[snippet_s..snippet_e].replace('\n', " ");

            matches.push(SearchMatch {
                page_index: i as u32,
                x: 0.0, y: 0.0, width: 0.0, height: 0.0,
                snippet,
            });

            offset = abs + query.len().max(1);
        }
    }

    Ok(matches)
}

/// Export (copy) a PDF to a new destination path.
#[tauri::command]
pub fn pdf_export(src: String, dest: String) -> Result<(), String> {
    std::fs::copy(&src, &dest)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

// ─── lopdf / office helpers ───────────────────────────────────────────────────

use lopdf::{Document as LopdfDoc, Object as LopdfObj, dictionary};
type LopdfId = lopdf::ObjectId; // (u32, u16)

/// Split a line of text into columns using 2+ consecutive spaces as separator.
/// Produces reasonable results for text-extracted-from-PDF table rows.
fn split_columns(line: &str) -> Vec<String> {
    let mut cols: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut space_run = 0usize;

    for ch in line.chars() {
        if ch == ' ' {
            space_run += 1;
            if space_run < 2 {
                current.push(ch);
            } else if space_run == 2 {
                // Second space — this is a column separator.
                // Remove the trailing single space we already added.
                if current.ends_with(' ') { current.pop(); }
                let trimmed = current.trim().to_string();
                if !trimmed.is_empty() { cols.push(trimmed); }
                current = String::new();
            }
            // More than 2 spaces: keep consuming without adding to current.
        } else {
            space_run = 0;
            current.push(ch);
        }
    }
    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() { cols.push(trimmed); }
    if cols.is_empty() && !line.trim().is_empty() {
        cols.push(line.trim().to_string());
    }
    cols
}

/// Merge multiple PDF files into a single output file.
#[tauri::command]
pub fn pdf_merge(paths: Vec<String>, dest: String) -> Result<(), String> {
    if paths.is_empty() {
        return Err("至少需要一个输入文件".to_string());
    }

    let mut merged = LopdfDoc::with_version("1.5");
    let mut all_page_ids: Vec<LopdfId> = Vec::new();

    // Reserve an ID for the combined Pages root we'll build at the end.
    merged.max_id += 1;
    let pages_id: LopdfId = (merged.max_id, 0);

    for path in &paths {
        let mut src = LopdfDoc::load(path)
            .map_err(|e| format!("无法加载 {path}: {e}"))?;

        // Shift all object IDs to avoid collisions with objects already in `merged`.
        src.renumber_objects_with(merged.max_id + 1);

        // Collect page object IDs in page-number order (1-based).
        let pages_map = src.get_pages();
        let mut sorted: Vec<(u32, LopdfId)> = pages_map.into_iter().collect();
        sorted.sort_by_key(|(k, _)| *k);
        let page_ids: Vec<LopdfId> = sorted.into_iter().map(|(_, id)| id).collect();

        // Re-parent every page to our combined Pages node.
        for &pid in &page_ids {
            if let Some(LopdfObj::Dictionary(dict)) = src.objects.get_mut(&pid) {
                dict.set("Parent", LopdfObj::Reference(pages_id));
            }
        }

        // Move objects into the merged document.
        for (id, obj) in src.objects {
            merged.objects.insert(id, obj);
        }
        merged.max_id = src.max_id;
        all_page_ids.extend(page_ids);
    }

    // Build the Pages root.
    let count = all_page_ids.len() as i64;
    merged.objects.insert(
        pages_id,
        LopdfObj::Dictionary(dictionary! {
            "Type"  => LopdfObj::Name(b"Pages".to_vec()),
            "Kids"  => LopdfObj::Array(
                           all_page_ids.iter().map(|id| LopdfObj::Reference(*id)).collect()),
            "Count" => LopdfObj::Integer(count),
        }),
    );

    // Build Catalog.
    merged.max_id += 1;
    let catalog_id: LopdfId = (merged.max_id, 0);
    merged.objects.insert(
        catalog_id,
        LopdfObj::Dictionary(dictionary! {
            "Type"  => LopdfObj::Name(b"Catalog".to_vec()),
            "Pages" => LopdfObj::Reference(pages_id),
        }),
    );

    merged.trailer.set("Root", LopdfObj::Reference(catalog_id));
    merged.trailer.set("Size", LopdfObj::Integer((merged.max_id + 1) as i64));

    merged.save(&dest).map_err(|e| e.to_string())?;
    Ok(())
}

/// Split a PDF into multiple files by page ranges (1-based, inclusive).
/// Returns the output file paths.
#[tauri::command]
pub fn pdf_split(
    path:     String,
    ranges:   Vec<[u32; 2]>,
    dest_dir: String,
) -> Result<Vec<String>, String> {
    use std::path::Path;

    let source     = LopdfDoc::load(&path).map_err(|e| e.to_string())?;
    let pages_map  = source.get_pages(); // 1-based
    let page_count = pages_map.len() as u32;

    let stem = Path::new(&path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output")
        .to_string();

    let mut output_paths = Vec::new();

    for range in &ranges {
        let start = range[0].max(1).min(page_count);
        let end   = range[1].max(start).min(page_count);

        let range_ids: Vec<LopdfId> = (start..=end)
            .filter_map(|n| pages_map.get(&n).copied())
            .collect();
        if range_ids.is_empty() { continue; }

        // Copy the full source object graph; unreferenced objects are benign.
        let mut doc = LopdfDoc::with_version("1.5");
        for (id, obj) in &source.objects {
            doc.objects.insert(*id, obj.clone());
        }
        doc.max_id = source.max_id;

        // New Pages node.
        doc.max_id += 1;
        let pages_id: LopdfId = (doc.max_id, 0);

        for &pid in &range_ids {
            if let Some(LopdfObj::Dictionary(dict)) = doc.objects.get_mut(&pid) {
                dict.set("Parent", LopdfObj::Reference(pages_id));
            }
        }
        doc.objects.insert(
            pages_id,
            LopdfObj::Dictionary(dictionary! {
                "Type"  => LopdfObj::Name(b"Pages".to_vec()),
                "Kids"  => LopdfObj::Array(
                               range_ids.iter().map(|id| LopdfObj::Reference(*id)).collect()),
                "Count" => LopdfObj::Integer(range_ids.len() as i64),
            }),
        );

        // New Catalog.
        doc.max_id += 1;
        let catalog_id: LopdfId = (doc.max_id, 0);
        doc.objects.insert(
            catalog_id,
            LopdfObj::Dictionary(dictionary! {
                "Type"  => LopdfObj::Name(b"Catalog".to_vec()),
                "Pages" => LopdfObj::Reference(pages_id),
            }),
        );

        doc.trailer.set("Root", LopdfObj::Reference(catalog_id));
        doc.trailer.set("Size", LopdfObj::Integer((doc.max_id + 1) as i64));

        let out_path = format!("{dest_dir}/{stem}_{start}_{end}.pdf");
        doc.save(&out_path).map_err(|e| e.to_string())?;
        output_paths.push(out_path);
    }

    Ok(output_paths)
}

/// Split a PDF into multiple files with a fixed number of pages each.
#[tauri::command]
pub fn pdf_split_by_count(
    path:           String,
    pages_per_file: u32,
    dest_dir:       String,
) -> Result<Vec<String>, String> {
    if pages_per_file == 0 {
        return Err("每个文件的页数必须大于 0".to_string());
    }
    let page_count = LopdfDoc::load(&path)
        .map_err(|e| e.to_string())?
        .get_pages()
        .len() as u32;

    let mut ranges: Vec<[u32; 2]> = Vec::new();
    let mut start = 1u32;
    while start <= page_count {
        let end = (start + pages_per_file - 1).min(page_count);
        ranges.push([start, end]);
        start = end + 1;
    }

    pdf_split(path, ranges, dest_dir)
}

/// Render every page of a PDF as individual image files (PNG or JPG).
/// Returns the list of output file paths.
#[tauri::command]
pub fn pdf_to_images(
    path:     String,
    scale:    f32,
    format:   String,  // "png" | "jpg"
    dest_dir: String,
) -> Result<Vec<String>, String> {
    use std::path::Path;

    let pdfium     = load_pdfium()?;
    let doc        = pdfium.load_pdf_from_file(&path, None).map_err(|e| e.to_string())?;
    let page_count = doc.pages().len();

    let stem = Path::new(&path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output")
        .to_string();

    let fmt   = format.to_lowercase();
    let is_png = fmt != "jpg" && fmt != "jpeg";
    let ext    = if is_png { "png" } else { "jpg" };

    let mut output_paths = Vec::new();

    for i in 0..page_count {
        let page          = doc.pages().get(i).map_err(|e| e.to_string())?;
        let (img, _, _)   = render_page_to_image(&page, scale)?;
        let out_path      = format!("{dest_dir}/{stem}_{:04}.{ext}", i + 1);

        if is_png {
            img.save_with_format(&out_path, image::ImageFormat::Png)
               .map_err(|e| e.to_string())?;
        } else {
            img.save_with_format(&out_path, image::ImageFormat::Jpeg)
               .map_err(|e| e.to_string())?;
        }
        output_paths.push(out_path);
    }

    Ok(output_paths)
}

/// Convert a PDF to DOCX or XLSX using native Rust crates.
///
/// • DOCX — `docx-rs`: one paragraph per text line per page, page-breaks between pages.
/// • XLSX — `rust_xlsxwriter`: one worksheet per page; lines become rows,
///          columns detected by 2+ consecutive spaces in the extracted text.
///
/// Quality note: PDF is a presentation format with no semantic structure.
/// Conversion quality is best for plain-text PDFs (reports, contracts);
/// complex multi-column or heavily formatted layouts will have reduced fidelity.
#[tauri::command]
pub fn pdf_to_office(
    path:     String,
    format:   String,  // "docx" | "xlsx"
    dest_dir: String,
) -> Result<String, String> {
    use std::path::Path;

    let stem = Path::new(&path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output")
        .to_string();

    let pdfium     = load_pdfium()?;
    let doc        = pdfium.load_pdf_from_file(&path, None).map_err(|e| e.to_string())?;
    let page_count = doc.pages().len();

    match format.to_lowercase().as_str() {
        "docx" => {
            use docx_rs::{Docx, Paragraph, Run, BreakType};

            let mut docx = Docx::new();
            let mut first_page = true;

            for i in 0..page_count {
                let page    = doc.pages().get(i).map_err(|e| e.to_string())?;
                let text    = page.text().map_err(|e| e.to_string())?;
                let content = text.all();

                if !first_page {
                    // Separate pages with an explicit page break.
                    docx = docx.add_paragraph(
                        Paragraph::new()
                            .add_run(Run::new().add_break(BreakType::Page))
                    );
                }
                first_page = false;

                for line in content.split('\n') {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        docx = docx.add_paragraph(Paragraph::new());
                    } else {
                        docx = docx.add_paragraph(
                            Paragraph::new()
                                .add_run(Run::new().add_text(trimmed))
                        );
                    }
                }
            }

            let out_path = Path::new(&dest_dir).join(format!("{stem}.docx"));
            let file = std::fs::File::create(&out_path).map_err(|e| e.to_string())?;
            docx.build().pack(file).map_err(|e| e.to_string())?;
            Ok(out_path.to_string_lossy().into_owned())
        }

        "xlsx" => {
            use rust_xlsxwriter::Workbook;

            let mut workbook = Workbook::new();

            for i in 0..page_count {
                let page    = doc.pages().get(i).map_err(|e| e.to_string())?;
                let text    = page.text().map_err(|e| e.to_string())?;
                let content = text.all();

                let ws = workbook.add_worksheet();
                ws.set_name(&format!("Page {}", i + 1)).map_err(|e| e.to_string())?;

                let mut excel_row: u32 = 0;
                for line in content.split('\n') {
                    let trimmed = line.trim();
                    if trimmed.is_empty() { continue; }

                    let cols = split_columns(trimmed);
                    for (col_idx, cell) in cols.iter().enumerate() {
                        if !cell.is_empty() {
                            ws.write_string(excel_row, col_idx as u16, cell.as_str())
                                .map_err(|e| e.to_string())?;
                        }
                    }
                    excel_row += 1;
                }
            }

            let out_path = Path::new(&dest_dir).join(format!("{stem}.xlsx"));
            workbook.save(&out_path).map_err(|e| e.to_string())?;
            Ok(out_path.to_string_lossy().into_owned())
        }

        other => Err(format!("不支持的格式: {other}，请选择 docx 或 xlsx"))
    }
}
