import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// ALARMA INTELIGENTE
function detenerAlarma() {
    if (sonidoNuevo) {
        sonidoNuevo.pause();
        sonidoNuevo.currentTime = 0;
    }
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) detenerAlarma(); });
window.addEventListener("focus", detenerAlarma);
document.addEventListener("click", detenerAlarma);

// CAPA DE ACTIVACIÓN
const capa = document.createElement('div');
capa.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; cursor:pointer;";
capa.innerHTML = `<div style="border: 3px solid #ff8c00; padding: 40px; border-radius: 20px;">
    <img src="LogoPow.png" style="width: 100px;">
    <h2 style="color: #ff8c00;">SISTEMA COCINA</h2>
    <p>Toca aquí para activar</p>
</div>`;
document.body.appendChild(capa);
capa.onclick = () => {
    if(sonidoNuevo) { sonidoNuevo.loop = true; sonidoNuevo.play().then(()=>sonidoNuevo.pause()); }
    capa.remove();
};

onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    contenedor.innerHTML = ""; 

    if (pedidos) {
        const ids = Object.keys(pedidos);
        
        if (!primeraCarga && ids.length > conteoAnterior) { 
            if(sonidoNuevo) { sonidoNuevo.play().catch(()=>{}); }
        }
        conteoAnterior = ids.length;

        ids.forEach((id, index) => {
            if (index > 1) return; // Solo mostramos 2 al mismo tiempo
            
            const p = pedidos[id];
            let listaHTML = "<ul>";
            for (let key in p.productos) {
                if (p.productos[key] > 0) {
                    listaHTML += `<li><b>${p.productos[key]}</b> x ${key.replace("qty_", "").toUpperCase()}</li>`;
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span style="color:#ff8c00;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                    <span>🕒 ${p.hora || ''}</span>
                </div>
                <p style="margin: 10px 0;"><b>👤 ${p.cliente}</b></p>
                <hr>
                ${listaHTML}
                ${p.observaciones ? `<div class="coincidencia">⚠️ ${p.observaciones}</div>` : ""}
                <hr>
                <button class="btn-listo-cocina" onclick="terminarPedido('${id}')">LISTO ✅</button>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "grid-column: 1 / span 2; text-align: center; color: #ff8c00; font-weight: bold; direction: ltr;";
            aviso.innerText = `+${ids.length - 2} pedido(s) más en cola`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<p style='grid-column: 1 / span 2; text-align: center; color: #888;'>✅ ¡Sin pedidos!</p>";
    }
    primeraCarga = false;
});

window.terminarPedido = (id) => {
    detenerAlarma();
    if(sonidoListo) { sonidoListo.currentTime = 0; sonidoListo.play().catch(()=>{}); }
    const p = pedidosLocales[id];
    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy })
        .then(() => { remove(ref(database, 'pedidos/' + id)); });
};
