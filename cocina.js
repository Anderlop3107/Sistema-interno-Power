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

// --- LÓGICA DE CONTROL DE ALARMA INTELIGENTE (DEL NUEVO) ---
function detenerAlarmaAlVer() {
    if (!document.hidden && sonidoNuevo) {
        sonidoNuevo.pause();
        sonidoNuevo.currentTime = 0;
    }
}

document.addEventListener("visibilitychange", detenerAlarmaAlVer);
window.addEventListener("focus", detenerAlarmaAlVer);
document.addEventListener("click", () => {
    if (sonidoNuevo) {
        sonidoNuevo.pause();
        sonidoNuevo.currentTime = 0;
    }
}, { once: false });

// 4. CAPA DE ACTIVACIÓN
const capa = document.createElement('div');
capa.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; cursor:pointer; font-family: sans-serif;";
capa.innerHTML = `
    <div style="border: 3px solid #ff8c00; padding: 40px; border-radius: 20px; max-width: 80%;">
        <img src="LogoPow.png" alt="Logo" style="width: 120px; margin-bottom: 10px;">
        <h1 style="color: #ff8c00; font-size: 24px;">PEDIDOS - POWER</h1>
        <p>Toca para activar el sistema de cocina</p>
        <span style="font-size: 3em;">🔔</span>
    </div>`;
document.body.appendChild(capa);

capa.onclick = () => {
    if(sonidoNuevo) { 
        sonidoNuevo.loop = true; // Alarma infinita activada
        sonidoNuevo.play().then(() => { sonidoNuevo.pause(); }).catch(()=>{}); 
    }
    if(sonidoListo) { sonidoListo.play().then(() => { sonidoListo.pause(); }).catch(()=>{}); }
    
    if ("Notification" in window) { Notification.requestPermission(); }
    capa.remove();
};

// 5. NOTIFICACIONES VISUALES
function lanzarNotificacionVisual(nombreCliente) {
    if (Notification.permission === "granted" && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'NUEVO_PEDIDO',
            cliente: nombreCliente
        });
    }
}

// 6. ESCUCHAR PEDIDOS (INTERFAZ DEL VIEJO)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    contenedor.innerHTML = ""; 
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "1fr 1fr"; // Dos columnas
    contenedor.style.gap = "15px";
    contenedor.style.direction = "rtl"; // Orden de derecha a izquierda

    if (pedidos) {
        const ids = Object.keys(pedidos);
        
        // Disparar Alarma si hay pedidos nuevos
        if (!primeraCarga && ids.length > conteoAnterior) { 
            if(sonidoNuevo) {
                sonidoNuevo.currentTime = 0;
                sonidoNuevo.play().catch(e => console.log("Error sonido:", e)); 
            }
            const ultimoId = ids[ids.length - 1];
            lanzarNotificacionVisual(pedidos[ultimoId].cliente || "Nuevo");
        }
        conteoAnterior = ids.length;

        // Lógica de comparación para resaltar productos repetidos (Del Viejo)
        const prodP1 = ids[0] ? Object.keys(pedidos[ids[0]].productos) : [];
        const prodP2 = ids[1] ? Object.keys(pedidos[ids[1]].productos) : [];
        const repetidos = prodP1.filter(item => prodP2.includes(item));

        ids.forEach((id, index) => {
            if (index > 1) return; // Solo muestra los 2 primeros
            const p = pedidos[id];
            
            let listaHTML = "<ul style='padding:0; list-style:none;'>";
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const nombre = key.replace("qty_", "").toUpperCase();
                    const esRepetido = repetidos.includes(key);
                    // Estilo amarillo si el producto se repite en el pedido de al lado
                    const estiloLi = `padding:5px; border-radius:6px; ${esRepetido ? 'background:#fff8e1; border-left:5px solid #ff8c00; font-weight:bold;' : ''}`;
                    listaHTML += `<li style="${estiloLi}"><span style="color:#ff8c00;">${cant}</span> x ${nombre}</li>`;
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr"; // Contenido interno de izquierda a derecha
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span style="color:#ff8c00;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                    <span>🕒 ${p.hora || ''}</span>
                </div>
                <p><b>👤 ${p.cliente}</b><br><b>📍 ${p.entrega}</b></p>
                <hr>
                ${listaHTML}
                ${p.observaciones ? `<div class="coincidencia">⚠️ NOTA: ${p.observaciones}</div>` : ""}
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

// 7. FINALIZAR PEDIDO (MEZCLADO)
window.terminarPedido = (id) => {
    // Detener alarma si está sonando
    if(sonidoNuevo) { 
        sonidoNuevo.pause(); 
        sonidoNuevo.currentTime = 0; 
    }
    if(sonidoListo) { 
        sonidoListo.currentTime = 0; 
        sonidoListo.play().catch(e => console.log(e)); 
    }

    const p = pedidosLocales[id];
    if (!p) return;
    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    
    // Guardar en historial
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy })
    .then(() => {
        // Eliminar de pedidos activos
        remove(ref(database, 'pedidos/' + id));
    })
    .catch(err => console.error("Error al finalizar:", err));
};

// 8. SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => console.log('SW Cocina OK'));
    });
}

