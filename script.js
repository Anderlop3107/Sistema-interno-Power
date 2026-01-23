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
// Sonido de notificación externo (Mixkit)
const sonidoNotificacion = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

const precios = {
    qty_power: 12000,
    qty_esp_pollo: 10000,
    qty_carne: 8000,
    qty_mixto: 7000,
    qty_pollo: 5000,
    qty_lomito: 25000,
    qty_combo: 18000,
    qty_papita: 10000,
    qty_gas1l: 10000,
    qty_gas250: 4000,
    qty_salsa: 1000
};

function mostrarNotificacion(nombreCliente) {
    // A. Efecto Visual (Más pequeño y rectangular)
    const aviso = document.createElement('div');
    aviso.style = `
        position: fixed; 
        top: 20px; 
        left: 50%; 
        transform: translateX(-50%);
        background-color: #ff8c00; 
        color: white; 
        padding: 12px 25px;
        border-radius: 8px; 
        font-weight: bold; 
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000; 
        font-family: sans-serif; 
        font-size: 1rem; 
        text-align: center;
        border: 2px solid white; 
        animation: slideDown 0.5s ease-out;
        min-width: 280px;
    `;
    // Texto solicitado
    aviso.innerHTML = `🔔 El pedido de <b>${nombreCliente}</b> está listo`;
    document.body.appendChild(aviso);

    // B. Ejecutar Sonido
    sonidoNotificacion.play().catch(e => console.log("Permiso de audio requerido"));

    // C. Ejecutar Vibración
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]); 
    }

    // D. Auto-eliminar aviso
    setTimeout(() => {
        aviso.style.animation = "slideUp 0.5s ease-in";
        setTimeout(() => aviso.remove(), 500);
    }, 5000); // Se queda 5 segundos en pantalla
}
// Estilos para las animaciones de la notificación
const styleAnim = document.createElement('style');
styleAnim.innerHTML = `
    @keyframes slideDown { from { top: -150px; opacity: 0; } to { top: 20px; opacity: 1; } }
    @keyframes slideUp { from { top: 20px; opacity: 1; } to { top: -150px; opacity: 0; } }
`;
document.head.appendChild(styleAnim);

// 5. ESCUCHA DE PEDIDOS LISTOS (Firebase)
// Escuchamos la rama 'historial' que es donde la cocina envía el pedido al terminar
const historialRef = query(ref(database, 'historial'), limitToLast(1));
onValue(historialRef, (snapshot) => {
    if (!historialCargado) {
        historialCargado = true; // Evita que suene todo lo viejo al abrir la app
        return;
    }
    if (snapshot.exists()) {
        const datos = snapshot.val();
        const id = Object.keys(datos)[0];
        const nombreCliente = datos[id].cliente;
        mostrarNotificacion(nombreCliente);
    }
});

// 6. FUNCIONES GLOBALES
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
