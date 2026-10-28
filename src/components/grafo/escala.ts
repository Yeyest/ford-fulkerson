// Conversión de las posiciones normalizadas de Python (0-1, y hacia arriba) a
// píxeles del lienzo, tamaños de nodos y letras, bandas de las columnas.
import type { Encabezado } from "@/lib/ff/layout";
import type { Punto } from "@/lib/ff/geometria";

export type Orientacion = "horizontal" | "vertical";

export interface Escala {
  ancho: number;
  alto: number;
  orientacion: Orientacion;
  /** Normalizado (x, y) → píxeles. */
  a: (p: readonly [number, number]) => Punto;
}

export function crearEscala(ancho: number, alto: number, orientacion: Orientacion): Escala {
  return {
    ancho,
    alto,
    orientacion,
    // En vertical se deja margen abajo para la etiqueta [p±, Δ] del último nodo
    a: orientacion === "horizontal" ? ([x, y]) => [x * ancho, (1 - y) * alto] : ([x, y]) => [(1 - y) * ancho, (0.04 + x * 0.86) * alto],
  };
}

/** En pantallas verticales (celular) las columnas pasan a ser filas. */
export function orientacionPara(ancho: number, alto: number): Orientacion {
  return alto > ancho * 1.05 ? "vertical" : "horizontal";
}

export interface Medidas {
  radio: number;
  fuenteNodo: number;
  fuenteEtiqueta: number;
  fuenteTag: number;
}

/** Tamaño de los nodos según la separación disponible (como tam_nodo en Python). */
export function medidas(pts: readonly Punto[], ancho: number): Medidas {
  let minDist = Infinity;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) minDist = Math.min(minDist, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]));
  if (!Number.isFinite(minDist)) minDist = 80;
  const base = Math.min(Math.max(ancho / 95, 12), 16);
  const radio = Math.min(Math.max(minDist * 0.3, 13), 26);
  return {
    radio,
    fuenteNodo: Math.min(Math.max(radio * 0.78, 11), 19),
    fuenteEtiqueta: base,
    fuenteTag: Math.max(base - 1.5, 10.5),
  };
}

export interface Banda {
  x: number;
  y: number;
  w: number;
  h: number;
  titulo: string;
  tituloPos: Punto;
  color: string | null;
}

const COLOR_BANDA: Record<string, string> = {
  super_fuente: "var(--banda-super-fuente)",
  fuente: "var(--banda-fuente)",
  sumidero: "var(--banda-sumidero)",
  super_sumidero: "var(--banda-super-sumidero)",
};

/** Columnas de fondo con su título (como axvspan + encabezados en Python). */
export function bandas(encabezados: readonly Encabezado[], e: Escala): Banda[] {
  const xs = [...new Set(encabezados.map((h) => h.x))].sort((a, b) => a - b);
  const semi = xs.length > 1 ? 0.42 * (xs[1] - xs[0]) : 0.1;
  return encabezados.map((h) => {
    const [ax, ay] = e.a([h.x - semi, 0.91]);
    const [bx, by] = e.a([h.x + semi, 0.03]);
    const tituloPos = e.orientacion === "horizontal" ? e.a([h.x, 0.955]) : ([8, e.a([h.x, 0.5])[1] - (by - ay) / 2 + 14] as Punto);
    return {
      x: Math.min(ax, bx),
      y: Math.min(ay, by),
      w: Math.abs(bx - ax),
      h: Math.abs(by - ay),
      titulo: h.titulo,
      tituloPos,
      color: COLOR_BANDA[h.tipo] ?? null,
    };
  });
}

/** Cuadrícula inicial de n nodos (pasos 1-3 del asistente). */
export function posicionesCuadricula(n: number, ancho: number, alto: number): Map<number, Punto> {
  const cols = Math.max(2, Math.min(n, Math.round(Math.sqrt((n * ancho) / alto))));
  const filas = Math.ceil(n / cols);
  const pos = new Map<number, Punto>();
  const mx = Math.min(90, ancho * 0.1);
  const my = Math.min(80, alto * 0.14);
  for (let i = 0; i < n; i++) {
    const f = Math.floor(i / cols);
    const c = i % cols;
    const desfase = f % 2 === 1 ? 0.35 : 0; // filas alternadas: menos aristas sobre nodos
    const x = mx + ((c + 0.5 + desfase * 0.5) / (cols + 0.25)) * (ancho - 2 * mx);
    const y = filas === 1 ? alto / 2 : my + (f / (filas - 1)) * (alto - 2 * my);
    pos.set(i, [x, y]);
  }
  return pos;
}
