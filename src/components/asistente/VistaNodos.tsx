"use client";

import { nombreNodo } from "@/lib/ff/nombres";
import Grafo, { type NodoVista } from "../grafo/Grafo";
import Lienzo from "../grafo/Lienzo";
import { medidas, posicionesCuadricula } from "../grafo/escala";
import { estiloNodoBase } from "../grafo/estilos";
import { useTamano } from "../grafo/hooks";

/** Los n nodos en cuadrícula, sin aristas (paso 1). */
export default function VistaNodos({ n }: { n: number }) {
  const [ref, { w, h }] = useTamano<HTMLDivElement>();
  const pts = w && h ? posicionesCuadricula(n, w, h) : new Map();
  const m = medidas([...pts.values()], w);
  const ctx = { fuentes: new Set<number>(), sumideros: new Set<number>(), superFuente: null, superSumidero: null };
  const nodos: NodoVista[] = [...pts].map(([id, p]) => ({
    id,
    nombre: nombreNodo(id),
    p,
    ...estiloNodoBase(id, ctx),
    rotulo: `Nodo ${nombreNodo(id)}`,
  }));
  return (
    <div ref={ref} className="h-full min-h-[260px] w-full">
      {w > 0 && (
        <Lienzo ancho={w} alto={h} etiqueta={`Vista previa: ${n} nodos`}>
          <Grafo nodos={nodos} aristas={[]} radio={m.radio} fuenteNodo={m.fuenteNodo} fuenteEtiqueta={m.fuenteEtiqueta} fuenteTag={m.fuenteTag} />
        </Lienzo>
      )}
    </div>
  );
}
