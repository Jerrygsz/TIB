// 两界之间 · 玩家进度存档
// 统一管理跨场景的角色成长数据（等级、灵石、灵草、已解锁节点），
// 战斗结算、城镇交易、实验室研究都读写这里。
import type { BattleResult, BattleReward, PlayerProgress } from '../types';

const STORAGE_KEY = 'liangjie:progress:v1';

/** 节点解锁规则：清理某个节点后额外解锁哪些节点 */
const UNLOCK_RULES: Record<string, string[]> = {
  field_contaminated: ['rift_alpha'],
  rift_alpha: ['ruins_sunken']
};

/** 基础解锁节点（无需战斗即可前往） */
const BASE_UNLOCKED = ['city_hope', 'town_qinghe', 'field_contaminated'];

export const DEFAULT_PROGRESS: PlayerProgress = {
  level: 1,
  exp: 0,
  hp: 100,
  maxHp: 100,
  spiritStones: 0,
  herbs: 0,
  techPoints: 0,
  stamina: 100,
  staminaMax: 100,
  staminaLastChecked: Date.now(),
  lastWorkAt: 0,
  unlockedNodes: [...BASE_UNLOCKED],
  clearedNodes: [],
  battleCount: 0,
  totalKills: 0,
  bestTime: 0,
  bossKills: 0
};

/** 体力每秒恢复 1 点 */
const STAMINA_REGEN_PER_SEC = 1;
/** 种灵草消耗体力 */
export const HERB_STAMINA_COST = 20;
/** 挖矿消耗体力 */
export const MINE_STAMINA_COST = 30;
/** 出勤冷却：8 小时（ms） */
export const WORK_COOLDOWN_MS = 8 * 60 * 60 * 1000;

export function expToNext(level: number): number {
  return 100 + (level - 1) * 60;
}

/**
 * 检查并执行升级：经验足够时循环升级，每级 +10 最大生命并回满。
 * 返回是否发生了升级。原地修改传入的 progress 对象。
 */
export function tryLevelUp(progress: PlayerProgress): boolean {
  let leveledUp = false;
  while (progress.exp >= expToNext(progress.level)) {
    progress.exp -= expToNext(progress.level);
    progress.level += 1;
    progress.maxHp += 10;
    progress.hp = progress.maxHp;
    leveledUp = true;
  }
  return leveledUp;
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS, unlockedNodes: [...BASE_UNLOCKED] };
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...structuredClone(DEFAULT_PROGRESS),
      ...parsed,
      unlockedNodes: Array.from(
        new Set([...BASE_UNLOCKED, ...(parsed.unlockedNodes || [])])
      )
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* 隐私模式下 localStorage 可能不可用，静默降级为内存态 */
  }
}

export function resetProgress(): PlayerProgress {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEFAULT_PROGRESS);
}

export function isNodeUnlocked(nodeId: string, progress: PlayerProgress): boolean {
  return progress.unlockedNodes.includes(nodeId);
}

/** 结算一场战斗：发奖励、升级、解锁新区域，并写回存档。 */
export function applyBattleResult(result: BattleResult): BattleReward {
  const progress = loadProgress();
  const seconds = Math.max(0, Math.floor(result.time));

  const spiritStones = result.kills * 2 + seconds * 2 + result.bossKills * 150;
  const herbs = Math.floor(result.kills / 25) + result.bossKills;
  let expGain = result.kills * 2 + Math.floor(seconds / 5) * 3;

  progress.spiritStones += spiritStones;
  progress.herbs += herbs;
  progress.battleCount += 1;
  progress.totalKills += result.kills;
  progress.bossKills += result.bossKills;
  progress.bestTime = Math.max(progress.bestTime, seconds);
  progress.exp += expGain;

  // 升级：每级提升最大生命并回满
  const leveledUp = tryLevelUp(progress);

  // 记录清理状态并解锁后续节点
  const unlocked: string[] = [];
  if (!progress.clearedNodes.includes(result.nodeId)) {
    progress.clearedNodes.push(result.nodeId);
  }
  for (const next of UNLOCK_RULES[result.nodeId] || []) {
    if (!progress.unlockedNodes.includes(next)) {
      progress.unlockedNodes.push(next);
      unlocked.push(next);
    }
  }

  saveProgress(progress);

  return {
    spiritStones,
    herbs,
    exp: expGain,
    leveledUp,
    level: progress.level,
    unlocked
  };
}

