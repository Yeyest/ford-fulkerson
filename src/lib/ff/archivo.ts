// Compartir el grafo del editor manual como texto plano: se copia, se pega en un chat
// o un documento, y otra persona lo vuelve a cargar pegándolo en la app.
//
//   nodos: A, B, Lim, D, E, F, G, H
//   A,B,10
//   B,Lim,5
//
// La primera línea da el nombre de los nodos (en orden); cada línea siguiente es una
// arista "origen,destino,capacidad", el mismo formato de la barra rápida del editor.
import { N_MAX, N_MIN } from "./entrada.ts";
import { buscarCaminoDirigido } from "./grafo.ts";
import { type Matriz, errorFormatoNombre, letraNodo, listarAristas, matrizCeros } from "./nombres.ts";

/** Grafo leído del texto, listo para cargar en la app. */
export interface GrafoImportado {
  n: number;
  /** "" = nombre por defecto (A, B, …), igual que en el estado de la app. */
  nombres: string[];
  matriz: Matriz;
}

const nombreEfectivo = (nombres: readonly string[], u: number) => nombres[u] || letraNodo(u);

/** Texto del grafo: la lista de nodos y una arista por línea. */
export function grafoATexto(matriz: Matriz, nombres: readonly string[]): string {
  const n = matriz.length;
  const nom = (u: number) => nombreEfectivo(nombres, u);
  const lineas = [`nodos: ${Array.from({ length: n }, (_, u) => nom(u)).join(", ")}`];
  for (const [u, v] of listarAristas(matriz)) lineas.push(`${nom(u)},${nom(v)},${matriz[u][v]}`);
  return lineas.join("\n");
}

export type ResultadoTexto = { ok: true; grafo: GrafoImportado } | { ok: false; error: string };

const fallo = (error: string): ResultadoTexto => ({ ok: false, error });
const LINEA_NODOS = /^nodos?\s*[:=]\s*(.*)$/i;

/** Lee el texto de un grafo. Nunca lanza: devuelve el primer error con su número de línea. */
export function textoAGrafo(texto: string): ResultadoTexto {
  let listaNodos: string[] | null = null;
  const aristas: { linea: number; partes: string[] }[] = [];

  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/);
  for (const [i, cruda] of lineas.entries()) {
    const linea = cruda.trim();
    const num = i + 1;
    if (!linea || linea.startsWith("#") || linea.toUpperCase() === "FIN") continue;
    const nodos = LINEA_NODOS.exec(linea);
    if (nodos) {
      if (listaNodos) return fallo(`Línea ${num}: la lista de nodos aparece dos veces.`);
      listaNodos = nodos[1].split(",").map((x) => x.trim());
      continue;
    }
    const partes = linea.split(",").map((x) => x.trim());
    if (partes.length !== 3 || partes.some((p) => !p))
      return fallo(`Línea ${num}: «${linea}» no es una arista; usa origen,destino,capacidad (ej: A,B,10).`);
    aristas.push({ linea: num, partes });
  }
  if (!listaNodos && !aristas.length) return fallo("El texto está vacío: pega la lista de nodos y las aristas.");

  // Nodos: los de la lista o, si no hay lista, A, B, C… hasta la última letra usada
  let nombresVisibles: string[];
  if (listaNodos) {
    const n = listaNodos.length;
    if (n < N_MIN || n > N_MAX) return fallo(`La lista de nodos debe tener entre ${N_MIN} y ${N_MAX} nombres (tiene ${n}).`);
    for (const [u, t] of listaNodos.entries()) {
      const error = errorFormatoNombre(t);
      if (error) return fallo(`Nodo ${u + 1} («${t}»): ${error}`);
      if (listaNodos.indexOf(t) !== u) return fallo(`Hay dos nodos llamados ${t}.`);
    }
    nombresVisibles = listaNodos;
  } else {
    let mayor = N_MIN - 1;
    for (const { linea, partes } of aristas)
      for (const p of partes.slice(0, 2)) {
        const u = /^[a-z]$/i.test(p) ? p.toUpperCase().charCodeAt(0) - 65 : -1;
        if (u < 0) return fallo(`Línea ${linea}: «${p}» no es un nodo; sin la línea «nodos: …» usa letras de la A a la ${letraNodo(N_MAX - 1)}.`);
        mayor = Math.max(mayor, u);
      }
    if (mayor >= N_MAX) return fallo(`Los nodos van de la A a la ${letraNodo(N_MAX - 1)} (máximo ${N_MAX} nodos).`);
    nombresVisibles = Array.from({ length: mayor + 1 }, (_, u) => letraNodo(u));
  }
  const n = nombresVisibles.length;

  // Un nombre se busca exacto y, si no, sin distinguir mayúsculas (si no es ambiguo)
  const buscar = (t: string): number | null => {
    const exacto = nombresVisibles.indexOf(t);
    if (exacto >= 0) return exacto;
    const parecidos = nombresVisibles.flatMap((x, u) => (x.toUpperCase() === t.toUpperCase() ? [u] : []));
    return parecidos.length === 1 ? parecidos[0] : null;
  };

  const matriz = matrizCeros(n);
  for (const { linea, partes } of aristas) {
    const [o, d, c] = partes;
    const u = buscar(o);
    const v = buscar(d);
    if (u === null) return fallo(`Línea ${linea}: el nodo «${o}» no está en la lista de nodos.`);
    if (v === null) return fallo(`Línea ${linea}: el nodo «${d}» no está en la lista de nodos.`);
    const nomU = nombresVisibles[u];
    const nomV = nombresVisibles[v];
    if (!/^\+?\d+$/.test(c) || Number(c) <= 0)
      return fallo(`Línea ${linea}: la capacidad de ${nomU}->${nomV} debe ser un entero mayor a 0 (se leyó «${c}»).`);
    if (u === v) return fallo(`Línea ${linea}: ${nomU}->${nomV} es un auto-bucle (un nodo no puede conectarse consigo mismo).`);
    if (matriz[u][v] > 0) return fallo(`Línea ${linea}: la arista ${nomU}->${nomV} está repetida.`);
    const camino = buscarCaminoDirigido(matriz, v, u);
    if (camino)
      return fallo(`Línea ${linea}: la arista ${nomU}->${nomV} crearía un ciclo (${[u, ...camino].map((x) => nombresVisibles[x]).join(" → ")}).`);
    matriz[u][v] = Number(c);
  }

  // El nombre por defecto (A, B, …) se guarda vacío, como en el estado de la app
  const nombres = nombresVisibles.map((t, u) => (t === letraNodo(u) ? "" : t));
  return { ok: true, grafo: { n, nombres, matriz } };
}
