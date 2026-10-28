"use client";

import { type ReactNode, type RefObject, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Punto } from "@/lib/ff/geometria";

interface Vista {
  k: number;
  tx: number;
  ty: number;
}

/** Convierte coordenadas de pantalla (clientX/Y) en coordenadas del grafo. */
const ContextoLienzo = createContext<(x: number, y: number) => Punto>(() => [0, 0]);
export const useAGrafo = () => useContext(ContextoLienzo);

interface Props {
  ancho: number;
  alto: number;
  etiqueta: string;
  children: ReactNode;
  /** Se pintan fuera del zoom (por ejemplo, avisos fijos). */
  superpuesto?: ReactNode;
  onFondo?: () => void;
  svgRef?: RefObject<SVGSVGElement | null>;
  /** Recibe la función que convierte coordenadas de pantalla en coordenadas del grafo. */
  convertidorRef?: RefObject<((x: number, y: number) => Punto) | null>;
}

/** SVG con zoom (rueda + Ctrl, pellizco, botones) y desplazamiento cuando está ampliado. */
export default function Lienzo({ ancho, alto, etiqueta, children, superpuesto, onFondo, svgRef, convertidorRef }: Props) {
  const propio = useRef<SVGSVGElement | null>(null);
  const ref = svgRef ?? propio;
  const [vista, setVista] = useState<Vista>({ k: 1, tx: 0, ty: 0 });
  const punteros = useRef(new Map<number, Punto>());
  const gesto = useRef<{ dist: number; centro: Punto; vista: Vista } | null>(null);
  const arrastre = useRef<{ inicio: Punto; vista: Vista } | null>(null);

  const aViewBox = (cx: number, cy: number): Punto => {
    const r = ref.current!.getBoundingClientRect();
    const s = Math.min(r.width / ancho, r.height / alto);
    const ox = (r.width - ancho * s) / 2;
    const oy = (r.height - alto * s) / 2;
    return [(cx - r.left - ox) / s, (cy - r.top - oy) / s];
  };

  const aGrafo = (cx: number, cy: number): Punto => {
    const [x, y] = aViewBox(cx, cy);
    return [(x - vista.tx) / vista.k, (y - vista.ty) / vista.k];
  };

  useEffect(() => {
    if (convertidorRef) convertidorRef.current = aGrafo;
  });

  const limitar = useCallback(
    (v: Vista): Vista => {
      const k = Math.min(Math.max(v.k, 1), 4);
      return {
        k,
        tx: Math.min(0, Math.max(ancho - ancho * k, v.tx)),
        ty: Math.min(0, Math.max(alto - alto * k, v.ty)),
      };
    },
    [ancho, alto],
  );

  const zoomEn = useCallback(
    (centro: Punto, factor: number, base: Vista) => {
      const k = Math.min(Math.max(base.k * factor, 1), 4);
      const f = k / base.k;
      return limitar({ k, tx: centro[0] - (centro[0] - base.tx) * f, ty: centro[1] - (centro[1] - base.ty) * f });
    },
    [limitar],
  );

  // Rueda con Ctrl (o pellizco en el panel táctil) = zoom
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const rueda = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const c = aViewBox(e.clientX, e.clientY);
      setVista((v) => zoomEn(c, Math.exp(-e.deltaY * 0.01), v));
    };
    svg.addEventListener("wheel", rueda, { passive: false });
    return () => svg.removeEventListener("wheel", rueda);
  });

  const alBajar = (e: React.PointerEvent<SVGSVGElement>) => {
    punteros.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      gesto.current = {
        dist: Math.hypot(a[0] - b[0], a[1] - b[1]),
        centro: aViewBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2),
        vista,
      };
      arrastre.current = null;
    } else if (e.target === e.currentTarget || (e.target as Element).getAttribute?.("data-fondo") !== null) {
      if (vista.k > 1) arrastre.current = { inicio: aViewBox(e.clientX, e.clientY), vista };
    }
  };

  const alMover = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!punteros.current.has(e.pointerId)) return;
    punteros.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (gesto.current && punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      setVista(zoomEn(gesto.current.centro, dist / gesto.current.dist, gesto.current.vista));
    } else if (arrastre.current) {
      const p = aViewBox(e.clientX, e.clientY);
      const { inicio, vista: v } = arrastre.current;
      setVista(limitar({ k: v.k, tx: v.tx + p[0] - inicio[0], ty: v.ty + p[1] - inicio[1] }));
    }
  };

  const alSoltar = (e: React.PointerEvent<SVGSVGElement>) => {
    const eraFondo = !gesto.current && (e.target === e.currentTarget || (e.target as Element).getAttribute?.("data-fondo") !== null);
    const movio = arrastre.current
      ? Math.hypot(...(aViewBox(e.clientX, e.clientY).map((x, i) => x - arrastre.current!.inicio[i]) as [number, number])) > 4
      : false;
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) gesto.current = null;
    arrastre.current = null;
    if (eraFondo && !movio) onFondo?.();
  };

  const boton =
    "flex h-8 w-8 items-center justify-center rounded-md border border-borde bg-fondo text-texto text-base hover:bg-superficie-2";

  return (
    <ContextoLienzo.Provider value={aGrafo}>
      <div className="relative h-full w-full">
        <svg
          ref={ref}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="block h-full w-full touch-none select-none"
          role="group"
          aria-label={etiqueta}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
        >
          <rect data-fondo="" x={0} y={0} width={ancho} height={alto} fill="transparent" />
          <g transform={`translate(${vista.tx} ${vista.ty}) scale(${vista.k})`}>{children}</g>
        </svg>
        {superpuesto}
        <div className="absolute right-2 bottom-2 flex gap-1" aria-label="Zoom del grafo">
          <button type="button" className={boton} aria-label="Acercar" onClick={() => setVista((v) => zoomEn([ancho / 2, alto / 2], 1.3, v))}>
            +
          </button>
          <button type="button" className={boton} aria-label="Alejar" onClick={() => setVista((v) => zoomEn([ancho / 2, alto / 2], 1 / 1.3, v))}>
            −
          </button>
          {vista.k > 1 && (
            <button type="button" className={`${boton} w-auto px-2 text-xs`} onClick={() => setVista({ k: 1, tx: 0, ty: 0 })}>
              Ajustar
            </button>
          )}
        </div>
      </div>
    </ContextoLienzo.Provider>
  );
}
