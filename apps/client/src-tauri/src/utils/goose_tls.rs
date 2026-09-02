//! TLS 证书指纹 pinning（goose serve 自签证书）。

use std::sync::Arc;
use std::time::Duration;

use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::crypto::{verify_tls12_signature, verify_tls13_signature, CryptoProvider};
use rustls::pki_types::{CertificateDer, ServerName, UnixTime};
use rustls::{DigitallySignedStruct, Error as TlsError, SignatureScheme};
use sha2::{Digest, Sha256};
use tokio_tungstenite::Connector;

use super::goose_serve::normalize_fingerprint;

#[derive(Debug)]
pub struct FingerprintVerifier {
    expected: String,
}

impl FingerprintVerifier {
    pub fn new(expected: &str) -> Self {
        Self {
            expected: normalize_fingerprint(expected),
        }
    }
}

impl ServerCertVerifier for FingerprintVerifier {
    fn verify_server_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _server_name: &ServerName<'_>,
        _ocsp_response: &[u8],
        _now: UnixTime,
    ) -> Result<ServerCertVerified, TlsError> {
        let digest = Sha256::digest(end_entity.as_ref());
        let actual = hex::encode(digest);
        if actual == self.expected {
            Ok(ServerCertVerified::assertion())
        } else {
            Err(TlsError::General(format!(
                "TLS fingerprint mismatch: expected {}, got {actual}",
                self.expected
            )))
        }
    }

    fn verify_tls12_signature(
        &self,
        message: &[u8],
        cert: &CertificateDer<'_>,
        dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, TlsError> {
        verify_tls12_signature(
            message,
            cert,
            dss,
            &CryptoProvider::get_default()
                .expect("rustls CryptoProvider")
                .signature_verification_algorithms,
        )
    }

    fn verify_tls13_signature(
        &self,
        message: &[u8],
        cert: &CertificateDer<'_>,
        dss: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, TlsError> {
        verify_tls13_signature(
            message,
            cert,
            dss,
            &CryptoProvider::get_default()
                .expect("rustls CryptoProvider")
                .signature_verification_algorithms,
        )
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        CryptoProvider::get_default()
            .expect("rustls CryptoProvider")
            .signature_verification_algorithms
            .supported_schemes()
    }
}

pub fn install_crypto_provider() {
    let _ = rustls::crypto::ring::default_provider().install_default();
}

pub fn rustls_client_config(fingerprint: &str) -> Result<rustls::ClientConfig, String> {
    install_crypto_provider();
    let verifier = Arc::new(FingerprintVerifier::new(fingerprint));
    let mut config = rustls::ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(verifier)
        .with_no_client_auth();
    config.alpn_protocols = vec![b"http/1.1".to_vec()];
    Ok(config)
}

pub fn tungstenite_connector(fingerprint: &str) -> Result<Connector, String> {
    let config = rustls_client_config(fingerprint)?;
    Ok(Connector::Rustls(Arc::new(config)))
}

pub async fn https_status_ok(port: u16, fingerprint: &str) -> bool {
    let url = format!("https://127.0.0.1:{port}/status");
    let Ok(config) = rustls_client_config(fingerprint) else {
        return false;
    };
    let client = match reqwest::Client::builder()
        .use_preconfigured_tls(config)
        .timeout(Duration::from_secs(2))
        .build()
    {
        Ok(client) => client,
        Err(_) => return false,
    };
    match client.get(url).send().await {
        Ok(response) => response.status().is_success(),
        Err(_) => false,
    }
}
