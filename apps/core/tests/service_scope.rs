//! 服务身份出站面的端到端验证（P6a）。
//!
//! 这是 core 第一次对外提供「机器调用机器」的接口：受信服务进程（当前只有 ai-worker）用
//! 共享令牌换一枚**带作用域**的短期令牌，再拿这枚令牌把嵌入调用打回 core——出网与计量
//! 都留在 core 这一侧，服务进程自己不需要供应商密钥。
//!
//! 需要独立测试库（库名必须含 `test`，避免误伤开发库）与一个真 Redis：
//!
//! ```text
//! TEST_DATABASE_URL=postgres://user:pw@127.0.0.1:5432/i_thinking_test \
//! TEST_REDIS_URL=redis://127.0.0.1:6379/9 \
//!   cargo test --test service_scope
//! ```
//!
//! 任一环境变量缺失即整体跳过。Elasticsearch **不需要**：用量索引写在 best-effort 分支里
//! （失败只留日志），这里把它指向本地桩，断言只盯 Postgres 与 Redis 上的记账。
//!
//! 覆盖的都是用户面测不到、而这条路径上真会出事的地方：两道请求头不能互换、共享密钥留空
//! 即整面关闭、令牌自带的租户/模型作用域无法被请求体放大、以及服务调用的用量必须和用户
//! 调用走同一套配额与审计（否则「gateway 是唯一出网点」这句话就漏在服务调用上）。

mod support;

use std::sync::{Arc, LazyLock};
use std::time::Duration;

use actix_web::{App, test, web};
use migration::MigratorTrait;
use sea_orm::{
    ConnectOptions, ConnectionTrait, Database, DatabaseBackend, DatabaseConnection, Statement,
};
use serde_json::{Value, json};
use service::clients::elasticsearch::EsClient;
use service::clients::redis::RedisPool;
use service::configures::configure::{Configure, SERVICE_TOKEN_MAX_TTL_SECS};
use service::databases::database::Storage;
use service::databases::scope::PLATFORM_ROLE;
use service::guards::service::{INTERNAL_TOKEN_HEADER, SERVICE_ACTOR_ID, SERVICE_TOKEN_HEADER};
use service::oas::paths;
use service::services::gateway::module::GatewayModule;
use service::services::gateway::quota;
use service::services::gateway::service_token;
use service::utils::code::{auth, external, request as request_codes, resource, system};
use support::{StubHttp, StubResponse, bypass_proxy_for_local_stubs, test_database_url};
use tokio::sync::Mutex;
use uuid::Uuid;

/// 隔离断言必须运行在非属主角色下：表属主默认绕过策略（迁移已 FORCE）。
const APP_ROLE: &str = "core_app_test";

/// 服务进程侧的共享密钥（请求头 `X-Internal-Token`）。
const INTERNAL_TOKEN: &str = "test-internal-token-at-least-32-chars";

/// core 侧签发服务令牌的密钥（`gateway.serviceTokenSecret`）。
const SERVICE_SECRET: &str = "test-service-token-secret-at-least-32";

/// 另一把密钥：用来伪造一枚签名对不上的令牌。
const OTHER_SECRET: &str = "some-other-secret-at-least-32-chars-long";

/// 配置里的默认令牌有效期（秒），用于断言「未指定 ttl 时按配置来」。
const SERVICE_TOKEN_TTL_SECS: u64 = 300;

/// 上游在 `usage` 里报的 token 数：用来核对记账落的是上游报的数而不是我们猜的数。
const TOTAL_TOKENS: i64 = 11;

/// 每个用例都要 `fresh` 整个库，因此必须串行。
static DB_LOCK: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

/// 请求 `/service/*` 需要的四件套（与 handler 上的 `web::Data<Arc<_>>` 一一对应）。
struct Shared {
    storage: Arc<Storage>,
    redis: Arc<RedisPool>,
    es: Arc<EsClient>,
    config: Arc<Configure>,
}

