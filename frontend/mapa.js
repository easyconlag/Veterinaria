// 1. Inicializar el mapa centrado en la zona con estilo moderno
const map = L.map("map").setView([4.73245, -74.26419], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// Base de datos detallada de Veterinarias Aliadas en la Red
const veterinariasRed = [
  {
    nombre: "Vet Madrid Centro",
    lat: 4.735,
    lng: -74.261,
    estado: "🟢 2 min espera",
    dir: "Calle 4 # 5-20",
  },
  {
    nombre: "Clínica Animalia Sur",
    lat: 4.728,
    lng: -74.267,
    estado: "🟢 Disponible",
    dir: "Carrera 2 Este # 10-45",
  },
  {
    nombre: "Hospital Veterinario TotalVet 24/7",
    lat: 4.7392,
    lng: -74.2585,
    estado: "⭐ Urgencias Activas",
    dir: "Av. Principal # 12-88",
  },
  {
    nombre: "Centro Médico VetExpress",
    lat: 4.7255,
    lng: -74.272,
    estado: "🟢 Disponible",
    dir: "Calle 8 # 14-30",
  },
  {
    nombre: "PetCare Cundinamarca",
    lat: 4.741,
    lng: -74.265,
    estado: "🟡 Alta Demanda",
    dir: "Carrera 7 # 19-12",
  },
];

// Crear iconos personalizados con neón para el mapa
const vetIcon = L.divIcon({
  html: '<div style="background: linear-gradient(135deg, #43cea2, #185a9d); width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(67,206,162,0.8); display:flex; align-items:center; justify-content:center; color:white; font-size:10px;"><i class="fa-solid fa-hospital"></i></div>',
  className: "custom-vet-icon",
});

// Renderizar dinámicamente los pines en el mapa
veterinariasRed.forEach((vet) => {
  L.marker([vet.lat, vet.lng], { icon: vetIcon })
    .addTo(map)
    .bindPopup(
      `<b>${vet.nombre}</b><br>📍 ${vet.dir}<br>Estado: <strong style="color:#43cea2;">${vet.estado}</strong>`,
    );
});
// 2. Obtener geolocalización real del usuario
navigator.geolocation.getCurrentPosition(
  (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Poner un pin azul en la ubicación del usuario
    L.marker([lat, lng])
      .addTo(map)
      .bindPopup("Tu ubicación actual")
      .openPopup();
    map.setView([lat, lng], 14); // Centrar el mapa ahí

    // Llenar el input del formulario con las coordenadas
    document.getElementById("origen").value =
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  },
  (error) => {
    alert(
      "No se pudo obtener tu ubicación. Verifica los permisos de tu navegador.",
    );
    document.getElementById("origen").value = "Ubicación manual requerida";
  },
);

// 3. Cargar transportadores desde la Base de Datos
async function cargarTransportadores() {
  try {
    const respuesta = await fetch("http://localhost:3000/transportadores");
    const transportadores = await respuesta.json();

    const select = document.getElementById("lista-transportadores");
    select.innerHTML = '<option value="">Selecciona un conductor</option>';

    transportadores.forEach((transp) => {
      select.innerHTML += `<option value="${transp.id_usuario}">${transp.nombre}</option>`;
    });
  } catch (error) {
    console.error("Error cargando transp  ortadores:", error);
  }
}
// Lógica para enviar el formulario de transporte
document
  .getElementById("form-viaje")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const id_cliente = localStorage.getItem("id_usuario_actual");
    const origen = document.getElementById("origen").value;
    const veterinaria_destino = document.getElementById("veterinaria").value;
    const id_transportador = document.getElementById(
      "lista-transportadores",
    ).value;
    const detalles_mascota = document.getElementById("detalles").value;

    if (!id_cliente) {
      alert(
        "Error: No se encontró la sesión del usuario. Inicia sesión nuevamente.",
      );
      window.location.href = "index.html";
      return;
    }

    try {
      const respuesta = await fetch("http://localhost:3000/solicitud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_cliente,
          id_transportador,
          origen,
          veterinaria_destino,
          detalles_mascota,
        }),
      });

      const data = await respuesta.json();
      alert(data.mensaje);

      if (respuesta.ok) {
        document.getElementById("form-viaje").reset();
        // Mantenemos las coordenadas actuales en el input de origen después de limpiar
      }
    } catch (error) {
      alert("Error al conectar con el servidor para solicitar el viaje.");
    }
  });
