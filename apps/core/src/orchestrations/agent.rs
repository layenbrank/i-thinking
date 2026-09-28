//! 服务端 agent 的多轮循环（`agent.run`）：一步一个活动，跑到模型给出结论或用尽轮次预算。
//!
//! 循环的宿主是**编排**，不是 ai-worker（D6）：它无状态，只做「一次推理 + 至多一轮只读工具」。
//! 这样每一步都是历史里的一步——崩了只重跑当前这一步，重试粒度最细，进度也能写进 custom status。
//! 反例（把整个循环塞进一次调用）会让一个活动跑几分钟、丢掉步骤可见性，并把「至少执行一次」
//! 的重试语义变粗。
//!
//! 两条不变式在每一步之后都要成立（见 [`check_invariants`]）。它们不是「防御性编程」，而是
//! 契约里写明的形状：`finished` 当且仅当没有工具调用、`toolResults` 与 `toolCalls` 同序对齐。
//! 一旦下游给出自相矛盾的一步，把它当结论收下就会把脏东西写进任务历史——那类 bug 表现为
//! 「模型莫名其妙地重复调用同一个工具」，极难排查。所以违反即**立刻判失败**（不可重试）。
//!
//! 确定性约束（见 `mod.rs` 的铁律）：编排里不碰系统时间、不碰网络、不遍历 HashMap。
//! 每一步的输入都由上一步的产出决定，所以重放时会重新算出同一串历史。

use std::sync::Arc;

use durable::{Activities, OrchestrationContext, Orchestrations};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

use crate::clients::ai_worker::{
    AgentMessage, AgentStepRequest, AgentStepResponse, AiWorkerClient, AiWorkerError, CallMeta,
    INTERNAL_SCHEMA_VERSION,
};
use crate::orchestrations::retry;

/// 编排名。名字是持久化契约：改名等于换了工作流，正在跑的实例会找不到实现。
pub const AGENT_RUN: &str = "agent.run";
/// 活动：走一步（一次推理 + 至多一轮只读工具）。
pub const AGENT_STEP: &str = "agent.step";

/// 编排输入：起任务时定死的全部参数。
///
/// 模型与嵌入模型由 core 指定，不由 ai-worker 猜（core 的 gateway 是唯一出网点与计量点）。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRunInput {
    /// 台账行标识，会让输出带回调用方，不必去别处找。
    #[serde(rename = "taskID")]
    pub task_id: String,
    #[serde(rename = "tenantID")]
    pub tenant_id: String,
    /// 发起人；服务身份（无会话）触发时为空。
    #[serde(rename = "userID", default, skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    /// 任务目标（自然语言），只在历史为空时起头。
    pub objective: String,
    /// 对话模型（网关目录里的一行）。
    pub model: String,
    /// 检索用的嵌入模型，必须与 `rag.index` 落库时用的模型一致。
    #[serde(rename = "embedModel")]
    pub embed_model: String,
    /// 轮次上限。
    #[serde(rename = "maxSteps")]
    pub max_steps: i32,
    /// 工具白名单；空数组 = 不给工具。
    #[serde(rename = "allowedTools")]
    pub allowed_tools: Vec<String>,
    /// 上游链路（请求头里的 `traceparent`）。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub traceparent: Option<String>,
}

/// 编排输出：台账要写的那些东西，加上给调用方看的结论。
///
/// 刻意**不记 token 用量**：计量的唯一落点是网关（`gateway_usage`），在这里再记一份
/// 迟早会有人拿两份数对账而对不上。要查某次任务花了多少，按服务主体查网关用量。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRunOutput {
    #[serde(rename = "taskID")]
    pub task_id: String,
    /// 实际用掉的轮次。
    pub steps: i32,
    /// 是否由模型给出结论收的尾（`false` = 轮次预算耗尽，结论可能不完整）。
    pub finished: bool,
    /// 模型的最后一条正文；只有工具调用、没有正文时为空。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub answer: Option<String>,
    /// 一共执行了多少次工具调用（给运维看这个任务有多"重"）。
    #[serde(rename = "toolCalls")]
    pub tool_calls: i32,
}

