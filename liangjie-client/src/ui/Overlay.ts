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
  // 用窗口实际尺寸，避免 scene.scale 在 RESIZE 模式下未及时更新导致面板偏移
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cx = width / 2;
  const cy = height / 2;

  // setScrollFactor(0) 固定在屏幕上，不随摄像机滚动
  const container = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);

  // 遮罩：设为 interactive 以拦截底层（摇杆等）的触摸事件
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

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    container.destroy();
  };

  // Phaser 会把同一次 pointerdown 依深度依次派发给指针下所有可交互对象。
  // overlay 的处理器必须 stopPropagation，否则事件会穿透到下层的全屏摇杆区
  // 与交互按钮，导致关闭遮罩的同时立即重开面板（手机端表现为"卡死"）。

  // 右上角关闭按钮（X）— 所有 overlay 都有，方便触摸关闭
  const closeBtnSize = 36;
  const closeX = cx + panelW / 2 - closeBtnSize / 2 - 6;
  const closeY = cy - panelH / 2 + closeBtnSize / 2 + 6;
  const closeBtnBg = scene.add
    .circle(closeX, closeY, closeBtnSize / 2, 0x2a2a3a, 0.9)
    .setStrokeStyle(1, 0xc8b6ff, 0.5);
  const closeBtnLabel = scene.add
    .text(closeX, closeY, '✕', { fontSize: '16px', color: '#d0d0dd' })
    .setOrigin(0.5);
  const closeBtn = scene.add.container(closeX, closeY, [closeBtnBg, closeBtnLabel]);
  closeBtn.setSize(closeBtnSize, closeBtnSize);
  closeBtn.setInteractive(
    new Phaser.Geom.Circle(0, 0, closeBtnSize / 2),
    Phaser.Geom.Circle.Contains
  );
  closeBtn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
    event.stopPropagation();
    close();
  });
  container.add(closeBtn);

  if (opts.actions?.length) {
    const total = opts.actions.length;
    const gap = 12;
    const btnW = Math.max(80, (panelW - 56 - gap * (total - 1)) / total);
    const btnH = 44; // 固定高度，保证触摸区域足够大
    const startX = cx - (btnW * total + gap * (total - 1)) / 2 + btnW / 2;
    const btnY = cy + panelH / 2 - 38;

    opts.actions.forEach((action, i) => {
      const bx = startX + i * (btnW + gap);
      // 背景矩形：比文字更大的点击区域
      const btnBg = scene.add
        .rectangle(bx, btnY, btnW, btnH, 0xc8b6ff)
        .setStrokeStyle(1, 0xffffff, 0.3)
        .setOrigin(0.5);
      const btnLabel = scene.add
        .text(bx, btnY, action.label, {
          fontSize: '15px',
          color: '#0a0a12',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: btnW - 16 }
        })
        .setOrigin(0.5);

      const btn = scene.add.container(bx, btnY, [btnBg, btnLabel]);
      btn.setSize(btnW, btnH);
      // 显式矩形点击区域，避免 Text 边界计算不准
      btn.setInteractive(
        new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
        Phaser.Geom.Rectangle.Contains
      );
      btn.on('pointerover', () => btnBg.setFillStyle(0xd4c5ff));
      btn.on('pointerout', () => btnBg.setFillStyle(0xc8b6ff));
      // pointerdown 立即响应，避免手机端 pointerup 丢失；同时阻止穿透
      btn.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        close();
        action.onClick();
      });
      container.add(btn);
    });
  }

  if (opts.dismissible !== false) {
    backdrop.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      close();
    });
  }

  // ESC 键关闭（键盘用户），overlay 销毁时自动移除监听
  const escHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  window.addEventListener('keydown', escHandler);
  container.once('destroy', () => window.removeEventListener('keydown', escHandler));

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