struct Fixture {
    /// 超级用户连接：种数据、按「不受作用域限制」的口径核对真实行。
    admin: DatabaseConnection,
    shared: Shared,
    tenant_a: Uuid,
    tenant_b: Uuid,
    /// 甲租户私有供应商（出站地址指向上游桩）。
    provider_a: Uuid,
    /// 声明了 `embeddings` 能力的甲租户私有模型。
    model_embed: Uuid,
    model_embed_name: String,
    /// 未声明嵌入能力的甲租户私有模型（用来验证能力闸门）。
    model_plain: Uuid,
    model_plain_name: String,
    /// 乙租户私有模型（用来验证跨租户不可见）。
    model_b: Uuid,
    model_b_name: String,
    /// Elasticsearch 桩：只为让 `EsClient::new` 的 `ping` 有个应答。
    _es_stub: StubHttp,
}

/// 只挂网关模块的最小 App：`/api/v1` 前缀与生产一致，中间件与鉴权不参与断言。
///
/// 写成宏而不是函数，是为了让 `App` 的类型（`ServiceFactory` 的一长串泛型参数）留在调用点
/// 推断——与 `service::bootstrap_app!` 同一个理由。
macro_rules! build_app {
    ($shared:expr) => {
        test::init_service(
            App::new()
                .app_data(web::Data::new(Arc::clone(&$shared.storage)))
                .app_data(web::Data::new(Arc::clone(&$shared.redis)))
                .app_data(web::Data::new(Arc::clone(&$shared.es)))
                .app_data(web::Data::new(Arc::clone(&$shared.config)))
                .service(web::scope("/api/v1").configure(GatewayModule::configure)),
        )
        .await
    };
}

/// 把测试库 URI 的账号换成应用角色，模拟真实部署下的连接身份（非属主、无 BYPASSRLS）。
fn app_uri(uri: &str) -> String {
    let (scheme, rest) = uri
        .split_once("://")
        .expect("TEST_DATABASE_URL 需要带 scheme");
    let (_, host) = rest
        .rsplit_once('@')
        .expect("TEST_DATABASE_URL 需要带账号信息");

    format!("{scheme}://{APP_ROLE}:{APP_ROLE}@{host}")
}

fn database_of(uri: &str) -> String {
    let tail = uri.rsplit('/').next().unwrap_or_default();

    tail.split('?').next().unwrap_or_default().to_owned()
}

/// 配额计数落在真 Redis 上（不是内存假实现），所以必须显式配置，缺失即跳过。
fn test_redis_url() -> Option<String> {
    let uri = std::env::var("TEST_REDIS_URL").ok()?.trim().to_owned();
    if uri.is_empty() { None } else { Some(uri) }
}

async fn connect(uri: &str, max_connections: u32) -> DatabaseConnection {
    let mut options = ConnectOptions::new(uri.to_owned());
    options
        .max_connections(max_connections)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(10))
        .acquire_timeout(Duration::from_secs(30))
        .sqlx_logging(false);
    Database::connect(options).await.expect("连接测试库失败")
}

async fn exec<C: ConnectionTrait>(conn: &C, sql: &str) {
    if let Err(err) = conn.execute_unprepared(sql).await {
        panic!("SQL 执行失败：{sql}\n{err}");
    }
}

/// 单个整数标量（`bigint` 口径）；查询失败或没结果都是断言失败。
async fn scalar<C: ConnectionTrait>(conn: &C, sql: &str) -> i64 {
    conn.query_one_raw(Statement::from_string(
        DatabaseBackend::Postgres,
        sql.to_owned(),
    ))
    .await
    .unwrap_or_else(|err| panic!("查询失败：{sql}\n{err}"))
    .unwrap_or_else(|| panic!("查询没有返回结果：{sql}"))
    .try_get_by_index::<i64>(0)
    .expect("结果不是 bigint")
}

