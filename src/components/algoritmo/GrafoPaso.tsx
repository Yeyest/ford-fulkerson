"use client";

import type { Paso } from "@/lib/ff/algoritmo";
import { type CajaNodo, type Curva, type Punto, cajasEtiquetasNodo, curva, elegirCurvatura } from "@/lib/ff/geometria";
import { capATexto, listarAristas } from "@/lib/ff/nombres";
import Grafo, { type AnimacionArista, type AristaVista, type NodoVista } from "../grafo/Grafo";
import Lienzo from "../grafo/Lienzo";
import { medidas } from "../grafo/escala";
import { type EstiloArista, estiloAristaPaso, estiloNodoPaso, estiloTag, textoFlujo } from "../grafo/estilos";
import { useEtiquetas, useGeometria } from "../grafo/hooks";
import { LineaCorte, Zonas } from "./Corte";
import { type Retroceso, duracionTramo, retrocesos } from "./inverso";
import { type DatosRed, disponerRed } from "./red";

export type Vista = "flujo" | "residual";

interface Arco {
  clave: string;
  u: number;
  v: number;
  geo: Curva;
  texto: string;
  /** Arista original (u, v) y si el arco va hacia adelante o hacia atrás. */
  original: string;
  sentido: "+" | "-";
  /** Flecha de retroceso por flujo inverso (dibujada junto a la arista original, en sentido contrario). */
  retroceso?: Retroceso;
}

/** Separación (px en el punto de control) entre una arista y su flecha de retroceso. */
const SEPARACION_RETROCESO = 46;

/** Entorno para elegir por dónde van los arcos que acompañan a una arista (nodos, etiquetas y lienzo). */
interface Entorno {
  pts: ReadonlyMap<number, Punto>;
  radio: number;
  cajas: readonly CajaNodo[];
  limites: [number, number];
}

/** Desplazamientos (en curvatura) y separaciones (px) que se prueban para el par de arcos de la red residual. */
const DESPLAZAMIENTOS_PAR = [0, 0.08, -0.08, 0.16, -0.16, 0.25, -0.25, 0.35, -0.35];
const SEPARACIONES_PAR = [26, 20, 14];
/** Separaciones (px) que se prueban para la flecha de retroceso: primero la habitual, luego al otro lado. */
const SEPARACIONES_RETROCESO = [SEPARACION_RETROCESO, -SEPARACION_RETROCESO, 60, -60, 34, -34];

/** Arcos de la red residual: c − f hacia adelante y f hacia atrás (campo `residual` del paso). */
function arcosResiduales(paso: Paso, base: Map<string, Curva>, pares: [number, number][], entorno: Entorno): Arco[] {
  const arcos: Arco[] = [];
  for (const [u, v] of pares) {
    const k = `${u}-${v}`;
    const g = base.get(k)!;
    const adelante = paso.residual[u][v];
    const atras = paso.residual[v][u];
    const largo = Math.hypot(g.p2[0] - g.p1[0], g.p2[1] - g.p1[1]) || 1;
    if (adelante > 0 && atras > 0) {
      // Los dos sentidos se dibujan separados, a cada lado de la arista; el par se corre un poco
      // si así deja de pasar sobre otro nodo o su etiqueta.
      const opciones = SEPARACIONES_PAR.flatMap((px) =>
        DESPLAZAMIENTOS_PAR.map((d) => [curva(g.p1, g.p2, g.rad + d + px / largo), curva(g.p2, g.p1, px / largo - g.rad - d)]),
      );
      const [ida, vuelta] = opciones[elegirCurvatura(opciones, [u, v], entorno.pts, entorno.radio, entorno.cajas, entorno.limites)];
      arcos.push({ clave: `${k}+`, u, v, geo: ida, texto: capATexto(adelante), original: k, sentido: "+" });
      arcos.push({ clave: `${k}-`, u: v, v: u, geo: vuelta, texto: String(atras), original: k, sentido: "-" });
    } else if (adelante > 0) {
      arcos.push({ clave: `${k}+`, u, v, geo: g, texto: capATexto(adelante), original: k, sentido: "+" });
    } else if (atras > 0) {
      arcos.push({ clave: `${k}-`, u: v, v: u, geo: curva(g.p2, g.p1, -g.rad), texto: String(atras), original: k, sentido: "-" });
    }
  }
  return arcos;
}

