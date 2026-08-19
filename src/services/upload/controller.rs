use crate::{
    databases::database::Storage,
    services::upload::{
        schema::{FinalizeP, PrepareP},
        service::{UploadService, sanitize_download_filename},
    },
    utils::jwt::Claims,
    utils::response::{ErrorBody, Body},
};
use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::http::header::{ContentDisposition, DispositionParam, DispositionType};
use actix_web::http::StatusCode;
use actix_web::{HttpMessage, HttpRequest, HttpResponse, Result, web};
use futures::StreamExt;
use std::path::PathBuf;
use std::sync::Arc;

pub struct UploadController;

impl UploadController {
    pub async fn prepare(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<PrepareP>,
    ) -> Result<HttpResponse> {
        tracing::debug!(?req, "收到初始化上传请求");

        let Some(claims) = http.extensions().get::<Claims>().cloned() else {
            return ErrorBody::unauthorized("用户未登录").transform();
        };

        match UploadService::prepare(&db, req.into_inner(), Some(claims.sub)).await {
            Ok(response) => {
                tracing::info!(?response, "初始化上传成功");
                Body::success(response, "初始化上传成功").transform()
            }
            Err(err) => {
                tracing::error!(error = %err, "初始化上传失败");
                map_upload_err(err).transform()
            }
        }
    }

    pub async fn chunk(
        db: web::Data<Arc<Storage>>,
        mut payload: Multipart,
    ) -> Result<HttpResponse> {
        let mut id = String::new();
        let mut index: Option<u32> = None;
        let mut hash = String::new();
        let mut data = Vec::new();

        while let Some(fields) = payload.next().await {
            let mut field = match fields {
                Ok(field) => field,
                Err(err) => {
                    return ErrorBody::bad_request(format!("读取 multipart 字段失败: {err}"))
                        .transform();
                }
            };

            let field_name = match field.name() {
                Some(name) => name.to_string(),
                None => {
                    return ErrorBody::bad_request("缺少字段名").transform();
                }
            };

            match field_name.as_str() {
                "id" => match Self::extract_field(&mut field).await {
                    Ok(value) => id = value,
                    Err(err_msg) => {
                        return ErrorBody::bad_request(format!("读取 id 字段失败: {err_msg}"))
                            .transform();
                    }
                },
                "index" => match Self::extract_field(&mut field).await {
                    Ok(index_str) => match index_str.parse::<u32>() {
                        Ok(idx) => index = Some(idx),
                        Err(_) => {
                            return ErrorBody::bad_request("分片索引格式无效").transform();
                        }
                    },
                    Err(err_msg) => {
                        return ErrorBody::bad_request(format!(
                            "读取 index 字段失败: {err_msg}"
                        ))
                        .transform();
                    }
                },
                "chunk" => match Self::extract_binary_field(&mut field).await {
                    Ok(bytes) => data = bytes,
                    Err(err_msg) => {
                        return ErrorBody::bad_request(format!(
                            "读取 chunk 字段失败: {err_msg}"
                        ))
                        .transform();
                    }
                },
                "hash" => match Self::extract_field(&mut field).await {
                    Ok(value) => hash = value,
                    Err(err_msg) => {
                        return ErrorBody::bad_request(format!("读取 hash 字段失败: {err_msg}"))
                            .transform();
                    }
                },
                _ => {
                    if let Err(err_msg) = Self::skip_field(&mut field).await {
                        return ErrorBody::bad_request(format!(
                            "跳过未知字段失败: {err_msg}"
                        ))
                        .transform();
                    }
                }
            }
        }

        if id.is_empty() {
            return ErrorBody::bad_request("缺少 id 参数").transform();
        }

        let Some(index) = index else {
            return ErrorBody::bad_request("缺少 index 参数").transform();
        };

        if hash.is_empty() {
            return ErrorBody::bad_request("缺少 hash 参数").transform();
        }

        if data.is_empty() {
            return ErrorBody::bad_request("缺少 chunk 数据").transform();
        }

        match UploadService::chunk(&db, &id, index, data, &hash).await {
            Ok(response) => Body::success(response, "分片上传成功").transform(),
            Err(err) => map_upload_err(err).transform(),
        }
    }

