/**
 * @module bridge
 * @description 《两界之间》父页面（Phaser 客户端）与战斗层之间的 postMessage 桥接。
 *
 * 协议（父 → 战斗）：
 *   { type: 'liangjie:start', stage: 'forest' }  请求以指定关卡开始
 *   { type: 'liangjie:pause' }                    请求暂停 / 继续
 *
 * 协议（战斗 → 父）：
 *   { type: 'liangjie:ready' }                    战斗层已就绪
 *   { type: 'liangjie:game_over', stage, kills, time, level, bossKills }
 *
 * 当页面被 iframe 嵌入（或 URL 带 embed=1）时自动隐藏开始菜单并按 URL 的
 * stage 参数开局，因此父页面只需给出正确的 src 即可。
 */

/**
 * 在 Game 构造前按 URL 的 vw/vh 覆盖视口尺寸，用于手机竖屏嵌入。
 * 只在显式传参时生效，桌面独立运行保持 1200×800。
 */

import { CONFIG } from './config.js';

export function applyViewportOverride() {
    if (typeof location === 'undefined') return;
    const params = new URLSearchParams(location.search || '');
    const vw = Number(params.get('vw'));
    const vh = Number(params.get('vh'));
    if (!Number.isFinite(vw) || !Number.isFinite(vh)) return;
    if (vw < 320 || vh < 320 || vw > 2000 || vh > 2000) return;

    CONFIG.CANVAS_WIDTH = vw;
    CONFIG.CANVAS_HEIGHT = vh;
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.width = vw;
        canvas.height = vh;
    }
}

function isEmbedded() {
    return window.parent !== window;
}

/** 当前是否运行在《两界之间》父页面的 iframe 中 */
export function isEmbedMode() {
    if (typeof window === 'undefined') return false;
    if (isEmbedded()) return true;
    return new URLSearchParams(window.location.search || '').get('embed') === '1';
}

function post(payload) {
    if (!isEmbedded()) return;
    window.parent.postMessage(payload, '*');
}

function readParams() {
    try {
        return new URLSearchParams(window.location.search);
    } catch {
        return new URLSearchParams('');
    }
}

/**
 * 初始化桥接。应在 Game 构造完成后、用户操作前调用。
 * @param {import('./main.js').Game} game
 */
export function initBridge(game) {
    const params = readParams();
    const embed = isEmbedMode();
    if (!embed) return;

    // iframe 内不需要 PWA 安装引导：父页面自己管理外层壳。
    const pwa = document.getElementById('pwaInstallPrompt');
    if (pwa) pwa.style.display = 'none';
    // 首次上手引导由父页面统一负责，战斗层直接进入游戏。
    const howTo = document.getElementById('howToPlayScreen');
    if (howTo) howTo.style.display = 'none';

    const startWith = (stageId) => {
        if (!stageId) return;
        if (!game.save.settings) game.save.settings = {};
        game.save.settings.stage = stageId;
        game.ui.hideStart();
        try {
            game.audio.unlock();
        } catch {
            /* 自动播放被拦截时忽略 */
        }
        game.start();
    };

    const stageParam = params.get('stage');
    if (stageParam) {
        // 等一帧，确保 UI / 音频节点初始化完成
        setTimeout(() => startWith(stageParam), 200);
    }

    window.addEventListener('message', (event) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'liangjie:start') startWith(data.stage);
        if (data.type === 'liangjie:pause') game.togglePause?.();
    });

    post({ type: 'liangjie:ready', stage: stageParam || null });
}

/**
 * 上报战斗结束。由 Game.gameOver() 在本地结算完成后调用。
 * @param {import('./main.js').Game} game
 */
export function notifyGameOver(game) {
    post({
        type: 'liangjie:game_over',
        stage: game.stageId,
        kills: game.kills,
        time: game.gameTime,
        level: game.player?.level || 1,
        bossKills: Object.keys(game.run?.bossesDefeated || {}).length
    });
}
