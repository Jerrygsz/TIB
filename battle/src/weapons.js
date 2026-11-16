/**
 * @module weapons
 * @description Single `Weapon` class that consumes a definition from
 * `data.js` and dispatches to the appropriate `_fire*` strategy each tick.
 * Level scaling formulas:
 *   damage   = base * (1 + (lvl-1) * 0.2) * player.damageMult * critMult
 *   cooldown = base * 0.92^(lvl-1) * player.cooldownMult
 *   range    = base * (1 + (lvl-1) * 0.1) * player.areaMult
 * At `lvl === def.evolveLevel` (5) the weapon enters its shape-changing
 * evolution — see `isEvolved()` and per-type handling below.
 *
 * Dependencies: `./entities.js` (Mine, OrbitShard, Projectile).
 *
 * Exports:
 *   - class Weapon
 */

import { Mine, OrbitShard, Projectile } from './entities.js';

// ---------------------------------------------------------------------------
// School synergy: holding 3+ weapons of the same school grants a flat bonus.
//   qi   (灵气): range +10%, cooldown ×0.9
//   tech (科技): damage +10%
// The knockdown is cached on the player object and only rescanned when the
// weapon roster changes (length *or* the head/tail instance differ), so the
// per-frame hot path never walks the list. The roster is append-only during a
// run (see main.js `player.weapons.push`), which makes that key sufficient.
// ---------------------------------------------------------------------------
const SCHOOL_SYNERGY_THRESHOLD = 3;
const NO_SCHOOL_SYNERGY = Object.freeze({ count: -1, qi: false, tech: false });

function getSchoolSynergy(player) {
    const weapons = player?.weapons;
    if (!Array.isArray(weapons)) return NO_SCHOOL_SYNERGY;
    const head = weapons[0];
    const tail = weapons[weapons.length - 1];
    let cache = player._schoolSynergy;
    if (!cache || cache.count !== weapons.length || cache.head !== head || cache.tail !== tail) {
        let qi = 0;
        let tech = 0;
        for (const w of weapons) {
            const school = w?.def?.school;
            if (school === 'qi') qi++;
            else if (school === 'tech') tech++;
        }
        cache = {
            count: weapons.length,
            head,
            tail,
            qi: qi >= SCHOOL_SYNERGY_THRESHOLD,
            tech: tech >= SCHOOL_SYNERGY_THRESHOLD
        };
        player._schoolSynergy = cache;
    }
    return cache;
}

export class Weapon {
    constructor(def) {
        this.def = def;
        this.id = def.id;
        this.name = def.name;
        this.icon = def.icon;
        this.level = 1;
        this.cooldown = 0;
        this._shards = null; // orbit-only
    }

    levelUp() {
        this.level++;
    }

    isEvolved() {
        return !!this.def.evolveLevel && this.level >= this.def.evolveLevel;
    }

    update(dt, player, game) {
        // Orbit weapon ticks every frame (maintains shards), but re-fires on cooldown
        // to refresh damage state. Everything else fires on its cooldown.
        if (this.def.type === 'orbit') {
            this._ensureShards(player);
            for (const s of this._shards) s.update(dt, player, game);
            return;
        }
        this.cooldown -= dt;
        if (this.cooldown <= 0) {
            this.fire(player, game);
            this.cooldown = this.getCooldown(player);
        }
    }

    getDamage(player) {
        let base = this.def.baseDamage * (1 + (this.level - 1) * 0.2) * player.getDamageMult();
        // iter-14 evolution micro-tweak: a per-weapon evolved damage scalar.
        if (this.isEvolved() && this.def.evolveDamageMult) {
            base *= this.def.evolveDamageMult;
        }
        // 科技流派协同：同流派 3 件及以上，伤害 +10%。
        if (getSchoolSynergy(player).tech) base *= 1.1;
        return base;
    }

