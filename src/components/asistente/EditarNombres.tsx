"use client";

import { useState } from "react";
import { letraNodo, nombreNodo, validarNombre } from "@/lib/ff/nombres";

/** Un campo por nodo para cambiarle el nombre (vacío = vuelve al nombre por defecto). */
export default function EditarNombres({ n, onNombre }: { n: number; onNombre: (nodo: number, nombre: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm text-tenue">Nombres de los nodos (máx. 3 caracteres; deja vacío para volver al original)</legend>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: n }, (_, id) => (
          <Campo key={`${id}-${nombreNodo(id)}`} id={id} n={n} onNombre={onNombre} onError={setError} />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-[var(--a-corte)]">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Campo({
  id,
  n,
  onNombre,
  onError,
}: {
  id: number;
  n: number;
  onNombre: (nodo: number, nombre: string) => void;
  onError: (e: string | null) => void;
}) {
  const [texto, setTexto] = useState(nombreNodo(id));
  const guardar = () => {
    const nombre = texto.trim() || letraNodo(id);
    const e = validarNombre(nombre, id, n);
    onError(e);
    if (e) setTexto(nombreNodo(id));
    else onNombre(id, nombre === letraNodo(id) ? "" : nombre);
  };
  return (
    <input
      value={texto}
      maxLength={3}
      placeholder={letraNodo(id)}
      aria-label={`Nombre del nodo ${nombreNodo(id)}`}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="h-9 w-14 rounded-md border border-borde-fuerte bg-fondo text-center font-mono text-[15px] focus:border-texto focus:outline-none"
    />
  );
}
