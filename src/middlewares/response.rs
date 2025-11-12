use actix_web::{
    Error, HttpMessage,
    dev::{ServiceRequest, ServiceResponse, Transform},
};
use colored::*;
use comfy_table::{
    Cell, Table,
    modifiers::{UTF8_ROUND_CORNERS, UTF8_SOLID_INNER_BORDERS},
};
use futures::future::{LocalBoxFuture, Ready, ok};
use std::task::{Context, Poll};
use uuid::Uuid;

/// 响应包装中间件
pub struct ResponseWrapper;

impl<S, B> Transform<S, ServiceRequest> for ResponseWrapper
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = ResponseWrapperMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(ResponseWrapperMiddleware { service })
    }
}

pub struct ResponseWrapperMiddleware<S> {
    service: S,
}

impl<S, B> actix_web::dev::Service<ServiceRequest> for ResponseWrapperMiddleware<S>
where
    S: actix_web::dev::Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // 生成请求 ID
        let id = Uuid::new_v4().to_string();

        // 记录请求信息到日志 - 将需要的数据克隆以避免生命周期问题
        let method = req.method().as_str().to_string();
        let path = req.path().to_string();
        let start_time = std::time::Instant::now();

        // 格式化请求开始时间：xxxx年xx月xx日xx时xx分xx秒
        let time = chrono::Local::now()
            .format("%Y年%m月%d日%H时%M分%S秒")
            .to_string();

        // 提取客户端 IP
        let client_ip = req
            .connection_info()
            .peer_addr()
            .map(|s| s.to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        // 提取 User-Agent
        let user_agent = req
            .headers()
            .get("user-agent")
            .and_then(|h| h.to_str().ok())
            .unwrap_or("Unknown")
            .to_string();

        // 使用 comfy-table 库创建表格（完整边框 + 圆角 + 实心内部边框 + 单线分隔符）
        // 不使用 set_header，将表头作为普通行添加，避免双线分隔符
        let mut table = Table::new();
        table.load_preset(comfy_table::presets::UTF8_FULL);
        table.apply_modifier(UTF8_ROUND_CORNERS);
        table.apply_modifier(UTF8_SOLID_INNER_BORDERS);
        // 将表头作为第一行添加，使用颜色格式（启用 custom_styling 功能后应能正确处理）
        table.add_row(vec![
            Cell::new("Field".bright_white().to_string()),
            Cell::new("Value".bright_white().to_string()),
        ]);
        // 使用颜色格式，custom_styling 功能应能正确处理 ANSI 代码
        table.add_row(vec![
            Cell::new(format!("{} Req ID", "📥")),
            Cell::new(id.bright_cyan().to_string()),
        ]);
        table.add_row(vec![
            Cell::new("Method".to_string()),
            Cell::new(method.bright_yellow().to_string()),
        ]);
        table.add_row(vec![
            Cell::new("Path".to_string()),
            Cell::new(path.bright_white().to_string()),
        ]);
        table.add_row(vec![
            Cell::new("Client".to_string()),
            Cell::new(client_ip.bright_white().to_string()),
        ]);
        table.add_row(vec![
            Cell::new("User-Agent".to_string()),
            Cell::new(user_agent.bright_white().to_string()),
        ]);
        table.add_row(vec![
            Cell::new("Time".to_string()),
            Cell::new(time.bright_white().to_string()),
        ]);

        println!("\n{}", table);

        // 将请求 ID 存储在请求扩展中
        req.extensions_mut().insert(id.clone());

        let fut = self.service.call(req);

        // 克隆需要在异步块中使用的数据
        let client_ip_clone = client_ip.clone();
        let user_agent_clone = user_agent.clone();

        Box::pin(async move {
            let response = fut.await;
            let duration = start_time.elapsed();
            let duration_ms = duration.as_millis();

            match &response {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    let status_emoji = if status < 400 {
                        "✅"
                    } else if status < 500 {
                        "⚠️"
                    } else {
                        "❌"
                    };

                    // 使用颜色格式，custom_styling 功能应能正确处理 ANSI 代码
                    let status_color = if status < 400 {
                        status.to_string().bright_green()
                    } else if status < 500 {
                        status.to_string().bright_yellow()
                    } else {
                        status.to_string().bright_red()
                    };

                    let duration_color = if duration_ms < 100 {
                        format!("{}ms", duration_ms).bright_green()
                    } else if duration_ms < 500 {
                        format!("{}ms", duration_ms).bright_yellow()
                    } else {
                        format!("{}ms", duration_ms).bright_red()
                    };

                    let mut table = Table::new();
                    table.load_preset(comfy_table::presets::UTF8_FULL);
                    table.apply_modifier(UTF8_ROUND_CORNERS);
                    table.apply_modifier(UTF8_SOLID_INNER_BORDERS);
                    // 将表头作为第一行添加，使用颜色格式（启用 custom_styling 功能后应能正确处理）
                    table.add_row(vec![
                        Cell::new("Field".bright_white().to_string()),
                        Cell::new("Value".bright_white().to_string()),
                    ]);
                    // 使用颜色格式，custom_styling 功能应能正确处理 ANSI 代码
                    table.add_row(vec![
                        Cell::new(format!("{} Res ID", status_emoji)),
                        Cell::new(id.bright_cyan().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Method".to_string()),
                        Cell::new(method.bright_yellow().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Path".to_string()),
                        Cell::new(path.bright_white().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Client".to_string()),
                        Cell::new(client_ip_clone.bright_white().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("User-Agent".to_string()),
                        Cell::new(user_agent_clone.bright_white().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Status".to_string()),
                        Cell::new(status_color.to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Duration".to_string()),
                        Cell::new(duration_color.to_string()),
                    ]);

                    println!("\n{}", table);
                }
                Err(err) => {
                    let err_text = format!("{}", err);

                    let mut table = Table::new();
                    table.load_preset(comfy_table::presets::UTF8_FULL);
                    table.apply_modifier(UTF8_ROUND_CORNERS);
                    table.apply_modifier(UTF8_SOLID_INNER_BORDERS);
                    // 将表头作为第一行添加，使用颜色格式（启用 custom_styling 功能后应能正确处理）
                    table.add_row(vec![
                        Cell::new("Field".bright_white().to_string()),
                        Cell::new("Value".bright_white().to_string()),
                    ]);
                    // 使用颜色格式，custom_styling 功能应能正确处理 ANSI 代码
                    table.add_row(vec![
                        Cell::new(format!("{} Error ID", "❌")),
                        Cell::new(id.bright_cyan().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Method".to_string()),
                        Cell::new(method.bright_yellow().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Path".to_string()),
                        Cell::new(path.bright_white().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Client IP".to_string()),
                        Cell::new(client_ip_clone.bright_white().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("User-Agent".to_string()),
                        Cell::new(user_agent_clone.bright_white().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Error".to_string()),
                        Cell::new(err_text.bright_red().to_string()),
                    ]);
                    table.add_row(vec![
                        Cell::new("Duration".to_string()),
                        Cell::new(format!("{}ms", duration_ms).bright_red().to_string()),
                    ]);

                    println!("\n{}", table);
                }
            }

            response
        })
    }
}
