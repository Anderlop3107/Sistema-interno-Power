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

let chartProds, chartFinas, chartLomitos, chartExtras;
window.dataGlobal = { 
    pedidos: [], delivery: [], 
    productosChurras: {}, 
    productosLomitos: {}, 
    productosExtras: {},
    clientes: {}, total: 0, 
    totalDeliv: 0, efe: 0, tra: 0, totalPY: 0, pedidosYa: []
};

const limpiarMonto = (v) => v ? parseInt(v.toString().replace(/\D/g, '')) || 0 : 0;
const formatoGs = (v) => "Gs. " + (v || 0).toLocaleString('es-PY');

function obtenerPrecio(nombreSucio) {
    const nombre = (nombreSucio || "").toUpperCase().trim();
    if (PRECIOS[nombre]) return PRECIOS[nombre];
    for (let key in PRECIOS) {
        if (nombre.includes(key)) return PRECIOS[key];
    }
    return 0;
}

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
        resumen: 'Resumen Ejecutivo', 
        clientes: 'Ranking de Clientes Fieles', 
        productos: 'Ventas por Producto', 
        pedidosya: 'Registro PedidosYa', 
        delivery: 'Control de Deliverys', 
        historial: 'Historial de Pedidos'
    };
    if (document.getElementById('tituloVista')) {
        document.getElementById('tituloVista').innerText = titulos[vistaId] || vistaId.toUpperCase();
    }
};