/// 重建库、建应用角色、授权、种两个租户的目录；锁未持有时不得调用。
///
/// `service_secret`：`None` = 用默认测试密钥；`Some("")` = 模拟「未配置」（整面关闭）。
async fn setup(upstream_base_url: &str, service_secret: Option<&str>) -> Option<Fixture> {
    let uri = test_database_url()?;
    let redis_url = test_redis_url()?;
    // 必须早于任何 HTTP 客户端构造：本机系统代理会把发往 127.0.0.1 的请求也劫走
    bypass_proxy_for_local_stubs();

    let admin = connect(&uri, 2).await;
    migration::Migrator::fresh(&admin)
        .await
        .expect("重建测试库失败");

    let exists = scalar(
        &admin,
        &format!("SELECT count(*) FROM pg_roles WHERE rolname = '{APP_ROLE}'"),
    )
    .await;
    if exists == 0 {
        exec(
            &admin,
            &format!(
                "CREATE ROLE {APP_ROLE} LOGIN PASSWORD '{APP_ROLE}' \
                 NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE"
            ),
        )
        .await;
    }
    // 授权按对象生效，每次重建后都会丢，所以放在 fresh 之后
    for sql in [
        format!("GRANT USAGE ON SCHEMA public TO {APP_ROLE}"),
        format!(
            "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE}"
        ),
        format!("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE}"),
        format!("GRANT {PLATFORM_ROLE} TO {APP_ROLE}"),
    ] {
        exec(&admin, &sql).await;
    }

    // ES 桩：`ping` 与 best-effort 的索引写入都只要一个「接通了」的 JSON
    let es_stub = StubHttp::start(vec![StubResponse::json(
        200,
        json!({ "acknowledged": true }),
    )])
    .await;

    let mut config = Configure::default();
    config.ai_worker.token = INTERNAL_TOKEN.to_owned();
    config.gateway.service_token_secret = service_secret.unwrap_or(SERVICE_SECRET).to_owned();
    config.gateway.service_token_ttl_secs = SERVICE_TOKEN_TTL_SECS;
    // 用量索引是 best-effort 分支：指向桩，测试就不必拖一个真 Elasticsearch
    config.elasticsearch.url = es_stub.base_url();

    // 模型名带随机后缀：目录行的 `name` 没有库级唯一约束，串行用例之间不该互相踩到
    let suffix = Uuid::new_v4().simple().to_string();
    let suffix = &suffix[..8];

    let fixture = Fixture {
        admin,
        shared: Shared {
            storage: Arc::new(Storage::from_parts(
                connect(&app_uri(&uri), 2).await,
                database_of(&uri),
            )),
            redis: Arc::new(
                RedisPool::new(&redis_url, 4)
                    .await
                    .expect("连接测试 Redis 失败"),
            ),
            es: Arc::new(
                EsClient::new(&config)
                    .await
                    .expect("装配测试 Elasticsearch 客户端失败"),
            ),
            config: Arc::new(config),
        },
        tenant_a: Uuid::new_v4(),
        tenant_b: Uuid::new_v4(),
        provider_a: Uuid::new_v4(),
        model_embed: Uuid::new_v4(),
        model_embed_name: format!("svc-embed-{suffix}"),
        model_plain: Uuid::new_v4(),
        model_plain_name: format!("svc-plain-{suffix}"),
        model_b: Uuid::new_v4(),
        model_b_name: format!("svc-embed-b-{suffix}"),
        _es_stub: es_stub,
    };
    seed(&fixture, upstream_base_url).await;

    Some(fixture)
}

