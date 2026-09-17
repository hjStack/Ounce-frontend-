self.addEventListener("install", () => {
  // 새 버전을 배포하면 대기하지 않고 바로 활성화합니다.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 현재 열려 있는 페이지에도 새 서비스 워커를 즉시 적용합니다.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error("푸시 payload를 JSON으로 읽을 수 없습니다.", error);
  }

  const title = data.title || "미드나이트 세일";
  const options = {
    body: data.body || "오늘의 특가 상품을 확인해보세요.",
    icon: data.icon || "/favicon.png",
    badge: data.badge || "/favicon.png",
    tag: data.tag || "midnight-sale",
    renotify: Boolean(data.renotify),
    data: {
      url: data.url || "/timedeal",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/timedeal",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.navigate(targetUrl).then((windowClient) => windowClient?.focus());
        }
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
