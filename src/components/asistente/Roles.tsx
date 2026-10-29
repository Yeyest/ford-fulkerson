"use client";

import { useState } from "react";
import type { Matriz } from "@/lib/ff/nombres";
import { nombreNodo } from "@/lib/ff/nombres";
import { type Rol, type Roles, alternarRol } from "@/lib/ff/red";
import Burbuja from "../grafo/Burbuja";
import DibujoRed from "../grafo/DibujoRed";
import { posicionesCuadricula } from "../grafo/escala";
import { estiloNodoBase } from "../grafo/estilos";
import { IconoFuente, IconoSumidero, TAM_ICONO } from "../iconos";
import { Mensaje } from "../ui";

/** Resumen "Fuentes: A, B · Sumideros: H" con el aviso de S / T ficticios. */
export function ResumenRoles({ roles }: { roles: Roles }) {
  const lista = (xs: number[]) => (xs.length ? xs.map((x) => nombreNodo(x)).join(", ") : "—");
  return (
    <div className="flex flex-col gap-1 text-[15px]">
      <p>
        <span className="text-tenue">Fuentes:</span> <span className="font-mono font-semibold">{lista(roles.fuentes)}</span>
        <span className="mx-2 text-tenue">·</span>
        <span className="text-tenue">Sumideros:</span> <span className="font-mono font-semibold">{lista(roles.sumideros)}</span>
      </p>
      {roles.fuentes.length > 1 && <p className="text-tenue">Se creará un origen ficticio S (hay {roles.fuentes.length} fuentes).</p>}
      {roles.sumideros.length > 1 && <p className="text-tenue">Se creará un destino ficticio T (hay {roles.sumideros.length} sumideros).</p>}
    </div>
  );
}

/** Lienzo para marcar fuentes y sumideros con un clic (o Enter / F / K con el teclado). */
export default function MarcarRoles({
  n,
  matriz,
  roles,
  onRoles,
  errores,
}: {
  n: number;
  matriz: Matriz | null;
  roles: Roles;
  onRoles: (r: Roles) => void;
  errores: string[];
}) {
  const [modo, setModo] = useState<Rol>("fuente");
  const [error, setError] = useState<{ nodo: number; texto: string; vez: number } | null>(null);
  const ctx = { fuentes: new Set(roles.fuentes), sumideros: new Set(roles.sumideros), superFuente: null, superSumidero: null };

  const marcar = (nodo: number, rol: Rol) => {
    const r = alternarRol(roles, nodo, rol);
    if (r.error) setError({ nodo, texto: r.error, vez: Date.now() });
    else {
      setError(null);
      onRoles(r.roles);
    }
  };

  const vacia = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const opciones: { rol: Rol; texto: string; color: string; Icono: typeof IconoFuente }[] = [
    { rol: "fuente", texto: "Marcar fuente", color: "var(--n-fuente-borde)", Icono: IconoFuente },
    { rol: "sumidero", texto: "Marcar sumidero", color: "var(--n-sumidero-borde)", Icono: IconoSumidero },
  ];

  return (
    <div className="flex h-full flex-col gap-3">
      <div role="radiogroup" aria-label="Herramienta" className="flex flex-wrap items-center gap-2">
        {opciones.map((o) => (
          <button
            key={o.rol}
            type="button"
            role="radio"
            aria-checked={modo === o.rol}
            onClick={() => setModo(o.rol)}
            className={`flex h-10 items-center gap-2 rounded-md border px-4 text-[15px] ${
              modo === o.rol ? "border-texto bg-texto text-invertido" : "border-borde-fuerte hover:bg-superficie-2"
            }`}
          >
            <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: o.color, background: modo === o.rol ? o.color : "transparent" }} />
            <o.Icono size={TAM_ICONO} aria-hidden="true" className="shrink-0" />
            {o.texto}
          </button>
        ))}
        <span className="text-sm text-tenue">Clic en un nodo para asignar o quitar el rol. Con teclado: Tab hasta el nodo y F (fuente) o K (sumidero).</span>
      </div>

      <div className="relative min-h-[320px] flex-1 rounded-lg border border-borde bg-superficie">
        <DibujoRed
          matriz={matriz ?? vacia}
          etiqueta="Grafo: marcar fuentes y sumideros"
          disponer={(w, h) => ({ pts: posicionesCuadricula(n, w, h) })}
          nodo={(id) => {
            const rol = ctx.fuentes.has(id) ? ", fuente" : ctx.sumideros.has(id) ? ", sumidero" : "";
            return {
              id,
              nombre: nombreNodo(id),
              ...estiloNodoBase(id, ctx),
              rotulo: `Nodo ${nombreNodo(id)}${rol}`,
              enfocable: true,
              tiembla: error?.nodo === id ? error.vez : false,
            };
          }}
          arista={() => ({ color: "var(--a-residual)", ancho: 1.8 })}
          onNodoClick={(id) => marcar(id, modo)}
          onNodoTecla={(id, e) => {
            const k = e.key.toLowerCase();
            if (k === "enter" || k === " ") { e.preventDefault(); marcar(id, modo); }
            if (k === "f") marcar(id, "fuente");
            if (k === "k") marcar(id, "sumidero");
          }}
          encima={({ pts, ancho, alto }) =>
            error && pts.get(error.nodo) ? (
              <Burbuja key={error.vez} p={pts.get(error.nodo)!} ancho={ancho} alto={alto} nivel="error">
                {error.texto}
              </Burbuja>
            ) : null
          }
        />
      </div>

      <div aria-live="polite" className="flex flex-col gap-2">
        <ResumenRoles roles={roles} />
        {error && <span className="sr-only">{error.texto}</span>}
        {errores.map((t) => (
          <Mensaje key={t} nivel="error">
            {t}
          </Mensaje>
        ))}
      </div>
    </div>
  );
}
