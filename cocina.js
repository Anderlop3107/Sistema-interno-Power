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

// Escuchar cambios en la base de datos
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    contenedor.innerHTML = ""; 

    if (pedidos) {
        const ids = Object.keys(pedidos);
        
        // Alerta sonora para nuevos pedidos
        if (!primeraCarga && ids.length > conteoAnterior) { 
            if (sonidoNuevo) {
                sonidoNuevo.currentTime = 0;
                sonidoNuevo.play().catch(() => console.log("Interacción requerida para sonido")); 
            }
        }
        conteoAnterior = ids.length;

        ids.forEach((id, index) => {
            if (index > 1) return; // Mostrar solo 2 pedidos principales
            
            const p = pedidos[id];
            let productosHTML = "";
            
            for (let key in p.productos) {
                if (p.productos[key] > 0) {
                    productosHTML += `<div class="producto-item">${p.productos[key]} x ${key.replace("qty_", "").toUpperCase()}</div>`;
                }
            }

            const tarjeta = document.createElement('div');
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            tarjeta.innerHTML = `
                <div class="header-pedido">
                    <span class="tag-estado">${index === 0 ? '🔥 ACTUAL' : '⌛ EN COLA'}</span>
                    <span class="hora-pedido">🕒 ${p.hora || ''}</span>
                </div>
                
                <div class="info-cliente">👤 ${p.cliente}</div>
                
                <div class="contenedor-items">
                    ${productosHTML}
                    ${p.observaciones ? `<div style="background:#fff176; padding:8px; border-radius:8px; font-size:0.85rem; margin-top:5px; font-weight:bold;">⚠️ ${p.observaciones}</div>` : ""}
                </div>

                <div class="footer-pedido">
                    <div>💳 ${p.metodoPago || 'Efectivo'}</div>
                    <div style="color:#ff8c00; font-size:1rem;">💰 <b>${p.totalStr || ''}</b></div>
                </div>
                
                <button class="btn-listo-cocina" onclick="terminarPedido('${id}')">LISTO ✅</button>
            `;
            contenedor.appendChild(tarjeta);
        });

        // Mostrar aviso si hay más de 2 pedidos en el sistema
        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.className = "aviso-cola";
            aviso.innerText = `+${ids.length - 2} pedido(s) más en cola`;
            contenedor.appendChild(aviso);
        }

    } else {
        contenedor.innerHTML = "<p style='text-align:center; font-size:1.5rem; color:#888; margin-top:20%; direction:ltr;'>Sin pedidos pendientes</p>";
        conteoAnterior = 0;
    }
    primeraCarga = false;
});

// Función para finalizar pedido
window.terminarPedido = (id) => {
    if (sonidoListo) { 
        sonidoListo.currentTime = 0; 
        sonidoListo.play().catch(() => {}); 
    }
    
    const p = pedidosLocales[id];
    if (!p) return;

    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    
    // Mover a historial y eliminar de pedidos activos
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy })
    .then(() => { 
        remove(ref(database, 'pedidos/' + id)); 
    });
};
