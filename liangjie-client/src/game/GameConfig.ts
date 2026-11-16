// 两界之间 · Phaser 游戏配置
import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { WorldMapScene } from '../scenes/WorldMapScene';
import { TownScene } from '../scenes/TownScene';
import { BattleScene } from '../scenes/BattleScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  // 少数设备 / 远程桌面环境下 WebGL 帧缓冲不可用，可用 ?renderer=canvas 强制降级
  const forceCanvas =
    typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('renderer') === 'canvas';

  return {
    type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0a0a12',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight,
      autoRound: true
    },
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      powerPreference: 'high-performance'
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scene: [BootScene, WorldMapScene, TownScene, BattleScene]
  };
}
