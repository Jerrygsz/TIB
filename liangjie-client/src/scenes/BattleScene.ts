// 两界之间 · 战斗地图场景 (L3)
// 通过 iframe 嵌入 liangjie-battle（canvas-vampire-survivors 改造版）
// 战斗层与客户端解耦，通过 postMessage 交换开局参数与结算数据
import Phaser from 'phaser';
import { SceneKeys } from '../game/SceneKeys';
import { getNodeById } from '../data/worldMap';
import { applyBattleResult, loadProgress } from '../game/SaveData';
import { openOverlay } from '../ui/Overlay';
import type { BattleResult, SceneTransitionData } from '../types';

const TUTORIAL_SEEN_KEY = 'liangjie:battle_tutorial_seen';

export class BattleScene extends Phaser.Scene {
  private iframe?: HTMLIFrameElement;
  private headerEl?: HTMLDivElement;
  private nodeId: string = '';
  private stage: string = 'forest';
  private loadingText?: Phaser.GameObjects.Text;
  private finished = false;

  constructor() {
    super(SceneKeys.Battle);
  }

  init(data: SceneTransitionData) {
    this.nodeId = (data.nodeId as string) || 'field_contaminated';
    this.stage = (data.stage as string) || 'forest';
    this.finished = false;
  }

  create() {
    const { width, height } = this.scale;
    const node = getNodeById(this.nodeId);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a12);

    // 标题 + 撤退按钮：用 DOM 叠加在 iframe 之上（iframe 占满全屏后会拦截
    // Phaser canvas 的 pointer 事件，所以必须用 DOM 元素才能点击）。
    this.createHeader(node?.name || '未知区域');

    this.loadingText = this.add
      .text(width / 2, height / 2, '正在接入裂隙…', { fontSize: '16px', color: '#888' })
      .setOrigin(0.5);

    this.startIframe();

    window.addEventListener('message', this.onBattleMessage);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  /** 创建顶部 DOM 标题栏，覆盖在 iframe 之上 */
  private createHeader(nodeName: string) {
    const header = document.createElement('div');
    header.style.position = 'absolute';
    header.style.top = '0';
    header.style.left = '0';
    header.style.right = '0';
    header.style.height = '44px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.padding = '0 16px';
    header.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)';
    header.style.zIndex = '10';
    header.style.pointerEvents = 'none'; // 整体不拦截，仅按钮可点

    const title = document.createElement('span');
    title.textContent = `裂隙战斗：${nodeName}`;
    title.style.fontSize = '16px';
    title.style.color = '#f472b6';
    title.style.fontWeight = '600';
    title.style.textShadow = '0 1px 4px rgba(0,0,0,0.8)';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← 撤退';
    backBtn.style.fontSize = '15px';
    backBtn.style.color = '#bbb';
    backBtn.style.background = 'rgba(0,0,0,0.4)';
    backBtn.style.border = '1px solid rgba(255,255,255,0.15)';
    backBtn.style.borderRadius = '8px';
    backBtn.style.padding = '4px 10px';
    backBtn.style.cursor = 'pointer';
    backBtn.style.pointerEvents = 'auto';
    backBtn.style.fontFamily = 'inherit';
    backBtn.addEventListener('click', () => this.exitBattle());

