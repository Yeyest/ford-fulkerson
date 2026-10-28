// Estado global de la app (asistente + pantalla del algoritmo).
import { type EstadoEditor, editorDesdeMatriz, editorVacio } from "@/lib/ff/editor";
import { validarCantidadNodos } from "@/lib/ff/entrada";
import { generarGrafoAleatorio } from "@/lib/ff/grafo";
import type { Matriz } from "@/lib/ff/nombres";
import { PyRandom } from "@/lib/ff/pyrandom";
import type { Roles } from "@/lib/ff/red";

export type Modo = "aleatorio" | "manual";
export type Etapa = "nodos" | "modo" | "roles" | "grafo" | "revision";

export interface Estado {
  pantalla: "asistente" | "algoritmo";
  etapa: Etapa;
  nTexto: string;
  n: number;
  modo: Modo | null;
  roles: Roles;
  manual: EstadoEditor;
  aleatorio: {
    editor: EstadoEditor;
    semilla: number | null;
    /** n y roles con los que se generó el grafo; si cambian, se genera otro. */
    clave: string | null;
    editando: boolean;
  };
  /** Mensaje de la última transición (por ejemplo "Grafo acíclico validado…"). */
  aviso: string | null;
}

export const ESTADO_INICIAL: Estado = {
  pantalla: "asistente",
  etapa: "nodos",
  nTexto: "8",
  n: 8,
  modo: null,
  roles: { fuentes: [], sumideros: [] },
  manual: editorVacio(8),
  aleatorio: { editor: editorVacio(8), semilla: null, clave: null, editando: false },
  aviso: null,
};

export function etapasDe(modo: Modo | null): Etapa[] {
  return modo === "manual" ? ["nodos", "modo", "grafo", "roles", "revision"] : ["nodos", "modo", "roles", "grafo", "revision"];
}

export const NOMBRE_ETAPA: Record<Etapa, string> = {
  nodos: "Nodos",
  modo: "Modo",
  roles: "Fuentes y sumideros",
  grafo: "Grafo",
  revision: "Revisión",
};

export function matrizActual(e: Estado): Matriz {
  return e.modo === "manual" ? e.manual.matriz : e.aleatorio.editor.matriz;
}

export function claveAleatorio(e: Pick<Estado, "n" | "roles">): string {
  return JSON.stringify([e.n, e.roles.fuentes, e.roles.sumideros]);
}

function redimensionar(ed: EstadoEditor, n: number): EstadoEditor {
  const m = Array.from({ length: n }, (_, u) => Array.from({ length: n }, (_, v) => ed.matriz[u]?.[v] ?? 0));
  return editorDesdeMatriz(m);
}

export type Accion =
  | { tipo: "nTexto"; texto: string }
  | { tipo: "modo"; modo: Modo }
  | { tipo: "ir"; etapa: Etapa; aviso?: string | null }
  | { tipo: "roles"; roles: Roles }
  | { tipo: "editorManual"; editor: EstadoEditor }
  | { tipo: "editorAleatorio"; editor: EstadoEditor }
  | { tipo: "generar"; semilla?: number }
  | { tipo: "editarAleatorio"; editando: boolean }
  | { tipo: "ejecutar" }
  | { tipo: "volverAEditar" }
  | { tipo: "reiniciar" };

export function reductor(e: Estado, a: Accion): Estado {
  switch (a.tipo) {
    case "nTexto": {
      const { n, error } = validarCantidadNodos(a.texto);
      if (error || n === null || n === e.n) return { ...e, nTexto: a.texto };
      return {
        ...e,
        nTexto: a.texto,
        n,
        roles: { fuentes: e.roles.fuentes.filter((x) => x < n), sumideros: e.roles.sumideros.filter((x) => x < n) },
        manual: redimensionar(e.manual, n),
        aleatorio: { ...e.aleatorio, editor: redimensionar(e.aleatorio.editor, n), clave: null },
      };
    }
    case "modo":
      return { ...e, modo: a.modo };
    case "ir":
      return { ...e, etapa: a.etapa, aviso: a.aviso ?? null };
    case "roles":
      return { ...e, roles: a.roles };
    case "editorManual":
      return { ...e, manual: a.editor };
    case "editorAleatorio":
      return { ...e, aleatorio: { ...e.aleatorio, editor: a.editor } };
    case "generar": {
      const semilla = a.semilla ?? Math.floor(Math.random() * 0x7fffffff);
      const m = generarGrafoAleatorio(e.n, e.roles.fuentes, e.roles.sumideros, new PyRandom(semilla));
      return { ...e, aleatorio: { editor: editorDesdeMatriz(m), semilla, clave: claveAleatorio(e), editando: false } };
    }
    case "editarAleatorio":
      return { ...e, aleatorio: { ...e.aleatorio, editando: a.editando } };
    case "ejecutar":
      return { ...e, pantalla: "algoritmo" };
    case "volverAEditar":
      return { ...e, pantalla: "asistente", etapa: "grafo", aviso: null };
    case "reiniciar":
      return ESTADO_INICIAL;
  }
}
