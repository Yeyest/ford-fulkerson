"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Paso, generarPasosFordFulkerson } from "@/lib/ff/algoritmo";
import { calcularPosicionesNodos } from "@/lib/ff/layout";
import type { Matriz } from "@/lib/ff/nombres";
import { type Roles, prepararRed } from "@/lib/ff/red";
import Encabezado from "../Encabezado";
import { INSIGNIAS } from "../grafo/estilos";
import { useTamano } from "../grafo/hooks";
import { Boton, Insignia, Kbd, Mensaje } from "../ui";
import { GrafoEvaluador, PanelEvaluador, useEvaluador } from "./Evaluador";
import GraficaFlujo from "./GraficaFlujo";
import GrafoPaso, { type Vista } from "./GrafoPaso";
import Leyenda from "./Leyenda";
import LineaTiempo from "./LineaTiempo";
import PanelPaso from "./PanelPaso";
import Resultado from "./Resultado";
import { type DatosRed, crearDatosRed, iteracionDe } from "./red";

interface Props {
  matriz: Matriz;
  roles: Roles;
  onEditar: () => void;
  onReiniciar: () => void;
}

export default function PantallaAlgoritmo({ matriz, roles, onEditar, onReiniciar }: Props) {
  const calculo = useMemo(() => {
    try {
      const red = prepararRed(matriz, roles.fuentes, roles.sumideros);
      const pasos = generarPasosFordFulkerson(red.nTrabajo, red.capacidades, red.fuente, red.sumidero, red.superFuente, red.superSumidero);
      const layout = calcularPosicionesNodos(red.nTrabajo, red.capacidades, roles.fuentes, roles.sumideros, red.superFuente, red.superSumidero);
      return { datos: crearDatosRed(red, layout, roles), pasos, error: null };
    } catch (e) {
      return { datos: null, pasos: [], error: (e as Error).message };
    }
  }, [matriz, roles]);

  if (!calculo.datos) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Encabezado />
        <div className="p-6">
          <Mensaje nivel="error">{calculo.error}</Mensaje>
          <Boton className="mt-4" onClick={onEditar}>
            Volver a editar el grafo
          </Boton>
        </div>
      </div>
    );
  }
  return <Pantalla datos={calculo.datos} pasos={calculo.pasos} onEditar={onEditar} onReiniciar={onReiniciar} />;
}

/** El flujo total sube contando cuando aumenta. */
function useNumeroAnimado(valor: number) {
  const [mostrado, setMostrado] = useState(valor);
  const previo = useRef(valor);
  useEffect(() => {
    const desde = previo.current;
    previo.current = valor;
    if (valor <= desde || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMostrado(valor);
      return;
    }
    const inicio = performance.now();
    let id = 0;
    const cuadro = (t: number) => {
      const k = Math.min((t - inicio) / 600, 1);
      setMostrado(Math.round(desde + (valor - desde) * (1 - (1 - k) ** 3)));
      if (k < 1) id = requestAnimationFrame(cuadro);
    };
    id = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(id);
  }, [valor]);
  return mostrado;
}

const VELOCIDADES = [0.5, 1, 2, 4];

