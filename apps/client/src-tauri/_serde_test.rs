fn main() {
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct P {
        kind: String,
        #[serde(rename = "magneticTileID")]
        magnetic_tile_id: Option<String>,
    }
    let p = P { kind: "countdown".into(), magnetic_tile_id: Some("uuid-1".into()) };
    println!("{}", serde_json::to_string(&p).unwrap());
}
