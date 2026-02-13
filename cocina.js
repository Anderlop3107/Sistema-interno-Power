// 6. ESCUCHAR PEDIDOS (CON COINCIDENCIAS Y AVISO DE COLA)
onValue(ref(database, 'pedidos'), (snapshot) => {
    const pedidos = snapshot.val();
    pedidosLocales = pedidos || {};
    const contenedor = document.getElementById('lista-pedidos');
    
    if (!contenedor) return;
    contenedor.innerHTML = ""; 
    
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "1fr 1fr"; 
    contenedor.style.gap = "15px";
    contenedor.style.direction = "rtl"; 

    if (pedidos) {
        const ids = Object.keys(pedidos);
        
        if (!primeraCarga && ids.length > conteoAnterior) {
            if(sonidoNuevo) {
                sonidoNuevo.currentTime = 0;
                sonidoNuevo.play().catch(e => console.log("Error sonido:", e));
            }
            lanzarNotificacionExterna(pedidos[ids[ids.length - 1]].cliente);
        }
        conteoAnterior = ids.length;

        // Guardamos los productos del primer pedido para comparar
        let productosPrimerPedido = [];
        if (ids[0] && pedidos[ids[0]].productos) {
            productosPrimerPedido = Array.isArray(pedidos[ids[0]].productos) 
                ? pedidos[ids[0]].productos.map(p => p.nombre)
                : Object.keys(pedidos[ids[0]].productos);
        }

        ids.forEach((id, index) => {
            if (index > 1) return; // Solo dibujamos los 2 primeros

            const p = pedidos[id];
            let listaHTML = "<ul style='padding:0; list-style:none; margin: 10px 0;'>";
            
            if (Array.isArray(p.productos)) {
                p.productos.forEach(prod => {
                    // LÓGICA DE LA RAYITA (COINCIDENCIA)
                    const esIgual = index === 1 && productosPrimerPedido.includes(prod.nombre);
                    const estiloCoincidencia = esIgual ? 'background-color: #fff176; border-left: 10px solid #fbc02d; padding: 5px; font-weight: bold; border-radius: 5px;' : '';

                    listaHTML += `<li style="padding:4px 0; border-bottom:1px solid #eee; font-size: 1.1em; ${estiloCoincidencia}">
                        <span style="color:#ff8c00; font-weight:bold;">${prod.cantidad}</span> x ${prod.nombre}
                        ${esIgual ? ' <small>(¡IGUAL AL ACTUAL!)</small>' : ''}
                    </li>`;
                });
            }
            listaHTML += "</ul>";

            const tarjeta = document.createElement('div');
            tarjeta.style.direction = "ltr";
            tarjeta.className = `tarjeta-cocina ${index === 1 ? 'pedido-espera' : ''}`;
            
            tarjeta.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items: flex-start;">
                    <div>
                        <span style="color:#ff8c00; font-weight:bold; font-size: 1em; display: block;">
                            ${index === 0 ? '🔥 ACTUAL' : '⏳ EN COLA'}
                        </span>
                        <span style="font-size: 0.85em; color: #555; font-weight: 600;">
                            🕒 ${p.hora || ''} p.m.
                        </span>
                    </div>
                </div>

                <div style="margin: 12px 0;">
                    <p style="margin:0; font-size:1.1em;">👤 <b>${p.cliente}</b></p>
                    <p style="margin:0; font-size:1em; color: #444;">📍 <b>${p.entrega}</b></p>
                </div>

                <hr style="border:0; border-top:1px solid #eee; margin: 5px 0;">
                ${listaHTML}
                
                ${p.observaciones ? `<div style="background:#fff176; margin: 8px 0; padding: 6px; border-radius: 8px; border-left: 5px solid #ffd600; font-size: 0.85em; font-weight: bold;">📝 ${p.observaciones}</div>` : ""}
                
                <hr style="border:0; border-top:1px solid #eee; margin: 5px 0;">

                <div style="margin-top: auto; padding-top: 10px;">
                    <p style="margin:0; font-size:0.9em; color:#666;">💳 ${p.metodoPago}</p>
                    <p style="margin:0; font-size:1.2em; color:#ff8c00;">💰 <b>${p.totalStr || '0 Gs'}</b></p>
                    <button class="btn-listo-cocina" onclick="terminarPedido('${id}')" style="margin-top:10px;">LISTO ✅</button>
                </div>
            `;
            contenedor.appendChild(tarjeta);
        });

        // AVISO DE PEDIDOS EN COLA (Al final de todo)
        if (ids.length > 2) {
            const aviso = document.createElement('div');
            aviso.style = "grid-column: 1 / span 2; width: 100%; text-align: center; background: #fff3e0; color: #e65100; padding: 10px; border-radius: 10px; font-weight: bold; margin-top: 10px; border: 1px dashed #ff8c00;";
            aviso.innerHTML = `⚠️ HAY ${ids.length - 2} PEDIDO(S) MÁS EN COLA AGUARDANDO...`;
            contenedor.appendChild(aviso);
        }
    } else {
        contenedor.innerHTML = "<p style='text-align:center; grid-column:1/span 2; color:#aaa; margin-top:50px;'>✅ ¡Sin pedidos!</p>";
    }
    primeraCarga = false;
});