function Pantalla({ datos, pasos, onEditar, onReiniciar }: { datos: DatosRed; pasos: Paso[]; onEditar: () => void; onReiniciar: () => void }) {
  const [indice, setIndice] = useState(0);
  const [vista, setVista] = useState<Vista>("flujo");
  const [evaluando, setEvaluando] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [ref, { w, h }] = useTamano<HTMLDivElement>();
  const ev = useEvaluador(datos);

  const paso = pasos[indice];
  const ultimo = pasos.length - 1;
  const flujoMostrado = useNumeroAnimado(paso.flujo_total);
  const it = iteracionDe(pasos, indice);
  const insignia = INSIGNIAS[paso.tipo];

  const ir = (i: number) => setIndice(Math.min(Math.max(i, 0), ultimo));
  const siguiente = () => setIndice((i) => Math.min(i + 1, ultimo));
  const anterior = () => setIndice((i) => Math.max(i - 1, 0));

  // Reproducción automática (se detiene sola en el último paso)
  const avanzando = reproduciendo && !evaluando && indice < ultimo;
  useEffect(() => {
    if (!avanzando) return;
    const t = setTimeout(() => setIndice((i) => Math.min(i + 1, ultimo)), 1800 / velocidad);
    return () => clearTimeout(t);
  }, [avanzando, indice, velocidad, ultimo]);
  const alternarReproduccion = () => {
    if (avanzando) setReproduciendo(false);
    else {
      if (indice >= ultimo) setIndice(0);
      setReproduciendo(true);
    }
  };

  // Teclado: → / n avanzar, ← / p retroceder, espacio reproducir / pausar (como en Python)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
      if (evaluando || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "n") {
        e.preventDefault();
        setIndice((i) => Math.min(i + 1, ultimo));
      } else if (e.key === "ArrowLeft" || e.key === "p") {
        e.preventDefault();
        setIndice((i) => Math.max(i - 1, 0));
      } else if (e.key === " ") {
        e.preventDefault();
        alternarReproduccion();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const panel = evaluando ? (
    <PanelEvaluador datos={datos} ev={ev} flujoMaximo={pasos[ultimo].flujo_total} />
  ) : paso.tipo === "corte_minimo" ? (
    <Resultado pasos={pasos} paso={paso} datos={datos} onIr={ir} />
  ) : (
    <PanelPaso paso={paso} datos={datos} />
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Encabezado>
        <Boton tam="sm" variante="fantasma" onClick={onEditar}>
          <span className="hidden sm:inline">Volver a editar el grafo</span>
          <span className="sm:hidden">Editar</span>
        </Boton>
        <Boton tam="sm" variante="fantasma" onClick={onReiniciar}>
          <span className="hidden sm:inline">Empezar de nuevo</span>
          <span className="sm:hidden">Nuevo</span>
        </Boton>
      </Encabezado>

      {/* Arriba: flujo total, iteración e insignia del paso */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-borde px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-semibold tracking-wider text-tenue uppercase">Flujo total</span>
          <span className="font-mono text-4xl font-semibold tracking-tight sm:text-5xl" aria-live="polite">
            {flujoMostrado}
          </span>
        </div>
        {!evaluando ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold tracking-wider text-tenue uppercase">Iteración</span>
              <span className="font-mono text-2xl">{paso.tipo === "corte_minimo" ? "—" : it}</span>
            </div>
            <Insignia color={insignia.color}>{insignia.texto}</Insignia>
          </>
        ) : (
          <Insignia color="var(--i-seleccion)">EVALUADOR DE CORTES MANUALES</Insignia>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!evaluando && (
            <div role="radiogroup" aria-label="Vista del grafo" className="flex rounded-md border border-borde p-0.5">
              {(["flujo", "residual"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={vista === v}
                  onClick={() => setVista(v)}
                  className={`h-8 rounded px-3 text-sm ${vista === v ? "bg-texto text-invertido" : "text-tenue hover:text-texto"}`}
                >
                  {v === "flujo" ? "Red de flujo f/c" : "Red residual"}
                </button>
              ))}
            </div>
          )}
          <Leyenda vista={evaluando ? "evaluador" : vista} />
        </div>
      </div>

      {/* Centro: grafo + panel lateral */}
      <div className="flex min-h-0 flex-1">
        <div ref={ref} className="relative min-w-0 flex-1">
          {w > 0 && h > 0 && (evaluando ? <GrafoEvaluador datos={datos} ev={ev} ancho={w} alto={h} /> : <GrafoPaso datos={datos} paso={paso} vista={vista} ancho={w} alto={h} />)}
        </div>
        <aside className="hidden w-[400px] shrink-0 overflow-y-auto border-l border-borde p-5 lg:block xl:w-[440px]" aria-label="Detalles del paso">
          {panel}
        </aside>
      </div>

      {/* Hoja deslizable en el celular */}
      <HojaInferior abierta={hojaAbierta} onCerrar={() => setHojaAbierta(false)}>
        {panel}
      </HojaInferior>

      {/* Abajo: controles */}
      <div className="flex flex-col gap-2 border-t border-borde px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Boton onClick={anterior} disabled={evaluando || indice === 0} aria-keyshortcuts="ArrowLeft p">
            ← Anterior
          </Boton>
          <Boton variante="primario" onClick={siguiente} disabled={evaluando || indice === ultimo} aria-keyshortcuts="ArrowRight n">
            Siguiente →
          </Boton>
          <Boton
            onClick={() => {
              setReproduciendo(false);
              setEvaluando(!evaluando);
            }}
            aria-pressed={evaluando}
            className={evaluando ? "border-texto" : ""}
          >
            {evaluando ? "← Volver a los pasos" : "✂ Evaluador de cortes"}
          </Boton>
          <span id="contador-pasos" className="ml-1 font-mono text-sm text-tenue">
            {indice + 1}/{pasos.length}
          </span>
          <Boton tam="sm" variante="secundario" className="ml-auto lg:hidden" onClick={() => setHojaAbierta(true)}>
            Detalles ▴
          </Boton>
          <span className="ml-auto hidden items-center gap-1 text-xs text-tenue lg:flex">
            <Kbd>←</Kbd> <Kbd>→</Kbd> pasos · <Kbd>espacio</Kbd> reproducir
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={evaluando}
            onClick={alternarReproduccion}
            aria-label={avanzando ? "Pausar" : "Reproducir automáticamente"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-borde-fuerte hover:bg-superficie-2 disabled:opacity-40"
          >
            {avanzando ? (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <rect x="2" y="1" width="3.5" height="12" fill="currentColor" />
                <rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M3 1l10 6-10 6z" fill="currentColor" />
              </svg>
            )}
          </button>
          <label className="sr-only" htmlFor="velocidad">
            Velocidad
          </label>
          <select
            id="velocidad"
            value={velocidad}
            onChange={(e) => setVelocidad(Number(e.target.value))}
            disabled={evaluando}
            className="h-9 shrink-0 rounded-md border border-borde-fuerte bg-fondo px-2 font-mono text-sm"
          >
            {VELOCIDADES.map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
          <LineaTiempo pasos={pasos} actual={indice} onIr={ir} deshabilitada={evaluando} />
          <div className="hidden md:block">
            <GraficaFlujo pasos={pasos} actual={indice} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** En pantallas chicas el panel lateral se vuelve una hoja que sube desde abajo. */
function HojaInferior({ abierta, onCerrar, children }: { abierta: boolean; onCerrar: () => void; children: React.ReactNode }) {
  const inicio = useRef<number | null>(null);
  const [arrastre, setArrastre] = useState(0);
  return (
    <div className={`lg:hidden ${abierta ? "" : "pointer-events-none"}`}>
      <div
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity ${abierta ? "opacity-100" : "opacity-0"}`}
        onClick={onCerrar}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Detalles del paso"
        className="fixed inset-x-0 bottom-0 z-40 flex max-h-[78dvh] flex-col rounded-t-xl border-t border-borde bg-fondo transition-transform"
        style={{ transform: abierta ? `translateY(${arrastre}px)` : "translateY(100%)" }}
      >
        <div
          className="flex cursor-grab touch-none justify-center py-3"
          onPointerDown={(e) => {
            inicio.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => inicio.current !== null && setArrastre(Math.max(0, e.clientY - inicio.current))}
          onPointerUp={() => {
            if (arrastre > 80) onCerrar();
            setArrastre(0);
            inicio.current = null;
          }}
        >
          <span className="h-1.5 w-10 rounded-full bg-borde-fuerte" />
        </div>
        <div className="flex justify-end px-4">
          <Boton tam="sm" variante="fantasma" onClick={onCerrar}>
            Cerrar
          </Boton>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{abierta && children}</div>
      </section>
    </div>
  );
}
