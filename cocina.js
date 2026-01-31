// 1. IMPORTACIONES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, remove, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// --- BLOQUEO TOTAL DE SCROLL ---
document.documentElement.style.overflow = "hidden"; 
document.body.style.overflow = "hidden";
document.body.style.height = "100vh";
document.body.style.margin = "0";
document.body.style.backgroundColor = "#f4f4f9";

// 3. VARIABLES DE CONTROL
const sonidoNuevo = document.getElementById('notificacion');
const sonidoListo = document.getElementById('sonidoListo');
let primeraCarga = true;
let pedidosLocales = {};
let conteoAnterior = 0;

// 4. LÓGICA DE ALARMA
function detenerAlarmaAlVer() {
    if (!document.hidden && sonidoNuevo) {
        sonidoNuevo.pause();
        sonidoNuevo.currentTime = 0;
    }
}
document.addEventListener("visibilitychange", detenerAlarmaAlVer);
window.addEventListener("focus", detenerAlarmaAlVer);

// 5. CAPA DE ACTIVACIÓN (DISEÑO LIMPIO)
const capa = document.createElement('div');
capa.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center; cursor:pointer; font-family: sans-serif;";
capa.innerHTML = `
    <div style="border: 3px solid #ff8c00; padding: 20px; border-radius: 20px; text-align:center;">
        <h1 style="color: #ff8c00; font-size: 22px; margin:0;">PEDIDOS POWER</h1>
        <p style="margin: 10px 0;">Toca para iniciar cocina</p>
        <span style="font-size: 40px;">🔔</span>
    </div>`;
document.body.appendChild(capa);

capa.onclick = () => {
    if(sonidoNuevo) { 
        sonidoNuevo.loop = true;
        sonidoNuevo.play().then(() => { sonidoNuevo.pause(); }).catch(()=>{}); 
    }
    capa.remove();
};

// 6. ESCUCHAR PEDIDOS (FORZADO A 2 COLUMNAS VERTICALES)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    contenedor.innerHTML = ""; 
    contenedor.style = `
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 8px; 
        direction: rtl; 
        height: 100vh; 
        width: 100vw; 
        padding: 8px 5px; 
        box-sizing: border-box; 
        overflow: hidden;
    `;

    if (pedidos) {
        const ids = Object.keys(pedidos);
        if (!primeraCarga && ids.length > conteoAnterior) { 
            if(sonidoNuevo) { sonidoNuevo.currentTime = 0; sonidoNuevo.play().catch(()=>{}); }
        }
        conteoAnterior = ids.length;

        const prodP1 = ids[0] ? Object.keys(pedidos[ids[0]].productos) : [];
        const prodP2 = ids[1] ? Object.keys(pedidos[ids[1]].productos) : [];
        const repetidos = prodP1.filter(item => prodP2.includes(item));

        ids.forEach((id, index) => {
            if (index > 1) return; 
            const p = pedidos[id];
            
            let listaHTML = "<div style='overflow-y:auto; flex-grow:1; margin: 5px 0;'>";
            for (let key in p.productos) {
                const cant = p.productos[key];
                if (cant > 0) {
                    const nombre = key.replace("qty_", "").toUpperCase();
                    const esRepetido = repetidos.includes(key);
                    listaHTML += `
                        <div style="padding:4px; margin-bottom:4px; border-radius:6px; font-size:12px; display:flex; align-items:center; ${esRepetido ? 'background:#fff8e1; border-left:4px solid #ff8c00; font-weight:bold;' : 'background:#fffbe6; border-left:4px solid #ffd591;'}">
                            <span style="color:#ff8c00; margin-right:5px; font-size:14px;">${cant} x</span> ${nombre}
                        </div>`;
                }
            }
            listaHTML += "</div>";

            const tarjeta = document.createElement('div');
            tarjeta.style = `
                direction: ltr; 
                display: flex; 
                flex-direction: column; 
                height: calc(100vh - 70px); 
                background: white; 
                border: 2px solid ${index === 0 ? '#ff8c00' : '#ffa94d'}; 
                border-style: ${index === 0 ? 'solid' : 'dashed'};
                border-radius: 18px; 
                padding: 10px; 
                box-sizing: border-box;
                position: relative;
            `;
            
            tarjeta.innerHTML = `
                <div style="flex-shrink:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; font-weight:bold;">
                        <span style="color:#ff8c00; display:flex; align-items:center;">${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}</span>
                        <span style="color:#555;">🕒 ${p.hora || ''}</span>
                    </div>
                    <div style="margin:8px 0; font-size:13px; line-height:1.2;">
                        <span style="color:#1890ff;">👤</span> <b>${p.cliente}</b><br>
                        <span style="color:#f5222d;">📍</span> <small>${p.entrega}</small>
                    </div>
                    <div style="border-top:1px solid #f0f0f0;"></div>
                </div>
                
                ${listaHTML}
                
                <div style="flex-shrink:0;">
                    <div style="border-top:1px solid #f0f0f0; margin-bottom:5px;"></div>
                    ${p.observaciones ? `<div style="background:#fff2e8; color:#d4380d; padding:4px; font-size:10px; border-radius:4px; margin-bottom:5px;">⚠️ ${p.observaciones}</div>` : ""}
                    <div style="font-size:11px; margin-bottom:8px; display:flex; justify-content:space-between;">
                        <span>💳 ${p.metodoPago}</span>
                        <b>💰 ${p.totalStr}</b>
                    </div>
                    <button onclick="terminarPedido('${id}')" style="width:100%; padding:10px 0; background:#52c41a; color:white; border:none; border-radius:12px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow: 0 2px 0 rgba(0,0,0,0.05);">LISTO ✅</button>
                </div>
            `;
            contenedor.appendChild(tarjeta);
        });

        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "position:fixed; bottom:8px; left:50%; transform:translateX(-50%); width:90%; text-align:center; color:#855b00; font-weight:bold; background:#fff7e6; padding:6px; border-radius:12px; font-size:12px; border:1px solid #ffe7ba; z-index:10;";
            aviso.innerHTML = `...Hay ${ids.length - 2} pedido(s) más en cola ⚠️`;
            document.body.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<div style='grid-column:span 2; display:flex; justify-content:center; align-items:center; height:100%; color:#bfbfbf; font-size:18px;'>✅ Cocina limpia</div>";
    }
    primeraCarga = false;
});

// 7. FINALIZAR PEDIDO
window.terminarPedido = (id) => {
    if(sonidoListo) { sonidoListo.currentTime = 0; sonidoListo.play().catch(()=>{}); }
    const p = pedidosLocales[id];
    if (!p) return;
    const hoy = new Date().toLocaleDateString('es-PY').replace(/\//g, '-');
    set(ref(database, 'historial/' + id), { ...p, fecha_final: hoy }).then(() => {
        remove(ref(database, 'pedidos/' + id));
    });
};
