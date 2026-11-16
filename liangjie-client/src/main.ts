// 两界之间 · 入口
import Phaser from 'phaser';
import { createGameConfig } from './game/GameConfig';

const config = createGameConfig();
const game = new Phaser.Game(config);
// 调试用：暴露游戏实例，便于自动化测试或控制台调试
(window as unknown as { __game?: Phaser.Game }).__game = game;
