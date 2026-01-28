// sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => clients.claim());

// Controla qué pasa cuando tocas la barrita de notificación
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Si la app ya está abierta, ponle el foco
            for (let client of clientList) {
                if (client.url.includes('cocina.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si está cerrada, ábrela
            if (clients.openWindow) return clients.openWindow('./cocina.html');
        })
    );
});
