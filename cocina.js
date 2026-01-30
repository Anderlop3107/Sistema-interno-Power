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

function detenerAlarma() {
    if (sonidoNuevo) { sonidoNuevo.pause(); sonidoNuevo.currentTime = 0; }
}
document.addEventListener("click", detenerAlarma);

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
            if (index > 1) return; 
            const p = pedidos[id];
            let listaHTML = "<ul>";
            for (let key in p.productos) {
                if (p.productos[key] > 0) {
                    listaHTML += `<li><b style="color:#ff8c00;">${p.productos[key]}</b> x ${key.replace("qty_", "").toUpperCase()}</li>`;
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size: 1.2em; font-weight:bold; margin-bottom: 10px;">
                    <span style="color:#ff8c00;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                    <span>🕒 ${p.hora || ''}</span>
                </div>
                <h2 style="margin: 10px 0; font-size: 2em;">👤 ${p.cliente}</h2>
                <hr>
                ${listaHTML}
                ${p.observaciones ? `<div class="coincidencia">⚠️ ${p.observaciones}</div>` : ""}
                <hr>
                <div style="margin-top: 10px; font-size: 1.1em;">
                    <b>💰 TOTAL: ${p.totalStr || ''}</b><br>
                    💳 ${p.metodoPago || ''}
                </div>
                <button class="btn-listo-cocina" onclick="terminarPedido('${id}')">LISTO ✅</button>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.className = "aviso-cola";
            aviso.innerText = `+${ids.length - 2} pedido(s) más en espera...`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<p style='grid-column: 1 / span 2; text-align: center; color: #888; font-size: 1.5em;'>✅ ¡Sin pedidos pendientes!</p>";
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
