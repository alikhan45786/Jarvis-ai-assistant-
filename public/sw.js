// Jarvis Android Background & Home Screen Service Worker
const CACHE_NAME = "jarvis-android-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the Jarvis UI to show/update persistent Android background notification
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "START_BACKGROUND_SERVICE") {
    const title = data.title || "Jarvis Active in Background";
    const body =
      data.body ||
      "Listening & ready for Android voice commands. Tap to open Jarvis or trigger voice mic.";
    if (self.registration && self.registration.showNotification) {
      self.registration.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: "jarvis-background-service",
        renotify: false,
        silent: true,
        requireInteraction: true,
        data: { url: "/?action=voice" },
      });
    }
  } else if (data.type === "STOP_BACKGROUND_SERVICE") {
    if (self.registration && self.registration.getNotifications) {
      self.registration
        .getNotifications({ tag: "jarvis-background-service" })
        .then((notifications) => {
          notifications.forEach((n) => n.close());
        });
    }
  }
});

// Handle notification tap from Android status bar / lock screen / home screen
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/?action=voice";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({
            type: "JARVIS_HOME_SCREEN_ACTION",
            action: "voice",
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
