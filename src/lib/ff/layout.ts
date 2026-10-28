// calcular_posiciones_nodos: columnas (Super-Fuente, Fuentes, Capas, Sumideros,
// Super-Sumidero), minimización de cruces con barridos y posiciones normalizadas 0-1
// (y hacia arriba, como en matplotlib). Réplica exacta de Python.
import { type Matriz, listarAristas } from "./nombres.ts";
import { PyRandom, pySum } from "./pyrandom.ts";

export type TipoColumna = "super_fuente" | "fuente" | "capa" | "sumidero" | "super_sumidero";

export interface Encabezado {
  x: number;
  titulo: string;
  tipo: TipoColumna;
}

export interface Layout {
  posiciones: Map<number, [number, number]>;
  encabezados: Encabezado[];
  /** Columnas finales (de izquierda a derecha, cada una de arriba hacia abajo en orden de Python). */
  columnas: number[][];
}

function orientacion(p: number[], q: number[], r: number[]): number {
  return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
}

function segmentosSeCruzan(p1: number[], p2: number[], p3: number[], p4: number[]): boolean {
  const d1 = orientacion(p3, p4, p1);
  const d2 = orientacion(p3, p4, p2);
  const d3 = orientacion(p1, p2, p3);
  const d4 = orientacion(p1, p2, p4);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** sorted(lista, key=...) estable con claves numéricas. */
function ordenarPor<T>(lista: T[], clave: (x: T) => number): T[] {
  return lista
    .map((x, i) => ({ x, i, k: clave(x) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((e) => e.x);
}

export function calcularPosicionesNodos(
  numNodos: number,
  matrizCap: Matriz,
  listaFuentes: readonly number[],
  listaSumideros: readonly number[],
  superFuente: number | null = null,
  superSumidero: number | null = null,
): Layout {
  const fuentes = [...new Set(listaFuentes)].sort((a, b) => a - b);
  const sumideros = [...new Set(listaSumideros)].sort((a, b) => a - b);
  const setSumideros = new Set(sumideros);

  const especiales = new Set([...fuentes, ...sumideros]);
  if (superFuente !== null) especiales.add(superFuente);
  if (superSumidero !== null) especiales.add(superSumidero);
  const intermedios: number[] = [];
  for (let u = 0; u < numNodos; u++) if (!especiales.has(u)) intermedios.push(u);
  const setIntermedios = new Set(intermedios);

  const aristas = listarAristas(matrizCap);

  const capa = new Map<number, number>();
  for (const f of fuentes) capa.set(f, 0);
  for (const u of intermedios) capa.set(u, 1);
  for (let it = 0; it < intermedios.length + 1; it++) {
    let cambio = false;
    for (const [u, v] of aristas) {
      if (setIntermedios.has(v) && capa.has(u) && capa.get(v)! < capa.get(u)! + 1) {
        capa.set(v, capa.get(u)! + 1);
        cambio = true;
      }
    }
    if (!cambio) break;
  }

  if (intermedios.length) {
    const L = Math.max(...intermedios.map((u) => capa.get(u)!));
    for (const u of ordenarPor(intermedios, (x) => -capa.get(x)!)) {
      const entradas = aristas.filter(([a, b]) => b === u && capa.has(a)).length;
      const capasSuc: number[] = [];
      for (const [a, b] of aristas) {
        if (a !== u) continue;
        if (setSumideros.has(b)) capasSuc.push(L + 1);
        else if (setIntermedios.has(b)) capasSuc.push(capa.get(b)!);
      }
      if (capasSuc.length && capasSuc.length > entradas) {
        const tope = Math.min(...capasSuc) - 1;
        if (tope > capa.get(u)!) capa.set(u, tope);
      }
    }
  }

  const grupos = new Map<number, number[]>();
  for (const u of intermedios) {
    const c = capa.get(u)!;
    if (!grupos.has(c)) grupos.set(c, []);
    grupos.get(c)!.push(u);
  }
  const capasOrdenadas = [...grupos.keys()].sort((a, b) => a - b);

  const columnas: number[][] = [];
  const tipos: TipoColumna[] = [];
  const titulos: string[] = [];
  if (superFuente !== null) {
    columnas.push([superFuente]);
    tipos.push("super_fuente");
    titulos.push("Super-Fuente");
  }
  columnas.push([...fuentes]);
  tipos.push("fuente");
  titulos.push(fuentes.length === 1 ? "Fuente" : "Fuentes");
  capasOrdenadas.forEach((d, i) => {
    columnas.push([...grupos.get(d)!].sort((a, b) => a - b));
    tipos.push("capa");
    titulos.push(`Capa ${i + 1}`);
  });
  columnas.push([...sumideros]);
  tipos.push("sumidero");
  titulos.push(sumideros.length === 1 ? "Sumidero" : "Sumideros");
  if (superSumidero !== null) {
    columnas.push([superSumidero]);
    tipos.push("super_sumidero");
    titulos.push("Super-Sumidero");
  }

  const indiceCol = new Map<number, number>();
  columnas.forEach((col, c) => col.forEach((nodo) => indiceCol.set(nodo, c)));

  const vecinosIzq = new Map<number, number[]>();
  const vecinosDer = new Map<number, number[]>();
  for (let u = 0; u < numNodos; u++) {
    vecinosIzq.set(u, []);
    vecinosDer.set(u, []);
  }
  for (const [u, v] of aristas) {
    const cu = indiceCol.get(u)!;
    const cv = indiceCol.get(v)!;
    if (cu < cv) {
      vecinosDer.get(u)!.push(v);
      vecinosIzq.get(v)!.push(u);
    } else if (cu > cv) {
      vecinosIzq.get(u)!.push(v);
      vecinosDer.get(v)!.push(u);
    }
  }

  const rangos = (orden: number[][]) => {
    const r = new Map<number, number>();
    for (const col of orden) {
      const m = col.length;
      col.forEach((nodo, i) => r.set(nodo, m === 1 ? 0.5 : i / (m - 1)));
    }
    return r;
  };

  const contarCruces = (orden: number[][]) => {
    const r = rangos(orden);
    const pts = new Map<number, number[]>();
    for (const [n, val] of r) pts.set(n, [indiceCol.get(n)!, val]);
    let cruces = 0;
    for (let i = 0; i < aristas.length; i++) {
      const [a, b] = aristas[i];
      for (let j = i + 1; j < aristas.length; j++) {
        const [c, d] = aristas[j];
        if (new Set([a, b, c, d]).size < 4) continue;
        if (segmentosSeCruzan(pts.get(a)!, pts.get(b)!, pts.get(c)!, pts.get(d)!)) cruces += 1;
      }
    }
    return cruces;
  };

  const barrido = (orden: number[][], haciaDerecha: boolean) => {
    const r = rangos(orden);
    const indices = orden.map((_, i) => i);
    if (!haciaDerecha) indices.reverse();
    for (const c of indices) {
      const col = orden[c];
      if (col.length < 2) continue;
      const claves = new Map<number, number>();
      for (const nodo of col) {
        const vec = haciaDerecha ? vecinosIzq.get(nodo)! : vecinosDer.get(nodo)!;
        claves.set(nodo, vec.length ? pySum(vec.map((w) => r.get(w)!)) / vec.length : r.get(nodo)!);
      }
      const ordenada = ordenarPor(col, (x) => claves.get(x)!);
      col.splice(0, col.length, ...ordenada);
      const m = col.length;
      col.forEach((nodo, i) => r.set(nodo, m === 1 ? 0.5 : i / (m - 1)));
    }
  };

  const rng = new PyRandom(7);
  let mejor: number[][] | null = null;
  let mejorCruces = Infinity;
  for (let intento = 0; intento < 30; intento++) {
    const orden = columnas.map((col) => [...col]);
    if (intento > 0) for (const col of orden) rng.shuffle(col);
    for (let k = 0; k < 8; k++) {
      barrido(orden, true);
      barrido(orden, false);
      const cruces = contarCruces(orden);
      if (cruces < mejorCruces) {
        mejorCruces = cruces;
        mejor = orden.map((col) => [...col]);
      }
      if (mejorCruces === 0) break;
    }
    if (mejorCruces === 0) break;
  }
  const final = mejor!;

  const Y_MIN = 0.14;
  const Y_MAX = 0.84;
  const maxM = Math.max(...final.map((c) => c.length));
  const sep = Math.min(0.2, (Y_MAX - Y_MIN) / Math.max(maxM - 1, 1));

  const y = new Map<number, number>();
  for (const col of final) {
    const m = col.length;
    col.forEach((nodo, i) => y.set(nodo, 0.49 + ((m - 1) / 2 - i) * sep));
  }

  for (let it = 0; it < 15; it++) {
    for (const col of final) {
      const m = col.length;
      const deseado: number[] = [];
      for (const nodo of col) {
        const vec = [...vecinosIzq.get(nodo)!, ...vecinosDer.get(nodo)!].map((w) => y.get(w)!);
        if (vec.length) deseado.push(0.5 * y.get(nodo)! + 0.5 * (pySum(vec) / vec.length));
        else deseado.push(y.get(nodo)!);
      }
      const abajo = [...deseado];
      for (let i = 1; i < m; i++) abajo[i] = Math.min(abajo[i], abajo[i - 1] - sep);
      const arriba = [...deseado];
      for (let i = m - 2; i >= 0; i--) arriba[i] = Math.max(arriba[i], arriba[i + 1] + sep);
      let res = abajo.map((a, i) => (a + arriba[i]) / 2);
      if (Math.min(...res) < Y_MIN) {
        const d = Y_MIN - Math.min(...res);
        res = res.map((r) => r + d);
      }
      if (Math.max(...res) > Y_MAX) {
        const d = Math.max(...res) - Y_MAX;
        res = res.map((r) => r - d);
      }
      col.forEach((nodo, i) => y.set(nodo, res[i]));
    }
  }

  const total = final.length;
  const posiciones = new Map<number, [number, number]>();
  const encabezados: Encabezado[] = [];
  final.forEach((col, idx) => {
    const x = total === 1 ? 0.5 : 0.07 + (0.86 * idx) / (total - 1);
    encabezados.push({ x, titulo: titulos[idx], tipo: tipos[idx] });
    for (const nodo of col) posiciones.set(nodo, [x, y.get(nodo)!]);
  });

  return { posiciones, encabezados, columnas: final };
}
