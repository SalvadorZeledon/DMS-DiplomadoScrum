import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

dotenv.config({ path: ".env" });

const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("Faltan variables en el archivo .env.local:");
  missingEnvVars.forEach((envVar) => console.error(`- ${envVar}`));
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const clientes = [
  {
    nombre: "Juan Pérez",
    telefono: "7777-7777",
    direccion: "Colonia Escalón, San Salvador",
  },
  {
    nombre: "Ana Martínez",
    telefono: "7666-1122",
    direccion: "Santa Tecla, La Libertad",
  },
  {
    nombre: "Roberto Gómez",
    telefono: "7555-8899",
    direccion: "San Salvador Centro",
  },
  {
    nombre: "Lucía Hernández",
    telefono: "7444-2211",
    direccion: "Antiguo Cuscatlán, La Libertad",
  },
  {
    nombre: "Mario López",
    telefono: "7333-4455",
    direccion: "Soyapango, San Salvador",
  },
  {
    nombre: "Carla Ramírez",
    telefono: "7222-9988",
    direccion: "Mejicanos, San Salvador",
  },
  {
    nombre: "Daniel Torres",
    telefono: "7111-3344",
    direccion: "San Marcos, San Salvador",
  },
  {
    nombre: "Fernanda Castillo",
    telefono: "7000-5566",
    direccion: "Ciudad Merliot, La Libertad",
  },
];

const repartidores = [
  {
    id: "rep-001",
    nombre: "Carlos Ramírez",
  },
  {
    id: "rep-002",
    nombre: "María López",
  },
];

const descripciones = [
  "Pedido de productos varios",
  "Entrega de documentos",
  "Paquete pequeño",
  "Pedido estándar",
  "Entrega prioritaria",
  "Pedido comercial",
  "Entrega de repuestos",
  "Paquete de oficina",
];

const prioridades = ["alta", "media", "baja"];
const estados = ["pendiente", "en_ruta", "entregado", "cancelado"];

function padNumber(number, size) {
  return String(number).padStart(size, "0");
}

function getRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getRandomDate(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1, 2);
  const day = padNumber(date.getDate(), 2);
  return `${year}-${month}-${day}`;
}

function getRandomTime() {
  const hours = padNumber(8 + Math.floor(Math.random() * 10), 2);
  const minutesOptions = ["00", "15", "30", "45"];
  const minutes = getRandomItem(minutesOptions);
  return `${hours}:${minutes}`;
}

function getEstadoPorFecha(fechaEntrega) {
  const today = new Date("2026-05-21");
  const deliveryDate = new Date(`${fechaEntrega}T00:00:00`);

  if (deliveryDate < today) {
    const historicalStatuses = ["entregado", "entregado", "entregado", "cancelado"];
    return getRandomItem(historicalStatuses);
  }

  if (deliveryDate.toISOString().slice(0, 10) === "2026-05-21") {
    const todayStatuses = ["pendiente", "pendiente", "en_ruta", "entregado"];
    return getRandomItem(todayStatuses);
  }

  const futureStatuses = ["pendiente", "pendiente", "pendiente", "en_ruta"];
  return getRandomItem(futureStatuses);
}

function getPrioridad() {
  const weightedPriorities = ["alta", "media", "media", "baja", "baja"];
  return getRandomItem(weightedPriorities);
}

async function crearUsuariosBase() {
  await setDoc(doc(db, "usuarios", "coord-001"), {
    usuarioId: "coord-001",
    nombre: "Coordinador DMS",
    correo: "coordinador@dms.com",
    rol: "coordinador",
    activo: true,
    creadoEn: serverTimestamp(),
  });

  await setDoc(doc(db, "usuarios", "rep-001"), {
    usuarioId: "rep-001",
    nombre: "Carlos Ramírez",
    correo: "carlos@dms.com",
    rol: "repartidor",
    activo: true,
    creadoEn: serverTimestamp(),
  });

  await setDoc(doc(db, "usuarios", "rep-002"), {
    usuarioId: "rep-002",
    nombre: "María López",
    correo: "maria@dms.com",
    rol: "repartidor",
    activo: true,
    creadoEn: serverTimestamp(),
  });
}

async function crearEntregasMasivas() {
  const fechaInicio = new Date("2026-01-01T00:00:00");
  const fechaFin = new Date("2026-06-30T23:59:59");

  const totalEntregas = 180;

  for (let i = 1; i <= totalEntregas; i++) {
    const codigo = `ENT-2026-${padNumber(i, 4)}`;
    const fechaRandom = getRandomDate(fechaInicio, fechaFin);
    const fechaEntrega = formatDate(fechaRandom);

    const cliente = getRandomItem(clientes);
    const repartidor = getRandomItem(repartidores);
    const prioridad = getPrioridad();
    const estado = getEstadoPorFecha(fechaEntrega);

    const entrega = {
      codigo,

      cliente: {
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
      },

      descripcionPedido: getRandomItem(descripciones),
      prioridad,
      estado,

      repartidor: {
        id: repartidor.id,
        nombre: repartidor.nombre,
      },

      fechaEntrega,
      horaEstimada: getRandomTime(),

      observaciones:
        prioridad === "alta"
          ? "Entrega prioritaria"
          : estado === "cancelado"
            ? "Entrega cancelada por coordinación"
            : "Sin observaciones",

      creadoPor: {
        id: "coord-001",
        nombre: "Coordinador DMS",
      },

      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    };

    await setDoc(doc(db, "entregas", codigo), entrega);

    console.log(`Entrega creada: ${codigo}`);
  }
}

async function main() {
  console.log("Iniciando carga masiva de entregas...");

  await crearUsuariosBase();
  await crearEntregasMasivas();

  console.log("Carga masiva finalizada correctamente.");
  console.log("Se crearon/actualizaron 180 entregas entre enero y junio de 2026.");
}

main().catch((error) => {
  console.error("Error durante la carga masiva:");
  console.error(error);
  process.exit(1);
});