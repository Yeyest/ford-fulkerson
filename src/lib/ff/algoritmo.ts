// Ford-Fulkerson con etiquetado [padre±, Δ] (buscar_camino_con_etiquetas,
// generar_pasos_ford_fulkerson y las verificaciones). Réplica exacta de Python.
import { INFINITO, type Matriz, copiarMatriz, matrizCeros, nombreNodo } from "./nombres.ts";

/** Etiqueta de un nodo: (padre, signo, Δ). La fuente lleva ('-', '', INFINITO). */
export interface Etiqueta {
  padre: number | "-";
  signo: "+" | "-" | "";
  delta: number;
}

export const ETIQUETA_FUENTE: Etiqueta = { padre: "-", signo: "", delta: INFINITO };

/** dict de Python: conserva el orden de inserción. */
export type Etiquetas = Map<number, Etiqueta>;

export type TipoPaso = "inicio" | "camino_encontrado" | "flujo_actualizado" | "sin_mas_caminos" | "corte_minimo";

export interface Paso {
  tipo: TipoPaso;
  flujo: Matriz;
  residual: Matriz;
  flujo_total: number;
  camino: [number, number][];
  aristas_camino: [number, number, "+" | "-"][];
  nodos_camino: Set<number>;
  etiquetas: Etiquetas;
  cuello_botella: number;
  aristas_corte: [number, number][];
  descripcion: string;
  conjunto_alcanzable?: Set<number>;
}

export function buscarCaminoConEtiquetas(
  cap: Matriz,
  flujo: Matriz,
  fuente: number,
  sumidero: number,
): { camino: [number, number][] | null; etiquetas: Etiquetas } {
  const numNodos = cap.length;
  const etiquetas: Etiquetas = new Map([[fuente, ETIQUETA_FUENTE]]);
  const cola = [fuente];

  while (cola.length && !etiquetas.has(sumidero)) {
    const u = cola.shift()!;
    const deltaU = etiquetas.get(u)!.delta;

    for (let v = 0; v < numNodos; v++) {
      if (etiquetas.has(v)) continue;

      const residualDirecto = cap[u][v] - flujo[u][v];
      if (cap[u][v] > 0 && residualDirecto > 0) {
        etiquetas.set(v, { padre: u, signo: "+", delta: Math.trunc(Math.min(deltaU, residualDirecto)) });
        cola.push(v);
      } else if (cap[v][u] > 0 && flujo[v][u] > 0) {
        etiquetas.set(v, { padre: u, signo: "-", delta: Math.trunc(Math.min(deltaU, flujo[v][u])) });
        cola.push(v);
      }

      if (etiquetas.has(sumidero)) break;
    }
  }

  if (!etiquetas.has(sumidero)) return { camino: null, etiquetas };

  const camino: [number, number][] = [];
  let actual = sumidero;
  while (actual !== fuente) {
    const predecesor = etiquetas.get(actual)!.padre as number;
    camino.push([predecesor, actual]);
    actual = predecesor;
  }
  camino.reverse();
  return { camino, etiquetas };
}

export function calcularConjuntosCorte(etiquetas: Etiquetas, numNodos: number): { s: Set<number>; t: Set<number> } {
  const s = new Set(etiquetas.keys());
  const t = new Set<number>();
  for (let u = 0; u < numNodos; u++) if (!s.has(u)) t.add(u);
  return { s, t };
}

const ordenados = (c: Iterable<number>) => [...c].sort((a, b) => a - b);

export function calcularAristasCorte(cap: Matriz, etiquetas: Etiquetas, numNodos: number): [number, number][] {
  const { s, t } = calcularConjuntosCorte(etiquetas, numNodos);
  const aristas: [number, number][] = [];
  for (const u of ordenados(s)) for (const v of ordenados(t)) if (cap[u][v] > 0) aristas.push([u, v]);
  return aristas;
}

export function modificarFlujoArista(flujo: Matriz, u: number, v: number, cambio: number): void {
  flujo[u][v] += cambio;
  flujo[v][u] -= cambio;
}

const sumaFila = (fila: number[]) => fila.reduce((a, b) => a + b, 0);

