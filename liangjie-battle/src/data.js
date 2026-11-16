/**
 * @module data
 * @description Pure-data catalogue: weapons, passives, enemies, bosses, wave
 * director timeline, achievement definitions and unlock map. Behaviour lives
 * elsewhere (`weapons.js`, `entities.js`, `achievements.js`); this module is
 * intentionally side-effect free so it can be diffed during balancing.
 *
 * Dependencies: none.
 *
 * Exports:
 *   - {Record<string, WeaponDef>} WEAPONS
 *   - {Record<string, PassiveDef>} PASSIVES
 *   - {Record<string, EnemyDef>} ENEMIES
 *   - {Record<string, BossDef>} BOSSES
 *   - {WaveDef[]} WAVES
 *   - {AchievementDef[]} ACHIEVEMENTS
 *   - {Record<string, UnlockDef>} UNLOCKS
 */

// ---------------------------------------------------------------------------
// Weapons
// Level scaling is uniform: damage +20% per level, cooldown ×0.92, range +10%.
// Level 5 triggers a weapon's "evolution" flag (see weapons.js).
// ---------------------------------------------------------------------------
// 两界之间 · 武器系统
// 主角是裂隙管理局基层勤务员，可同时使用地球科技装备与修仙灵气术法。
// 每把武器在 5 级时进化。
export const WEAPONS = {
    WHIP: {
        id: 'whip',
        name: '灵气飞剑',
        icon: '🗡️',
        description: '飞剑向两侧挥斩。进化：万剑归宗，周身环绕剑气。',
        baseDamage: 20,
        baseCooldown: 1.5,
        baseRange: 90,
        projectileCount: 1,
        piercing: false,
        type: 'melee',
        school: 'qi',
        evolveLevel: 5,
        evolveName: '万剑归宗'
    },
    MAGIC_WAND: {
        id: 'magic_wand',
        name: '量子追踪弹',
        icon: '🔮',
        description: '自动追踪最近敌人的灵能弹。进化：三连弹幕风暴。',
        baseDamage: 15,
        baseCooldown: 1.2,
        baseRange: 320,
        projectileCount: 1,
        piercing: false,
        type: 'projectile',
        school: 'tech',
        speed: 420,
        homing: true,
        evolveLevel: 5,
        evolveName: '弹幕风暴'
    },
    KNIFE: {
        id: 'knife',
        name: '灵能飞刀',
        icon: '🔪',
        description: '穿透前方的灵能飞刀。进化：五芒星刃扇。',
        baseDamage: 12,
        baseCooldown: 0.4,
        baseRange: 420,
        projectileCount: 1,
        piercing: true,
        type: 'projectile',
        school: 'tech',
        speed: 620,
        evolveLevel: 5,
        evolveName: '五芒星刃',
        evolveBonusCrit: 0.1
    },
    ORBIT: {
        id: 'orbit',
        name: '护身灵环',
        icon: '💫',
        description: '旋转的灵环碎片环绕护体。进化：双环同转。',
        baseDamage: 16,
        baseCooldown: 0.4,
        baseRange: 120,
        projectileCount: 2,
        piercing: true,
        type: 'orbit',
        school: 'qi',
        evolveLevel: 5,
        evolveName: '双环护体',
        evolveDamageMult: 1.1
    },
    LIGHTNING: {
        id: 'lightning',
        name: '天雷符',
        icon: '⚡',
        description: '召唤天雷劈击随机敌人。3级后连锁。进化：雷霆万钧。',
        baseDamage: 35,
        baseCooldown: 3.0,
        baseRange: 420,
        piercing: true,
        type: 'instant',
        school: 'qi',
        chain: true,
        chainCount: 3,
        evolveLevel: 5,
        evolveName: '雷霆万钧',
        evolveBonusCrit: 0.15
    },
    MINE: {
        id: 'mine',
        name: '灵气地雷',
        icon: '💣',
        description: '布置延迟引爆的灵能地雷。进化：子母雷。',
        baseDamage: 45,
        baseCooldown: 2.2,
        baseRange: 100,
        projectileCount: 1,
        piercing: true,
        type: 'mine',
        school: 'qi',
        fuse: 1.2,
        evolveLevel: 5,
        evolveName: '子母雷'
    },
    GARLIC: {
        id: 'garlic',
        name: '灵气护体',
        icon: '🛡️',
        description: '周身持续灵气场，灼伤近身敌人。',
        baseDamage: 5,
        baseCooldown: 0.2,
        baseRange: 110,
        piercing: true,
        type: 'aura',
        school: 'qi',
        continuous: true
    },
    // --- 进阶武器 --------------------------------------------------------
    FROST_NOVA: {
        id: 'frost_nova',
        name: '冰霜法阵',
        icon: '❄️',
        description: '扩散冰环减速范围内敌人。进化：双环冰川崩塌。',
        baseDamage: 28,
        baseCooldown: 3.2,
        baseRange: 200,
        projectileCount: 1,
        piercing: true,
        type: 'nova',
        school: 'qi',
        slowPct: 0.5,
        slowDuration: 1.2,
        evolveLevel: 5,
        evolveName: '冰川崩塌'
    },
    SOUL_DRAIN: {
        id: 'soul_drain',
        name: '吸魂术',
        icon: '🩸',
        description: '灵能光束连接最近敌人，持续吸取生命。进化：噬魂双链。',
        baseDamage: 8,
        baseCooldown: 0.25,
        baseRange: 260,
        projectileCount: 1,
        piercing: true,
        type: 'drain',
        school: 'qi',
        lifestealPct: 0.25,
        evolveLevel: 5,
        evolveName: '噬魂双链'
    },
    BOOMERANG: {
        id: 'boomerang',
        name: '回旋灵镖',
        icon: '🪃',
        description: '掷出后自动回旋的灵镖。进化：双弧斩。',
        baseDamage: 18,
        baseCooldown: 1.1,
        baseRange: 340,
        projectileCount: 1,
        piercing: true,
        type: 'projectile',
        school: 'tech',
        speed: 380,
        boomerang: true,
        evolveLevel: 5,
        evolveName: '双弧斩',
        evolveCooldownMult: 0.95
    },
    // --- 隐藏武器：科乐美秘技解锁 ----------------------------------------
    RETRO_BLASTER: {
        id: 'retro_blaster',
        name: '复古像素炮',
        icon: '👾',
        description: '8-bit 街机光束，向前穿透齐射。进化：像素风暴。',
        baseDamage: 14,
        baseCooldown: 0.5,
        baseRange: 480,
        projectileCount: 2,
        piercing: true,
        type: 'projectile',
        school: 'tech',
        speed: 700,
        evolveLevel: 5,
        evolveName: '像素风暴',
        projectileColor: '#22d3ee',
        evolveProjectileColor: '#a78bfa',
        evolveProjectileCount: 4,
        evolveSpreadDeg: 30
    },
    // --- 科技流派武器 ----------------------------------------------------
    // 与灵气术法并行的地球科技线：高消耗、高爆发，靠装备与自动化作战。
    TECH_RAILGUN: {
        id: 'tech_railgun',
        name: '电磁轨道炮',
        icon: '🔫',
        description: '蓄能后射出高速弹丸，单发高伤并穿透敌群。进化：湮灭轨道炮。',
        baseDamage: 55,
        baseCooldown: 2.6,
        baseRange: 560,
        projectileCount: 1,
        piercing: true,
        type: 'projectile',
        school: 'tech',
        speed: 900,
        evolveLevel: 5,
        evolveName: '湮灭轨道炮',
        projectileColor: '#f97316',
        evolveProjectileColor: '#ef4444',
        evolveProjectileCount: 3,
        evolveSpreadDeg: 12,
        evolveDamageMult: 1.3
    },
    TECH_DRONE: {
        id: 'tech_drone',
        name: '僚机无人机',
        icon: '🛸',
        description: '释放环绕护主的僚机无人机，撞击沿途敌人。进化：蜂群协议。',
        baseDamage: 12,
        baseCooldown: 0.5,
        baseRange: 135,
        projectileCount: 2,
        piercing: true,
        type: 'orbit',
        school: 'tech',
        evolveLevel: 5,
        evolveName: '蜂群协议',
        orbitColor: '#22d3ee',
        evolveOrbitColor: '#a78bfa',
        evolveOrbitExtra: 2
    },
    TECH_GRENADE: {
        id: 'tech_grenade',
        name: '脉冲手雷',
        icon: '🧨',
        description: '投下短引信脉冲手雷，瞬间清空落点周围的敌人。进化：聚变脉冲。',
        baseDamage: 40,
        baseCooldown: 2.4,
        baseRange: 110,
        projectileCount: 1,
        piercing: true,
        type: 'mine',
        school: 'tech',
        fuse: 0.8,
        evolveLevel: 5,
        evolveName: '聚变脉冲',
        mineColor: '#22d3ee',
        evolveMineColor: '#a78bfa',
        evolveRadiusMult: 1.5,
        evolveDamageMult: 1.4
    },
    TECH_TURRET: {
        id: 'tech_turret',
        name: '自动炮塔',
        icon: '🤖',
        description: '部署自动索敌炮塔，周期性炮击范围内目标。进化：交叉火力网。',
        baseDamage: 20,
        baseCooldown: 1.4,
        baseRange: 300,
        piercing: true,
        type: 'instant',
        school: 'tech',
        evolveLevel: 5,
        evolveName: '交叉火力网',
        turretColor: '#22d3ee',
        evolveTurretColor: '#a78bfa',
        evolveStrikes: 3
    }
};

