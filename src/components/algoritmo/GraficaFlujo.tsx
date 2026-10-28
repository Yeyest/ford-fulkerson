"use client";

import type { Paso } from "@/lib/ff/algoritmo";

/** Pequeña gráfica escalonada del flujo total, iteración tras iteración. */
export default function GraficaFlujo({ pasos, actual }: { pasos: Paso[]; actual: number }) {
  const W = 220;
  const H = 56;
  const max = Math.max(...pasos.map((p) => p.flujo_total), 1);
  const x = (i: number) => 4 + (i / Math.max(pasos.length - 1, 1)) * (W - 8);
  const y = (v: number) => H - 6 - (v / max) * (H - 14);
  const trazo = (hasta: number) => {
    let d = `M${x(0)},${y(pasos[0].flujo_total)}`;
    for (let i = 1; i <= hasta; i++) d += ` H${x(i)} V${y(pasos[i].flujo_total)}`;
    return d;
  };
  const actualF = pasos[actual].flujo_total;
  return (
    <figure className="flex shrink-0 items-center gap-2" aria-label={`Flujo total: ${actualF} de un máximo de ${max}`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="overflow-visible">
        <line x1={4} x2={W - 4} y1={y(max)} y2={y(max)} stroke="var(--borde)" strokeDasharray="3 3" />
        <line x1={4} x2={W - 4} y1={H - 6} y2={H - 6} stroke="var(--borde)" />
        <path d={trazo(pasos.length - 1)} fill="none" stroke="var(--borde-fuerte)" strokeWidth={2} />
        <path d={trazo(actual)} fill="none" stroke="var(--texto)" strokeWidth={2} />
        <circle cx={x(actual)} cy={y(actualF)} r={4} fill="var(--texto)" />
        <text x={W - 4} y={y(max) - 4} textAnchor="end" fontSize={10} className="font-mono" fill="var(--tenue)">
          {max}
        </text>
      </svg>
      <figcaption className="hidden text-xs text-tenue xl:block">
        flujo
        <br />
        total
      </figcaption>
    </figure>
  );
}
