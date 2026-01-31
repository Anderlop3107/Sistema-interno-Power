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

// --- BLOQUEO DE SCROLL GLOBAL ---
document.documentElement.style.overflow = "hidden"; 
document.body.style.overflow = "hidden";
document.body.style.height = "100vh";
document.body.style.margin = "0";

// 3. VARIABLES DE CONTROL
const sonidoNuevo = document.getElementById('notificacion');
const sonidoListo = document.getElementById('sonidoListo');
let primeraCarga = true;
let pedidosLocales = {};
let conteoAnterior = 0;

// --- LÓGICA DE ALARMA ---
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
capa.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; cursor:pointer; font-family: sans-serif;";
capa.innerHTML = `
    <div style="border: 3px solid #ff8c00; padding: 20px; border-radius: 20px; max-width: 80%;">
        <img src="LogoPow.png" alt="Logo" style="width: 80px; margin-bottom: 10px;">
        <h1 style="color: #ff8c00; font-size: 20px;">PEDIDOS - POWER</h1>
        <p>Toca para activar</p>
        <span style="font-size: 2em;">🔔</span>
    </div>`;
document.body.appendChild(capa);

capa.onclick = () => {
    if(sonidoNuevo) { 
        sonidoNuevo.loop = true;
        sonidoNuevo.play().then(() => { sonidoNuevo.pause(); }).catch(()=>{}); 
    }
    if ("Notification" in window) { Notification.requestPermission(); }
    capa.remove();
};

// 5. ESCUCHAR PEDIDOS (MEJORADO PARA VISIBILIDAD TOTAL)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    contenedor.innerHTML = ""; 
    contenedor.style = `
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 10px; 
        direction: rtl; 
        height: 100vh; 
        width: 100vw; 
        padding: 10px; 
        box-sizing: border-box; 
        overflow: hidden;
    `;

    if (pedidos) {
        const ids = Object.keys(pedidos);
        if (!primeraCarga && ids.length > conteoAnterior) { 
            if(sonidoNuevo) { sonidoNuevo.currentTime = 0; sonidoNuevo.play().catch(()=>{}); }
        }
        conteoAnterior = ids.length;

        const prodP1 = ids[0] ? Object.keys(pedidos[ids[0]].productos) : [];
        const prodP2 = ids[1] ? Object.keys(pedidos[ids[1]].productos) : [];
        const repetidos = prodP1.filter(item => prodP2.includes(item));

        ids.forEach((id, index) => {
            if (index > 1) return; 
            const p = pedidos[id];
            
            let listaHTML = "<ul style='padding:0; list-style:none; margin:0; overflow-y:auto; flex-grow:1;'>";
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const nombre = key.replace("qty_", "").toUpperCase();
                    const esRepetido = repetidos.includes(key);
                    const estiloLi = `padding:4px; margin-bottom:2px; border-radius:4px; font-size:0.9em; ${esRepetido ? 'background:#fff8e1; border-left:4px solid #ff8c00; font-weight:bold;' : 'background:#f9f9f9;'}`;
                    listaHTML += `<li style="${estiloLi}"><span style="color:#ff8c00;">${cant}</span> x ${nombre}</li>`;
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style = `
                direction: ltr; 
                display: flex; 
                flex-direction: column; 
                height: calc(100vh - 60px); 
                background: white; 
                border: 2px solid ${index === 1 ? '#ccc' : '#ff8c00'}; 
                border-radius: 15px; 
                padding: 12px; 
                box-sizing: border-box;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            `;
            
            tarjeta.innerHTML = `
                <div style="flex-shrink:0;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:0.8em;">
                        <span style="color:#ff8c00;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                        <span>🕒 ${p.hora || ''}</span>
                    </div>
                    <p style="margin:5px 0; font-size:1.1em;"><b>👤 ${p.cliente}</b><br><small>📍 ${p.entrega}</small></p>
                    <hr style="margin:5px 0; border:0; border-top:1px solid #eee;">
                </div>
                
                ${listaHTML}
                
                <div style="flex-shrink:0; margin-top:5px;">
                    ${p.observaciones ? `<div style="background:#fff3e0; padding:4px; font-size:0.8em; border-radius:4px; margin-bottom:5px;">⚠️ ${p.observaciones}</div>` : ""}
                    <hr style="margin:5px 0; border:0; border-top:1px solid #eee;">
                    <p style="font-size:0.85em; margin:5px 0;">💳 ${p.metodoPago} | <b>💰 ${p.totalStr}</b></p>
                    <button class="btn-listo-cocina" onclick="terminarPedido('${id}')" style="width:100%; padding:12px; background:#28a745; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;">LISTO ✅</button>
                </div>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "position:fixed; bottom:5px; left:50%; transform:translateX(-50%); width:90%; text-align:center; color:#ff8c00; font-weight:bold; background:rgba(255,243,224,0.9); padding:5px; border-radius:10px; font-size:0.8em; z-index:10;";
            aviso.innerHTML = `⚠️ +${ids.length - 2} pedido(s) en espera`;
            document.body.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<div style='grid-column:1/span 2; display:flex; justify-content:center; align-items:center; height:100%; color:#aaa;'>✅ ¡Sin pedidos!</div>";
    }
    primeraCarga = false;
});

// 7. FINALIZAR PEDIDO
window.terminarPedido = (id) => {
    if(sonidoNuevo) { sonidoNuevo.pause(); sonidoNuevo.currentTime = 0; }
    if(sonidoListo) { sonidoListo.currentTime = 0; sonidoListo.play().catch(()=>{}); }

    const p = pedidosLocales[id];
    if (!p) return;
    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy })
    .then(() => { remove(ref(database, 'pedidos/' + id)); })
    .catch(err => console.error(err));
};
