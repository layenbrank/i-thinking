use std::fmt;
use std::fmt::Debug;

use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
struct WeatherResp {
    code: u32,
    province: String,
    city: String,
    temperature: String,
    weather: String,
    wind_direction: String,
    wind_power: String,
    humidity: String,
    reporttime: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();

    // 发送 GET 请求
    let weather = client.get("https://uapis.cn/api/weather?name=周口市");

    let resp = weather.send().await?;

    // 获取状态码
    println!("Status: {:?}", resp.status());

    // 将响应解析为 WeatherResp 结构体
    let weather: WeatherResp = resp.json().await?;

    println!("{}", weather);

    Ok(())
}

impl fmt::Display for WeatherResp {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "省份: {}, \n城市: {}, \n温度: {}, \n天气: {}, \n风向: {}, \n风力: {}, \n湿度: {}, \n报告时间: {}",
            self.province,
            self.city,
            self.temperature,
            self.weather,
            self.wind_direction,
            self.wind_power,
            self.humidity,
            self.reporttime
        )
    }
}
