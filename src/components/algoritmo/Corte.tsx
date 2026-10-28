"use client";

import { type Punto, lineaCorte } from "@/lib/ff/geometria";

/** Zonas de fondo: lado S (azul suave) y lado T (gris), unidas por las aristas internas. */
export function Zonas({
  pts,
  ladoS,
  aristas,
  radio,
}: {
  pts: ReadonlyMap<number, Punto>;
  ladoS: ReadonlySet<number>;
  aristas: readonly [number, number][];
  radio: number;
}) {
  const r = radio * 1.75;
  const lado = (enS: boolean, color: string) => (
    <g fill={color} stroke={color}>
      {aristas
        .filter(([u, v]) => ladoS.has(u) === enS && ladoS.has(v) === enS)
        .map(([u, v]) => (
          <line
            key={`${u}-${v}`}
            x1={pts.get(u)![0]}
            y1={pts.get(u)![1]}
            x2={pts.get(v)![0]}
            y2={pts.get(v)![1]}
            strokeWidth={r * 1.6}
            strokeLinecap="round"
          />
        ))}
      {[...pts].filter(([u]) => ladoS.has(u) === enS).map(([u, p]) => <circle key={u} cx={p[0]} cy={p[1]} r={r} stroke="none" />)}
    </g>
  );
  return (
    <g aria-hidden="true" data-fondo="">
      {lado(false, "var(--zona-t)")}
      {lado(true, "var(--zona-s)")}
    </g>
  );
}

/** Línea roja discontinua del corte, que rodea los nodos (dibujar_linea_corte). */
export function LineaCorte({
  puntos,
  cuerdas,
  centros,
  radio,
  ancho,
  alto,
  rotulo = true,
}: {
  puntos: Punto[];
  cuerdas: Punto[];
  centros: Punto[];
  radio: number;
  ancho: number;
  alto: number;
  rotulo?: boolean;
}) {
  const linea = lineaCorte(puntos, cuerdas, centros, radio, ancho, alto);
  if (!linea) return null;
  const [fx, fy] = linea.fin;
  const texto = "LÍNEA DE CORTE (S | T)";
  const w = texto.length * 7 + 16;
  const y = Math.min(fy + 6, alto - 24);
  const x = Math.min(Math.max(fx - w / 2, 4), ancho - w - 4);
  return (
    <g aria-hidden="true" pointerEvents="none">
      {linea.tramos.map((t, i) => (
        <polyline
          key={i}
          points={t.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
          fill="none"
          stroke="var(--a-corte)"
          strokeWidth={2.5}
          strokeDasharray="9 6"
          strokeOpacity={0.9}
        />
      ))}
      {rotulo && (
        <g>
          <rect x={x} y={y} width={w} height={20} rx={10} fill="var(--fondo)" stroke="var(--a-corte)" />
          <text x={x + w / 2} y={y + 10} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill="var(--a-corte)" letterSpacing="0.04em">
            {texto}
          </text>
        </g>
      )}
    </g>
  );
}
