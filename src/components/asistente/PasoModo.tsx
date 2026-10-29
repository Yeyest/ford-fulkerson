"use client";

import type { Modo } from "../estado";
import { ICONO_ETAPA } from "../iconos";
import type { PropsPaso } from "./Asistente";
import Pie from "./Pie";

function IlustracionAleatorio() {
  const capas = [[40], [110, 110], [180, 180, 180], [250]];
  const ys = [[60], [35, 85], [20, 60, 100], [60]];
  return (
    <svg viewBox="0 0 290 120" className="h-28 w-full" aria-hidden="true">
      {[
        [0, 0, 1, 0],
        [0, 0, 1, 1],
        [1, 0, 2, 0],
        [1, 0, 2, 1],
        [1, 1, 2, 2],
        [2, 0, 3, 0],
        [2, 1, 3, 0],
        [2, 2, 3, 0],
      ].map(([a, i, b, j], k) => (
        <line key={k} x1={capas[a][i]} y1={ys[a][i]} x2={capas[b][j]} y2={ys[b][j]} stroke="var(--borde-fuerte)" strokeWidth={2} />
      ))}
      {capas.map((col, c) => col.map((x, i) => <circle key={`${c}${i}`} cx={x} cy={ys[c][i]} r={10} fill="var(--fondo)" stroke="var(--texto)" strokeWidth={2} />))}
    </svg>
  );
}

function IlustracionManual() {
  return (
    <svg viewBox="0 0 290 120" className="h-28 w-full" aria-hidden="true">
      <circle cx={70} cy={60} r={14} fill="var(--fondo)" stroke="var(--texto)" strokeWidth={2} />
      <circle cx={220} cy={60} r={14} fill="var(--fondo)" stroke="var(--texto)" strokeWidth={2} />
      <path d="M86 60 H196" stroke="var(--texto)" strokeWidth={2} strokeDasharray="6 5" />
      <polygon points="204,60 194,54 194,66" fill="var(--texto)" />
      <rect x={124} y={30} width={42} height={20} rx={10} fill="var(--fondo)" stroke="var(--texto)" />
      <text x={145} y={44} textAnchor="middle" fontSize={11} className="font-mono" fill="var(--texto)">
        10
      </text>
      <path d="M200 74 l8 22 l4 -9 l9 -3 z" fill="var(--texto)" />
    </svg>
  );
}

const OPCIONES: { modo: Modo; titulo: string; texto: string; Ilustracion: () => React.ReactElement }[] = [
  { modo: "aleatorio", titulo: "Aleatorio", texto: "DAG por capas, garantizado acíclico", Ilustracion: IlustracionAleatorio },
  { modo: "manual", titulo: "Manual", texto: "Construye las aristas tú mismo", Ilustracion: IlustracionManual },
];

export default function PasoModo({ estado, despachar, onSiguiente, onAnterior }: PropsPaso) {
  return (
    <>
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ICONO_ETAPA.modo size={20} aria-hidden="true" className="shrink-0" />
          Modo de generación
        </h1>
        <p className="mt-2 text-tenue">¿Cómo quieres construir el grafo de {estado.n} nodos?</p>
        <div role="radiogroup" aria-label="Modo de generación del grafo" className="mt-6 grid max-w-4xl gap-4 sm:grid-cols-2">
          {OPCIONES.map(({ modo, titulo, texto, Ilustracion }, i) => {
            const elegido = estado.modo === modo;
            return (
              <button
                key={modo}
                type="button"
                role="radio"
                aria-checked={elegido}
                onClick={() => despachar({ tipo: "modo", modo })}
                onDoubleClick={() => (despachar({ tipo: "modo", modo }), onSiguiente())}
                className={`rounded-lg border p-6 text-left transition-colors hover:bg-superficie ${
                  elegido ? "border-texto ring-1 ring-texto" : "border-borde"
                }`}
              >
                <Ilustracion />
                <div className="mt-4 flex items-center gap-2">
                  <span className="font-mono text-sm text-tenue">{i + 1}.</span>
                  <span className="text-xl font-semibold">{titulo}</span>
                </div>
                <p className="mt-1 text-tenue">{texto}</p>
              </button>
            );
          })}
        </div>
      </div>
      <Pie
        onAnterior={onAnterior}
        onContinuar={() => onSiguiente()}
        deshabilitado={estado.modo === null}
        explicacion="Elige un modo para continuar."
      />
    </>
  );
}
