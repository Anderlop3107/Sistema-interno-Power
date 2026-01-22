import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
let dataGlobal = { pedidos: [], delivery: [], productos: {}, clientes: {}, total: 0, totalDeliv: 0, efe: 0, tra: 0 };

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

// --- NUEVA FUNCIÓN PARA VOLVER A LA SELECCIÓN DE FECHA ---
window.irAInicio = () => {
    document.getElementById('dashboard-final').style.display = 'none';
    document.getElementById('capa-inicial').style.display = 'flex';
    // Opcional: limpiar los campos de fecha si deseas
    // document.getElementById('fechaInicio').value = '';
    // document.getElementById('fechaFin').value = '';
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
        productos: 'Ventas por Producto', delivery: 'Control de Deliverys', 
        historial: 'Historial de Formularios' 
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

        const data = snap.val();
        dataGlobal = { pedidos: [], delivery: [], productos: {}, clientes: {}, total: 0, totalDeliv: 0, efe: 0, tra: 0 };

        const fI = new Date(inicio + "T00:00:00");
        const fF = new Date(fin + "T23:59:59");

        for(let id in data){
            const p = data[id];
            if(!p.fecha_final) continue;
            const [d, m, a] = p.fecha_final.split('-');
            const fP = new Date(a, m-1, d);

            if(fP >= fI && fP <= fF){
                let calcProductos = 0;
                for(let k in p.productos){
                    let cant = parseInt(p.productos[k]);
                    if(cant > 0) {
                        let nom = k.replace('qty_','').replace(/_/g,' ').toUpperCase();
                        calcProductos += (obtenerPrecio(nom) * cant);
                        dataGlobal.productos[nom] = (dataGlobal.productos[nom] || 0) + cant;
                    }
                }
                
                let mDeli = limpiarMonto(p.monto_delivery);
                let montoFinal = (limpiarMonto(p.totalNum || p.totalStr) === 0) ? (calcProductos + mDeli) : limpiarMonto(p.totalNum || p.totalStr);
                
                dataGlobal.pedidos.push({...p, totalCorregido: montoFinal});
                dataGlobal.total += montoFinal;

                const metodo = (p.metodoPago || "").toLowerCase();
                if(metodo.includes("efectivo")) dataGlobal.efe += montoFinal;
                else if(metodo.includes("transferencia")) dataGlobal.tra += montoFinal;

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

    const tbDel = document.querySelector('#view-delivery tbody');
    if(tbDel) tbDel.innerHTML = dataGlobal.delivery.map(d => `<tr><td>${d.fecha}</td><td>${d.cliente}</td><td>${formatoGs(d.monto)}</td></tr>`).join('');

    const tbHist = document.querySelector('#view-historial tbody');
    if(tbHist) {
        tbHist.innerHTML = dataGlobal.pedidos.map((p, index) => `
            <tr>
                <td>${p.hora || '--:--'}</td>
                <td><b>${p.cliente}</b></td>
                <td>${p.metodoPago || 'S/D'}</td>
                <td>${formatoGs(p.totalCorregido)}</td>
                <td><button onclick="verDetallePedido(${index})" class="btn-primary" style="padding:5px 10px; font-size:11px;">FORMULARIO</button></td>
            </tr>`).join('');
    }
    renderCharts();
}

// Función Modal de Detalle (Ticket)
window.verDetallePedido = (index) => {
    const p = dataGlobal.pedidos[index];
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
    const mDeli = limpiarMonto(p.monto_delivery);
    const modal = document.createElement('div');
    modal.id = "modal-detalle-pedido";
    modal.style = "position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";
    modal.innerHTML = `
        <div style="background:white; color:#333; padding:25px; border-radius:15px; width:100%; max-width:350px;">
            <center><h3 style="margin:0; color:#ff8c00;">TICKET</h3><small>${p.fecha_final}</small></center>
            <hr><p><b>Cliente:</b> ${p.cliente}</p>
            <div style="margin:10px 0; max-height:180px; overflow-y:auto;">${itemsHtml}</div>
            <div style="border-top:2px solid #eee; padding-top:10px;">
                <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>${formatoGs(subtotalP)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Delivery:</span><span>${formatoGs(mDeli)}</span></div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; color:#ff6b00;"><span>TOTAL:</span><span>${formatoGs(subtotalP+mDeli)}</span></div>
            </div>
            <button onclick="document.getElementById('modal-detalle-pedido').remove()" style="width:100%; margin-top:15px; padding:10px; background:#333; color:white; border-radius:10px;">CERRAR</button>
        </div>`;
    document.body.appendChild(modal);
};

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
            data: { labels: ['Efectivo', 'Transferencia'], datasets: [{ data: [dataGlobal.efe, dataGlobal.tra], backgroundColor: ['#16a34a', '#0284c7'] }] },
            options: { maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{color:textColor}}} }
        });
    }
}