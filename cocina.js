// 1. IMPORTACIONES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// BLOQUEAR SCROLL GLOBAL
document.body.style.overflow = "hidden";
document.body.style.height = "100vh";
document.body.style.margin = "0";

// 3. VARIABLES DE CONTROL
const sonidoNuevo = document.getElementById('notificacion');
const sonidoListo = document.getElementById('sonidoListo');
let primeraCarga = true;
let pedidosLocales = {};
let conteoAnterior = 0;

// --- LÓGICA ALARMA ---
function detenerAlarmaAlVer() {
    if (!document.hidden && sonidoNuevo) {
        sonidoNuevo.pause();
        sonidoNuevo.currentTime = 0;
    }
}
document.addEventListener("visibilitychange", detenerAlarmaAlVer);
window.addEventListener("focus", detenerAlarmaAlVer);
document.addEventListener("click", () => {
    if (sonidoNuevo) { sonidoNuevo.pause(); sonidoNuevo.currentTime = 0; }
}, { once: false });

// 4. CAPA DE ACTIVACIÓN
const capa = document.createElement('div');
capa.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; cursor:pointer;";
capa.innerHTML = `<div style="border: 3px solid #ff8c00; padding: 20px; border-radius: 20px;">
    <img src="LogoPow.png" style="width: 80px;">
    <h1 style="color: #ff8c00; font-size: 20px;">ACTIVAR COCINA</h1>
    <span style="font-size: 2em;">🔔</span>
</div>`;
document.body.appendChild(capa);

capa.onclick = () => {
    if(sonidoNuevo) { sonidoNuevo.loop = true; sonidoNuevo.play().then(() => sonidoNuevo.pause()); }
    if ("Notification" in window) { Notification.requestPermission(); }
    capa.remove();
};

function lanzarNotificacionVisual(nombreCliente) {
    if (Notification.permission === "granted" && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'NUEVO_PEDIDO', cliente: nombreCliente });
    }
}

// 5. ESCUCHAR PEDIDOS (AJUSTE AUTOMÁTICO)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    // Configuración del Contenedor para NO tener scroll
    contenedor.innerHTML = ""; 
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = window.innerWidth > 600 ? "1fr 1fr" : "1fr"; 
    contenedor.style.gridTemplateRows = "1fr auto"; // El aviso de abajo ocupa lo mínimo
    contenedor.style.height = "100vh";
    contenedor.style.width = "100vw";
    contenedor.style.gap = "10px";
    contenedor.style.padding = "10px";
    contenedor.style.boxSizing = "border-box";
    contenedor.style.overflow = "hidden";
    contenedor.style.direction = "rtl";

    if (pedidos) {
        const ids = Object.keys(pedidos);
        if (!primeraCarga && ids.length > conteoAnterior) { 
            if(sonidoNuevo) { sonidoNuevo.currentTime = 0; sonidoNuevo.play(); }
            lanzarNotificacionVisual(pedidos[ids[ids.length - 1]].cliente || "Nuevo");
        }
        conteoAnterior = ids.length;

        const repetidos = ids[0] && ids[1] ? 
            Object.keys(pedidos[ids[0]].productos).filter(item => Object.keys(pedidos[ids[1]].productos).includes(item)) : [];

        ids.forEach((id, index) => {
            if (index > 1) return; 
            const p = pedidos[id];
            
            let listaHTML = "<ul style='padding:0; list-style:none; margin:0; flex-grow:1; overflow:hidden;'>";
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const esRepetido = repetidos.includes(key);
                    listaHTML += `<li style="font-size: 0.9em; padding:2px; ${esRepetido ? 'background:#fff8e1; border-left:4px solid #ff8c00; font-weight:bold;' : ''}">
                        <span style="color:#ff8c00;">${cant}</span> x ${key.replace("qty_", "").toUpperCase()}
                    </li>`;
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr";
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            // Ajuste de altura dinámica para que quepa todo sin scroll
            tarjeta.style.height = "calc(100vh - 80px)"; 
            tarjeta.style.display = "flex";
            tarjeta.style.flexDirection = "column";
            tarjeta.style.justifyContent = "space-between";
            tarjeta.style.padding = "10px";
            tarjeta.style.boxSizing = "border-box";

            tarjeta.innerHTML = `
                <div style="font-size:0.85em;">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:#ff8c00; font-weight:bold;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                        <span>🕒 ${p.hora || ''}</span>
                    </div>
                    <p style="margin:5px 0;"><b>👤 ${p.cliente}</b><br>📍 ${p.entrega}</p>
                    <hr style="margin:5px 0;">
                </div>
                ${listaHTML}
                <div style="font-size:0.85em;">
                    <hr style="margin:5px 0;">
                    ${p.observaciones ? `<div style="background:#fff3e0; padding:2px; font-size:0.8em;">⚠️ ${p.observaciones}</div>` : ""}
                    <p style="margin:5px 0;">💳 ${p.metodoPago} | <b>💰 ${p.totalStr}</b></p>
                    <button class="btn-listo-cocina" onclick="terminarPedido('${id}')" style="width:100%; padding:12px; font-weight:bold;">LISTO ✅</button>
                </div>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "grid-column:1/-1; text-align:center; color:#ff8c00; font-weight:bold; background:#fff3e0; padding:5px; font-size:0.8em; border-radius:5px;";
            aviso.innerHTML = `⚠️ +${ids.length - 2} en cola`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<p style='text-align:center; grid-column:1/-1; margin-top:20vh; color:#aaa;'>✅ ¡Sin pedidos!</p>";
    }
    primeraCarga = false;
});

window.terminarPedido = (id) => {
    if(sonidoNuevo) { sonidoNuevo.pause(); sonidoNuevo.currentTime = 0; }
    if(sonidoListo) { sonidoListo.currentTime = 0; sonidoListo.play().catch(()=>{}); }
    const p = pedidosLocales[id];
    if (!p) return;
    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy }).then(() => {
        remove(ref(database, 'pedidos/' + id));
    });
};
