// 两界之间 · 场景键名常量
export const SceneKeys = {
  Boot: 'BootScene',
  WorldMap: 'WorldMapScene',
  Town: 'TownScene',
  Battle: 'BattleScene'
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
