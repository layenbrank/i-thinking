//! 计费与订阅能力内核（数据所有权见 README.md）。
//!
//! 状态：**只有边界声明，尚无实现**（实现随 P3b 从 `service/src/services/{subscription,payment}`
//! 重写迁入）。
//!
//! 迁入之前：不要在 `service/src/services/**` 里新增订阅 / 配额 / 订单逻辑，
//! 也不要在这里堆放未接线的脚手架——`bun run arch` 会检查两侧。
