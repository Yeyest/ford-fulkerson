"use client";

import type { KeyboardEvent, PointerEvent } from "react";
import { type Punto, caminoSvg, recortarCurva } from "@/lib/ff/geometria";
import type { Banda } from "./escala";

export interface NodoVista {
  id: number;
  nombre: string;
  p: Punto;
  relleno: string;
  borde: string;
  grosor: number;
  colorTexto: string;
  punteado?: boolean;
  atenuado?: boolean;
  prohibido?: boolean;
  /** Momento del último temblor (cambia para repetir la animación). */
  tiembla?: number | false;
  /** Etiqueta [padre±, Δ] debajo del nodo. */
  tag?: { texto: string; fondo: string; color: string };
  rotulo: string;
  enfocable?: boolean;
  presionado?: boolean;
}

export interface AristaVista {
  clave: string;
  geo: { p1: Punto; p2: Punto; ctrl: Punto };
  color: string;
  ancho: number;
  punteada?: boolean;
  halo?: string;
  etiqueta?: { texto: string; pos: Punto; color?: string; borde?: string; negrita?: boolean };
  animacion?: "adelante" | "atras";
  atenuada?: boolean;
  pulso?: boolean;
  rotulo: string;
  enfocable?: boolean;
  presionada?: boolean;
}

interface Props {
  nodos: NodoVista[];
  aristas: AristaVista[];
  radio: number;
  fuenteNodo: number;
  fuenteEtiqueta: number;
  fuenteTag: number;
  bandas?: Banda[];
  orientacion?: "horizontal" | "vertical";
  onNodoPointerDown?: (id: number, e: PointerEvent<SVGGElement>) => void;
  onNodoClick?: (id: number) => void;
  onNodoTecla?: (id: number, e: KeyboardEvent<SVGGElement>) => void;
  onAristaClick?: (clave: string, enEtiqueta: boolean) => void;
  onAristaTecla?: (clave: string, e: KeyboardEvent<SVGGElement>) => void;
}

export function Bandas({ bandas, orientacion }: { bandas: Banda[]; orientacion: "horizontal" | "vertical" }) {
  return (
    <g aria-hidden="true">
      {bandas.map((b, i) =>
        b.color ? <rect key={`b${i}`} data-fondo="" x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill={b.color} /> : null,
      )}
      {bandas.map((b, i) => (
        <text
          key={`t${i}`}
          x={b.tituloPos[0]}
          y={b.tituloPos[1]}
          textAnchor={orientacion === "horizontal" ? "middle" : "start"}
          dominantBaseline="middle"
          className="fill-tenue font-sans"
          fontSize={12}
          fontWeight={600}
          letterSpacing="0.04em"
        >
          {b.titulo.toUpperCase()}
        </text>
      ))}
    </g>
  );
}

