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
