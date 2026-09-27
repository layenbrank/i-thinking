use durable::{DurableSettings, Runtime, RuntimeTuning, Store};
use service::{configures::configure::Configure, orchestrations, utils};

/// 可靠执行运行时（orchestrator）：领活、重放历史、执行活动。不监听端口。
///
/// 它只连编排库（独立 schema），不碰业务表，因此不需要 Redis / Elasticsearch。
/// 停机信号（Ctrl-C / SIGTERM）留出收尾时间：编排状态在存储里，收不完的实例下次启动接着跑。
#[tokio::main]
async fn main() {
    let configure = Configure::load().expect("Failed to load configuration");
    let durable_url = configure
        .require_durable_settings()
        .expect("durable 配置不完整（需要 postgres 连接串）");

    let _log_guard = utils::logger::init(&configure.logging).expect("Failed to initialize logger");

    tracing::info!(
        profile = %configure.profile,
        config_dir = %configure.config_dir.display(),
        schema = %configure.durable.schema,
        auto_migrate = configure.durable.auto_migrate,
        "orchestrator starting"
    );

    let settings = DurableSettings::new(
        durable_url,
        configure.durable.schema.clone(),
        configure.durable.auto_migrate,
    );
    let store = Store::connect(&settings)
        .await
        .expect("Failed to connect to the durable store");

    let registrations = orchestrations::registrations();
    let tuning = RuntimeTuning::new(
        configure.durable.orchestration_concurrency,
        configure.durable.worker_concurrency,
    );
    let runtime = Runtime::start(
        &store,
        registrations.activities,
        registrations.orchestrations,
        tuning,
    )
    .await
    .expect("Failed to start the durable runtime");

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(false);
    let signal = tokio::spawn(async move {
        if let Err(error) = tokio::signal::ctrl_c().await {
            tracing::error!(error = %error, "无法监听停机信号");
            return;
        }
        tracing::info!("收到停机信号：给在跑的活动留收尾时间");
        let _ = shutdown_tx.send(true);
    });

    let _ = shutdown_rx.changed().await;

    // 编排状态在存储里，收不完的实例下次启动接着跑；这里只给在跑的活动留收尾时间。
    runtime.shutdown(configure.durable.shutdown_grace_ms).await;
    signal.abort();
    tracing::info!("orchestrator 已停机");
}
