"use client";

import type { Paso } from "@/lib/ff/algoritmo";
import { INSIGNIAS } from "../grafo/estilos";
import { iteracionDe } from "./red";

/** Una marca por paso, con el color de su tipo. Un clic salta a ese paso. */
export default function LineaTiempo({ pasos, actual, onIr, deshabilitada }: { pasos: Paso[]; actual: number; onIr: (i: number) => void; deshabilitada?: boolean }) {
  return (
    <ol className="flex min-w-0 flex-1 items-end gap-[3px] overflow-x-auto py-1" aria-label="Línea de tiempo de los pasos">
      {pasos.map((p, i) => {
        const it = iteracionDe(pasos, i);
        const nuevaIteracion = i === 0 || p.tipo === "camino_encontrado" || p.tipo === "sin_mas_caminos" || p.tipo === "corte_minimo";
        const color = INSIGNIAS[p.tipo].color;
        const esActual = i === actual;
        return (
          <li key={i} className={`flex flex-col items-center ${nuevaIteracion && i > 0 ? "ml-2" : ""}`}>
            <span className={`mb-0.5 h-4 font-mono text-[10px] ${esActual ? "text-texto" : "text-tenue"}`} aria-hidden="true">
              {nuevaIteracion ? (p.tipo === "corte_minimo" ? "R" : it) : ""}
            </span>
            <button
              type="button"
              disabled={deshabilitada}
              onClick={() => onIr(i)}
              aria-label={`Paso ${i + 1}: ${INSIGNIAS[p.tipo].texto.toLowerCase()}`}
              aria-current={esActual ? "step" : undefined}
              className="group flex h-7 items-center disabled:cursor-not-allowed"
            >
              <span
                className={`block rounded-full transition-all ${esActual ? "h-7 w-3.5" : "h-4 w-2.5 group-hover:h-5"}`}
                style={{ background: color, outline: esActual ? "2px solid var(--texto)" : undefined, outlineOffset: 2 }}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
