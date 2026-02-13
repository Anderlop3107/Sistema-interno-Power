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

// 6. ESCUCHAR PEDIDOS (ACTUALIZADO PARA NUEVO FORMATO)
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
        
        // Alerta de sonido
        if (!primeraCarga && ids.length > conteoAnterior) {
            if(sonidoNuevo) {
                sonidoNuevo.currentTime = 0;
                sonidoNuevo.play().catch(e => console.log("Error sonido:", e));
            }
            const ultimoId = ids[ids.length - 1];
            lanzarNotificacionExterna(pedidos[ultimoId].cliente);
        }
        conteoAnterior = ids.length;

        ids.forEach((id, index) => {
            if (index > 1) return; // Solo muestra los 2 primeros

            const p = pedidos[id];
            
            // --- NUEVA LÓGICA PARA LISTAR PRODUCTOS ---
            let listaHTML = "<ul style='padding:0; list-style:none;'>";
            if (Array.isArray(p.productos)) {
                // Si es el formato nuevo (Array)
                p.productos.forEach(prod => {
                    listaHTML += `<li style="padding:5px; border-bottom:1px solid #eee;">
                        <span style="color:#ff8c00; font-weight:bold;">${prod.cantidad}</span> x ${prod.nombre}
                    </li>`;
                });
            } else {
                // Por si queda algún pedido con el formato viejo
                for (let key in p.productos) {
                    if (p.productos[key] > 0) {
                        const nombreOld = key.replace("qty_", "").toUpperCase();
                        listaHTML += `<li><span style="color:#ff8c00;">${p.productos[key]}</span> x ${nombreOld}</li>`;
                    }
                }
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr";
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            
            // --- AQUÍ SE DIBUJA LA TARJETA ---
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span style="color:#ff8c00;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                    <span>🕒 ${p.hora || ''}</span>
                </div>
                <p>👤 <b>${p.cliente}</b><br><b>📍 ${p.entrega}</b></p>
                <hr>
                ${listaHTML}
                
                ${p.observaciones ? `<div style="background:#fff176; margin: 10px 0; padding: 8px; border-radius: 8px; border-left: 5px solid #ffd600; color: #000; font-weight: bold; font-size: 0.9em;">📝 NOTA: ${p.observaciones}</div>` : ""}
                
                <hr>
                <p style="font-size:0.9em;">💳 ${p.metodoPago}<br>
                <b style="font-size:1.2em; color:#ff8c00;">💰 ${p.totalStr || '0 Gs'}</b></p>
                <button class="btn-listo-cocina" onclick="terminarPedido('${id}')">LISTO ✅</button>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "grid-column:1/span 2; text-align:center; color:#ff8c00; font-weight:bold; background:#fff3e0; padding:10px; border-radius:10px;";
            aviso.innerHTML = `⚠️ Hay ${ids.length - 2} pedido(s) más en cola...`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<p style='text-align:center; grid-column:1/span 2; color:#aaa;'>✅ ¡Sin pedidos pendientes!</p>";
        conteoAnterior = 0;
    }
    primeraCarga = false;
});

// 7. FINALIZAR PEDIDO (Corregido para leer estadísticas)
window.terminarPedido = (id) => {
    if(sonidoListo) { sonidoListo.currentTime = 0; sonidoListo.play().catch(e => console.log(e)); }
    const p = pedidosLocales[id];
    if (!p) return;

    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy })
    .then(() => {
        // Usamos productos_stats que creamos en el script.js para no romper tus gráficos
        const fuenteStats = p.productos_stats || {};
        
        for (let prod in fuenteStats) {
            if (fuenteStats[prod] > 0) {
                const statRef = ref(database, `estadisticas/diario/${hoy}/${prod}`);
                runTransaction(statRef, (val) => (val || 0) + parseInt(fuenteStats[prod]));
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
