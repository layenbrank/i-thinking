use actix_web::http::header;
use actix_web::middleware::DefaultHeaders;
// use actix_web::{Error, HttpMessage, dev::ServiceRequest, dev::ServiceResponse};

pub fn cors() -> DefaultHeaders {
    DefaultHeaders::new()
        .add((header::ACCESS_CONTROL_ALLOW_ORIGIN, "*"))
        .add((
            header::ACCESS_CONTROL_ALLOW_METHODS,
            "GET, POST, PUT, DELETE, OPTIONS",
        ))
        .add((
            header::ACCESS_CONTROL_ALLOW_HEADERS,
            "Content-Type, Authorization",
        ))
}
