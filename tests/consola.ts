// Simula la consola de ingresar_grafo_manual usando las funciones del editor web,
// para comparar línea por línea con lo que imprime el programa en Python.
import { interpretarSiNo, resumenRed } from "../src/lib/ff/entrada.ts";
import { type EstadoEditor, deshacer, editorVacio, finalizar, procesarLinea, responderConfirmacion } from "../src/lib/ff/editor.ts";
import type { Matriz } from "../src/lib/ff/nombres.ts";

const PROMPT = "PROMPT:Arista (origen,destino,capacidad): ";

/** textwrap.fill(texto, 72, initial_indent="   ", subsequent_indent="   ") */
function rellenar(texto: string): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    if (!actual) actual = "   " + palabra;
    else if (actual.length + 1 + palabra.length <= 72) actual += " " + palabra;
    else {
      lineas.push(actual);
      actual = "   " + palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function resumen(m: Matriz): string[] {
  const { encabezado, listado } = resumenRed(m);
  if (listado === "(todavía no hay aristas)") return [`   ${encabezado}`, `   ${listado}`];
  return [`   ${encabezado}`, ...rellenar(listado)];
}

export function simularConsola(n: number, entradas: string[]): { lineas: string[]; matriz: Matriz | null; error: string | null } {
  const pendientes = [...entradas];
  const lineas: string[] = [];
  let estado: EstadoEditor = editorVacio(n);

  while (true) {
    lineas.push(PROMPT);
    if (!pendientes.length) {
      lineas.push("");
      return { lineas, matriz: null, error: "AGOTADO" };
    }
    const linea = pendientes.shift()!;
    const comando = linea.trim().toUpperCase();

    if (comando === "FIN") {
      const r = finalizar(estado);
      if (r.finalizado) {
        lineas.push("", r.mensajes[0].texto, "");
        return { lineas, matriz: estado.matriz, error: null };
      }
      lineas.push(...r.mensajes.map((m) => m.texto));
      continue;
    }
    if (comando === "LISTA") {
      lineas.push(...resumen(estado.matriz));
      continue;
    }
    if (comando === "DESHACER") {
      const habia = estado.historial.length > 0;
      const r = deshacer(estado);
      estado = r.estado;
      lineas.push(...r.mensajes.map((m) => m.texto));
      if (habia) lineas.push(...resumen(estado.matriz));
      continue;
    }

    const r = procesarLinea(estado, linea);
    if (r.confirmacion) {
      let respuesta: boolean | null = null;
      while (respuesta === null) {
        lineas.push(`PROMPT:${r.confirmacion.texto}`);
        if (!pendientes.length) {
          lineas.push("");
          return { lineas, matriz: null, error: "AGOTADO" };
        }
        respuesta = interpretarSiNo(pendientes.shift()!);
        if (respuesta === null) lineas.push("   Responda S (sí) o N (no).");
      }
      const r2 = responderConfirmacion(estado, r.confirmacion, respuesta);
      estado = r2.estado;
      lineas.push(...r2.mensajes.map((m) => m.texto));
      if (respuesta) lineas.push(...resumen(estado.matriz));
      continue;
    }
    estado = r.estado;
    lineas.push(...r.mensajes.map((m) => m.texto));
    if (r.mensajes.some((m) => m.nivel === "ok")) lineas.push(...resumen(estado.matriz));
  }
}
