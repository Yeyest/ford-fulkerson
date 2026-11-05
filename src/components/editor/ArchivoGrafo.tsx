"use client";

import { Check, ClipboardPaste, Copy } from "lucide-react";
import { type Dispatch, useState } from "react";
import { type GrafoImportado, grafoATexto, textoAGrafo } from "@/lib/ff/archivo";
import { contarAristas } from "@/lib/ff/editor";
import type { Accion, Estado } from "../estado";
import { TAM_ICONO } from "../iconos";
import { Boton, Mensaje } from "../ui";

/**
 * El grafo manual como texto: se copia para compartirlo y se pega para cargar uno.
 * Mientras no se escriba nada, el cuadro muestra el grafo actual y se actualiza solo.
 */
export default function TextoDelGrafo({ estado, despachar }: { estado: Estado; despachar: Dispatch<Accion> }) {
  const actual = grafoATexto(estado.manual.matriz, estado.nombres);
  /** Texto escrito o pegado por el usuario; null = mostrar el grafo actual. */
  const [borrador, setBorrador] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ nivel: "ok" | "error"; texto: string } | null>(null);
  /** Grafo leído que espera confirmación porque reemplazaría aristas ya creadas. */
  const [pendiente, setPendiente] = useState<GrafoImportado | null>(null);
  const [copiado, setCopiado] = useState(false);

  const texto = borrador ?? actual;
  const editado = borrador !== null && borrador.trim() !== actual;
  const aristasActuales = contarAristas(estado.manual.matriz);
  const lineas = Math.min(Math.max(texto.split("\n").length, 4), 12);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setAviso({ nivel: "error", texto: "No se pudo copiar automáticamente: selecciona el texto y cópialo con Ctrl+C." });
    }
  };

  const cargar = (g: GrafoImportado) => {
    despachar({ tipo: "importar", grafo: g });
    setPendiente(null);
    setBorrador(null);
    setAviso({ nivel: "ok", texto: `Grafo cargado: ${g.n} nodos y ${contarAristas(g.matriz)} aristas.` });
  };

  const leer = () => {
    setPendiente(null);
    const r = textoAGrafo(texto);
    if (!r.ok) return setAviso({ nivel: "error", texto: `No se cargó el grafo. ${r.error}` });
    setAviso(null);
    if (aristasActuales > 0) setPendiente(r.grafo);
    else cargar(r.grafo);
  };

  return (
    <details className="group rounded-lg border border-borde bg-fondo">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        <ClipboardPaste size={TAM_ICONO - 2} aria-hidden="true" className="shrink-0" />
        Compartir o cargar el grafo como texto
        <span className="ml-auto text-tenue transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-borde px-3 py-3">
        <p className="text-sm text-tenue">
          Copia este texto para compartir el grafo, o pega aquí el de otra persona y pulsa «Cargar». Formato: la línea{" "}
          <code className="rounded bg-superficie-2 px-1 font-mono">nodos: A, B, …</code> y luego una arista por línea{" "}
          <code className="rounded bg-superficie-2 px-1 font-mono">origen,destino,capacidad</code>.
        </p>
        <label htmlFor="texto-grafo" className="sr-only">
          Texto del grafo
        </label>
        <textarea
          id="texto-grafo"
          value={texto}
          rows={lineas}
          spellCheck={false}
          onChange={(e) => {
            setBorrador(e.target.value);
            setPendiente(null);
            setAviso(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              leer();
            }
          }}
          className="w-full resize-y rounded-md border border-borde-fuerte bg-superficie px-3 py-2 font-mono text-sm leading-relaxed focus:border-texto focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Boton tam="sm" onClick={copiar}>
            {copiado ? <Check size={TAM_ICONO - 2} aria-hidden="true" /> : <Copy size={TAM_ICONO - 2} aria-hidden="true" />}
            {copiado ? "Copiado" : "Copiar"}
          </Boton>
          <Boton tam="sm" variante="primario" onClick={leer} disabled={!editado} title="Ctrl+Enter">
            Cargar
          </Boton>
          {borrador !== null && (
            <Boton
              tam="sm"
              variante="fantasma"
              onClick={() => {
                setBorrador(null);
                setPendiente(null);
                setAviso(null);
              }}
            >
              Volver al grafo actual
            </Boton>
          )}
          {pendiente && (
            <span role="alertdialog" aria-label="Confirmar carga" className="aparecer flex flex-wrap items-center gap-2 text-sm">
              ¿Reemplazar el grafo actual ({aristasActuales} aristas)?
              <Boton tam="sm" variante="primario" autoFocus onClick={() => cargar(pendiente)}>
                Reemplazar
              </Boton>
              <Boton tam="sm" variante="fantasma" onClick={() => setPendiente(null)}>
                Cancelar
              </Boton>
            </span>
          )}
        </div>
        <div aria-live="polite">
          {copiado && <span className="sr-only">Texto copiado</span>}
          {aviso && (
            <Mensaje nivel={aviso.nivel} className="aparecer">
              {aviso.texto}
            </Mensaje>
          )}
        </div>
      </div>
    </details>
  );
}