window.cargarDashboard = async () => {
    const inicio = document.getElementById('fechaInicio').value;
    const fin = document.getElementById('fechaFin').value;
    if(!inicio || !fin) return alert("Selecciona el rango de fechas.");

    try {
        const snap = await get(child(ref(database), 'historial'));
        if (!snap.exists()) return alert("No hay datos.");

        const dataOriginal = snap.val();
        dataGlobal = { 
            pedidos: [], delivery: [], 
            productosChurras: {}, productosLomitos: {}, productosExtras: {},
            clientes: {}, total: 0, totalDeliv: 0, efe: 0, tra: 0, totalPY: 0, pedidosYa: []
        };

        const fI = new Date(inicio + "T00:00:00");
        const fF = new Date(fin + "T23:59:59");

        for(let id in dataOriginal){
            const p = dataOriginal[id];
            if(!p.fecha_final) continue;
            const [d, m, a] = p.fecha_final.split('-');
            const fP = new Date(a, m-1, d);

            if(fP >= fI && fP <= fF){
                let calcProductos = 0;
                const listaProd = p.productos || p.items || {};

                const procesarProducto = (nom, cant) => {
                    nom = nom.toUpperCase().trim();
                    calcProductos += (obtenerPrecio(nom) * cant);
                    
                    if (nom.startsWith("C.") || nom.startsWith("C ")) {
                        dataGlobal.productosChurras[nom] = (dataGlobal.productosChurras[nom] || 0) + cant;
                    } 
                    else if (nom.includes("LOMITO")) {
                        dataGlobal.productosLomitos[nom] = (dataGlobal.productosLomitos[nom] || 0) + cant;
                    }
                    else if (nom.includes("PAPA") || nom.includes("GAS") || nom.includes("SALSA") || nom.includes("GASEOSA")) {
                        dataGlobal.productosExtras[nom] = (dataGlobal.productosExtras[nom] || 0) + cant;
                    }
                    else {
                        dataGlobal.productosExtras[nom] = (dataGlobal.productosExtras[nom] || 0) + cant;
                    }
                };

                if (Array.isArray(listaProd)) {
                    listaProd.forEach(prod => {
                        let cant = parseInt(prod.cantidad) || 0;
                        if(cant > 0) procesarProducto(prod.nombre || "SIN NOMBRE", cant);
                    });
                } else {
                    for(let k in listaProd){
                        let cant = parseInt(listaProd[k]) || 0;
                        if(cant > 0) {
                            let nom = k.replace(/qty_/i, '').replace(/_/g, ' ');
                            procesarProducto(nom, cant);
                        }
                    }
                }
                
                let mDeli = limpiarMonto(p.monto_delivery);
                let montoFinal = limpiarMonto(p.totalNum || p.totalStr);
                if(montoFinal === 0) montoFinal = calcProductos + mDeli;
                
                dataGlobal.pedidos.push({...p, idFB: id, totalCorregido: montoFinal});
                dataGlobal.total += montoFinal;

                const metodo = (p.metodoPago || "").toLowerCase();
                if(metodo.includes("efectivo") || metodo === "ef") dataGlobal.efe += montoFinal;
                else if(metodo.includes("transferencia") || metodo === "tr") dataGlobal.tra += montoFinal;
                else if(metodo.includes("pedidosya") || (p.cliente && p.cliente.toLowerCase().includes("py"))) {
                    dataGlobal.totalPY += montoFinal;
                    dataGlobal.pedidosYa.push({hora: p.hora, ref: p.cliente, total: montoFinal});
                }

                if(p.entrega === "Delivery") {
                    dataGlobal.totalDeliv += mDeli;
                    dataGlobal.delivery.push({ fecha: p.fecha_final, cliente: p.cliente, monto: mDeli });
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

    const tbProd = document.querySelector('#tbody-productos');
    if(tbProd){
        const allProds = {...dataGlobal.productosChurras, ...dataGlobal.productosLomitos, ...dataGlobal.productosExtras};
        const pRank = Object.entries(allProds).sort((a,b)=>b[1]-a[1]);
        tbProd.innerHTML = pRank.map(p => `<tr><td>${p[0]}</td><td><b>${p[1]} uds</b></td></tr>`).join('');
    }

    const tbCli = document.querySelector('#tbody-clientes');
    if(tbCli){
        const cRank = Object.entries(dataGlobal.clientes).sort((a, b) => b[1] - a[1]).slice(0, 10);
        tbCli.innerHTML = cRank.map((c, i) => `<tr><td>#${i+1}</td><td><b>${c[0]}</b></td><td>${c[1]} pedidos</td></tr>`).join('');
    }

    const tbPY = document.querySelector('#tbody-pedidosya');
    if(tbPY) tbPY.innerHTML = dataGlobal.pedidosYa.map(p => `<tr><td>${p.hora || '--:--'}</td><td><b>${p.ref}</b></td><td>${formatoGs(p.total)}</td></tr>`).join('');

    const tbDel = document.querySelector('#tbody-delivery');
    if(tbDel) tbDel.innerHTML = dataGlobal.delivery.map(d => `<tr><td>${d.fecha}</td><td>${d.cliente}</td><td>${formatoGs(d.monto)}</td></tr>`).join('');

    const tbHist = document.querySelector('#tbody-historial');
    if(tbHist) {
        tbHist.innerHTML = dataGlobal.pedidos.map((p) => `
            <tr>
                <td>${p.hora || '--:--'}</td><td><b>${p.cliente}</b></td>
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

function renderCharts() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    
    // CHART CHURRASQUITOS
    const ctxChurras = document.getElementById('chartProductos');
    if(ctxChurras) {
        if(chartProds) chartProds.destroy();
        const churrasEntries = Object.entries(dataGlobal.productosChurras).sort((a,b) => b[1] - a[1]);
        chartProds = new Chart(ctxChurras, {
            type: 'bar',
            data: { 
                labels: churrasEntries.map(e => e[0]), 
                datasets: [{ label: 'Unidades', data: churrasEntries.map(e => e[1]), backgroundColor: '#ff8c00' }] 
            },
            options: { maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } }
        });
    }

    // CHART LOMITOS
    const ctxLomitos = document.getElementById('chartLomitos');
    if(ctxLomitos) {
        if(chartLomitos) chartLomitos.destroy();
        const lomitoEntries = Object.entries(dataGlobal.productosLomitos).sort((a,b) => b[1] - a[1]);
        chartLomitos = new Chart(ctxLomitos, {
            type: 'bar',
            data: { 
                labels: lomitoEntries.map(e => e[0]), 
                datasets: [{ label: 'Unidades', data: lomitoEntries.map(e => e[1]), backgroundColor: '#e65100' }] 
            },
            options: { maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } }
        });
    }

    // CHART EXTRAS (NUEVO)
    const ctxExtras = document.getElementById('chartExtras');
    if(ctxExtras) {
        if(chartExtras) chartExtras.destroy();
        const extrasEntries = Object.entries(dataGlobal.productosExtras).sort((a,b) => b[1] - a[1]);
        chartExtras = new Chart(ctxExtras, {
            type: 'bar',
            data: { 
                labels: extrasEntries.map(e => e[0]), 
                datasets: [{ label: 'Unidades', data: extrasEntries.map(e => e[1]), backgroundColor: '#0284c7' }] 
            },
            options: { maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } }
        });
    }

    // CHART FINANZAS
    const ctxFinas = document.getElementById('chartFinanzas');
    if(ctxFinas) {
        if(chartFinas) chartFinas.destroy();
        chartFinas = new Chart(ctxFinas, {
            type: 'doughnut',
            data: { labels: ['Efectivo', 'Transferencia', 'PedidosYa'], datasets: [{ data: [dataGlobal.efe, dataGlobal.tra, dataGlobal.totalPY], backgroundColor: ['#16a34a', '#0284c7', '#ff3b00'] }] },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: textColor } } } }
        });
    }
}

// FUNCIONES GLOBALES PARA BOTONES
window.verDetallePedidoPorID = async (idFB) => {
    const snap = await get(child(ref(database), `historial/${idFB}`));
    if(!snap.exists()) return;
    const p = snap.val();
    let itemsHtml = "";
    const prods = p.productos || p.items || {};
    const procesarFilaTicket = (nom, cant) => {
        nom = nom.toUpperCase();
        itemsHtml += `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #ccc;"><span>${nom} (x${cant})</span><b>${formatoGs(obtenerPrecio(nom)*cant)}</b></div>`;
    };
    if (Array.isArray(prods)) { prods.forEach(prod => { let cant = parseInt(prod.cantidad) || 0; if (cant > 0) procesarFilaTicket(prod.nombre || "SIN NOMBRE", cant); }); }
    else { for (let k in prods) { let cant = parseInt(prods[k]) || 0; if (cant > 0) { let nom = k.replace(/qty_/i, '').replace(/_/g, ' '); procesarFilaTicket(nom, cant); } } }
    const modal = document.createElement('div');
    modal.style = "position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";
    modal.innerHTML = `<div style="background:white; color:#333; padding:25px; border-radius:15px; width:100%; max-width:350px;"><center><h3 style="margin:0; color:#ff8c00;">TICKET</h3><small>${p.fecha_final} - ${p.hora}</small></center><hr><p><b>Cliente:</b> ${p.cliente}</p><div style="margin:10px 0; max-height:180px; overflow-y:auto;">${itemsHtml}</div><div style="border-top:2px solid #eee; padding-top:10px;"><div style="display:flex; justify-content:space-between; font-weight:bold; color:#ff6b00;"><span>TOTAL:</span><span>${formatoGs(limpiarMonto(p.totalNum || p.totalStr))}</span></div></div><button onclick="this.parentElement.parentElement.remove()" style="width:100%; margin-top:15px; padding:12px; background:#333; color:white; border:none; border-radius:10px; cursor:pointer;">CERRAR</button></div>`;
    document.body.appendChild(modal);
};
window.anularPedido = async (id) => { if(confirm("¿Anular este pedido definitivamente?")) { await remove(ref(database, `historial/${id}`)); window.cargarDashboard(); } };
window.editarPedido = async (id, cli, monto, pago) => { const nuevoM = prompt("Nuevo monto total:", monto); if(nuevoM === null) return; const nuevoP = prompt("Nuevo método:", pago); if(nuevoP === null) return; await update(ref(database, `historial/${id}`), { totalNum: limpiarMonto(nuevoM), metodoPago: nuevoP }); window.cargarDashboard(); };
