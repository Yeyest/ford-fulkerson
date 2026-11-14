// Datos de la red de trabajo compartidos por la pantalla del algoritmo.
import type { Paso } from "@/lib/ff/algoritmo";
import type { Layout } from "@/lib/ff/layout";
import { nombreNodo } from "@/lib/ff/nombres";
import type { RedDeTrabajo, Roles } from "@/lib/ff/red";
import type { Disposicion } from "../grafo/DibujoRed";
import { bandas, crearEscala, orientacionPara } from "../grafo/escala";
import type { ContextoRoles } from "../grafo/estilos";

export interface DatosRed {
  red: RedDeTrabajo;
  layout: Layout;
  roles: Roles;
  ctx: ContextoRoles;
  nom: (u: number) => string;
}

export function crearDatosRed(red: RedDeTrabajo, layout: Layout, roles: Roles): DatosRed {
  return {
    red,
    layout,
    roles,
    ctx: { fuentes: new Set(roles.fuentes), sumideros: new Set(roles.sumideros), superFuente: red.superFuente, superSumidero: red.superSumidero },
    nom: (u) => nombreNodo(u, red.superFuente, red.superSumidero),
  };
}

export function disponerRed(d: DatosRed, w: number, h: number): Disposicion {
  const e = crearEscala(w, h, orientacionPara(w, h));
  return {
    pts: new Map([...d.layout.posiciones].map(([k, p]) => [k, e.a(p)])),
    bandas: bandas(d.layout.encabezados, e),
    orientacion: e.orientacion,
  };
}

/** Espacio mínimo (px del dibujo) por columna y por nodo de la columna más llena, más el de los títulos. */
const ANCHO_COLUMNA = 130;
const ALTO_NODO = 75;
const MARGEN_VERTICAL = 90;

/**
 * Tamaño con el que se dibuja la red en un lienzo de w × h. Si la red es densa (muchas columnas o
 * muchos nodos apilados) y el lienzo le queda chico, se dibuja más grande con la misma proporción y
 * el lienzo la reduce para que entre: así los números y las etiquetas no se tapan entre sí.
 */
export function tamanoDibujo(d: DatosRed, w: number, h: number): [number, number] {
  if (w <= 0 || h <= 0 || orientacionPara(w, h) !== "horizontal") return [w, h];
  const porColumna = new Map<number, number>();
  for (const [x] of d.layout.posiciones.values()) {
    const k = Math.round(x * 1000);
    porColumna.set(k, (porColumna.get(k) ?? 0) + 1);
  }
  const masLlena = Math.max(1, ...porColumna.values());
  const k = Math.max(1, (d.layout.encabezados.length * ANCHO_COLUMNA) / w, (masLlena * ALTO_NODO + MARGEN_VERTICAL) / h);
  return [w * k, h * k];
}

/** Número de iteración de cada paso (0 = inicio). */
export function iteracionDe(pasos: Paso[], i: number): number {
  let k = 0;
  for (let j = 0; j <= i; j++) if (pasos[j].tipo === "camino_encontrado" || pasos[j].tipo === "sin_mas_caminos") k++;
  return pasos[i].tipo === "inicio" ? 0 : k;
}

/** Recorrido del camino como en Python: A → C ← D → H. */
export function recorrido(paso: Paso, nom: (u: number) => string): { texto: string; tramos: { nodo: string; signo: "+" | "-" }[]; inicio: string } {
  if (!paso.camino.length) return { texto: "", tramos: [], inicio: "" };
  const inicio = nom(paso.camino[0][0]);
  const tramos = paso.camino.map(([, v]) => ({ nodo: nom(v), signo: paso.etiquetas.get(v)!.signo as "+" | "-" }));
  const texto = inicio + tramos.map((t) => (t.signo === "+" ? ` → ${t.nodo}` : ` ← ${t.nodo}`)).join("");
  return { texto, tramos, inicio };
}
