// 이 앱을 오프라인에서도 쓸 수 있게 해주는 서비스 워커입니다.
// 캐시 이름의 버전(v1)을 올리면 사용자 브라우저의 캐시가 갱신됩니다.
const CACHE_NAME = 'ox-quiz-cache-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 페이지 이동(새로고침, 첫 접속 등)은 최신 내용을 우선 시도하고,
  // 오프라인이라 실패하면 캐시해둔 index.html을 보여줍니다.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', resClone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 그 외 리소스(아이콘 등)는 캐시를 우선 사용하고, 없으면 네트워크에서 받아와 캐시에 저장합니다.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
