// Editor manual de aristas: replica ingresar_grafo_manual (crear, sobrescribir,
// DESHACER, LISTA, FIN) y agrega eliminar, rehacer y vaciar.
// Todas las funciones son puras: reciben un estado y devuelven uno nuevo.
import { type ResultadoArista, resumenRed, validarArista } from "./entrada.ts";
import { detectarCiclos } from "./grafo.ts";
import { type Matriz, copiarMatriz, listarAristas, matrizCeros, nombreNodo } from "./nombres.ts";

/**
 * Registro del historial. El de tipo "arista" es la tupla de Python
 * (origen, destino, capacidad_anterior) más la capacidad nueva, que necesita Rehacer.
 * Eliminar una arista es un registro "arista" con nuevo = 0.
 */
export type Registro =
  | { tipo: "arista"; origen: number; destino: number; anterior: number; nuevo: number }
  | { tipo: "vaciar"; anterior: Matriz };

export interface EstadoEditor {
  matriz: Matriz;
  historial: Registro[];
  rehacer: Registro[];
}

export type Nivel = "error" | "aviso" | "ok" | "info";

export interface Mensaje {
  nivel: Nivel;
  texto: string;
  /** Elementos del dibujo a los que se refiere el mensaje. */
  origen?: number;
  destino?: number;
  ciclo?: number[];
}

export interface Confirmacion {
  texto: string;
  origen: number;
  destino: number;
  anterior: number;
  capacidad: number;
}

export interface Resultado {
  estado: EstadoEditor;
  mensajes: Mensaje[];
  /** Pregunta "¿Sobrescribir?" pendiente de respuesta. */
  confirmacion?: Confirmacion;
  /** El comando FIN fue aceptado. */
  finalizado?: boolean;
  /** El comando LISTA fue pedido. */
  lista?: boolean;
}

export function editorVacio(n: number): EstadoEditor {
  return { matriz: matrizCeros(n), historial: [], rehacer: [] };
}

export function editorDesdeMatriz(m: Matriz): EstadoEditor {
  return { matriz: copiarMatriz(m), historial: [], rehacer: [] };
}

export function contarAristas(m: Matriz): number {
  return listarAristas(m).length;
}

function aplicarArista(estado: EstadoEditor, origen: number, destino: number, anterior: number, nuevo: number): EstadoEditor {
  const matriz = copiarMatriz(estado.matriz);
  matriz[origen][destino] = nuevo;
  return {
    matriz,
    historial: [...estado.historial, { tipo: "arista", origen, destino, anterior, nuevo }],
    rehacer: [], // una acción nueva vacía Rehacer
  };
}

function mensajeAceptada(origen: number, destino: number, anterior: number, capacidad: number): Mensaje {
  const nomO = nombreNodo(origen);
  const nomD = nombreNodo(destino);
  const texto =
    anterior > 0
      ? `OK: capacidad de ${nomO}->${nomD} actualizada de ${anterior} a ${capacidad}.`
      : `OK: arista ${nomO}->${nomD} (capacidad ${capacidad}) aceptada.`;
  return { nivel: "ok", texto, origen, destino };
}

/** Resultado de validarArista convertido en mensajes / cambios de estado. */
export function procesarValidacion(estado: EstadoEditor, r: ResultadoArista): Resultado {
  switch (r.tipo) {
    case "error":
      return {
        estado,
        mensajes: [{ nivel: "error", texto: r.texto, origen: r.origen, destino: r.destino, ciclo: r.ciclo }],
      };
    case "sin_cambios":
      return { estado, mensajes: [{ nivel: "aviso", texto: r.texto, origen: r.origen, destino: r.destino }] };
    case "confirmar":
      return {
        estado,
        mensajes: [],
        confirmacion: {
          texto: r.texto,
          origen: r.origen,
          destino: r.destino,
          anterior: r.anterior,
          capacidad: r.capacidad,
        },
      };
    case "aceptar":
      return {
        estado: aplicarArista(estado, r.origen, r.destino, r.anterior, r.capacidad),
        mensajes: [mensajeAceptada(r.origen, r.destino, r.anterior, r.capacidad)],
      };
  }
}

/** Una línea de la barra de entrada rápida: arista o comando FIN / DESHACER / LISTA. */
export function procesarLinea(estado: EstadoEditor, linea: string): Resultado {
  const entrada = linea.trim();
  const comando = entrada.toUpperCase();
  if (comando === "FIN") return finalizar(estado);
  if (comando === "LISTA") {
    const { encabezado, listado } = resumenRed(estado.matriz);
    return { estado, mensajes: [{ nivel: "info", texto: `${encabezado}\n${listado}` }], lista: true };
  }
  if (comando === "DESHACER") return deshacer(estado);
  return procesarValidacion(estado, validarArista(estado.matriz, entrada));
}

/** Arista desde el arrastre o el formulario: termina en la misma validación. */
export function crearArista(estado: EstadoEditor, origen: string, destino: string, capacidad: string): Resultado {
  return procesarValidacion(estado, validarArista(estado.matriz, `${origen},${destino},${capacidad}`));
}