// ---------------------------------------------------------------------------
// Passives (stackable up to CONFIG.PASSIVE_MAX_STACK)
// ---------------------------------------------------------------------------
// 两界之间 · 被动强化
// 灵气修炼与科技装备的结合，每级叠加效果。
export const PASSIVES = {
    MAX_HP: {
        id: 'max_hp',
        name: '灵体魄',
        icon: '❤️',
        description: '最大生命 +20%',
        effect: { maxHpMult: 0.2 }
    },
    RECOVERY: {
        id: 'recovery',
        name: '灵气回复',
        icon: '💚',
        description: '生命回复 +0.5/秒',
        effect: { hpRegen: 0.5 }
    },
    ARMOR: {
        id: 'armor',
        name: '护甲',
        icon: '🛡️',
        description: '受到伤害 -1',
        effect: { armor: 1 }
    },
    MOVESPEED: {
        id: 'movespeed',
        name: '身法',
        icon: '👟',
        description: '移动速度 +10%',
        effect: { speedMult: 0.1 }
    },
    MIGHT: {
        id: 'might',
        name: '力量',
        icon: '💪',
        description: '伤害 +10%',
        effect: { damageMult: 0.1 }
    },
    AREA: {
        id: 'area',
        name: '范围',
        icon: '📏',
        description: '武器范围 +10%',
        effect: { areaMult: 0.1 }
    },
    COOLDOWN: {
        id: 'cooldown',
        name: '冷却',
        icon: '⏱️',
        description: '攻击速度 +8%',
        effect: { cooldownMult: -0.08 }
    },
    MAGNET: {
        id: 'magnet',
        name: '磁吸',
        icon: '🧲',
        description: '拾取范围 +25%',
        effect: { magnetMult: 0.25 }
    },
    GROWTH: {
        id: 'growth',
        name: '成长',
        icon: '📈',
        description: '经验获取 +10%',
        effect: { expMult: 0.1 }
    },
    LUCK: {
        id: 'luck',
        name: '气运',
        icon: '🍀',
        description: '暴击率 +5%',
        effect: { critChance: 0.05 }
    },
    DODGE: {
        id: 'dodge',
        name: '闪避',
        icon: '💨',
        description: '闪避几率 +5%',
        effect: { dodgeChance: 0.05 }
    },
    MAGNET_PLUS: {
        id: 'magnet_plus',
        name: '磁吸+',
        icon: '🧲',
        description: '拾取范围 +35%',
        effect: { magnetMult: 0.35 }
    },
    DAMAGE_REDUCTION: {
        id: 'damage_reduction',
        name: '壁垒',
        icon: '🛡️',
        description: '受到伤害 -8%',
        effect: { damageReduction: 0.08 }
    }
};