function Flecha({ q2, dir, color, ancho }: { q2: Punto; dir: Punto; color: string; ancho: number }) {
  const largo = 8 + ancho * 1.6;
  const semi = 3.5 + ancho * 0.9;
  const base: Punto = [q2[0] - dir[0] * largo, q2[1] - dir[1] * largo];
  const n: Punto = [-dir[1], dir[0]];
  const pts = [q2, [base[0] + n[0] * semi, base[1] + n[1] * semi], [base[0] - n[0] * semi, base[1] - n[1] * semi]];
  return <polygon points={pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ")} fill={color} />;
}

/** Dibujo del grafo: aristas, etiquetas de capacidad/flujo, nodos y etiquetas [p±, Δ]. */
export default function Grafo({
  nodos,
  aristas,
  radio,
  fuenteNodo,
  fuenteEtiqueta,
  fuenteTag,
  bandas,
  orientacion = "horizontal",
  onNodoPointerDown,
  onNodoClick,
  onNodoTecla,
  onAristaClick,
  onAristaTecla,
}: Props) {
  const trazos = aristas.map((a) => {
    const r = recortarCurva(a.geo, radio + 2, radio + 3);
    // La línea termina donde empieza la punta de la flecha
    const largo = 8 + a.ancho * 1.6;
    const fin: Punto = [r.q2[0] - r.dir[0] * largo * 0.8, r.q2[1] - r.dir[1] * largo * 0.8];
    return { a, r, d: caminoSvg(r.q0, r.q1, fin), dCompleto: caminoSvg(r.q0, r.q1, r.q2) };
  });

  return (
    <g>
      {bandas && <Bandas bandas={bandas} orientacion={orientacion} />}

      {/* Halos (corte mínimo, selección) */}
      {trazos.map(({ a, dCompleto }) =>
        a.halo ? <path key={`h${a.clave}`} d={dCompleto} fill="none" stroke={a.halo} strokeWidth={a.ancho + 9} strokeLinecap="round" /> : null,
      )}

      {/* Aristas */}
      {trazos.map(({ a, r, d, dCompleto }) => (
        <g
          key={a.clave}
          className={a.enfocable ? "grafo-foco cursor-pointer" : undefined}
          tabIndex={a.enfocable ? 0 : undefined}
          role={a.enfocable ? "button" : undefined}
          aria-label={a.enfocable ? a.rotulo : undefined}
          aria-pressed={a.enfocable && a.presionada !== undefined ? a.presionada : undefined}
          opacity={a.atenuada ? 0.3 : 1}
          onClick={onAristaClick ? () => onAristaClick(a.clave, false) : undefined}
          onKeyDown={onAristaTecla ? (e) => onAristaTecla(a.clave, e) : undefined}
        >
          <path
            d={d}
            fill="none"
            stroke={a.color}
            strokeWidth={a.ancho}
            strokeDasharray={a.punteada ? `${a.ancho * 2.4} ${a.ancho * 1.8}` : undefined}
            strokeLinecap="round"
            className={a.pulso ? "pulso-ciclo" : undefined}
          />
          {a.animacion && (
            <path
              d={dCompleto}
              fill="none"
              stroke="var(--fondo)"
              strokeOpacity={0.85}
              strokeWidth={Math.max(a.ancho - 2.5, 1.5)}
              strokeLinecap="round"
              className={a.animacion === "adelante" ? "flujo-adelante" : "flujo-atras"}
            />
          )}
          <Flecha q2={r.q2} dir={r.dir} color={a.color} ancho={a.ancho} />
          {/* Zona de clic más ancha que la línea */}
          {onAristaClick && <path d={dCompleto} fill="none" stroke="transparent" strokeWidth={16} />}
        </g>
      ))}

      {/* Etiquetas de las aristas */}
      {trazos.map(({ a }) => {
        if (!a.etiqueta) return null;
        const { texto, pos, color, borde, negrita } = a.etiqueta;
        const w = [...texto].length * 0.6 * fuenteEtiqueta + 12;
        const h = fuenteEtiqueta + 10;
        return (
          <g
            key={`e${a.clave}`}
            className={onAristaClick ? "cursor-pointer" : undefined}
            opacity={a.atenuada ? 0.35 : 1}
            onClick={onAristaClick ? (e) => (e.stopPropagation(), onAristaClick(a.clave, true)) : undefined}
            aria-hidden="true"
          >
            <rect
              x={pos[0] - w / 2}
              y={pos[1] - h / 2}
              width={w}
              height={h}
              rx={h / 2}
              fill="var(--fondo)"
              stroke={borde ?? a.color}
              strokeWidth={1.25}
            />
            <text
              x={pos[0]}
              y={pos[1]}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-mono"
              fontSize={fuenteEtiqueta}
              fontWeight={negrita ? 700 : 500}
              fill={color ?? "var(--texto)"}
            >
              {texto}
            </text>
          </g>
        );
      })}

      {/* Nodos */}
      {nodos.map((n) => (
        <g
          key={n.id}
          className={n.enfocable ? "grafo-foco cursor-pointer" : undefined}
          tabIndex={n.enfocable ? 0 : undefined}
          role={n.enfocable ? "button" : "img"}
          aria-label={n.rotulo}
          aria-pressed={n.enfocable && n.presionado !== undefined ? n.presionado : undefined}
          data-nodo={n.id}
          opacity={n.atenuado ? 0.38 : 1}
          onPointerDown={onNodoPointerDown ? (e) => onNodoPointerDown(n.id, e) : undefined}
          onClick={onNodoClick ? () => onNodoClick(n.id) : undefined}
          onKeyDown={onNodoTecla ? (e) => onNodoTecla(n.id, e) : undefined}
        >
          <g key={String(n.tiembla ?? false)} className={n.tiembla ? "temblor" : undefined}>
            <circle className="anillo" cx={n.p[0]} cy={n.p[1]} r={radio + 5} fill="none" stroke="var(--texto)" strokeWidth={2} />
            <circle
              cx={n.p[0]}
              cy={n.p[1]}
              r={radio}
              fill={n.relleno}
              stroke={n.borde}
              strokeWidth={n.grosor}
              strokeDasharray={n.punteado ? "4 3" : undefined}
            />
            <text
              x={n.p[0]}
              y={n.p[1]}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-sans"
              fontSize={fuenteNodo}
              fontWeight={700}
              fill={n.colorTexto}
            >
              {n.nombre}
            </text>
            {n.prohibido && (
              <g aria-hidden="true" transform={`translate(${n.p[0] + radio * 0.75} ${n.p[1] - radio * 0.75})`}>
                <circle r={8} fill="var(--fondo)" stroke="var(--texto)" strokeWidth={1.75} />
                <line x1={-5} y1={5} x2={5} y2={-5} stroke="var(--texto)" strokeWidth={1.75} />
              </g>
            )}
          </g>
          {n.tag && (
            <g aria-hidden="true">
              <rect
                x={n.p[0] - ([...n.tag.texto].length * 0.6 * fuenteTag + 10) / 2}
                y={n.p[1] + radio + 4}
                width={[...n.tag.texto].length * 0.6 * fuenteTag + 10}
                height={fuenteTag + 8}
                rx={(fuenteTag + 8) / 2}
                fill={n.tag.fondo}
                stroke="var(--t-borde)"
                strokeWidth={0.8}
              />
              <text
                x={n.p[0]}
                y={n.p[1] + radio + 4 + (fuenteTag + 8) / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="font-mono"
                fontSize={fuenteTag}
                fontWeight={600}
                fill={n.tag.color}
              >
                {n.tag.texto}
              </text>
            </g>
          )}
        </g>
      ))}
    </g>
  );
}
