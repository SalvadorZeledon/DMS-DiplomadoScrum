export type PrioridadEntrega = "alta" | "media" | "baja";

export type EstadoEntrega =
  | "pendiente"
  | "en_ruta"
  | "entregado"
  | "cancelado";

export type RolUsuario = "coordinador" | "repartidor";

export interface ClienteEntrega {
  nombre: string;
  telefono: string;
  direccion: string;
}

export interface UsuarioResumen {
  id: string;
  nombre: string;
}

export interface Usuario {
  id: string;
  usuarioId: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
}

export interface Entrega {
  id: string;
  codigo: string;
  cliente: ClienteEntrega;
  descripcionPedido: string;
  prioridad: PrioridadEntrega;
  estado: EstadoEntrega;
  repartidor: UsuarioResumen;
  fechaEntrega: string;
  horaEstimada: string;
  observaciones: string;
  creadoPor: UsuarioResumen;
}

export interface NuevaEntregaInput {
  cliente: ClienteEntrega;
  descripcionPedido: string;
  prioridad: PrioridadEntrega;
  estado: EstadoEntrega;
  repartidor: UsuarioResumen;
  fechaEntrega: string;
  horaEstimada: string;
  observaciones: string;
}