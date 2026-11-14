// Datos de la red de trabajo compartidos por la pantalla del algoritmo.
import type { Etiqueta, Paso } from "@/lib/ff/algoritmo";
import type { Layout } from "@/lib/ff/layout";
import { nombreNodo } from "@/lib/ff/nombres";
import type { RedDeTrabajo, Roles } from "@/lib/ff/red";
import type { Disposicion } from "../grafo/DibujoRed";
import { bandas, crearEscala, orientacionPara } from "../grafo/escala";
import { nodosDelCamino } from "./inverso";
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
 * Pasos que se muestran en pantalla, con el etiquetado nodo por nodo:
 * - Al encontrar un camino aumentante solo se etiquetan los nodos de ese camino, uno por uno y en su
 *   orden (de la fuente al sumidero). Los demás nodos no se actualizan: conservan la etiqueta que
 *   tenían de una iteración anterior (o ninguna).
 * - En la última búsqueda, la que ya no llega al sumidero, se etiquetan uno por uno todos los nodos
 *   alcanzables, porque son los que forman el lado S del corte mínimo; los demás quedan sin etiqueta.
 * Los pasos del algoritmo no cambian: solo cambia qué etiquetas se muestran en cada uno.
 */
export function expandirEtiquetado(pasos: Paso[], d: DatosRed): Recorrido {
  const cap = d.red.capacidades;
  const { nom } = d;
  const res: Recorrido = { pasos: [], origen: [] };
  const deltaTexto = (x: number) => (x >= 99999 ? "∞" : String(x));
  /** Etiquetas a la vista: se mantienen de una iteración a otra salvo las que se actualizan. */
  let vista = new Map<number, Etiqueta>();
  let nuevas = new Set<number>();

  /** Por qué el nodo recibe su etiqueta (el padre ya está etiquetado en esta misma búsqueda). */
  const explicar = (p: Paso, nodo: number, e: Etiqueta): string => {
    const padre = e.padre as number;
    const ePadre = p.etiquetas.get(padre)!;
    const P = nom(padre);
    const V = nom(nodo);
    if (e.signo === "-") {
      const f = p.flujo[nodo][padre];
      return (
        `Se examina ${P}: la arista ${V}→${P} ya lleva ${f} unidades que se pueden devolver, ` +
        `así que ${V} se etiqueta [${P}−, ${deltaTexto(e.delta)}] (se llega a ${V} recorriendo esa arista al revés).` +
        `\nΔ = mín(${deltaTexto(ePadre.delta)}, ${f}) = ${deltaTexto(e.delta)}.`
      );
    }
    const c = cap[padre][nodo];
    if (c >= 99999)
      return (
        `Se examina ${P}: la arista ${P}→${V} es una conexión virtual con capacidad ∞, ` +
        `así que ${V} se etiqueta [${P}+, ${deltaTexto(e.delta)}].\nΔ = mín(${deltaTexto(ePadre.delta)}, ∞) = ${deltaTexto(e.delta)}.`
      );
    const f = p.flujo[padre][nodo];
    // Conexiones virtuales: su capacidad es la suma de las salidas de la fuente (o de las entradas del sumidero)
    const virtual =
      padre === d.red.superFuente
        ? ` (es la conexión virtual de ${V}: su capacidad es la suma de las capacidades de salida de ${V})`
        : nodo === d.red.superSumidero
          ? ` (es la conexión virtual de ${P}: su capacidad es la suma de las capacidades de entrada de ${P})`
          : "";
    return (
      `Se examina ${P}: la arista ${P}→${V}${virtual} todavía admite ${c - f} unidades (c − f = ${c} − ${f}), ` +
      `así que ${V} se etiqueta [${P}+, ${deltaTexto(e.delta)}].\nΔ = mín(${deltaTexto(ePadre.delta)}, ${c - f}) = ${deltaTexto(e.delta)}.`
    );
  };

  pasos.forEach((p, i) => {
    const encontrado = p.tipo === "camino_encontrado";
    if (encontrado || p.tipo === "sin_mas_caminos") {
      const it = iteracionDe(pasos, i);
      // Nodos que se etiquetan, en orden: los del camino, o todos los alcanzables en la última búsqueda
      const orden = encontrado ? nodosDelCamino(p) : [...p.etiquetas.keys()];
      const total = orden.length;
      if (!encontrado) vista = new Map();
      nuevas = new Set();
      for (let k = 1; k <= total; k++) {
        const nodo = orden[k - 1];
        const e = p.etiquetas.get(nodo)!;
        vista.set(nodo, e);
        nuevas.add(nodo);
        if (k === total) break; // la última etiqueta se ve en el paso del algoritmo
        let descripcion: string;
        if (e.padre === "-")
          descripcion = encontrado
            ? `Iteración ${it}: se busca un camino aumentante desde la fuente ${nom(nodo)}, que se etiqueta [-, ∞].\n` +
              `Solo se actualizan las etiquetas de los nodos del camino; los demás conservan la que tenían (en gris).`
            : `Iteración ${it}: se busca otra vez un camino desde la fuente ${nom(nodo)}, que se etiqueta [-, ∞].\n` +
              `Esta vez se etiquetan todos los nodos a los que se puede llegar, porque forman el lado S del corte.`;
        else descripcion = explicar(p, nodo, e);
        res.pasos.push({
          ...p,
          tipo: "etiquetando",
          etiquetas: new Map(vista),
          etiquetas_nuevas: new Set(nuevas),
          camino: [],
          aristas_camino: [],
          nodos_camino: new Set(),
          cuello_botella: 0,
          aristas_corte: [],
          conjunto_alcanzable: undefined,
          descripcion,
          nueva_etiqueta: {
            nodo,
            padre: e.padre === "-" ? null : e.padre,
            signo: e.signo === "-" ? "-" : "+",
            delta: e.delta,
            orden: k,
            total,
          },
        });
        res.origen.push(i);
      }
    } else if (p.tipo === "inicio") {
      vista = new Map(p.etiquetas);
      nuevas = new Set(p.etiquetas.keys());
    }
    // El corte mínimo usa la última búsqueda (todos los alcanzables), igual que el algoritmo
    if (p.tipo === "corte_minimo") res.pasos.push(p);
    else res.pasos.push({ ...p, etiquetas: new Map(vista), etiquetas_nuevas: new Set(nuevas) });
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