// Cargar historial de viajes recientes del cliente actual
async function cargarHistorialCliente() {
  const idCliente = localStorage.getItem("id_usuario_actual");
  const contenedorHistorial = document.getElementById("lista-historial");

  if (!idCliente) return;

  try {
    const respuesta = await fetch(
      `http://localhost:3000/transportador/${idCliente}/viajes`,
    ); // O una ruta específica de cliente si prefieres
    // Nota: para simplificar y mostrar dinamismo VIP, mostraremos un listado simulado de estatus en vivo o de la BD:
    contenedorHistorial.innerHTML = `
            <div class="historial-item"><span>Destino: Vet Madrid Centro</span> <strong style="color: #43cea2;">En Ruta 🚗</strong></div>
            <div class="historial-item"><span>Destino: Clínica Animalia</span> <strong style="color: #3b82f6;">Completado ✅</strong></div>
        `;
  } catch (e) {
    contenedorHistorial.innerHTML = `<p style="color: #94a3b8; font-size: 0.85rem;">Sin viajes previos registrados.</p>`;
  }
}
// Función para simular el rastreo GPS en tiempo real en el mapa
function simularRastreoGPS() {
  alert(
    "📡 Conectando con el satélite de telemetría... El vehículo se está desplazando hacia tu ubicación exacta.",
  );

  // Coordenadas simuladas de movimiento hacia el usuario
  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude + 0.002;
    const lng = position.coords.longitude + 0.002;

    // Agregar un marcador animado del transportador en ruta
    const transportadorIcon = L.divIcon({
      html: '<div style="background:#43cea2; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px #43cea2;"></div>',
      className: "custom-marker",
    });

    L.marker([lat, lng], { icon: transportadorIcon })
      .addTo(map)
      .bindPopup("<b>Conductor Carlos</b><br>En camino a recogerte")
      .openPopup();

    document.getElementById("tiempo-llegada").innerText = "1 Minuto (¡Cerca!)";
  });
}

// Biblioteca de Protocolos de Emergencia Médica en Ruta
function mostrarAlertaMedica(tipo) {
  const cajaTexto = document.getElementById("texto-medico");
  cajaTexto.style.display = "block";

  if (tipo === "intoxicacion") {
    cajaTexto.innerHTML =
      "🚨 <b>Intoxicación:</b> No induzcas el vómito a menos que un veterinario lo indique. Mantén a la mascota en un lugar ventilado y ten a la mano el empaque de lo que pudo ingerir.";
  } else if (tipo === "golpe") {
    cajaTexto.innerHTML =
      "⚠️ <b>Golpe / Trauma:</b> Evita movimientos bruscos en la columna de la mascota. Colócale una superficie rígida si es necesario y mantén sus vías respiratorias libres.";
  } else if (tipo === "respiracion") {
    cajaTexto.innerHTML =
      "💨 <b>Respiración agitada:</b> Estira suavemente su cuello para alinear la tráquea. Abre las ventanas del vehículo de transporte para maximizar el flujo de oxígeno.";
  }
}
// Generador simulado de Factura PDF profesional
function descargarFacturaPDF() {
  const nombreUsuario = "Juan Camilo Romero (Miembro VIP)";
  const fecha = new Date().toLocaleDateString();

  let contenidoVentana = `
        <html>
        <head><title>Factura Vet Logística VIP</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; color: #333;">
            <h1 style="color: #185a9d;">🐾 Vet Logística S.A.S.</h1>
            <p><b>NIT:</b> 900.888.777-1 | Facatativá, Cundinamarca</p>
            <hr style="border: 1px solid #ddd; margin: 20px 0;">
            <h3>COMPROBANTE DE MEMBRESÍA / TRAYECTO VIP</h3>
            <p><b>Cliente:</b> ${nombreUsuario}</p>
            <p><b>Fecha de Emisión:</b> ${fecha}</p>
            <p><b>Concepto:</b> Suscripción Mensual y Logística Animal Prioritaria</p>
            <h2 style="color: #43cea2;">Total Pagado: $29.900 COP (IVA Incluido)</h2>
            <p style="margin-top: 40px; font-size: 0.8rem; color: #777;">Documento generado electrónicamente de forma segura. ¡Gracias por confiar en nosotros!</p>
        </body>
        </html>
    `;

  let ventana = window.open("", "_blank");
  ventana.document.write(contenidoVentana);
  ventana.document.close();
  ventana.print(); // Abre el cuadro de diálogo para guardar como PDF o imprimir
}

// Lógica de Calificación post-viaje (Se activa al completar)
function abrirModalCalificacion(idSolicitud) {
  const estrellas = prompt(
    "El viaje ha finalizado. Califica al conductor del 1 al 5 estrellas:",
    "5",
  );
  const comentario = prompt(
    "Deja un comentario opcional sobre el servicio:",
    "Excelente atención con la mascota.",
  );

  if (estrellas) {
    fetch(`http://localhost:3000/viaje/${idSolicitud}/calificar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calificacion: Number(estrellas), comentario }),
    })
      .then((res) => res.json())
      .then((data) => alert(data.mensaje));
  }
}
// Ejecutar al cargar la vista
cargarHistorialCliente();
cargarTransportadores();
