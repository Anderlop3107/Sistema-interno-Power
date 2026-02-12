// 1. IMPORTACIONES
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, limitToLast, query, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 3. VARIABLES DE CONTROL Y SONIDO
let historialCargado = false;
const sonidoNotificacion = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
sonidoNotificacion.volume = 1.0;

const precios = {
    // Churrasquitos
    qty_power: 14000,
    qty_esp_pollo: 12000,
    qty_carne: 10000,
    qty_mixto: 9000,
    qty_pollo: 8000,
    qty_combo_churra: 20000, // <-- Precio solicitado: Gs 20.000
    // Lomitos Árabes (NUEVOS)
    qty_lomito_carne: 27000,
    qty_lomito_mixto: 27000,
    qty_lomito_triple: 33000,
    qty_lomito_especial_Power: 40000,
    qty_combo_power_nuevo: 37000,  // <-- Precio solicitado: Gs 37.000
    // Complementos
    qty_papita: 10000,
    qty_gas1l: 10000,
    qty_gas250: 4000,
    qty_salsa: 1000
};

window.mostrarGrupo = (grupoId) => {
    // 1. Ocultar todos los grupos
    document.querySelectorAll('.grupo-productos').forEach(g => g.style.display = 'none');
    
    // 2. Mostrar el seleccionado
    document.getElementById(`grupo-${grupoId}`).style.display = 'block';
    
    // 3. Cambiar estilo de botones
    // Primero le quitamos el naranja a todos
    document.querySelectorAll('.btn-cat').forEach(b => b.classList.add('active'));
    
    // Luego se lo ponemos SOLAMENTE al que tocamos
    event.currentTarget.classList.remove('active');
};
// 4. MEJORA: NOTIFICACIÓN UNIFICADA (BARRITA + CUADRO VERDE)
function mostrarNotificacionCompleta(nombreCliente) {
    // 1. SONIDO
    sonidoNotificacion.currentTime = 0;
    sonidoNotificacion.play().catch(e => console.log("Permiso de audio requerido"));

    // 2. CUADRO VERDE INTERNO (App abierta)
    const aviso = document.createElement('div');
    aviso.style = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background-color: #4CAF50; color: white; padding: 12px 25px;
        border-radius: 8px; font-weight: bold; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000; font-family: sans-serif; text-align: center;
        border: 2px solid white; animation: slideDown 0.5s ease-out; min-width: 280px;
    `;
    aviso.innerHTML = `🔔 El pedido de <b>${nombreCliente}</b> está listo`;
    document.body.appendChild(aviso);

    setTimeout(() => {
        aviso.style.animation = "slideUp 0.5s ease-in";
        setTimeout(() => aviso.remove(), 500);
    }, 5000);

    // 3. BARRITA DE SISTEMA (App en segundo plano / otra app)
    if (Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("✅ ¡PEDIDO LISTO!", {
                body: `El pedido de ${nombreCliente} ya está terminado.`,
                icon: "LogoBow.png",
                badge: "LogoBow.png",
                vibrate: [200, 100, 200],
                tag: 'pedido-listo',
                renotify: true
            });
        });
    }

    // 4. VIBRACIÓN
    if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
    }
}

// Estilos para las animaciones del cuadro verde
const styleAnim = document.createElement('style');
styleAnim.innerHTML = `
    @keyframes slideDown { from { top: -150px; opacity: 0; } to { top: 20px; opacity: 1; } }
    @keyframes slideUp { from { top: 20px; opacity: 1; } to { top: -150px; opacity: 0; } }
`;
document.head.appendChild(styleAnim);

// 5. ESCUCHA DE PEDIDOS LISTOS (Firebase)
const historialRef = query(ref(database, 'historial'), limitToLast(1));
onValue(historialRef, (snapshot) => {
    if (!historialCargado) {
        historialCargado = true; 
        return;
    }
    if (snapshot.exists()) {
        const datos = snapshot.val();
        const id = Object.keys(datos)[0];
        const nombreCliente = datos[id].cliente;
        mostrarNotificacionCompleta(nombreCliente);
    }
});

// 6. FUNCIONES GLOBALES DEL VENDEDOR
window.cambiarPaso = (paso) => {
    document.querySelectorAll('.paso').forEach(p => p.classList.remove('activo'));
    document.getElementById(`paso${paso}`).classList.add('activo');
};

window.gestionarDelivery = () => {
    const isDelivery = document.getElementById('tipo_delivery').checked;
    const seccionMonto = document.getElementById('seccion_monto_delivery');
    const inputMonto = document.getElementById('monto_delivery');
    
    if (seccionMonto) seccionMonto.style.display = isDelivery ? 'block' : 'none';
    if (!isDelivery && inputMonto) inputMonto.value = 0;
    calcular();
};

window.calcular = () => {
    let total = 0;
    for (let id in precios) {
        const input = document.getElementById(id);
        if (input) {
            const cant = parseInt(input.value) || 0;
            total += cant * precios[id];
        }
    }
    const delivInput = document.getElementById('monto_delivery');
    const deliv = delivInput ? (parseInt(delivInput.value) || 0) : 0;
    total += deliv;
    
    const totalPantalla = document.getElementById('total_pantalla');
    if (totalPantalla) totalPantalla.innerText = `Total: ${total.toLocaleString('es-PY')} Gs`;
    
    return total;
};

window.enviarAlCocinero = () => {
    const nombre = document.getElementById('nombre_cliente').value.trim();
    if (!nombre) { alert("Escriba el nombre del cliente"); return; }

    const obs = document.getElementById('observaciones').value.trim();

    const pedido = {
        cliente: nombre,
        productos: {},
        observaciones: obs,
        entrega: document.querySelector('input[name="entrega"]:checked').value,
        monto_delivery: parseInt(document.getElementById('monto_delivery').value) || 0,
        metodoPago: document.querySelector('input[name="pago"]:checked').value,
        totalNum: calcular(),
        totalStr: document.getElementById('total_pantalla').innerText,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fecha_final: new Date().toLocaleDateString('es-PY').replace(/\//g, '-')
    };

    for (let id in precios) {
        const input = document.getElementById(id);
        if (input) {
            const cant = parseInt(input.value) || 0;
            if (cant > 0) pedido.productos[id] = cant;
        }
    }

    if (Object.keys(pedido.productos).length === 0) {
        alert("Agregue al menos un producto");
        return;
    }

    const nuevoPedidoRef = push(ref(database, 'pedidos'));
    set(nuevoPedidoRef, pedido)
        .then(() => {
            alert("✅ ¡Pedido enviado a cocina!");
            location.reload();
        })
        .catch(err => alert("Error: " + err));
};

// 7. REGISTRO DE SERVICE WORKER Y PERMISOS
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker del Vendedor listo'))
            .catch(err => console.log('Error al registrar SW', err));
    });
}

if ('Notification' in window) {
    Notification.requestPermission();
}