/** Respuesta a "¿Sobrescribir?". */
export function responderConfirmacion(estado: EstadoEditor, c: Confirmacion, sobrescribir: boolean): Resultado {
  if (!sobrescribir) {
    return {
      estado,
      mensajes: [
        {
          nivel: "info",
          texto: `Se conserva ${nombreNodo(c.origen)}->${nombreNodo(c.destino)} con capacidad ${c.anterior}.`,
          origen: c.origen,
          destino: c.destino,
        },
      ],
    };
  }
  return {
    estado: aplicarArista(estado, c.origen, c.destino, c.anterior, c.capacidad),
    mensajes: [mensajeAceptada(c.origen, c.destino, c.anterior, c.capacidad)],
  };
}

/** Eliminar una arista (acción nueva). Quitar una arista nunca crea ciclos. */
export function eliminarArista(estado: EstadoEditor, origen: number, destino: number): Resultado {
  const anterior = Math.trunc(estado.matriz[origen][destino]);
  if (anterior <= 0) return { estado, mensajes: [] };
  return {
    estado: aplicarArista(estado, origen, destino, anterior, 0),
    mensajes: [
      {
        nivel: "info",
        texto: `Se eliminó la arista ${nombreNodo(origen)}->${nombreNodo(destino)} (capacidad ${anterior}).`,
        origen,
        destino,
      },
    ],
  };
}

/** Vaciar el grafo (acción nueva, se puede deshacer). */
export function vaciar(estado: EstadoEditor): Resultado {
  const total = contarAristas(estado.matriz);
  if (total === 0) return { estado, mensajes: [] };
  return {
    estado: {
      matriz: matrizCeros(estado.matriz.length),
      historial: [...estado.historial, { tipo: "vaciar", anterior: copiarMatriz(estado.matriz) }],
      rehacer: [],
    },
    mensajes: [{ nivel: "info", texto: `Se vació el grafo (${total} arista(s) quitada(s)).` }],
  };
}

/** DESHACER: mismos mensajes que Python. */
export function deshacer(estado: EstadoEditor): Resultado {
  if (!estado.historial.length) return { estado, mensajes: [{ nivel: "aviso", texto: "No hay acciones para deshacer." }] };
  const registro = estado.historial[estado.historial.length - 1];
  const historial = estado.historial.slice(0, -1);
  const rehacer = [...estado.rehacer, registro];

  if (registro.tipo === "vaciar") {
    const total = contarAristas(registro.anterior);
    return {
      estado: { matriz: copiarMatriz(registro.anterior), historial, rehacer },
      mensajes: [{ nivel: "info", texto: `Se restauraron ${total} arista(s).` }],
    };
  }

  const { origen: u, destino: v, anterior } = registro;
  const matriz = copiarMatriz(estado.matriz);
  matriz[u][v] = anterior;
  const texto =
    anterior > 0
      ? `Se restauró la capacidad de ${nombreNodo(u)}->${nombreNodo(v)} a ${anterior}.`
      : `Se quitó la arista ${nombreNodo(u)}->${nombreNodo(v)}.`;
  return { estado: { matriz, historial, rehacer }, mensajes: [{ nivel: "info", texto, origen: u, destino: v }] };
}

/** REHACER: vuelve a aplicar la última acción deshecha. */
export function rehacer(estado: EstadoEditor): Resultado {
  if (!estado.rehacer.length) return { estado, mensajes: [{ nivel: "aviso", texto: "No hay acciones para rehacer." }] };
  const registro = estado.rehacer[estado.rehacer.length - 1];
  const pila = estado.rehacer.slice(0, -1);
  const historial = [...estado.historial, registro];

  if (registro.tipo === "vaciar") {
    return {
      estado: { matriz: matrizCeros(estado.matriz.length), historial, rehacer: pila },
      mensajes: [{ nivel: "info", texto: "Se vació el grafo otra vez." }],
    };
  }
  const { origen: u, destino: v, nuevo } = registro;
  const matriz = copiarMatriz(estado.matriz);
  matriz[u][v] = nuevo;
  const texto =
    nuevo > 0
      ? `Se rehízo ${nombreNodo(u)}->${nombreNodo(v)} con capacidad ${nuevo}.`
      : `Se volvió a quitar la arista ${nombreNodo(u)}->${nombreNodo(v)}.`;
  return { estado: { matriz, historial, rehacer: pila }, mensajes: [{ nivel: "info", texto, origen: u, destino: v }] };
}

/** Mensaje de FIN cuando aún no hay aristas (también explica el botón Continuar desactivado). */
export const MENSAJE_SIN_ARISTAS = "Error: debe ingresar al menos una arista antes de finalizar.";

/** FIN: exige al menos una arista y hace la comprobación final con detectar_ciclos. */
export function finalizar(estado: EstadoEditor): Resultado {
  const m = estado.matriz;
  if (contarAristas(m) === 0) return { estado, mensajes: [{ nivel: "error", texto: MENSAJE_SIN_ARISTAS }] };
  if (detectarCiclos(m.length, m)) throw new Error("Inconsistencia interna: la red ingresada contiene un ciclo.");
  return {
    estado,
    mensajes: [{ nivel: "ok", texto: `Grafo acíclico validado con éxito (${contarAristas(m)} arista(s)).` }],
    finalizado: true,
  };
}
