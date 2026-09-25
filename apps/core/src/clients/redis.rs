use anyhow::{Context, Result};
use fred::clients::Pool;
use fred::prelude::*;
use fred::types::ConnectHandle;

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
}
