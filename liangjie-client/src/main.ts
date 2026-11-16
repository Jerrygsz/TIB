// 两界之间 · 入口
import Phaser from 'phaser';
import { createGameConfig } from './game/GameConfig';

// 限制 devicePixelRatio，避免高 DPR 手机（如华为 Mate 60 Pro DPR≈3.5）
// 渲染分辨率过大导致 GPU 压力过高、画面卡顿。上限 2 已足够清晰。
const MAX_DPR = 2;
const originalDPR = window.devicePixelRatio || 1;
if (originalDPR > MAX_DPR) {
  Object.defineProperty(window, 'devicePixelRatio', {
    get: () => MAX_DPR,
    configurable: true
  });
}

const config = createGameConfig();
const game = new Phaser.Game(config);
// 调试用：暴露游戏实例，便于自动化测试或控制台调试
(window as unknown as { __game?: Phaser.Game }).__game = game;
