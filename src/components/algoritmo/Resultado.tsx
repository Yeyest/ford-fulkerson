"use client";

import type { Paso } from "@/lib/ff/algoritmo";
import { capATexto, listarAristas } from "@/lib/ff/nombres";
import { type DatosRed, recorrido } from "./red";
import TextoPython from "./TextoPython";

/** Pantalla de resultado (paso corte_minimo). */
export default function Resultado({ pasos, paso, datos, onIr }: { pasos: Paso[]; paso: Paso; datos: DatosRed; onIr: (i: number) => void }) {
  const { nom, red } = datos;
  const cap = red.capacidades;
  const caminos = pasos.map((p, i) => ({ p, i })).filter(({ p }) => p.tipo === "camino_encontrado");
  const corte = paso.aristas_corte;
  const suma = corte.reduce((a, [u, v]) => a + cap[u][v], 0);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-xs font-semibold tracking-wider text-tenue uppercase">Flujo máximo</h2>
        <p className="font-mono text-6xl font-semibold tracking-tight">{paso.flujo_total}</p>
      </section>

      <section aria-labelledby="titulo-ecuacion">
        <h2 id="titulo-ecuacion" className="mb-2 text-xs font-semibold tracking-wider text-tenue uppercase">
          Corte mínimo = flujo máximo
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[15px]">
          {corte.length === 0 && <span>Sin aristas de S a T: c(S,T) = 0</span>}
          {corte.map(([u, v], i) => (
            <span key={`${u}-${v}`} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-tenue">+</span>}
              <span className="flex flex-col items-center rounded-md border px-2 py-1" style={{ borderColor: "var(--a-corte)" }}>
                <span className="text-xs text-tenue">
                  c({nom(u)}→{nom(v)})
                </span>
                <span className="font-semibold" style={{ color: "var(--a-corte)" }}>
                  {capATexto(cap[u][v])}
                </span>
              </span>
            </span>
          ))}
          {corte.length > 0 && (
            <>
              <span className="text-tenue">=</span>
              <span className="text-xl font-semibold">{suma}</span>
              <span className="text-tenue">= flujo máximo</span>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-tenue uppercase">Resumen de Python</h2>
        <div className="text-[15px]">
          <TextoPython texto={paso.descripcion} />
        </div>
      </section>

      <section aria-labelledby="titulo-caminos">
        <h2 id="titulo-caminos" className="mb-2 text-xs font-semibold tracking-wider text-tenue uppercase">
          Caminos aumentantes ({caminos.length})
        </h2>
        <ol className="flex flex-col gap-1">
          {caminos.map(({ p, i }, k) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onIr(i)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1 text-left hover:bg-superficie-2"
              >
                <span className="w-5 font-mono text-xs text-tenue">{k + 1}.</span>
                <span className="flex-1 font-mono text-[15px]">
                  {recorrido(p, nom).texto.split(/(→|←)/).map((t, j) =>
                    t === "→" || t === "←" ? (
                      <span key={j} className="font-bold" style={{ color: t === "→" ? "var(--a-directo)" : "var(--a-inverso)" }}>
                        {t}
                      </span>
                    ) : (
                      <span key={j}>{t}</span>
                    ),
                  )}
                </span>
                <span className="font-mono text-sm">Δ = {p.cuello_botella}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="titulo-flujos">
        <h2 id="titulo-flujos" className="mb-2 text-xs font-semibold tracking-wider text-tenue uppercase">
          Flujo final por arista (f/c)
        </h2>
        <div className="grid grid-cols-2 gap-x-4 font-mono text-[15px] sm:grid-cols-3 lg:grid-cols-2">
          {listarAristas(cap).map(([u, v]) => {
            const f = paso.flujo[u][v];
            const enCorte = corte.some(([a, b]) => a === u && b === v);
            return (
              <div key={`${u}-${v}`} className="flex justify-between border-b border-borde py-1">
                <span style={enCorte ? { color: "var(--a-corte)" } : undefined}>
                  {nom(u)}→{nom(v)}
                </span>
                <span className={f === 0 ? "text-tenue" : ""}>
                  {f}/{capATexto(cap[u][v])}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
