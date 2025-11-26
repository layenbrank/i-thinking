use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum TSchema {
    LT,
    MT,
    SC,
    CT, // 添加 CT 变体以支持 API 返回的所有类型
    UT,
    PN,
    MB,
    RI,
    NWB,
    OS,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmptySchema {
    id: String,
    q: String,
    u: String,
    t: TSchema,
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

impl fmt::Display for Suggestion {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "suggestion s: {:?}, i: {:?}", self.s, self.i,)
    }
}

// 换行显示 URLParams
impl fmt::Display for URLParams {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "URLParams:\npt: {}\nqry: {}\ncp: {}\ncsr: {}\npths: {}\ncvid: {}",
            self.pt, self.qry, self.cp, self.csr, self.pths, self.cvid
        )
    }
}
