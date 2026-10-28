"use client";

import type { Paso } from "@/lib/ff/algoritmo";
import { estiloTag } from "../grafo/estilos";
import type { DatosRed } from "./red";
import TextoPython from "./TextoPython";

/** Descripción del paso y tabla de etiquetas [padre±, Δ]. */
export default function PanelPaso({ paso, datos }: { paso: Paso; datos: DatosRed }) {
  const { nom, red } = datos;
  const etiquetados = [...paso.etiquetas.keys()];
  const sinEtiqueta = Array.from({ length: red.nTrabajo }, (_, i) => i).filter((u) => !paso.etiquetas.has(u));

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="titulo-descripcion">
        <h2 id="titulo-descripcion" className="mb-2 text-xs font-semibold tracking-wider text-tenue uppercase">
          Descripción del paso
        </h2>
        <TextoPython texto={paso.descripcion} />
      </section>

      {paso.cuello_botella > 0 && (
        <p className="flex items-baseline gap-3 rounded-md border border-borde px-3 py-2">
          <span className="text-xs font-semibold tracking-wider text-tenue uppercase">Δ del camino</span>
          <span className="font-mono text-2xl font-semibold">{paso.cuello_botella}</span>
        </p>
      )}

      <section aria-labelledby="titulo-etiquetas">
        <h2 id="titulo-etiquetas" className="mb-2 text-xs font-semibold tracking-wider text-tenue uppercase">
          Etiquetas de los nodos
        </h2>
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-borde text-left text-xs text-tenue">
              <th className="py-1 font-medium">#</th>
              <th className="py-1 font-medium">Nodo</th>
              <th className="py-1 font-medium">[padre±, Δ]</th>
              <th className="py-1 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {[...etiquetados, ...sinEtiqueta].map((u, i) => {
              const tag = estiloTag(u, paso.etiquetas, nom);
              const e = paso.etiquetas.get(u);
              const enCamino = paso.nodos_camino.has(u) && (paso.tipo === "camino_encontrado" || paso.tipo === "flujo_actualizado");
              return (
                <tr key={u} className={`border-b border-borde last:border-0 ${e ? "" : "text-tenue"}`}>
                  <td className="py-1 font-mono text-xs text-tenue">{e ? i + 1 : ""}</td>
                  <td className="py-1 font-mono font-semibold">
                    {nom(u)}
                    {enCamino && (
                      <span className="ml-1.5 inline-block h-2 w-2 rounded-full" style={{ background: "var(--n-camino-borde)" }} title="en el camino" />
                    )}
                  </td>
                  <td className="py-1">
                    <span className="rounded-full px-2 py-0.5 font-mono text-sm text-[#171717]" style={{ background: tag.fondo }}>
                      {tag.texto}
                    </span>
                  </td>
                  <td className="py-1 text-right font-mono">{e ? (e.delta >= 99999 ? "∞" : e.delta) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-tenue">El orden (#) es el orden en que se etiquetaron los nodos (búsqueda en anchura).</p>
      </section>
    </div>
  );
}
