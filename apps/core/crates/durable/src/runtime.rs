use std::sync::Arc;

use duroxide::runtime::{Runtime as DuroxideRuntime, RuntimeOptions};

use crate::{Activities, DurableError, Orchestrations, Store};

/// 运行时并发档位。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RuntimeTuning {
    /// 同时推进的编排轮次数（每个轮次处理一个实例的一步）。
    pub orchestration_concurrency: usize,
    /// 同时执行的活动数（真正干活的并行度）。
    pub worker_concurrency: usize,
}

impl RuntimeTuning {
    pub fn new(orchestration_concurrency: usize, worker_concurrency: usize) -> Self {
        Self {
            orchestration_concurrency: orchestration_concurrency.max(1),
            worker_concurrency: worker_concurrency.max(1),
        }
    }
}

impl Default for RuntimeTuning {
    /// 与实现本体的默认值一致：编排 2、活动 2。够用且不抢资源，按需再调。
    fn default() -> Self {
        Self::new(2, 2)
    }
}

/// 可靠执行运行时：从存储里领活、重放历史、执行活动、写回结果。
///
/// 一个部署单元只应该有一个进程跑运行时（本仓库里是 `orchestrator` 二进制）：多个进程
/// 同时跑会把同一个实例的轮次抢来抢去（实现本体用锁保证正确性，但并行推进没有意义）。
/// 起实例（[`crate::Client`]）不受此限，任何进程都能起。
///
/// 进程重启后无需任何补偿动作：未完成的实例与待执行的活动都在存储里，运行时会接着跑。
pub struct Runtime {
    inner: Arc<DuroxideRuntime>,
}

impl Runtime {
    /// 起运行时并注册处理器。
    ///
    /// 处理器注册表有错（重名、保留名字）时返回 [`DurableError::Registration`]，不带病运行。
    pub async fn start(
        store: &Store,
        activities: Activities,
        orchestrations: Orchestrations,
        tuning: RuntimeTuning,
    ) -> Result<Self, DurableError> {
        let activities = activities.build()?;
        let orchestrations = orchestrations.build()?;

        let options = RuntimeOptions {
            orchestration_concurrency: tuning.orchestration_concurrency.max(1),
            worker_concurrency: tuning.worker_concurrency.max(1),
            ..Default::default()
        };

        let inner = DuroxideRuntime::start_with_options(
            store.provider_ref(),
            activities,
            orchestrations,
            options,
        )
        .await;

        Ok(Self { inner })
    }

    /// 停机：给在跑的活动 `grace_ms` 毫秒收尾（编排状态在存储里，收不完也不丢），
    /// 超时后强制中止。`grace_ms = 0` 表示立即中止——只有测试模拟「崩溃」时才这么用。
    pub async fn shutdown(&self, grace_ms: u64) {
        Arc::clone(&self.inner).shutdown(Some(grace_ms)).await;
    }
}

impl std::fmt::Debug for Runtime {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Runtime")
    }
}
