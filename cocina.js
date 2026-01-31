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

// CONFIGURACIÓN GLOBAL ANTI-SCROLL
document.documentElement.style.overflow = "hidden";
document.body.style.overflow = "hidden";
document.body.style.height = "100vh";
document.body.style.margin = "0";
document.body.style.padding = "0";
document.body.style.fontFamily = "sans-serif";

// 3. VARIABLES DE CONTROL
const sonidoNuevo = document.getElementById('notificacion');
const sonidoListo = document.getElementById('sonidoListo');
let primeraCarga = true;
let pedidosLocales = {};
let conteoAnterior = 0;

// --- CONTROL DE ALARMA ---
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
    <h1 style="color: #ff8c00; font-size: 5vh;">PEDIDOS POWER</h1>
    <p style="font-size: 2vh;">Toca para activar</p>
    <span style="font-size: 5vh;">🔔</span>
</div>`;
document.body.appendChild(capa);

capa.onclick = () => {
    if(sonidoNuevo) { sonidoNuevo.loop = true; sonidoNuevo.play().then(() => sonidoNuevo.pause()); }
    if ("Notification" in window) { Notification.requestPermission(); }
    capa.remove();
};

// 5. ESCUCHAR PEDIDOS (FORZADO A 2 COLUMNAS)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    contenedor.innerHTML = ""; 
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "1fr 1fr"; // SIEMPRE 2 COLUMNAS
    contenedor.style.height = "100vh";
    contenedor.style.width = "100vw";
    contenedor.style.gap = "8px";
    contenedor.style.padding = "8px";
    contenedor.style.boxSizing = "border-box";
    contenedor.style.direction = "rtl";

    if (pedidos) {
        const ids = Object.keys(pedidos);
        if (!primeraCarga && ids.length > conteoAnterior) { 
            if(sonidoNuevo) { sonidoNuevo.currentTime = 0; sonidoNuevo.play(); }
        }
        conteoAnterior = ids.length;

        const repetidos = ids[0] && ids[1] ? 
            Object.keys(pedidos[ids[0]].productos).filter(item => Object.keys(pedidos[ids[1]].productos).includes(item)) : [];

        ids.forEach((id, index) => {
            if (index > 1) return; 
            const p = pedidos[id];
            
            let listaHTML = "<ul style='padding:0; list-style:none; margin:0; flex-grow:1; overflow:hidden; display:flex; flex-direction:column; justify-content:center;'>";
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const esRepetido = repetidos.includes(key);
                    // Fuente basada en altura de pantalla (vh) para que no empuje el contenido
                    listaHTML += `<li style="font-size: 1.8vh; line-height:1.1; padding:2px; ${esRepetido ? 'background:#fff8e1; border-left:3px solid #ff8c00; font-weight:bold;' : ''}">
                        <span style="color:#ff8c00;">${cant}</span> x ${key.replace("qty_", "").toUpperCase()}
                    </li>`;
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr";
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            tarjeta.style.height = "100%"; 
            tarjeta.style.display = "flex";
            tarjeta.style.flexDirection = "column";
            tarjeta.style.padding = "1vh";
            tarjeta.style.boxSizing = "border-box";
            tarjeta.style.backgroundColor = "white";
            tarjeta.style.border = "1px solid #ddd";
            tarjeta.style.borderRadius = "8px";

            tarjeta.innerHTML = `
                <div style="flex-shrink:0;">
                    <div style="display:flex; justify-content:space-between; font-size:1.5vh;">
                        <span style="color:#ff8c00; font-weight:bold;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                        <span>🕒 ${p.hora || ''}</span>
                    </div>
                    <p style="margin:2px 0; font-size:1.7vh;"><b>👤 ${p.cliente}</b><br><span style="font-size:1.4vh;">📍 ${p.entrega}</span></p>
                    <hr style="margin:2px 0; opacity:0.3;">
                </div>
                
                ${listaHTML}
                
                <div style="flex-shrink:0;">
                    <hr style="margin:2px 0; opacity:0.3;">
                    ${p.observaciones ? `<div style="background:#fff3e0; padding:2px; font-size:1.4vh; color:#d35400;">⚠️ ${p.observaciones}</div>` : ""}
                    <p style="margin:2px 0; font-size:1.5vh;">💳 ${p.metodoPago} | <b>💰 ${p.totalStr}</b></p>
                    <button class="btn-listo-cocina" onclick="terminarPedido('${id}')" 
                        style="width:100%; padding:1.5vh 0; font-weight:bold; background:#28a745; color:white; border:none; border-radius:5px; font-size:1.8vh; cursor:pointer;">
                        LISTO ✅
                    </button>
                </div>
            `;
            contenedor.appendChild(tarjeta);
        });

        // Aviso de cola pequeño al pie
        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "position:fixed; bottom:2px; left:50%; transform:translateX(-50%); color:#ff8c00; font-weight:bold; background:rgba(255,243,224,0.9); padding:2px 10px; font-size:1.5vh; border-radius:10px; z-index:10;";
            aviso.innerHTML = `⚠️ +${ids.length - 2} en cola`;
            document.body.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<div style='grid-column:span 2; display:flex; justify-content:center; align-items:center; height:100%; color:#aaa; font-size:3vh;'>✅ ¡Sin pedidos!</div>";
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
