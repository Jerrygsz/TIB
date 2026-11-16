// 把战斗层（liangjie-battle）的静态产物同步进 dist/battle，
// 让生产构建可以直接以同源 iframe 加载战斗层，无需单独起服务。
import { cp, rm, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(here, '..');
const battleRoot = path.resolve(clientRoot, '..', 'liangjie-battle');
const outDir = path.resolve(clientRoot, 'dist', 'battle');

// 战斗层是零依赖静态项目，直接拷贝这些文件/目录即可运行
const ENTRIES = ['index.html', 'styles.css', 'manifest.json', 'service-worker.js', 'src', 'docs'];

async function exists(target) {
  try {
    await access(target, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(battleRoot))) {
  console.error(`[sync-battle] 找不到战斗层目录：${battleRoot}`);
  process.exit(1);
}

await rm(outDir, { recursive: true, force: true });

for (const entry of ENTRIES) {
  const from = path.join(battleRoot, entry);
  if (!(await exists(from))) {
    console.warn(`[sync-battle] 跳过缺失项：${entry}`);
    continue;
  }
  await cp(from, path.join(outDir, entry), { recursive: true });
  console.log(`[sync-battle] ${entry}`);
}

console.log(`[sync-battle] 已输出到 ${outDir}`);