export function verificarRedDeFlujo(cap: Matriz, flujo: Matriz, fuente: number, sumidero: number, flujoTotal: number): void {
  const n = cap.length;
  for (let u = 0; u < n; u++)
    for (let v = 0; v < n; v++)
      if (flujo[u][v] > cap[u][v]) throw new Error("Se violó la restricción de capacidad: f(u,v) > c(u,v).");
  for (let u = 0; u < n; u++)
    for (let v = 0; v < n; v++) if (flujo[u][v] !== -flujo[v][u]) throw new Error("Se violó la simetría: f(u,v) ≠ −f(v,u).");
  for (let u = 0; u < n; u++) {
    if (u === fuente || u === sumidero) continue;
    if (sumaFila(flujo[u]) !== 0) throw new Error(`Se violó la conservación del flujo en el nodo ${u}.`);
  }
  if (sumaFila(flujo[fuente]) !== flujoTotal || sumaFila(flujo[sumidero]) !== -flujoTotal)
    throw new Error("El flujo neto de la fuente/sumidero no coincide con el flujo total.");
}

export function verificarCorteMinimo(
  cap: Matriz,
  flujo: Matriz,
  conjuntoS: Set<number>,
  conjuntoT: Set<number>,
  aristasCorte: [number, number][],
  flujoTotal: number,
): number {
  for (const [u, v] of aristasCorte)
    if (flujo[u][v] !== cap[u][v]) throw new Error(`La arista del corte ${u}→${v} no está saturada.`);
  for (const u of conjuntoT)
    for (const v of conjuntoS)
      if (cap[u][v] > 0 && flujo[u][v] !== 0) throw new Error(`El arco ${u}→${v} (de T hacia S) debería tener flujo 0.`);
  const capacidadCorte = aristasCorte.reduce((acc, [u, v]) => acc + Math.trunc(cap[u][v]), 0);
  if (capacidadCorte !== flujoTotal) throw new Error("La capacidad del corte no coincide con el flujo máximo.");
  return capacidadCorte;
}

