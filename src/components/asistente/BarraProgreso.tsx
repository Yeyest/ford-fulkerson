"use client";

import { type Etapa, NOMBRE_ETAPA } from "../estado";
import { ICONO_ETAPA, TAM_ICONO } from "../iconos";

export default function BarraProgreso({
  etapas,
  actual,
  alcanzables,
  onIr,
}: {
  etapas: Etapa[];
  actual: number;
  alcanzables: boolean[];
  onIr: (i: number) => void;
}) {
  const todas = [...etapas.map((e) => NOMBRE_ETAPA[e]), "Ejecución"];
  const iconos = [...etapas.map((e) => ICONO_ETAPA[e]), ICONO_ETAPA.ejecucion];
  return (
    <nav aria-label="Progreso" className="border-b border-borde px-4 py-3 sm:px-6">
      <ol className="flex items-center gap-1 overflow-x-auto sm:gap-2">
        {todas.map((nombre, i) => {
          const esActual = i === actual;
          const hecho = i < actual;
          const clicable = i < etapas.length && i !== actual && alcanzables[i];
          const Icono = iconos[i];
          return (
            <li key={nombre} className="flex shrink-0 items-center gap-1 sm:gap-2">
              {i > 0 && <span className={`h-px w-4 sm:w-8 ${i <= actual ? "bg-texto" : "bg-borde-fuerte"}`} aria-hidden="true" />}
              <button
                type="button"
                disabled={!clicable}
                onClick={() => onIr(i)}
                aria-current={esActual ? "step" : undefined}
                className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-sm disabled:cursor-default ${clicable ? "hover:bg-superficie-2" : ""}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-xs ${
                    esActual ? "border-texto bg-texto text-invertido" : hecho ? "border-texto text-texto" : "border-borde-fuerte text-tenue"
                  }`}
                >
                  {hecho ? "✓" : i + 1}
                </span>
                <Icono size={TAM_ICONO} aria-hidden="true" className={`shrink-0 ${esActual ? "text-texto" : "text-tenue"}`} />
                <span className={`${esActual ? "font-semibold text-texto" : "text-tenue"} ${esActual ? "" : "hidden md:inline"}`}>{nombre}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
