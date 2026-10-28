"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type { Curva, Punto } from "@/lib/ff/geometria";
import { type Matriz, capATexto, listarAristas } from "@/lib/ff/nombres";
import Grafo, { type AristaVista, type NodoVista } from "./Grafo";
import Lienzo from "./Lienzo";
import { type Banda, type Medidas, medidas } from "./escala";
import { useEtiquetas, useGeometria, useTamano } from "./hooks";

export interface Disposicion {
  pts: Map<number, Punto>;
  bandas?: Banda[];
  orientacion?: "horizontal" | "vertical";
}

export interface ContextoDibujo {
  pts: Map<number, Punto>;
  geo: Map<string, Curva>;
  etiquetas: Map<string, Punto>;
  ancho: number;
  alto: number;
  m: Medidas;
}

interface Props {
  matriz: Matriz;
  disponer: (ancho: number, alto: number) => Disposicion;
  nodo: (id: number) => Omit<NodoVista, "p">;
  arista?: (
    u: number,
    v: number,
  ) => Partial<Omit<AristaVista, "geo" | "clave" | "etiqueta">> & { etiqueta?: Partial<NonNullable<AristaVista["etiqueta"]>> };
  texto?: (u: number, v: number) => string;
  etiqueta: string;
  onNodoClick?: (id: number) => void;
  onNodoTecla?: (id: number, e: KeyboardEvent<SVGGElement>) => void;
  onAristaClick?: (clave: string, enEtiqueta: boolean) => void;
  onAristaTecla?: (clave: string, e: KeyboardEvent<SVGGElement>) => void;
  encima?: (c: ContextoDibujo) => ReactNode;
  className?: string;
}

/** Dibujo de una red (sin edición): asistente, revisión, grafo aleatorio. */
export default function DibujoRed(props: Props) {
  const [ref, { w, h }] = useTamano<HTMLDivElement>();
  return (
    <div ref={ref} className={props.className ?? "h-full min-h-[300px] w-full"}>
      {w > 0 && h > 0 && <Interno {...props} ancho={w} alto={h} />}
    </div>
  );
}

function Interno({
  matriz,
  disponer,
  nodo,
  arista,
  texto,
  etiqueta,
  onNodoClick,
  onNodoTecla,
  onAristaClick,
  onAristaTecla,
  encima,
  ancho,
  alto,
}: Props & { ancho: number; alto: number }) {
  const { pts, bandas, orientacion } = disponer(ancho, alto);
  const m = medidas([...pts.values()], ancho);
  const pares = listarAristas(matriz);
  const geo = useGeometria(pts, pares, m.radio, ancho, alto);
  const textoDe = texto ?? ((u: number, v: number) => capATexto(matriz[u][v]));
  const textos = new Map(pares.map(([u, v]) => [`${u}-${v}`, textoDe(u, v)]));
  const etiquetas = useEtiquetas(geo, textos, pts, ancho, alto, m.radio, m.fuenteEtiqueta);

  const nodos: NodoVista[] = [...pts].map(([id, p]) => ({ ...nodo(id), p }));
  const aristas: AristaVista[] = pares.map(([u, v]) => {
    const clave = `${u}-${v}`;
    const extra = arista?.(u, v) ?? {};
    return {
      clave,
      geo: geo.get(clave)!,
      color: "var(--a-sin-flujo)",
      ancho: 1.8,
      rotulo: `Arista ${clave}`,
      ...extra,
      etiqueta: { texto: textos.get(clave)!, pos: etiquetas.get(clave)!, ...(extra.etiqueta ?? {}) },
    };
  });

  return (
    <Lienzo ancho={ancho} alto={alto} etiqueta={etiqueta}>
      <Grafo
        nodos={nodos}
        aristas={aristas}
        radio={m.radio}
        fuenteNodo={m.fuenteNodo}
        fuenteEtiqueta={m.fuenteEtiqueta}
        fuenteTag={m.fuenteTag}
        bandas={bandas}
        orientacion={orientacion}
        onNodoClick={onNodoClick}
        onNodoTecla={onNodoTecla}
        onAristaClick={onAristaClick}
        onAristaTecla={onAristaTecla}
      />
      {encima?.({ pts, geo, etiquetas, ancho, alto, m })}
    </Lienzo>
  );
}
