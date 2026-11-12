// Generación del grafo y búsquedas dirigidas (detectar_ciclos,
// generar_grafo_aleatorio, buscar_camino_dirigido).
import { type Matriz, matrizCeros } from "./nombres.ts";
import { PyRandom } from "./pyrandom.ts";

/** Máximo de conexiones entrantes y de conexiones salientes de cada nodo (sin contar S y T virtuales). */
export const CONEXIONES_MAX = 5;

/** Cantidad de aristas que salen de u. */
export function gradoSalida(m: Matriz, u: number): number {
  let k = 0;
  for (let v = 0; v < m.length; v++) if (m[u][v] > 0) k += 1;
  return k;
}

/** Cantidad de aristas que llegan a v. */
export function gradoEntrada(m: Matriz, v: number): number {
  let k = 0;
  for (let u = 0; u < m.length; u++) if (m[u][v] > 0) k += 1;
  return k;
}

/** detectar_ciclos: algoritmo de Kahn. Devuelve true si hay un ciclo. */
export function detectarCiclos(cantidadNodos: number, m: Matriz): boolean {
  const gradosEntrada = new Array<number>(cantidadNodos).fill(0);
  for (let o = 0; o < cantidadNodos; o++)
    for (let d = 0; d < cantidadNodos; d++) if (m[o][d] > 0) gradosEntrada[d] += 1;

  const cola: number[] = [];
  for (let nodo = 0; nodo < cantidadNodos; nodo++) if (gradosEntrada[nodo] === 0) cola.push(nodo);
  let visitados = 0;
  while (cola.length) {
    const actual = cola.shift()!;
    visitados += 1;
    for (let d = 0; d < cantidadNodos; d++) {
      if (m[actual][d] > 0) {
        gradosEntrada[d] -= 1;
        if (gradosEntrada[d] === 0) cola.push(d);
      }
    }
  }
  return visitados !== cantidadNodos;
}

/** buscar_camino_dirigido: BFS dirigido. Devuelve origen→…→destino o null. */
export function buscarCaminoDirigido(m: Matriz, origen: number, destino: number): number[] | null {
  const padre = new Map<number, number | null>([[origen, null]]);
  const cola = [origen];
  while (cola.length) {
    let u: number | null = cola.shift()!;
    if (u === destino) {
      const ruta: number[] = [];
      while (u !== null) {
        ruta.push(u);
        u = padre.get(u)!;
      }
      return ruta.reverse();
    }
    for (let v = 0; v < m.length; v++) {
      if (m[u][v] > 0 && !padre.has(v)) {
        padre.set(v, u);
        cola.push(v);
      }
    }
  }
  return null;
}

/**
 * Nodos v tales que agregar origen→v cerraría un ciclo (v ya alcanza a origen).
 * Incluye al propio origen (auto-bucle).
 */
export function destinosProhibidos(m: Matriz, origen: number): Set<number> {
  const prohibidos = new Set<number>();
  for (let v = 0; v < m.length; v++) if (buscarCaminoDirigido(m, v, origen) !== null) prohibidos.add(v);
  return prohibidos;
}

/** Por qué no se puede crear una arista nueva origen→v. */
export type MotivoProhibido = "ciclo" | "salida" | "entrada";

/**
 * Destinos a los que no se puede conectar `origen` con una arista nueva, y el motivo: cerraría un
 * ciclo, `origen` ya tiene CONEXIONES_MAX salientes o v ya tiene CONEXIONES_MAX entrantes.
 * Las aristas que ya existen no se incluyen (se puede cambiar su capacidad).
 */
export function motivosProhibidos(m: Matriz, origen: number): Map<number, MotivoProhibido> {
  const motivos = new Map<number, MotivoProhibido>();
  const ciclo = destinosProhibidos(m, origen);
  const salidaLlena = gradoSalida(m, origen) >= CONEXIONES_MAX;
  for (let v = 0; v < m.length; v++) {
    if (v !== origen && m[origen][v] > 0) continue;
    if (ciclo.has(v)) motivos.set(v, "ciclo");
    else if (salidaLlena) motivos.set(v, "salida");
    else if (gradoEntrada(m, v) >= CONEXIONES_MAX) motivos.set(v, "entrada");
  }
  return motivos;
}

