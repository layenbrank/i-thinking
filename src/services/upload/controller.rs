use std::path::PathBuf;
use std::sync::Arc;

use actix_files::NamedFile;
use actix_multipart::Multipart;
use actix_web::http::header::{
    ContentDisposition, DispositionParam, DispositionType, CONTENT_LENGTH,
};
use actix_web::{HttpMessage, HttpRequest, HttpResponse, Result, web};

use crate::{
    databases::database::Storage,
    filters::exception::Exception,
    interceptors::envelope::Envelope,
    services::upload::{
        multipart,
        repository,
        schema::{FinalizeP, HashP, PrepareP},
        service::UploadService,
        storage::{self, safe_filename},
    },
    utils::jwt::Claims,
};

pub struct UploadController;

impl UploadController {
    pub async fn prepare(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<PrepareP>,
    ) -> Result<HttpResponse> {
        tracing::debug!(?req, "收到初始化上传请求");

        let Some(claims) = http.extensions().get::<Claims>().cloned() else {
            return Exception::unauthorized("用户未登录").transform();
        };

        match UploadService::prepare(&db, req.into_inner(), Some(claims.sub)).await {
            Ok(response) => {
                tracing::info!(?response, "初始化上传成功");
                Envelope::success(response, "初始化上传成功").transform()
            }
            Err(err) => {
                tracing::error!(error = %err, "初始化上传失败");
                Exception::from(err).transform()
            }
        }
    }

    pub async fn bind_hash(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<HashP>,
    ) -> Result<HttpResponse> {
        let Some(claims) = http.extensions().get::<Claims>().cloned() else {
            return Exception::unauthorized("用户未登录").transform();
        };

        match UploadService::bind_hash(&db, req.into_inner(), &claims.sub).await {
            Ok(response) => Envelope::success(response, "绑定文件哈希成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn chunk(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        payload: Multipart,
    ) -> Result<HttpResponse> {
        let Some(claims) = http.extensions().get::<Claims>().cloned() else {
            return Exception::unauthorized("用户未登录").transform();
        };

        let form = match multipart::parse_chunk_form(payload).await {
            Ok(form) => form,
            Err(body) => return body.transform(),
        };

        match UploadService::chunk(
            &db,
            &form.id,
            form.index,
            form.data,
            &form.hash,
            &claims.sub,
        )
        .await
        {
            Ok(response) => Envelope::success(response, "分片上传成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn finalize(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<FinalizeP>,
    ) -> Result<HttpResponse> {
        tracing::debug!(?req, "收到完成上传请求");

        let Some(claims) = http.extensions().get::<Claims>().cloned() else {
            return Exception::unauthorized("用户未登录").transform();
        };

        match UploadService::finalize(&db, &req.id, &claims.sub).await {
            Ok(response) => {
                tracing::info!(?response, "完成上传成功");
                Envelope::success(response, "完成上传成功").transform()
            }
            Err(err) => {
                tracing::error!(error = %err, "完成上传失败");
                Exception::from(err).transform()
            }
        }
    }

    pub async fn progress(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let Some(claims) = http.extensions().get::<Claims>().cloned() else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let id = path.into_inner();

        match UploadService::progress(&db, &id, &claims.sub).await {
            Ok(response) => Envelope::success(response, "获取上传进度成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn cancel(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let Some(claims) = http.extensions().get::<Claims>().cloned() else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let id = path.into_inner();

        match UploadService::cancel(&db, &id, &claims.sub).await {
            Ok(()) => Envelope::message_only("上传已取消").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn serve_file(
        db: web::Data<Arc<Storage>>,
        path: web::Path<String>,
        req: HttpRequest,
    ) -> Result<HttpResponse> {
        let Some(claims) = req.extensions().get::<Claims>().cloned() else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let hash = path.into_inner();

        match UploadService::find_file_for_download(&db, &hash, &claims.sub).await {
            Ok(Some(asset)) => {
                // 优先：CAS 分片流式拼接（无整文件落盘）
                if let Ok(chunk_hashes) = repository::ordered_chunk_hashes(&asset) {
                    if storage::ensure_cas_present(&chunk_hashes).await.is_ok() {
                        let filename = safe_filename(&asset.name);
                        let stream = storage::stream_cas_chunks(chunk_hashes);
                        return Ok(HttpResponse::Ok()
                            .content_type(asset.mime.as_str())
                            .insert_header((CONTENT_LENGTH, asset.size))
                            .insert_header(ContentDisposition {
                                disposition: DispositionType::Attachment,
                                parameters: vec![DispositionParam::Filename(filename)],
                            })
                            .streaming(stream));
                    }
                }

                // 兼容：旧版已合并的 uploads/ 文件
                if let Some(storage_path) = asset.path {
                    let file_path = PathBuf::from(&storage_path);
                    if file_path.exists() {
                        return match NamedFile::open(&file_path) {
                            Ok(named_file) => {
                                let filename = safe_filename(&asset.name);
                                let named_file =
                                    named_file.set_content_disposition(ContentDisposition {
                                        disposition: DispositionType::Attachment,
                                        parameters: vec![DispositionParam::Filename(filename)],
                                    });
                                Ok(named_file.into_response(&req))
                            }
                            Err(_) => Exception::internal_error("读取文件失败").transform(),
                        };
                    }
                }

                Exception::not_found("磁盘上找不到文件").transform()
            }
            Ok(None) => Exception::not_found("文件不存在").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }
}
