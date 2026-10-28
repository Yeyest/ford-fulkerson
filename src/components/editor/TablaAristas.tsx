"use client";

import { useEffect, useRef, useState } from "react";
import { resumenRed } from "@/lib/ff/entrada";
import { type Matriz, listarAristas, nombreNodo } from "@/lib/ff/nombres";

/** Tabla de aristas siempre visible (equivale a LISTA / mostrar_resumen_red). */
export default function TablaAristas({
  matriz,
  destacar,
  onEditar,
  onEliminar,
}: {
  matriz: Matriz;
  destacar: number;
  onEditar: (u: number, v: number, valor: string) => void;
  onEliminar: (u: number, v: number) => void;
}) {
  const aristas = listarAristas(matriz);
  const [editando, setEditando] = useState<{ clave: string; valor: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { encabezado } = resumenRed(matriz);

  useEffect(() => {
    if (destacar) ref.current?.focus();
  }, [destacar]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={`flex flex-col rounded-lg border p-4 ${destacar ? "aparecer border-texto" : "border-borde"}`}
      key={destacar}
    >
      <h2 className="text-sm font-semibold">{encabezado.replace(/─/g, "").trim()}</h2>
      {aristas.length === 0 ? (
        <p className="mt-2 text-sm text-tenue">(todavía no hay aristas)</p>
      ) : (
        <table className="mt-2 w-full text-[15px]">
          <thead className="sr-only">
            <tr>
              <th>Arista</th>
              <th>Capacidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody className="lg:max-h-[40vh]">
            {aristas.map(([u, v]) => {
              const clave = `${u}-${v}`;
              const enEdicion = editando?.clave === clave;
              return (
                <tr key={clave} className="border-b border-borde last:border-0">
                  <td className="py-1.5 font-mono">
                    {nombreNodo(u)} → {nombreNodo(v)}
                  </td>
                  <td className="py-1.5 text-right font-mono">
                    {enEdicion ? (
                      <input
                        autoFocus
                        aria-label={`Nueva capacidad de ${nombreNodo(u)} a ${nombreNodo(v)}`}
                        className="h-8 w-16 rounded border border-texto bg-fondo px-1 text-right font-mono"
                        value={editando.valor}
                        onChange={(e) => setEditando({ clave, valor: e.target.value })}
                        onBlur={() => setEditando(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onEditar(u, v, editando.valor);
                            setEditando(null);
                          }
                          if (e.key === "Escape") setEditando(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 hover:bg-superficie-2"
                        aria-label={`Editar capacidad de ${nombreNodo(u)} a ${nombreNodo(v)} (${matriz[u][v]})`}
                        onClick={() => setEditando({ clave, valor: String(matriz[u][v]) })}
                      >
                        {matriz[u][v]}
                      </button>
                    )}
                  </td>
                  <td className="w-8 py-1.5 text-right">
                    <button
                      type="button"
                      aria-label={`Eliminar arista ${nombreNodo(u)} a ${nombreNodo(v)}`}
                      className="rounded p-1 text-tenue hover:bg-superficie-2 hover:text-[var(--a-corte)]"
                      onClick={() => onEliminar(u, v)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
