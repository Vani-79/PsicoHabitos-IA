import { API_CONFIG, fetchWithAuth } from './api';

export type ResourceSection =
  | 'ansiedad'
  | 'estres'
  | 'sueno'
  | 'ejercicio'
  | 'alimentacion'
  | 'hidratacion';

export interface PatientResourceItem {
  id: number;
  seccion: ResourceSection;
  tipo_tecnica: string;
  titulo: string;
  descripcion: string;
  video_url: string;
  miniatura_url: string | null;
  duracion_segundos: number | null;
  segundo_inicio: number;
  segundo_fin: number | null;
  orden: number;
  activo: boolean;
}

/**
 * Catálogo local de respaldo por si el dispositivo no tiene conexión a internet.
 */
export const FALLBACK_RESOURCES: PatientResourceItem[] = [
  // ANSIEDAD
  {
    id: 1,
    seccion: 'ansiedad',
    tipo_tecnica: 'Respiración 4-7-8',
    titulo: 'Técnica 478',
    descripcion: 'Técnica de respiración consciente para calmar el sistema nervioso, reducir la ansiedad y promover la relajación profunda.',
    video_url: 'https://youtu.be/EGO5m_DBzF8?si=pej8WKHAs8hT80Zr',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 1,
    activo: true,
  },
  {
    id: 2,
    seccion: 'ansiedad',
    tipo_tecnica: 'Grounding 5-4-3-2-1',
    titulo: 'Grounding 5-4-3-2-1',
    descripcion: 'Ejercicio de anclaje sensorial para conectar con el momento presente y desactivar pensamientos ansiosos intrusivos.',
    video_url: 'https://youtu.be/37FzHqlcxUI?si=LpMBxrDWzmgiFJPJ',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 2,
    activo: true,
  },
  {
    id: 3,
    seccion: 'ansiedad',
    tipo_tecnica: 'Respiración 4-4-4',
    titulo: 'Respiración 4-4-4',
    descripcion: 'Respiración en caja para regular la activación fisiológica, estabilizar el ritmo cardíaco y recuperar el autocontrol.',
    video_url: 'https://youtu.be/Nvtr6Ms4bmo?si=KUeWbf-R5EIH6Qao',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 3,
    activo: true,
  },
  {
    id: 4,
    seccion: 'ansiedad',
    tipo_tecnica: 'Exposición Interoceptiva',
    titulo: 'Técnica Exposición Interoceptiva',
    descripcion: 'Práctica gradual para habituarse y perder el temor a sensaciones físicas intensas asociadas a la ansiedad o el pánico.',
    video_url: 'https://www.youtube.com/watch?v=-_DRgqma_B8',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 4,
    activo: true,
  },
  {
    id: 5,
    seccion: 'ansiedad',
    tipo_tecnica: 'Meditación Guiada',
    titulo: 'Meditación Guiada',
    descripcion: 'Espacio de atención plena y serenidad para soltar la sobrecarga mental y cultivar calma interior.',
    video_url: 'https://www.youtube.com/watch?v=nAR2PUPyH1I',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 5,
    activo: true,
  },

  // ESTRÉS
  {
    id: 6,
    seccion: 'estres',
    tipo_tecnica: 'Técnica STOP',
    titulo: 'Técnica Stop',
    descripcion: 'Para, Toma aire, Observa y Procede. Método breve y efectivo para interrumpir la reacción impulsiva al estrés.',
    video_url: 'https://www.youtube.com/watch?v=D2fQFnW3Rqk',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 1,
    activo: true,
  },
  {
    id: 7,
    seccion: 'estres',
    tipo_tecnica: 'Relajación Progresiva',
    titulo: 'Técnica Jacobson',
    descripcion: 'Técnica de relajación muscular progresiva de Jacobson para liberar la tensión acumulada en el cuerpo.',
    video_url: 'https://www.youtube.com/watch?v=A-FKeahD_lQ',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 2,
    activo: true,
  },
  {
    id: 8,
    seccion: 'estres',
    tipo_tecnica: 'Mindfulness Activo',
    titulo: 'Caminata Consciente',
    descripcion: 'Práctica de mindfulness en movimiento para calmar la mente y reconectar con el cuerpo y el entorno.',
    video_url: 'https://www.youtube.com/watch?v=dcHm7H__a5k',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 3,
    activo: true,
  },
  {
    id: 9,
    seccion: 'estres',
    tipo_tecnica: 'Inoculación del Estrés',
    titulo: 'Técnica de inoculación de Meichenbaum',
    descripcion: 'Entrenamiento cognitivo para modificar autodiálogos negativos y afrontar situaciones desafiantes con resiliencia.',
    video_url: 'https://www.youtube.com/watch?v=t-_q1q1eRJY',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 4,
    activo: true,
  },
  {
    id: 10,
    seccion: 'estres',
    tipo_tecnica: 'Entrenamiento Autógeno',
    titulo: 'Técnica de Respiración Autógena de Schultz',
    descripcion: 'Inducción autógena para promover el descanso físico y mental profundo mediante sensaciones de pesadez y calor.',
    video_url: 'https://www.youtube.com/watch?v=4GSlcIOqUkA',
    miniatura_url: null,
    duracion_segundos: null,
    segundo_inicio: 0,
    segundo_fin: null,
    orden: 5,
    activo: true,
  },

  // SUEÑO
  {
    id: 11,
    seccion: 'sueno',
    tipo_tecnica: 'Control de Estímulos',
    titulo: 'Control de estímulos',
    descripcion: 'Técnica fundamental para recondicionar la mente a asociar la cama exclusivamente con el descanso reparador.',
    video_url: 'https://www.youtube.com/watch?v=68MVZuHHpLA&t=107s',
    miniatura_url: null,
    duracion_segundos: 77,
    segundo_inicio: 107,
    segundo_fin: 184,
    orden: 1,
    activo: true,
  },
];