// ---------------------------------------------------------------------------
// Enemies
// Five distinct archetypes + legacy types kept for backwards compat.
// New archetype flags (all optional):
//   ranged:     fires projectiles at the player
//   splitter:   on death, spawns splitChildren × ENEMIES.splitInto
//   dasher:     charges forward in short bursts
//   shielded:   takes reduced damage until shield breaks
// ---------------------------------------------------------------------------
// 两界之间 · 敌人
// 污秽之气侵蚀后的变异生物与异常空间产物。
export const ENEMIES = {
    BAT: {
        id: 'bat',
        name: '污染蝙蝠',
        archetype: 'chaser',
        hp: 15,
        speed: 110,
        damage: 10,
        exp: 10,
        color: '#8844ff',
        size: 12
    },
    ZOMBIE: {
        id: 'zombie',
        name: '腐化行者',
        archetype: 'chaser',
        hp: 30,
        speed: 70,
        damage: 15,
        exp: 15,
        color: '#44aa44',
        size: 18
    },
    SKELETON: {
        id: 'skeleton',
        name: '骸骨战士',
        archetype: 'chaser',
        hp: 25,
        speed: 95,
        damage: 12,
        exp: 12,
        color: '#dddddd',
        size: 14
    },
    WOLF: {
        id: 'wolf',
        name: '污秽狂狼',
        archetype: 'dasher',
        dasher: true,
        dashSpeed: 320,
        dashInterval: 3.5,
        dashDuration: 0.6,
        hp: 40,
        speed: 150,
        damage: 20,
        exp: 20,
        color: '#aa6644',
        size: 16
    },
    GOLEM: {
        id: 'golem',
        name: '灵矿傀儡',
        archetype: 'shielded',
        shielded: true,
        shieldHp: 60,
        damageReduction: 0.5,
        hp: 120,
        speed: 45,
        damage: 30,
        exp: 50,
        color: '#888888',
        size: 28
    },
    GHOST: {
        id: 'ghost',
        name: '怨灵',
        archetype: 'chaser',
        hp: 20,
        speed: 130,
        damage: 18,
        exp: 18,
        color: '#88ccff',
        size: 15,
        ghost: true
    },
    MAGE: {
        id: 'mage',
        name: '邪修',
        archetype: 'ranged',
        ranged: true,
        firingRange: 360,
        keepDistance: 260,
        projectileSpeed: 220,
        projectileDamage: 14,
        fireCooldown: 2.4,
        hp: 28,
        speed: 70,
        damage: 8,
        exp: 22,
        color: '#cc44cc',
        size: 14
    },
    SLIME: {
        id: 'slime',
        name: '污秽软泥',
        archetype: 'splitter',
        splitter: true,
        splitCount: 2,
        hp: 55,
        speed: 65,
        damage: 14,
        exp: 24,
        color: '#33cc88',
        size: 20
    },
    SLIMELING: {
        id: 'slimeling',
        name: '小污秽',
        archetype: 'chaser',
        hp: 18,
        speed: 105,
        damage: 8,
        exp: 6,
        color: '#66ddaa',
        size: 10
    },
    BOMBER: {
        id: 'bomber',
        name: '自爆虫',
        archetype: 'bomber',
        bomber: true,
        fuseRange: 80,
        fuseTime: 1.4,
        blastRadius: 120,
        blastDamage: 40,
        hp: 35,
        speed: 120,
        damage: 10,
        exp: 28,
        color: '#ff6644',
        size: 14
    },
    ILLUSIONIST: {
        id: 'illusionist',
        name: '幻术师',
        archetype: 'illusionist',
        illusionist: true,
        cloneCooldown: 5.5,
        cloneCount: 2,
        hp: 42,
        speed: 95,
        damage: 12,
        exp: 30,
        color: '#cc88ff',
        size: 15
    }
};