/// 两个租户各一条目录行；甲租户下三个模型：一个声明嵌入能力、一个没声明、一个是乙租户私有（同样声明了能力）。
async fn seed(fixture: &Fixture, upstream_base_url: &str) {
    let admin = &fixture.admin;

    for (tag, tenant) in [("a", fixture.tenant_a), ("b", fixture.tenant_b)] {
        exec(
            admin,
            &format!(
                r#"INSERT INTO tenant (id, name, slug, status, "type", "createdAt", "updatedAt")
                   VALUES ('{tenant}', 'Service {tag}', '{tenant}', 'ACTIVE', 'PERSONAL', now(), now())"#
            ),
        )
        .await;
    }

    // 私有供应商：甲租户的出站点指向上游桩，密钥留空（因此不该有 Authorization 头）
    exec(
        admin,
        &format!(
            r#"INSERT INTO gateway_provider (id, kind, name, "baseURL", "apiKeyEnc", status, "createdAt", "updatedAt", "tenantID")
               VALUES ('{}', 'openai', 'svc-provider-a', '{upstream_base_url}', '', 'ACTIVE', now(), now(), '{}')"#,
            fixture.provider_a, fixture.tenant_a
        ),
    )
    .await;

    // 乙租户的模型也声明了嵌入能力：跨租户 404 必须来自作用域，而不是「能力没声明」
    for (id, name, tenant, capabilities) in [
        (
            fixture.model_embed,
            &fixture.model_embed_name,
            fixture.tenant_a,
            json!({ "embeddings": true }),
        ),
        (
            fixture.model_plain,
            &fixture.model_plain_name,
            fixture.tenant_a,
            json!({ "chat": true }),
        ),
        (
            fixture.model_b,
            &fixture.model_b_name,
            fixture.tenant_b,
            json!({ "embeddings": true }),
        ),
    ] {
        exec(
            admin,
            &format!(
                r#"INSERT INTO gateway_model
                     (id, "providerID", name, label, enabled, capabilities, "createdAt", "updatedAt", "tenantID")
                   VALUES ('{id}', '{}', '{name}', 'Svc', true, '{capabilities}', now(), now(), '{tenant}')"#,
                fixture.provider_a
            ),
        )
        .await;
    }
}

/// 发一条请求，读出 `(HTTP 状态, JSON 体)`。
///
/// 与 [`build_app`] 同理写成宏：`init_service` 返回的服务的请求/响应类型不可命名，留在调用点推断才写得出来。
/// 展开成 `async` 块，调用处照常 `.await`。
macro_rules! call {
    ($app:expr, $request:expr $(,)?) => {
        async {
            let response = test::call_service(&$app, $request.to_request()).await;
            let status = response.status().as_u16();
            let body = test::read_body(response).await;

            (
                status,
                serde_json::from_slice::<Value>(&body).unwrap_or(Value::Null),
            )
        }
    };
}

fn token_request(tenant: Uuid, model: &str) -> test::TestRequest {
    test::TestRequest::post()
        .uri(paths::SERVICE_TOKEN)
        .insert_header((INTERNAL_TOKEN_HEADER, INTERNAL_TOKEN))
        .set_json(json!({ "tenantID": tenant.to_string(), "model": model }))
}

fn token_request_with_ttl(tenant: Uuid, model: &str, ttl_secs: u64) -> test::TestRequest {
    test::TestRequest::post()
        .uri(paths::SERVICE_TOKEN)
        .insert_header((INTERNAL_TOKEN_HEADER, INTERNAL_TOKEN))
        .set_json(json!({
            "tenantID": tenant.to_string(),
            "model": model,
            "ttlSecs": ttl_secs,
        }))
}

fn embeddings_request(token: &str, body: Value) -> test::TestRequest {
    test::TestRequest::post()
        .uri(paths::SERVICE_EMBEDDINGS)
        .insert_header((SERVICE_TOKEN_HEADER, token))
        .set_json(body)
}

/// 上游在 `usage` 里报 [`TOTAL_TOKENS`] 个 token，并回一条可识别的向量。
fn upstream_body() -> Value {
    json!({
        "object": "list",
        "data": [{ "object": "embedding", "index": 0, "embedding": [0.5, 0.25] }],
        "model": "upstream-model",
        "usage": { "prompt_tokens": TOTAL_TOKENS, "total_tokens": TOTAL_TOKENS },
    })
}

/// 信封里的 `code`（错误码常量是 `i32`，JSON 里读出来是 `i64`，这里转回来）。
fn error_code(body: &Value) -> i32 {
    body["code"]
        .as_i64()
        .and_then(|code| i32::try_from(code).ok())
        .unwrap_or_else(|| panic!("响应里没有数字 code：{body}"))
}

/// 用正确的内部令牌换一枚令牌（断言 200），返回响应体。
macro_rules! mint {
    ($app:expr, $tenant:expr, $model:expr $(,)?) => {
        async {
            let (status, body) = call!($app, token_request($tenant, $model)).await;
            assert_eq!(status, 200, "签发服务令牌失败：{body}");

            body
        }
    };
}

