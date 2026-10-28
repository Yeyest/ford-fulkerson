"use client";

import { useState } from "react";
import { nombreNodo } from "@/lib/ff/nombres";

/** Entrada rápida con el formato de Python: A,B,10 o 0,1,10 (y FIN / DESHACER / LISTA). */
export default function BarraRapida({ n, onLinea }: { n: number; onLinea: (linea: string) => boolean }) {
  const [texto, setTexto] = useState("");
  const ultimo = nombreNodo(n - 1);
  return (
    <form
      className="flex items-center gap-2 rounded-lg border border-borde-fuerte bg-fondo px-3 focus-within:border-texto"
      onSubmit={(e) => {
        e.preventDefault();
        if (onLinea(texto)) setTexto("");
      }}
    >
      <span className="font-mono text-tenue" aria-hidden="true">
        &gt;
      </span>
      <label htmlFor="barra-rapida" className="sr-only">
        Arista (origen,destino,capacidad). Comandos: FIN, DESHACER, LISTA
      </label>
      <input
        id="barra-rapida"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder={`origen,destino,capacidad   ej: A,B,10  o  0,1,10   (A-${ultimo} / 0-${n - 1})`}
        className="h-11 min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none placeholder:text-tenue"
      />
      <span className="hidden font-mono text-xs text-tenue md:inline">FIN · DESHACER · LISTA</span>
      <button type="submit" className="rounded-md bg-texto px-3 py-1.5 text-sm font-medium text-invertido">
        Agregar
      </button>
    </form>
  );
}
