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

// 4. CAPA DE ACTIVACIÓN (CON BLOQUEO DE TAMAÑO PARA QUE NO SE ACHIQUE)
const capa = document.createElement('div');
capa.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; cursor:pointer; font-family: sans-serif;";
capa.innerHTML = `
    <div style="border: 3px solid #ff8c00 !important; padding: 50px 30px !important; border-radius: 25px !important; width: 85% !important; max-width: 450px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important; background: white !important;">
        <img src="LogoPow.png" alt="Logo" style="width: 150px !important; margin-bottom: 20px !important; display: inline-block !important;">
        <h1 style="color: #ff8c00 !important; font-size: 28px !important; margin: 15px 0 !important; font-weight: bold !important;">PEDIDOS - POWER</h1>
        <p style="font-size: 1.2em !important; color: #444 !important; margin-bottom: 20px !important;">Toca para activar el sistema de cocina</p>
        <div style="font-size: 5em !important;">🔔</div>
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

// 6. RENDERIZADO DE PEDIDOS (CON SUPERPODER !IMPORTANT)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    contenedor.innerHTML = ""; 
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "1fr 1fr";
    contenedor.style.gap = "20px";
    contenedor.style.direction = "rtl"; 
    contenedor.style.padding = "15px";

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
            let listaHTML = "<ul style='padding:0 !important; list-style:none !important; margin:0 !important;'>";
            
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const nombre = key.replace("qty_", "").toUpperCase();
                    const esRepetido = repetidos.includes(key);
                    const estiloLi = `padding:12px !important; margin: 8px 0 !important; border-radius:10px !important; font-size: 1.15em !important; display: block !important; ${esRepetido ? 'background:#fff8e1 !important; border-left:8px solid #ff8c00 !important; font-weight:bold !important; color:#000 !important;' : 'color:#333 !important;'}`;
                    listaHTML += `<li style="${estiloLi}"><span style="color:#ff8c00 !important; font-weight:bold !important;">${cant}</span> x ${nombre}</li>`;
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr";
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            
            // BLOQUEO DE ESTILOS DE LA TARJETA
            tarjeta.style.setProperty('padding', '25px', 'important');
            tarjeta.style.setProperty('background-color', 'white', 'important');
            tarjeta.style.setProperty('border-radius', '25px', 'important');
            tarjeta.style.setProperty('box-shadow', '0 6px 15px rgba(0,0,0,0.1)', 'important');
            tarjeta.style.setProperty('min-height', '450px', 'important');
            tarjeta.style.setProperty('display', 'flex', 'important');
            tarjeta.style.setProperty('flex-direction', 'column', 'important');

            tarjeta.innerHTML = `
                <div style="display:flex !important; justify-content:space-between !important; font-weight:bold !important; font-size: 1.3em !important; margin-bottom:15px !important;">
                    <span style="color:#ff8c00 !important;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                    <span style="color:#555 !important;">🕒 ${p.hora || ''}</span>
                </div>
                <div style="margin-bottom: 15px !important; font-size: 1.2em !important;">
                    <p style="margin:4px 0 !important;"><b>👤 ${p.cliente}</b></p>
                    <p style="margin:4px 0 !important; color:#666 !important;">📍 ${p.entrega}</p>
                </div>
                <hr style="border: 0 !important; border-top: 2px solid #eee !important; margin:10px 0 !important;">
                <div style="flex-grow: 1 !important;">
                    ${listaHTML}
                </div>
                
                ${p.observaciones ? `<div style="background:#fff176 !important; margin: 15px 0 !important; padding: 15px !important; border-radius: 12px !important; border-left: 8px solid #ffd600 !important; color: #000 !important; font-weight: bold !important; font-size: 1em !important;">⚠️ NOTA: ${p.observaciones}</div>` : ""}
                
                <hr style="border: 0 !important; border-top: 2px solid #eee !important; margin:15px 0 !important;">
                <div style="margin-bottom:15px !important;">
                    <p style="margin:4px 0 !important; font-size:1.1em !important;">💳 ${p.metodoPago}</p>
                    <p style="margin:4px 0 !important; font-size:1.4em !important;"><b>💰 Total: ${p.totalStr}</b></p>
                </div>
                <button class="btn-listo-cocina" onclick="terminarPedido('${id}')" style="width:100% !important; padding: 22px !important; background:#4CAF50 !important; color:white !important; border:none !important; border-radius:40px !important; font-weight:bold !important; cursor:pointer !important; font-size: 1.3em !important;">LISTO ✅</button>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "grid-column:1/span 2 !important; text-align:center !important; color:#ff8c00 !important; font-weight:bold !important; background:#fff3e0 !important; padding:15px !important; border-radius:15px !important; margin-top:15px !important; font-size: 1.2em !important;";
            aviso.innerHTML = `...Hay ${ids.length - 2} pedido(s) más en cola ⚠️`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<div style='grid-column:1/span 2 !important; text-align:center !important; padding:80px !important; color:#aaa !important;'><h3>✅ ¡Sin pedidos pendientes!</h3></div>";
        conteoAnterior = 0;
    }
    primeraCarga = false;
});

// 7. FINALIZAR PEDIDO (DISEÑO VIEJO + ESTADÍSTICAS)
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
