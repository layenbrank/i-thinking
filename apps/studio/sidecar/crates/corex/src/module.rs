use serde_json::Value;

/// 单线程 serve 循环内使用；xcap Monitor 在部分平台非 Send。
pub trait CorexModule {
    fn name(&self) -> &'static str;

    fn warm(&mut self) -> Result<(), String>;

    fn handle(&mut self, action: &str, params: Value) -> Result<Value, String>;
}
