use crate::database::DataBase;
use crate::services::upload::schema::{FinalizeUploadRequest, UploadRequest};
use crate::services::upload::service::UploadService;
use crate::utils::response::ApiResponse;
use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::{HttpResponse, Result, web};
use futures::StreamExt;
use std::path::PathBuf;
use std::sync::Arc;

pub struct UploadController;

impl UploadController {
    pub async fn prepare(
        db: web::Data<Arc<DataBase>>,
        req: web::Json<UploadRequest>,
    ) -> Result<HttpResponse> {
        println!("收到初始化上传请求: {:?}", req);

        match UploadService::prepare(&db, req.into_inner(), None).await {
            Ok(response) => {
                println!("初始化上传成功: {:?}", response);
                ApiResponse::success(response, "初始化上传成功").transform()
            }
            Err(err) => {
                println!("初始化上传失败: {}", err);
                crate::utils::response::ApiErrorResponse::bad_request(err.to_string()).transform()
            }
        }
    }

    pub async fn chunk(
        db: web::Data<Arc<DataBase>>,
        mut payload: Multipart,
    ) -> Result<HttpResponse> {
        let mut upload_id = String::new();
        let mut chunk_index: Option<u32> = None; // 修复：使用 Option<u32>
        let mut chunk_hash = String::new();
        let mut chunk_data = Vec::new();

        while let Some(fields) = payload.next().await {
            let mut field = match fields {
                Ok(field) => field,
                Err(err) => {
                    let mut response = HttpResponse::BadRequest();

                    let msg = format!("Failed to read multipart field: {}", err);

                    let json = response.json(serde_json::json!({"error": msg}));

                    return Ok(json);
                }
            };

            let field_name = match field.name() {
                Some(name) => name.to_string(),
                None => {
                    let mut response = HttpResponse::BadRequest();

                    let msg = "Missing field name";

                    let json = response.json(serde_json::json!({
                      "error": msg
                    }));

                    return Ok(json);
                }
            };

            match field_name.as_str() {
                "upload_id" | "uploadId" => match Self::extract_field(&mut field).await {
                    Ok(value) => upload_id = value,
                    Err(err_msg) => {
                        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                            "error": format!("Failed to extract upload_id: {}", err_msg)
                        })));
                    }
                },
                "chunk_index" | "chunkIndex" => match Self::extract_field(&mut field).await {
                    Ok(index_str) => match index_str.parse::<u32>() {
                        Ok(idx) => chunk_index = Some(idx),
                        Err(_) => {
                            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                                "error": "Invalid chunk index format"
                            })));
                        }
                    },
                    Err(err_msg) => {
                        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                            "error": format!("Failed to extract chunk_index: {}", err_msg)
                        })));
                    }
                },
                "chunk_data" | "chunk" | "chunkData" => {
                    match Self::extract_binary_field(&mut field).await {
                        Ok(data) => chunk_data = data,
                        Err(err_msg) => {
                            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                                "error": format!("Failed to extract chunk_data: {}", err_msg)
                            })));
                        }
                    }
                }
                "chunk_hash" | "chunkHash" => match Self::extract_field(&mut field).await {
                    Ok(hash) => chunk_hash = hash,
                    Err(err_msg) => {
                        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                            "error": format!("Failed to extract chunk_hash: {}", err_msg)
                        })));
                    }
                },
                _ => {
                    // 跳过未知字段
                    if let Err(err_msg) = Self::skip_field(&mut field).await {
                        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                            "error": format!("Failed to skip field: {}", err_msg)
                        })));
                    }
                }
            }
        }

        // 验证必需字段
        if upload_id.is_empty() {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Missing upload_id"
            })));
        }

        let chunk_index = match chunk_index {
            Some(idx) => idx,
            None => {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "Missing chunk_index"
                })));
            }
        };

        if chunk_hash.is_empty() {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Missing chunk_hash"
            })));
        }

        if chunk_data.is_empty() {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Missing chunk_data"
            })));
        }

        // 调用服务层方法
        match UploadService::chunk(&db, &upload_id, chunk_index, chunk_data, &chunk_hash).await {
            Ok(response) => {
                ApiResponse::success(response, "chunk uploaded successfully").transform()
            }
            Err(err) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": err.to_string()
            }))),
        }
    }

    /// 完成上传
    pub async fn finalize(
        db: web::Data<Arc<DataBase>>,
        req: web::Json<FinalizeUploadRequest>,
    ) -> Result<HttpResponse> {
        println!("收到完成上传请求: {:?}", req);

        match UploadService::finalize(&db, &req.upload_id).await {
            Ok(response) => {
                println!("完成上传成功: {:?}", response);
                ApiResponse::success(response, "完成上传成功").transform()
            }
            Err(err) => {
                println!("完成上传失败: {}", err);
                Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "error": err.to_string()
                })))
            }
        }
    }

    /// 获取上传进度
    pub async fn progress(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let upload_id = path.into_inner();

        match UploadService::progress(&db, &upload_id).await {
            Ok(response) => Ok(HttpResponse::Ok().json(response)),
            Err(err) => Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": err.to_string()
            }))),
        }
    }

    /// 取消上传
    pub async fn cancel(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let upload_id = path.into_inner();

        match UploadService::cancel(&db, &upload_id).await {
            Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "message": "Upload cancelled successfully"
            }))),
            Err(err) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": err.to_string()
            }))),
        }
    }

    /// 文件访问 - 通过文件哈希访问
    pub async fn serve_file(
        db: web::Data<Arc<DataBase>>,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let file_hash = path.into_inner();

        match UploadService::find_file_by_hash(&db, &file_hash).await {
            Ok(Some(upload)) => {
                if let Some(storage_path) = upload.storage_path {
                    let file_path = PathBuf::from(&storage_path);

                    if file_path.exists() {
                        match NamedFile::open(&file_path) {
                            Ok(named_file) => {
                                // 使用 TestRequest 创建虚拟 HttpRequest
                                use actix_web::test::TestRequest;
                                let req = TestRequest::default().to_http_request();
                                let mut response = named_file.into_response(&req);

                                // 添加文件名到响应头
                                if let Some(header_value) =
                                    actix_web::http::header::HeaderValue::from_str(&format!(
                                        "attachment; filename=\"{}\"",
                                        upload.file_name
                                    ))
                                    .ok()
                                {
                                    response.headers_mut().insert(
                                        actix_web::http::header::CONTENT_DISPOSITION,
                                        header_value,
                                    );
                                }

                                Ok(response)
                            }
                            Err(_) => {
                                Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                                    "error": "Failed to read file"
                                })))
                            }
                        }
                    } else {
                        Ok(HttpResponse::NotFound().json(serde_json::json!({
                            "error": "File not found on disk"
                        })))
                    }
                } else {
                    Ok(HttpResponse::NotFound().json(serde_json::json!({
                        "error": "File storage path not found"
                    })))
                }
            }
            Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "File not found in database"
            }))),
            Err(err) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Database error: {}", err)
            }))),
        }
    }

    /// 提取文本字段
    async fn extract_field(field: &mut actix_multipart::Field) -> Result<String, String> {
        let mut data = Vec::new();
        while let Some(bytes_result) = field.next().await {
            let bytes = match bytes_result {
                Ok(bytes) => bytes,
                Err(err) => {
                    return Err(format!("Failed to read text field: {}", err));
                }
            };
            data.extend_from_slice(&bytes);
        }

        String::from_utf8(data).map_err(|_| "Invalid UTF-8 in text field".to_string())
    }

    /// 提取二进制字段
    async fn extract_binary_field(field: &mut actix_multipart::Field) -> Result<Vec<u8>, String> {
        let mut data = Vec::new();
        while let Some(bytes_result) = field.next().await {
            let bytes = match bytes_result {
                Ok(bytes) => bytes,
                Err(err) => {
                    return Err(format!("Failed to read binary field: {}", err));
                }
            };
            data.extend_from_slice(&bytes);
        }
        Ok(data)
    }

    /// 跳过字段
    async fn skip_field(field: &mut actix_multipart::Field) -> Result<(), String> {
        while let Some(bytes_result) = field.next().await {
            if let Err(err) = bytes_result {
                return Err(format!("Failed to skip field: {}", err));
            }
        }
        Ok(())
    }
}