// Splitter produces this type (lookup by id to avoid circular assignment).
ENEMIES.SLIME.splitInto = 'slimeling';

// ---------------------------------------------------------------------------
// Bosses
// Mid-boss at 5:00, final boss at 10:00 (default). Each has a signature ability.
// ---------------------------------------------------------------------------
// 两界之间 · Boss
// 污秽之气聚合体与裂隙深处的强大存在。
export const BOSSES = {
    REAPER: {
        id: 'reaper',
        name: '侵蚀者',
        hp: 2500,
        speed: 80,
        damage: 40,
        exp: 500,
        color: '#220033',
        size: 48,
        boss: true,
        ability: 'summon',
        spawnAt: 300
    },
    VOID_LORD: {
        id: 'void_lord',
        name: '裂隙领主',
        hp: 6000,
        speed: 60,
        damage: 60,
        exp: 1200,
        color: '#550077',
        size: 64,
        boss: true,
        ability: 'charge',
        spawnAt: 600
    },
    NECROMANCER: {
        id: 'necromancer',
        name: '死灵修士',
        hp: 4200,
        speed: 70,
        damage: 50,
        exp: 850,
        color: '#3a1a4a',
        size: 54,
        boss: true,
        ability: 'summon',
        spawnAt: 450
    },
    CHRONO_LICH: {
        id: 'chrono_lich',
        name: '时空巫妖',
        hp: 10000,
        speed: 55,
        damage: 75,
        exp: 2000,
        color: '#0b2a4a',
        size: 72,
        boss: true,
        ability: 'charge',
        spawnAt: 720
    },
    ICE_QUEEN: {
        id: 'ice_queen',
        name: '寒霜仙子',
        hp: 6200,
        speed: 55,
        damage: 60,
        exp: 1300,
        color: '#88ccff',
        size: 66,
        boss: true,
        ability: 'charge',
        spawnAt: 660,
        iceQueen: true
    }
};

