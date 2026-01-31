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

// 4. CAPA DE ACTIVACIÓN (CORREGIDA PARA QUE SE VEA GRANDE)
const capa = document.createElement('div');
capa.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; cursor:pointer; font-family: sans-serif;";
capa.innerHTML = `
    <div style="border: 3px solid #ff8c00; padding: 50px 30px; border-radius: 25px; width: 85%; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <img src="LogoPow.png" alt="Logo" style="width: 150px; margin-bottom: 20px;">
        <h1 style="color: #ff8c00; font-size: 28px; margin: 10px 0;">PEDIDOS - POWER</h1>
        <p style="font-size: 1.1em; color: #444;">Toca para activar el sistema de cocina</p>
        <div style="font-size: 4em; margin-top: 20px;">🔔</div>
    </div>`;
document.body.appendChild(capa);

capa.onclick = () => {
    if(sonidoNuevo) { sonidoNuevo.play().then(() => { sonidoNuevo.pause(); sonidoNuevo.currentTime = 0; }); }
    if(sonidoListo) { sonidoListo.play().then(() => { sonidoListo.pause(); sonidoListo.currentTime = 0; }); }
    if ("Notification" in window) { Notification.requestPermission(); }
    capa.remove();
};

// 5. NOTIFICACIÓN EXTERNA
function lanzarNotificacionExterna(nombre) {
    if (Notification.permission === "granted" && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'NUEVO_PEDIDO',
            cliente: nombre || "Nuevo"
        });
    }
}

// 6. RENDERIZADO DE PEDIDOS (CON TAMAÑOS REALES Y DISEÑO FIEL)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    contenedor.innerHTML = ""; 
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "1fr 1fr";
    contenedor.style.gap = "15px";
    contenedor.style.direction = "rtl"; 

    if (pedidos) {
        const ids = Object.keys(pedidos);
        
        if (!primeraCarga && ids.length > conteoAnterior) {
            if(sonidoNuevo) {
                sonidoNuevo.currentTime = 0;
                sonidoNuevo.play().catch(e => console.log("Error sonido:", e));
            }
            const ultimoId = ids[ids.length - 1];
            lanzarNotificacionExterna(pedidos[ultimoId].cliente);
        }
        conteoAnterior = ids.length;

        const prodP1 = ids[0] ? Object.keys(pedidos[ids[0]].productos) : [];
        const prodP2 = ids[1] ? Object.keys(pedidos[ids[1]].productos) : [];
        const repetidos = prodP1.filter(item => prodP2.includes(item));

        ids.forEach((id, index) => {
            if (index > 1) return; 

            const p = pedidos[id];
            let listaHTML = "<ul style='padding:0; list-style:none;'>";
            
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const nombre = key.replace("qty_", "").toUpperCase();
                    const esRepetido = repetidos.includes(key);
                    const estiloLi = `padding:8px; margin: 4px 0; border-radius:8px; ${esRepetido ? 'background:#fff8e1; border-left:6px solid #ff8c00; font-weight:bold; color:#000;' : 'color:#333;'}`;
                    listaHTML += `<li style="${estiloLi}"><span style="color:#ff8c00; font-weight:bold;">${cant}</span> x ${nombre}</li>`;
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr";
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            
            // ESTILOS FORZADOS PARA EL DISEÑO GRANDE
            tarjeta.style.padding = "20px";
            tarjeta.style.borderRadius = "20px";
            tarjeta.style.backgroundColor = "white";
            tarjeta.style.boxShadow = "0 4px 10px rgba(0,0,0,0.05)";

            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size: 1.2em; margin-bottom:10px;">
                    <span style="color:#ff8c00;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                    <span style="color:#555;">🕒 ${p.hora || ''}</span>
                </div>
                <div style="margin: 15px 0; font-size: 1.1em;">
                    <p style="margin:2px 0;"><b>👤 ${p.cliente}</b></p>
                    <p style="margin:2px 0; color:#666;">📍 ${p.entrega}</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin:10px 0;">
                ${listaHTML}
                
                ${p.observaciones ? `<div style="background:#fff176; margin: 15px 0; padding: 12px; border-radius: 10px; border-left: 6px solid #ffd600; color: #000; font-weight: bold; font-size: 0.9em;">⚠️ NOTA: ${p.observaciones}</div>` : ""}
                
                <hr style="border: 0; border-top: 1px solid #eee; margin:10px 0;">
                <div style="margin-bottom:15px;">
                    <p style="margin:2px 0; font-size:0.95em;">💳 ${p.metodoPago}</p>
                    <p style="margin:2px 0; font-size:1.2em;"><b>💰 Total: ${p.totalStr}</b></p>
                </div>
                <button class="btn-listo-cocina" onclick="terminarPedido('${id}')" style="width:100%; padding: 18px; background:#4CAF50; color:white; border:none; border-radius:30px; font-weight:bold; cursor:pointer; font-size: 1.1em;">LISTO ✅</button>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "grid-column:1/span 2; text-align:center; color:#ff8c00; font-weight:bold; background:#fff3e0; padding:12px; border-radius:15px; margin-top:10px;";
            aviso.innerHTML = `...Hay ${ids.length - 2} pedido(s) más en cola ⚠️`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<div style='grid-column:1/span 2; text-align:center; padding:50px; color:#aaa;'><h3>✅ ¡Sin pedidos pendientes!</h3></div>";
        conteoAnterior = 0;
    }
    primeraCarga = false;
});

// 7. FINALIZAR PEDIDO
window.terminarPedido = (id) => {
    if(sonidoListo) { sonidoListo.currentTime = 0; sonidoListo.play().catch(e => console.log(e)); }
    const p = pedidosLocales[id];
    if (!p) return;
    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy })
    .then(() => {
        for (let prod in p.productos) {
            if (p.productos[prod] > 0) {
                const statRef = ref(database, `estadisticas/diario/${hoy}/${prod}`);
                runTransaction(statRef, (val) => (val || 0) + parseInt(p.productos[prod]));
            }
        }
        if (p.entrega === "Delivery") {
            const montoDeliv = parseInt(p.monto_delivery) || 0;
            if (montoDeliv > 0) {
                const delivRef = ref(database, `estadisticas/diario/${hoy}/total_delivery`);
                runTransaction(delivRef, (val) => (val || 0) + montoDeliv);
            }
        }
        remove(ref(database, 'pedidos/' + id));
    })
    .catch(err => console.error("Error al finalizar:", err));
};

// 8. SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Cocina Online'))
            .catch(err => console.log('Error SW', err));
    });
}