export function generarPasosFordFulkerson(
  numNodos: number,
  matrizCap: Matriz,
  fuente: number,
  sumidero: number,
  superFuente: number | null = null,
  superSumidero: number | null = null,
): Paso[] {
  const nom = (u: number) => nombreNodo(u, superFuente, superSumidero);

  const capacidades = copiarMatriz(matrizCap);
  for (let u = 0; u < numNodos; u++)
    for (let v = 0; v < numNodos; v++)
      if (capacidades[u][v] > 0 && capacidades[v][u] > 0)
        throw new Error("La red tiene arcos antiparalelos (u→v y v→u); no es un DAG.");
  const flujo = matrizCeros(numNodos);
  const pasos: Paso[] = [];

  const nuevoPaso = (tipo: TipoPaso, flujoTotal: number, etiquetas: Etiquetas, descripcion: string, extra: Partial<Paso> = {}) => {
    pasos.push({
      tipo,
      flujo: copiarMatriz(flujo),
      residual: capacidades.map((fila, u) => fila.map((c, v) => c - flujo[u][v])),
      flujo_total: flujoTotal,
      camino: [],
      aristas_camino: [],
      nodos_camino: new Set(),
      etiquetas: new Map(etiquetas),
      cuello_botella: 0,
      aristas_corte: [],
      descripcion,
      ...extra,
    });
  };

  let descInicio = "Flujo 0 en todas las aristas (cumple 0 ≤ f ≤ c).\n";
  if (superFuente !== null && superSumidero !== null) {
    descInicio += "Los nodos S y T son virtuales y se conectan con capacidad ∞.\n";
  } else if (superFuente !== null) {
    descInicio += "El nodo S es una super-fuente virtual (capacidad ∞ hacia cada fuente).\n";
  } else if (superSumidero !== null) {
    descInicio += "El nodo T es un super-sumidero virtual (capacidad ∞ desde cada sumidero).\n";
  }
  descInicio += `La fuente ${nom(fuente)} se etiqueta [-, ∞]; desde ella se propagan las etiquetas [padre±, Δ].`;
  nuevoPaso("inicio", 0, new Map([[fuente, ETIQUETA_FUENTE]]), descInicio);

  let flujoTotal = 0;
  let iteracion = 1;
  let etiquetas: Etiquetas;

  while (true) {
    const r = buscarCaminoConEtiquetas(capacidades, flujo, fuente, sumidero);
    etiquetas = r.etiquetas;
    const camino = r.camino;

    if (!camino || camino.length === 0) {
      const { s, t } = calcularConjuntosCorte(etiquetas, numNodos);
      const aristasFrontera = calcularAristasCorte(capacidades, etiquetas, numNodos);
      const etiquetados = ordenados(s).map(nom).join(", ");
      const sinEtiqueta = ordenados(t).map(nom).join(", ");
      nuevoPaso(
        "sin_mas_caminos",
        flujoTotal,
        etiquetas,
        `Iteración ${iteracion}: ${nom(sumidero)} sin etiqueta → no hay más caminos.\n` +
          `Lado S (etiquetados): {${etiquetados}}   Lado T (sin etiqueta): {${sinEtiqueta}}\n` +
          `Rojas punteadas S→T: saturadas (f = c); las T→S tienen f = 0.`,
        { aristas_corte: aristasFrontera },
      );
      break;
    }

    const etiqSumidero = etiquetas.get(sumidero)!;
    const delta = Math.trunc(etiqSumidero.delta);
    const aristasCamino: [number, number, "+" | "-"][] = [];
    let recorrido = nom(camino[0][0]);
    for (const [p, v] of camino) {
      if (etiquetas.get(v)!.signo === "+") {
        aristasCamino.push([p, v, "+"]);
        recorrido += ` → ${nom(v)}`;
      } else {
        aristasCamino.push([v, p, "-"]);
        recorrido += ` ← ${nom(v)}`;
      }
    }
    const nodosCamino = new Set<number>();
    for (const [a, b] of camino) {
      nodosCamino.add(a);
      nodosCamino.add(b);
    }

    nuevoPaso(
      "camino_encontrado",
      flujoTotal,
      etiquetas,
      `Iteración ${iteracion}: ${nom(sumidero)} etiquetado [${nom(etiqSumidero.padre as number)}${etiqSumidero.signo}, ${delta}]` +
        ` → camino aumentante.\n` +
        `Camino aumentante: ${recorrido}   (← = arista recorrida al revés)\n` +
        `Cuello de botella Δ = ${delta} = mín. residual del camino`,
      { camino, aristas_camino: aristasCamino, nodos_camino: nodosCamino, cuello_botella: delta },
    );

    for (const [u, v, signo] of aristasCamino) modificarFlujoArista(flujo, u, v, signo === "+" ? delta : -delta);

    flujoTotal += delta;
    verificarRedDeFlujo(capacidades, flujo, fuente, sumidero, flujoTotal);

    nuevoPaso(
      "flujo_actualizado",
      flujoTotal,
      etiquetas,
      `Iteración ${iteracion}: se envían Δ = ${delta} unidades por el camino.\n` +
        `Directas (+): f(u,v) += Δ   |   Inversas (−): f(u,v) −= Δ\n` +
        `Simetría y conservación de flujo verificadas (entra = sale).\n` +
        `Flujo acumulado total = ${flujoTotal}`,
      { camino, aristas_camino: aristasCamino, nodos_camino: nodosCamino, cuello_botella: delta },
    );
    iteracion += 1;
  }

  const { s: conjuntoS, t: conjuntoT } = calcularConjuntosCorte(etiquetas, numNodos);
  const aristasCorte = calcularAristasCorte(capacidades, etiquetas, numNodos);
  const capacidadCorte = verificarCorteMinimo(capacidades, flujo, conjuntoS, conjuntoT, aristasCorte, flujoTotal);

  const ladoS = ordenados(conjuntoS).map(nom).join(", ");
  const ladoT = ordenados(conjuntoT).map(nom).join(", ");
  const textoCorte = aristasCorte.length ? aristasCorte.map(([u, v]) => `${nom(u)}→${nom(v)}`).join(", ") : "ninguna";
  const detalleSuma =
    aristasCorte.length > 1 && aristasCorte.length <= 6
      ? aristasCorte.map(([u, v]) => String(Math.trunc(capacidades[u][v]))).join(" + ") + " = "
      : "";

  nuevoPaso(
    "corte_minimo",
    flujoTotal,
    etiquetas,
    `¡Ejecución finalizada!  Flujo máximo = ${flujoTotal}\n` +
      `Lado S (alcanzables): {${ladoS}}   Lado T: {${ladoT}}\n` +
      `Aristas del corte mínimo (rojo), u∈S → v∈T: ${textoCorte}\n` +
      `Capacidad del corte = Σ c(u,v) = ${detalleSuma}${capacidadCorte} = flujo máximo`,
    { conjunto_alcanzable: conjuntoS, aristas_corte: aristasCorte },
  );

  return pasos;
}
