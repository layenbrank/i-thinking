use actix_web::web;
use reqwest::{Client, Error};
use serde::{Deserialize, Serialize};
use std::fmt;

pub struct EngineService;

#[derive(Debug, Serialize, Deserialize)]
pub enum TSchema {
    LT,
    MT,
    SC,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmptySchema {
    id: String,
    q: String,
    u: String,
    t: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ISchema {
    ig: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Suggestion {
    s: Vec<EmptySchema>,
    i: ISchema,
}
// pt: 'page.home',
// qry: value,
// cp: value.length,
// csr: '1',
// pths: '1',
// cvid: cvid

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct URLParams {
    pt: String,
    qry: String,
    cp: u64,
    csr: String,
    pths: String,
    cvid: String,
}

impl URLParams {
    pub fn new(pt: String, qry: String, cp: u64, csr: String, pths: String, cvid: String) -> Self {
        URLParams {
            pt,
            qry,
            cp,
            csr,
            pths,
            cvid,
        }
    }
}

impl EngineService {
    pub async fn suggestion(path: web::Query<URLParams>) -> Result<Suggestion, Error> {
        let client = Client::new();
        let fetch = client.get("https://api.example.com/suggestion");
        let response = fetch.send().await?;
        let suggestion = response.json::<Suggestion>().await?;
        // let suggestion: Suggestion = response.json().await;
        println!("Suggestion: {}", suggestion);

        Ok(suggestion)
    }
}

impl fmt::Display for Suggestion {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "suggestion s: {:?}, i: {:?}", self.s, self.i,)
    }
}
