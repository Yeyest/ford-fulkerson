// Validaciones de la entrada (iniciar_programa, _parsear_nodo, ingresar_grafo_manual).
// Los textos son exactamente los que imprime el programa en Python.
import { buscarCaminoDirigido } from "./grafo.ts";
import { type Matriz, listarAristas, nombreNodo } from "./nombres.ts";

export const N_MIN = 7;
export const N_MAX = 16;

/** Valor de un dígito decimal Unicode (\p{Nd}), como lo interpreta int() de Python. */
function valorDigito(ch: string): number {
  const codigo = ch.codePointAt(0)!;
  if (codigo >= 48 && codigo <= 57) return codigo - 48;
  let inicio = codigo;
  while (/\p{Nd}/u.test(String.fromCodePoint(inicio - 1))) inicio--;
  return (codigo - inicio) % 10;
}

/** int(texto) de Python para enteros en base 10. Devuelve null si Python lanzaría ValueError. */
export function pyInt(texto: string): number | null {
  const t = texto.trim();
  if (!/^[+-]?\p{Nd}+(?:_\p{Nd}+)*$/u.test(t)) return null;
  let signo = 1;
  let valor = 0;
  for (const ch of t) {
    if (ch === "-") signo = -1;
    else if (ch === "+" || ch === "_") continue;
    else valor = valor * 10 + valorDigito(ch);
  }
  return signo * valor;
}

/** str.isdecimal() de Python. */
function esDecimal(texto: string): boolean {
  return /^\p{Nd}+$/u.test(texto);
}

/** Validación de n en iniciar_programa. Devuelve el mensaje de error de Python o null. */
export function validarCantidadNodos(texto: string): { n: number | null; error: string | null } {
  const n = pyInt(texto);
  if (n === null) return { n: null, error: "Entrada no válida. Ingrese un número entero." };
  if (n < N_MIN || n > N_MAX) return { n, error: "El valor debe estar dentro del rango cerrado [7, 16]." };
  return { n, error: null };
}

/** _parsear_nodo: 'A' / 'a' / '0' → índice del nodo. Lanza Error con el texto de Python. */
export function parsearNodo(texto: string, cantidadNodos: number): number {
  const val = texto.trim().toUpperCase();
  let nodo: number;
  // Primero los nombres que puso el usuario (sin nombres propios, nombreNodo da A, B, … y esto no cambia nada)
  const propio = Array.from({ length: cantidadNodos }, (_, v) => nombreNodo(v)).indexOf(texto.trim());
  if (propio >= 0) return propio;
  if (esDecimal(val)) {
    nodo = pyInt(val)!;
  } else if (val.length === 1 && val >= "A" && val <= "Z") {
    nodo = val.charCodeAt(0) - 65;
  } else {
    throw new Error(`'${texto.trim()}' no es un nodo válido (use una letra A-Z o un número).`);
  }
  if (!(nodo >= 0 && nodo < cantidadNodos)) {
    throw new Error(
      `el nodo '${texto.trim()}' está fuera de rango; los nodos válidos van de ` +
        `A a ${nombreNodo(cantidadNodos - 1)} (0 a ${cantidadNodos - 1}).`,
    );
  }
  return nodo;
}

export type CausaError = "formato" | "nodo" | "capacidad" | "autobucle" | "ciclo";

export type ResultadoArista =
  | { tipo: "error"; causa: CausaError; texto: string; origen?: number; destino?: number; ciclo?: number[] }
  | { tipo: "sin_cambios"; texto: string; origen: number; destino: number }
  | { tipo: "confirmar"; texto: string; origen: number; destino: number; anterior: number; capacidad: number }
  | { tipo: "aceptar"; origen: number; destino: number; anterior: number; capacidad: number };

/**
 * Validación de una arista "origen,destino,capacidad", en el mismo orden que
 * ingresar_grafo_manual: formato → nodos → capacidad → auto-bucle → repetida / ciclo.
 */