    header.appendChild(title);
    header.appendChild(backBtn);
    document.getElementById('game')!.appendChild(header);
    this.headerEl = header;
  }

  private startIframe() {
    // vw/vh：让战斗层按手机竖屏比例投影（默认 1200×800 是横屏）
    const url = `${this.getBattleUrl()}?embed=1&stage=${encodeURIComponent(
      this.stage
    )}&vw=800&vh=1200`;

    this.iframe?.remove();
    this.iframe = document.createElement('iframe');
    this.iframe.src = url;
    this.iframe.title = '裂隙战斗';
    this.iframe.style.position = 'absolute';
    this.iframe.style.left = '0';
    this.iframe.style.top = '0';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.background = '#0a0a12';
    this.iframe.allow = 'autoplay; fullscreen';
    document.getElementById('game')!.appendChild(this.iframe);

    this.loadingText?.setVisible(true);
  }

  /**
   * 战斗游戏 URL。
   * 开发模式：http://localhost:3000（liangjie-battle 的 dev server）
   * 生产模式：./battle/index.html（构建时把战斗层产物拷进来）
   */
  private getBattleUrl(): string {
    if (import.meta.env.DEV) {
      return 'http://localhost:3000/';
    }
    return './battle/index.html';
  }

  /** 计算战斗层的合法 origin（用于消息来源校验） */
  private get battleOrigin(): string {
    try {
      return new URL(this.getBattleUrl(), window.location.href).origin;
    } catch {
      return window.location.origin;
    }
  }

  private onBattleMessage = (event: MessageEvent) => {
    // 仅接受来自战斗层 iframe 的消息，防止伪造结算数据
    if (event.origin !== this.battleOrigin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'liangjie:ready') {
      this.loadingText?.setVisible(false);
      // 嵌入模式跳过了战斗层自带引导，这里由客户端补充新手引导
      this.showBattleTutorial();
      return;
    }

    if (data.type === 'liangjie:game_over' && !this.finished) {
      this.finished = true;
      this.handleGameOver(data as Partial<BattleResult>);
    }
  };

  /** 向战斗层 iframe 发送控制消息 */
  private postToBattle(payload: Record<string, unknown>) {
    this.iframe?.contentWindow?.postMessage(payload, '*');
  }

  private showBattleTutorial() {
    const seen = localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
    if (seen) return;

    // 引导期间暂停战斗，避免玩家读说明时被攻击
    this.postToBattle({ type: 'liangjie:pause' });

    const node = getNodeById(this.nodeId);
    openOverlay(this, {
      title: `裂隙战斗：${node?.name || ''}`,
      lines: [
        '🎮 操作：WASD / 方向键移动，手机端滑动屏幕任意位置',
        '⚔️ 武器自动攻击，无需手动操作',
        '💎 击杀敌人掉落经验宝石，靠近自动吸收',
        '⬆️ 升级时从三张卡片中选择武器或被动强化',
        '⏱️ 存活越久、击杀越多，奖励越丰厚',
        '👑 击败区域 Boss 可解锁新的裂隙节点',
        '',
        '准备好后点击「进入裂隙」开始战斗。'
      ],
      dismissible: false,
      actions: [
        {
          label: '进入裂隙',
          onClick: () => {
            localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
            // 关闭引导，恢复战斗
            this.postToBattle({ type: 'liangjie:pause' });
          }
        }
      ]
    });
  }

  private handleGameOver(data: Partial<BattleResult>) {
    // 战斗层自带结算界面，先隐藏 iframe 以免遮挡 Phaser 覆盖层
    if (this.iframe) this.iframe.style.display = 'none';

    const result: BattleResult = {
      nodeId: this.nodeId,
      stage: data.stage || this.stage,
      kills: data.kills || 0,
      time: data.time || 0,
      level: data.level || 1,
      bossKills: data.bossKills || 0
    };
    const reward = applyBattleResult(result);
    const progress = loadProgress();
    const minutes = Math.floor(result.time / 60);
    const seconds = Math.floor(result.time % 60);

    const lines = [
      `击杀 ${result.kills} · 存活 ${minutes}:${String(seconds).padStart(2, '0')}`,
      `获得灵石 ${reward.spiritStones} · 灵草 ${reward.herbs} · 经验 ${reward.exp}`,
      reward.leveledUp
        ? `升级！当前等级 Lv.${reward.level}（生命上限 ${progress.maxHp}）`
        : `当前等级 Lv.${progress.level}`,
      ''
    ];

    for (const nodeId of reward.unlocked) {
      const unlockedNode = getNodeById(nodeId);
      lines.push(`🔓 新区域解锁：${unlockedNode?.name || nodeId}`);
    }
    if (reward.unlocked.length === 0) {
      lines.push('回城休整，或直接再战。');
    }

    openOverlay(this, {
      title: '战斗结束',
      lines,
      dismissible: false,
      actions: [
        { label: '再战', onClick: () => this.restartBattle() },
        { label: '返回世界地图', onClick: () => this.exitBattle() }
      ]
    });
  }

  private restartBattle() {
    this.scene.restart({ from: SceneKeys.Battle, nodeId: this.nodeId, stage: this.stage });
  }

  private cleanup() {
    window.removeEventListener('message', this.onBattleMessage);
    this.iframe?.remove();
    this.iframe = undefined;
    this.headerEl?.remove();
    this.headerEl = undefined;
  }

  private exitBattle() {
    this.scene.start(SceneKeys.WorldMap);
  }
}
