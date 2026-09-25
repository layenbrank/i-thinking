//! OAS 路由一致性测试：确保所有已注册路由均在 spec 中记录。

use service::oas::{self, OpenDoc, paths::ALL_ROUTES};
use utoipa::OpenApi;

#[test]
fn all_registered_routes_exist_in_spec() {
    let spec = OpenDoc::openapi();

    for route in ALL_ROUTES {
        assert!(
            oas::has_route(route.method, route.path, &spec),
            "OAS spec missing route: {} {}",
            route.method,
            route.path
        );
    }
}

#[test]
fn spec_has_unique_operation_ids() {
    let spec = OpenDoc::openapi();
    let mut seen = std::collections::HashSet::new();

    for item in spec.paths.paths.values() {
        for op in [
            item.get.as_ref(),
            item.post.as_ref(),
            item.put.as_ref(),
            item.delete.as_ref(),
            item.patch.as_ref(),
        ]
        .into_iter()
        .flatten()
        {
            if let Some(id) = &op.operation_id {
                assert!(seen.insert(id.clone()), "duplicate operationId: {id}");
            }
        }
    }
}

#[test]
fn spec_json_export_is_valid() {
    let json = oas::json_pretty();
    assert!(json.contains("\"openapi\""));
    assert!(json.contains("/api/v1/auth/signin"));
    assert!(json.contains("bearer_auth"));
    assert!(json.contains("/guide/error-codes.md"));
}

/// 导出必须字节稳定：manifest 里 `securitySchemes.*` 的 Apifox 扩展来自 utoipa 的
/// `Extensions`（内部是 `HashMap`），未规范化时键序随进程随机，会让 CI 的
/// `git diff --exit-code spec/openapi.json` 随机失败。
#[test]
fn spec_json_export_is_deterministic() {
    let first = oas::json_pretty();
    assert_eq!(first, oas::json_pretty(), "同一进程内两次导出结果不一致");

    let apifox = first
        .find("\"x-apifox-default\"")
        .expect("securityScheme 缺少 x-apifox-default");
    let default = first
        .find("\"x-default\"")
        .expect("securityScheme 缺少 x-default");
    assert!(
        apifox < default,
        "键序未规范化，导出结果会随运行随机变化"
    );
}
