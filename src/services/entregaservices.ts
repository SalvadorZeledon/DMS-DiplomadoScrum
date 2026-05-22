import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type {
  Entrega,
  EstadoEntrega,
  NuevaEntregaInput,
  Usuario,
} from "../types/entrega";

const ENTREGAS_COLLECTION = "entregas";
const USUARIOS_COLLECTION = "usuarios";

function ordenarEntregas(entregas: Entrega[]): Entrega[] {
  return entregas.sort((a, b) => {
    const fechaA = `${a.fechaEntrega} ${a.horaEstimada}`;
    const fechaB = `${b.fechaEntrega} ${b.horaEstimada}`;

    return fechaB.localeCompare(fechaA);
  });
}

function padNumber(number: number, size: number): string {
  return String(number).padStart(size, "0");
}

async function generarCodigoEntrega(fechaEntrega: string): Promise<string> {
  const year = fechaEntrega.slice(0, 4) || String(new Date().getFullYear());
  const snapshot = await getDocs(collection(db, ENTREGAS_COLLECTION));

  let mayorCorrelativo = 0;
  const regex = new RegExp(`^ENT-${year}-(\\d{4})$`);

  snapshot.docs.forEach((documento) => {
    const match = documento.id.match(regex);

    if (match) {
      const correlativo = Number(match[1]);

      if (!Number.isNaN(correlativo) && correlativo > mayorCorrelativo) {
        mayorCorrelativo = correlativo;
      }
    }
  });

  const siguienteCorrelativo = mayorCorrelativo + 1;

  return `ENT-${year}-${padNumber(siguienteCorrelativo, 4)}`;
}

export async function obtenerEntregas(): Promise<Entrega[]> {
  const entregasRef = collection(db, ENTREGAS_COLLECTION);
  const snapshot = await getDocs(entregasRef);

  const entregas = snapshot.docs.map((documento) => {
    const data = documento.data();

    return {
      id: documento.id,
      codigo: data.codigo ?? documento.id,
      cliente: {
        nombre: data.cliente?.nombre ?? "",
        telefono: data.cliente?.telefono ?? "",
        direccion: data.cliente?.direccion ?? "",
      },
      descripcionPedido: data.descripcionPedido ?? "",
      prioridad: data.prioridad ?? "media",
      estado: data.estado ?? "pendiente",
      repartidor: {
        id: data.repartidor?.id ?? "",
        nombre: data.repartidor?.nombre ?? "Sin asignar",
      },
      fechaEntrega: data.fechaEntrega ?? "",
      horaEstimada: data.horaEstimada ?? "",
      observaciones: data.observaciones ?? "",
      creadoPor: {
        id: data.creadoPor?.id ?? "",
        nombre: data.creadoPor?.nombre ?? "",
      },
    } as Entrega;
  });

  return ordenarEntregas(entregas);
}

export async function obtenerRepartidores(): Promise<Usuario[]> {
  const usuariosRef = collection(db, USUARIOS_COLLECTION);
  const snapshot = await getDocs(usuariosRef);

  return snapshot.docs
    .map((documento) => {
      const data = documento.data();

      return {
        id: documento.id,
        usuarioId: data.usuarioId ?? documento.id,
        nombre: data.nombre ?? "",
        correo: data.correo ?? "",
        rol: data.rol ?? "repartidor",
        activo: Boolean(data.activo),
      } as Usuario;
    })
    .filter((usuario) => usuario.rol === "repartidor" && usuario.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function actualizarEstadoEntrega(
  entregaId: string,
  nuevoEstado: EstadoEntrega
): Promise<void> {
  const entregaRef = doc(db, ENTREGAS_COLLECTION, entregaId);

  await updateDoc(entregaRef, {
    estado: nuevoEstado,
    actualizadoEn: serverTimestamp(),
  });
}

export async function crearEntrega(
  nuevaEntrega: NuevaEntregaInput
): Promise<Entrega> {
  const codigo = await generarCodigoEntrega(nuevaEntrega.fechaEntrega);
  const entregaRef = doc(db, ENTREGAS_COLLECTION, codigo);

  const entregaFirestore = {
    codigo,
    cliente: {
      nombre: nuevaEntrega.cliente.nombre,
      telefono: nuevaEntrega.cliente.telefono,
      direccion: nuevaEntrega.cliente.direccion,
    },
    descripcionPedido: nuevaEntrega.descripcionPedido,
    prioridad: nuevaEntrega.prioridad,
    estado: nuevaEntrega.estado,
    repartidor: {
      id: nuevaEntrega.repartidor.id,
      nombre: nuevaEntrega.repartidor.nombre,
    },
    fechaEntrega: nuevaEntrega.fechaEntrega,
    horaEstimada: nuevaEntrega.horaEstimada,
    observaciones: nuevaEntrega.observaciones || "Sin observaciones",
    creadoPor: {
      id: "coord-001",
      nombre: "Coordinador DMS",
    },
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  };

  await setDoc(entregaRef, entregaFirestore);

  return {
    id: codigo,
    ...entregaFirestore,
  };
}