// 1. INSTALACIÓN Y ACTIVACIÓN RÁPIDA
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// 2. ESCUCHAR EL EVENTO PUSH (Lo que hace que el banner baje con tu LOGO)
self.addEventListener('push', function(event) {
    // Intentamos sacar el nombre del cliente si viene en el evento, 
    // si no, ponemos un texto general.
    let nombreCliente = "Nuevo Pedido";
    try {
        const data = event.data.json();
        nombreCliente = data.cliente || "Nuevo Pedido";
    } catch (e) {
        console.log("Push sin JSON, usando texto por defecto");
    }

    const title = "🔥 ¡NUEVO PEDIDO!";
    const options = {
        body: `Cliente: ${nombreCliente}`,
        icon: "LogoPow.png",  // <--- VERIFICA QUE ESTE NOMBRE SEA EXACTO
        badge: "LogoPow.png", // <--- ICONO PEQUEÑO PARA LA BARRA SUPERIOR
        vibrate: [300, 100, 300],
        tag: 'pedido-nuevo-' + Date.now(),
        renotify: true,
        requireInteraction: true, // El banner se queda hasta que lo toquen o deslicen
        data: { url: './cocina.html' }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// 3. CONTROLAR EL CLIC (Llevar al cocinero a la app)
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); 
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let client of clientList) {
                if (client.url.includes('cocina.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./cocina.html');
            }
        })
    );
});