/// 取一枚指向甲租户自己模型的令牌（[`another_tenants_model_is_invisible`] 的反证用）。
macro_rules! token_for_own_model {
    ($fixture:expr, $app:expr $(,)?) => {
        async {
            let body = mint!($app, $fixture.tenant_a, &$fixture.model_embed_name).await;

            body["token"].as_str().expect("响应缺少 token").to_owned()
        }
    };
}

/// 令牌里的作用域就是 core 认定的作用域：验签一遍再断言，而不是只信响应字段。
fn claims_of(body: &Value) -> service_token::ServiceClaims {
    let token = body["token"].as_str().expect("响应缺少 token");

    service_token::verify(SERVICE_SECRET, token).expect("刚签发的令牌应当可验签")
}

#[actix_web::test]
async fn internal_token_is_required_and_not_interchangeable() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(200, upstream_body())]).await;
    let Some(fixture) = setup(&upstream.base_url(), None).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    // 不带共享密钥：401（不能说「body 合法就放过」）
    let (status, body) = call!(
        &app,
        test::TestRequest::post()
            .uri(paths::SERVICE_TOKEN)
            .set_json(json!({
                "tenantID": fixture.tenant_a.to_string(),
                "model": fixture.model_embed_name,
            })),
    )
    .await;
    assert_eq!(status, 401);
    assert_eq!(error_code(&body), auth::INVALID_CREDENTIALS);

    // 共享密钥写错：同样 401（不能退化成「有这个头就行」）
    let (status, _) = call!(
        &app,
        token_request(fixture.tenant_a, &fixture.model_embed_name)
            .insert_header((INTERNAL_TOKEN_HEADER, "wrong-internal-token")),
    )
    .await;
    assert_eq!(status, 401);

    // 拿**合法的服务令牌**冒充内部令牌：两道头对应两种信任，不能互换
    let (minted, _) =
        service_token::mint(SERVICE_SECRET, &fixture.tenant_a.to_string(), "m", 60).unwrap();
    let (status, _) = call!(
        &app,
        test::TestRequest::post()
            .uri(paths::SERVICE_TOKEN)
            .insert_header((INTERNAL_TOKEN_HEADER, minted.as_str()))
            .set_json(json!({
                "tenantID": fixture.tenant_a.to_string(),
                "model": fixture.model_embed_name,
            })),
    )
    .await;
    assert_eq!(status, 401);

    // 反过来：服务令牌放在 X-Service-Token 上换令牌也没用（守卫只认 X-Internal-Token）
    let (status, _) = call!(
        &app,
        test::TestRequest::post()
            .uri(paths::SERVICE_TOKEN)
            .insert_header((SERVICE_TOKEN_HEADER, minted.as_str()))
            .set_json(json!({
                "tenantID": fixture.tenant_a.to_string(),
                "model": fixture.model_embed_name,
            })),
    )
    .await;
    assert_eq!(status, 401);

    assert!(
        upstream.requests().is_empty(),
        "签发阶段不该触网：{:#?}",
        upstream.requests()
    );
}

#[actix_web::test]
async fn token_issuance_checks_tenant_not_model() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(200, upstream_body())]).await;
    let Some(fixture) = setup(&upstream.base_url(), None).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    // 未知租户：404（否则等于给任意租户发令牌）
    let (status, body) = call!(
        &app,
        token_request(Uuid::new_v4(), &fixture.model_embed_name),
    )
    .await;
    assert_eq!(status, 404);
    assert_eq!(error_code(&body), resource::NOT_FOUND);

    // 租户 ID 不是 UUID：400，且不能落到「查不到」的 404 上
    let (status, body) = call!(
        &app,
        test::TestRequest::post()
            .uri(paths::SERVICE_TOKEN)
            .insert_header((INTERNAL_TOKEN_HEADER, INTERNAL_TOKEN))
            .set_json(json!({ "tenantID": "not-a-uuid", "model": "m" })),
    )
    .await;
    assert_eq!(status, 400);
    assert_eq!(error_code(&body), request_codes::INVALID_PARAMETER_VALUE);

    // model 为空：400
    let (status, _) = call!(
        &app,
        test::TestRequest::post()
            .uri(paths::SERVICE_TOKEN)
            .insert_header((INTERNAL_TOKEN_HEADER, INTERNAL_TOKEN))
            .set_json(json!({
                "tenantID": fixture.tenant_a.to_string(),
                "model": "  ",
            })),
    )
    .await;
    assert_eq!(status, 400);

    // 模型是否存在/是否可用**不在这里判定**：令牌段只认租户，判定留给真正出站的那一次
    let (status, _) = call!(
        &app,
        token_request(fixture.tenant_a, "no-such-model-at-all"),
    )
    .await;
    assert_eq!(status, 200);

    assert!(upstream.requests().is_empty());
}

