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

// 4. CAPA DE ACTIVACIÓN
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
    if(sonidoNuevo) { sonidoNuevo.play().then(() => { sonidoNuevo.pause(); sonidoNuevo.currentTime = 0; }); }
    if(sonidoListo) { sonidoListo.play().then(() => { sonidoListo.pause(); sonidoListo.currentTime = 0; }); }
    if ("Notification" in window) { Notification.requestPermission(); }
    capa.remove();
};

// 5. NOTIFICACIÓN EXTERNA
function lanzarNotificacionExterna(nombre) {
    if (Notification.permission === "granted" && navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'NUEVO_PEDIDO',
            cliente: nombre || "Nuevo"
        });
    }
}

// 6. ESCUCHAR PEDIDOS (DISEÑO DE DOS COLUMNAS - UNO AL LADO DEL OTRO)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    contenedor.innerHTML = ""; 
    // Mantenemos el grid de dos columnas como estaba antes
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
            lanzarNotificacionExterna(pedidos[ids[ids.length - 1]].cliente);
        }
        conteoAnterior = ids.length;

        ids.forEach((id, index) => {
            const p = pedidos[id];
            
            let listaHTML = "<ul style='padding:0; list-style:none; margin: 15px 0;'>";
            if (Array.isArray(p.productos)) {
                p.productos.forEach(prod => {
                    listaHTML += `<li style="margin-bottom:8px; font-size:1.3em; border-bottom:1px solid #eee; padding-bottom:5px;">
                        <b style="color:#ff8c00;">${prod.cantidad}</b> x ${prod.nombre}
                    </li>`;
                });
            } else {
                for (let key in p.productos) {
                    if (p.productos[key] > 0) {
                        listaHTML += `<li style="margin-bottom:8px; font-size:1.3em; border-bottom:1px solid #eee; padding-bottom:5px;">
                            <b style="color:#ff8c00;">${p.productos[key]}</b> x ${key.replace("qty_", "").toUpperCase()}
                        </li>`;
                    }
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr";
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#ff8c00; font-weight:bold; font-size:1.1em;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                    <span style="font-weight:bold;">🕒 ${p.hora || ''}</span>
                </div>
                <div style="margin: 10px 0;">
                    <p style="font-size:1.2em; margin:5px 0;">👤 <b>${p.cliente}</b></p>
                    <p style="font-size:1em; margin:5px 0;">📍 <b>${p.entrega}</b></p>
                </div>
                <hr style="border:0; border-top:1px solid #eee;">
                ${listaHTML}
                
                ${p.observaciones ? `
                    <div style="background:#fff176; padding:10px; border-radius:10px; border-left:8px solid #fbc02d; font-weight:bold; margin-bottom:10px; font-size:0.9em;">
                        📝 NOTA: ${p.observaciones}
                    </div>` : ""}
                
                <hr style="border:0; border-top:1px solid #eee;">
                <div style="margin-bottom:10px;">
                    <p style="margin:2px 0; font-size:0.9em;">💳 ${p.metodoPago}</p>
                    <p style="margin:2px 0; font-size:1.2em; color:#ff8c00;">💰 <b>${p.totalStr || '0 Gs'}</b></p>
                </div>
                <button class="btn-listo-cocina" onclick="terminarPedido('${id}')">LISTO ✅</button>
            `;
            contenedor.appendChild(tarjeta);
        });
    } else {
        contenedor.innerHTML = "<p style='grid-column: 1/span 2; text-align:center; color:#aaa; margin-top:50px;'>✅ ¡Sin pedidos!</p>";
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
        const stats = p.productos_stats || {};
        for (let prod in stats) {
            if (stats[prod] > 0) {
                const statRef = ref(database, `estadisticas/diario/${hoy}/${prod}`);
                runTransaction(statRef, (val) => (val || 0) + parseInt(stats[prod]));
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