/// 一步活动的输入：契约请求体的外面套一层**不进下游请求体**的元信息。
///
/// `step` 是幂等键的来源——同一轮重放要拿到同一个键，不同轮必须是不同的键，
/// 否则第二步会被下游当成第一步的重放而直接返回旧结果。
#[derive(Debug, Serialize, Deserialize)]
struct AgentStepActivity {
    /// 第几轮（1 起）。
    step: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    traceparent: Option<String>,
    #[serde(flatten)]
    request: AgentStepRequest,
}

/// 注册唯一的活动。`client` 是唯一出站口，活动只负责「调用 + 分类错误」。
pub fn register_activities(activities: Activities, client: Arc<AiWorkerClient>) -> Activities {
    activities.register(AGENT_STEP, move |ctx, input: String| {
        let client = Arc::clone(&client);
        async move {
            let step: AgentStepActivity = decode(&input)?;
            let meta = CallMeta::new(
                idempotency_key(ctx.instance_id(), &format!("step:{}", step.step)),
                step.traceparent,
            );

            let response = client
                .agent_step(&step.request, &meta)
                .await
                .map_err(classify)?;

            encode(&response)
        }
    })
}

/// 注册编排。模型、轮次、工具都在输入里，所以这里没有额外参数。
pub fn register_orchestration(orchestrations: Orchestrations) -> Orchestrations {
    orchestrations.register(AGENT_RUN, move |ctx, input: String| async move {
        agent_run(ctx, input).await
    })
}

/// 一条任务的全部逻辑：单层循环，每轮一个活动。
async fn agent_run(ctx: OrchestrationContext, input: String) -> Result<String, String> {
    let step: AgentRunInput = decode(&input)?;
    let max_steps = step.max_steps.max(1);
    let mut history: Vec<AgentMessage> = Vec::new();
    let mut steps = 0;
    let mut tool_calls = 0;

    loop {
        steps += 1;
        let remaining = remaining_steps(steps, max_steps);
        let request = AgentStepRequest {
            schema_version: INTERNAL_SCHEMA_VERSION,
            tenant_id: step.tenant_id.clone(),
            objective: step.objective.clone(),
            model: step.model.clone(),
            embed_model: step.embed_model.clone(),
            history: history.clone(),
            allowed_tools: tools_for_step(&step.allowed_tools, remaining),
            remaining_steps: Some(remaining),
        };
        // 进度进 custom status：运维与接入方都能从这里看出「走到第几轮了」。
        ctx.set_custom_status(progress(steps, max_steps, request.allowed_tools.len()));

        let activity = AgentStepActivity {
            step: steps,
            traceparent: step.traceparent.clone(),
            request,
        };
        let response: AgentStepResponse =
            decode(&retry::run_activity(&ctx, AGENT_STEP, &encode(&activity)?).await?)?;
        check_invariants(&response)?;

        // 历史由 core 攒：助手消息（含它要的工具）+ 每个工具结果各一条 `tool` 消息。
        history.push(AgentMessage::assistant(&response));
        for result in &response.tool_results {
            history.push(AgentMessage::tool(result));
        }
        tool_calls += response.tool_results.len() as i32;

        if response.finished {
            ctx.trace_info(format!("任务收尾：steps={steps} toolCalls={tool_calls}"));
            return encode(&AgentRunOutput {
                task_id: step.task_id,
                steps,
                finished: true,
                answer: response.message.content.clone(),
                tool_calls,
            });
        }

        if steps >= max_steps {
            // 预算耗尽。最后一步本来就不给工具，理论上不会再出现工具调用；真出现了说明下游
            // 没看懂 `remainingSteps`。此时按「结论不完整」收尾，而不是继续转下去。
            ctx.trace_warn(format!(
                "轮次预算耗尽（{max_steps} 步）仍未得到结论，按未完成收尾"
            ));
            return encode(&AgentRunOutput {
                task_id: step.task_id,
                steps,
                finished: false,
                answer: response.message.content.clone(),
                tool_calls,
            });
        }
    }
}

