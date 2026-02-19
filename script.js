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
    C_Especial_Power: 14000,
    C_Especial_Pollo_Pepperoni: 12000,
    C_Carne: 10000, // Corregido: antes C_
    C_Mixto: 9000,
    C_Pollo: 8000,
    C_Combo_Power: 20000,
    
    // Lomitos
    Lomito_Carne: 27000,
    Lomito_Mixto: 27000,
    Lomito_3_Quesos: 33000, // Corregido para coincidir con id="Lomito_3_Quesos"
    Lomito_Especial_Power: 40000,
    Combo_Lomito_Power: 37000,
    
    // Otros
    qty_papita: 10000,
    qty_gas1l: 10000,
    qty_gas250: 4000,
    qty_salsa: 1000
};

// Lo que verá el cocinero en su pantalla
const nombresProductos = {
    C_Especial_Power: "C. Power",
    C_Especial_Pollo_Pepperoni: "C. Especial",
    C_Carne: "C. Carne", // Corregido
    C_Mixto: "C. Mixto",
    C_Pollo: "C. Pollo",
    C_Combo_Power: "C. Combo Power",
    
    Lomito_Carne: "Lomito Carne",
    Lomito_Mixto: "Lomito Mixto",
    Lomito_3_Quesos: "Lomito T. Queso", // Corregido
    Lomito_Especial_Power: "Lomito E. Power",
    Combo_Lomito_Power: "Lomito Combo Power",
    
    qty_papita: "PAPITAS",
    qty_gas1l: "GAS1L",
    qty_gas250: "GAS250",
    qty_salsa: "SALSA"
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

// ... (Tus importaciones y la lista nombresProductos corregida arriba)

window.enviarAlCocinero = () => {
    const nombreInput = document.getElementById('nombre_cliente');
    if (!nombreInput || !nombreInput.value.trim()) { 
        alert("Escriba el nombre del cliente"); 
        return; 
    }
    
    const montoTotalCalculado = calcular(); // Llama a tu función calcular

   const pedido = {
    cliente: nombreInput.value.trim(),
    productos: [], 
    productos_stats: {}, 
    observaciones: document.getElementById('observaciones')?.value.trim() || "",
    entrega: document.querySelector('input[name="entrega"]:checked')?.value || "Local",
    monto_delivery: parseInt(document.getElementById('monto_delivery')?.value) || 0,
    metodoPago: document.querySelector('input[name="pago"]:checked')?.value || "Efectivo",
    totalNum: montoTotalCalculado,
    totalStr: `${montoTotalCalculado.toLocaleString('es-PY')} Gs`,
    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    // AGREGA ESTAS DOS LÍNEAS PARA EL DASHBOARD:
    fecha: new Date().toLocaleDateString('es-PY').replace(/\//g, '-'), // Formato DD-MM-YYYY
    timestamp: Date.now() 
};

    // Aquí usamos la lista nombresProductos que ya está declarada arriba del todo
    for (let id in precios) {
        const input = document.getElementById(id);
        const cant = input ? parseInt(input.value) : 0;
        if (cant > 0) {
            pedido.productos.push({
                nombre: nombresProductos[id] || id,
                cantidad: cant
            });
            pedido.productos_stats[id] = cant;
        }
    }

    if (pedido.productos.length === 0) { 
        alert("Agregue al menos un producto"); 
        return; 
    }

    // Envío a Firebase
    const nuevoPedidoRef = push(ref(database, 'pedidos'));
    set(nuevoPedidoRef, pedido)
        .then(() => {
            alert("✅ ¡Pedido enviado!");
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