    _rollCrit(player, game, baseDamage, x, y, color) {
        // iter-14: evolved weapons may add a flat crit-chance bonus on top
        // of the player's passive-derived crit chance. Stacks additively
        // because the player's crit chance is already a sum of LUCK stacks.
        let chance = player.getCritChance();
        if (this.isEvolved() && this.def.evolveBonusCrit) {
            chance += this.def.evolveBonusCrit;
        }
        if (chance > 0 && Math.random() < chance) {
            const dmg = baseDamage * 2;
            game.createFloatingText(Math.round(dmg), x, y, '#ffee44', { crit: true });
            return dmg;
        }
        game.createFloatingText(Math.round(baseDamage), x, y, color);
        return baseDamage;
    }

    getCooldown(player) {
        let cd = this.def.baseCooldown * Math.pow(0.92, this.level - 1) * player.getCooldownMult();
        // iter-14: evolution can shave additional cooldown (Twin Arc).
        if (this.isEvolved() && this.def.evolveCooldownMult) {
            cd *= this.def.evolveCooldownMult;
        }
        // 灵气流派协同：同流派 3 件及以上，冷却 -10%。
        if (getSchoolSynergy(player).qi) cd *= 0.9;
        return cd;
    }

    getRange(player) {
        let range = this.def.baseRange * (1 + (this.level - 1) * 0.1) * player.getAreaMult();
        // 灵气流派协同：同流派 3 件及以上，范围 +10%。
        if (getSchoolSynergy(player).qi) range *= 1.1;
        return range;
    }

    getOrbitShardCount(player) {
        // Each 2 weapon levels adds a shard; evolved doubles and mirrors.
        let n = this.def.projectileCount + Math.floor((this.level - 1) / 2);
        if (this.isEvolved()) n = n * 2;
        // 僚机无人机进化「蜂群协议」：额外增加无人机数量
        if (this.id === 'tech_drone' && this.isEvolved() && this.def.evolveOrbitExtra) {
            n += this.def.evolveOrbitExtra;
        }
        // Extra shard for every 2 cooldown passives (just a fun passive synergy).
        const extra = Math.floor((player.passives?.cooldown?.count || 0) / 2);
        return Math.min(12, n + extra);
    }

    _ensureShards(player) {
        const count = this.getOrbitShardCount(player);
        const radius = this.getRange(player);
        const dmg = this.getDamage(player);
        const evolved = this.isEvolved();
        if (!this._shards || this._shards.length !== count) {
            this._shards = [];
            for (let i = 0; i < count; i++) {
                this._shards.push(new OrbitShard(this, i, count, radius, dmg, this.id, evolved));
            }
        } else {
            // Update params in place.
            for (const s of this._shards) {
                s.radius = radius;
                s.damage = dmg;
                s.total = count;
                s.evolved = evolved;
            }
        }
    }

    renderExtras(ctx) {
        if (this.def.type === 'orbit' && this._shards) {
            for (const s of this._shards) s.render(ctx);
        }
    }

    fire(player, game) {
        switch (this.def.type) {
            case 'melee':
                return this._fireMelee(player, game);
            case 'projectile':
                return this._fireProjectile(player, game);
            case 'instant':
                return this._fireInstant(player, game);
            case 'aura':
                return this._fireAura(player, game);
            case 'mine':
                return this._fireMine(player, game);
            case 'nova':
                return this._fireNova(player, game);
            case 'drain':
                return this._fireDrain(player, game);
        }
    }

