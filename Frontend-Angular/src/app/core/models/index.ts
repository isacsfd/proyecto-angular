export interface Usuario {
  id: number;
  nombre: string;
  username?: string;
  email?: string;
  phone?: string;
  address?: string;
  rol: string;
  identificacion: string;
  nivel_academico?: string;
  carrera?: string;
  sede?: string;
}

export interface UsuarioCreate {
  nombre: string;
  identificacion: string;
  password: string;
  rol: string;
  phone?: string;
  address?: string;
  username?: string;
  email?: string;
  nivel_academico?: string;
  carrera?: string;
}

export interface Libro {
  ID: number;
  Autor: string;
  Titulo: string;
  Programa?: string;
  Item?: number;
  Signatura: string;
  Areas?: number;
  Ejemplar?: number;
  Editorial?: string;
  Año?: number;
  Idioma?: string;
  Observaciones?: string;
  Precio?: string;
  Proveedor?: string;
  Registro_en_linea?: string;
  sede?: string;
}

/** Resultado del endpoint /libros/buscar (autocompletado de préstamos). */
export interface LibroBuscar {
  id: number;
  titulo: string;
  autor: string;
  ejemplares?: number;
  sede?: string;
}

export interface Dispositivo {
  id: number;
  tipo: string;
  marca: string;
  modelo: string;
  sede: string;
  estado: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Prestamo {
  id: number;
  user_id: number;
  user: string;
  book_id: string;
  book: string;
  loan_date: string;
  delivery_date: string;
  entry_date?: string;
  state: string;
  prestamo_state: string;
  created_at: string;
}

export interface PrestamoDispositivo {
  id: number;
  dispositivo_id: number;
  dispositivo: string;
  user_id: number;
  user: string;
  fecha_prestamo: string;
  fecha_devolucion?: string;
  estado: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface Acceso {
  id: number;
  user_id: number;
  user_name: string;
  user_identificacion: string;
  message: string;
  status: boolean;
  created_at: string;
}

export interface ChatRequest {
  mensaje: string;
}

export interface ChatResponse {
  respuesta: string;
  motor: string;
  intencion: string;
}

export interface LibroResultado {
  id: number;
  titulo: string;
  autor: string;
  programa: string;
  editorial?: string;
  idioma?: string;
  ejemplares: number;
  score: number;
}

export interface Recomendacion {
  id: number;
  titulo: string;
  autor: string;
  programa: string;
  ejemplares: number;
  score: number;
  razon: string;
}

export interface EstadoIA {
  motor_llm: string;
  host: string;
  modelo: string;
  disponible: boolean;
}

export interface Tendencia {
  series: { mes: string; total: number }[];
  proyeccion_proximo_mes: number | null;
  metodo: string;
  ultimo_mes: string | null;
}

export interface LibroTop {
  id: number;
  titulo: string;
  autor: string;
  programa: string;
  prestamos: number;
  ejemplares: number;
  disponible: boolean;
}

export interface LibroCritico {
  id: number;
  titulo: string;
  autor: string;
  programa: string;
  ejemplares: number;
}

export interface Morosidad {
  total: number;
  lista: {
    id: number;
    usuario: string;
    identificacion: string;
    libro: string;
    fecha_entrega: string;
    dias_vencido: number;
  }[];
}

export interface DashboardIA {
  tendencia: Tendencia;
  libros_top: LibroTop[];
  disponibilidad_critica: LibroCritico[];
  demanda_dispositivos: {
    total_dispositivos: number;
    por_sede: Record<string, number>;
    por_tipo: Record<string, number>;
    por_estado: Record<string, number>;
  };
  morosidad: Morosidad;
  pendientes_aprobacion: {
    id: number;
    usuario: string;
    libro: string;
    fecha_solicitud: string;
  }[];
}