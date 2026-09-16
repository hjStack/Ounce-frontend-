self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "미드나이트 세일", {
      body: data.body || "오늘의 특가 상품을 확인해보세요.",
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: { url: data.url || "/timedeal" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/timedeal"));
});
