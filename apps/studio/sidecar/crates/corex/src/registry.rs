use serde_json::Value;

use crate::module::CorexModule;

pub struct ModuleRegistry {
    modules: Vec<Box<dyn CorexModule>>,
}

impl ModuleRegistry {
    pub fn new() -> Self {
        Self {
            modules: Vec::new(),
        }
    }

    pub fn register(&mut self, module: Box<dyn CorexModule>) {
        self.modules.push(module);
    }

    pub fn module_names(&self) -> Vec<&'static str> {
        self.modules.iter().map(|m| m.name()).collect()
    }

    pub fn warm_all(&mut self) -> Result<(), String> {
        for module in &mut self.modules {
            module
                .warm()
                .map_err(|err| format!("warm {}: {err}", module.name()))?;
        }
        Ok(())
    }

    pub fn dispatch(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let (module_name, action) = parse_method(method)?;
        let module = self
            .modules
            .iter_mut()
            .find(|m| m.name() == module_name)
            .ok_or_else(|| format!("unknown module: {module_name}"))?;
        module.handle(action, params)
    }
}

fn parse_method(method: &str) -> Result<(&str, &str), String> {
    let mut parts = method.splitn(2, '.');
    let module_name = parts
        .next()
        .filter(|part| !part.is_empty())
        .ok_or_else(|| format!("invalid method: {method}"))?;
    let action = parts
        .next()
        .filter(|part| !part.is_empty())
        .ok_or_else(|| format!("invalid method: {method}"))?;
    Ok((module_name, action))
}
