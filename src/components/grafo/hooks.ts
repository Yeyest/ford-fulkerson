"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { type Curva, type Punto, cajaTexto, calcularGeometriaAristas, colocarEtiquetas } from "@/lib/ff/geometria";

/** Tamaño de un elemento, actualizado al cambiar el tamaño de la ventana. */
export function useTamano<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTam({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, tam] as const;
}

/** Curvas de las aristas (fijas para una red y un tamaño) y posición de las etiquetas. */
export function useGeometria(pts: ReadonlyMap<number, Punto>, aristas: readonly [number, number][], radio: number, ancho: number, alto: number) {
  const clave = JSON.stringify([[...pts], aristas, radio, ancho, alto]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => calcularGeometriaAristas(aristas, pts, radio, [ancho, alto]), [clave]);
}

export function useEtiquetas(
  geometria: ReadonlyMap<string, Curva>,
  textos: ReadonlyMap<string, string>,
  pts: ReadonlyMap<number, Punto>,
  ancho: number,
  alto: number,
  radio: number,
  fuente: number,
  /** Los nodos llevan debajo su etiqueta [p±, Δ]: también hay que evitarla. */
  conTags = false,
) {
  const clave = JSON.stringify([[...textos], ancho, alto, radio, fuente, conTags]);
  return useMemo(() => {
    const dims = new Map<string, [number, number]>();
    for (const k of geometria.keys()) dims.set(k, cajaTexto(textos.get(k) ?? "", fuente));
    const centros = [...pts.values()];
    if (conTags) for (const [x, y] of pts.values()) centros.push([x, y + radio + fuente * 0.9]);
    return colocarEtiquetas(geometria, centros, ancho, alto, radio, dims);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometria, clave]);
}