/** 按真实流逝时间恢复体力，并写回存档。 */
export function regenerateStamina(progress?: PlayerProgress): PlayerProgress {
  const p = progress || loadProgress();
  const now = Date.now();
  const elapsed = Math.max(0, Math.floor((now - p.staminaLastChecked) / 1000));
  if (elapsed > 0 && p.stamina < p.staminaMax) {
    p.stamina = Math.min(p.staminaMax, p.stamina + elapsed * STAMINA_REGEN_PER_SEC);
  }
  p.staminaLastChecked = now;
  saveProgress(p);
  return p;
}

export interface HerbResult {
  ok: boolean;
  herbs: number;
  exp: number;
  leveledUp: boolean;
  reason?: string;
}

/** 种灵草：消耗体力获得灵草与经验 */
export function collectHerb(): HerbResult {
  const p = regenerateStamina();
  if (p.stamina < HERB_STAMINA_COST) {
    return { ok: false, herbs: 0, exp: 0, leveledUp: false, reason: `体力不足（需 ${HERB_STAMINA_COST}）` };
  }
  p.stamina -= HERB_STAMINA_COST;
  const herbs = 1 + Math.floor(p.level / 3);
  const exp = 5 + p.level;
  p.herbs += herbs;
  p.exp += exp;
  const leveledUp = tryLevelUp(p);
  saveProgress(p);
  return { ok: true, herbs, exp, leveledUp };
}

export interface MineResult {
  ok: boolean;
  spiritStones: number;
  techPoints: number;
  exp: number;
  leveledUp: boolean;
  reason?: string;
}

/** 挖矿：消耗体力获得灵石，少量概率产出科技点 */
export function mine(): MineResult {
  const p = regenerateStamina();
  if (p.stamina < MINE_STAMINA_COST) {
    return { ok: false, spiritStones: 0, techPoints: 0, exp: 0, leveledUp: false, reason: `体力不足（需 ${MINE_STAMINA_COST}）` };
  }
  p.stamina -= MINE_STAMINA_COST;
  const stones = 20 + Math.floor(Math.random() * 31) + p.level * 2;
  const techPoints = Math.random() < 0.2 ? 1 : 0;
  const exp = 8 + p.level;
  p.spiritStones += stones;
  p.techPoints += techPoints;
  p.exp += exp;
  const leveledUp = tryLevelUp(p);
  saveProgress(p);
  return { ok: true, spiritStones: stones, techPoints, exp, leveledUp };
}

export interface WorkResult {
  ok: boolean;
  salary: number;
  remainingMs: number;
  reason?: string;
}

/** 裂隙管理局出勤打卡：每 8 小时可领一次薪水 */
export function dailyWork(): WorkResult {
  const p = loadProgress();
  const now = Date.now();
  const remaining = WORK_COOLDOWN_MS - (now - p.lastWorkAt);
  if (remaining > 0) {
    const hours = Math.ceil(remaining / (60 * 60 * 1000));
    return { ok: false, salary: 0, remainingMs: remaining, reason: `距下次出勤还有 ${hours} 小时` };
  }
  const salary = 50 + p.level * 10;
  p.spiritStones += salary;
  p.lastWorkAt = now;
  saveProgress(p);
  return { ok: true, salary, remainingMs: 0 };
}

/** 距离下次出勤还剩多少毫秒（用于 UI 展示） */
export function workRemainingMs(): number {
  const p = loadProgress();
  return Math.max(0, WORK_COOLDOWN_MS - (Date.now() - p.lastWorkAt));
}
