-- 可选：按 JSON 种子全量对齐 background / textColor（SQLite）
-- 完整字段见 mirrors.ts / magnetic-tiles.ts
-- 写入 API 不含 id，id 仅用于种子文档与手工 INSERT

-- 信息类白底
UPDATE magneticTile
SET background = '{"color":"#FFFFFF"}', textColor = '#0F172A'
WHERE component IN ('countdown', 'clock', 'calendar');

UPDATE magneticTile SET background = '{"color":"#F1F5F9"}', textColor = '#0F172A' WHERE component = 'bookmark';
UPDATE magneticTile SET background = '{"color":"#E2E8F0"}', textColor = '#0F172A' WHERE component = 'code';
UPDATE magneticTile SET background = '{"color":"#DBEAFE"}', textColor = '#1E3A8A' WHERE component = 'clipchamp';
UPDATE magneticTile SET background = '{"color":"#E0E7FF"}', textColor = '#312E81' WHERE component = 'collection';
UPDATE magneticTile SET background = '{"color":"#EFF6FF"}', textColor = '#1E40AF' WHERE component = 'marketplace';
UPDATE magneticTile SET background = '{"color":"#ECFDF5"}', textColor = '#065F46' WHERE component = 'markdown';
UPDATE magneticTile SET background = '{"color":"#F5F3FF"}', textColor = '#5B21B6' WHERE component = 'morph';
UPDATE magneticTile SET background = '{"color":"#F8FAFC"}', textColor = '#0F172A' WHERE component = 'settings';
UPDATE magneticTile SET background = '{"color":"#EEF2FF"}', textColor = '#3730A3' WHERE component = 'intelligence';
UPDATE magneticTile SET background = '{"color":"#F1F5F9"}', textColor = '#334155' WHERE component = 'developer';
UPDATE magneticTile SET background = '{"color":"#FFF7ED"}', textColor = '#9A3412' WHERE component = 'gallery';
UPDATE magneticTile SET background = '{"color":"#FEF3C7"}', textColor = '#92400E' WHERE component = 'signboard';
UPDATE magneticTile SET background = '{"color":"#F0FDFA"}', textColor = '#115E59' WHERE component = 'screenshot';
UPDATE magneticTile SET background = '{"color":"#F8FAFC"}', textColor = '#0F172A' WHERE component = 'navigation';
