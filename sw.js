// 1. INSTALACIÓN Y ACTIVACIÓN
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// 2. EVENTO PUSH (Recibir notificación)
self.addEventListener('push', function(event) {
    const title = "🔥 ¡NUEVO PEDIDO!";
    const options = {
        body: "Toca para abrir la cocina",
        icon: self.location.origin + "/LogoPow.png", 
        badge: self.location.origin + "/LogoPow.png",
        vibrate: [500, 110, 500],
        tag: 'pedido-' + Date.now(),
        renotify: true,
        requireInteraction: true,
        data: { url: './cocina.html' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// 3. CONTROLAR EL CLIC (Abrir la app)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let client of clientList) {
                if (client.url.includes('cocina.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow('./cocina.html');
        })
    );
});
