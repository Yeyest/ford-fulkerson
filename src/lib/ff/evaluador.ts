// Lógica de EvaluadorCortesInteractive: se omiten las aristas marcadas, BFS desde
// la fuente, Lado S = alcanzables, Lado T = el resto. Válido si el sumidero queda en T.
import { type Matriz, capATexto, nombreNodo } from "./nombres.ts";

export type Arista = [number, number];

export interface EvaluacionCorte {
  conjuntoS: Set<number>;
  conjuntoT: Set<number>;
  aristasCorte: Arista[];
  aristasSinEfecto: Arista[];
  esCorteValido: boolean;
  caminoRestante: number[];
}

const clave = ([u, v]: Arista) => `${u},${v}`;
const compararAristas = (a: Arista, b: Arista) => a[0] - b[0] || a[1] - b[1];

/** Fuente y sumidero efectivos de la red de trabajo. */
export function extremosEfectivos(
  fuentes: readonly number[],
  sumideros: readonly number[],
  superFuente: number | null,
  superSumidero: number | null,
): { fuente: number; sumidero: number } {
  return {
    fuente: superFuente !== null ? superFuente : Math.min(...fuentes),
    sumidero: superSumidero !== null ? superSumidero : Math.min(...sumideros),
  };
}

/** _alcanzables_sin_aristas: BFS dirigido desde la fuente omitiendo las aristas indicadas. */
export function alcanzablesSinAristas(m: Matriz, fuente: number, omitidas: readonly Arista[]) {
  const omit = new Set(omitidas.map(clave));
  const visitados = new Set([fuente]);
  const padre = new Map<number, number | null>([[fuente, null]]);
  const cola = [fuente];
  while (cola.length) {
    const u = cola.shift()!;
    for (let v = 0; v < m.length; v++) {
      if (visitados.has(v)) continue;
      if (m[u][v] > 0 && !omit.has(`${u},${v}`)) {
        visitados.add(v);
        padre.set(v, u);
        cola.push(v);
      }
    }
  }
  return { visitados, padre };
}

/** evaluar_corte */
export function evaluarCorte(m: Matriz, fuente: number, sumidero: number, seleccionadas: readonly Arista[]): EvaluacionCorte {
  const { visitados, padre } = alcanzablesSinAristas(m, fuente, seleccionadas);
  const conjuntoS = visitados;
  const conjuntoT = new Set<number>();
  for (let u = 0; u < m.length; u++) if (!visitados.has(u)) conjuntoT.add(u);

  // Solo cuentan las aristas dirigidas que van de S hacia T
  const aristasCorte: Arista[] = [];
  for (const u of conjuntoS) for (const v of conjuntoT) if (m[u][v] > 0) aristasCorte.push([u, v]);
  aristasCorte.sort(compararAristas);
  const enCorte = new Set(aristasCorte.map(clave));
  const unicas = new Map(seleccionadas.map((a) => [clave(a), a] as const));
  const aristasSinEfecto = [...unicas.values()].filter((a) => !enCorte.has(clave(a))).sort(compararAristas);

  const esCorteValido = conjuntoT.has(sumidero);
  let caminoRestante: number[] = [];
  if (!esCorteValido) {
    let nodo = sumidero;
    const ruta = [nodo];
    while (padre.get(nodo) !== null) {
      nodo = padre.get(nodo)!;
      ruta.push(nodo);
    }
    caminoRestante = ruta.reverse();
  }
  return { conjuntoS, conjuntoT, aristasCorte, aristasSinEfecto, esCorteValido, caminoRestante };
}

/** Textos del panel del evaluador (_dibujar_panel), sin el ajuste de línea. */
export function textosEvaluacion(
  m: Matriz,
  e: EvaluacionCorte,
  superFuente: number | null,
  superSumidero: number | null,
): { insignia: string; lados: string; capacidad: string; notas: string[] } {
  const nom = (u: number) => nombreNodo(u, superFuente, superSumidero);
  const textoAristas = (aristas: Arista[]) => (aristas.length ? aristas.map(([u, v]) => `${nom(u)}→${nom(v)}`).join(", ") : "ninguna");
  const ord = (s: Set<number>) => [...s].sort((a, b) => a - b).map(nom).join(", ");

  const insignia = e.esCorteValido
    ? "CORTE VÁLIDO (el sumidero ya no es alcanzable desde la fuente)"
    : "CORTE INVÁLIDO (el sumidero sigue alcanzable desde la fuente)";
  const lados = `Lado S = {${ord(e.conjuntoS)}}    |    Lado T = {${ord(e.conjuntoT)}}`;

  let capacidad: string;
  if (e.aristasCorte.length) {
    const caps = e.aristasCorte.map(([u, v]) => m[u][v]);
    const infinita = caps.some((c) => c >= 99999);
    const totalTxt = infinita ? "∞" : String(caps.reduce((a, c) => a + Math.trunc(c), 0));
    const detalle = caps.length > 1 && caps.length <= 8 ? caps.map(capATexto).join(" + ") + " = " : "";
    capacidad =
      `Aristas dirigidas de S→T: ${textoAristas(e.aristasCorte)}\n` +
      `Capacidad del corte c(S,T) = Σ c(u,v) = ${detalle}${totalTxt}`;
  } else {
    capacidad = "No hay aristas dirigidas que crucen de S hacia T.\nCapacidad del corte c(S,T) = 0";
  }

  const notas: string[] = [];
  if (!e.esCorteValido && e.caminoRestante.length)
    notas.push("Camino que sigue activo: " + e.caminoRestante.map(nom).join(" → "));
  if (e.aristasSinEfecto.length)
    notas.push("Marcadas que no cruzan de S a T (no suman a c(S,T)): " + textoAristas(e.aristasSinEfecto));

  return { insignia, lados, capacidad, notas };
}
