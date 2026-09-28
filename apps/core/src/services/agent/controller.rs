//! agent 接口层：每个 Handler 只做三件事——取会话、进入租户作用域、把结果交给信封。
//! 权限判定在领域层由 `authz` 完成，这里不自己比角色。
//!
//! 租户来自 `X-Tenant-ID` 而不是路径：这是既有的约定（见 `gateway`），agent 任务属于
//! 「哪个租户的知识」这件事由调用方在请求头里选定，本域**要求必填**——没有「账号级 agent」
//! 这种落脚点，缺了头就没有正确的作用域可进，与其猜一个不如直接 400。
//!
//! 起任务这条路径上「先提交、再起实例」的顺序不能反：提交把台账行钉死，之后才发网络调用
//! （理由见 `service.rs` 的顺序铁律）。

use std::sync::Arc;

use actix_web::{HttpRequest, HttpResponse, Result, web};
use identity::TenantId;

use crate::configures::configure::Configure;
use crate::databases::database::Storage;
use crate::filters::exception::Exception;
use crate::guards::session::Session;
use crate::guards::tenant::TenantCtx;
use crate::interceptors::envelope::Envelope;
use crate::services::agent::schema::TaskP;
use crate::services::agent::service::AgentService;
use crate::utils::code::request;

pub struct AgentController;

impl AgentController {
    /// 起任务：立刻返回一条 `RUNNING` 的台账记录，不阻塞等结果。
    ///
    /// 之所以是异步而不是「调到跑完再返回」：任务可能跑好几轮模型调用，同步等待会把一个
    /// HTTP 请求拖成几分钟，还把重试语义搞乱（客户端超时重发会起第二个任务）。
    pub async fn toWrite(
        db: web::Data<Arc<Storage>>,
        config: web::Data<Arc<Configure>>,
        durable: web::Data<Option<Arc<durable::Client>>>,
        http: HttpRequest,
        req: web::Json<TaskP>,
    ) -> Result<HttpResponse> {
        let session = session(&http)?;
        let ctx = enter(&db, &session, &http).await?;

        let prepared = match AgentService::prepare(&ctx, &config, req.into_inner()).await {
            Ok(prepared) => prepared,
            Err(err) => return err.transform(),
        };

        // 台账先落定；起实例是网络调用，不许在事务里发。
        ctx.commit().await?;

        match AgentService::launch(&db, durable.get_ref().as_ref(), prepared).await {
            Ok(task) => Envelope::write(task).transform(),
            Err(err) => err.transform(),
        }
    }

    /// 查任务：进度与结果都从这一处读。
    ///
    /// 还在跑时会顺带问一次编排的当前进度；问不到不影响返回——台账本身就是记录。
    pub async fn toRead(
        db: web::Data<Arc<Storage>>,
        durable: web::Data<Option<Arc<durable::Client>>>,
        http: HttpRequest,
        path: web::Path<String>,
    ) -> Result<HttpResponse> {
        let session = session(&http)?;
        let ctx = enter(&db, &session, &http).await?;

        // `ctx` 按值交给领域层：这条路径在发外部调用前要把只读事务还回去。
        match AgentService::read(&db, ctx, durable.get_ref().as_ref(), &path.into_inner()).await {
            Ok(task) => Envelope::success(task, "获取任务成功").transform(),
            Err(err) => err.transform(),
        }
    }
}

fn session(http: &HttpRequest) -> Result<Session, Exception> {
    Session::of(http).ok_or_else(|| Exception::unauthorized("用户未登录"))
}

/// 进入 `X-Tenant-ID` 指向的租户作用域：非成员在这里就被拒（403）。
async fn enter(
    db: &Storage,
    session: &Session,
    http: &HttpRequest,
) -> Result<TenantCtx, Exception> {
    TenantCtx::enter(db, session, tenant_of(http)?).await
}

/// 请求头里的租户。
///
/// 「没带」与「带了但格式不对」分开报：前者是调用方漏了参数，后者是写了错值，
/// 混成一句话会让人反复检查一个其实没写错的地方。
fn tenant_of(http: &HttpRequest) -> Result<TenantId, Exception> {
    let raw = http
        .headers()
        .get("X-Tenant-ID")
        .ok_or_else(|| Exception::custom(request::MISSING_PARAMETER, "缺少 X-Tenant-ID 请求头"))?;

    raw.to_str()
        .ok()
        .and_then(|value| value.trim().parse::<TenantId>().ok())
        .ok_or_else(|| Exception::custom(request::INVALID_HEADER, "X-Tenant-ID 格式无效"))
}
