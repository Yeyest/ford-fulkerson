export const INFINITO = 999999;

/** Matriz de capacidades / flujos: matriz[u][v]. */
export type Matriz = number[][];

export function matrizCeros(n: number): Matriz {
  return Array.from({ length: n }, () => new Array<number>(n).fill(0));
}

export function copiarMatriz(m: Matriz): Matriz {
  return m.map((fila) => fila.slice());
}

// shortcut: nombres guardados en el módulo (los fija App en cada render); pasarlos como parámetro si algún día hay dos redes a la vez.
let personalizados: readonly string[] = [];
export function fijarNombres(nombres: readonly string[]) {
  personalizados = nombres;
}

/** Valida el nombre nuevo del nodo u (de n nodos). Devuelve el error o null. */
export function validarNombre(nombre: string, u: number, n: number): string | null {
  const t = nombre.trim();
  if (!t) return "El nombre no puede estar vacío.";
  if (t.length > 3) return "Usa como máximo 3 caracteres.";
  // Al escribir aristas "origen,destino,capacidad" una coma partiría el nombre y un número se confundiría con un índice
  if (t.includes(",")) return "El nombre no puede tener comas.";
  if (/^\d+$/.test(t)) return "El nombre no puede ser solo un número.";
  if (t === "S" || t === "T") return "S y T están reservados para el origen y el destino ficticios.";
  for (let v = 0; v < n; v++) if (v !== u && nombreNodo(v) === t) return `Ya hay un nodo llamado ${t}.`;
  return null;
}

/** nombre_nodo: 0 → A, 1 → B, … (o el nombre que puso el usuario); S y T para la super-fuente y el super-sumidero. */
export function nombreNodo(u: number, superFuente: number | null = null, superSumidero: number | null = null): string {
  if (superFuente !== null && u === superFuente) return "S";
  if (superSumidero !== null && u === superSumidero) return "T";
  return personalizados[u] || letraNodo(u);
}

/** Nombre por defecto: 0 → A, 1 → B, …, 26 → AA. */
export function letraNodo(u: number): string {
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
