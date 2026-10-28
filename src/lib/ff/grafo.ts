// Generación del grafo y búsquedas dirigidas (detectar_ciclos,
// generar_grafo_aleatorio, buscar_camino_dirigido).
import { type Matriz, matrizCeros } from "./nombres.ts";
import { PyRandom } from "./pyrandom.ts";

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

/** generar_grafo_aleatorio: DAG por capas (fuentes → capas intermedias → sumideros). */
export function generarGrafoAleatorio(
  cantidadNodos: number,
  listaFuentes: readonly number[],
  listaSumideros: readonly number[],
  rnd: PyRandom = new PyRandom(),
): Matriz {
  const m = matrizCeros(cantidadNodos);
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
      for (const v of rnd.sample(siguiente, cantidad)) m[u][v] = rnd.randint(5, 25);
    }

    for (const v of siguiente) {
      if (!actual.some((u) => m[u][v] > 0)) {
        const u = rnd.choice(actual);
        m[u][v] = rnd.randint(5, 25);
      }
    }

    if (i + 2 < capas.length) {
      for (const u of actual) {
        if (rnd.random() < 0.15) {
          const v = rnd.choice(capas[i + 2]);
          if (m[u][v] === 0) m[u][v] = rnd.randint(5, 25);
        }
      }
    }
  }
  return m;
}