/**
 * Genera el enlace directo para la app de YouTube incluyendo el segundo exacto si está configurado.
 */
export function getYouTubeDeepLink(videoUrl: string, startSeconds?: number | null): string {
  if (!videoUrl) return '';
  const cleanUrl = videoUrl.trim();
  if (!startSeconds || startSeconds <= 0) {
    return cleanUrl;
  }
  if (/[?&](t|start)=/.test(cleanUrl)) {
    return cleanUrl;
  }
  const separator = cleanUrl.includes('?') ? '&' : '?';
  return `${cleanUrl}${separator}t=${startSeconds}s`;
}

/**
 * Extrae de forma infalible el ID de un video de YouTube a partir de cualquier formato de URL.
 * Ejemplos:
 * - https://youtu.be/EGO5m_DBzF8?si=... -> EGO5m_DBzF8
 * - https://www.youtube.com/watch?v=D2fQFnW3Rqk -> D2fQFnW3Rqk
 * - https://www.youtube.com/embed/-_DRgqma_B8 -> -_DRgqma_B8
 */
export function extractYouTubeVideoId(url: string): string {
  if (!url) return '';
  const cleanUrl = url.trim();

  // Caso: ya es un ID directo de 11 caracteres
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  // Regex para todos los formatos de enlace de YouTube
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = regExp.exec(cleanUrl);

  return match ? match[1] : '';
}

/**
 * Obtiene la URL de la miniatura oficial de YouTube en calidad alta.
 */
export function getYouTubeThumbnailUrl(videoIdOrUrl: string, customThumbnail?: string | null): string {
  if (customThumbnail && customThumbnail.trim() !== '') {
    return customThumbnail.trim();
  }
  const videoId = extractYouTubeVideoId(videoIdOrUrl);
  if (!videoId) {
    return 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80';
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Formatea segundos a texto de duración legible (ej: 107 seg -> "1:47 min").
 */
export function formatSecondsToTime(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return 'Práctica guiada';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs} min`;
}

export const resourceService = {
  /**
   * Obtiene todos los recursos para una sección (ansiedad, estres, sueno),
   * consultando el backend MySQL y usando el catálogo de respaldo si el backend no responde.
   */
  async getResourcesBySection(seccion: string): Promise<PatientResourceItem[]> {
    const cleanSection = seccion.trim().toLowerCase();

    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/resources/${encodeURIComponent(cleanSection)}`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch (error) {
      console.warn('[resourceService] Backend no disponible, usando recursos locales:', error);
    }

    // Fallback local con los videos ya configurados
    return FALLBACK_RESOURCES.filter(
      (r) => r.seccion.toLowerCase() === cleanSection && r.activo
    ).sort((a, b) => a.orden - b.orden);
  },

  /**
   * Obtiene todos los recursos terapéuticos.
   */
  async getAllResources(): Promise<PatientResourceItem[]> {
    try {
      const response = await fetchWithAuth(`${API_CONFIG.BASE_URL}/resources`);
      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch (error) {
      console.warn('[resourceService] Backend no disponible para getAllResources:', error);
    }

    return FALLBACK_RESOURCES.filter((r) => r.activo).sort((a, b) => a.orden - b.orden);
  },
};
