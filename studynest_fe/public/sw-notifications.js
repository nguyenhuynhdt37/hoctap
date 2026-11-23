/* Service Worker chuyên dụng cho Thông báo thiết bị Mây Mây */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if (targetUrl && "navigate" in client) {
            try {
              const absolute = new URL(targetUrl, self.location.origin).href;
              if (client.url !== absolute) {
                client.navigate(absolute);
              }
            } catch {
              // Bỏ qua URL không hợp lệ
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
