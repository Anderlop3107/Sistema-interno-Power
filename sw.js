// 1. INSTALACIÓN Y ACTIVACIÓN
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// 2. EVENTO PUSH CORREGIDO
self.addEventListener('push', function(event) {
    const title = "🔥 ¡NUEVO PEDIDO!";
    
    // Configuración robusta
    const options = {
        body: "Toca para ver los detalles del pedido",
        icon: "LogoPow.png",  
        badge: "LogoPow.png", 
        vibrate: [300, 100, 300, 100, 300],
        tag: 'pedido-' + Date.now(), // Esto obliga al celular a que el banner "BAJE"
        renotify: true,
        requireInteraction: true, 
        data: { url: './cocina.html' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// 3. CONTROLAR EL CLIC
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
