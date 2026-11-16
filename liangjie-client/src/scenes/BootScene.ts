// 两界之间 · 启动场景 — 加载资源后进入世界大地图
import Phaser from 'phaser';
import { SceneKeys } from '../game/SceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload() {
    // 预留：加载瓦片图、精灵图、UI 资源
    // this.load.image('tiles', 'assets/tiles.png');
    // this.load.tilemapTiledJSON('town', 'assets/maps/town.json');
  }

  create() {
    // 简单的淡入标题后进入世界地图
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, '两界之间', {
        fontSize: '48px',
        color: '#c8b6ff',
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 60,
        '点击屏幕进入世界地图',
        {
          fontSize: '18px',
          color: '#888'
        }
      )
      .setOrigin(0.5);

    this.input.once('pointerdown', () => {
      this.scene.start(SceneKeys.WorldMap);
    });

    // 3 秒后自动进入
    this.time.delayedCall(1500, () => {
      this.scene.start(SceneKeys.WorldMap);
    });
  }
}
