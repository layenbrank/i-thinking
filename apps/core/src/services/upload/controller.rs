use std::sync::Arc;

use actix_multipart::Multipart;
use actix_web::http::header::{
    CONTENT_LENGTH, ContentDisposition, DispositionParam, DispositionType,
};
use actix_web::{HttpRequest, HttpResponse, Result, web};

use crate::{
    databases::database::Storage,
    filters::exception::Exception,
    guards::session::Session,
    interceptors::envelope::Envelope,
    services::upload::{
        multipart,
        schema::{FilesP, FinalizeP, HashP, PrepareP},
        service::UploadService,
        storage::{self, safe_filename},
    },
};

pub struct UploadController;

impl UploadController {
    pub async fn prepare(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<PrepareP>,
    ) -> Result<HttpResponse> {
        let Some(session) = Session::of(&http) else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let user_id = session.user_id().to_string();

        match UploadService::prepare(&db, req.into_inner(), &user_id).await {
            Ok(response) => Envelope::success(response, "初始化上传成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn bind_hash(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        req: web::Json<HashP>,
    ) -> Result<HttpResponse> {
        let Some(session) = Session::of(&http) else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let user_id = session.user_id().to_string();

        match UploadService::bind_hash(&db, req.into_inner(), &user_id).await {
            Ok(response) => Envelope::success(response, "绑定文件哈希成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn chunk(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        payload: Multipart,
    ) -> Result<HttpResponse> {
        let Some(session) = Session::of(&http) else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let user_id = session.user_id().to_string();

        let form = match multipart::parse_chunk_form(payload).await {
            Ok(form) => form,
            Err(body) => return body.transform(),
        };

        match UploadService::chunk(&db, &form.id, form.index, form.data, &form.hash, &user_id).await
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
        let Some(session) = Session::of(&http) else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let user_id = session.user_id().to_string();

        match UploadService::finalize(&db, &req.id, &user_id).await {
            Ok(response) => Envelope::success(response, "完成上传成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn progress(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let Some(session) = Session::of(&http) else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let user_id = session.user_id().to_string();
        let id = path.into_inner();

        match UploadService::progress(&db, &id, &user_id).await {
            Ok(response) => Envelope::success(response, "获取上传进度成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    pub async fn cancel(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let Some(session) = Session::of(&http) else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let user_id = session.user_id().to_string();
        let id = path.into_inner();

        match UploadService::cancel(&db, &id, &user_id).await {
            Ok(()) => Envelope::message_only("上传已取消").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 本人已上传文件列表（分页）
    pub async fn toRead_files(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        query: web::Query<FilesP>,
    ) -> Result<HttpResponse> {
        let Some(session) = Session::of(&http) else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let user_id = session.user_id().to_string();

        match UploadService::toRead_files(&db, &user_id, query.into_inner()).await {
            Ok(response) => Envelope::success(response, "获取文件列表成功").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 按资产 id 流式下载（PUBLIC 可匿名；PRIVATE/RESTRICTED 需 JWT + ACL）
    pub async fn serve_asset(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let user_id = Session::of(&http).map(|session| session.user_id().to_string());
        let id = path.into_inner();

        match UploadService::find_owned_asset(&db, &id, user_id.as_deref()).await {
            Ok(asset) => Self::stream_asset(&db, asset, user_id.as_deref()).await,
            Err(err) => Exception::from(err).transform(),
        }
    }

    /// 按文件 hash 流式下载（仅本人 COMPLETED）
    pub async fn serve_file(
        db: web::Data<Arc<Storage>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let Some(session) = Session::of(&http) else {
            return Exception::unauthorized("用户未登录").transform();
        };
        let user_id = session.user_id().to_string();
        let hash = path.into_inner();

        match UploadService::find_file_for_download(&db, &hash, &user_id).await {
            Ok(Some(asset)) => Self::stream_asset(&db, asset, Some(&user_id)).await,
            Ok(None) => Exception::not_found("文件不存在").transform(),
            Err(err) => Exception::from(err).transform(),
        }
    }

    async fn stream_asset(
        db: &Arc<Storage>,
        asset: entity::asset::Model,
        user_id: Option<&str>,
    ) -> Result<HttpResponse> {
        let chunk_hashes = match UploadService::stream_hashes_for_asset(db, &asset, user_id).await {
            Ok(hashes) => hashes,
            Err(err) => return Exception::from(err).transform(),
        };

        let filename = safe_filename(&asset.name);
        let stream = storage::stream_cas_chunks(chunk_hashes);
        Ok(HttpResponse::Ok()
            .content_type(asset.mime.as_str())
            .insert_header((CONTENT_LENGTH, asset.size))
            .insert_header(ContentDisposition {
                disposition: DispositionType::Attachment,
                parameters: vec![DispositionParam::Filename(filename)],
            })
            .streaming(stream))
    }
}
