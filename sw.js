self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "¡NUEVO PEDIDO! 🍔";
    const options = {
        body: data.body || "Revisa la lista de pedidos.",
        icon: "LogoBow.png",
        badge: "LogoBow.png",
        vibrate: [300, 100, 300]
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Al hacer clic en la notificación, abre la app
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});