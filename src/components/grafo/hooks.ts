"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { type Curva, type Punto, cajaTexto, cajasEtiquetasNodo, calcularGeometriaAristas, colocarEtiquetas } from "@/lib/ff/geometria";

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

/**
 * Curvas de las aristas (fijas para una red y un tamaño) y posición de las etiquetas.
 * Con `fuenteTag`, las curvas también esquivan la etiqueta [p±, Δ] que va debajo de cada nodo.
 */
export function useGeometria(
  pts: ReadonlyMap<number, Punto>,
  aristas: readonly [number, number][],
  radio: number,
  ancho: number,
  alto: number,
  fuenteTag?: number,
) {
  const clave = JSON.stringify([[...pts], aristas, radio, ancho, alto, fuenteTag]);
  return useMemo(() => {
    const cajas = fuenteTag === undefined ? [] : cajasEtiquetasNodo(pts, radio, fuenteTag);
    return calcularGeometriaAristas(aristas, pts, radio, [ancho, alto], cajas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
}

export function useEtiquetas(
  geometria: ReadonlyMap<string, Curva>,
  textos: ReadonlyMap<string, string>,
  pts: ReadonlyMap<number, Punto>,
  ancho: number,
  alto: number,
  radio: number,
  fuente: number,
  /** Si los nodos llevan debajo su etiqueta [p±, Δ], su tamaño de letra: las etiquetas de las aristas la esquivan. */
  fuenteTag?: number,
  /** Largo (en caracteres) de esa etiqueta. */
  caracteresTag = 10,
) {
  const clave = JSON.stringify([[...textos], ancho, alto, radio, fuente, fuenteTag, caracteresTag]);
  return useMemo(() => {
    const dims = new Map<string, [number, number]>();
    for (const k of geometria.keys()) dims.set(k, cajaTexto(textos.get(k) ?? "", fuente));
    const obstaculos = fuenteTag === undefined ? [] : cajasEtiquetasNodo(pts, radio, fuenteTag, caracteresTag);
    return colocarEtiquetas(geometria, [...pts.values()], ancho, alto, radio, dims, obstaculos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometria, clave]);
}
