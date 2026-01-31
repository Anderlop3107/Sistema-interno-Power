import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, child, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const PRECIOS = {
    "POWER": 12000, "ESPECIAL": 10000, "CARNE": 8000, "MIXTO": 7000, "POLLO": 5000,
    "LOMITO ARABE": 25000, "COMBO": 18000, "COMBO POWER": 18000, "PAPITAS": 10000,
    "GAS1L": 10000, "GASEOSA DE 1L": 10000, "GAS250": 4000, "GASEOSA DE 250": 4000,
    "SALSA": 1000, "ESP POLLO": 10000
};

let chartProds, chartFinas;
let dataGlobal = { pedidos: [], delivery: [], productos: {}, clientes: {}, total: 0, totalDeliv: 0, efe: 0, tra: 0, totalPY: 0, pedidosYa: [] };

const limpiarMonto = (v) => v ? parseInt(v.toString().replace(/\D/g, '')) || 0 : 0;
const formatoGs = (v) => "Gs. " + (v || 0).toLocaleString('es-PY');

function obtenerPrecio(nombreSucio) {
    const nombre = (nombreSucio || "").toUpperCase().trim();
    if (PRECIOS[nombre]) return PRECIOS[nombre];
    for (let key in PRECIOS) {
        if (nombre.includes(key) || key.includes(nombre)) return PRECIOS[key];
    }
    return 0;
}

// --- FUNCIONES DE NAVEGACIÓN ---
window.irAInicio = () => {
    document.getElementById('dashboard-final').style.display = 'none';
    document.getElementById('capa-inicial').style.display = 'flex';
};

