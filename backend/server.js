const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt"); // Librería para encriptar contraseñas

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "vet_logistica",
});

db.connect((err) => {
  if (err) throw err;
  console.log("¡Conectado exitosamente a la base de datos vet_logistica!");
});

// 1. Ruta para REGISTRAR usuario (Configurada con pagado = 0 para requerir membresía)
app.post("/registro", async (req, res) => {
  const { nombre, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const query =
      "INSERT INTO usuarios (nombre, email, password, id_rol, pagado) VALUES (?, ?, ?, 2, 0)";

    db.query(query, [nombre, email, hash], (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(400)
            .json({ mensaje: "Este correo ya está registrado." });
        }
        return res
          .status(500)
          .json({ mensaje: "Error al guardar en la base de datos." });
      }
      res.json({
        mensaje:
          "Registro inicial exitoso. Proceda a realizar el pago de activación.",
        id_usuario: result.insertId,
      });
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// 2. Ruta para INICIAR SESIÓN (Verifica credenciales y si cuenta con pago activo)
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const query = "SELECT * FROM usuarios WHERE email = ?";
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ mensaje: "Error en el servidor." });

    if (results.length === 0) {
      return res.status(401).json({ mensaje: "El correo no existe." });
    }

    const usuario = results[0];
    const coincide = await bcrypt.compare(password, usuario.password);

    if (!coincide) {
      return res.status(401).json({ mensaje: "Contraseña incorrecta." });
    }

    // Si es cliente (rol 2) y no ha pagado, bloquear acceso y retornar indicador de pago
    if (usuario.id_rol === 2 && usuario.pagado === 0) {
      return res.status(403).json({
        requiere_pago: true,
        id_usuario: usuario.id_usuario,
        mensaje: "Tu cuenta requiere el pago de activación para ingresar.",
      });
    }

    res.json({
      mensaje: "Login exitoso",
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        id_rol: usuario.id_rol,
        rol: usuario.id_rol,
      },
    });
  });
});

// 3. Ruta para procesar la pasarela de pagos, activar la cuenta y registrar ingreso contable
app.post("/pagar-suscripcion", (req, res) => {
  const { id_usuario, metodo_pago, monto } = req.body;

  const queryUsuario = "UPDATE usuarios SET pagado = 1 WHERE id_usuario = ?";
  db.query(queryUsuario, [id_usuario], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ mensaje: "Error al activar la cuenta." });
    }

    const queryContabilidad = `
      INSERT INTO contabilidad (tipo, categoria, monto, descripcion) 
      VALUES ('Ingreso', 'Suscripción Registro', ?, ?)
    `;
    db.query(
      queryContabilidad,
      [monto || 29900, `Pago de membresía inicial vía ${metodo_pago}`],
      (err2) => {
        if (err2)
          console.error("Error registrando ingreso contable automático:", err2);
      },
    );

    res.json({
      mensaje: "¡Pago aprobado con éxito! Cuenta activada correctamente.",
    });
  });
});

// 4. Ruta para obtener la lista de Transportadores (Rol 3)
app.get("/transportadores", (req, res) => {
  const query = "SELECT id_usuario, nombre FROM usuarios WHERE id_rol = 3";
  db.query(query, (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ mensaje: "Error al consultar transportadores." });
    res.json(results);
  });
});

// 5. Ruta para crear una solicitud de transporte
app.post("/solicitud", (req, res) => {
  const {
    id_cliente,
    id_transportador,
    origen,
    veterinaria_destino,
    detalles_mascota,
  } = req.body;

  const query = `
        INSERT INTO solicitudes_transporte 
        (id_cliente, id_transportador, origen, veterinaria_destino, detalles_mascota, estado) 
        VALUES (?, ?, ?, ?, ?, 'Pendiente')
    `;

  db.query(
    query,
    [
      id_cliente,
      id_transportador,
      origen,
      veterinaria_destino,
      detalles_mascota,
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .json({ mensaje: "Error al registrar la solicitud de transporte." });
      }
      res.json({
        mensaje:
          "¡Transporte solicitado con éxito! Un conductor ha sido asignado.",
      });
    },
  );
});

// 6. Ruta para que el transportador vea sus viajes pendientes
app.get("/transportador/:id/viajes", (req, res) => {
  const idTransportador = req.params.id;
  const query = `
        SELECT s.id_solicitud, s.origen, s.veterinaria_destino, s.detalles_mascota, s.estado, u.nombre AS cliente, u.telefono 
        FROM solicitudes_transporte s
        JOIN usuarios u ON s.id_cliente = u.id_usuario
        WHERE s.id_transportador = ? AND s.estado != 'Completado'
    `;
  db.query(query, [idTransportador], (err, results) => {
    if (err)
      return res.status(500).json({ mensaje: "Error al consultar viajes." });
    res.json(results);
  });
});

// 7. Ruta para marcar un viaje como completado
app.put("/viaje/:id/completar", (req, res) => {
  const idSolicitud = req.params.id;
  const query =
    "UPDATE solicitudes_transporte SET estado = 'Completado' WHERE id_solicitud = ?";
  db.query(query, [idSolicitud], (err, result) => {
    if (err)
      return res.status(500).json({ mensaje: "Error al actualizar el viaje." });
    res.json({ mensaje: "Viaje completado con éxito." });
  });
});

// 8. Panel Admin: Obtener todos los usuarios con su rol
app.get("/admin/usuarios", (req, res) => {
  const query = `
        SELECT u.id_usuario, u.nombre, u.email, u.id_rol, r.nombre_rol 
        FROM usuarios u 
        JOIN roles r ON u.id_rol = r.id_rol
    `;
  db.query(query, (err, results) => {
    if (err)
      return res.status(500).json({ mensaje: "Error al obtener usuarios." });
    res.json(results);
  });
});

