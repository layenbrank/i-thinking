//! Auth 路由 IP 限流（actix-governor）。

use std::net::IpAddr;
use std::sync::Arc;

use actix_governor::governor::NotUntil;
use actix_governor::governor::clock::QuantaInstant;
use actix_governor::governor::middleware::NoOpMiddleware;
use actix_governor::{
    GovernorConfig, GovernorConfigBuilder, KeyExtractor, SimpleKeyExtractionError,
};
use actix_web::HttpResponse;
use actix_web::dev::ServiceRequest;

use crate::configures::configure::Configure;
use crate::filters::exception::Exception;
use crate::utils::client_ip;
use crate::utils::code::request;

#[derive(Debug, Clone)]
pub struct ClientIpKeyExtractor {
    trust_proxy: bool,
}

impl ClientIpKeyExtractor {
    pub fn new(trust_proxy: bool) -> Self {
        Self { trust_proxy }
    }
}

impl KeyExtractor for ClientIpKeyExtractor {
    type Key = IpAddr;
    type KeyExtractionError = SimpleKeyExtractionError<&'static str>;

    fn extract(&self, req: &ServiceRequest) -> Result<Self::Key, Self::KeyExtractionError> {
        let raw = client_ip::from_service_request(req, self.trust_proxy);
        let mut ip = client_ip::parse_ip_addr(&raw).ok_or_else(|| {
            SimpleKeyExtractionError::new("Could not extract peer IP address from request")
        })?;

        if let IpAddr::V6(ipv6) = ip {
            let mut octets = ipv6.octets();
            octets[7..16].fill(0);
            ip = IpAddr::V6(octets.into());
        }

        Ok(ip)
    }

    fn exceed_rate_limit_response(
        &self,
        _negative: &NotUntil<QuantaInstant>,
        mut response: actix_web::HttpResponseBuilder,
    ) -> HttpResponse {
        response
            .status(actix_web::http::StatusCode::OK)
            .json(Exception::custom(
                request::RATE_LIMIT_EXCEEDED,
                "请求频率过高",
            ))
    }
}

pub type AuthGovernorConfig = GovernorConfig<ClientIpKeyExtractor, NoOpMiddleware>;

#[derive(Debug, Clone)]
pub struct AuthGovernor(pub Option<Arc<AuthGovernorConfig>>);

pub fn build_auth_governor(config: &Configure) -> AuthGovernor {
    let rl = &config.auth.rate_limit;
    if !rl.enabled {
        return AuthGovernor(None);
    }

    let burst = rl.burst_size.max(1);
    let rpm = rl.requests_per_minute.max(1);

    let mut builder = GovernorConfigBuilder::default();
    let mut builder = builder.key_extractor(ClientIpKeyExtractor::new(config.auth.trust_proxy));
    builder.burst_size(burst).requests_per_minute(rpm);

    let governor = builder.finish().expect("valid auth governor config");
    AuthGovernor(Some(Arc::new(governor)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test::TestRequest;

    #[test]
    fn extractor_unknown_peer_errors() {
        let req = TestRequest::default().to_srv_request();
        let extractor = ClientIpKeyExtractor::new(false);
        assert!(extractor.extract(&req).is_err());
    }
}
