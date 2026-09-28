//! 台账读写：建行、读行、终态写回。
//!
//! 三个函数都要求调用方**已经在正确的作用域里**（`agent_task` 已启用 RLS），本模块不写
//! `"tenantID" = ?` 条件：租户判定只有一处（策略），两处判定必然有一天不一致。

use chrono::Utc;
use entity::agent_task;
use sea_orm::{ActiveModelTrait, ConnectionTrait, EntityTrait, IntoActiveModel, QuerySelect, Set};
use serde_json::Value;
use uuid::Uuid;

use crate::{Error, NewTask, TaskOutcome, TaskState};

/// 建行：`status = RUNNING`、轮次 0、无结果。
///
/// 先落台账再起编排实例：反过来的话，进程在「实例已起、台账未写」之间崩溃，会留下**看不见的工作**。
/// 现在的顺序最坏留下「有台账、无实例」，读时按行龄判定即可修成失败。
pub async fn create<C: ConnectionTrait>(
    conn: &C,
    task: &NewTask,
) -> Result<agent_task::Model, Error> {
    let now = Utc::now().fixed_offset();
    let model = agent_task::ActiveModel {
        id: Set(task.id),
        tenant_id: Set(task.tenant_id),
        user_id: Set(task.user_id),
        status: Set(TaskState::Running.as_str().to_owned()),
        objective: Set(task.objective.clone()),
        model: Set(task.model.clone()),
        max_steps: Set(task.max_steps),
        allowed_tools: Set(tools_to_json(&task.allowed_tools)),
        instance_id: Set(task.instance_id.clone()),
        steps: Set(0),
        result: Set(None),
        error: Set(None),
        created_at: Set(now),
        updated_at: Set(now),
    };

    Ok(model.insert(conn).await?)
}

/// 读行（读不到即 `None`：可能是别人的行，策略会隐藏它）。
pub async fn find<C: ConnectionTrait>(
    conn: &C,
    id: Uuid,
) -> Result<Option<agent_task::Model>, Error> {
    Ok(agent_task::Entity::find_by_id(id).one(conn).await?)
}

/// 终态写回；返回**本次是否真的写了**（`false` = 已是终态或行不存在，什么都没改）。
///
/// 必须在事务里调用：先 `SELECT ... FOR UPDATE` 锁住行、再判断是不是终态，
/// 于是「终态只写一次」是一条原子规则，而不是靠「谁先到」的时序假设——
/// 收尾可能由后台等待者、读时修复、甚至重试同时触发。
///
/// # Errors
/// `outcome.state` 不是终态时返回 [`Error::NotTerminal`]；状态列有无法识别的字面量时返回
/// [`Error::UnknownState`]（宁可报错也不要猜，坏行必须被看见）。
pub async fn finish<C: ConnectionTrait>(
    conn: &C,
    id: Uuid,
    outcome: &TaskOutcome,
) -> Result<bool, Error> {
    require_terminal(outcome.state)?;

    let Some(model) = agent_task::Entity::find_by_id(id)
        .lock_exclusive()
        .one(conn)
        .await?
    else {
        return Ok(false);
    };
    if TaskState::parse(&model.status)?.is_terminal() {
        return Ok(false);
    }

    let mut active = model.into_active_model();
    active.status = Set(outcome.state.as_str().to_owned());
    active.steps = Set(outcome.steps);
    active.result = Set(outcome.result.clone());
    active.error = Set(outcome.error.clone());
    active.updated_at = Set(Utc::now().fixed_offset());
    active.update(conn).await?;

    Ok(true)
}

/// 工具白名单落库形状：字符串数组。
///
/// 空数组就落空数组——「不给工具」与「没记录」是两件事，不能混成 NULL。
fn tools_to_json(tools: &[String]) -> Value {
    Value::Array(
        tools
            .iter()
            .map(|tool| Value::String(tool.clone()))
            .collect(),
    )
}

/// 入参闸门：只有终态能写回。
fn require_terminal(state: TaskState) -> Result<(), Error> {
    if state.is_terminal() {
        return Ok(());
    }
    Err(Error::NotTerminal {
        state: state.as_str(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tools_keep_their_order_and_empty_stays_empty() {
        let tools = vec!["asset_read".to_owned(), "knowledge_search".to_owned()];
        assert_eq!(
            tools_to_json(&tools),
            serde_json::json!(["asset_read", "knowledge_search"])
        );
        assert_eq!(tools_to_json(&[]), serde_json::json!([]));
    }

    #[test]
    fn only_terminal_states_pass_the_gate() {
        assert_eq!(
            require_terminal(TaskState::Running)
                .unwrap_err()
                .to_string(),
            "终态写回要求终态状态，收到：RUNNING"
        );
        assert!(require_terminal(TaskState::Succeeded).is_ok());
        assert!(require_terminal(TaskState::Failed).is_ok());
    }
}
