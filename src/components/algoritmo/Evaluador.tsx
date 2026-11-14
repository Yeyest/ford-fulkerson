"use client";

import { useState } from "react";
import { type EvaluacionCorte, evaluarCorte, extremosEfectivos, textosEvaluacion } from "@/lib/ff/evaluador";
import type { Punto } from "@/lib/ff/geometria";
import { capATexto, listarAristas } from "@/lib/ff/nombres";
import Grafo, { type AristaVista, type NodoVista } from "../grafo/Grafo";
import Lienzo from "../grafo/Lienzo";
import { medidas } from "../grafo/escala";
import { TEXTO_OSCURO, estiloNodoBase } from "../grafo/estilos";
import { useEtiquetas, useGeometria } from "../grafo/hooks";
import { IconoCorte, TAM_ICONO } from "../iconos";
import { Boton, Insignia } from "../ui";
import { LineaCorte } from "./Corte";
import { type DatosRed, disponerRed } from "./red";

/** Estado del evaluador de cortes manuales (EvaluadorCortesInteractive). */
export function useEvaluador(datos: DatosRed) {
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [evaluacion, setEvaluacion] = useState<EvaluacionCorte | null>(null);
  const { fuente, sumidero } = extremosEfectivos(datos.roles.fuentes, datos.roles.sumideros, datos.red.superFuente, datos.red.superSumidero);

  return {
    modoSeleccion,
    seleccionadas,
    evaluacion,
    fuente,
    sumidero,
    /** «Empezar Selección de Aristas» / «Finalizar y Evaluar Corte» */
    alternar() {
      if (!modoSeleccion) {
        setModoSeleccion(true);
        setEvaluacion(null);
      } else {
        setModoSeleccion(false);
        const aristas = seleccionadas.map((k) => k.split("-").map(Number) as [number, number]);
        setEvaluacion(evaluarCorte(datos.red.capacidades, fuente, sumidero, aristas));
      }
    },
    reiniciar() {
      setSeleccionadas([]);
      setModoSeleccion(false);
      setEvaluacion(null);
    },
    marcar(clave: string) {
      if (!modoSeleccion) return;
      setSeleccionadas((s) => (s.includes(clave) ? s.filter((x) => x !== clave) : [...s, clave]));
    },
  };
}

export type Evaluador = ReturnType<typeof useEvaluador>;

export function GrafoEvaluador({ datos, ev, ancho, alto }: { datos: DatosRed; ev: Evaluador; ancho: number; alto: number }) {
  const { red, ctx, nom } = datos;
  const cap = red.capacidades;
  const { pts, bandas, orientacion } = disponerRed(datos, ancho, alto);
  const med = medidas([...pts.values()], ancho);
  const pares = listarAristas(cap);
  const geo = useGeometria(pts, pares, med.radio, ancho, alto);
  const textos = new Map(pares.map(([u, v]) => [`${u}-${v}`, capATexto(cap[u][v])]));
  const etiquetas = useEtiquetas(geo, textos, pts, ancho, alto, med.radio, med.fuenteEtiqueta, ev.evaluacion !== null);
  const e = ev.evaluacion;
  const enCorte = new Set((e?.aristasCorte ?? []).map(([u, v]) => `${u}-${v}`));

  const aristas: AristaVista[] = pares.map(([u, v]) => {
    const k = `${u}-${v}`;
    const sel = ev.seleccionadas.includes(k);
    let estilo: Partial<AristaVista>;
    if (sel && (!e || enCorte.has(k))) estilo = { color: "var(--a-corte)", ancho: 4.5, halo: "var(--a-corte-halo)" };
    else if (sel) estilo = { color: "var(--a-sin-efecto)", ancho: 3.2, punteada: true };
    else estilo = { color: "var(--a-sin-flujo)", ancho: ev.modoSeleccion ? 2.4 : 1.8 };
    return {
      clave: k,
      geo: geo.get(k)!,
      color: estilo.color!,
      ancho: estilo.ancho!,
      ...estilo,
      etiqueta: { texto: textos.get(k)!, pos: etiquetas.get(k)!, borde: estilo.color, negrita: sel },
      rotulo: `Arista ${nom(u)} a ${nom(v)}, capacidad ${capATexto(cap[u][v])}${sel ? ", marcada" : ""}`,
      enfocable: ev.modoSeleccion,
      presionada: ev.modoSeleccion ? sel : undefined,
    };
  });

  const nodos: NodoVista[] = [...pts].map(([id, p]) => {
    if (!e) return { id, nombre: nom(id), p, ...estiloNodoBase(id, ctx), rotulo: `Nodo ${nom(id)}` };
    const enS = e.conjuntoS.has(id);
    const sumideroEnS = id === ev.sumidero && enS;
    return {
      id,
      nombre: nom(id),
      p,
      relleno: enS ? "var(--n-lado-s)" : "var(--n-intermedio)",
      borde: sumideroEnS ? "var(--a-corte)" : enS ? "var(--n-lado-s-borde)" : "var(--n-lado-t-borde)",
      grosor: sumideroEnS ? 4 : enS ? 3 : 1.5,
      colorTexto: TEXTO_OSCURO,
      tag: { texto: enS ? "[S]" : "[T]", fondo: enS ? "var(--t-fuente)" : "var(--t-vacia)", color: enS ? "#1d4ed8" : "#52525b" },
      rotulo: `Nodo ${nom(id)}, lado ${enS ? "S" : "T"}`,
    };
  });

  let linea = null;
  if (e && e.aristasCorte.length) {
    const puntos: Punto[] = e.aristasCorte.map(([u, v]) => etiquetas.get(`${u}-${v}`)!);
    const cuerdas: Punto[] = e.aristasCorte.map(([u, v]) => [pts.get(v)![0] - pts.get(u)![0], pts.get(v)![1] - pts.get(u)![1]]);
    linea = <LineaCorte puntos={puntos} cuerdas={cuerdas} centros={[...pts.values()]} radio={med.radio} ancho={ancho} alto={alto} />;
  }

  return (
    <Lienzo ancho={ancho} alto={alto} etiqueta="Evaluador de cortes manuales">
      <Grafo
        nodos={nodos}
        aristas={aristas}
        radio={med.radio}
        fuenteNodo={med.fuenteNodo}
        fuenteEtiqueta={med.fuenteEtiqueta}
        fuenteTag={med.fuenteTag}
        bandas={bandas}
        orientacion={orientacion}
        onAristaClick={ev.modoSeleccion ? (k) => ev.marcar(k) : undefined}
        onAristaTecla={(k, evt) => {
          if (evt.key === "Enter" || evt.key === " ") { evt.preventDefault(); ev.marcar(k); }
        }}
      />
      {linea}
    </Lienzo>
  );
}

