// Colores y grosores de nodos y aristas según el paso (estilo_nodo,
// estilo_arista, estilo_tag e INSIGNIAS de Python). Cada color tiene un
// significado fijo en toda la app (ver globals.css).
import type { Etiquetas, Paso, TipoPaso } from "@/lib/ff/algoritmo";
import { capATexto } from "@/lib/ff/nombres";

export const INSIGNIAS: Record<TipoPaso, { texto: string; color: string }> = {
  inicio: { texto: "INICIO", color: "var(--i-inicio)" },
  camino_encontrado: { texto: "ETIQUETADO: CAMINO AUMENTANTE ENCONTRADO", color: "var(--i-camino)" },
  flujo_actualizado: { texto: "ACTUALIZACIÓN DEL FLUJO", color: "var(--i-actualizado)" },
  sin_mas_caminos: { texto: "ETIQUETADO SIN LLEGAR AL SUMIDERO", color: "var(--i-sin-caminos)" },
  corte_minimo: { texto: "RESULTADO: FLUJO MÁXIMO Y CORTE MÍNIMO", color: "var(--i-corte)" },
};

export const TEXTO_OSCURO = "#171717";

export interface ContextoRoles {
  fuentes: ReadonlySet<number>;
  sumideros: ReadonlySet<number>;
  superFuente: number | null;
  superSumidero: number | null;
}

export interface EstiloNodo {
  relleno: string;
  borde: string;
  grosor: number;
  colorTexto: string;
  punteado?: boolean;
}

export function estiloNodoBase(u: number, c: ContextoRoles): EstiloNodo {
  if (u === c.superFuente)
    return { relleno: "var(--n-super-fuente)", borde: "var(--n-fuente-borde)", grosor: 2, colorTexto: "#ffffff", punteado: true };
  if (u === c.superSumidero)
    return { relleno: "var(--n-super-sumidero)", borde: "var(--n-sumidero-borde)", grosor: 2, colorTexto: "#ffffff", punteado: true };
  if (c.fuentes.has(u)) return { relleno: "var(--n-fuente)", borde: "var(--n-fuente-borde)", grosor: 2, colorTexto: TEXTO_OSCURO };
  if (c.sumideros.has(u)) return { relleno: "var(--n-sumidero)", borde: "var(--n-sumidero-borde)", grosor: 2, colorTexto: TEXTO_OSCURO };
  return { relleno: "var(--n-intermedio)", borde: "var(--n-intermedio-borde)", grosor: 1.5, colorTexto: TEXTO_OSCURO };
}

/** estilo_nodo de Python. */
export function estiloNodoPaso(u: number, paso: Paso, c: ContextoRoles): EstiloNodo {
  const { tipo, etiquetas, nodos_camino } = paso;
  const enCamino = (tipo === "camino_encontrado" || tipo === "flujo_actualizado") && nodos_camino.has(u);
  const base = estiloNodoBase(u, c);
  let relleno = base.relleno;
  const especial = u === c.superFuente || u === c.superSumidero || c.fuentes.has(u) || c.sumideros.has(u);
  if (!especial) {
    if (enCamino) relleno = "var(--n-camino)";
    else if ((tipo === "camino_encontrado" || tipo === "sin_mas_caminos") && etiquetas.has(u)) relleno = "var(--n-etiquetado)";
  }

  let borde = base.borde;
  let grosor = base.grosor;
  if (tipo === "flujo_actualizado") {
    if (nodos_camino.has(u)) [borde, grosor] = ["var(--n-actualizado-borde)", 3.5];
  } else if (tipo !== "corte_minimo") {
    if (tipo === "camino_encontrado" && nodos_camino.has(u)) [borde, grosor] = ["var(--n-camino-borde)", 3.5];
    else if (etiquetas.has(u)) [borde, grosor] = ["var(--n-etiquetado-borde)", 2.8];
  }
  return { relleno, borde, grosor, colorTexto: base.colorTexto, punteado: base.punteado };
}

/** estilo_tag de Python: texto y fondo de la etiqueta [padre±, Δ]. */
export function estiloTag(u: number, etiquetas: Etiquetas, nom: (u: number) => string) {
  const e = etiquetas.get(u);
  if (!e) return { texto: "[ ]", fondo: "var(--t-vacia)", color: "#78716c" };
  if (e.padre === "-") return { texto: "[-, ∞]", fondo: "var(--t-fuente)", color: TEXTO_OSCURO };
  const delta = e.delta >= 99999 ? "∞" : String(e.delta);
  return {
    texto: `[${nom(e.padre)}${e.signo}, ${delta}]`,
    fondo: e.signo === "+" ? "var(--t-mas)" : "var(--t-menos)",
    color: TEXTO_OSCURO,
  };
}

export interface EstiloArista {
  color: string;
  ancho: number;
  punteada?: boolean;
  halo?: string;
  animacion?: "adelante" | "atras";
}

/** estilo_arista de Python (vista de flujo). */
export function estiloAristaPaso(
  u: number,
  v: number,
  paso: Paso,
  cap: number,
  aristasCamino: ReadonlyMap<string, "+" | "-">,
  aristasCorte: ReadonlySet<string>,
): EstiloArista {
  const k = `${u}-${v}`;
  const { tipo } = paso;
  const f = paso.flujo[u][v];
  if (tipo === "camino_encontrado" && aristasCamino.has(k)) {
    return aristasCamino.get(k) === "+"
      ? { color: "var(--a-directo)", ancho: 4.5, animacion: "adelante" }
      : { color: "var(--a-inverso)", ancho: 4.5, punteada: true, animacion: "atras" };
  }
  if (tipo === "flujo_actualizado" && aristasCamino.has(k)) return { color: "var(--a-actualizada)", ancho: 4.5 };
  if (tipo === "corte_minimo" && aristasCorte.has(k)) return { color: "var(--a-corte)", ancho: 4.5, halo: "var(--a-corte-halo)" };
  if (tipo === "sin_mas_caminos" && aristasCorte.has(k)) return { color: "var(--a-frontera)", ancho: 3, punteada: true };
  if (f === 0) return { color: "var(--a-sin-flujo)", ancho: 1.6 };
  if (f >= cap) return { color: "var(--a-saturada)", ancho: 3.4 };
  return { color: "var(--a-parcial)", ancho: 2.6 };
}

/** Texto f/c de una arista (con ±Δ si está en el camino aumentante). */
export function textoFlujo(f: number, c: number, signo?: "+" | "-", delta?: number): string {
  const base = `${f}/${capATexto(c)}`;
  if (!signo) return base;
  return `${base} ${signo === "+" ? "+" : "−"}${delta}`;
}
