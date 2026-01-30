import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, set, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const sonidoNuevo = document.getElementById('notificacion');
const sonidoListo = document.getElementById('sonidoListo');
let primeraCarga = true;
let pedidosLocales = {};
let conteoAnterior = 0;

// --- LÓGICA DE CONTROL DE ALARMA INTELIGENTE ---

function detenerAlarmaAlVer() {
    if (!document.hidden) { // Si el cocinero entra a la app (pestaña visible)
        if (sonidoNuevo) {
            sonidoNuevo.pause();
            sonidoNuevo.currentTime = 0;
        }
    }
}

// Escuchar cuando el cocinero vuelve a la app desde otra (como TikTok)
document.addEventListener("visibilitychange", detenerAlarmaAlVer);
window.addEventListener("focus", detenerAlarmaAlVer);

// También detener si toca cualquier parte de la pantalla
document.addEventListener("click", () => {
    if (sonidoNuevo) {
        sonidoNuevo.pause();
        sonidoNuevo.currentTime = 0;
    }
}, { once: false });

// -----------------------------------------------

// CAPA DE ACTIVACIÓN
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
        sonidoNuevo.loop = true; 
        sonidoNuevo.play().then(() => { sonidoNuevo.pause(); }).catch(()=>{}); 
    }
    if ("Notification" in window) { 
        Notification.requestPermission(); 
    }
    capa.remove();
};

function lanzarNotificacionVisual(nombreCliente) {
    if (Notification.permission === "granted" && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'NUEVO_PEDIDO',
            cliente: nombreCliente
        });
    }
}

onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    contenedor.innerHTML = ""; 

    if (pedidos) {
        const ids = Object.keys(pedidos);
        
        if (!primeraCarga && ids.length > conteoAnterior) { 
            if(sonidoNuevo) {
                sonidoNuevo.currentTime = 0;
                sonidoNuevo.play().catch(e => console.log("Error sonido:", e)); 
            }
            const ultimoId = ids[ids.length - 1];
            lanzarNotificacionVisual(pedidos[ultimoId].cliente || "Nuevo");
        }
        conteoAnterior = ids.length;

        ids.forEach((id, index) => {
            if (index > 1) return; 
            const p = pedidos[id];
            let listaHTML = "<ul>";
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const nombre = key.replace("qty_", "").toUpperCase();
                    listaHTML += `<li><span style="color:#ff8c00; font-weight:bold;">${cant}</span> x ${nombre}</li>`;
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


window.terminarPedido = (id) => {
    if(sonidoNuevo) { 
        sonidoNuevo.pause(); 
        sonidoNuevo.currentTime = 0; 
    }
    if(sonidoListo) { 
        sonidoListo.currentTime = 0;
        sonidoListo.play().catch(()=>{}); 
    }

    const p = pedidosLocales[id];
    if (!p) return;
    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy })
    .then(() => {
        remove(ref(database, 'pedidos/' + id));
    })
    .catch(err => alert("Error al finalizar: " + err.message));
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado con éxito'))
            .catch(err => console.log('Error al registrar SW:', err));
    });
}

