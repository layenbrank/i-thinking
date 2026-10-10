-- 磁贴组件改名：intelligence → agent
-- （`MagneticTile.Component` 的成员重命名，见 packages/shared/src/types/magnetic-tile.d.ts）
--
-- 只改组件名，不动 updatedAt：避免扰动镜像/同步的排序与增量判定。
UPDATE `magneticTile` SET `component` = 'agent' WHERE `component` = 'intelligence';