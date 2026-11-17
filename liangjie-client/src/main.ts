// 两界之间 · 入口
import Phaser from 'phaser';
import { createGameConfig } from './game/GameConfig';

// 限制 devicePixelRatio，避免高 DPR 手机（如华为 Mate 60 Pro DPR≈3.5）
// 渲染分辨率过大导致 GPU 压力过高、画面卡顿与触摸响应迟滞。
// 触屏设备进一步降到 1.5：竖屏全屏画布约 1900×4300px，像素量减少 ~44%。
const isTouchDevice =
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const MAX_DPR = isTouchDevice ? 1.5 : 2;
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
