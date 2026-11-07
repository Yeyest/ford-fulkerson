// Tramos del camino aumentante que usan flujo inverso, con los datos para explicarlos.
import type { Paso } from "@/lib/ff/algoritmo";

export interface TramoInverso {
  /** Arista original a→b (la que ya lleva flujo). El camino la recorre al revés: de b hacia a. */
  a: number;
  b: number;
  /** Nodo del camino antes de b y después de a (null si b es el inicio o a es el final). */
  previo: number | null;
  siguiente: number | null;
  /** Flujo de a→b antes y después de enviar Δ por el camino. */
  antes: number;
  despues: number;
  /** Posición del tramo en el camino (0 = primer tramo desde la fuente). */
  orden: number;
}

/** Nodos del camino en orden: fuente → … → sumidero. */
export function nodosDelCamino(paso: Paso): number[] {
  if (!paso.camino.length) return [];
  return [paso.camino[0][0], ...paso.camino.map(([, v]) => v)];
}

/** Tramos inversos del camino (solo en los pasos "camino_encontrado" y "flujo_actualizado"). */
export function tramosInversos(paso: Paso): TramoInverso[] {
  if (paso.tipo !== "camino_encontrado" && paso.tipo !== "flujo_actualizado") return [];
  const nodos = nodosDelCamino(paso);
  const delta = paso.cuello_botella;
  const tramos: TramoInverso[] = [];
  paso.camino.forEach(([p, v], i) => {
    if (paso.etiquetas.get(v)?.signo !== "-") return;
    // El camino va de p a v recorriendo al revés la arista v→p
    const f = paso.flujo[v][p];
    const antes = paso.tipo === "camino_encontrado" ? f : f + delta;
    tramos.push({
      a: v,
      b: p,
      previo: i > 0 ? nodos[i - 1] : null,
      siguiente: i + 2 < nodos.length ? nodos[i + 2] : null,
      antes,
      despues: antes - delta,
      orden: i,
    });
  });
  return tramos;
}

/**
 * Retroceso por flujo inverso: al etiquetar, la búsqueda llegó a `nodo` desde `desde`
 * recorriendo al revés la arista nodo→desde, que ya llevaba flujo (etiqueta [desde−, Δ]).
 */
export interface Retroceso {
  nodo: number;
  desde: number;
  /** Flujo de la arista nodo→desde en este paso (lo que se podría devolver). */
  flujo: number;
  /** Δ de la etiqueta del nodo. */
  delta: number;
  /** ¿Forma parte del camino aumentante del paso? */
  enCamino: boolean;
}

/**
 * Retrocesos que se dibujan en el paso: al encontrar un camino y al no encontrar más, todos los
 * de la búsqueda; al actualizar el flujo, solo los del camino.
 */
export function retrocesos(paso: Paso): Retroceso[] {
  const { tipo } = paso;
  if (tipo !== "camino_encontrado" && tipo !== "flujo_actualizado" && tipo !== "sin_mas_caminos") return [];
  const enCamino = new Set(paso.camino.map(([p, v]) => `${p}-${v}`));
  const lista: Retroceso[] = [];
  for (const [nodo, e] of paso.etiquetas) {
    if (e.signo !== "-" || e.padre === "-") continue;
    const r = { nodo, desde: e.padre, flujo: paso.flujo[nodo][e.padre], delta: e.delta, enCamino: enCamino.has(`${e.padre}-${nodo}`) };
    if (tipo !== "flujo_actualizado" || r.enCamino) lista.push(r);
  }
  return lista;
}

/** ¿El paso usa flujo inverso? */
export const usaFlujoInverso = (paso: Paso) => tramosInversos(paso).length > 0;

/** Duración de cada tramo en la animación del camino (ms): el recorrido completo dura como mucho ~1,4 s. */
export function duracionTramo(paso: Paso): number {
  return Math.min(480, 1400 / Math.max(paso.camino.length, 1));
}