    _fireMelee(player, game) {
        const range = this.getRange(player);
        const baseDmg = this.getDamage(player);
        const hit = new Set();
        const evolved = this.isEvolved();
        // iter-16 perf: query the spatial hash for the bounding-box of the
        // sweep instead of walking every enemy. With 200 enemies on screen
        // the linear scan was ~200 hypot calls per fire — the hash trims it
        // to whatever lives in the overlapping cells (typically <30 in a
        // forest spawn cluster).
        const candidates = game?.spatial
            ? game.spatial.queryRect(player.x, player.y, Math.max(range, 40))
            : game.enemies;
        for (const enemy of candidates) {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            if (evolved) {
                // Full circular sweep
                if (Math.hypot(dx, dy) > range) continue;
            } else {
                if (Math.abs(dx) > range) continue;
                if (Math.abs(dy) > 40) continue;
            }
            if (hit.has(enemy)) continue;
            hit.add(enemy);
            const dmg = this._rollCrit(player, game, baseDmg, enemy.x, enemy.y - 20, '#ffaa00');
            enemy.takeDamage(dmg);
        }
        if (evolved) {
            game.createParticles(player.x, player.y, '#ff6644', 12);
        } else {
            game.createParticles(player.x - range / 2, player.y, '#ffaa00', 5);
            game.createParticles(player.x + range / 2, player.y, '#ffaa00', 5);
        }
        game.audio.shoot();
    }

    _fireProjectile(player, game) {
        const evolved = this.isEvolved();
        let count = this.def.projectileCount + Math.floor((this.level - 1) / 2);
        // 科技武器进化：专属弹数与散射角
        if (evolved && this.def.evolveProjectileCount) count = this.def.evolveProjectileCount;
        if (this.isEvolved() && this.id === 'knife') count = Math.max(count, 5);
        if (this.isEvolved() && this.id === 'magic_wand') count += 2;
        const spreadDeg = count > 1 ? (evolved && this.def.evolveSpreadDeg ? this.def.evolveSpreadDeg : this.isEvolved() ? 24 : 14) : 0;
        const target = game.spatial.findNearestEnemy(player.x, player.y, this.getRange(player));
        if (!target) return;
        const base = Math.atan2(target.y - player.y, target.x - player.x);
        for (let i = 0; i < count; i++) {
            const offset = ((i - (count - 1) / 2) * spreadDeg * Math.PI) / 180;
            game.projectiles.push(
                new Projectile(
                    player.x,
                    player.y,
                    base + offset,
                    this.def,
                    this.getDamage(player),
                    this.level,
                    player,
                    evolved
                )
            );
        }
        game.audio.shoot();
    }

    _fireInstant(player, game) {
        const range = this.getRange(player);
        const baseDmg = this.getDamage(player);
        // iter-16 perf: spatial probe + materialise into an array (we still
        // need indexed access for the random-pick loop and the chain hops).
        const candIter = game?.spatial
            ? game.spatial.queryRect(player.x, player.y, range)
            : game.enemies;
        const targets = [];
        for (const e of candIter) {
            if (Math.hypot(e.x - player.x, e.y - player.y) < range) targets.push(e);
        }
        if (!targets.length) return;
        const evolved = this.isEvolved();
        const isTurret = this.id === 'tech_turret';
        // 科技炮塔进化：交叉火力网，多目标同时打击
        let strikes = evolved ? Math.min(3, targets.length) : 1;
        if (isTurret && evolved && this.def.evolveStrikes) {
            strikes = Math.min(this.def.evolveStrikes, targets.length);
        }
        const turretColor = isTurret
            ? evolved
                ? this.def.evolveTurretColor || '#a78bfa'
                : this.def.turretColor || '#22d3ee'
            : '#ffff66';
        const picked = new Set();
        for (let i = 0; i < strikes; i++) {
            let target = null;
            while (picked.size < targets.length) {
                const cand = targets[Math.floor(Math.random() * targets.length)];
                if (!picked.has(cand)) {
                    target = cand;
                    picked.add(cand);
                    break;
                }
            }
            if (!target) break;
            const dmg = this._rollCrit(player, game, baseDmg, target.x, target.y - 20, turretColor);
            target.takeDamage(dmg);
            // 科技炮塔：从玩家位置向目标绘制能量光束粒子
            if (isTurret) {
                game.createParticles(target.x, target.y, turretColor, 16);
                this._drawBeam(game, player.x, player.y, target.x, target.y, turretColor);
            } else {
                game.createParticles(target.x, target.y, '#ffff66', 14);
            }

            if (this.def.chain && this.level >= 3) {
                let current = target;
                const chained = new Set([current]);
                const chainCount = evolved ? this.def.chainCount + 2 : this.def.chainCount;
                for (let c = 0; c < chainCount; c++) {
                    let nearest = null,
                        minD = Infinity;
                    // iter-16 perf: Lightning chain hops within 180 px, so
                    // a per-hop spatial probe of the same radius is the
                    // exact set we want. Drops chain cost from O(C × N) to
                    // O(C × cells_in_180px) which is small-constant on
                    // even the densest waves.
                    const hopCands = game?.spatial
                        ? game.spatial.queryRect(current.x, current.y, 180)
                        : game.enemies;
                    for (const e of hopCands) {
                        if (chained.has(e)) continue;
                        const d = Math.hypot(e.x - current.x, e.y - current.y);
                        if (d < 180 && d < minD) {
                            minD = d;
                            nearest = e;
                        }
                    }
                    if (!nearest) break;
                    nearest.takeDamage(dmg * 0.7);
                    game.createParticles(nearest.x, nearest.y, '#ffff66', 8);
                    chained.add(nearest);
                    current = nearest;
                }
            }
        }
        game.audio.shoot();
    }

