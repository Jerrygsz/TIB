// 两界之间 · 全屏滑动控制器（移动端触摸控制）
// 隐藏虚拟摇杆视觉，玩家在屏幕任意位置按下并滑动，
// 以「按下点为原点」的位移向量驱动角色移动，释放视野空间。
import Phaser from 'phaser';

export interface JoystickState {
  /** 归一化方向 x：-1 ~ 1 */
  x: number;
  /** 归一化方向 y：-1 ~ 1 */
  y: number;
  /** 当前是否被按住 */
  active: boolean;
}

interface JoystickOptions {
  /** 最大感应半径（像素），超过此距离速度封顶 */
  radius?: number;
  /** 死区比例（0~1），位移小于此比例的半径时视为静止 */
  deadZone?: number;
}

const DEFAULT_RADIUS = 90;
const DEFAULT_DEAD_ZONE = 0.12;

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private radius: number;
  private deadZone: number;
  private originX = 0;
  private originY = 0;
  private pointerId: number | null = null;
  private state: JoystickState = { x: 0, y: 0, active: false };
  /** 全屏触摸感应区（公开以便调试） */
  public zone: Phaser.GameObjects.Zone | null = null;

  constructor(scene: Phaser.Scene, opts: JoystickOptions = {}) {
    this.scene = scene;
    this.radius = opts.radius ?? DEFAULT_RADIUS;
    this.deadZone = opts.deadZone ?? DEFAULT_DEAD_ZONE;
    this.create();
  }

  private create() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // 全屏触摸感应区（低深度，确保 UI 按钮优先捕获点击）
    const zone = this.scene.add.zone(width / 2, height / 2, width, height);
    zone.setScrollFactor(0);
    zone.setDepth(800);
    zone.setInteractive({ useHandCursor: false });

    zone.on('pointerdown', this.onDown, this);
    zone.on('pointermove', this.onMove, this);
    zone.on('pointerup', this.onUp, this);
    zone.on('pointerupoutside', this.onUp, this);

    this.zone = zone;
  }

  /** 获取当前方向向量 */
  getState(): JoystickState {
    return this.state;
  }

  private onDown(pointer: Phaser.Input.Pointer) {
    // 已有手指在控制时忽略多指
    if (this.pointerId !== null) return;
    this.pointerId = pointer.id;
    this.originX = pointer.x;
    this.originY = pointer.y;
    this.state.active = true;
    this.state.x = 0;
    this.state.y = 0;
  }

  private onMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.pointerId) return;
    this.updateDirection(pointer.x, pointer.y);
  }

  private onUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.state.active = false;
    this.state.x = 0;
    this.state.y = 0;
  }

  /** 按指部位移计算归一化方向向量 */
  private updateDirection(px: number, py: number) {
    const dx = px - this.originX;
    const dy = py - this.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.radius;

    // 归一化力度：0~1，超过半径封顶
    const norm = dist > 0 ? Math.min(1, dist / maxDist) : 0;

    if (norm < this.deadZone) {
      this.state.x = 0;
      this.state.y = 0;
      return;
    }

    // 方向向量 = 单位方向 × 力度
    const inv = 1 / dist;
    this.state.x = dx * inv * norm;
    this.state.y = dy * inv * norm;
  }

  destroy() {
    if (this.zone) {
      this.zone.destroy();
      this.zone = null;
    }
    this.state = { x: 0, y: 0, active: false };
  }
}