window.cambiarVista = (vistaId, btn) => {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    const targetView = document.getElementById(`view-${vistaId}`);
    if (targetView) {
        targetView.classList.add('active');
        targetView.style.display = 'block';
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const titulos = { 
        resumen: 'Resumen Ejecutivo', clientes: 'Ranking de Clientes Fieles (Top 5)', 
        productos: 'Ventas por Producto', pedidosya: 'Registro PedidosYa', 
        delivery: 'Control de Deliverys', historial: 'Historial de Formularios' 
    };
    if (document.getElementById('tituloVista')) {
        document.getElementById('tituloVista').innerText = titulos[vistaId] || vistaId.toUpperCase();
    }
};

// --- LÓGICA PRINCIPAL ---
window.cargarDashboard = async () => {
    const inicio = document.getElementById('fechaInicio').value;
    const fin = document.getElementById('fechaFin').value;
    if(!inicio || !fin) return alert("Selecciona el rango de fechas.");

    try {
        const snap = await get(child(ref(database), 'historial'));
        if (!snap.exists()) return alert("No hay datos.");

        const dataOriginal = snap.val();
        dataGlobal = { pedidos: [], delivery: [], productos: {}, clientes: {}, total: 0, totalDeliv: 0, efe: 0, tra: 0, totalPY: 0, pedidosYa: [] };

        const fI = new Date(inicio + "T00:00:00");
        const fF = new Date(fin + "T23:59:59");

       for(let id in dataOriginal){
            const p = dataOriginal[id];
            if(!p.fecha_final) continue;
            const [d, m, a] = p.fecha_final.split('-');
            const fP = new Date(a, m-1, d);

            if(fP >= fI && fP <= fF){
                // 1. OBTENER MONTOS
                let montoTotalTicket = (limpiarMonto(p.totalNum || p.totalStr));
                let montoEnvioPropio = (p.entrega === "Delivery") ? limpiarMonto(p.monto_delivery) : 0;
                
                // La "Venta Neta" de comida es el total menos el flete
                let ventaComida = montoTotalTicket - montoEnvioPropio;

                // 2. CLASIFICAR SEGÚN TU LÓGICA (Separación Total)
                const metodo = (p.metodoPago || "").toLowerCase();
                const clienteNom = (p.cliente || "").toLowerCase();

                // A - ES PEDIDO YA (Plataforma externa)
                if(clienteNom.includes("pedido ya") || clienteNom.includes("pedidosya") || clienteNom.includes("py") || metodo.includes("pedidosya")) {
                    dataGlobal.totalPY += ventaComida; 
                    dataGlobal.pedidosYa.push({ 
                        hora: p.hora, 
                        ref: p.cliente, 
                        total: ventaComida 
                    });
                } 
                // B - ES VENTA PROPIA (Efectivo o Transferencia)
                else {
                    if(metodo.includes("efectivo") || metodo === "ef") {
                        dataGlobal.efe += ventaComida;
                    } else if(metodo.includes("transferencia") || metodo === "tr") {
                        dataGlobal.tra += ventaComida;
                    }
                }

                // C - CAJÓN APARTE: DELIVERY (Flete puro)
                if(p.entrega === "Delivery" && montoEnvioPropio > 0) {
                    dataGlobal.totalDeliv += montoEnvioPropio;
                    dataGlobal.delivery.push({ 
                        fecha: p.fecha_final, 
                        cliente: p.cliente, 
                        monto: montoEnvioPropio 
                    });
                }

                // 3. ESTADÍSTICAS GENERALES
                dataGlobal.total += montoTotalTicket;
                dataGlobal.pedidos.push({...p, idFB: id, totalCorregido: montoTotalTicket});
                
                // Conteo de productos para el ranking
                for(let k in p.productos){
                    let cant = parseInt(p.productos[k]);
                    if(cant > 0) {
                        let nom = k.replace('qty_','').replace(/_/g,' ').toUpperCase();
                        dataGlobal.productos[nom] = (dataGlobal.productos[nom] || 0) + cant;
                    }
                }

                let cli = (p.cliente || "ANÓNIMO").trim().toUpperCase();
                dataGlobal.clientes[cli] = (dataGlobal.clientes[cli] || 0) + 1;
            }
        }
        renderDashboard(inicio, fin);
        document.getElementById('capa-inicial').style.display = 'none';
        document.getElementById('dashboard-final').style.display = 'grid';
    } catch (e) { console.error(e); }
};

function renderDashboard(inicio, fin) {
    document.getElementById('txtTotal').innerText = formatoGs(dataGlobal.total);
    document.getElementById('txtCant').innerText = dataGlobal.pedidos.length;
    document.getElementById('txtDelivTotal').innerText = formatoGs(dataGlobal.totalDeliv);
    document.getElementById('txtEfe').innerText = formatoGs(dataGlobal.efe);
    document.getElementById('txtTra').innerText = formatoGs(dataGlobal.tra);
    if(document.getElementById('txtPedidosYa')) document.getElementById('txtPedidosYa').innerText = formatoGs(dataGlobal.totalPY);
    document.getElementById('rangoTexto').innerText = `${inicio} al ${fin}`;

    const tbCli = document.querySelector('#view-clientes tbody');
    if(tbCli){
        const cRank = Object.entries(dataGlobal.clientes).sort((a, b) => b[1] - a[1]).slice(0, 5);
        tbCli.innerHTML = cRank.map((c, i) => `<tr><td>#${i+1}</td><td><b>${c[0]}</b></td><td>${c[1]} pedidos</td></tr>`).join('');
    }

    const tbProd = document.querySelector('#view-productos tbody');
    if(tbProd){
        const pRank = Object.entries(dataGlobal.productos).sort((a,b)=>b[1]-a[1]);
        tbProd.innerHTML = pRank.map(p => `<tr><td>${p[0]}</td><td><b>${p[1]} uds</b></td></tr>`).join('');
    }

    const tbPY = document.querySelector('#view-pedidosya tbody');
    if(tbPY) tbPY.innerHTML = dataGlobal.pedidosYa.map(p => `<tr><td>${p.hora || '--:--'}</td><td><b>${p.ref}</b></td><td>${formatoGs(p.total)}</td></tr>`).join('');

    const tbDel = document.querySelector('#view-delivery tbody');
    if(tbDel) tbDel.innerHTML = dataGlobal.delivery.map(d => `<tr><td>${d.fecha}</td><td>${d.cliente}</td><td>${formatoGs(d.monto)}</td></tr>`).join('');

    const tbHist = document.querySelector('#view-historial tbody');
    if(tbHist) {
        tbHist.innerHTML = dataGlobal.pedidos.map((p) => `
            <tr>
                <td>${p.hora || '--:--'}</td>
                <td><b>${p.cliente}</b></td>
                <td><span style="font-size:10px; padding:2px 5px; background:#eee; border-radius:4px;">${p.metodoPago || 'S/D'}</span></td>
                <td>${formatoGs(p.totalCorregido)}</td>
                <td style="display:flex; gap:5px; justify-content:center;">
                    <button onclick="verDetallePedidoPorID('${p.idFB}')" class="btn-acc" title="Ver Ticket"><i data-lucide="eye"></i></button>
                    <button onclick="editarPedido('${p.idFB}', '${p.cliente}', '${p.totalCorregido}', '${p.metodoPago}')" class="btn-acc edit" title="Editar"><i data-lucide="edit-3"></i></button>
                    <button onclick="anularPedido('${p.idFB}')" class="btn-acc del" title="Anular"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>`).join('');
        lucide.createIcons();
    }
    renderCharts();
}

// --- FUNCIONES DE ACCIÓN (EDITAR / ANULAR / VER) ---

window.anularPedido = async (idFirebase) => {
    if (confirm("¿Estás seguro de que deseas ANULAR este pedido? Se eliminará de la base de datos.")) {
        try {
            await remove(ref(database, `historial/${idFirebase}`));
            alert("Pedido eliminado.");
            window.cargarDashboard();
        } catch (e) { alert("Error: " + e.message); }
    }
};

window.editarPedido = async (idFirebase, cliente, montoActual, pagoActual) => {
    const nuevoMonto = prompt(`Monto actual: ${montoActual}\nIngrese el NUEVO monto total:`, montoActual);
    if (nuevoMonto === null) return;

    const nuevoPago = prompt(`Método actual: ${pagoActual}\nNuevo método (Efectivo, Transferencia, PedidosYa):`, pagoActual);
    if (nuevoPago === null) return;

    const motivo = prompt(`SEGURIDAD: ¿Por qué cambias el pedido? (Ej: Agregó un lomito):`);
    if (!motivo) return alert("Debes poner un motivo para guardar.");

    const fechaEdicion = new Date().toLocaleString();
    const notaSeguridad = `[Editado ${fechaEdicion}]: ${motivo} (Monto anterior: ${montoActual})`;

    const actualizaciones = {};
    actualizaciones[`historial/${idFirebase}/totalNum`] = limpiarMonto(nuevoMonto);
    actualizaciones[`historial/${idFirebase}/metodoPago`] = nuevoPago;
    actualizaciones[`historial/${idFirebase}/notas_edicion`] = notaSeguridad;

    try {
        await update(ref(database), actualizaciones);
        alert("¡Guardado correctamente!");
        window.cargarDashboard();
    } catch (e) { alert("Error: " + e.message); }
};

window.verDetallePedidoPorID = async (idFirebase) => {
    const snap = await get(child(ref(database), `historial/${idFirebase}`));
    const p = snap.val();
    
    let itemsHtml = "";
    let subtotalP = 0;
    for (let k in p.productos) {
        let cant = parseInt(p.productos[k]);
        if (cant > 0) {
            let nom = k.replace('qty_', '').replace(/_/g, ' ').toUpperCase();
            let pu = obtenerPrecio(nom);
            let sub = pu * cant;
            subtotalP += sub;
            itemsHtml += `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #ccc;"><span>${nom} (x${cant})</span><b>${formatoGs(sub)}</b></div>`;
        }
    }

    const notaSeguridadHtml = p.notas_edicion 
    ? `<div style="margin-top:15px; padding:10px; background:#fff3e0; border-left:4px solid #ff8c00; font-size:11px; color:#e65100; border-radius:4px;">
         <b>🛡️ REGISTRO DE SEGURIDAD:</b><br>${p.notas_edicion}
       </div>` : "";

    const modal = document.createElement('div');
    modal.id = "modal-detalle-pedido";
    modal.style = "position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";
    modal.innerHTML = `
        <div style="background:white; color:#333; padding:25px; border-radius:15px; width:100%; max-width:350px;">
            <center><h3 style="margin:0; color:#ff8c00;">TICKET</h3><small>${p.fecha_final} - ${p.hora}</small></center>
            <hr><p><b>Cliente:</b> ${p.cliente}<br><b>Pago:</b> ${p.metodoPago || 'S/D'}</p>
            <div style="margin:10px 0; max-height:180px; overflow-y:auto;">${itemsHtml}</div>
            <div style="border-top:2px solid #eee; padding-top:10px;">
                <div style="display:flex; justify-content:space-between; font-weight:bold; color:#ff6b00; font-size:1.2rem;"><span>TOTAL:</span><span>${formatoGs(limpiarMonto(p.totalNum || p.totalStr))}</span></div>
            </div>
            ${notaSeguridadHtml}
            <button onclick="document.getElementById('modal-detalle-pedido').remove()" style="width:100%; margin-top:15px; padding:12px; background:#333; color:white; border:none; border-radius:10px; cursor:pointer;">CERRAR</button>
        </div>`;
    document.body.appendChild(modal);
};

// --- GRÁFICOS ---
function renderCharts() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const ctxProds = document.getElementById('chartProductos');
    if(ctxProds) {
        if(chartProds) chartProds.destroy();
        const pLabels = Object.keys(dataGlobal.productos).slice(0, 10);
        chartProds = new Chart(ctxProds, {
            type: 'bar',
            data: { labels: pLabels, datasets: [{ data: pLabels.map(l=>dataGlobal.productos[l]), backgroundColor: '#ff8c00' }] },
            options: { maintainAspectRatio:false, indexAxis:'y', plugins:{legend:{display:false}}, scales:{x:{ticks:{color:textColor}}, y:{ticks:{color:textColor}}} }
        });
    }
    const ctxFinas = document.getElementById('chartFinanzas');
    if(ctxFinas) {
        if(chartFinas) chartFinas.destroy();
        chartFinas = new Chart(ctxFinas, {
            type: 'doughnut',
            data: { 
                labels: ['Efectivo', 'Transferencia', 'PedidosYa'], 
                datasets: [{ 
                    data: [dataGlobal.efe, dataGlobal.tra, dataGlobal.totalPY], 
                    backgroundColor: ['#16a34a', '#0284c7', '#ff3b00'] 
                }] 
            },
            options: { maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{color:textColor}}} }
        });
    }
}