#[actix_web::test]
async fn token_carries_scope_and_clamps_ttl() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(200, upstream_body())]).await;
    let Some(fixture) = setup(&upstream.base_url(), None).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    // 缺省 TTL 来自配置
    let body = mint!(&app, fixture.tenant_a, &fixture.model_embed_name).await;
    assert_eq!(body["tokenType"], json!("service"));
    assert_eq!(body["model"], json!(fixture.model_embed_name));
    assert_eq!(body["tenantID"], json!(fixture.tenant_a.to_string()));

    let claims = claims_of(&body);
    assert_eq!(claims.sub, service_token::SUBJECT);
    assert_eq!(claims.aud, service_token::AUDIENCE);
    assert_eq!(claims.model, fixture.model_embed_name);
    assert_eq!(claims.tenant_id, fixture.tenant_a.to_string());
    assert_eq!(body["expiresAt"], json!(claims.exp));
    assert_eq!(claims.exp - claims.iat, SERVICE_TOKEN_TTL_SECS as i64);

    // 想要更长的有效期会被压到上限：调用方不能自己把窗口拉长
    let (status, body) = call!(
        &app,
        token_request_with_ttl(fixture.tenant_a, &fixture.model_embed_name, 99_999),
    )
    .await;
    assert_eq!(status, 200);
    assert_eq!(
        claims_of(&body).exp - claims_of(&body).iat,
        SERVICE_TOKEN_MAX_TTL_SECS as i64
    );

    // 0 秒被抬到 1 秒：不会签出一枚出生即过期的令牌
    let (status, body) = call!(
        &app,
        token_request_with_ttl(fixture.tenant_a, &fixture.model_embed_name, 0),
    )
    .await;
    assert_eq!(status, 200);
    let claims = claims_of(&body);
    assert_eq!(claims.exp - claims.iat, 1);

    assert!(upstream.requests().is_empty());
}

#[actix_web::test]
async fn empty_secret_disables_the_whole_surface() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(200, upstream_body())]).await;
    let Some(fixture) = setup(&upstream.base_url(), Some("")).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    // 没配密钥：签发端点 503，而不是「签出一个谁都能验不过的令牌」
    let (status, body) = call!(
        &app,
        token_request(fixture.tenant_a, &fixture.model_embed_name),
    )
    .await;
    assert_eq!(status, 503);
    assert_eq!(error_code(&body), system::SERVICE_UNAVAILABLE);

    // 出站面同样关闭：连随手编的令牌也是 503（说明是整面关，不只是关了签发）
    let (status, _) = call!(
        &app,
        embeddings_request("whatever-not-a-jwt", json!({ "input": ["hi"] })),
    )
    .await;
    assert_eq!(status, 503);

    assert!(upstream.requests().is_empty());
}

#[actix_web::test]
async fn forged_token_is_rejected_before_any_egress() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(200, upstream_body())]).await;
    let Some(fixture) = setup(&upstream.base_url(), None).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    // 密钥不同 → 签名对不上；形状不对 → 连解析都过不去。两者都必须是 401
    let (forged, _) = service_token::mint(
        OTHER_SECRET,
        &fixture.tenant_a.to_string(),
        &fixture.model_embed_name,
        300,
    )
    .unwrap();
    for token in [forged.as_str(), "not-a-jwt", ""] {
        let (status, body) =
            call!(&app, embeddings_request(token, json!({ "input": ["hi"] })),).await;
        assert_eq!(status, 401, "令牌 {token:?} 不该被接受");
        assert_eq!(error_code(&body), auth::INVALID_CREDENTIALS);
    }

    assert!(
        upstream.requests().is_empty(),
        "验签失败必须在出站之前发生：{:#?}",
        upstream.requests()
    );
}

