// 两界之间 · 世界大地图场景 (L1)
// 节点式导航：点击节点前往对应场景（城镇 / 野外战斗 / 裂隙战斗）
// 解锁状态与角色成长读取自 SaveData（localStorage）
import Phaser from 'phaser';
import { SceneKeys } from '../game/SceneKeys';
import { WORLD_MAP_NODES, getNodeById } from '../data/worldMap';
import { isNodeUnlocked, loadProgress } from '../game/SaveData';
import { ensureTextures } from '../game/Textures';
import { drawHud, openOverlay } from '../ui/Overlay';
import type { WorldMapNode, SceneTransitionData } from '../types';

const NODE_COLORS: Record<string, number> = {
  city: 0x6ea8fe,
  town: 0x86efac,
  field: 0xc084fc,
  rift: 0xf472b6,
  ruins: 0xfbbf24,
  special: 0xfb7185
};

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.WorldMap);
  }

  create() {
    const { width, height } = this.scale;
    const progress = loadProgress();

    ensureTextures(this);

    // 背景 — 程序化星空 / 灵气雾图
    this.add.tileSprite(0, 0, width, height, 'map_bg').setOrigin(0, 0);

    // 标题
    this.add
      .text(width / 2, 96, '世界大地图', { fontSize: '24px', color: '#c8b6ff' })
      .setOrigin(0.5)
      .setDepth(10);

    this.add
      .text(width / 2, 124, '选择目的地', { fontSize: '14px', color: '#666' })
      .setOrigin(0.5)
      .setDepth(10);

    drawHud(this);

    // 绘制连接线（虚线）
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x4a5a8a, 0.55);
    for (const node of WORLD_MAP_NODES) {
      for (const connId of node.connections) {
        const target = getNodeById(connId);
        if (!target) continue;
        const x1 = node.x * width;
        const y1 = node.y * height;
        const x2 = target.x * width;
        const y2 = target.y * height;
        const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const dash = 9;
        for (let d = 0; d < dist; d += dash * 2) {
          const t1 = d / dist;
          const t2 = Math.min(1, (d + dash) / dist);
          graphics.beginPath();
          graphics.moveTo(x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
          graphics.lineTo(x1 + (x2 - x1) * t2, y1 + (y2 - y1) * t2);
          graphics.strokePath();
        }
      }
    }

    // 绘制节点
    for (const node of WORLD_MAP_NODES) {
      this.createNode(node, isNodeUnlocked(node.id, progress));
    }

    // 底部提示
    this.add
      .text(width / 2, height - 28, '清理裂隙可解锁新区域', {
        fontSize: '12px',
        color: '#555'
      })
      .setOrigin(0.5);
  }

  private createNode(node: WorldMapNode, unlocked: boolean) {
    const { width, height } = this.scale;
    const px = node.x * width;
    const py = node.y * height;

    const color = unlocked ? NODE_COLORS[node.type] || 0x888888 : 0x333333;

    // 深度设为 50，确保在背景和连接线之上，HUD(900) 之下
    const container = this.add.container(px, py).setDepth(50);

    // 光晕
    const glow = this.add.circle(0, 0, 26, color, unlocked ? 0.18 : 0.06);

    // 节点图标（程序化贴图）
    const icon = this.add
      .image(0, 0, unlocked ? `node_${node.type}` : 'node_locked')
      .setScale(0.8);
    if (!unlocked) icon.setAlpha(0.55);

    const label = this.add
      .text(0, 32, node.name, {
        fontSize: '13px',
        color: unlocked ? '#fff' : '#555',
        align: 'center'
      })
      .setOrigin(0.5);

    container.add([glow, icon, label]);

    // 大点击区域（80x80），适配手指触摸精度，避免点不中
    const hitSize = 80;
    container.setSize(hitSize, hitSize);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-hitSize / 2, -hitSize / 2, hitSize, hitSize),
      Phaser.Geom.Rectangle.Contains
    );
    container.input!.cursor = 'pointer';
    container.on('pointerover', () => icon.setScale(0.95));
    container.on('pointerout', () => icon.setScale(0.8));
    container.on('pointerdown', () => this.selectNode(node, unlocked));
  }

  private selectNode(node: WorldMapNode, unlocked: boolean) {
    if (!unlocked) {
      openOverlay(this, {
        title: `🔒 ${node.name}`,
        lines: [node.unlockHint || '尚未解锁。', '', node.description]
      });
      return;
    }

    const btnLabel = node.combatRequired ? '[ 进入战斗 ]' : '[ 进入 ]';
    openOverlay(this, {
      title: node.name,
      lines: [node.description],
      actions: [{ label: btnLabel, onClick: () => this.travelTo(node) }]
    });
  }

  private travelTo(node: WorldMapNode) {
    const data: SceneTransitionData = { from: SceneKeys.WorldMap, nodeId: node.id };

    if (node.type === 'city' || node.type === 'town') {
      this.scene.start(SceneKeys.Town, data);
    } else {
      // 野外 / 裂隙 / 遗迹 → 进入战斗层
      this.scene.start(SceneKeys.Battle, { ...data, stage: node.battleStage || 'forest' });
    }
  }
}