export default function GrafoPaso({
  datos,
  paso,
  anterior,
  vista,
  ancho,
  alto,
  entrada = false,
  idPaso,
}: {
  datos: DatosRed;
  paso: Paso;
  /** Paso previo: en "flujo_actualizado" se usa para mostrar el valor anterior de cada arista. */
  anterior?: Paso;
  vista: Vista;
  ancho: number;
  alto: number;
  /** Animación de entrada de la red (al empezar el algoritmo). */
  entrada?: boolean;
  /** Índice del paso: al cambiar, las animaciones del camino empiezan de nuevo. */
  idPaso?: number;
}) {
  const { red, ctx, nom } = datos;
  const cap = red.capacidades;
  const { pts, bandas, orientacion } = disponerRed(datos, ancho, alto);
  const med = medidas([...pts.values()], ancho);
  const pares = listarAristas(cap);
  const base = useGeometria(pts, pares, med.radio, ancho, alto, med.fuenteTag);
  const entorno: Entorno = { pts, radio: med.radio, cajas: cajasEtiquetasNodo(pts, med.radio, med.fuenteTag), limites: [ancho, alto] };

  const caminoMapa = new Map<string, "+" | "-">(paso.aristas_camino.map(([u, v, s]) => [`${u}-${v}`, s]));
  // Orden de cada arista original dentro del camino (para animar el recorrido tramo a tramo)
  const ordenCamino = new Map<string, number>(paso.aristas_camino.map(([u, v], i) => [`${u}-${v}`, i]));
  const tramo = duracionTramo(paso);
  const vuelta = paso.aristas_camino.length * tramo + 1200;
  const actualizado = paso.tipo === "flujo_actualizado" && anterior !== undefined;
  const corte = new Set(paso.aristas_corte.map(([u, v]) => `${u}-${v}`));

  // Flujo inverso que usa el camino aumentante. Los retrocesos que solo sirvieron para
  // etiquetar un nodo no se dibujan: no cambian el flujo de la arista en esta iteración.
  const lista = retrocesos(paso).filter((r) => r.enCamino);

  // Arcos a dibujar según la vista
  const arcos: Arco[] =
    vista === "flujo"
      ? pares.map(([u, v]) => {
          const k = `${u}-${v}`;
          const s = paso.tipo === "camino_encontrado" ? caminoMapa.get(k) : undefined;
          // Al actualizar, la etiqueta muestra el cambio: antes→después/c
          const texto =
            actualizado && caminoMapa.has(k)
              ? `${anterior.flujo[u][v]}→${paso.flujo[u][v]}/${capATexto(cap[u][v])}`
              : textoFlujo(paso.flujo[u][v], cap[u][v], s, paso.cuello_botella);
          return { clave: k, u, v, geo: base.get(k)!, texto, original: k, sentido: "+" };
        })
      : arcosResiduales(paso, base, pares, entorno);

  // En la red de flujo, cada tramo inverso del camino se dibuja como una flecha propia que va de
  // `desde` a `nodo`, pegada a la arista nodo→desde: así se ve por dónde «regresa» el camino.
  if (vista === "flujo")
    for (const r of lista) {
      const k = `${r.nodo}-${r.desde}`;
      const g = base.get(k);
      if (!g) continue;
      const largo = Math.hypot(g.p2[0] - g.p1[0], g.p2[1] - g.p1[1]) || 1;
      const texto = `↩ −${paso.cuello_botella}`;
      // Junto a la arista, del lado en que no tape otro nodo ni su etiqueta.
      const opciones = SEPARACIONES_RETROCESO.map((sep) => [curva(g.p2, g.p1, sep / largo - g.rad)]);
      const [geo] = opciones[elegirCurvatura(opciones, [r.nodo, r.desde], entorno.pts, entorno.radio, entorno.cajas, entorno.limites)];
      arcos.push({ clave: `ret-${k}`, u: r.desde, v: r.nodo, geo, texto, original: k, sentido: "-", retroceso: r });
    }

  const geoArcos = new Map(arcos.map((a) => [a.clave, a.geo]));
  const textos = new Map(arcos.map((a) => [a.clave, a.texto]));
  const etiquetas = useEtiquetas(geoArcos, textos, pts, ancho, alto, med.radio, med.fuenteEtiqueta, med.fuenteTag);

  // Mientras se etiqueta nodo por nodo: aristas por las que se llegó a cada nodo ya etiquetado
  // (arista original → signo de la etiqueta) y la de la etiqueta que se acaba de poner.
  const arbol = new Map<string, "+" | "-">();
  if (paso.tipo === "etiquetando")
    for (const [n, e] of paso.etiquetas)
      if (e.padre !== "-" && (!paso.etiquetas_nuevas || paso.etiquetas_nuevas.has(n))) arbol.set(e.signo === "-" ? `${n}-${e.padre}` : `${e.padre}-${n}`, e.signo === "-" ? "-" : "+");
  const nueva = paso.nueva_etiqueta;
  const aristaNueva = nueva && nueva.padre !== null ? (nueva.signo === "-" ? `${nueva.nodo}-${nueva.padre}` : `${nueva.padre}-${nueva.nodo}`) : null;
  const estiloEtiquetado = (k: string, sentido: "+" | "-"): EstiloArista | null => {
    const s = arbol.get(k);
    if (s === undefined || (vista === "residual" && s !== sentido)) return null;
    const color = s === "+" ? "var(--n-etiquetado-borde)" : "var(--a-inverso)";
    if (k === aristaNueva) return { color, ancho: 4.5, punteada: s === "-" && vista === "flujo", animacion: s === "+" || vista === "residual" ? "adelante" : "atras" };
    return { color, ancho: 2.8, punteada: s === "-" && vista === "flujo" };
  };

  const aristas: AristaVista[] = arcos.map((a) => {
    const [u, v] = a.original.split("-").map(Number);
    if (a.retroceso) return aristaRetroceso(a, a.retroceso);
    let estilo: EstiloArista;
    const etiquetado = paso.tipo === "etiquetando" ? estiloEtiquetado(a.original, a.sentido) : null;
    if (etiquetado) estilo = etiquetado;
    else if (vista === "flujo") {
      estilo = estiloAristaPaso(u, v, paso, cap[u][v], caminoMapa, corte);
      // Arista recorrida al revés: el camino va por su flecha de retroceso; ella queda en rosa fino
      if (caminoMapa.get(a.original) === "-" && (paso.tipo === "camino_encontrado" || actualizado))
        estilo = { color: "var(--a-inverso)", ancho: 2.6 };
    } else {
      const s = caminoMapa.get(a.original);
      const usado = s !== undefined && s === a.sentido;
      if (paso.tipo === "camino_encontrado" && usado)
        // En la red residual el camino recorre los arcos en su propio sentido
        estilo = { color: a.sentido === "+" ? "var(--a-directo)" : "var(--a-inverso)", ancho: 4.5, animacion: "adelante" as const };
      else if (paso.tipo === "flujo_actualizado" && s !== undefined) estilo = { color: "var(--a-actualizada)", ancho: 3.5 };
      else estilo = { color: "var(--a-residual)", ancho: a.sentido === "+" ? 2 : 1.6, punteada: a.sentido === "-" };
    }
    // Animaciones del camino: destello y partícula tramo a tramo, desde la fuente hasta el sumidero
    const signo = caminoMapa.get(a.original);
    const usado = signo !== undefined && (vista === "flujo" || signo === a.sentido);
    const inversa = usado && signo === "-";
    const anim: AnimacionArista = {};
    // (en la red de flujo, el tramo inverso se anima en su flecha de retroceso)
    if (paso.tipo === "camino_encontrado" && usado && !(vista === "flujo" && inversa)) {
      const orden = ordenCamino.get(a.original) ?? 0;
      const color = inversa ? "var(--a-inverso)" : "var(--a-directo)";
      anim.trazo = { retardo: orden * tramo, duracion: tramo * 1.6, color };
      anim.particula = { retardo: orden * tramo, duracion: tramo, periodo: vuelta, color };
    } else if (actualizado && signo !== undefined && (vista === "flujo" || a.sentido === "+")) {
      anim.flotante = signo === "+" ? { texto: `+${paso.cuello_botella}`, color: "var(--a-actualizada)" } : { texto: `−${paso.cuello_botella}`, color: "var(--a-inverso)" };
    }
    if (entrada) anim.entrada = 150 + (Math.min(pts.get(a.u)![0], pts.get(a.v)![0]) / ancho) * 650;
    const f = paso.flujo[u][v];
    const rotulo =
      vista === "flujo"
        ? `Arista ${nom(u)} a ${nom(v)}: flujo ${f} de ${capATexto(cap[u][v])}`
        : a.sentido === "+"
          ? `Residual de ${nom(a.u)} a ${nom(a.v)}: ${a.texto}`
          : `Flujo que puede devolverse de ${nom(a.u)} a ${nom(a.v)}: ${a.texto}`;
    return {
      clave: a.clave,
      geo: a.geo,
      ...estilo,
      halo: inversa && vista === "residual" && paso.tipo === "camino_encontrado" ? "var(--a-inverso-halo)" : estilo.halo,
      etiqueta: { texto: a.texto, pos: etiquetas.get(a.clave)!, borde: estilo.color, negrita: estilo.ancho >= 4 },
      rotulo: inversa ? `${rotulo}. Flujo inverso: se devuelven ${paso.cuello_botella} unidades` : rotulo,
      anim,
    };
  });

  /** Flecha de retroceso del camino: por ella «regresa» el camino y se devuelve Δ. */
  function aristaRetroceso(a: Arco, r: Retroceso): AristaVista {
    const color = "var(--a-inverso)";
    const encontrado = paso.tipo === "camino_encontrado";
    const anim: AnimacionArista = {};
    if (encontrado) {
      const orden = ordenCamino.get(a.original) ?? 0;
      anim.trazo = { retardo: orden * tramo, duracion: tramo * 1.6, color };
      anim.particula = { retardo: orden * tramo, duracion: tramo, periodo: vuelta, color };
    }
    const n = nom(r.nodo);
    const d = nom(r.desde);
    const rotulo = `Flujo inverso en el camino: de ${d} se regresa a ${n} por la arista ${n} a ${d}, devolviendo ${paso.cuello_botella} unidades`;
    return {
      clave: a.clave,
      geo: a.geo,
      color,
      ancho: encontrado ? 4.5 : 3.2,
      halo: encontrado ? "var(--a-inverso-halo)" : undefined,
      etiqueta: { texto: a.texto, pos: etiquetas.get(a.clave)!, borde: color, color, negrita: true },
      rotulo,
      anim,
    };
  }

  const nodos: NodoVista[] = [...pts].map(([id, p]) => {
    const e = estiloNodoPaso(id, paso, ctx);
    const tag = estiloTag(id, paso.etiquetas, nom, paso.etiquetas_nuevas !== undefined && !paso.etiquetas_nuevas.has(id));
    return {
      id,
      nombre: nom(id),
      p,
      ...e,
      tag,
      rotulo: `Nodo ${nom(id)}, etiqueta ${tag.texto}`,
      entrada: entrada ? (p[0] / ancho) * 650 : undefined,
    };
  });

  // Corte mínimo: zonas S / T y línea de corte por las aristas cortadas
  const final = paso.tipo === "corte_minimo";
  let puntosCorte: Punto[] = [];
  let cuerdas: Punto[] = [];
  if (final && paso.aristas_corte.length) {
    puntosCorte = paso.aristas_corte.map(([u, v]) => etiquetas.get(`${u}-${v}`) ?? base.get(`${u}-${v}`)!.poli[20]);
    cuerdas = paso.aristas_corte.map(([u, v]) => [pts.get(v)![0] - pts.get(u)![0], pts.get(v)![1] - pts.get(u)![1]]);
  }

  return (
    <Lienzo ancho={ancho} alto={alto} etiqueta={`Grafo del paso: ${vista === "flujo" ? "red de flujo" : "red residual"}`}>
      {final && paso.conjunto_alcanzable && (
        <Zonas pts={pts} ladoS={paso.conjunto_alcanzable} aristas={pares} radio={med.radio} />
      )}
      <Grafo
        key={idPaso}
        nodos={nodos}
        aristas={aristas}
        radio={med.radio}
        fuenteNodo={med.fuenteNodo}
        fuenteEtiqueta={med.fuenteEtiqueta}
        fuenteTag={med.fuenteTag}
        bandas={final ? bandas?.map((b) => ({ ...b, color: null })) : bandas}
        orientacion={orientacion}
      />
      {final && puntosCorte.length > 0 && (
        <LineaCorte puntos={puntosCorte} cuerdas={cuerdas} centros={[...pts.values()]} radio={med.radio} ancho={ancho} alto={alto} />
      )}
    </Lienzo>
  );
}
