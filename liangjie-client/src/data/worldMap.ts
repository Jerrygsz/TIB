// 两界之间 · 世界大地图数据
// L1 层：节点式导航，连接城市、野外、空间裂隙
import type { WorldMapNode } from '../types';

export const WORLD_MAP_NODES: WorldMapNode[] = [
  {
    id: 'city_hope',
    name: '新希望城',
    type: 'city',
    x: 0.2,
    y: 0.5,
    description: '地球幸存者联合议会治下的大型城市，裂隙管理局总部所在地。',
    connections: ['field_contaminated', 'town_qinghe'],
    unlocked: true
  },
  {
    id: 'town_qinghe',
    name: '清河镇',
    type: 'town',
    x: 0.5,
    y: 0.3,
    description: '修仙星球移民聚居的边境小镇，灵气与科技交融。',
    connections: ['city_hope', 'field_contaminated', 'rift_alpha'],
    unlocked: true
  },
  {
    id: 'field_contaminated',
    name: '污染山林',
    type: 'field',
    x: 0.45,
    y: 0.65,
    description: '侵蚀型污秽之气笼罩的山林，普通植物枯萎，特殊灵草却能生长。',
    connections: ['city_hope', 'town_qinghe', 'rift_alpha'],
    unlocked: true,
    combatRequired: true,
    battleStage: 'forest'
  },
  {
    id: 'rift_alpha',
    name: '不稳定裂隙 α',
    type: 'rift',
    x: 0.75,
    y: 0.5,
    description: '一处未完全稳定的空间裂隙，深处有强大的异常存在。',
    connections: ['town_qinghe', 'field_contaminated', 'ruins_sunken'],
    unlocked: false,
    unlockHint: '清理「污染山林」后解锁',
    combatRequired: true,
    battleStage: 'tundra'
  },
  {
    id: 'ruins_sunken',
    name: '沉没遗迹',
    type: 'ruins',
    x: 0.85,
    y: 0.25,
    description: '灾变前的科研设施遗迹，可能藏有时空实验的关键数据。',
    connections: ['rift_alpha'],
    unlocked: false,
    unlockHint: '清理「不稳定裂隙 α」后解锁',
    combatRequired: true,
    battleStage: 'crypt'
  }
];

/** 根据 id 获取节点 */
export function getNodeById(id: string): WorldMapNode | undefined {
  return WORLD_MAP_NODES.find((n) => n.id === id);
}
