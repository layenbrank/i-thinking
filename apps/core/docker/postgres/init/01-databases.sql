-- 首次 initdb（空 data/postgres）时执行。
--
-- ai-worker 连的必须是它**自己的**库：core 的业务表绝不进这里，两边只走
-- spec/internal.yaml 的三个端点 + 服务令牌。这条边界由
-- apps/ai-worker/tests/test_db_boundary.py 反证（库里只该有 OWNED_TABLES 那几张表）。
--
-- vector 扩展不在这里建：ai-worker 的 0001_init.sql 自己 CREATE EXTENSION（建在它自己的库里），
-- 业务库要向量类型时由 core 的迁移自己声明。
SELECT 'CREATE DATABASE ai_worker'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ai_worker')\gexec
