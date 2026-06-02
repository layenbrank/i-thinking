use base64::{Engine, engine::general_purpose};
use pdfium_render::prelude::*;
use serde::{Deserialize, Serialize};
use std::io::Cursor;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Meta {
    pub path: String,
    pub title: String,
    pub author: String,
    pub count: u32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Image {
    pub data: String,
    pub width: u32,
    pub height: u32,
    pub index: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Match {
    pub index: u32,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub snippet: String,
}
