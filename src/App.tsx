import { type FormEvent, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import dmsLogo from "./assets/logo-dms.png";
import "./App.css";
import {
  actualizarEstadoEntrega,
  crearEntrega,
  obtenerEntregas,
  obtenerRepartidores,
} from "./services/entregaservices";
import type {
  Entrega,
  EstadoEntrega,
  NuevaEntregaInput,
  PrioridadEntrega,
  Usuario,
} from "./types/entrega";

type FiltroEstado = "todos" | EstadoEntrega;
type FiltroPrioridad = "todas" | PrioridadEntrega;

type NuevoPedidoForm = {
  clienteNombre: string;
  clienteTelefono: string;
  clienteDireccion: string;
  descripcionPedido: string;
  prioridad: PrioridadEntrega;
  repartidorId: string;
  fechaEntrega: string;
  horaEstimada: string;
  observaciones: string;
};

const estadoLabels: Record<EstadoEntrega, string> = {
  pendiente: "Pendiente",
  en_ruta: "En ruta",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const prioridadLabels: Record<PrioridadEntrega, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

function obtenerFechaActualInput(): string {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function crearFormularioNuevoPedido(repartidorId = ""): NuevoPedidoForm {
  return {
    clienteNombre: "",
    clienteTelefono: "",
    clienteDireccion: "",
    descripcionPedido: "",
    prioridad: "media",
    repartidorId,
    fechaEntrega: obtenerFechaActualInput(),
    horaEstimada: "09:00",
    observaciones: "",
  };
}

function ordenarEntregas(entregas: Entrega[]): Entrega[] {
  return [...entregas].sort((a, b) => {
    const fechaA = `${a.fechaEntrega} ${a.horaEstimada}`;
    const fechaB = `${b.fechaEntrega} ${b.horaEstimada}`;

    return fechaB.localeCompare(fechaA);
  });
}

function normalizarTexto(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function esNombreValido(v: string) {
  const s = v.trim();
  return s.length > 0 && s.length <= 25 && /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(s);
}

function esTelefonoValido(v: string) {
  return /^\d{4}-\d{4}$/.test(v);
}

function esDireccionValida(v: string) {
  const s = v.trim();
  return s.length > 0 && s.length <= 120;
}

function esDescripcionValida(v: string) {
  const s = v.trim();
  return s.length > 0 && s.length <= 120;
}

function formatearTelefono(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
}

function App() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [repartidores, setRepartidores] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [filtroPrioridad, setFiltroPrioridad] =
    useState<FiltroPrioridad>("todas");

  const [paginaActual, setPaginaActual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);

  const [modalEstadoAbierto, setModalEstadoAbierto] = useState(false);
  const [entregaSeleccionada, setEntregaSeleccionada] =
    useState<Entrega | null>(null);
  const [estadoTemporal, setEstadoTemporal] =
    useState<EstadoEntrega>("pendiente");
  const [guardandoEstado, setGuardandoEstado] = useState(false);

  const [modalNuevoPedidoAbierto, setModalNuevoPedidoAbierto] = useState(false);
  const [nuevoPedidoForm, setNuevoPedidoForm] = useState<NuevoPedidoForm>(() =>
    crearFormularioNuevoPedido()
  );
  const [guardandoNuevaEntrega, setGuardandoNuevaEntrega] = useState(false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  useEffect(() => {
    async function cargarDatosIniciales() {
      try {
        setCargando(true);
        setError("");

        const [entregasData, repartidoresData] = await Promise.all([
          obtenerEntregas(),
          obtenerRepartidores(),
        ]);

        setEntregas(entregasData);
        setRepartidores(repartidoresData);
      } catch (error) {
        console.error(error);
        setError("No se pudieron cargar las entregas desde Firebase.");
      } finally {
        setCargando(false);
      }
    }

    cargarDatosIniciales();
  }, []);

  const entregasFiltradas = useMemo(() => {
    const busquedaNormalizada = normalizarTexto(terminoBusqueda);

    return entregas.filter((entrega) => {
      const coincideEstado =
        filtroEstado === "todos" || entrega.estado === filtroEstado;

      const coincidePrioridad =
        filtroPrioridad === "todas" || entrega.prioridad === filtroPrioridad;

      const nombreClienteNormalizado = normalizarTexto(entrega.cliente.nombre);
      const direccionNormalizada = normalizarTexto(entrega.cliente.direccion);

      const coincideBusqueda =
        !busquedaNormalizada ||
        nombreClienteNormalizado.includes(busquedaNormalizada) ||
        direccionNormalizada.includes(busquedaNormalizada);

      return coincideEstado && coincidePrioridad && coincideBusqueda;
    });
  }, [entregas, filtroEstado, filtroPrioridad, terminoBusqueda]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(entregasFiltradas.length / registrosPorPagina));
  }, [entregasFiltradas.length, registrosPorPagina]);

  const entregasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;

    return entregasFiltradas.slice(inicio, fin);
  }, [entregasFiltradas, paginaActual, registrosPorPagina]);

  useEffect(() => {
    setPaginaActual(1);
  }, [terminoBusqueda, filtroEstado, filtroPrioridad, registrosPorPagina]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const metricas = useMemo(() => {
    return {
      total: entregas.length,
      pendientes: entregas.filter((entrega) => entrega.estado === "pendiente")
        .length,
      enRuta: entregas.filter((entrega) => entrega.estado === "en_ruta").length,
      prioritarias: entregas.filter((entrega) => entrega.prioridad === "alta")
        .length,
    };
  }, [entregas]);

  const registroInicial =
    entregasFiltradas.length === 0
      ? 0
      : (paginaActual - 1) * registrosPorPagina + 1;

  const registroFinal = Math.min(
    paginaActual * registrosPorPagina,
    entregasFiltradas.length
  );

  function irPaginaAnterior() {
    setPaginaActual((pagina) => Math.max(1, pagina - 1));
  }

  function irPaginaSiguiente() {
    setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1));
  }

  function limpiarBusqueda() {
    setTerminoBusqueda("");
  }

  function abrirModalCambioEstado(entrega: Entrega) {
    setEntregaSeleccionada(entrega);
    setEstadoTemporal(entrega.estado);
    setModalEstadoAbierto(true);
  }

  function cerrarModalCambioEstado() {
    if (guardandoEstado) return;

    setModalEstadoAbierto(false);
    setEntregaSeleccionada(null);
    setEstadoTemporal("pendiente");
  }

  function abrirModalNuevaEntrega() {
    if (repartidores.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Sin repartidores",
        text: "No hay repartidores activos disponibles para asignar la entrega.",
        confirmButtonText: "Aceptar",
      });

      return;
    }

    setNuevoPedidoForm(crearFormularioNuevoPedido(repartidores[0].id));
    setModalNuevoPedidoAbierto(true);
  }

  function cerrarModalNuevaEntrega() {
    if (guardandoNuevaEntrega) return;

    setModalNuevoPedidoAbierto(false);
    setNuevoPedidoForm(crearFormularioNuevoPedido(repartidores[0]?.id ?? ""));
    setIntentoGuardar(false);
  }

  function actualizarCampoNuevoPedido<K extends keyof NuevoPedidoForm>(
    campo: K,
    valor: NuevoPedidoForm[K]
  ) {
    setNuevoPedidoForm((formActual) => ({
      ...formActual,
      [campo]: valor,
    }));
  }

  async function confirmarCambioEstado() {
    if (!entregaSeleccionada) return;

    if (entregaSeleccionada.estado === estadoTemporal) {
      await Swal.fire({
        icon: "info",
        title: "Sin cambios",
        text: "La entrega ya tiene seleccionado ese estado.",
        confirmButtonText: "Entendido",
      });

      return;
    }

    try {
      setGuardandoEstado(true);
      setError("");

      await actualizarEstadoEntrega(entregaSeleccionada.id, estadoTemporal);

      setEntregas((entregasActuales) =>
        entregasActuales.map((entrega) =>
          entrega.id === entregaSeleccionada.id
            ? {
                ...entrega,
                estado: estadoTemporal,
              }
            : entrega
        )
      );

      setModalEstadoAbierto(false);

      await Swal.fire({
        icon: "success",
        title: "Estado actualizado",
        text: `La entrega ${
          entregaSeleccionada.codigo
        } cambió a "${estadoLabels[estadoTemporal]}".`,
        confirmButtonText: "Aceptar",
      });

      setEntregaSeleccionada(null);
      setEstadoTemporal("pendiente");
    } catch (error) {
      console.error(error);

      await Swal.fire({
        icon: "error",
        title: "Error al actualizar",
        text: "No se pudo actualizar el estado de la entrega.",
        confirmButtonText: "Aceptar",
      });
    } finally {
      setGuardandoEstado(false);
    }
  }

  async function guardarNuevaEntrega(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIntentoGuardar(true);

    const clienteNombre = nuevoPedidoForm.clienteNombre.trim();
    const clienteTelefono = nuevoPedidoForm.clienteTelefono.trim();
    const clienteDireccion = nuevoPedidoForm.clienteDireccion.trim();
    const descripcionPedido = nuevoPedidoForm.descripcionPedido.trim();
    const observaciones = nuevoPedidoForm.observaciones.trim();

    if (
      !esNombreValido(nuevoPedidoForm.clienteNombre) ||
      !esTelefonoValido(clienteTelefono) ||
      !esDireccionValida(nuevoPedidoForm.clienteDireccion) ||
      !esDescripcionValida(nuevoPedidoForm.descripcionPedido)
    ) {
      return;
    }

    const repartidorSeleccionado = repartidores.find(
      (repartidor) => repartidor.id === nuevoPedidoForm.repartidorId
    );

    if (!repartidorSeleccionado) {
      await Swal.fire({
        icon: "warning",
        title: "Repartidor inválido",
        text: "Selecciona un repartidor activo para la entrega.",
        confirmButtonText: "Aceptar",
      });

      return;
    }

    const nuevaEntregaInput: NuevaEntregaInput = {
      cliente: {
        nombre: clienteNombre,
        telefono: clienteTelefono,
        direccion: clienteDireccion,
      },
      descripcionPedido,
      prioridad: nuevoPedidoForm.prioridad,
      estado: "pendiente",
      repartidor: {
        id: repartidorSeleccionado.id,
        nombre: repartidorSeleccionado.nombre,
      },
      fechaEntrega: nuevoPedidoForm.fechaEntrega,
      horaEstimada: nuevoPedidoForm.horaEstimada,
      observaciones: observaciones || "Sin observaciones",
    };

    try {
      setGuardandoNuevaEntrega(true);
      setError("");

      const entregaCreada = await crearEntrega(nuevaEntregaInput);

      setEntregas((entregasActuales) =>
        ordenarEntregas([entregaCreada, ...entregasActuales])
      );

      setModalNuevoPedidoAbierto(false);
      setNuevoPedidoForm(crearFormularioNuevoPedido(repartidores[0]?.id ?? ""));

      await Swal.fire({
        icon: "success",
        title: "Entrega registrada",
        text: `La entrega ${entregaCreada.codigo} fue registrada correctamente.`,
        confirmButtonText: "Aceptar",
      });
    } catch (error) {
      console.error(error);

      await Swal.fire({
        icon: "error",
        title: "Error al registrar",
        text: "No se pudo registrar la nueva entrega.",
        confirmButtonText: "Aceptar",
      });
    } finally {
      setGuardandoNuevaEntrega(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
  <div className="brand-logo">
    <img src={dmsLogo} alt="DMS - Delivery Management System" />
  </div>

      <div className="brand-text">
        <strong>DMS</strong>
        <span>Delivery Management System</span>
      </div>
    </div>

        <button
          type="button"
          className="sidebar-primary-button"
          onClick={abrirModalNuevaEntrega}
        >
          + Nueva entrega
        </button>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          <button type="button" className="sidebar-link active">
            <span>▦</span>
            Entregas
          </button>

        </nav>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-search">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              value={terminoBusqueda}
              onChange={(event) => setTerminoBusqueda(event.target.value)}
              placeholder="Buscar por cliente o dirección"
              aria-label="Buscar por cliente o dirección"
            />

            {terminoBusqueda && (
              <button type="button" onClick={limpiarBusqueda}>
                Limpiar
              </button>
            )}
          </div>

          <div className="topbar-actions">
            <div className="notification-dot" aria-label="Notificaciones">
              •
            </div>

            <div className="user-chip">
              <span>S</span>
              <strong>Admin User</strong>
            </div>
          </div>
        </header>

        <div className="content-area">
          <section className="page-heading">
            <div>
              <p className="page-eyebrow">Delivery Management System</p>
              <h1>Panel de entregas</h1>
              <p>
                Gestión básica de pedidos, entregas pendientes, estados y
                prioridad logística.
              </p>
            </div>

          </section>

          <section className="metrics-grid">
            <article className="metric-card">
              <div className="metric-icon blue"><i className="fa-solid fa-box"></i></div>
              <div>
                <span>Total de entregas</span>
                <strong>{metricas.total}</strong>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon indigo"><i className="fa-solid fa-clock"></i></div>
              <div>
                <span>Pendientes</span>
                <strong>{metricas.pendientes}</strong>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon cyan"><i className="fa-solid fa-truck"></i></div>
              <div>
                <span>En ruta</span>
                <strong>{metricas.enRuta}</strong>
              </div>
            </article>

            <article className="metric-card danger">
              <div className="metric-icon red"><i className="fa-solid fa-circle-exclamation"></i></div>
              <div>
                <span>Prioridad alta</span>
                <strong>{metricas.prioritarias}</strong>
              </div>
            </article>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div className="panel-header-text">
                <h2>Entregas registradas</h2>
                <p>
                  Visualización centralizada para localizar, priorizar y
                  actualizar pedidos.
                </p>
              </div>

              <div className="panel-controls">
                <button
                  type="button"
                  className="new-delivery-button"
                  onClick={abrirModalNuevaEntrega}
                >
                  + Nueva entrega
                </button>

                <div className="filters">
                  <label>
                    Estado
                    <select
                      value={filtroEstado}
                      onChange={(event) =>
                        setFiltroEstado(event.target.value as FiltroEstado)
                      }
                    >
                      <option value="todos">Todos</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="en_ruta">En ruta</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </label>

                  <label>
                    Prioridad
                    <select
                      value={filtroPrioridad}
                      onChange={(event) =>
                        setFiltroPrioridad(
                          event.target.value as FiltroPrioridad
                        )
                      }
                    >
                      <option value="todas">Todas</option>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </label>

                  <label>
                    Ver
                    <select
                      value={registrosPorPagina}
                      onChange={(event) =>
                        setRegistrosPorPagina(Number(event.target.value))
                      }
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {cargando && (
              <p className="status-message">Cargando entregas...</p>
            )}

            {error && <p className="error-message">{error}</p>}

            {!cargando && !error && (
              <>
                <div className="table-summary">
                  <span>
                    Mostrando {registroInicial} a {registroFinal} de{" "}
                    {entregasFiltradas.length} entregas
                  </span>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Cliente</th>
                        <th>Dirección</th>
                        <th>Fecha / Hora</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                        <th>Repartidor</th>
                        <th>Acción</th>
                      </tr>
                    </thead>

                    <tbody>
                      {entregasPaginadas.map((entrega) => (
                        <tr key={entrega.id}>
                          <td className="code">{entrega.codigo}</td>
                          <td>{entrega.cliente.nombre}</td>
                          <td>{entrega.cliente.direccion}</td>
                          <td>
                            <div className="date-cell">
                              <strong>{entrega.fechaEntrega}</strong>
                              <span>{entrega.horaEstimada}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`pill priority-${entrega.prioridad}`}
                            >
                              {prioridadLabels[entrega.prioridad]}
                            </span>
                          </td>
                          <td>
                            <span className={`pill status-${entrega.estado}`}>
                              {estadoLabels[entrega.estado]}
                            </span>
                          </td>
                          <td>{entrega.repartidor.nombre}</td>
                          <td>
                            <button
                              type="button"
                              className="change-status-button"
                              onClick={() => abrirModalCambioEstado(entrega)}
                            >
                              Cambiar estado
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {entregasFiltradas.length === 0 && (
                    <p className="empty-message">
                      No hay entregas que coincidan con la búsqueda o los
                      filtros seleccionados.
                    </p>
                  )}
                </div>

                {entregasFiltradas.length > 0 && (
                  <div className="pagination">
                    <button
                      type="button"
                      onClick={irPaginaAnterior}
                      disabled={paginaActual === 1}
                    >
                      Anterior
                    </button>

                    <span>
                      Página {paginaActual} de {totalPaginas}
                    </span>

                    <button
                      type="button"
                      onClick={irPaginaSiguiente}
                      disabled={paginaActual === totalPaginas}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </section>

      {modalEstadoAbierto && entregaSeleccionada && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">Actualizar entrega</p>
                <h3>Cambiar estado</h3>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={cerrarModalCambioEstado}
                disabled={guardandoEstado}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="delivery-detail-grid">
                <div>
                  <span>Código</span>
                  <strong>{entregaSeleccionada.codigo}</strong>
                </div>

                <div>
                  <span>Cliente</span>
                  <strong>{entregaSeleccionada.cliente.nombre}</strong>
                </div>

                <div>
                  <span>Repartidor</span>
                  <strong>{entregaSeleccionada.repartidor.nombre}</strong>
                </div>

                <div>
                  <span>Estado actual</span>
                  <strong>{estadoLabels[entregaSeleccionada.estado]}</strong>
                </div>
              </div>

              <label className="modal-field">
                Nuevo estado
                <select
                  value={estadoTemporal}
                  onChange={(event) =>
                    setEstadoTemporal(event.target.value as EstadoEntrega)
                  }
                  disabled={guardandoEstado}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_ruta">En ruta</option>
                  <option value="entregado">Entregado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={cerrarModalCambioEstado}
                disabled={guardandoEstado}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={confirmarCambioEstado}
                disabled={guardandoEstado}
              >
                {guardandoEstado ? "Guardando..." : "Confirmar cambio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNuevoPedidoAbierto && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card modal-card-large">
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">Nuevo pedido</p>
                <h3>Registrar nueva entrega</h3>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={cerrarModalNuevaEntrega}
                disabled={guardandoNuevaEntrega}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarNuevaEntrega}>
              <div className="modal-body">
                <p className="modal-note">
                  El estado inicial de una nueva entrega será{" "}
                  <strong>Pendiente</strong>.
                </p>

                <div className="form-grid">
                  <label className="modal-field">
                    Nombre del cliente *
                    <input
                      type="text"
                      className={intentoGuardar && !esNombreValido(nuevoPedidoForm.clienteNombre) ? "invalid" : ""}
                      value={nuevoPedidoForm.clienteNombre}
                      onChange={(event) => {
                        const v = event.target.value
                          .replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, "")
                          .slice(0, 25);
                        actualizarCampoNuevoPedido("clienteNombre", v);
                      }}
                      placeholder="Ej. Juan Pérez"
                      disabled={guardandoNuevaEntrega}
                    />
                    {intentoGuardar && !esNombreValido(nuevoPedidoForm.clienteNombre) && (
                      <span className="field-error">
                        {nuevoPedidoForm.clienteNombre.trim() === ""
                          ? "Campo requerido"
                          : "Solo letras, máx. 25 caracteres"}
                      </span>
                    )}
                  </label>

                  <label className="modal-field">
                    Teléfono *
                    <input
                      type="text"
                      className={intentoGuardar && !esTelefonoValido(nuevoPedidoForm.clienteTelefono) ? "invalid" : ""}
                      value={nuevoPedidoForm.clienteTelefono}
                      onChange={(event) =>
                        actualizarCampoNuevoPedido(
                          "clienteTelefono",
                          formatearTelefono(event.target.value)
                        )
                      }
                      placeholder="Ej. 7777-7777"
                      maxLength={9}
                      disabled={guardandoNuevaEntrega}
                    />
                    {intentoGuardar && !esTelefonoValido(nuevoPedidoForm.clienteTelefono) && (
                      <span className="field-error">Formato requerido: 0000-0000</span>
                    )}
                  </label>

                  <label className="modal-field form-field-full">
                    Dirección *
                    <input
                      type="text"
                      className={intentoGuardar && !esDireccionValida(nuevoPedidoForm.clienteDireccion) ? "invalid" : ""}
                      value={nuevoPedidoForm.clienteDireccion}
                      onChange={(event) =>
                        actualizarCampoNuevoPedido(
                          "clienteDireccion",
                          event.target.value.slice(0, 120)
                        )
                      }
                      placeholder="Ej. Colonia Escalón, San Salvador"
                      maxLength={120}
                      disabled={guardandoNuevaEntrega}
                    />
                    {intentoGuardar && !esDireccionValida(nuevoPedidoForm.clienteDireccion) && (
                      <span className="field-error">Campo requerido, máx. 120 caracteres</span>
                    )}
                  </label>

                  <label className="modal-field form-field-full">
                    Descripción del pedido *
                    <input
                      type="text"
                      className={intentoGuardar && !esDescripcionValida(nuevoPedidoForm.descripcionPedido) ? "invalid" : ""}
                      value={nuevoPedidoForm.descripcionPedido}
                      onChange={(event) =>
                        actualizarCampoNuevoPedido(
                          "descripcionPedido",
                          event.target.value.slice(0, 120)
                        )
                      }
                      placeholder="Ej. Pedido de productos varios"
                      maxLength={120}
                      disabled={guardandoNuevaEntrega}
                    />
                    {intentoGuardar && !esDescripcionValida(nuevoPedidoForm.descripcionPedido) && (
                      <span className="field-error">Campo requerido, máx. 120 caracteres</span>
                    )}
                  </label>

                  <label className="modal-field">
                    Prioridad *
                    <select
                      value={nuevoPedidoForm.prioridad}
                      onChange={(event) =>
                        actualizarCampoNuevoPedido(
                          "prioridad",
                          event.target.value as PrioridadEntrega
                        )
                      }
                      disabled={guardandoNuevaEntrega}
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </label>

                  <label className="modal-field">
                    Repartidor *
                    <select
                      value={nuevoPedidoForm.repartidorId}
                      onChange={(event) =>
                        actualizarCampoNuevoPedido(
                          "repartidorId",
                          event.target.value
                        )
                      }
                      disabled={guardandoNuevaEntrega}
                    >
                      {repartidores.map((repartidor) => (
                        <option key={repartidor.id} value={repartidor.id}>
                          {repartidor.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="modal-field">
                    Fecha de entrega *
                    <input
                      type="date"
                      value={nuevoPedidoForm.fechaEntrega}
                      onChange={(event) =>
                        actualizarCampoNuevoPedido(
                          "fechaEntrega",
                          event.target.value
                        )
                      }
                      disabled={guardandoNuevaEntrega}
                    />
                  </label>

                  <label className="modal-field">
                    Hora estimada *
                    <input
                      type="time"
                      value={nuevoPedidoForm.horaEstimada}
                      onChange={(event) =>
                        actualizarCampoNuevoPedido(
                          "horaEstimada",
                          event.target.value
                        )
                      }
                      disabled={guardandoNuevaEntrega}
                    />
                  </label>

                  <label className="modal-field form-field-full">
                    Observaciones
                    <textarea
                      value={nuevoPedidoForm.observaciones}
                      onChange={(event) =>
                        actualizarCampoNuevoPedido(
                          "observaciones",
                          event.target.value.slice(0, 120)
                        )
                      }
                      placeholder="Ej. Llamar antes de llegar"
                      disabled={guardandoNuevaEntrega}
                      maxLength={120}
                      rows={2}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={cerrarModalNuevaEntrega}
                  disabled={guardandoNuevaEntrega}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={guardandoNuevaEntrega}
                >
                  {guardandoNuevaEntrega ? "Guardando..." : "Registrar entrega"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;