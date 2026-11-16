// 两界之间 · Service Worker（PWA 离线缓存）
// 重要：HTML 走 network-first，确保部署更新后用户能拿到最新版（避免缓存旧黑屏页）
const CACHE_VERSION = 'liangjie-v2';
const APP_SHELL = [
  './',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
      .then(() => self.clients.claim())
      .then(() => {
        // 新 SW 接管后，强制所有窗口客户端刷新，确保加载最新版页面
        // （旧版 index.html 可能没有更新监听逻辑，所以用 navigate 强制刷新）
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            if ('navigate' in client) {
              client.navigate(client.url).catch(() => {});
            }
          });
        });
      })
  );
});

// 接收页面消息，立即跳过等待阶段激活新 SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 判断是否是 HTML 导航请求
function isHtmlRequest(req) {
  return req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML 文档：network-first，确保部署后立即可见，离线时回退缓存
  if (isHtmlRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：cache-first（带 hash 文件名，更新时文件名会变）
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
