"use client";

import { useMemo, useState } from "react";
import { calcularPosicionesNodos } from "@/lib/ff/layout";
import { capATexto, listarAristas, nombreNodo } from "@/lib/ff/nombres";
import { advertirAristasAtipicas, mensajesNodosVirtuales, prepararRed } from "@/lib/ff/red";
import DibujoRed from "../grafo/DibujoRed";
import { bandas, crearEscala, orientacionPara } from "../grafo/escala";
import { estiloNodoBase } from "../grafo/estilos";
import { matrizActual } from "../estado";
import { Mensaje } from "../ui";
import type { PropsPaso } from "./Asistente";
import Pie from "./Pie";
import { ResumenRoles } from "./Roles";

export default function PasoRevision({ estado, despachar, onAnterior }: PropsPaso) {
  const matriz = matrizActual(estado);
  const { roles } = estado;
  const red = useMemo(() => prepararRed(matriz, roles.fuentes, roles.sumideros), [matriz, roles]);
  const layout = useMemo(
    () => calcularPosicionesNodos(red.nTrabajo, red.capacidades, roles.fuentes, roles.sumideros, red.superFuente, red.superSumidero),
    [red, roles],
  );
  const avisos = useMemo(() => advertirAristasAtipicas(matriz, new Set(roles.fuentes), new Set(roles.sumideros)), [matriz, roles]);
  const atipicas = new Set(avisos.map((a) => `${a.origen}-${a.destino}`));
  const [resaltada, setResaltada] = useState<string | null>(null);
  const ctx = { fuentes: new Set(roles.fuentes), sumideros: new Set(roles.sumideros), superFuente: red.superFuente, superSumidero: red.superSumidero };
  const nom = (u: number) => nombreNodo(u, red.superFuente, red.superSumidero);
  const virtuales = mensajesNodosVirtuales(roles);

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row">
        <div className="flex min-h-[420px] flex-1 flex-col gap-3 lg:h-[calc(100dvh-230px)]">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Revisión</h1>
            <p className="mt-2 text-tenue">Así queda la red con la que trabajará el algoritmo.</p>
          </div>
          <div className="flex-1 rounded-lg border border-borde bg-superficie">
            <DibujoRed
              matriz={red.capacidades}
              etiqueta="Red final"
              disponer={(w, h) => {
                const e = crearEscala(w, h, orientacionPara(w, h));
                return {
                  pts: new Map([...layout.posiciones].map(([k, p]) => [k, e.a(p)])),
                  bandas: bandas(layout.encabezados, e),
                  orientacion: e.orientacion,
                };
              }}
              nodo={(id) => ({ id, nombre: nom(id), ...estiloNodoBase(id, ctx), rotulo: `Nodo ${nom(id)}` })}
              texto={(u, v) => capATexto(red.capacidades[u][v])}
              arista={(u, v) => {
                const k = `${u}-${v}`;
                const virtual = u === red.superFuente || v === red.superSumidero;
                if (atipicas.has(k))
                  return {
                    color: "var(--a-aviso)",
                    ancho: resaltada === k ? 4.5 : 3,
                    punteada: true,
                    halo: resaltada === k ? "var(--borde-fuerte)" : undefined,
                    etiqueta: { borde: "var(--a-aviso)", texto: `⚠ ${red.capacidades[u][v]}` },
                  };
                return { color: virtual ? "var(--borde-fuerte)" : "var(--a-residual)", ancho: 2, punteada: virtual };
              }}
            />
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:h-[calc(100dvh-230px)] lg:w-[360px] lg:overflow-y-auto" aria-live="polite">
          {estado.aviso && <Mensaje nivel="ok">{estado.aviso}</Mensaje>}
          <section className="rounded-lg border border-borde p-4">
            <h2 className="mb-2 text-sm font-semibold">Red</h2>
            <ResumenRoles roles={roles} />
            <p className="mt-2 text-[15px] text-tenue">
              {listarAristas(matriz).length} arista(s) · fuente efectiva <span className="font-mono text-texto">{nom(red.fuente)}</span> ·
              sumidero efectivo <span className="font-mono text-texto">{nom(red.sumidero)}</span>
            </p>
          </section>

          {virtuales.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Nodos ficticios</h2>
              {roles.fuentes.length > 1 && (
                <Mensaje nivel="info">
                  {virtuales[0]}
                  {"\n"}Hay {roles.fuentes.length} fuentes ({roles.fuentes.map((x) => nombreNodo(x)).join(", ")}): S se conecta a cada una
                  con capacidad ∞ y el algoritmo usa S como única fuente.
                </Mensaje>
              )}
              {roles.sumideros.length > 1 && (
                <Mensaje nivel="info">
                  {virtuales[virtuales.length - 1]}
                  {"\n"}Hay {roles.sumideros.length} sumideros ({roles.sumideros.map((x) => nombreNodo(x)).join(", ")}): cada uno se conecta
                  a T con capacidad ∞ y el algoritmo usa T como único sumidero.
                </Mensaje>
              )}
            </section>
          )}

          {avisos.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold">Aristas atípicas</h2>
              {avisos.map((a, i) => {
                const k = `${a.origen}-${a.destino}`;
                return (
                  <button
                    key={i}
                    type="button"
                    className="text-left"
                    onMouseEnter={() => setResaltada(k)}
                    onMouseLeave={() => setResaltada(null)}
                    onFocus={() => setResaltada(k)}
                    onBlur={() => setResaltada(null)}
                  >
                    <Mensaje nivel="aviso">{a.texto}</Mensaje>
                  </button>
                );
              })}
            </section>
          )}
        </aside>
      </div>
      <Pie onAnterior={onAnterior} onContinuar={() => despachar({ tipo: "ejecutar" })} continuar="Ejecutar Ford-Fulkerson" />
    </>
  );
}
