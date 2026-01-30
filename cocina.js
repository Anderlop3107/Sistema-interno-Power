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

document.addEventListener("click", () => {
    if (sonidoNuevo) { sonidoNuevo.pause(); sonidoNuevo.currentTime = 0; }
});

onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    contenedor.innerHTML = ""; 

    if (pedidos) {
        const ids = Object.keys(pedidos);
        if (!primeraCarga && ids.length > conteoAnterior) { 
            sonidoNuevo.currentTime = 0;
            sonidoNuevo.play().catch(()=>{}); 
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
                    productosHTML += `<div class="producto-item">${cant} x ${nombre}</div>`;
                }
            }

            const tarjeta = document.createElement('div');
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            tarjeta.innerHTML = `
                <div class="header-pedido">
                    <div class="tag-estado">
                        ${index === 0 ? '🔥 ACTUAL' : '⌛ EN COLA'}
                    </div>
                    <div class="hora-pedido">
                        🕒 ${p.hora || ''}
                    </div>
                </div>
                
                <div class="info-cliente">
                    <div class="dato-linea">👤 ${p.cliente}</div>
                    <div class="dato-linea">📍 ${p.entrega || 'Local'}</div>
                </div>

                <div class="contenedor-items">
                    ${productosHTML}
                    ${p.observaciones ? `<div style="background:#fff176; padding:15px; border-radius:12px; font-weight:bold; border:2px solid #fbc02d; margin-top:10px;">⚠️ ${p.observaciones}</div>` : ""}
                </div>

                <div class="footer-pedido">
                    <div class="pago-metodo">💳 ${p.metodoPago || 'Efectivo'}</div>
                    <div class="total-monto">💰 Total: ${p.totalStr || '0 Gs'}</div>
                </div>
                
                <button class="btn-listo-cocina" onclick="terminarPedido('${id}')">LISTO ✅</button>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.className = "aviso-cola";
            aviso.innerHTML = `...Hay ${ids.length - 2} pedido(s) más en cola ⚠️`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<p style='grid-column:1/span 2; text-align:center; font-size:2.5em; color:#888; font-weight:900; margin-top:20%;'>✅ ¡SIN PEDIDOS!</p>";
    }
    primeraCarga = false;
});

window.terminarPedido = (id) => {
    if(sonidoListo) { sonidoListo.currentTime = 0; sonidoListo.play().catch(()=>{}); }
    const p = pedidosLocales[id];
    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy })
    .then(() => { remove(ref(database, 'pedidos/' + id)); });
};
