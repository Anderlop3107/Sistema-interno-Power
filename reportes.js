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
    // Churrasquitos
    "ESPECIAL POWER": 14000,
    "POLLO PEPPERONI": 12000,
    "CARNE": 10000,
    "MIXTO": 9000,
    "POLLO": 8000,
    "CHURRASQUITO COMBO": 20000,
    
    // Lomitos
    "LOMITO CARNE": 27000,
    "LOMITO MIXTO": 27000,
    "3 QUESOS": 33000,
    "LOMITO ESPECIAL POWER": 40000,
    "COMBO LOMITO POWER": 37000,
    
    // Extras
    "PAPITA": 10000,
    "GAS1L": 10000,
    "GASEOSA DE 1L": 10000,
    "GAS250": 4000,
    "GASEOSA DE 250": 4000,
    "SALSA": 1000
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
    const nom = (nombreSucio || "").toUpperCase().trim();
    
    // 1. Intento de coincidencia exacta
    if (PRECIOS[nom]) return PRECIOS[nom];
    
    // 2. Búsqueda de palabras clave (Lógica inteligente)
    // Ordenamos las llaves de la más larga a la más corta para evitar falsos positivos
    const llaves = Object.keys(PRECIOS).sort((a, b) => b.length - a.length);
    
    for (let clave of llaves) {
        if (nom.includes(clave)) {
            return PRECIOS[clave];
        }
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
    const precioUnitario = obtenerPrecio(nom);
    calcProductos += (precioUnitario * cant);
    
    // Clasificación Robusta
    const esChurrasquito = nom.startsWith("C.") || nom.startsWith("C ") || nom.includes("CHURRASQUITO") || nom.includes("CHUR.");
    const esLomito = nom.includes("LOMITO");
    const esExtra = nom.includes("PAPA") || nom.includes("GAS") || nom.includes("SALSA") || nom.includes("GASEOSA") || nom.includes("PAPITA");

    if (esChurrasquito) {
        dataGlobal.productosChurras[nom] = (dataGlobal.productosChurras[nom] || 0) + cant;
    } 
    else if (esLomito) {
        dataGlobal.productosLomitos[nom] = (dataGlobal.productosLomitos[nom] || 0) + cant;
    }
    else {
        // Todo lo que no es carne va a extras (Papas, gaseosas, salsas)
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

  // --- Renderizado de Tablas de Productos Divididas ---
const tbChurras = document.querySelector('#tbody-prod-churras');
const tbLomitos = document.querySelector('#tbody-prod-lomitos');

if (tbChurras) {
    // Ordenar churrasquitos por mayor venta
    const churrasRank = Object.entries(dataGlobal.productosChurras).sort((a, b) => b[1] - a[1]);
    tbChurras.innerHTML = churrasRank.length > 0 
        ? churrasRank.map(p => `<tr><td>${p[0]}</td><td><b>${p[1]}</b></td></tr>`).join('')
        : '<tr><td colspan="2" style="text-align:center; color:#aaa;">Sin ventas</td></tr>';
}

if (tbLomitos) {
    // Ordenar lomitos por mayor venta
    const lomitosRank = Object.entries(dataGlobal.productosLomitos).sort((a, b) => b[1] - a[1]);
    tbLomitos.innerHTML = lomitosRank.length > 0 
        ? lomitosRank.map(p => `<tr><td>${p[0]}</td><td><b>${p[1]}</b></td></tr>`).join('')
        : '<tr><td colspan="2" style="text-align:center; color:#aaa;">Sin ventas</td></tr>';
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
// --- FUNCIÓN PARA RECALCULAR TOTAL EN VIVO ---
function recalcularTotalDesdeTexto() {
    const texto = document.getElementById('edit-productos').value;
    const lineas = texto.split("\n").filter(l => l.trim() !== "");
    let sumaProductos = 0;

    lineas.forEach(linea => {
        if (linea.includes(" x ")) {
            const partes = linea.split(" x ");
            const cantidad = parseInt(partes[0]) || 0;
            const nombre = partes[1] ? partes[1].trim() : "";
            sumaProductos += (cantidad * obtenerPrecio(nombre));
        }
    });

    // Mantenemos el monto de delivery si el pedido era delivery
    // Buscamos el pedido original en la data global para saber si tenía delivery
    const idFB = document.getElementById('edit-idFB').value;
    const pedidoOriginal = dataGlobal.pedidos.find(p => p.idFB === idFB);
    const montoDeli = pedidoOriginal ? limpiarMonto(pedidoOriginal.monto_delivery) : 0;

    document.getElementById('edit-total').value = sumaProductos + montoDeli;
}
// --- NUEVA FUNCIÓN DE EDICIÓN AVANZADA (MONTO MANUAL) ---
window.editarPedido = async (idFB) => {
    // 1. Buscar el pedido en nuestra data cargada
    const p = dataGlobal.pedidos.find(item => item.idFB === idFB);
    if (!p) return;

    // 2. Llenar el modal con los datos actuales
    document.getElementById('edit-idFB').value = idFB;
    document.getElementById('edit-cliente').value = p.cliente || "";
    document.getElementById('edit-entrega').value = p.entrega || "Local";
    document.getElementById('edit-pago').value = p.metodoPago || "Efectivo";
    document.getElementById('edit-total').value = p.totalCorregido;

    // Convertir la lista de productos a texto para el cuadro de edición
    let prodTexto = "";
    const listaAProcesar = p.productos || p.items || {};
    if (Array.isArray(listaAProcesar)) {
        prodTexto = listaAProcesar.map(pr => `${pr.cantidad} x ${pr.nombre}`).join("\n");
    } else {
        for (let k in listaAProcesar) {
            let nom = k.replace(/qty_/i, '').replace(/_/g, ' ');
            prodTexto += `${listaAProcesar[k]} x ${nom}\n`;
        }
    }
    document.getElementById('edit-productos').value = prodTexto.trim();

    // 3. Mostrar el modal
    document.getElementById('modalEdicion').style.display = 'flex';

    // 4. Lógica del botón Guardar
    const btnGuardar = document.getElementById('btnGuardarCambios');
    btnGuardar.onclick = async () => {
        const id = document.getElementById('edit-idFB').value;
        const textoProd = document.getElementById('edit-productos').value;
        
        // Tomamos el monto que tú escribiste manualmente
        const montoManual = parseInt(document.getElementById('edit-total').value) || 0;

        // Convertimos el texto a formato de lista para Firebase
        const nuevasLineas = textoProd.split("\n").filter(line => line.trim() !== "");
        const nuevosProductos = nuevasLineas.map(linea => {
            if (linea.includes(" x ")) {
                const partes = linea.split(" x ");
                return {
                    cantidad: parseInt(partes[0]) || 1,
                    nombre: partes[1] ? partes[1].trim() : "Producto"
                };
            } else {
                return { cantidad: 1, nombre: linea.trim() };
            }
        });

        const datosActualizados = {
            cliente: document.getElementById('edit-cliente').value,
            entrega: document.getElementById('edit-entrega').value,
            metodoPago: document.getElementById('edit-pago').value,
            totalNum: montoManual,
            productos: nuevosProductos
        };

        try {
            await update(ref(database, `historial/${id}`), datosActualizados);
            document.getElementById('modalEdicion').style.display = 'none';
            alert("✅ Pedido actualizado correctamente.");
            window.cargarDashboard(); 
        } catch (e) {
            console.error(e);
            alert("Error al guardar los cambios.");
        }
    };
}; // <--- Aquí estaba el error, faltaba cerrar la función principal

// FUNCIÓN 1: Actualiza los datos sin salir del Dashboard
window.recargarDatosActuales = () => {
    // Simplemente llamamos a cargarDashboard. 
    // Como los inputs fechaInicio y fechaFin ya tienen las fechas cargadas, 
    // traerá los nuevos pedidos de Firebase automáticamente.
    console.log("Refrescando datos...");
    window.cargarDashboard(); 
};

// FUNCIÓN 2: Botón Salir (Manda a elegir fechas)
window.irASeleccionFechas = () => {
    // Ocultamos el dashboard y mostramos la capa inicial
    document.getElementById('dashboard-final').style.display = 'none';
    document.getElementById('capa-inicial').style.display = 'flex';
    
    // Opcional: Limpiar los inputs si quieres empezar de cero
    // document.getElementById('fechaInicio').value = '';
    // document.getElementById('fechaFin').value = '';
};