#[actix_web::test]
async fn embeddings_forwards_and_meters() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(200, upstream_body())]).await;
    let Some(fixture) = setup(&upstream.base_url(), None).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    let body = mint!(&app, fixture.tenant_a, &fixture.model_embed_name).await;
    let token = body["token"].as_str().expect("响应缺少 token").to_owned();

    let (status, response_body) = call!(
        &app,
        embeddings_request(
            &token,
            json!({ "input": ["a", "b"], "dimensions": 8, "encoding_format": "float" }),
        ),
    )
    .await;
    assert_eq!(status, 200, "嵌入转发失败：{response_body}");
    // 上游 JSON 原样返回（裸结构，不套信封）：调用方按 OpenAI 形状解析即可
    assert_eq!(response_body["data"][0]["embedding"][0], json!(0.5));

    let request = upstream.only();
    assert_eq!(request.method, "POST");
    assert_eq!(request.path, "/embeddings");
    let sent = request.json();
    // 模型来自令牌作用域；`input`/`dimensions` 等由调用方透传
    assert_eq!(sent["model"], json!(fixture.model_embed_name));
    assert_eq!(sent["input"], json!(["a", "b"]));
    assert_eq!(sent["dimensions"], json!(8));
    assert_eq!(sent["encoding_format"], json!("float"));
    // 供应商没配密钥：不许凭空造 Authorization 头
    assert!(request.header("authorization").is_none());

    // 记账三件套缺一个，都意味着服务调用绕过了计量
    let usage_rows = scalar(
        &fixture.admin,
        &format!(
            r#"SELECT count(*) FROM gateway_usage
               WHERE "tenantID" = '{}' AND "modelID" = '{}' AND "providerID" = '{}'"#,
            fixture.tenant_a, fixture.model_embed, fixture.provider_a
        ),
    )
    .await;
    assert_eq!(usage_rows, 1);

    let tokens = scalar(
        &fixture.admin,
        &format!(
            r#"SELECT coalesce(sum("promptTokens"), 0)::bigint FROM gateway_usage WHERE "tenantID" = '{}'"#,
            fixture.tenant_a
        ),
    )
    .await;
    assert_eq!(tokens, TOTAL_TOKENS);

    let key = quota::quota_key("tenant", &fixture.tenant_a);
    assert_eq!(
        quota::used_tokens(&fixture.shared.redis, &key)
            .await
            .expect("读配额失败"),
        TOTAL_TOKENS,
        "服务调用的用量必须计入同一个日窗配额"
    );

    let audits = scalar(
        &fixture.admin,
        &format!(
            r#"SELECT count(*) FROM gateway_audit
               WHERE action = 'gateway.embeddings' AND actor = '{SERVICE_ACTOR_ID}'
                 AND "tenantID" = '{}'"#,
            fixture.tenant_a
        ),
    )
    .await;
    assert_eq!(audits, 1);
}

#[actix_web::test]
async fn body_model_cannot_widen_the_token_scope() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(200, upstream_body())]).await;
    let Some(fixture) = setup(&upstream.base_url(), None).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    let body = mint!(&app, fixture.tenant_a, &fixture.model_embed_name).await;
    let token = body["token"].as_str().expect("响应缺少 token").to_owned();

    // 请求体里换个模型：400，且一分钱都不出网
    let (status, response) = call!(
        &app,
        embeddings_request(&token, json!({ "model": "gpt-4o", "input": ["hi"] }),),
    )
    .await;
    assert_eq!(status, 400);
    assert_eq!(
        error_code(&response),
        request_codes::INVALID_PARAMETER_VALUE
    );
    assert!(upstream.requests().is_empty());

    // 写自己的模型名是合法的（不是「一律禁止 model 字段」）
    let (status, _) = call!(
        &app,
        embeddings_request(
            &token,
            json!({ "model": fixture.model_embed_name, "input": ["hi"] }),
        ),
    )
    .await;
    assert_eq!(status, 200);
    assert_eq!(upstream.requests().len(), 1);
}

