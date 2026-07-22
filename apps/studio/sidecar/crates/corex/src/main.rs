mod module;
mod modules;
mod registry;
mod rpc;
mod serve;

use std::env;
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();

    match args.first().map(String::as_str) {
        Some("--version") | Some("-V") => {
            println!("corex {}", env!("CARGO_PKG_VERSION"));
            ExitCode::SUCCESS
        }
        Some("serve") => match serve::run() {
            Ok(()) => ExitCode::SUCCESS,
            Err(err) => {
                eprintln!("corex serve failed: {err}");
                ExitCode::FAILURE
            }
        },
        Some("--help") | Some("-h") | Some("help") | None => {
            eprintln!(
                "usage:
  corex --version
  corex serve"
            );
            if args.first().is_none() {
                ExitCode::from(2)
            } else {
                ExitCode::SUCCESS
            }
        }
        Some(other) => {
            eprintln!("unknown command: {other}");
            eprintln!(
                "usage:
  corex --version
  corex serve"
            );
            ExitCode::from(2)
        }
    }
}