/// 两条不变式都在契约里写着；违反即判失败，且不可重试（重试同一份输入只会得到同一份矛盾）。
fn check_invariants(response: &AgentStepResponse) -> Result<(), String> {
    let calls = response.message.tool_calls.as_deref().unwrap_or_default();

    if response.finished != calls.is_empty() {
        return Err(retry::permanent(format!(
            "单步结果自相矛盾：finished={} 但模型要了 {} 个工具",
            response.finished,
            calls.len()
        )));
    }
    if response.tool_results.len() != calls.len() {
        return Err(retry::permanent(format!(
            "单步结果与工具调用对不上：要了 {} 个，回了 {} 个结果",
            calls.len(),
            response.tool_results.len()
        )));
    }
    for (call, result) in calls.iter().zip(&response.tool_results) {
        if call.id != result.tool_call_id {
            return Err(retry::permanent(format!(
                "工具结果与调用没对齐：期望 {}，实际 {}",
                call.id, result.tool_call_id
            )));
        }
    }

    Ok(())
}

/// 第 `step` 步还剩几步（含本步）。预算是「还剩几次机会」，所以从上限往下数。
fn remaining_steps(step: i32, max_steps: i32) -> i32 {
    (max_steps - (step - 1)).max(0)
}

/// 本步给模型的工具白名单：预算只剩这一步时清空。
///
/// 契约里 `remainingSteps <= 1` 时下游本来也会收回工具，这里是**主动**表达同一个意图：
/// 「必须给结论了」由发起方说清楚，比让下游替我们猜要好。
fn tools_for_step(allowed: &[String], remaining: i32) -> Vec<String> {
    if remaining <= 1 {
        return Vec::new();
    }
    allowed.to_vec()
}

/// 进度标签（也是 `steps_from_progress` 的输入格式）。
pub fn progress(step: i32, max_steps: i32, tools: usize) -> String {
    format!("step:{step}/{max_steps} tools:{tools}")
}

/// 从进度标签里读回轮次。
///
/// 失败时台账要能写出「失败在第几轮」，而编排失败时只有 custom status 这条现成的信息。
/// 认不出来就返回 `None`（写不出轮次，不编造一个数）。
pub fn steps_from_progress(status: &str) -> Option<i32> {
    let rest = status.strip_prefix("step:")?;
    let (step, _) = rest.split_once('/')?;

    step.parse().ok()
}

/// 幂等键：`<实例 id>:<步骤>`。实例 id 由框架生成，同一实例重放拿到同一个键。
fn idempotency_key(instance: &str, step: &str) -> String {
    format!("{instance}:{step}")
}

/// 活动失败 → 编排能读懂的语义。分类只在活动里做，因为只有它知道下游回了什么。
fn classify(error: AiWorkerError) -> String {
    if error.is_retryable() {
        retry::transient(error.to_string())
    } else {
        retry::permanent(error.to_string())
    }
}

fn encode<T: Serialize>(value: &T) -> Result<String, String> {
    serde_json::to_string(value).map_err(|e| retry::permanent(format!("步骤输出无法编码: {e}")))
}

