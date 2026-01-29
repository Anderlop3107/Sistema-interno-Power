// 1. INSTALACIÓN Y ACTIVACIÓN RÁPIDA
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// 2. ESCUCHAR EL EVENTO PUSH (Lo que hace que el banner baje)
// Nota: showNotification se llama aquí o desde el JS principal. 
// Para asegurar que sea "Heads-up" (que baje), usamos tag único y renotify.
self.addEventListener('push', function(event) {
    const title = "🔥 ¡NUEVO PEDIDO!";
    const options = {
        body: "Tienes un pedido pendiente de revisión.",
        icon: "LogoBow.png",
        badge: "LogoBow.png",
        vibrate: [300, 100, 300],
        tag: 'pedido-nuevo-' + Date.now(), // Tag único para que "baje" siempre
        renotify: true,
        data: { url: './cocina.html' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// 3. CONTROLAR EL CLIC (Lo que hace que al tocarlo te lleve a la app)
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Cierra el banner
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Si la app ya está abierta, traerla al frente (Focus)
            for (let client of clientList) {
                if (client.url.includes('cocina.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si la app está cerrada, abrir una ventana nueva
            if (clients.openWindow) {
                return clients.openWindow('./cocina.html');
            }
        })
    );
});