/**
 * generar_grafo_aleatorio: DAG por capas (fuentes → capas intermedias → sumideros).
 *
 * Con `limite` (la app usa CONEXIONES_MAX), ningún nodo pasa de `limite` conexiones entrantes ni
 * salientes: se omiten las aristas que lo superarían, sin cambiar los números aleatorios que se
 * consumen. Así, si el grafo de Python con esa semilla ya cumple el límite, sale idéntico. Un nodo
 * que queda sin aristas de entrada se conecta, si se puede, desde otro nodo de una capa anterior.
 * Sin `limite` es exactamente el generador de Python.
 */
export function generarGrafoAleatorio(
  cantidadNodos: number,
  listaFuentes: readonly number[],
  listaSumideros: readonly number[],
  rnd: PyRandom = new PyRandom(),
  limite = Infinity,
): Matriz {
  const m = matrizCeros(cantidadNodos);
  const salida = new Array<number>(cantidadNodos).fill(0);
  const entrada = new Array<number>(cantidadNodos).fill(0);
  const cabe = (u: number, v: number) => salida[u] < limite && entrada[v] < limite;
  const poner = (u: number, v: number, c: number) => {
    if (m[u][v] === 0) {
      salida[u] += 1;
      entrada[v] += 1;
    }
    m[u][v] = c;
  };
  const fuentes = [...listaFuentes];
  const sumideros = [...listaSumideros];

  const intermedios: number[] = [];
  for (let u = 0; u < cantidadNodos; u++) if (!fuentes.includes(u) && !sumideros.includes(u)) intermedios.push(u);
  rnd.shuffle(intermedios);

  let capasIntermedias: number[][] = [];
  const cant = intermedios.length;
  if (cant > 0) {
    const minimo = Math.max(1, Math.ceil(cant / 5));
    const maximo = Math.min(Math.max(minimo, Math.floor((cant + 1) / 2)), 6);
    const k = rnd.randint(minimo, maximo);
    capasIntermedias = Array.from({ length: k }, () => []);
    intermedios.forEach((nodo, i) => {
      if (i < k) capasIntermedias[i].push(nodo);
      else rnd.choice(capasIntermedias).push(nodo);
    });
  }

  const capas = [fuentes, ...capasIntermedias, sumideros];

  for (let i = 0; i < capas.length - 1; i++) {
    const actual = capas[i];
    const siguiente = capas[i + 1];

    for (const u of actual) {
      const cantidad = rnd.randint(1, Math.min(2, siguiente.length));
      for (const v of rnd.sample(siguiente, cantidad)) {
        const c = rnd.randint(5, 25);
        if (cabe(u, v)) poner(u, v, c);
      }
    }

    siguiente.forEach((v, j) => {
      if (!actual.some((u) => m[u][v] > 0)) {
        const u = rnd.choice(actual);
        const c = rnd.randint(5, 25);
        if (cabe(u, v)) poner(u, v, c);
        else if (entrada[v] === 0) {
          // Con límite: otro nodo que aún admita una salida, de una capa anterior o de esta misma
          // capa ya conectado y anterior a v (el orden capa → posición evita los ciclos)
          const candidatos = [...capas.slice(0, i + 1).flat(), ...siguiente.slice(0, j).filter((w) => entrada[w] > 0)];
          const libres = candidatos.filter((w) => salida[w] < limite);
          if (libres.length) poner(rnd.choice(libres), v, c);
        }
      }
    });

    if (i + 2 < capas.length) {
      for (const u of actual) {
        if (rnd.random() < 0.15) {
          const v = rnd.choice(capas[i + 2]);
          if (m[u][v] === 0) {
            const c = rnd.randint(5, 25);
            if (cabe(u, v)) poner(u, v, c);
          }
        }
      }
    }

    // Con límite: un nodo que se quedó sin salidas se conecta con alguno de las capas siguientes
    // que aún admita una entrada (sin límite esto nunca pasa: cada nodo tiene al menos una salida)
    for (const u of actual) {
      if (salida[u] > 0) continue;
      const libres = capas.slice(i + 1).flat().filter((w) => entrada[w] < limite);
      if (libres.length) poner(u, rnd.choice(libres), rnd.randint(5, 25));
    }
  }
  return m;
}
