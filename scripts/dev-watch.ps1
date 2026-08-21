# 开发热重载（忽略上传/日志等运行时目录，避免分片写入触发重启）
cargo watch `
  -i cas -i "cas/**" `
  -i chunks -i "chunks/**" `
  -i logs -i "logs/**" `
  -i data -i "data/**" `
  -i uploads -i "uploads/**" `
  -x "run --bin service --features openapi"
