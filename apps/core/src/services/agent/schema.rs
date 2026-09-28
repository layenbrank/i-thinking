//! agent 任务的请求 / 响应契约。
//!
//! 台账行是出参的形状来源（`agent_task`），所以这里的字段名与列名一一对应——中间加一层
//! 「视图模型」只会多一个漂移点。

use serde::{Deserialize, Serialize};
use serde_json::Value;
use utoipa::ToSchema;

/// 起任务请求。
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TaskP {
    /// 任务目标，原样交给模型
    pub objective: String,
    /// 轮次上限；缺省用部署配置 `agent.max_steps`，**只能往小收，不能往大放**
    pub max_steps: Option<usize>,
    /// 工具白名单；缺省用部署配置 `agent.allowed_tools`，给了就必须是它的子集；**空数组合法且有意义**（不给工具，直接要结论）
    pub tools: Option<Vec<String>>,
}

/// 任务台账行。
///
/// 模型名不回给调用方选择，只在出参里如实反映「这一轮用的是哪个模型」。
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TaskR {
    pub id: String,
    #[serde(rename = "tenantID")]
    pub tenant_id: String,
    /// 发起人；服务身份触发时为 null
    #[serde(rename = "userID")]
    pub user_id: Option<String>,
    /// `RUNNING` / `SUCCEEDED` / `FAILED`
    pub status: String,
    pub objective: String,
    pub model: String,
    /// 轮次上限（本次任务实际生效的值，可能小于部署上限）
    pub max_steps: i32,
    /// 本次任务实际生效的工具白名单；空数组 = 全程不给工具
    pub allowed_tools: Vec<String>,
    /// 已完成的轮次；还在跑时由编排的进度汇报推出
    pub steps: i32,
    /// 编排自报的进度（形如 `step:2/6 tools:2`）；取不到时为 null
    pub progress: Option<String>,
    /// 是否得出了结论；仅有结论的成功任务有值（`false` = 轮次预算耗尽而停）
    pub finished: Option<bool>,
    /// 编排输出快照；成功后才有
    #[schema(value_type = Object, nullable = true)]
    pub result: Option<Value>,
    /// 失败原因（已分类的运维文案）；失败后才有
    pub error: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}
