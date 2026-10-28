"use client";

import type { ReactNode } from "react";

// Partes del texto de Python que van en fuente monoespaciada: etiquetas [A+, 5],
// conjuntos {A, B}, caminos A → C ← D, fórmulas con f(u,v), c(u,v), Δ, Σ y números.
const PATRON =
  /(\[[^\]]*\]|\{[^}]*\}|(?:[A-Z]\s*[→←]\s*)+[A-Z]|f\(u,v\)\s*[+−-]=\s*Δ|Σ\s*c\(u,v\)|c\(S,T\)|0 ≤ f ≤ c|f = c|f = 0|Δ = \d+|u∈S → v∈T|\d+(?:\s*\+\s*\d+)+(?:\s*=\s*\d+)?)/g;

function Camino({ texto }: { texto: string }) {
  // Flechas coloreadas: → arista directa (naranja), ← arista inversa (magenta)
  const partes = texto.split(/(→|←)/);
  return (
    <span className="font-mono">
      {partes.map((p, i) =>
        p === "→" ? (
          <span key={i} className="font-bold" style={{ color: "var(--a-directo)" }}>
            →
          </span>
        ) : p === "←" ? (
          <span key={i} className="font-bold" style={{ color: "var(--a-inverso)" }}>
            ←
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

function formatearLinea(linea: string, colorearCamino: boolean): ReactNode[] {
  const nodos: ReactNode[] = [];
  let ultimo = 0;
  for (const m of linea.matchAll(PATRON)) {
    const i = m.index ?? 0;
    if (i > ultimo) nodos.push(linea.slice(ultimo, i));
    const t = m[0];
    if (colorearCamino && /[→←]/.test(t) && /^[A-Z]/.test(t)) nodos.push(<Camino key={i} texto={t} />);
    else
      nodos.push(
        <code key={i} className="rounded bg-superficie-2 px-1 font-mono text-[0.92em]">
          {t}
        </code>,
      );
    ultimo = i + t.length;
  }
  if (ultimo < linea.length) nodos.push(linea.slice(ultimo));
  return nodos;
}

/** Descripción del paso tal como la escribe Python, con fórmulas y caminos resaltados. */
export default function TextoPython({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-2 text-[17px] leading-relaxed">
      {texto.split("\n").map((linea, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {formatearLinea(linea, linea.startsWith("Camino aumentante:"))}
        </p>
      ))}
    </div>
  );
}
