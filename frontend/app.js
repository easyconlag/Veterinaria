// Función para alternar entre formularios
function toggleForms() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm.classList.contains("hidden")) {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  } else {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
  }
}

// --- CONEXIÓN AL BACKEND ---

// Lógica de Registro
document
  .getElementById("form-register")
  .addEventListener("submit", async function (e) {
    e.preventDefault(); // Evita que la página se recargue

    const nombre = document.getElementById("reg-nombre").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    try {
      const respuesta = await fetch("http://localhost:3000/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password }),
      });

      const data = await respuesta.json();
      alert(data.mensaje); // Muestra el mensaje del servidor en un popup

      if (respuesta.ok) {
        // Guardamos el ID del usuario en el navegador temporalmente
        localStorage.setItem("id_usuario_actual", data.usuario.id_usuario);

        // Redirigir según el rol (2 = Premium, 3 = Transportador, 1 = Admin)
        if (data.usuario.rol === 2) {
          window.location.href = "mapa.html";
        } else {
          alert("Pronto construiremos la vista para tu rol.");
        }
      }
    } catch (error) {
      alert(
        "Error conectando con el servidor. Revisa que Node.js esté corriendo.",
      );
    }
  });

// Lógica de Login
document
  .getElementById("form-login")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const respuesta = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await respuesta.json();

      if (respuesta.ok) {
        localStorage.setItem("id_usuario_actual", data.usuario.id_usuario);
        const rol = Number(data.usuario.rol);

        if (rol === 1) {
          window.location.href = "admin.html"; // Panel de Admin
        } else if (rol === 2) {
          window.location.href = "mapa.html"; // Vista de Cliente
        } else if (rol === 3) {
          window.location.href = "transportador.html"; // Vista de Transportador
        }
      } else {
        alert(data.mensaje);
      }
    } catch (error) {
      alert("Error conectando con el servidor.");
    }
  });
let metodoSeleccionado = "tarjeta";

function abrirPasarelaDePagos() {
  const nombre = document.getElementById("reg-nombre").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  if (!nombre || !email || !password) {
    alert("Por favor completa todos los campos antes de continuar al pago.");
    return;
  }

  // Mostrar el modal de pasarela
  document.getElementById("modal-pago").style.display = "flex";
}

function cerrarPasarela() {
  document.getElementById("modal-pago").style.display = "none";
}

function seleccionarMetodo(metodo) {
  metodoSeleccionado = metodo;
  document.getElementById("btn-tarj").style.background =
    metodo === "tarjeta" ? "#43cea2" : "rgba(255,255,255,0.08)";
  document.getElementById("btn-tarj").style.color =
    metodo === "tarjeta" ? "#030712" : "white";

  document.getElementById("btn-pse").style.background =
    metodo === "pse" ? "#43cea2" : "rgba(255,255,255,0.08)";
  document.getElementById("btn-pse").style.color =
    metodo === "pse" ? "#030712" : "white";

  document.getElementById("btn-neq").style.background =
    metodo === "nequi" ? "#43cea2" : "rgba(255,255,255,0.08)";
  document.getElementById("btn-neq").style.color =
    metodo === "nequi" ? "#030712" : "white";

  const contenedorCampos = document.getElementById("campos-pago");
  if (metodo === "tarjeta") {
    contenedorCampos.innerHTML = `<div class="input-group"><label>Número de Tarjeta</label><input type="text" value="4532 8888 9999 1234"></div>`;
  } else if (metodo === "pse") {
    contenedorCampos.innerHTML = `<div class="input-group"><label>Selecciona tu Banco</label><select style="width:100%; padding:12px; background:#030712; color:white; border-radius:10px; border:1px solid rgba(255,255,255,0.15);"><option>Bancolombia</option><option>Banco de Bogotá</option><option>NEQUI / DAVIPLATA</option></select></div>`;
  } else {
    contenedorCampos.innerHTML = `<div class="input-group"><label>Número Celular Nequi</label><input type="text" placeholder="300 123 4567" value="300 987 6543"></div>`;
  }
}

async function procesarPagoYRegistrar() {
  const nombre = document.getElementById("reg-nombre").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  // Simulación de procesamiento bancario con animación visual corta
  const botonOriginal = event.target;
  botonOriginal.innerText = "Procesando pago seguro...";
  botonOriginal.disabled = true;

  setTimeout(async () => {
    try {
      const respuesta = await fetch("http://localhost:3000/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password }),
      });

      const data = await respuesta.json();
      alert("¡Pago aprobado con éxito! " + data.mensaje);

      if (respuesta.ok) {
        cerrarPasarela();
        document.getElementById("form-register").reset();
        toggleForms(); // Cambiar automáticamente al Login
      }
    } catch (error) {
      alert("Error conectando con el servidor de pagos.");
    } finally {
      botonOriginal.innerText = "Pagar y Crear Cuenta";
      botonOriginal.disabled = false;
    }
  }, 1500);
}
const express = require("express");
const app = express();

// Esto le dice a Express que exponga tus archivos HTML, CSS y JS
app.use(express.static(__dirname));
