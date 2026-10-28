"use client";

import { useState } from "react";

const NODOS = [
  { texto: "Fuente", relleno: "var(--n-fuente)", borde: "var(--n-fuente-borde)" },
  { texto: "Sumidero", relleno: "var(--n-sumidero)", borde: "var(--n-sumidero-borde)" },
  { texto: "Origen S ficticio", relleno: "var(--n-super-fuente)", borde: "var(--n-fuente-borde)", punteado: true },
  { texto: "Destino T ficticio", relleno: "var(--n-super-sumidero)", borde: "var(--n-sumidero-borde)", punteado: true },
  { texto: "Intermedio", relleno: "var(--n-intermedio)", borde: "var(--n-intermedio-borde)" },
  { texto: "Etiquetado en la iteración", relleno: "var(--n-etiquetado)", borde: "var(--n-etiquetado-borde)" },
  { texto: "En el camino aumentante", relleno: "var(--n-camino)", borde: "var(--n-camino-borde)" },
];

const ARISTAS = [
  { texto: "Sin flujo", color: "var(--a-sin-flujo)", ancho: 2 },
  { texto: "Flujo parcial", color: "var(--a-parcial)", ancho: 3 },
  { texto: "Saturada (f = c)", color: "var(--a-saturada)", ancho: 4 },
  { texto: "Camino: directa (+)", color: "var(--a-directo)", ancho: 4 },
  { texto: "Camino: inversa (−)", color: "var(--a-inverso)", ancho: 4, punteada: true },
  { texto: "Recién actualizada", color: "var(--a-actualizada)", ancho: 4 },
  { texto: "Corte mínimo", color: "var(--a-corte)", ancho: 4 },
];

const RESIDUAL = [
  { texto: "Residual hacia adelante (c − f)", color: "var(--a-residual)", ancho: 2 },
  { texto: "Flujo que puede devolverse (f)", color: "var(--a-residual)", ancho: 1.6, punteada: true },
];

const EVALUADOR = [
  { texto: "Marcada que cruza de S a T", color: "var(--a-corte)", ancho: 4 },
  { texto: "Marcada que no cruza (no suma)", color: "var(--a-sin-efecto)", ancho: 3, punteada: true },
];

function Linea({ color, ancho, punteada }: { color: string; ancho: number; punteada?: boolean }) {
  return (
    <svg width="28" height="10" aria-hidden="true">
      <line x1="2" y1="5" x2="26" y2="5" stroke={color} strokeWidth={ancho} strokeDasharray={punteada ? "5 3" : undefined} strokeLinecap="round" />
    </svg>
  );
}

/** Leyenda plegable: cada color del grafo significa algo. */
export default function Leyenda({ vista }: { vista: "flujo" | "residual" | "evaluador" }) {
  const [abierta, setAbierta] = useState(false);
  const aristas = vista === "flujo" ? ARISTAS : vista === "residual" ? [...RESIDUAL, ...ARISTAS.slice(3, 6)] : EVALUADOR;
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta(!abierta)}
        className="flex h-9 items-center gap-1.5 rounded-md border border-borde px-3 text-sm hover:bg-superficie-2"
      >
        Leyenda <span aria-hidden="true">{abierta ? "▴" : "▾"}</span>
      </button>
      {abierta && (
        <div className="aparecer absolute right-0 z-30 mt-2 w-[min(92vw,520px)] rounded-lg border border-borde bg-fondo p-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <ul className="flex flex-col gap-1.5">
              {NODOS.map((n) => (
                <li key={n.texto} className="flex items-center gap-2">
                  <svg width="18" height="18" aria-hidden="true">
                    <circle cx="9" cy="9" r="7" fill={n.relleno} stroke={n.borde} strokeWidth="2" strokeDasharray={n.punteado ? "3 2" : undefined} />
                  </svg>
                  {n.texto}
                </li>
              ))}
              <li className="flex items-center gap-2">
                <span className="rounded-full px-1.5 font-mono text-xs text-[#171717]" style={{ background: "var(--t-mas)" }}>
                  [A+, 5]
                </span>
                Etiqueta [padre±, Δ]
              </li>
            </ul>
            <ul className="flex flex-col gap-1.5">
              {aristas.map((a) => (
                <li key={a.texto} className="flex items-center gap-2">
                  <Linea {...a} />
                  {a.texto}
                </li>
              ))}
              {vista !== "evaluador" && (
                <li className="flex items-center gap-2">
                  <span className="h-3 w-7 rounded" style={{ background: "var(--zona-s)", border: "1px solid var(--borde)" }} />
                  Lado S del corte
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
