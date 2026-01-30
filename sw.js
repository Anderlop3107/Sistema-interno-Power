self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

// Escucha el mensaje desde cocina.js
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NUEVO_PEDIDO') {
        const title = "🔥 ¡NUEVO PEDIDO!";
        const options = {
            body: `Cliente: ${event.data.cliente}`,
            icon: 'LogoPow.png', 
            badge: 'LogoPow.png',
            vibrate: [500, 110, 500, 110, 500],
            tag: 'pedido-nuevo',
            renotify: true,
            requireInteraction: true, // No desaparece hasta que se toca
            data: { url: './cocina.html' }
        };
        self.registration.showNotification(title, options);
    }
});

// Controlar el clic
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