export function validarArista(m: Matriz, entrada: string): ResultadoArista {
  const n = m.length;
  const partes = entrada.trim().split(",").map((p) => p.trim());

  // a) Formato
  if (partes.length !== 3 || partes.some((p) => p === "")) {
    return {
      tipo: "error",
      causa: "formato",
      texto: "Error de formato: use exactamente origen,destino,capacidad (ej: A,B,10).",
    };
  }

  // b) Rango de nodos
  let origen: number;
  let destino: number;
  try {
    origen = parsearNodo(partes[0], n);
    destino = parsearNodo(partes[1], n);
  } catch (error) {
    return { tipo: "error", causa: "nodo", texto: `Error: ${(error as Error).message}` };
  }

  const capacidad = pyInt(partes[2]);
  if (capacidad === null) {
    return {
      tipo: "error",
      causa: "capacidad",
      texto: `Error: la capacidad '${partes[2]}' debe ser un número entero (ej: 10).`,
      origen,
      destino,
    };
  }
  if (capacidad <= 0) {
    return { tipo: "error", causa: "capacidad", texto: "Error: la capacidad debe ser un entero mayor a 0.", origen, destino };
  }

  const nomO = nombreNodo(origen);
  const nomD = nombreNodo(destino);

  // c) Auto-bucle
  if (origen === destino) {
    return {
      tipo: "error",
      causa: "autobucle",
      texto:
        `Error: ${nomO}->${nomD} es un auto-bucle (un nodo no puede conectarse consigo mismo). ` +
        `Se ha descartado.`,
      origen,
      destino,
    };
  }

  // d) Arista ya existente
  const anterior = Math.trunc(m[origen][destino]);
  if (anterior > 0) {
    if (anterior === capacidad) {
      return {
        tipo: "sin_cambios",
        texto: `Aviso: la arista ${nomO}->${nomD} ya existe con capacidad ${anterior}. Sin cambios.`,
        origen,
        destino,
      };
    }
    return {
      tipo: "confirmar",
      texto:
        `Aviso: la arista ${nomO}->${nomD} ya existe con capacidad ${anterior}. ` +
        `¿Sobrescribir con ${capacidad}? (S/N): `,
      origen,
      destino,
      anterior,
      capacidad,
    };
  }

  // e) ¿Crearía un ciclo? Añadir origen->destino cierra un ciclo si destino ya alcanza a origen.
  const camino = buscarCaminoDirigido(m, destino, origen);
  if (camino !== null) {
    const ciclo = [origen, ...camino];
    return {
      tipo: "error",
      causa: "ciclo",
      texto:
        `Error: La arista ${nomO}->${nomD} crearía un ciclo con las aristas ya ` +
        `ingresadas (${ciclo.map((x) => nombreNodo(x)).join(" → ")}). Se ha descartado.`,
      origen,
      destino,
      ciclo,
    };
  }

  return { tipo: "aceptar", origen, destino, anterior, capacidad };
}

/** Respuesta a la confirmación (_confirmar_si_no): true / false / null si no es S ni N. */
export function interpretarSiNo(respuesta: string): boolean | null {
  const r = respuesta.trim().toUpperCase();
  if (["S", "SI", "SÍ", "Y", "YES"].includes(r)) return true;
  if (["N", "NO"].includes(r)) return false;
  return null;
}

/** mostrar_resumen_red (sin el ajuste de línea de la consola). */
export function resumenRed(m: Matriz): { encabezado: string; listado: string } {
  const aristas = listarAristas(m);
  const encabezado = `── Red actual: ${aristas.length} arista(s) aceptada(s) ──`;
  const listado = aristas.length
    ? aristas.map(([u, v]) => `${nombreNodo(u)}->${nombreNodo(v)}(${Math.trunc(m[u][v])})`).join(", ")
    : "(todavía no hay aristas)";
  return { encabezado, listado };
}
