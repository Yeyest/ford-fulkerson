"use client";

import type { ReactNode } from "react";
import type { Punto } from "@/lib/ff/geometria";
import type { Nivel } from "@/lib/ff/editor";
import { Mensaje } from "../ui";

const ANCHO = 300;

/** Mensaje que aparece junto a un nodo o una arista del dibujo. */
export default function Burbuja({
  p,
  ancho,
  alto,
  nivel,
  children,
  separacion = 26,
  interactiva = false,
}: {
  p: Punto;
  ancho: number;
  alto: number;
  nivel: Nivel;
  children: ReactNode;
  separacion?: number;
  /** Solo las burbujas con botones reciben clics; las demás dejan pasar los toques. */
  interactiva?: boolean;
}) {
  const w = Math.min(ANCHO, ancho - 16);
  const x = Math.min(Math.max(p[0] - w / 2, 8), ancho - w - 8);
  const abajo = p[1] < alto * 0.55;
  const h = 220;
  const y = abajo ? p[1] + separacion : p[1] - separacion - h;
  return (
    <foreignObject x={x} y={y} width={w} height={h} style={{ pointerEvents: "none", overflow: "visible" }}>
      <div className={`flex h-full ${abajo ? "items-start" : "items-end"}`}>
        <div className="aparecer w-full shadow-[0_1px_0_var(--borde)]" style={{ pointerEvents: interactiva ? "auto" : "none" }}>
          <Mensaje nivel={nivel}>{children}</Mensaje>
        </div>
      </div>
    </foreignObject>
  );
}
