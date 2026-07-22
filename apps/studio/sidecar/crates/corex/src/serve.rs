use std::io::{self, BufRead, Write};

use serde_json::json;

use crate::modules::ScreenshotModule;
use crate::registry::ModuleRegistry;
use crate::rpc::{ReadyEvent, Request, Response};

pub fn run() -> Result<(), String> {
    let mut registry = ModuleRegistry::new();
    registry.register(Box::new(ScreenshotModule::new()));
    registry.warm_all()?;

    let ready = ReadyEvent {
        event: "ready",
        version: env!("CARGO_PKG_VERSION"),
        modules: registry.module_names(),
    };
    write_line(&ready)?;

    let stdin = io::stdin();
    let mut lines = stdin.lock().lines();

    while let Some(line_result) = lines.next() {
        let line = line_result.map_err(|err| format!("read stdin: {err}"))?;
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let request: Request = match serde_json::from_str(line) {
            Ok(request) => request,
            Err(err) => {
                let response = Response::err(String::new(), format!("invalid request: {err}"));
                write_line(&response)?;
                continue;
            }
        };

        if request.method == "ping" {
            write_line(&Response::ok(request.id, json!({ "pong": true })))?;
            continue;
        }

        if request.method == "shutdown" {
            write_line(&Response::ok(request.id, json!({})))?;
            break;
        }

        let response = match registry.dispatch(&request.method, request.params) {
            Ok(data) => Response::ok(request.id, data),
            Err(err) => Response::err(request.id, err),
        };
        write_line(&response)?;
    }

    Ok(())
}

fn write_line<T: serde::Serialize>(value: &T) -> Result<(), String> {
    let mut stdout = io::stdout().lock();
    serde_json::to_writer(&mut stdout, value).map_err(|err| format!("write stdout: {err}"))?;
    stdout
        .write_all(b"\n")
        .map_err(|err| format!("write newline: {err}"))?;
    stdout
        .flush()
        .map_err(|err| format!("flush stdout: {err}"))?;
    Ok(())
}
