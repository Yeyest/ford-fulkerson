export const INFINITO = 999999;

/** Matriz de capacidades / flujos: matriz[u][v]. */
export type Matriz = number[][];

export function matrizCeros(n: number): Matriz {
  return Array.from({ length: n }, () => new Array<number>(n).fill(0));
}

export function copiarMatriz(m: Matriz): Matriz {
  return m.map((fila) => fila.slice());
}

/** nombre_nodo: 0 → A, 1 → B, …; S y T para la super-fuente y el super-sumidero. */
export function nombreNodo(u: number, superFuente: number | null = null, superSumidero: number | null = null): string {
  if (superFuente !== null && u === superFuente) return "S";
  if (superSumidero !== null && u === superSumidero) return "T";
  let letra = "";
  let temp = u;
  while (true) {
    letra = String.fromCharCode(65 + (temp % 26)) + letra;
    temp = Math.floor(temp / 26) - 1;
    if (temp < 0) break;
  }
  return letra;
}

/** Texto de una capacidad: ∞ para las aristas virtuales (_cap_a_texto). */
export function capATexto(c: number): string {
  return c >= 99999 ? "∞" : String(Math.trunc(c));
}

/** Aristas (u, v) con capacidad > 0, en el mismo orden que los bucles de Python. */
export function listarAristas(m: Matriz): [number, number][] {
  const n = m.length;
  const aristas: [number, number][] = [];
  for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (m[u][v] > 0) aristas.push([u, v]);
  return aristas;
}