export function PanelEvaluador({ datos, ev, flujoMaximo }: { datos: DatosRed; ev: Evaluador; flujoMaximo: number }) {
  const { nom, red } = datos;
  const e = ev.evaluacion;
  const lista = (ks: string[]) =>
    ks.length
      ? ks
          .map((k) => k.split("-").map(Number))
          .sort((a, b) => a[0] - b[0] || a[1] - b[1])
          .map(([u, v]) => `${nom(u)}→${nom(v)}`)
          .join(", ")
      : "ninguna";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <IconoCorte size={20} aria-hidden="true" className="shrink-0" />
          Evaluador de cortes manuales
        </h2>
        <p className="mt-1 text-[15px] text-tenue">
          Elige aristas para cortar. Se omiten, se busca desde la fuente {nom(ev.fuente)} y los nodos alcanzables forman el lado S. El corte
          es válido si el sumidero {nom(ev.sumidero)} queda en T.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Boton variante="primario" onClick={ev.alternar}>
          {ev.modoSeleccion ? "Finalizar y Evaluar Corte" : "Empezar Selección de Aristas"}
        </Boton>
        <Boton onClick={ev.reiniciar}>↺ Reiniciar Selección</Boton>
      </div>

      <div aria-live="polite" className="flex flex-col gap-3">
        {!e ? (
          <>
            <Insignia color={ev.modoSeleccion ? "var(--i-seleccion)" : "var(--i-inicio)"} className="self-start">
              {ev.modoSeleccion ? "MODO SELECCIÓN ACTIVO" : "SELECCIÓN INACTIVA"}
            </Insignia>
            <p className="font-semibold">Aristas marcadas para el corte: {ev.seleccionadas.length}</p>
            <p className="font-mono text-[15px]">{lista(ev.seleccionadas)}</p>
            <p className="text-sm text-tenue italic">
              {ev.modoSeleccion
                ? "Haz clic sobre una arista (o sobre su capacidad) para marcarla o desmarcarla. Al terminar, pulsa «Finalizar y Evaluar Corte»."
                : "Pulsa «Empezar Selección de Aristas» para elegir las aristas que quieres cortar."}
            </p>
            {ev.modoSeleccion && <p className="text-sm text-tenue">Con teclado: Tab hasta una arista y Enter para marcarla.</p>}
          </>
        ) : (
          <ResultadoCorte e={e} datos={datos} flujoMaximo={flujoMaximo} />
        )}
      </div>
      <p className="text-xs text-tenue">La red tiene {red.nTrabajo} nodos (incluye S y T si se crearon).</p>
    </div>
  );
}

function ResultadoCorte({ e, datos, flujoMaximo }: { e: EvaluacionCorte; datos: DatosRed; flujoMaximo: number }) {
  const t = textosEvaluacion(datos.red.capacidades, e, datos.red.superFuente, datos.red.superSumidero);
  const capacidad = e.aristasCorte.reduce((a, [u, v]) => a + datos.red.capacidades[u][v], 0);
  return (
    <>
      <Insignia color={e.esCorteValido ? "var(--i-valido)" : "var(--i-invalido)"} className="self-start">
        {t.insignia}
      </Insignia>
      <p className="font-mono text-[15px] font-semibold">{t.lados}</p>
      <p className="font-mono text-[15px] whitespace-pre-line">{t.capacidad}</p>
      {t.notas.map((n) => (
        <p key={n} className="text-sm whitespace-pre-line" style={{ color: "var(--a-aviso)" }}>
          {n}
        </p>
      ))}
      {e.esCorteValido && (
        <p className="text-sm text-tenue">
          Compáralo con el flujo máximo ({flujoMaximo}):{" "}
          {capacidad === flujoMaximo ? "este corte es mínimo." : `este corte tiene capacidad ${capacidad >= 99999 ? "∞" : capacidad}, mayor que el mínimo.`}
        </p>
      )}
      <p className="text-sm text-tenue italic">
        Pulsa «Empezar Selección de Aristas» para modificar la selección o «Reiniciar Selección» para empezar de cero.
      </p>
    </>
  );
}