fn decode<T: DeserializeOwned>(raw: &str) -> Result<T, String> {
    serde_json::from_str(raw).map_err(|e| retry::permanent(format!("步骤输入无法解析: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::clients::ai_worker::{AgentToolCall, AgentToolResult};

    fn input() -> AgentRunInput {
        AgentRunInput {
            task_id: "task-1".into(),
            tenant_id: "t-1".into(),
            user_id: None,
            objective: "总结这批文档".into(),
            model: "deepseek-chat".into(),
            embed_model: "text-embedding-3-small".into(),
            max_steps: 6,
            allowed_tools: vec!["knowledge_search".into(), "asset_read".into()],
            traceparent: None,
        }
    }

    fn step_response(finished: bool, calls: Vec<(&str, &str)>, results: Vec<&str>) -> String {
        let tool_calls: Vec<AgentToolCall> = calls
            .into_iter()
            .map(|(id, name)| AgentToolCall {
                id: id.into(),
                name: name.into(),
                arguments: Some("{}".into()),
                tool_call_type: Some("function".into()),
            })
            .collect();
        let tool_results: Vec<AgentToolResult> = results
            .into_iter()
            .map(|id| AgentToolResult {
                tool_call_id: id.into(),
                name: "knowledge_search".into(),
                ok: true,
                content: "段 1".into(),
                error: None,
            })
            .collect();

        encode(&AgentStepResponse {
            schema_version: INTERNAL_SCHEMA_VERSION,
            finished,
            message: AgentMessage {
                role: "assistant".into(),
                content: Some("结论".into()),
                tool_calls: if tool_calls.is_empty() {
                    None
                } else {
                    Some(tool_calls)
                },
                tool_call_id: None,
            },
            tool_results,
            usage: crate::clients::ai_worker::AgentUsage {
                prompt_tokens: 10,
                completion_tokens: 2,
                total_tokens: 12,
            },
        })
        .expect("encode")
    }

    #[test]
    fn names_are_stable() {
        // 名字进的是数据库（编排历史），改字面量等于换工作流。
        assert_eq!(AGENT_RUN, "agent.run");
        assert_eq!(AGENT_STEP, "agent.step");
    }

    #[test]
    fn input_round_trips_with_camel_case() {
        let json = encode(&input()).expect("encode");
        assert!(json.contains(r#""taskID":"task-1""#), "{json}");
        assert!(json.contains(r#""tenantID":"t-1""#), "{json}");
        assert!(json.contains(r#""maxSteps":6"#), "{json}");
        assert!(json.contains(r#""embedModel""#), "{json}");
        assert!(json.contains(r#""allowedTools""#), "{json}");
        assert!(!json.contains("userID"), "空的发起人不该出现在输入里");
        assert!(!json.contains("traceparent"), "缺省链路不该出现在输入里");

        let parsed: AgentRunInput = decode(&json).expect("decode");
        assert_eq!(parsed.max_steps, 6);
        assert_eq!(parsed.allowed_tools.len(), 2);
    }

    #[test]
    fn budget_counts_down_and_the_last_step_gets_no_tools() {
        assert_eq!(remaining_steps(1, 6), 6);
        assert_eq!(remaining_steps(6, 6), 1);
        assert_eq!(remaining_steps(7, 6), 0, "越界要夹到 0，不能变负数");

        let tools = vec!["knowledge_search".to_owned()];
        assert_eq!(tools_for_step(&tools, 2), tools);
        assert!(
            tools_for_step(&tools, 1).is_empty(),
            "最后一步必须收回工具：模型得先给结论，否则下一步就撞硬止损"
        );
        assert!(tools_for_step(&tools, 0).is_empty());
    }

    #[test]
    fn progress_round_trips() {
        let status = progress(3, 6, 2);
        assert_eq!(status, "step:3/6 tools:2");
        assert_eq!(steps_from_progress(&status), Some(3));
        assert_eq!(steps_from_progress("step:1/1 tools:0"), Some(1));

        // 认不出来就给 `None`：宁可写不出轮次，也不编一个数进台账。
        assert_eq!(steps_from_progress("chunked:33"), None);
        assert_eq!(steps_from_progress(""), None);
        assert_eq!(steps_from_progress("step:x/6 tools:1"), None);
    }

    #[test]
    fn invariants_pass_on_a_well_formed_step() {
        let finished = step_response(true, vec![], vec![]);
        let parsed: AgentStepResponse = decode(&finished).expect("decode");
        assert!(check_invariants(&parsed).is_ok());

        let with_tools = step_response(false, vec![("call-1", "knowledge_search")], vec!["call-1"]);
        let parsed: AgentStepResponse = decode(&with_tools).expect("decode");
        assert!(check_invariants(&parsed).is_ok());
    }

    #[test]
    fn invariants_reject_contradictions_permanently() {
        let cases = [
            // finished 说有结论，模型却要了工具。
            step_response(true, vec![("call-1", "knowledge_search")], vec!["call-1"]),
            // 要了两个工具，只回了一个结果。
            step_response(
                false,
                vec![("call-1", "knowledge_search"), ("call-2", "asset_read")],
                vec!["call-1"],
            ),
            // 结果指回了另一次调用。
            step_response(false, vec![("call-1", "knowledge_search")], vec!["call-9"]),
        ];

        for raw in cases {
            let parsed: AgentStepResponse = decode(&raw).expect("decode");
            let error = check_invariants(&parsed).expect_err("应当判失败");
            assert!(retry::is_permanent(&error), "{error}");
        }
    }

    #[test]
    fn activity_envelope_carries_the_step_and_survives_an_empty_history() {
        let activity = AgentStepActivity {
            step: 2,
            traceparent: Some("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01".into()),
            request: AgentStepRequest {
                schema_version: INTERNAL_SCHEMA_VERSION,
                tenant_id: "t-1".into(),
                objective: "总结".into(),
                model: "deepseek-chat".into(),
                embed_model: "text-embedding-3-small".into(),
                history: vec![],
                allowed_tools: vec![],
                remaining_steps: Some(5),
            },
        };
        let json = encode(&activity).expect("encode");
        // 元信息与契约请求体摊平在同一个对象里（活动输入是 core 自己的载荷，不是下游契约）。
        assert!(json.contains(r#""step":2"#), "{json}");
        assert!(json.contains(r#""tenantID":"t-1""#), "{json}");

        // 第一步的历史是空的，会被跳过；回读时必须仍然成立（缺省即空历史）。
        let parsed: AgentStepActivity = decode(&json).expect("decode");
        assert!(parsed.request.history.is_empty());
        assert_eq!(parsed.step, 2);
    }

    #[test]
    fn idempotency_keys_are_step_scoped() {
        assert_eq!(idempotency_key("inst-1", "step:1"), "inst-1:step:1");
        assert_ne!(
            idempotency_key("inst-1", "step:1"),
            idempotency_key("inst-1", "step:2"),
            "不同轮必须是不同的键，否则第二轮会被下游当成第一轮的重放"
        );
    }

    #[test]
    fn classifies_retryability() {
        assert!(classify(AiWorkerError::RateLimited).starts_with(retry::TRANSIENT));
        assert!(classify(AiWorkerError::Timeout).starts_with(retry::TRANSIENT));
        assert!(
            classify(AiWorkerError::Rejected {
                status: 400,
                body: "bad".into()
            })
            .starts_with(retry::PERMANENT)
        );
    }

    #[test]
    fn bad_input_is_permanent_so_it_never_retries() {
        let error = decode::<AgentRunInput>("{ not json").expect_err("应当失败");
        assert!(retry::is_permanent(&error), "{error}");
    }

    #[test]
    fn output_round_trips() {
        let output = AgentRunOutput {
            task_id: "task-1".into(),
            steps: 3,
            finished: false,
            answer: None,
            tool_calls: 4,
        };
        let json = encode(&output).expect("encode");
        assert!(json.contains(r#""taskID":"task-1""#), "{json}");
        assert!(!json.contains("answer"), "没有结论时不该发一个 null");
        assert!(
            !json.contains("usage") && !json.contains("Tokens"),
            "token 用量的唯一落点是网关，台账里不重复记 —— {json}"
        );

        let parsed: AgentRunOutput = decode(&json).expect("decode");
        assert!(!parsed.finished);
        assert_eq!(parsed.tool_calls, 4);
    }
}
