fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.first().map(String::as_str) == Some("--version") {
        println!("corex {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    println!("corex sidecar ready");
}