// ---------------------------------------------------------------------------
// Wave director: each entry is a window [from, to) (seconds) listing the pool
// of enemies that may spawn, plus a spawn-rate multiplier. The director falls
// back to the final entry once gameTime exceeds the last window.
// ---------------------------------------------------------------------------
export const WAVES = [
    { from: 0, to: 30, pool: ['bat', 'zombie'], spawnMult: 1.0, label: 'Opening' },
    { from: 30, to: 60, pool: ['bat', 'zombie', 'skeleton'], spawnMult: 1.1, label: 'Wave 2' },
    {
        from: 60,
        to: 90,
        pool: ['zombie', 'skeleton', 'mage'],
        spawnMult: 1.15,
        label: 'Cultists'
    },
    {
        from: 90,
        to: 120,
        pool: ['skeleton', 'wolf', 'ghost', 'mage'],
        spawnMult: 1.2,
        label: 'Pack'
    },
    {
        from: 120,
        to: 180,
        pool: ['wolf', 'ghost', 'slime', 'mage', 'bomber'],
        spawnMult: 1.3,
        label: 'Splitters'
    },
    {
        from: 180,
        to: 240,
        pool: ['wolf', 'golem', 'ghost', 'slime', 'bomber'],
        spawnMult: 1.4,
        label: 'Vanguard'
    },
    {
        from: 240,
        to: 300,
        pool: ['golem', 'ghost', 'slime', 'mage', 'illusionist'],
        spawnMult: 1.5,
        label: 'Pressure'
    },
    {
        from: 300,
        to: 420,
        pool: ['wolf', 'golem', 'ghost', 'slime', 'mage', 'bomber', 'illusionist'],
        spawnMult: 1.6,
        label: 'Post-Reaper'
    },
    {
        from: 420,
        to: 600,
        pool: ['golem', 'slime', 'mage', 'ghost', 'wolf', 'illusionist'],
        spawnMult: 1.75,
        label: 'Escalation'
    },
    {
        from: 600,
        to: Infinity,
        pool: ['golem', 'slime', 'mage', 'ghost', 'wolf', 'skeleton', 'bomber', 'illusionist'],
        spawnMult: 2.0,
        label: 'Endgame'
    }
];

