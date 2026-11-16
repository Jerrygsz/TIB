// 两界之间 · 程序化贴图
// 项目暂未引入美术资源，这里用 Graphics 生成瓦片与精灵贴图，
// 让城镇/世界地图脱离纯色矩形占位，同时保持零外部素材依赖。
import Phaser from 'phaser';

/** 固定种子的伪随机，保证每次启动贴图一致 */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function draw(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  paint: (g: Phaser.GameObjects.Graphics) => void
) {
  const g = scene.add.graphics();
  paint(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

const BUILDING_SIZE: Record<string, [number, number]> = {
  shop: [120, 100],
  office: [140, 110],
  lab: [110, 90],
  portal: [100, 100]
};

export const BUILDING_TEXTURE: Record<string, string> = {
  shop: 'bld_shop',
  office: 'bld_office',
  lab: 'bld_lab',
  portal: 'bld_portal'
};

/** 生成全部贴图（幂等，重复调用直接返回） */
export function ensureTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('tile_ground')) return;

  // --- 地面瓦片 -----------------------------------------------------------
  draw(scene, 'tile_ground', 64, 64, (g) => {
    g.fillStyle(0x151d31, 1);
    g.fillRect(0, 0, 64, 64);
    const rnd = makeRng(7);
    for (let i = 0; i < 46; i++) {
      const c = i % 3 === 0 ? 0x1d2740 : 0x111828;
      g.fillStyle(c, 0.7);
      g.fillRect(Math.floor(rnd() * 62), Math.floor(rnd() * 62), 2, 2);
    }
    g.lineStyle(1, 0x1f2a44, 0.5);
    g.strokeRect(0.5, 0.5, 63, 63);
  });

  draw(scene, 'tile_path', 64, 64, (g) => {
    g.fillStyle(0x2a2438, 1);
    g.fillRect(0, 0, 64, 64);
    const rnd = makeRng(19);
    for (let i = 0; i < 40; i++) {
      g.fillStyle(i % 2 ? 0x332c45 : 0x241f31, 0.8);
      g.fillRect(Math.floor(rnd() * 60), Math.floor(rnd() * 60), 3, 2);
    }
    g.lineStyle(1, 0x3a3350, 0.4);
    g.strokeRect(0.5, 0.5, 63, 63);
  });

  // --- 玩家精灵 -----------------------------------------------------------
  draw(scene, 'hero_hero', 36, 44, (g) => {
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(18, 40, 24, 8);
    // 道袍
    g.fillStyle(0x24405e, 1);
    g.fillTriangle(18, 12, 7, 38, 29, 38);
    g.fillStyle(0x2f6f8f, 1);
    g.fillTriangle(18, 15, 12, 36, 24, 36);
    // 头部
    g.fillStyle(0xf1c9a5, 1);
    g.fillCircle(18, 12, 7);
    g.fillStyle(0x0f1a2a, 1);
    g.fillRect(11, 4, 14, 4);
    // 佩剑
    g.fillStyle(0xd9e6ff, 1);
    g.fillRect(26, 8, 2, 22);
    g.fillStyle(0x8b5a2b, 1);
    g.fillRect(25, 28, 4, 3);
    // 灵气微光
    g.fillStyle(0x6ea8fe, 0.35);
    g.fillCircle(18, 22, 12);
  });

  // --- 建筑贴图 -----------------------------------------------------------
  draw(scene, BUILDING_TEXTURE.shop, BUILDING_SIZE.shop[0], BUILDING_SIZE.shop[1], (g) => {
    const [w, h] = BUILDING_SIZE.shop;
    g.fillStyle(0x2a1f38, 0.6);
    g.fillRect(6, h - 10, w - 12, 10);
    g.fillStyle(0xb87a2b, 1);
    g.fillRect(8, 34, w - 16, h - 44);
    // 屋顶
    g.fillStyle(0xf0b24a, 1);
    g.fillTriangle(0, 36, w / 2, 4, w, 36);
    // 遮阳棚条纹
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i % 2 ? 0xf5e6c8 : 0xd9534f, 1);
      g.fillRect(14 + i * 15, 46, 15, 8);
    }
    // 门与窗
    g.fillStyle(0x2b1c10, 1);
    g.fillRect(w / 2 - 12, h - 34, 24, 24);
    g.fillStyle(0xffe9a8, 0.9);
    g.fillRect(20, 62, 16, 12);
    g.fillRect(w - 36, 62, 16, 12);
  });

  draw(scene, BUILDING_TEXTURE.office, BUILDING_SIZE.office[0], BUILDING_SIZE.office[1], (g) => {
    const [w, h] = BUILDING_SIZE.office;
    g.fillStyle(0x14243d, 0.7);
    g.fillRect(8, h - 10, w - 16, 10);
    g.fillStyle(0x243b5c, 1);
    g.fillRect(10, 20, w - 20, h - 30);
    g.fillStyle(0x2f5480, 1);
    g.fillRect(10, 12, w - 20, 12);
    // 窗口灯
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        g.fillStyle((row + col) % 3 === 0 ? 0x9fd8ff : 0x5c8fc0, 0.85);
        g.fillRect(20 + col * 26, 34 + row * 20, 16, 12);
      }
    }
    g.fillStyle(0x8fd0ff, 1);
    g.fillRect(w / 2 - 14, h - 28, 28, 18);
    // 顶部标识
    g.fillStyle(0x6ea8fe, 0.8);
    g.fillCircle(w / 2, 18, 5);
  });

  draw(scene, BUILDING_TEXTURE.lab, BUILDING_SIZE.lab[0], BUILDING_SIZE.lab[1], (g) => {
    const [w, h] = BUILDING_SIZE.lab;
    g.fillStyle(0x1d1830, 0.7);
    g.fillRect(6, h - 9, w - 12, 9);
    g.fillStyle(0x40355e, 1);
    g.fillRect(10, 40, w - 20, h - 49);
    // 圆顶
    g.fillStyle(0x7c62c9, 1);
    g.fillCircle(w / 2, 42, w / 2 - 10);
    g.fillStyle(0xa78bfa, 0.9);
    g.fillCircle(w / 2, 38, w / 2 - 22);
    // 灵液罐
    g.fillStyle(0x86efac, 0.9);
    g.fillRect(24, 62, 12, 18);
    g.fillRect(w - 38, 62, 12, 18);
    g.fillStyle(0xe0f7ea, 0.8);
    g.fillRect(w / 2 - 8, 58, 16, 22);
  });

  draw(scene, BUILDING_TEXTURE.portal, BUILDING_SIZE.portal[0], BUILDING_SIZE.portal[1], (g) => {
    const [w, h] = BUILDING_SIZE.portal;
    const cx = w / 2;
    const cy = h / 2;
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(cx, h - 10, w - 20, 14);
    // 石台
    g.fillStyle(0x3a3350, 1);
    g.fillEllipse(cx, h - 16, w - 24, 22);
    // 法阵光晕
    g.fillStyle(0xf472b6, 0.16);
    g.fillCircle(cx, cy, 40);
    g.lineStyle(3, 0xf472b6, 0.9);
    g.strokeCircle(cx, cy, 32);
    g.lineStyle(2, 0xc8b6ff, 0.8);
    g.strokeCircle(cx, cy, 22);
    g.lineStyle(2, 0xffd7ef, 0.9);
    g.beginPath();
    g.moveTo(cx - 22, cy);
    g.lineTo(cx, cy - 22);
    g.lineTo(cx + 22, cy);
    g.lineTo(cx, cy + 22);
    g.closePath();
    g.strokePath();
  });

  // --- 世界地图节点图标 -----------------------------------------------
  draw(scene, 'node_city', 48, 48, (g) => {
    g.fillStyle(0x1b2a47, 1);
    g.fillRect(6, 40, 36, 4);
    g.fillStyle(0x6ea8fe, 1);
    g.fillRect(12, 18, 10, 22);
    g.fillRect(26, 12, 10, 28);
    g.fillStyle(0x9fd8ff, 1);
    g.fillRect(14, 22, 6, 4);
    g.fillRect(28, 16, 6, 4);
    g.fillTriangle(24, 12, 31, 4, 38, 12);
  });

  draw(scene, 'node_town', 48, 48, (g) => {
    g.fillStyle(0x1b3324, 1);
    g.fillRect(6, 40, 36, 4);
    g.fillStyle(0x86efac, 1);
    g.fillRect(10, 24, 14, 16);
    g.fillTriangle(8, 24, 17, 12, 26, 24);
    g.fillStyle(0x4ade80, 1);
    g.fillRect(27, 30, 11, 10);
    g.fillTriangle(25, 30, 32.5, 20, 40, 30);
  });

  draw(scene, 'node_field', 48, 48, (g) => {
    g.fillStyle(0x1b3324, 1);
    g.fillRect(6, 40, 36, 4);
    g.fillStyle(0x5c4b2e, 1);
    g.fillRect(21, 30, 6, 10);
    g.fillStyle(0x4ade80, 1);
    g.fillTriangle(24, 6, 8, 32, 40, 32);
    g.fillStyle(0x86efac, 1);
    g.fillTriangle(24, 14, 14, 30, 34, 30);
  });

  draw(scene, 'node_rift', 48, 48, (g) => {
    const cx = 24;
    const cy = 24;
    const pts: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const r = i % 2 === 0 ? 19 : 8;
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    g.fillStyle(0xf472b6, 0.25);
    g.fillCircle(cx, cy, 20);
    g.fillStyle(0xf9a8d4, 1);
    g.fillPoints(pts, true);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx, cy, 4);
  });

  draw(scene, 'node_ruins', 48, 48, (g) => {
    g.fillStyle(0x3b3324, 1);
    g.fillRect(6, 40, 36, 4);
    g.fillStyle(0xfbbf24, 1);
    g.fillRect(11, 16, 7, 24);
    g.fillRect(22, 22, 7, 18);
    g.fillRect(33, 12, 7, 28);
    g.fillStyle(0x6b5a34, 1);
    g.fillRect(9, 12, 11, 5);
  });

  draw(scene, 'node_locked', 48, 48, (g) => {
    g.fillStyle(0x2a2a3a, 1);
    g.fillRoundedRect(14, 22, 20, 16, 3);
    g.lineStyle(4, 0x4a4a5e, 1);
    g.beginPath();
    g.arc(24, 22, 8, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(0x6a6a80, 1);
    g.fillCircle(24, 30, 3);
  });

  // --- 世界地图背景 ---------------------------------------------------
  draw(scene, 'map_bg', 256, 256, (g) => {
    g.fillStyle(0x0a0d18, 1);
    g.fillRect(0, 0, 256, 256);
    const rnd = makeRng(42);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * 256;
      const y = rnd() * 256;
      const r = rnd() * 1.6 + 0.4;
      g.fillStyle(i % 5 === 0 ? 0x8fa8ff : 0x3a4a7a, rnd() * 0.6 + 0.2);
      g.fillCircle(x, y, r);
    }
    // 灵气雾团
    for (let i = 0; i < 5; i++) {
      g.fillStyle(i % 2 ? 0x2a1f4a : 0x10263a, 0.35);
      g.fillCircle(rnd() * 256, rnd() * 256, 30 + rnd() * 40);
    }
  });

  // --- 城镇装饰物 -----------------------------------------------------
  draw(scene, 'prop_herb', 32, 28, (g) => {
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(16, 24, 20, 6);
    g.fillStyle(0x2f7d4f, 1);
    g.fillTriangle(16, 4, 7, 24, 25, 24);
    g.fillStyle(0x4ade80, 1);
    g.fillTriangle(16, 8, 11, 22, 21, 22);
    g.fillStyle(0xd9f99d, 1);
    g.fillCircle(16, 10, 3);
  });

  draw(scene, 'prop_ore', 32, 28, (g) => {
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(16, 24, 22, 6);
    g.fillStyle(0x4a4a5e, 1);
    g.fillTriangle(6, 24, 14, 8, 22, 24);
    g.fillStyle(0x6b6b85, 1);
    g.fillTriangle(16, 24, 24, 12, 30, 24);
    g.fillStyle(0x9fd8ff, 0.9);
    g.fillRect(13, 14, 3, 4);
    g.fillRect(24, 17, 2, 3);
  });
}
