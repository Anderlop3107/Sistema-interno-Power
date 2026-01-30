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

// Detener alarma al interactuar
document.addEventListener("click", () => {
    if (sonidoNuevo) {
        sonidoNuevo.pause();
        sonidoNuevo.currentTime = 0;
    }
});

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
        }
        conteoAnterior = ids.length;

        ids.forEach((id, index) => {
            if (index > 1) return; 
            const p = pedidos[id];
            
            let productosHTML = "";
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const nombre = key.replace("qty_", "").toUpperCase();
                    productosHTML += `<div class="producto-item"><span>${cant} x</span> ${nombre}</div>`;
                }
            }

            const tarjeta = document.createElement('div');
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            tarjeta.innerHTML = `
                <div class="header-pedido">
                    <span style="color:#ff8c00;">${index === 0 ? '🔥 ACTUAL' : '⌛ EN COLA'}</span>
                    <span>🕒 ${p.hora || ''}</span>
                </div>
                <div class="info-cliente">
                    <div>👤 <b>${p.cliente}</b></div>
                    <div>📍 <b>${p.entrega || 'Local'}</b></div>
                </div>
                <div class="contenedor-items">
                    ${productosHTML}
                    ${p.observaciones ? `<div class="observacion-box">⚠️ ${p.observaciones}</div>` : ""}
                </div>
                <div class="footer-pedido">
                    <div>💳 ${p.metodoPago || 'Efectivo'}</div>
                    <div style="font-size:1.3em;">💰 <b>Total: ${p.totalStr || '0 Gs'}</b></div>
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
        contenedor.innerHTML = "<p style='grid-column: 1/span 2; text-align:center; font-size:1.5em; color:#888; direction: ltr; margin-top: 20%;'>✅ ¡Sin pedidos!</p>";
        conteoAnterior = 0;
    }
    primeraCarga = false;
});

window.terminarPedido = (id) => {
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