// ---------------------------------------------------------------------------
// Achievements: condition evaluated at end-of-run + continuously in-game.
// `check(ctx)` returns true when unlocked. `ctx` = { game, run }
// ---------------------------------------------------------------------------
// 两界之间 · 成就
export const ACHIEVEMENTS = [
    {
        id: 'first_blood',
        name: '初战告捷',
        icon: '🗡️',
        description: '击败第一个敌人。',
        check: (c) => c.game.kills >= 1
    },
    {
        id: 'slayer_100',
        name: '百夫长',
        icon: '🎯',
        description: '单局击败 100 个敌人。',
        check: (c) => c.game.kills >= 100
    },
    {
        id: 'slayer_1000',
        name: '军团终结者',
        icon: '🏆',
        description: '单局击败 1000 个敌人。',
        check: (c) => c.game.kills >= 1000
    },
    {
        id: 'boss_slayer',
        name: '侵蚀者陨落',
        icon: '☠️',
        description: '击败中期 Boss 侵蚀者。',
        check: (c) => !!c.run.bossesDefeated?.reaper
    },
    {
        id: 'void_breaker',
        name: '裂隙破碎者',
        icon: '🌌',
        description: '击败裂隙领主。',
        check: (c) => !!c.run.bossesDefeated?.void_lord
    },
    {
        id: 'survive_5min',
        name: '五分钟坚守',
        icon: '⏱️',
        description: '存活 5 分钟。',
        check: (c) => c.game.gameTime >= 300
    },
    {
        id: 'survive_10min',
        name: '十分钟泰坦',
        icon: '🔥',
        description: '存活 10 分钟。',
        check: (c) => c.game.gameTime >= 600
    },
    {
        id: 'survive_15min',
        name: '一刻钟',
        icon: '⌛',
        description: '存活 15 分钟。',
        check: (c) => c.game.gameTime >= 900
    },
    {
        id: 'weapon_max',
        name: '精通',
        icon: '🌟',
        description: '任意武器升至满级。',
        check: (c) => !!c.run.maxedWeapon
    },
    {
        id: 'untouchable',
        name: '不可触碰',
        icon: '🛡️',
        description: '连续 60 秒未受伤害。',
        check: (c) => (c.run.longestUnhit || 0) >= 60
    },
    {
        id: 'xp_hoarder',
        name: '灵气囤积者',
        icon: '💎',
        description: '单局收集 100 个经验球。',
        check: (c) => (c.run.orbsCollected || 0) >= 100
    },
    {
        id: 'level_20',
        name: '修为圆满',
        icon: '📈',
        description: '角色达到 20 级。',
        check: (c) => c.game.player?.level >= 20
    },
    {
        id: 'speed_demon',
        name: '疾风',
        icon: '💨',
        description: '5 分钟内击败裂隙领主。',
        check: (c) =>
            !!c.run.bossesDefeated?.void_lord && (c.run.realSecondsToVoidLord || Infinity) < 300
    },
    {
        id: 'no_hit_boss',
        name: '完美对决',
        icon: '🕊️',
        description: '无伤击败任意 Boss。',
        check: (c) => !!c.run.noHitBoss
    },
    {
        id: 'max_all',
        name: '全精通',
        icon: '👑',
        description: '单局所有武器槽升至满级。',
        check: (c) => (c.run.maxedWeaponCount || 0) >= 6
    },
    {
        id: 'early_evolve',
        name: '早熟进化',
        icon: '🔮',
        description: '7 分钟前进化一把武器。',
        check: (c) => !!c.run.evolvedBefore?.sevenMin
    },
    {
        id: 'triple_build',
        name: '三重流派',
        icon: '🎲',
        description: '完成 3 种不同武器组合的对局。',
        check: (c) => (c.game.save?.totals?.uniqueBuilds || 0) >= 3
    },
    {
        id: 'zen_5min',
        name: '炼气者',
        icon: '🧘',
        description: '存活 5 分钟且未拾取任何被动。',
        check: (c) => c.game.gameTime >= 300 && (c.run.passivesPicked || 0) === 0
    },
    {
        id: 'konami_code',
        name: '科乐美秘技',
        icon: '🎮',
        description: '发现传说中的秘技，解锁复古像素炮。',
        hidden: true,
        check: (c) => !!c.run.konamiCode
    },
    {
        id: 'speedrun_plus',
        name: '极速通关+',
        icon: '⚡',
        description: '5 分钟内击败一个主要 Boss，解锁拖尾特效。',
        hidden: true,
        check: (c) => !!c.run.fastBossClear
    },
    {
        id: 'pacifist_provoked',
        name: '隐世高人',
        icon: '🕊️',
        description: '零击杀存活 60 秒，解锁特殊 Boss 称号。',
        hidden: true,
        check: (c) => (c.run.pacifistTimer || 0) >= 60 && c.game.kills === 0
    }
];

// ---------------------------------------------------------------------------
// Unlocks: achievement id → weapon id granted as starter-weapon option.
// ---------------------------------------------------------------------------
export const UNLOCKS = {
    first_blood: { weapon: 'magic_wand' },
    slayer_100: { weapon: 'knife' },
    survive_5min: { weapon: 'orbit' },
    boss_slayer: { weapon: 'lightning' },
    survive_10min: { weapon: 'mine' },
    // v2.4 unlocks
    survive_15min: { weapon: 'boomerang' },
    void_breaker: { weapon: 'frost_nova' },
    speed_demon: { weapon: 'soul_drain' },
    // iter-20: easter-egg unlocks. Konami grants a starter weapon, the
    // other two unlock cosmetic flags consumed by the renderer / UI but
    // are still surfaced as standard UNLOCKS entries so the achievement
    // gallery can show their reward chip consistently.
    konami_code: { weapon: 'retro_blaster' },
    speedrun_plus: { cosmetic: 'sprite_trail' },
    pacifist_provoked: { cosmetic: 'boss_title_pacifist' }
};