#[actix_web::test]
async fn model_gate_is_enforced_at_egress() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(200, upstream_body())]).await;
    let Some(fixture) = setup(&upstream.base_url(), None).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    // 没声明 embeddings 能力：令牌签得出来，但出站时被挡下（400，不触网）
    let body = mint!(&app, fixture.tenant_a, &fixture.model_plain_name).await;
    let token = body["token"].as_str().expect("响应缺少 token").to_owned();
    let (status, response) =
        call!(&app, embeddings_request(&token, json!({ "input": ["hi"] })),).await;
    assert_eq!(status, 400);
    assert_eq!(
        error_code(&response),
        request_codes::INVALID_PARAMETER_VALUE
    );

    // 模型压根不存在：404
    let body = mint!(&app, fixture.tenant_a, "no-such-model-at-all").await;
    let token = body["token"].as_str().expect("响应缺少 token").to_owned();
    let (status, response) =
        call!(&app, embeddings_request(&token, json!({ "input": ["hi"] })),).await;
    assert_eq!(status, 404);
    assert_eq!(error_code(&response), resource::NOT_FOUND);

    assert!(upstream.requests().is_empty());
}

#[actix_web::test]
async fn failed_egress_is_not_metered() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(
        503,
        json!({ "error": { "message": "overloaded" } }),
    )])
    .await;
    let Some(fixture) = setup(&upstream.base_url(), None).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    let body = mint!(&app, fixture.tenant_a, &fixture.model_embed_name).await;
    let token = body["token"].as_str().expect("响应缺少 token").to_owned();

    let (status, response) =
        call!(&app, embeddings_request(&token, json!({ "input": ["hi"] })),).await;
    assert_eq!(status, 502, "上游故障应答：{response}");
    assert_eq!(error_code(&response), external::THIRD_PARTY_API_ERROR);

    // 上游没成功就不该有用量、配额与审计——否则重试会把额度白吃掉
    let usage_rows = scalar(
        &fixture.admin,
        &format!(
            r#"SELECT count(*) FROM gateway_usage WHERE "tenantID" = '{}'"#,
            fixture.tenant_a
        ),
    )
    .await;
    assert_eq!(usage_rows, 0);

    let key = quota::quota_key("tenant", &fixture.tenant_a);
    assert_eq!(
        quota::used_tokens(&fixture.shared.redis, &key)
            .await
            .expect("读配额失败"),
        0
    );

    let audits = scalar(
        &fixture.admin,
        &format!(
            r#"SELECT count(*) FROM gateway_audit WHERE "tenantID" = '{}'"#,
            fixture.tenant_a
        ),
    )
    .await;
    assert_eq!(audits, 0);
}

#[actix_web::test]
async fn another_tenants_model_is_invisible() {
    let _guard = DB_LOCK.lock().await;
    let upstream = StubHttp::start(vec![StubResponse::json(200, upstream_body())]).await;
    let Some(fixture) = setup(&upstream.base_url(), None).await else {
        return;
    };
    let app = build_app!(fixture.shared);

    // 甲租户的令牌 + 乙租户的私有模型：签发段不拦（它只认租户），出站段必须 404
    let body = mint!(&app, fixture.tenant_a, &fixture.model_b_name).await;
    let token = body["token"].as_str().expect("响应缺少 token").to_owned();
    let (status, response) =
        call!(&app, embeddings_request(&token, json!({ "input": ["hi"] })),).await;
    assert_eq!(status, 404);
    assert_eq!(error_code(&response), resource::NOT_FOUND);
    assert!(upstream.requests().is_empty());

    // 反证：同一个令牌换成甲租户自己的模型就能出站，说明 404 来自作用域而不是别的
    let (status, _) = call!(
        &app,
        embeddings_request(
            &token_for_own_model!(&fixture, &app).await,
            json!({ "input": ["hi"] })
        ),
    )
    .await;
    assert_eq!(status, 200);
    assert_eq!(upstream.requests().len(), 1);
}