    /**
     * 科技武器专属：在玩家与目标之间绘制一条瞬时能量光束（粒子链）。
     * 用于自动炮塔的炮击视觉表现。
     */
    _drawBeam(game, x1, y1, x2, y2, color) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(3, Math.floor(dist / 18));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = x1 + dx * t;
            const py = y1 + dy * t;
            game.createParticles(px, py, color, 1);
        }
    }

    _fireAura(player, game) {
        const range = this.getRange(player);
        const dmg = this.getDamage(player);
        // iter-16 perf: cells overlapping the aura radius only. Aura is
        // called every cooldown tick (~1s default) so the savings stack up.
        const candidates = game?.spatial
            ? game.spatial.queryRect(player.x, player.y, range)
            : game.enemies;
        for (const enemy of candidates) {
            const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (d < range) enemy.takeDamage(dmg);
        }
        if (Math.random() < 0.4) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * range;
            game.createParticles(
                player.x + Math.cos(a) * r,
                player.y + Math.sin(a) * r,
                '#88ff88',
                1
            );
        }
    }

    _fireMine(player, game) {
        const evolved = this.isEvolved();
        const isGrenade = this.id === 'tech_grenade';
        let radius = this.getRange(player);
        const dmg = this.getDamage(player);
        const fuse = this.def.fuse || 1.2;
        // 脉冲手雷进化「聚变脉冲」：爆炸半径扩大
        if (isGrenade && evolved && this.def.evolveRadiusMult) {
            radius *= this.def.evolveRadiusMult;
        }
        game.mines = game.mines || [];
        game.mines.push(new Mine(player.x, player.y, radius, dmg, fuse, this.id, evolved));
        if (evolved) {
            if (isGrenade) {
                // 聚变脉冲：环形布设 4 颗手雷，形成交叉覆盖
                for (let i = 0; i < 4; i++) {
                    const a = (i / 4) * Math.PI * 2;
                    game.mines.push(
                        new Mine(
                            player.x + Math.cos(a) * 70,
                            player.y + Math.sin(a) * 70,
                            radius * 0.85,
                            dmg,
                            fuse,
                            this.id,
                            evolved
                        )
                    );
                }
            } else {
                // Cluster: second mine offset slightly
                const a = Math.random() * Math.PI * 2;
                game.mines.push(
                    new Mine(
                        player.x + Math.cos(a) * 60,
                        player.y + Math.sin(a) * 60,
                        radius * 0.8,
                        dmg,
                        fuse
                    )
                );
            }
        }
        game.audio?.shoot?.();
    }

    /**
     * Frost Nova: radial burst centred on the hero that damages every foe
     * within `range` and applies a timed slow. Evolved variant fires a
     * second delayed ring at 60% strength for a staggered AOE.
     */
    _fireNova(player, game) {
        const range = this.getRange(player);
        const baseDmg = this.getDamage(player);
        const slowPct = this.def.slowPct ?? 0.5;
        const slowDur = this.def.slowDuration ?? 1.2;
        // iter-16 perf: spatial probe instead of a full enemy walk. Nova has
        // a fairly wide range (~range+nova default), so several cells are
        // visited each fire — but in dense waves this still shaves >70%
        // of the per-enemy hypot() calls.
        const candidates = game?.spatial
            ? game.spatial.queryRect(player.x, player.y, range)
            : game.enemies;
        for (const enemy of candidates) {
            const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
            if (d < range) {
                const dmg = this._rollCrit(player, game, baseDmg, enemy.x, enemy.y - 20, '#88ddff');
                enemy.takeDamage(dmg);
                // Slow is cooperative: entities.js reads `slowTimer` / `slowPct`.
                if (!enemy.slowTimer || enemy.slowTimer < slowDur) {
                    enemy.slowTimer = slowDur;
                    enemy.slowPct = slowPct;
                }
            }
        }
        game.createParticles(player.x, player.y, '#aaeeff', 24);
        if (this.isEvolved()) {
            // Queue a follow-up pulse ~0.4s later, at 60% damage. Goes through
            // the effects layer so it pauses with the game / tab visibility,
            // unlike a wall-clock setTimeout. Captures `range`/`baseDmg` at
            // fire-time so a stat change between pulses doesn't retro-buff.
            const r = range;
            const d2 = baseDmg * 0.6;
            game.effects?.schedule?.(0.4, () => {
                if (!game.player || game.player.dead) return;
                // iter-16 perf: spatial probe for the delayed pulse too —
                // by the time it fires the enemy roster may have grown,
                // and the linear scan was the dominant cost on tundra
                // when the player held an evolved nova during a heavy wave.
                const cands = game?.spatial
                    ? game.spatial.queryRect(player.x, player.y, r)
                    : game.enemies;
                for (const e of cands) {
                    const d = Math.hypot(e.x - player.x, e.y - player.y);
                    if (d < r) e.takeDamage(d2);
                }
                game.createParticles(player.x, player.y, '#88ccff', 16);
            });
        }
        game.audio?.shoot?.();
    }

    /**
     * Soul Drain: short-range tether to the nearest foe. Ticks damage each
     * fire, and heals the hero for `lifestealPct × damageDealt`. Evolved
     * variant drains two foes simultaneously.
     */
    _fireDrain(player, game) {
        const range = this.getRange(player);
        const baseDmg = this.getDamage(player);
        const steal = this.def.lifestealPct ?? 0.25;
        const targetCount = this.isEvolved() ? 2 : 1;
        const targets = [];
        // Pick nearest N enemies within range.
        const nearby = game.enemies
            .filter((e) => Math.hypot(e.x - player.x, e.y - player.y) < range)
            .sort(
                (a, b) =>
                    Math.hypot(a.x - player.x, a.y - player.y) -
                    Math.hypot(b.x - player.x, b.y - player.y)
            );
        for (let i = 0; i < targetCount && i < nearby.length; i++) targets.push(nearby[i]);
        if (!targets.length) return;
        let totalDmg = 0;
        for (const e of targets) {
            const dmg = this._rollCrit(player, game, baseDmg, e.x, e.y - 16, '#ff66aa');
            e.takeDamage(dmg);
            totalDmg += dmg;
            // Cheap "tether" visual = particle streak.
            game.createParticles((player.x + e.x) / 2, (player.y + e.y) / 2, '#ff88cc', 2);
        }
        if (player.heal) player.heal(totalDmg * steal);
    }
}
