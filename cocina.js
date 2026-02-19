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

// 4. CAPA DE ACTIVACIÓN (Diseño Viejo - Sin Alarma Infinita)
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
    // Sonido normal (suena una vez y se detiene, como el viejo)
    if(sonidoNuevo) { sonidoNuevo.play().then(() => { sonidoNuevo.pause(); sonidoNuevo.currentTime = 0; }); }
    if(sonidoListo) { sonidoListo.play().then(() => { sonidoListo.pause(); sonidoListo.currentTime = 0; }); }
    
    // Pedir permiso para notificaciones en el celular
    if ("Notification" in window) { Notification.requestPermission(); }
    
    capa.remove();
};

// 5. NOTIFICACIÓN EXTERNA (Mejora del nuevo para el celular)
function lanzarNotificacionExterna(nombre) {
    if (Notification.permission === "granted" && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'NUEVO_PEDIDO',
            cliente: nombre || "Nuevo"
        });
    }
}

// 6. ESCUCHAR PEDIDOS (Formato de hora 24h y tamaños igualados)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    if (!contenedor) return;
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
            lanzarNotificacionExterna(pedidos[ids[ids.length - 1]].cliente);
        }
        conteoAnterior = ids.length;

        let prodPedido0 = [];
        let prodPedido1 = [];
        
        if (ids[0] && pedidos[ids[0]].productos) {
            prodPedido0 = Array.isArray(pedidos[ids[0]].productos) 
                ? pedidos[ids[0]].productos.map(p => p.nombre) : Object.keys(pedidos[ids[0]].productos);
        }
        if (ids[1] && pedidos[ids[1]].productos) {
            prodPedido1 = Array.isArray(pedidos[ids[1]].productos) 
                ? pedidos[ids[1]].productos.map(p => p.nombre) : Object.keys(pedidos[ids[1]].productos);
        }

        ids.forEach((id, index) => {
            if (index > 1) return; 

            const p = pedidos[id];
            let listaHTML = "<ul style='padding:0; list-style:none; margin: 10px 0;'>";
            
            if (Array.isArray(p.productos)) {
                p.productos.forEach(prod => {
                    const tieneCoincidencia = (index === 0 && prodPedido1.includes(prod.nombre)) || 
                                             (index === 1 && prodPedido0.includes(prod.nombre));
                    
                    const estiloCoincidencia = tieneCoincidencia ? 'border-left: 7px solid #fbc02d; padding: 5px; font-weight: bold; border-radius: 5px; background-color: rgba(251, 192, 45, 0.1);' : '';

                    listaHTML += `<li style="padding:4px 0; border-bottom:1px solid #eee; font-size: 1.1em; ${estiloCoincidencia}">
                        <span style="color:#ff8c00; font-weight:bold;">${prod.cantidad}</span> x ${prod.nombre}
                    </li>`;
                });
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr";
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items: flex-start;">
                    <div>
                        <span style="color:#ff8c00; font-weight:bold; font-size: 1.1em; display: block;">
                            ${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}
                        </span>
                        <span style="font-size: 0.85em; color: #555; font-weight: 600;">
                            🕒 ${p.hora || ''}
                        </span>
                    </div>
                </div>

                <div style="margin: 12px 0;">
                    <p style="margin:0; font-size:1.1em;">👤 <b>${p.cliente}</b></p>
                    <p style="margin:0; font-size:1em; color: #444;">📍 <b>${p.entrega}</b></p>
                </div>

                <hr style="border:0; border-top:1px solid #eee; margin: 5px 0;">
                ${listaHTML}
                
                ${p.observaciones ? `<div style="background:#fff176; margin: 8px 0; padding: 6px; border-radius: 8px; border-left: 5px solid #ffd600; font-size: 0.85em; font-weight: bold;">📝 ${p.observaciones}</div>` : ""}
                
                <hr style="border:0; border-top:1px solid #eee; margin: 5px 0;">

                <div style="margin-top: auto; padding-top: 10px;">
                    <p style="margin:0; font-size:0.9em; color:#666;">💳  ${p.metodoPago}</p>
                    <p style="margin:0; font-size:1.2em; color:#ff8c00;">💰  <b>${p.totalStr || '0 Gs'}</b></p>
                    <button class="btn-listo-cocina" onclick="terminarPedido('${id}')" style="margin-top:10px;">LISTO ✅</button>
                </div>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "grid-column: 1 / span 2; width: 100%; text-align: center; color: #ff8c00; padding: 10px; border-radius: 10px; font-weight: bold; margin-top: 10px; border: 1px dashed #ff8c00; box-sizing: border-box; justify-self: center;";
            aviso.innerHTML = `HAY ${ids.length - 2} PEDIDO(S) MÁS EN COLA ...`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<p style='text-align:center; grid-column:1/span 2; color:#aaa; margin-top:50px;'>✅ ¡Sin pedidos!</p>";
    }
    primeraCarga = false;
});
window.terminarPedido = (id) => {
    if(sonidoListo) { 
        sonidoListo.currentTime = 0; 
        sonidoListo.play().catch(e => console.log(e)); 
    }

    const p = pedidosLocales[id];
    if (!p) return;

    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    
    // 1. Preparamos el objeto para el historial
    const pedidoFinalizado = { 
        ...p, 
        fecha_final: hoy,
        estado: "completado",
        totalNum: parseInt(p.totalNum) || 0 
    };

    // 2. Guardamos en historial
    set(ref(database, 'historial/' + id), pedidoFinalizado)
    .then(() => {
        // 3. Actualizar estadísticas de productos
        const fuenteStats = p.productos_stats || {};
        for (let prod in fuenteStats) {
            if (fuenteStats[prod] > 0) {
                const statRef = ref(database, `estadisticas/diario/${hoy}/${prod}`);
                runTransaction(statRef, (val) => (val || 0) + parseInt(fuenteStats[prod]));
            }
        }
        
        // 4. Actualizar estadística de Delivery (si aplica)
        if (p.entrega === "Delivery") {
            const montoDeliv = parseInt(p.monto_delivery) || 0;
            if (montoDeliv > 0) {
                const delivRef = ref(database, `estadisticas/diario/${hoy}/total_delivery`);
                runTransaction(delivRef, (val) => (val || 0) + montoDeliv);
            }
        }

        // 5. Borramos de pedidos pendientes
        return remove(ref(database, 'pedidos/' + id));
    })
    .then(() => {
        console.log("Pedido finalizado con éxito");
    })
    .catch(err => console.error("Error al finalizar:", err));
};
