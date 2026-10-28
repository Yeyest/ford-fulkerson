"use client";

import type { Paso } from "@/lib/ff/algoritmo";
import { type Curva, type Punto, curva } from "@/lib/ff/geometria";
import { capATexto, listarAristas } from "@/lib/ff/nombres";
import Grafo, { type AristaVista, type NodoVista } from "../grafo/Grafo";
import Lienzo from "../grafo/Lienzo";
import { medidas } from "../grafo/escala";
import { estiloAristaPaso, estiloNodoPaso, estiloTag, textoFlujo } from "../grafo/estilos";
import { useEtiquetas, useGeometria } from "../grafo/hooks";
import { LineaCorte, Zonas } from "./Corte";
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
}

/** Arcos de la red residual: c − f hacia adelante y f hacia atrás (campo `residual` del paso). */
function arcosResiduales(paso: Paso, base: Map<string, Curva>, pares: [number, number][]): Arco[] {
  const arcos: Arco[] = [];
  for (const [u, v] of pares) {
    const k = `${u}-${v}`;
    const g = base.get(k)!;
    const adelante = paso.residual[u][v];
    const atras = paso.residual[v][u];
    const largo = Math.hypot(g.p2[0] - g.p1[0], g.p2[1] - g.p1[1]) || 1;
    const sep = adelante > 0 && atras > 0 ? 26 / largo : 0;
    if (adelante > 0)
      arcos.push({ clave: `${k}+`, u, v, geo: sep ? curva(g.p1, g.p2, g.rad + sep) : g, texto: capATexto(adelante), original: k, sentido: "+" });
    if (atras > 0)
      arcos.push({ clave: `${k}-`, u: v, v: u, geo: curva(g.p2, g.p1, sep ? sep - g.rad : -g.rad), texto: String(atras), original: k, sentido: "-" });
  }
  return arcos;
}

export default function GrafoPaso({ datos, paso, vista, ancho, alto }: { datos: DatosRed; paso: Paso; vista: Vista; ancho: number; alto: number }) {
  const { red, ctx, nom } = datos;
  const cap = red.capacidades;
  const { pts, bandas, orientacion } = disponerRed(datos, ancho, alto);
  const med = medidas([...pts.values()], ancho);
  const pares = listarAristas(cap);
  const base = useGeometria(pts, pares, med.radio, ancho, alto);

  const caminoMapa = new Map<string, "+" | "-">(paso.aristas_camino.map(([u, v, s]) => [`${u}-${v}`, s]));
  const corte = new Set(paso.aristas_corte.map(([u, v]) => `${u}-${v}`));

  // Arcos a dibujar según la vista
  const arcos: Arco[] =
    vista === "flujo"
      ? pares.map(([u, v]) => {
          const k = `${u}-${v}`;
          const s = paso.tipo === "camino_encontrado" ? caminoMapa.get(k) : undefined;
          return { clave: k, u, v, geo: base.get(k)!, texto: textoFlujo(paso.flujo[u][v], cap[u][v], s, paso.cuello_botella), original: k, sentido: "+" };
        })
      : arcosResiduales(paso, base, pares);

  const geoArcos = new Map(arcos.map((a) => [a.clave, a.geo]));
  const textos = new Map(arcos.map((a) => [a.clave, a.texto]));
  const etiquetas = useEtiquetas(geoArcos, textos, pts, ancho, alto, med.radio, med.fuenteEtiqueta, true);

  const aristas: AristaVista[] = arcos.map((a) => {
    const [u, v] = a.original.split("-").map(Number);
    let estilo;
    if (vista === "flujo") {
      estilo = estiloAristaPaso(u, v, paso, cap[u][v], caminoMapa, corte);
    } else {
      const s = caminoMapa.get(a.original);
      const usado = s !== undefined && s === a.sentido;
      if (paso.tipo === "camino_encontrado" && usado)
        // En la red residual el camino recorre los arcos en su propio sentido
        estilo = { color: a.sentido === "+" ? "var(--a-directo)" : "var(--a-inverso)", ancho: 4.5, animacion: "adelante" as const };
      else if (paso.tipo === "flujo_actualizado" && s !== undefined) estilo = { color: "var(--a-actualizada)", ancho: 3.5 };
      else estilo = { color: "var(--a-residual)", ancho: a.sentido === "+" ? 2 : 1.6, punteada: a.sentido === "-" };
    }
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
      etiqueta: { texto: a.texto, pos: etiquetas.get(a.clave)!, borde: estilo.color, negrita: estilo.ancho >= 4 },
      rotulo,
    };
  });

  const nodos: NodoVista[] = [...pts].map(([id, p]) => {
    const e = estiloNodoPaso(id, paso, ctx);
    const tag = estiloTag(id, paso.etiquetas, nom);
    return { id, nombre: nom(id), p, ...e, tag, rotulo: `Nodo ${nom(id)}, etiqueta ${tag.texto}` };
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
