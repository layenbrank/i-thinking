use anyhow::{Context, Result};
use fred::clients::Pool;
use fred::prelude::*;
use fred::types::ConnectHandle;
use sha2::{Digest, Sha256};

/// Redis 连接池（fred）。启动时 `init` 并保留驱动任务句柄。
pub struct RedisPool {
    pool: Pool,
    _driver: ConnectHandle,
}

impl RedisPool {
    pub async fn new(url: &str, pool_size: usize) -> Result<Self> {
        let config = Config::from_url(url).context("invalid REDIS_URL")?;
        let pool = Builder::from_config(config)
            .build_pool(pool_size.max(1))
            .context("redis pool build failed")?;
        let driver = pool.init().await.context("redis connect failed")?;
        let _: () = pool.ping(None).await.context("redis ping failed")?;
        Ok(Self {
            pool,
            _driver: driver,
        })
    }

    pub fn pool(&self) -> &Pool {
        &self.pool
    }

    pub async fn ping(&self) -> Result<()> {
        let _: () = self.pool.ping(None).await.context("redis ping failed")?;
        Ok(())
    }

    fn blacklist_key(token: &str) -> String {
        let digest = Sha256::digest(token.as_bytes());
        let mut hex = String::with_capacity(64);
        for byte in digest {
            hex.push_str(&format!("{byte:02x}"));
        }
        format!("auth:jwt:bl:{hex}")
    }

    /// 将 JWT 写入黑名单，TTL 为剩余有效秒数（至少 1 秒）。
    pub async fn blacklist_token(&self, token: &str, ttl_secs: i64) -> Result<()> {
        let ttl = ttl_secs.max(1);
        let key = Self::blacklist_key(token);
        self.pool
            .set::<(), _, _>(key, "1", Some(Expiration::EX(ttl)), None, false)
            .await
            .context("redis blacklist set failed")?;
        Ok(())
    }

    pub async fn is_blacklisted(&self, token: &str) -> Result<bool> {
        let key = Self::blacklist_key(token);
        let exists: bool = self
            .pool
            .exists(key)
            .await
            .context("redis blacklist exists failed")?;
        Ok(exists)
    }
}