// 9. Panel Admin: Crear usuario con rol específico
app.post("/admin/usuarios", async (req, res) => {
  const { nombre, email, password, id_rol } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const query =
      "INSERT INTO usuarios (nombre, email, password, id_rol, pagado) VALUES (?, ?, ?, ?, 1)";
    db.query(query, [nombre, email, hash, id_rol], (err) => {
      if (err)
        return res
          .status(400)
          .json({ mensaje: "El correo ya existe o hay un error." });
      res.json({ mensaje: "Usuario creado exitosamente." });
    });
  } catch (e) {
    res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

// 10. Panel Admin: Editar rol o nombre de un usuario
app.put("/admin/usuarios/:id", (req, res) => {
  const { nombre, id_rol } = req.body;
  const query =
    "UPDATE usuarios SET nombre = ?, id_rol = ? WHERE id_usuario = ?";
  db.query(query, [nombre, id_rol, req.params.id], (err) => {
    if (err)
      return res.status(500).json({ mensaje: "Error al actualizar usuario." });
    res.json({ mensaje: "Usuario actualizado correctamente." });
  });
});

// 11. Panel Admin: Eliminar un usuario
app.delete("/admin/usuarios/:id", (req, res) => {
  const query = "DELETE FROM usuarios WHERE id_usuario = ?";
  db.query(query, [req.params.id], (err) => {
    if (err)
      return res
        .status(500)
        .json({ mensaje: "No se puede eliminar (tiene viajes asociados)." });
    res.json({ mensaje: "Usuario eliminado correctamente." });
  });
});

// 12. MÓDULO CONTABLE ADMIN: Obtener resumen financiero (Ingresos, Gastos, Deudas, Rentabilidad)
app.get("/admin/contabilidad", (req, res) => {
  const queryTransacciones = "SELECT * FROM contabilidad ORDER BY fecha DESC";

  db.query(queryTransacciones, (err, transacciones) => {
    if (err)
      return res
        .status(500)
        .json({ mensaje: "Error al obtener datos contables." });

    let totalIngresos = 0;
    let totalGastos = 0;
    let totalDeudas = 0;

    transacciones.forEach((t) => {
      const monto = parseFloat(t.monto);
      if (t.tipo === "Ingreso") totalIngresos += monto;
      if (t.tipo === "Gasto") totalGastos += monto;
      if (t.tipo === "Deuda") totalDeudas += monto;
    });

    const rentabilidadNeta = totalIngresos - totalGastos;

    res.json({
      resumen: {
        ingresos: totalIngresos,
        gastos: totalGastos,
        deudas: totalDeudas,
        rentabilidad: rentabilidadNeta,
      },
      transacciones,
    });
  });
});

// 13. MÓDULO CONTABLE ADMIN: Registrar Gasto, Ingreso o Deuda manual
app.post("/admin/contabilidad", (req, res) => {
  const { tipo, categoria, monto, descripcion } = req.body;
  const query =
    "INSERT INTO contabilidad (tipo, categoria, monto, descripcion) VALUES (?, ?, ?, ?)";

  db.query(query, [tipo, categoria, monto, descripcion], (err) => {
    if (err)
      return res
        .status(500)
        .json({ mensaje: "Error al registrar movimiento contable." });
    res.json({
      mensaje: "Movimiento registrado exitosamente en el sistema contable.",
    });
  });
});

// 14. Ruta para recuperar o actualizar la contraseña
app.post("/recuperar-password", async (req, res) => {
  const { email, nuevaPassword } = req.body;

  try {
    const hash = await bcrypt.hash(nuevaPassword, 10);
    const query = "UPDATE usuarios SET password = ? WHERE email = ?";

    db.query(query, [hash, email], (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ mensaje: "Error en el servidor al actualizar contraseña." });
      if (result.affectedRows === 0)
        return res
          .status(404)
          .json({ mensaje: "El correo electrónico no está registrado." });

      res.json({
        mensaje: "¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.",
      });
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al cifrar la nueva contraseña." });
  }
});

// 15. Calificación de viajes
app.put("/viaje/:id/calificar", (req, res) => {
  const { id } = req.params;
  const { calificacion, comentario } = req.body;

  const query =
    "UPDATE solicitudes_transporte SET calificacion = ?, comentario = ? WHERE id_solicitud = ?";
  db.query(query, [calificacion, comentario, id], (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ mensaje: "Error al registrar la calificación." });
    res.json({
      mensaje: "¡Calificación enviada con éxito! Gracias por tu opinión.",
    });
  });
});

// 16. Chat en tiempo real (en memoria)
let chatsGlobales = {};

app.post("/chat/enviar", (req, res) => {
  const { id_solicitud, remitente, mensaje } = req.body;
  if (!chatsGlobales[id_solicitud]) {
    chatsGlobales[id_solicitud] = [];
  }

  chatsGlobales[id_solicitud].push({
    remitente,
    mensaje,
    hora: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  res.json({ mensaje: "Mensaje enviado con éxito" });
});

app.get("/chat/:id_solicitud", (req, res) => {
  const { id_solicitud } = req.params;
  res.json(chatsGlobales[id_solicitud] || []);
});

// 17. Ruta para que el cliente vea sus solicitudes y su ID de viaje
app.get("/cliente/:id/solicitudes", (req, res) => {
  const idCliente = req.params.id;
  const query = `
        SELECT id_solicitud, veterinaria_destino, estado 
        FROM solicitudes_transporte 
        WHERE id_cliente = ?
    `;
  db.query(query, [idCliente], (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ mensaje: "Error al consultar solicitudes del cliente." });
    }
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log(`Servidor corriendo en http://localhost:3000`);
});
