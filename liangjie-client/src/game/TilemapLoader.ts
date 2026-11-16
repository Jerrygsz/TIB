// 两界之间 · Tiled 瓦片地图加载器
// 解析 Tiled 导出的 JSON 地图，将瓦片层渲染为程序化贴图，
// 将对象层数据返回给场景用于创建建筑/采集点。
import Phaser from 'phaser';

export interface TiledMapObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Record<string, string | number | boolean>;
}

export interface TiledLayer {
  id: number;
  name: string;
  type: 'tilelayer' | 'objectgroup';
  data?: number[];
  objects?: TiledMapObject[];
  width?: number;
  height?: number;
}

export interface TiledTilesetTile {
  id: number;
  type: string;
  texture: string;
}

export interface TiledMapData {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tileTextures: Map<number, string>;
}

/**
 * 加载 Tiled JSON 地图及其引用的 tileset。
 * 返回解析后的地图数据与瓦片 ID → 贴图 key 的映射表。
 */
export async function loadTiledMap(
  scene: Phaser.Scene,
  mapUrl: string
): Promise<TiledMapData> {
  const mapRes = await fetch(mapUrl);
  const mapJson = await mapRes.json();

  // 解析 tileset（支持内嵌或外部引用）
  const tileTextures = new Map<number, string>();
  for (const ts of mapJson.tilesets || []) {
    if (ts.tiles) {
      // 内嵌 tiles
      for (const t of ts.tiles) {
        tileTextures.set(ts.firstgid + t.id, t.texture);
      }
    } else if (ts.source) {
      // 外部 tileset JSON
      const tsRes = await fetch(ts.source);
      const tsJson = await tsRes.json();
      for (const t of tsJson.tiles || []) {
        tileTextures.set(ts.firstgid + t.id, t.texture);
      }
    }
  }

  return {
    width: mapJson.width,
    height: mapJson.height,
    tilewidth: mapJson.tilewidth,
    tileheight: mapJson.tileheight,
    layers: mapJson.layers as TiledLayer[],
    tileTextures
  };
}

/**
 * 将瓦片层渲染到场景。返回创建的瓦片图像数组。
 */
export function renderTileLayer(
  scene: Phaser.Scene,
  layer: TiledLayer,
  map: TiledMapData,
  originX = 0,
  originY = 0
): Phaser.GameObjects.Image[] {
  if (layer.type !== 'tilelayer' || !layer.data) return [];
  const tiles: Phaser.GameObjects.Image[] = [];
  const tw = map.tilewidth;
  const th = map.tileheight;
  const cols = layer.width || map.width;

  for (let i = 0; i < layer.data.length; i++) {
    const gid = layer.data[i];
    if (gid === 0) continue;
    const tex = map.tileTextures.get(gid);
    if (!tex) continue;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const img = scene.add
      .image(originX + col * tw + tw / 2, originY + row * th + th / 2, tex)
      .setOrigin(0.5, 0.5);
    tiles.push(img);
  }
  return tiles;
}

/**
 * 从对象层中提取指定类型的对象。
 */
export function getObjectsByType(
  layer: TiledLayer | undefined,
  type: string
): TiledMapObject[] {
  if (!layer || layer.type !== 'objectgroup' || !layer.objects) return [];
  return layer.objects.filter((o) => o.type === type);
}

/**
 * 获取指定名称的图层。
 */
export function getLayer(map: TiledMapData, name: string): TiledLayer | undefined {
  return map.layers.find((l) => l.name === name);
}
