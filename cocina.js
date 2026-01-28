// 1. IMPORTACIONES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, set, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyC34X4eikjCb5q1kOe479kV1hi9Yf6KpjE",
    authDomain: "pedidos-power.firebaseapp.com",
    databaseURL: "https://pedidos-power-default-rtdb.firebaseio.com",
    projectId: "pedidos-power",
    storageBucket: "pedidos-power.firebasestorage.app",
    messagingSenderId: "269752304723",
    appId: "1:269752304723:web:ab7ccac47a7859ce0672a6"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 3. VARIABLES DE CONTROL
const sonidoNuevo = document.getElementById('notificacion');
const sonidoListo = document.getElementById('sonidoListo');
let primeraCarga = true;
let pedidosLocales = {};
let conteoAnterior = 0;

// Se ejecuta una sola vez al primer toque para habilitar audios
document.addEventListener('click', () => {
    [sonidoNuevo, sonidoListo].forEach(s => {
        if(s) { s.play().then(() => { s.pause(); s.currentTime = 0; }).catch(()=>{}); }
    });
}, { once: true });

// Función para lanzar la alerta al celular
function lanzarNotificacionExterna(nombre) {
    if (Notification.permission === "granted") {
        new Notification("🍔 ¡NUEVO PEDIDO!", {
            body: `Preparar pedido de: ${nombre}`,
            icon: "LogoPow.png",
            vibrate: [300, 100, 300]
        });
    } else {
        // Si no tenemos permiso todavía, lo pedimos
        Notification.requestPermission();
    }
}

// 5. ESCUCHAR PEDIDOS EN TIEMPO REAL
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    contenedor.innerHTML = ""; // Limpiar pantalla
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "1fr 1fr";
    contenedor.style.gap = "15px";
    contenedor.style.direction = "rtl"; // Pedido nuevo a la derecha

    if (pedidos) {
        const ids = Object.keys(pedidos);
        
        // Alerta sonora si hay un pedido nuevo
        if (!primeraCarga && ids.length > conteoAnterior) { 
    if(sonidoNuevo) {
        sonidoNuevo.currentTime = 0;
        sonidoNuevo.play().catch(e => console.log("Error sonido:", e)); 
    }
    
    // Sacamos el nombre del último pedido para la notificación
    const ultimoId = ids[ids.length - 1];
    const nombreCliente = pedidos[ultimoId].cliente;
    lanzarNotificacionExterna(nombreCliente);
}
        conteoAnterior = ids.length;

        // Detectar productos repetidos para resaltar
        const prodP1 = ids[0] ? Object.keys(pedidos[ids[0]].productos) : [];
        const prodP2 = ids[1] ? Object.keys(pedidos[ids[1]].productos) : [];
        const repetidos = prodP1.filter(item => prodP2.includes(item));

        ids.forEach((id, index) => {
            if (index > 1) return; // Solo mostrar los 2 primeros

            const p = pedidos[id];
            let listaHTML = "<ul style='padding:0; list-style:none;'>";
            
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const nombre = key.replace("qty_", "").toUpperCase();
                    const esRepetido = repetidos.includes(key);
                    const estiloLi = `padding:5px; border-radius:6px; ${esRepetido ? 'background:#fff8e1; border-left:5px solid #ff8c00; font-weight:bold;' : ''}`;
                    listaHTML += `<li style="${estiloLi}"><span style="color:#ff8c00;">${cant}</span> x ${nombre}</li>`;
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr"; 
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span style="color:#ff8c00;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                    <span>🕒 ${p.hora || ''}</span>
                </div>
                <p><b>👤 ${p.cliente}</b><br><b>📍 ${p.entrega}</b></p>
                <hr>
                ${listaHTML}
                
                ${p.observaciones ? `<div class="coincidencia" style="background:#fff176; margin: 10px 0; padding: 8px; border-radius: 8px; border-left: 5px solid #ffd600; color: #000; font-weight: bold; font-size: 0.9em;">⚠️ NOTA: ${p.observaciones}</div>` : ""}
                
                <hr>
                <p style="font-size:0.9em;">💳 ${p.metodoPago}<br><b>💰 ${p.totalStr}</b></p>
                <button class="btn-listo-cocina" onclick="terminarPedido('${id}')">LISTO ✅</button>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "grid-column:1/span 2; text-align:center; color:#ff8c00; font-weight:bold; background:#fff3e0; padding:10px; border-radius:10px;";
            aviso.innerHTML = `⚠️ Hay ${ids.length - 2} pedido(s) más en cola...`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<p style='text-align:center; grid-column:1/span 2; color:#aaa;'>✅ ¡Sin pedidos pendientes!</p>";
        conteoAnterior = 0;
    }
    primeraCarga = false;
});

// 6. FUNCIÓN PARA FINALIZAR PEDIDO
window.terminarPedido = (id) => {
    if(sonidoListo) { sonidoListo.currentTime = 0; sonidoListo.play().catch(e => console.log(e)); }
    const p = pedidosLocales[id];
    if (!p) return;

    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    
    // 1. Mover al historial
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy })
    .then(() => {
        // 2. Actualizar estadísticas de productos
        for (let prod in p.productos) {
            if (p.productos[prod] > 0) {
                const statRef = ref(database, `estadisticas/diario/${hoy}/${prod}`);
                runTransaction(statRef, (val) => (val || 0) + parseInt(p.productos[prod]));
            }
        }

        // 3. Monto de Delivery si corresponde
        if (p.entrega === "Delivery") {
            const montoDeliv = parseInt(p.monto_delivery) || 0;
            if (montoDeliv > 0) {
                const delivRef = ref(database, `estadisticas/diario/${hoy}/total_delivery`);
                runTransaction(delivRef, (val) => (val || 0) + montoDeliv);
            }
        }
        
        // 4. Quitar de activos
        remove(ref(database, 'pedidos/' + id));
    })
    .catch(err => console.error("Error al finalizar:", err));
};

// CONTRATAR AL EMPLEADO (Service Worker)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker del Vendedor listo', reg))
            .catch(err => console.log('Error al contratar SW', err));
    });
}

