"use client";

import { useMemo, useState } from "react";
import { MENSAJE_SIN_ARISTAS, contarAristas, finalizar } from "@/lib/ff/editor";
import { calcularPosicionesNodos } from "@/lib/ff/layout";
import { type Matriz, nombreNodo } from "@/lib/ff/nombres";
import type { Roles } from "@/lib/ff/red";
import EditorManual from "../editor/EditorManual";
import DibujoRed, { type Disposicion } from "../grafo/DibujoRed";
import { bandas, crearEscala, orientacionPara, posicionesCuadricula } from "../grafo/escala";
import { estiloNodoBase } from "../grafo/estilos";
import { Boton, Mensaje } from "../ui";
import { ICONO_ETAPA } from "../iconos";
import type { PropsPaso } from "./Asistente";
import Pie from "./Pie";

/** Disposición por capas (calcular_posiciones_nodos) escalada al lienzo. */
export function useDisposicionCapas(matriz: Matriz, roles: Roles) {
  const layout = useMemo(
    () => calcularPosicionesNodos(matriz.length, matriz, roles.fuentes, roles.sumideros),
    // La disposición se fija al abrir la vista: no se mueve mientras se edita
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (w: number, h: number): Disposicion => {
    const e = crearEscala(w, h, orientacionPara(w, h));
    return { pts: new Map([...layout.posiciones].map(([k, p]) => [k, e.a(p)])), bandas: bandas(layout.encabezados, e), orientacion: e.orientacion };
  };
}

function GrafoAleatorio({ estado }: Pick<PropsPaso, "estado">) {
  const m = estado.aleatorio.editor.matriz;
  const ctx = { fuentes: new Set(estado.roles.fuentes), sumideros: new Set(estado.roles.sumideros), superFuente: null, superSumidero: null };
  const disponer = useDisposicionCapas(m, estado.roles);
  return (
    <DibujoRed
      key={estado.aleatorio.semilla ?? 0}
      matriz={m}
      etiqueta="Grafo aleatorio generado"
      disponer={disponer}
      nodo={(id) => ({ id, nombre: nombreNodo(id), ...estiloNodoBase(id, ctx), rotulo: `Nodo ${nombreNodo(id)}` })}
      arista={() => ({ color: "var(--a-residual)", ancho: 2 })}
    />
  );
}

function EditorDelAleatorio({ estado, despachar, onFin }: Pick<PropsPaso, "estado" | "despachar"> & { onFin: () => void }) {
  const ctx = { fuentes: new Set(estado.roles.fuentes), sumideros: new Set(estado.roles.sumideros), superFuente: null, superSumidero: null };
  const disponer = useDisposicionCapas(estado.aleatorio.editor.matriz, estado.roles);
  return (
    <EditorManual
      editor={estado.aleatorio.editor}
      onEditor={(editor) => despachar({ tipo: "editorAleatorio", editor })}
      disponer={disponer}
      estiloNodo={(id) => estiloNodoBase(id, ctx)}
      onFin={onFin}
    />
  );
}

export default function PasoGrafo({ estado, despachar, onSiguiente, onAnterior }: PropsPaso) {
  const manual = estado.modo === "manual";
  const editor = manual ? estado.manual : estado.aleatorio.editor;
  const sinAristas = contarAristas(editor.matriz) === 0;
  const [error, setError] = useState<string | null>(null);
  const ctx = { fuentes: new Set(estado.roles.fuentes), sumideros: new Set(estado.roles.sumideros), superFuente: null, superSumidero: null };

  const continuar = () => {
    try {
      const r = finalizar(editor);
      if (!r.finalizado) return setError(r.mensajes[0].texto);
      onSiguiente(manual ? r.mensajes[0].texto : estado.aleatorio.editando ? r.mensajes[0].texto : "Grafo aleatorio generado correctamente.");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ICONO_ETAPA.grafo size={20} aria-hidden="true" className="shrink-0" />
              {manual ? "Construye las aristas" : estado.aleatorio.editando ? "Editar el grafo generado" : "Grafo aleatorio"}
            </h1>
            <p className="mt-2 max-w-3xl text-tenue">
              {manual || estado.aleatorio.editando
                ? "Cada arista se valida al instante; si crea un ciclo se descarta y la red sigue válida."
                : "DAG por capas: fuentes → capas intermedias → sumideros, con capacidades entre 5 y 25."}
            </p>
          </div>
          {!manual && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-tenue">semilla {estado.aleatorio.semilla}</span>
              <Boton onClick={() => despachar({ tipo: "generar" })}>↻ Regenerar</Boton>
              {!estado.aleatorio.editando && (
                <Boton variante="primario" onClick={() => despachar({ tipo: "editarAleatorio", editando: true })}>
                  Editar este grafo
                </Boton>
              )}
            </div>
          )}
        </div>

        {error && <Mensaje nivel="error">{error}</Mensaje>}

        {manual ? (
          <EditorManual
            editor={estado.manual}
            onEditor={(e) => (despachar({ tipo: "editorManual", editor: e }), setError(null))}
            disponer={(w, h) => ({ pts: posicionesCuadricula(estado.n, w, h) })}
            estiloNodo={(id) => estiloNodoBase(id, ctx)}
            onFin={continuar}
          />
        ) : estado.aleatorio.editando ? (
          <EditorDelAleatorio key={estado.aleatorio.semilla ?? 0} estado={estado} despachar={despachar} onFin={continuar} />
        ) : (
          <div className="flex min-h-[380px] flex-1 flex-col gap-3">
            <Mensaje nivel="ok" className="self-start">
              Grafo aleatorio generado correctamente.
            </Mensaje>
            <div className="flex-1 rounded-lg border border-borde bg-superficie">
              <GrafoAleatorio key={estado.aleatorio.semilla ?? 0} estado={estado} />
            </div>
          </div>
        )}
      </div>
      <Pie
        onAnterior={onAnterior}
        onContinuar={continuar}
        deshabilitado={sinAristas}
        explicacion={MENSAJE_SIN_ARISTAS}
      />
    </>
  );
}
