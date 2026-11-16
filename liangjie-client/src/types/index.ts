// 两界之间 · 共享类型定义

/** 世界地图节点类型 */
export type MapNodeType = 'city' | 'town' | 'field' | 'rift' | 'ruins' | 'special';

/** 世界地图节点 */
export interface WorldMapNode {
  id: string;
  name: string;
  type: MapNodeType;
  x: number; // 归一化坐标 0~1
  y: number;
  description: string;
  /** 可前往的节点 id */
  connections: string[];
  /** 是否已解锁 */
  unlocked: boolean;
  /** 是否需要战斗才能进入 */
  combatRequired?: boolean;
  /** 未解锁时显示的解锁条件 */
  unlockHint?: string;
  /** 进入战斗时使用的战斗层关卡 id（forest / crypt / tundra） */
  battleStage?: string;
}

/** 角色成长存档 */
export interface PlayerProgress {
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  /** 灵石（货币） */
  spiritStones: number;
  /** 灵草（材料） */
  herbs: number;
  /** 科技点（实验室产出的永久强化） */
  techPoints: number;
  /** 当前体力 */
  stamina: number;
  /** 体力上限 */
  staminaMax: number;
  /** 上次体力恢复计算的时间戳（ms） */
  staminaLastChecked: number;
  /** 上次出勤打卡的时间戳（ms） */
  lastWorkAt: number;
  unlockedNodes: string[];
  clearedNodes: string[];
  battleCount: number;
  totalKills: number;
  /** 最长存活秒数 */
  bestTime: number;
  bossKills: number;
}

/** 战斗层通过 postMessage 回传的结算数据 */
export interface BattleResult {
  nodeId: string;
  stage: string;
  kills: number;
  /** 存活秒数 */
  time: number;
  level: number;
  bossKills: number;
}

/** 战斗奖励结算结果 */
export interface BattleReward {
  spiritStones: number;
  herbs: number;
  exp: number;
  leveledUp: boolean;
  level: number;
  unlocked: string[];
}

/** 场景切换数据 */
export interface SceneTransitionData {
  from?: string;
  nodeId?: string;
  [key: string]: unknown;
}

/** 城镇建筑类型 */
export type BuildingType =
  | 'shop'
  | 'inn'
  | 'lab'
  | 'office'
  | 'market'
  | 'cultivation'
  | 'portal'
  | 'house';

/** 城镇建筑 */
export interface Building {
  id: string;
  name: string;
  type: BuildingType;
  x: number;
  y: number;
  width: number;
  height: number;
}
