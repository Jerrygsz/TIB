// 两界之间 · 通用 UI 组件
// 覆盖层面板（城镇建筑、战斗结算共用）与顶部资源条
import Phaser from 'phaser';
import { expToNext, loadProgress } from '../game/SaveData';

export interface OverlayAction {
  label: string;
  onClick: () => void;
}

export interface OverlayOptions {
  title: string;
  lines: string[];
  actions?: OverlayAction[];
  /** 点击遮罩是否关闭，默认 true */
  dismissible?: boolean;
}

/** 打开一个居中的覆盖层面板，返回容器（调用 destroy 关闭）。 */
export function openOverlay(scene: Phaser.Scene, opts: OverlayOptions): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const cy = height / 2;

  const container = scene.add.container(0, 0).setDepth(1000);

  const backdrop = scene.add
    .rectangle(cx, cy, width, height, 0x000000, 0.65)
    .setInteractive();
  container.add(backdrop);

  const panelW = Math.min(width - 40, 460);

  // 先创建所有文本并测量实际高度（考虑 wordWrap 换行）
  const title = scene.add
    .text(cx, 0, opts.title, { fontSize: '20px', color: '#c8b6ff' })
    .setOrigin(0.5);

  const textObjs: Phaser.GameObjects.Text[] = [];
  let textTotalH = 0;
  for (const line of opts.lines) {
    const text = scene.add
      .text(0, 0, line, {
        fontSize: '14px',
        color: '#d0d0dd',
        align: 'left',
        wordWrap: { width: panelW - 56 }
      })
      .setOrigin(0, 0);
    textObjs.push(text);
    textTotalH += text.height + 6; // 行间距 6px
  }

  // 按实际内容高度计算面板
  const topPad = 70; // 标题上方+标题下方间距
  const bottomPad = opts.actions?.length ? 70 : 30;
  const panelH = Math.max(150, topPad + textTotalH + bottomPad);
  const panel = scene.add.rectangle(cx, cy, panelW, panelH, 0x14141f, 0.98);
  panel.setStrokeStyle(1, 0xc8b6ff, 0.6);
  container.add(panel);

  // 定位标题
  title.setPosition(cx, cy - panelH / 2 + 34);
  container.add(title);

  // 定位文本行
  let y = cy - panelH / 2 + 70;
  for (const text of textObjs) {
    text.setPosition(cx - panelW / 2 + 28, y);
    container.add(text);
    y += text.height + 6;
  }

  const close = () => container.destroy();

  if (opts.actions?.length) {
    const total = opts.actions.length;
    const gap = 12;
    const btnW = (panelW - 56 - gap * (total - 1)) / total;
    const startX = cx - (btnW * total + gap * (total - 1)) / 2 + btnW / 2;
    const btnY = cy + panelH / 2 - 38;

    opts.actions.forEach((action, i) => {
      const btn = scene.add
        .text(startX + i * (btnW + gap), btnY, action.label, {
          fontSize: '15px',
          color: '#0a0a12',
          backgroundColor: '#c8b6ff',
          padding: { x: 14, y: 8 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        container.destroy();
        action.onClick();
      });
      container.add(btn);
    });
  }

  if (opts.dismissible !== false) {
    backdrop.on('pointerdown', close);
  }

  return container;
}