    pub async fn finalize(
        db: web::Data<Arc<Storage>>,
        req: web::Json<FinalizeP>,
    ) -> Result<HttpResponse> {
        tracing::debug!(?req, "收到完成上传请求");

        match UploadService::finalize(&db, &req.id).await {
            Ok(response) => {
                tracing::info!(?response, "完成上传成功");
                Body::success(response, "完成上传成功").transform()
            }
            Err(err) => {
                tracing::error!(error = %err, "完成上传失败");
                map_upload_err(err).transform()
            }
        }
    }

    pub async fn progress(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();

        match UploadService::progress(&db, &id).await {
            Ok(response) => Body::success(response, "获取上传进度成功").transform(),
            Err(err) => map_upload_err(err).transform(),
        }
    }

    pub async fn cancel(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let id = path.into_inner();

        match UploadService::cancel(&db, &id).await {
            Ok(()) => Body::message_only("上传已取消").transform(),
            Err(err) => map_upload_err(err).transform(),
        }
    }

    pub async fn serve_file(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
        req: HttpRequest,
    ) -> Result<HttpResponse> {
        let hash = path.into_inner();

        match UploadService::find_file_by_hash(&db, &hash).await {
            Ok(Some(asset)) => {
                if let Some(storage_path) = asset.path {
                    let file_path = PathBuf::from(&storage_path);

                    if file_path.exists() {
                        match NamedFile::open(&file_path) {
                            Ok(named_file) => {
                                let filename = sanitize_download_filename(&asset.name);
                                let named_file =
                                    named_file.set_content_disposition(ContentDisposition {
                                        disposition: DispositionType::Attachment,
                                        parameters: vec![DispositionParam::Filename(filename)],
                                    });
                                Ok(named_file.into_response(&req))
                            }
                            Err(_) => {
                                ErrorBody::internal_error("读取文件失败").transform()
                            }
                        }
                    } else {
                        ErrorBody::not_found("磁盘上找不到文件").transform()
                    }
                } else {
                    ErrorBody::not_found("未找到文件存储路径").transform()
                }
            }
            Ok(None) => ErrorBody::not_found("文件不存在").transform(),
            Err(err) => map_upload_err(err).transform(),
        }
    }

    async fn extract_field(field: &mut actix_multipart::Field) -> Result<String, String> {
        let mut data = Vec::new();
        while let Some(bytes_result) = field.next().await {
            let bytes = match bytes_result {
                Ok(bytes) => bytes,
                Err(err) => {
                    return Err(format!("读取文本字段失败: {err}"));
                }
            };
            data.extend_from_slice(&bytes);
        }

        String::from_utf8(data).map_err(|_| "文本字段 UTF-8 编码无效".to_string())
    }

    async fn extract_binary_field(field: &mut actix_multipart::Field) -> Result<Vec<u8>, String> {
        let mut data = Vec::new();
        while let Some(bytes_result) = field.next().await {
            let bytes = match bytes_result {
                Ok(bytes) => bytes,
                Err(err) => {
                    return Err(format!("读取二进制字段失败: {err}"));
                }
            };
            data.extend_from_slice(&bytes);
        }
        Ok(data)
    }

    async fn skip_field(field: &mut actix_multipart::Field) -> Result<(), String> {
        while let Some(bytes_result) = field.next().await {
            if let Err(err) = bytes_result {
                return Err(format!("跳过字段失败: {err}"));
            }
        }
        Ok(())
    }
}

fn map_upload_err(err: actix_web::Error) -> ErrorBody {
    match err.as_response_error().status_code() {
        StatusCode::NOT_FOUND => ErrorBody::not_found(err.to_string()),
        StatusCode::INTERNAL_SERVER_ERROR => ErrorBody::internal_error(err.to_string()),
        _ => ErrorBody::bad_request(err.to_string()),
    }
}
