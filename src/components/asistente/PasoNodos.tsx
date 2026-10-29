"use client";

import { N_MAX, N_MIN, validarCantidadNodos } from "@/lib/ff/entrada";
import { Mensaje } from "../ui";
import { ICONO_ETAPA } from "../iconos";
import type { PropsPaso } from "./Asistente";
import Pie from "./Pie";
import VistaNodos from "./VistaNodos";

export default function PasoNodos({ estado, despachar, onSiguiente }: PropsPaso) {
  const { error } = validarCantidadNodos(estado.nTexto);
  const fijar = (texto: string) => despachar({ tipo: "nTexto", texto });
  const n = estado.n;
  const boton =
    "flex h-12 w-12 items-center justify-center rounded-md border border-borde-fuerte text-xl hover:bg-superficie-2 disabled:opacity-40";

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <section className="w-full shrink-0 lg:w-[380px]" aria-labelledby="titulo-nodos">
          <h1 id="titulo-nodos" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ICONO_ETAPA.nodos size={20} aria-hidden="true" className="shrink-0" />
            Cantidad de nodos
          </h1>
          <p className="mt-2 text-tenue">
            El grafo dirigido tendrá n nodos, con n ∈ [{N_MIN}, {N_MAX}]. Se nombran A, B, C…
          </p>

          <div className="mt-6 flex items-center gap-2">
            <button type="button" className={boton} aria-label="Restar un nodo" disabled={n <= N_MIN} onClick={() => fijar(String(n - 1))}>
              −
            </button>
            <label className="sr-only" htmlFor="campo-n">
              Número de nodos n ∈ [7, 16]
            </label>
            <input
              id="campo-n"
              inputMode="numeric"
              value={estado.nTexto}
              onChange={(e) => fijar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !error) onSiguiente();
                if (e.key === "ArrowUp") { e.preventDefault(); fijar(String(Math.min(n + 1, N_MAX))); }
                if (e.key === "ArrowDown") { e.preventDefault(); fijar(String(Math.max(n - 1, N_MIN))); }
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "error-n" : undefined}
              className="h-12 w-24 rounded-md border border-borde-fuerte bg-fondo text-center font-mono text-2xl font-semibold"
            />
            <button type="button" className={boton} aria-label="Sumar un nodo" disabled={n >= N_MAX} onClick={() => fijar(String(n + 1))}>
              +
            </button>
          </div>

          <div className="mt-5">
            <label htmlFor="deslizador-n" className="sr-only">
              Deslizador de n
            </label>
            <input
              id="deslizador-n"
              type="range"
              min={N_MIN}
              max={N_MAX}
              step={1}
              value={n}
              onChange={(e) => fijar(e.target.value)}
              className="w-full accent-[var(--texto)]"
            />
            <div className="mt-1 flex justify-between font-mono text-xs text-tenue">
              {Array.from({ length: N_MAX - N_MIN + 1 }, (_, i) => (
                <span key={i}>{N_MIN + i}</span>
              ))}
            </div>
          </div>

          <div aria-live="polite" className="mt-5 min-h-[44px]">
            {error && (
              <Mensaje nivel="error">
                <span id="error-n">{error}</span>
              </Mensaje>
            )}
          </div>
        </section>

        <section className="min-h-[300px] flex-1 rounded-lg border border-borde bg-superficie" aria-label="Vista previa del grafo">
          <VistaNodos n={n} />
        </section>
      </div>
      <Pie onContinuar={() => onSiguiente()} deshabilitado={error !== null} explicacion={error} />
    </>
  );
}
