// 两界之间 · 城镇地图场景 (L2)
// 俯视角 RPG：玩家可在城镇中行走、进入建筑、与 NPC 互动
import Phaser from 'phaser';
import { SceneKeys } from '../game/SceneKeys';
import { getNodeById } from '../data/worldMap';
import { loadProgress, saveProgress, collectHerb, mine, dailyWork, workRemainingMs, regenerateStamina, HERB_STAMINA_COST, MINE_STAMINA_COST } from '../game/SaveData';
import { ensureTextures, BUILDING_TEXTURE } from '../game/Textures';
import { drawHud, openOverlay, showToast } from '../ui/Overlay';
import { VirtualJoystick } from '../ui/Joystick';
import { loadTiledMap, getLayer, renderTileLayer } from '../game/TilemapLoader';
import type { TiledMapData } from '../game/TilemapLoader';
import type { OverlayOptions } from '../ui/Overlay';
import type { SceneTransitionData, Building } from '../types';

export interface Interactable {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
}

export class TownScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private buildings: Building[] = [];
  private interactables: Interactable[] = [];
  private buildingBodies!: Phaser.Physics.Arcade.StaticGroup;
  private nodeId: string = '';
  private nearby: Interactable | null = null;
  private prompt?: Phaser.GameObjects.Text;
  private hud?: Phaser.GameObjects.Container;
  private activeOverlay?: Phaser.GameObjects.Container;
  private joystick?: VirtualJoystick;
  private interactBtn?: Phaser.GameObjects.Container;
  private mapData?: TiledMapData;

  constructor() {
    super(SceneKeys.Town);
  }

  /** 从 Phaser 缓存的 JSON 解析 Tiled 地图数据 */
  private parseTiledCache(
    mapJson: {
      width: number;
      height: number;
      tilewidth: number;
      tileheight: number;
      layers: unknown[];
      tilesets?: { firstgid: number }[];
    },
    tilesetJson: { tiles?: { id: number; texture: string }[] }
  ): TiledMapData | undefined {
    try {
      const tileTextures = new Map<number, string>();
      for (const ts of mapJson.tilesets || []) {
        for (const t of tilesetJson.tiles || []) {
          tileTextures.set(ts.firstgid + t.id, t.texture);
        }
      }
      return {
        width: mapJson.width,
        height: mapJson.height,
        tilewidth: mapJson.tilewidth,
        tileheight: mapJson.tileheight,
        layers: mapJson.layers as TiledMapData['layers'],
        tileTextures
      };
    } catch {
      return undefined;
    }
  }

  init(data: SceneTransitionData) {
    this.nodeId = (data.nodeId as string) || 'city_hope';
  }

  preload() {
    // 预加载 Tiled 城镇地图 JSON
    this.load.json('town_map', './maps/town.json');
    this.load.json('tileset_terrain', './maps/tileset_terrain.json');
  }

  async create() {
    const { width, height } = this.scale;
    const node = getNodeById(this.nodeId);

    this.activeOverlay = undefined;
    this.nearby = null;
    this.prompt = undefined;

    ensureTextures(this);

    // 进入城镇时按真实流逝时间恢复体力，保证 HUD 显示最新值
    regenerateStamina();

    // 解析 Tiled 地图数据（优先用 preload 缓存，失败则 fetch 兜底）
    let useTiled = false;
    const cachedMap = this.cache.json.get('town_map');
    const cachedTileset = this.cache.json.get('tileset_terrain');
    if (cachedMap && cachedTileset) {
      this.mapData = this.parseTiledCache(cachedMap, cachedTileset);
      useTiled = !!this.mapData;
    }
    if (!useTiled) {
      try {
        this.mapData = await loadTiledMap(this, './maps/town.json');
        useTiled = true;
      } catch {
        this.mapData = undefined;
      }
    }

    if (useTiled && this.mapData) {
      // 渲染 Tiled 地面瓦片层
      const groundLayer = getLayer(this.mapData, 'ground');
      if (groundLayer) {
        renderTileLayer(this, groundLayer, this.mapData);
      }
    } else {
      // 回退：程序化瓦片地面 + 中央石板路
      this.add.tileSprite(0, 0, width, height, 'tile_ground').setOrigin(0, 0);
      this.add.tileSprite(width / 2 - 70, 0, 140, height, 'tile_path').setOrigin(0, 0).setAlpha(0.85);
    }

    this.add.text(20, 84, node?.name || '城镇', { fontSize: '22px', color: '#c8b6ff' })
      .setScrollFactor(0)
      .setDepth(900);
    this.hud = drawHud(this);

    const backBtn = this.add
      .text(width - 20, 20, '← 返回地图', { fontSize: '16px', color: '#888' })
      .setOrigin(1, 0)
      .setDepth(900)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start(SceneKeys.WorldMap));

    // 从 Tiled 对象层读取建筑与采集点，回退到硬编码
    if (useTiled && this.mapData) {
      const bldLayer = getLayer(this.mapData, 'buildings');
      const harvestLayer = getLayer(this.mapData, 'harvest');
      const bldObjs = bldLayer?.objects || [];
      const hvObjs = harvestLayer?.objects || [];

      this.buildings = bldObjs.map((o) => ({
        id: o.type,
        name: o.name,
        type: o.type as Building['type'],
        x: o.x + o.width / 2,
        y: o.y + o.height / 2,
        width: o.width,
        height: o.height
      }));

      this.interactables = [
        ...this.buildings.map((b) => ({ id: b.id, name: b.name, type: b.type, x: b.x, y: b.y })),
        ...hvObjs.map((o, i) => ({
          id: `${o.type}_${i + 1}`,
          name: o.name,
          type: o.type,
          x: o.x + o.width / 2,
          y: o.y + o.height / 2
        }))
      ];
    } else {
      // 回退：硬编码建筑
      this.buildings = [
        { id: 'shop', name: '跨界贸易市场', type: 'shop', x: width * 0.25, y: height * 0.4, width: 120, height: 100 },
        { id: 'office', name: '裂隙管理局', type: 'office', x: width * 0.6, y: height * 0.3, width: 140, height: 110 },
        { id: 'lab', name: '灵气实验室', type: 'lab', x: width * 0.3, y: height * 0.7, width: 110, height: 90 },
        { id: 'portal', name: '跨界传送阵', type: 'portal', x: width * 0.7, y: height * 0.65, width: 100, height: 100 }
      ];
      this.interactables = [
        ...this.buildings.map((b) => ({ id: b.id, name: b.name, type: b.type, x: b.x, y: b.y })),
        { id: 'herb_1', name: '灵草田', type: 'herb', x: width * 0.15, y: height * 0.55 },
        { id: 'herb_2', name: '灵草田', type: 'herb', x: width * 0.5, y: height * 0.85 },
        { id: 'ore_1', name: '矿脉', type: 'ore', x: width * 0.88, y: height * 0.42 },
        { id: 'ore_2', name: '矿脉', type: 'ore', x: width * 0.42, y: height * 0.18 }
      ];
    }
    this.renderHarvestPoints();

    this.buildingBodies = this.physics.add.staticGroup();
    for (const b of this.buildings) {
      this.addBuilding(b);
    }

    // 玩家 — 程序化生成的侠客贴图
    const mapW = useTiled && this.mapData ? this.mapData.width * this.mapData.tilewidth : width;
    const mapH = useTiled && this.mapData ? this.mapData.height * this.mapData.tileheight : height;
    this.player = this.physics.add.image(mapW / 2, mapH / 2, 'hero_hero');
    this.player.setCircle(9, 9, 20);
    this.player.setCollideWorldBounds(true);

    // 建筑实体（挡住玩家，避免穿墙）
    this.physics.add.collider(this.player, this.buildingBodies);

    // 键盘控制
    this.cursors = this.input.keyboard!.createCursorKeys();
    const keys = this.input.keyboard!.addKeys('W,A,S,D') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.wasd = { up: keys.W, down: keys.S, left: keys.A, right: keys.D };
    this.input.keyboard!.on('keydown-SPACE', this.tryEnterBuilding, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-SPACE', this.tryEnterBuilding, this);
    });

    // 移动端虚拟摇杆（触摸设备自动启用）
    this.joystick = new VirtualJoystick(this);
    this.createInteractButton();

    // 摄像机跟随
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.physics.world.setBounds(0, 0, mapW, mapH);

    this.add
      .text(width / 2, height - 30, '方向键 / WASD 移动 · 空格交互（手机滑动屏幕任意位置）', {
        fontSize: '12px',
        color: '#555'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
  }

  private renderHarvestPoints() {
    for (const it of this.interactables) {
      if (it.type !== 'herb' && it.type !== 'ore') continue;
      const tex = it.type === 'herb' ? 'prop_herb' : 'prop_ore';
      // 一小簇，让可采集点在视觉上明显
      const offsets: [number, number][] = [
        [0, 0],
        [-18, 8],
        [18, 6],
        [0, 18]
      ];
      for (const [dx, dy] of offsets) {
        this.add
          .image(it.x + dx, it.y + dy, tex)
          .setDepth(Math.floor(it.y + dy))
          .setScale(it.type === 'herb' ? 1.1 : 1);
      }
      // 采集点标识
      this.add
        .text(it.x, it.y - 30, it.type === 'herb' ? '🌿 灵草' : '⛏️ 矿脉', {
          fontSize: '11px',
          color: '#d0d0dd',
          backgroundColor: '#0a0a12aa',
          padding: { x: 4, y: 2 }
        })
        .setOrigin(0.5)
        .setDepth(Math.floor(it.y) + 1);
    }
  }

  private addBuilding(b: Building) {
    const { width, height } = this.scale;

    // 建筑贴图（同时作为静态碰撞体）
    const img = this.buildingBodies.create(
      b.x,
      b.y,
      BUILDING_TEXTURE[b.type] || BUILDING_TEXTURE.shop
    ) as Phaser.Physics.Arcade.Sprite;
    img.setDepth(Math.floor(b.y));
    img.refreshBody();

    this.add
      .text(b.x, b.y - b.height / 2 - 14, b.name, {
        fontSize: '12px',
        color: '#fff',
        align: 'center',
        backgroundColor: '#0a0a12aa',
        padding: { x: 6, y: 3 }
      })
      .setOrigin(0.5)
      .setDepth(Math.floor(b.y) + 1);

    // 门口的暖光
    this.add
      .ellipse(b.x, b.y + b.height / 2 - 6, b.width * 0.5, 14, 0xffe9a8, 0.12)
      .setDepth(Math.floor(b.y) - 1);

    // 灵草圃与矿脉点缀
    this.add.image(b.x - b.width * 0.7, b.y + 26, 'prop_herb').setDepth(Math.floor(b.y));
    this.add.image(b.x + b.width * 0.7, b.y + 34, 'prop_ore').setDepth(Math.floor(b.y));

    // 地图边缘的装饰植被（使用地图尺寸而非屏幕尺寸）
    const mapW = this.mapData ? this.mapData.width * this.mapData.tilewidth : width;
    const mapH = this.mapData ? this.mapData.height * this.mapData.tileheight : height;
    if (b.x < mapW * 0.4) {
      this.add.image(26, mapH - 60, 'prop_herb');
    }
  }

  update() {
    if (this.activeOverlay) {
      this.player.setVelocity(0, 0);
      return;
    }
    this.prompt?.setVisible(true);

    const speed = 160;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    // 键盘输入（二值方向）
    let vx = 0;
    let vy = 0;
    if (left) vx = -speed;
    else if (right) vx = speed;
    if (up) vy = -speed;
    else if (down) vy = speed;

    // 摇杆输入（模拟量方向，覆盖键盘以便同时支持）
    const joy = this.joystick?.getState();
    if (joy && joy.active) {
      vx = joy.x * speed;
      vy = joy.y * speed;
    }

    this.player.setVelocity(vx, vy);
    // 按 y 排序，走到建筑上方时被遮挡
    this.player.setDepth(this.player.y);

    // 检测最近的可交互点（建筑 80、采集点 60）
    let closest: Interactable | null = null;
    let closestDist = Infinity;
    for (const it of this.interactables) {
      const range = it.type === 'herb' || it.type === 'ore' ? 60 : 80;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, it.x, it.y);
      if (dist < range && dist < closestDist) {
        closest = it;
        closestDist = dist;
      }
    }

    if (closest !== this.nearby) {
      this.nearby = closest;
      this.refreshPrompt();
      this.refreshInteractButton();
    }
  }

  private refreshPrompt() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.prompt?.destroy();
    this.prompt = undefined;
    if (!this.nearby) return;

    this.prompt = this.add
      .text(width / 2, height - 64, this.nearby.name, {
        fontSize: '14px',
        color: '#c8b6ff',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(800);
  }

  /** 右下角浮动交互按钮（移动端触摸友好） */
  private createInteractButton() {
    // 用窗口实际尺寸，和 Overlay 保持一致
    const width = window.innerWidth;
    const height = window.innerHeight;
    // 放在右下角偏上，避开浏览器底部手势条，减少与建筑重叠
    const btnX = width - 56;
    const btnY = height - 110;
    const btnSize = 72; // 增大触摸区域

    const container = this.add.container(btnX, btnY).setDepth(860).setScrollFactor(0);

    const circle = this.add
      .circle(0, 0, btnSize / 2, 0xc8b6ff, 0.85)
      .setStrokeStyle(2, 0xffffff, 0.6);
    const label = this.add
      .text(0, 0, '交互', { fontSize: '15px', color: '#0a0a12', fontStyle: 'bold' })
      .setOrigin(0.5);

    container.add([circle, label]);
    container.setSize(btnSize, btnSize);
    // 显式圆形点击区域，比容器尺寸略大以便触摸
    container.setInteractive(
      new Phaser.Geom.Circle(0, 0, btnSize / 2 + 4),
      Phaser.Geom.Circle.Contains
    );
    container.on('pointerover', () => circle.setFillStyle(0xd4c5ff));
    container.on('pointerout', () => circle.setFillStyle(0xc8b6ff));
    container.on('pointerdown', () => {
      circle.setScale(0.92);
      this.tryEnterBuilding();
    });
    container.on('pointerup', () => circle.setScale(1));
    container.on('pointerupoutside', () => circle.setScale(1));
    container.setVisible(false);

    this.interactBtn = container;
  }

  private refreshInteractButton() {
    this.interactBtn?.setVisible(!!this.nearby);
  }

  private tryEnterBuilding() {
    if (this.activeOverlay || !this.nearby) return;
    this.interact(this.nearby);
  }

  private openPanel(opts: OverlayOptions) {
    // 销毁旧的 overlay（如果有），避免叠加
    this.activeOverlay?.destroy();
    this.activeOverlay = openOverlay(this, opts);
    // overlay 关闭时清空引用，update() 据此恢复角色控制
    this.activeOverlay.once('destroy', () => {
      this.activeOverlay = undefined;
    });
    this.prompt?.setVisible(false);
  }

  private refreshHud() {
    this.hud?.destroy();
    this.hud = drawHud(this);
  }

  private interact(it: Interactable) {
    switch (it.type) {
      case 'herb':
        this.openHerb(it);
        break;
      case 'ore':
        this.openMine(it);
        break;
      case 'portal':
        this.openPanel({
          title: '跨界传送阵',
          lines: ['法阵嗡鸣，指向已知的空间坐标。', '选择目的地后即可出发。'],
          actions: [
            { label: '前往世界地图', onClick: () => this.scene.start(SceneKeys.WorldMap) },
            { label: '留在城内', onClick: () => undefined }
          ]
        });
        break;
      case 'shop':
        this.openShop(it);
        break;
      case 'office':
        this.openOffice(it);
        break;
      case 'lab':
        this.openLab(it);
        break;
      default:
        break;
    }
  }

  private openShop(b: Interactable) {
    const progress = loadProgress();
    const sellPrice = 10;
    const potionPrice = 30;

    this.openPanel({
      title: b.name,
      lines: [
        `灵草持有：${progress.herbs} 株（收购价 ${sellPrice} 灵石/株）`,
        `当前灵石：${progress.spiritStones}`,
        `生命：${progress.hp}/${progress.maxHp}`
      ],
      actions: [
        {
          label: `卖出全部灵草 +${progress.herbs * sellPrice}`,
          onClick: () => {
            const p = loadProgress();
            if (p.herbs === 0) return this.openShop(b);
            const gain = p.herbs * sellPrice;
            p.spiritStones += gain;
            p.herbs = 0;
            saveProgress(p);
            showToast(this, `卖出灵草 +${gain} 灵石`, 'success');
            this.refreshHud();
            this.openShop(b);
          }
        },
        {
          label: `净化药剂 ${potionPrice} 灵石`,
          onClick: () => {
            const p = loadProgress();
            if (p.spiritStones < potionPrice || p.hp >= p.maxHp) return this.openShop(b);
            p.spiritStones -= potionPrice;
            p.hp = p.maxHp;
            saveProgress(p);
            showToast(this, '已使用净化药剂，生命回满', 'success');
            this.refreshHud();
            this.openShop(b);
          }
        }
      ]
    });
  }

  private openOffice(_b: Interactable) {
    const p = loadProgress();
    const remaining = workRemainingMs();
    const hours = Math.ceil(remaining / (60 * 60 * 1000));
    const canWork = remaining <= 0;

    this.openPanel({
      title: '裂隙管理局',
      lines: [
        `干员等级：Lv.${p.level}`,
        `累计出勤：${p.battleCount} 次 · 击杀 ${p.totalKills}`,
        `最长存活：${Math.floor(p.bestTime / 60)} 分 ${p.bestTime % 60} 秒`,
        `已清理区域：${p.clearedNodes.length} / 3`,
        `当前灵石：${p.spiritStones}`,
        '',
        canWork ? '可以出勤打卡领取薪水。' : `距下次出勤还有 ${hours} 小时。`
      ],
      actions: [
        {
          label: canWork ? '出勤打卡' : `冷却中（${hours}h）`,
          onClick: () => {
            const r = dailyWork();
            if (r.ok) {
              showToast(this, `出勤成功 +${r.salary} 灵石`, 'success');
            } else {
              showToast(this, r.reason || '暂不可出勤', 'info');
            }
            this.refreshHud();
            this.openOffice(_b);
          }
        },
        { label: '关闭', onClick: () => undefined }
      ]
    });
  }

  private openLab(_b: Interactable) {
    const p = loadProgress();
    const herbCost = 3;
    const stoneCost = 50;
    const canResearch = p.herbs >= herbCost && p.spiritStones >= stoneCost;

    this.openPanel({
      title: '灵气实验室',
      lines: [
        '用灵草与灵石提取灵气载体，永久强化肉身。',
        `消耗：${herbCost} 灵草 + ${stoneCost} 灵石`,
        `当前：${p.herbs} 灵草 / ${p.spiritStones} 灵石 · 科技点 ${p.techPoints}`,
        `生命上限：${p.maxHp}`
      ],
      actions: [
        {
          label: canResearch ? '开始研究 (+5 生命上限)' : '材料不足',
          onClick: () => {
            const cur = loadProgress();
            if (cur.herbs < herbCost || cur.spiritStones < stoneCost) return this.openLab(_b);
            cur.herbs -= herbCost;
            cur.spiritStones -= stoneCost;
            cur.maxHp += 5;
            cur.hp = cur.maxHp;
            cur.techPoints += 1;
            saveProgress(cur);
            showToast(this, '研究成功：生命上限 +5 · 科技点 +1', 'success');
            this.refreshHud();
            this.openLab(_b);
          }
        },
        { label: '关闭', onClick: () => undefined }
      ]
    });
  }

  private openHerb(it: Interactable) {
    const p = loadProgress();
    const canHarvest = p.stamina >= HERB_STAMINA_COST;
    this.openPanel({
      title: it.name,
      lines: [
        `消耗 ${HERB_STAMINA_COST} 体力采集灵草。`,
        `当前体力：${p.stamina}/${p.staminaMax}`,
        `灵草持有：${p.herbs} 株`,
        '',
        `预计产出：${1 + Math.floor(p.level / 3)} 株 + 经验`
      ],
      actions: [
        {
          label: canHarvest ? '采集灵草' : '体力不足',
          onClick: () => {
            const r = collectHerb();
            if (r.ok) {
              const up = r.leveledUp ? ` · 升级 Lv.${loadProgress().level}` : '';
              showToast(this, `采集成功 +${r.herbs} 灵草 · +${r.exp} 经验${up}`, 'success');
            } else {
              showToast(this, r.reason || '采集失败', 'error');
            }
            this.refreshHud();
            this.openHerb(it);
          }
        },
        { label: '离开', onClick: () => undefined }
      ]
    });
  }

  private openMine(it: Interactable) {
    const p = loadProgress();
    const canMine = p.stamina >= MINE_STAMINA_COST;
    this.openPanel({
      title: it.name,
      lines: [
        `消耗 ${MINE_STAMINA_COST} 体力开采矿脉。`,
        `当前体力：${p.stamina}/${p.staminaMax}`,
        `当前灵石：${p.spiritStones} · 科技点：${p.techPoints}`,
        '',
        '预计产出：灵石 20~50（+等级加成），20% 概率 1 科技点'
      ],
      actions: [
        {
          label: canMine ? '开采矿脉' : '体力不足',
          onClick: () => {
            const r = mine();
            if (r.ok) {
              const tech = r.techPoints > 0 ? ` · +${r.techPoints} 科技点` : '';
              const up = r.leveledUp ? ` · 升级 Lv.${loadProgress().level}` : '';
              showToast(this, `挖矿成功 +${r.spiritStones} 灵石${tech} · +${r.exp} 经验${up}`, 'success');
            } else {
              showToast(this, r.reason || '挖矿失败', 'error');
            }
            this.refreshHud();
            this.openMine(it);
          }
        },
        { label: '离开', onClick: () => undefined }
      ]
    });
  }
}
