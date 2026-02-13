// 6. ESCUCHAR PEDIDOS (DISEÑO ORIGINAL DE 2 COLUMNAS)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    contenedor.innerHTML = ""; 
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "1fr 1fr"; // Fuerza las dos columnas
    contenedor.style.gap = "15px";
    contenedor.style.direction = "rtl"; 

    if (pedidos) {
        const ids = Object.keys(pedidos);
        
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
            if (index > 1) return; // Solo muestra los 2 primeros al costado

            const p = pedidos[id];
            
            let listaHTML = "<ul style='padding:0; list-style:none;'>";
            if (Array.isArray(p.productos)) {
                p.productos.forEach(prod => {
                    listaHTML += `<li style="padding:5px; border-bottom:1px solid #eee;">
                        <span style="color:#ff8c00; font-weight:bold;">${prod.cantidad}</span> x ${prod.nombre}
                    </li>`;
                });
            } else {
                for (let key in p.productos) {
                    if (p.productos[key] > 0) {
                        const nombreOld = key.replace("qty_", "").toUpperCase();
                        listaHTML += `<li><span style="color:#ff8c00;">${p.productos[key]}</span> x ${nombreOld}</li>`;
                    }
                }
            }
            listaHTML += "</ul>"; // Error de cierre corregido aquí

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr";
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            
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
