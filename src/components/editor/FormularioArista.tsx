"use client";

import { useState } from "react";
import { nombreNodo } from "@/lib/ff/nombres";
import { Boton } from "../ui";

/** Formulario accesible: origen, destino y capacidad. */
export default function FormularioArista({ n, onAgregar }: { n: number; onAgregar: (o: string, d: string, c: string) => void }) {
  const [origen, setOrigen] = useState("A");
  const [destino, setDestino] = useState("B");
  const [capacidad, setCapacidad] = useState("");
  const nodos = Array.from({ length: n }, (_, i) => nombreNodo(i));
  // Si se renombró el nodo elegido, se usa el que muestra el select
  const o = nodos.includes(origen) ? origen : nodos[0];
  const d = nodos.includes(destino) ? destino : nodos[1];
  const campo = "h-10 w-full rounded-md border border-borde-fuerte bg-fondo px-2 font-mono text-[15px]";

  return (
    <form
      className="rounded-lg border border-borde p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onAgregar(o, d, capacidad);
      }}
    >
      <h2 className="mb-3 text-sm font-semibold">Nueva arista</h2>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="text-xs text-tenue">
          Origen
          <select className={campo} value={o} onChange={(e) => setOrigen(e.target.value)}>
            {nodos.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-tenue" aria-hidden="true">
          →
        </span>
        <label className="text-xs text-tenue">
          Destino
          <select className={campo} value={d} onChange={(e) => setDestino(e.target.value)}>
            {nodos.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-xs text-tenue">
        Capacidad
        <input className={campo} inputMode="numeric" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} placeholder="ej: 10" />
      </label>
      <Boton type="submit" variante="primario" tam="sm" className="mt-3 w-full">
        Agregar arista
      </Boton>
    </form>
  );
}