/** 顶部资源条：等级 / 经验 / 灵石 / 灵草 / 体力 */
export function drawHud(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const progress = loadProgress();
  const hud = scene.add.container(16, 16).setDepth(900).setScrollFactor(0);

  const bg = scene.add.rectangle(0, 0, 220, 82, 0x000000, 0.45).setOrigin(0, 0);
  bg.setStrokeStyle(1, 0xc8b6ff, 0.25);
  hud.add(bg);

  hud.add(
    scene.add.text(10, 6, `Lv.${progress.level}`, {
      fontSize: '14px',
      color: '#c8b6ff',
      fontStyle: 'bold'
    })
  );
  hud.add(
    scene.add.text(72, 7, `灵石 ${progress.spiritStones}`, { fontSize: '13px', color: '#fbbf24' })
  );
  hud.add(
    scene.add.text(170, 7, `灵草 ${progress.herbs}`, { fontSize: '13px', color: '#86efac' })
  );

  // 经验条
  const expBarBg = scene.add.rectangle(10, 30, 200, 7, 0x2a2a3a).setOrigin(0, 0);
  const expRatio = Math.min(1, progress.exp / expToNext(progress.level));
  const expBar = scene.add.rectangle(10, 30, 200 * expRatio, 7, 0x6ea8fe).setOrigin(0, 0);

  // 体力条
  const staLabel = scene.add.text(10, 42, `体力 ${progress.stamina}/${progress.staminaMax}`, {
    fontSize: '12px',
    color: '#d0d0dd'
  });
  const staBarBg = scene.add.rectangle(10, 60, 200, 10, 0x2a2a3a).setOrigin(0, 0);
  const staRatio = Math.min(1, progress.stamina / progress.staminaMax);
  const staBar = scene.add.rectangle(10, 60, 200 * staRatio, 10, 0xf472b6).setOrigin(0, 0);

  hud.add([expBarBg, expBar, staLabel, staBarBg, staBar]);

  return hud;
}

// ─── Toast 通知系统 ───────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

interface ToastStyle {
  bg: number;
  border: number;
  text: string;
}

const TOAST_STYLES: Record<ToastType, ToastStyle> = {
  success: { bg: 0x1a3a2a, border: 0x4ade80, text: '#86efac' },
  error: { bg: 0x3a1a1a, border: 0xf87171, text: '#fca5a5' },
  info: { bg: 0x1a2a3a, border: 0x60a5fa, text: '#93c5fd' }
};

/** 当前场景上活跃的 toast 队列（用于堆叠偏移） */
const toastStack = new WeakMap<Phaser.Scene, Phaser.GameObjects.Container[]>();

/** 重排场景中所有 toast 的垂直位置，消除下层消失后的空隙 */
function reflowToasts(scene: Phaser.Scene) {
  const stack = toastStack.get(scene) || [];
  const { width } = scene.scale;
  const gap = 8;
  stack.forEach((c, i) => {
    const boxH = (c as any)._toastH || 40;
    const targetY = 110 + i * (boxH + gap);
    scene.tweens.add({
      targets: c,
      y: targetY,
      duration: 200,
      ease: 'Power2'
    });
  });
}

/**
 * 显示一条 toast 通知，2.2 秒后自动消失。
 * @param scene 场景
 * @param message 消息文本
 * @param type 类型：success / error / info
 */
export function showToast(scene: Phaser.Scene, message: string, type: ToastType = 'info'): void {
  const style = TOAST_STYLES[type];
  const { width } = scene.scale;

  const container = scene.add.container(0, 0).setDepth(1100).setScrollFactor(0);

  // 先创建文本以测量宽度
  const text = scene.add
    .text(0, 0, message, {
      fontSize: '14px',
      color: style.text,
      fontStyle: 'bold',
      padding: { x: 14, y: 9 }
    })
    .setOrigin(0.5);

  const padX = 18;
  const boxW = Math.min(width - 40, text.width + padX * 2);
  const boxH = text.height + 18;

  const box = scene.add
    .rectangle(0, 0, boxW, boxH, style.bg, 0.95)
    .setStrokeStyle(1.5, style.border, 0.9);
  box.setOrigin(0.5);

  container.add([box, text]);
  (container as any)._toastH = boxH;

  // 堆叠管理
  const stack = toastStack.get(scene) || [];
  stack.push(container);
  toastStack.set(scene, stack);

  const index = stack.length - 1;
  const startY = 110 + index * (boxH + 8);
  container.setPosition(width / 2, startY);

  // 入场动画
  container.setAlpha(0);
  scene.tweens.add({
    targets: container,
    alpha: 1,
    y: startY,
    duration: 250,
    ease: 'Power2'
  });

  // 自动消失
  scene.time.delayedCall(2200, () => {
    scene.tweens.add({
      targets: container,
      alpha: 0,
      y: startY - 16,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        container.destroy();
        const cur = toastStack.get(scene) || [];
        const idx = cur.indexOf(container);
        if (idx >= 0) cur.splice(idx, 1);
        toastStack.set(scene, cur);
        // 下层消失后，上方 toast 平滑下移填补空隙
        reflowToasts(scene);
      }
    });
  });
}
