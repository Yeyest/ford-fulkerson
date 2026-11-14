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

/** Pasos que se muestran en pantalla y, para cada uno, el índice del paso del algoritmo al que pertenece. */
export interface Recorrido {
  pasos: Paso[];
  origen: number[];
}

/**
 * Antes de cada paso de etiquetado ("camino_encontrado" o "sin_mas_caminos") agrega un paso
 * "etiquetando" por cada nodo que recibe su etiqueta, en el orden de la búsqueda en anchura.
 * Así el etiquetado se ve nodo por nodo y no todo de una vez. Los pasos del algoritmo no cambian.
 */
export function expandirEtiquetado(pasos: Paso[], d: DatosRed): Recorrido {
  const cap = d.red.capacidades;
  const { nom } = d;
  const res: Recorrido = { pasos: [], origen: [] };
  pasos.forEach((p, i) => {
    if (p.tipo === "camino_encontrado" || p.tipo === "sin_mas_caminos") {
      const it = iteracionDe(pasos, i);
      const lista = [...p.etiquetas];
      const total = lista.length;
      const deltaTexto = (x: number) => (x >= 99999 ? "∞" : String(x));
      for (let k = 1; k < total; k++) {
        const [nodo, e] = lista[k - 1];
        let descripcion: string;
        let nueva: Paso["nueva_etiqueta"] = { nodo, padre: null, signo: "+", delta: e.delta, orden: k, total };
        if (e.padre === "-") {
          descripcion =
            `Iteración ${it}: empieza la búsqueda de un camino aumentante. Se borran las etiquetas anteriores ` +
            `y la fuente ${nom(nodo)} se etiqueta [-, ∞].\nDesde ella se etiquetan, en anchura, los nodos a los que se puede llegar.`;
        } else {
          const padre = e.padre;
          const signo = e.signo === "-" ? "-" : "+";
          const ePadre = p.etiquetas.get(padre)!;
          const P = nom(padre);
          const V = nom(nodo);
          if (signo === "+" && cap[padre][nodo] >= 99999) {
            // Arista virtual de S o hacia T: capacidad ∞, no limita el Δ
            descripcion =
              `Se examina ${P}: la arista ${P}→${V} es una conexión virtual con capacidad ∞, ` +
              `así que ${V} se etiqueta [${P}+, ${deltaTexto(e.delta)}].\nΔ = mín(${deltaTexto(ePadre.delta)}, ∞) = ${deltaTexto(e.delta)}.`;
          } else if (signo === "+") {
            const c = cap[padre][nodo];
            const f = p.flujo[padre][nodo];
            descripcion =
              `Se examina ${P}: la arista ${P}→${V} todavía admite ${c - f} unidades (c − f = ${c} − ${f}), ` +
              `así que ${V} se etiqueta [${P}+, ${deltaTexto(e.delta)}].\nΔ = mín(${deltaTexto(ePadre.delta)}, ${c - f}) = ${deltaTexto(e.delta)}.`;
          } else {
            const f = p.flujo[nodo][padre];
            descripcion =
              `Se examina ${P}: la arista ${V}→${P} ya lleva ${f} unidades que se pueden devolver, ` +
              `así que ${V} se etiqueta [${P}−, ${deltaTexto(e.delta)}] (se llega a ${V} recorriendo esa arista al revés).` +
              `\nΔ = mín(${deltaTexto(ePadre.delta)}, ${f}) = ${deltaTexto(e.delta)}.`;
          }
          nueva = { nodo, padre, signo, delta: e.delta, orden: k, total };
        }
        res.pasos.push({
          ...p,
          tipo: "etiquetando",
          etiquetas: new Map(lista.slice(0, k)),
          camino: [],
          aristas_camino: [],
          nodos_camino: new Set(),
          cuello_botella: 0,
          aristas_corte: [],
          conjunto_alcanzable: undefined,
          descripcion,
          nueva_etiqueta: nueva,
        });
        res.origen.push(i);
      }
    }
    res.pasos.push(p);
    res.origen.push(i);
  });
  return res;
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
