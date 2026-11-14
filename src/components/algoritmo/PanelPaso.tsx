"use client";

import type { Paso } from "@/lib/ff/algoritmo";
import { estiloTag } from "../grafo/estilos";
import type { DatosRed } from "./red";
import TextoPython from "./TextoPython";
import { IconoCamino, TAM_ICONO } from "../iconos";
import { type TramoInverso, retrocesos, tramosInversos, usaFlujoInverso } from "./inverso";

/** Descripción del paso y tabla de etiquetas [padre±, Δ]. */
export default function PanelPaso({ paso, anterior, datos }: { paso: Paso; anterior?: Paso; datos: DatosRed }) {
  const { nom, red } = datos;
  // Primero las etiquetas de esta iteración (en el orden en que se pusieron), luego las anteriores
  const nuevas = paso.etiquetas_nuevas ? [...paso.etiquetas_nuevas] : [...paso.etiquetas.keys()];
  const anteriores = [...paso.etiquetas.keys()].filter((u) => !nuevas.includes(u));
  const sinEtiqueta = Array.from({ length: red.nTrabajo }, (_, i) => i).filter((u) => !paso.etiquetas.has(u));
  // La aclaración «← = arista recorrida al revés» solo tiene sentido si el camino usa flujo inverso
  const descripcion = usaFlujoInverso(paso) ? paso.descripcion : paso.descripcion.replace(/ *\(← = arista recorrida al revés\)/, "");

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="titulo-descripcion">
        <h2 id="titulo-descripcion" className="mb-2 text-xs font-semibold tracking-wider text-tenue uppercase">
          Descripción del paso
        </h2>
        <TextoPython texto={descripcion} />
      </section>

      {paso.cuello_botella > 0 && (
        <p className="flex items-baseline gap-3 rounded-md border border-borde px-3 py-2">
          <span className="flex items-center gap-1.5 self-center text-xs font-semibold tracking-wider text-tenue uppercase">
            <IconoCamino size={TAM_ICONO} aria-hidden="true" className="shrink-0" />
            Δ del camino
          </span>
          <span className="font-mono text-2xl font-semibold">{paso.cuello_botella}</span>
        </p>
      )}

      <FlujoInverso paso={paso} datos={datos} />
      {paso.tipo === "flujo_actualizado" && anterior && <CambiosDelFlujo paso={paso} anterior={anterior} datos={datos} />}

      <section aria-labelledby="titulo-etiquetas">
        <h2 id="titulo-etiquetas" className="mb-2 text-xs font-semibold tracking-wider text-tenue uppercase">
          Etiquetas de los nodos
        </h2>
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-borde text-left text-xs text-tenue">
              <th className="py-1 font-medium">#</th>
              <th className="py-1 font-medium">Nodo</th>
              <th className="py-1 font-medium">[padre±, Δ]</th>
              <th className="py-1 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {[...nuevas, ...anteriores, ...sinEtiqueta].map((u, i) => {
              const anterior = anteriores.includes(u);
              const tag = estiloTag(u, paso.etiquetas, nom, anterior);
              const e = paso.etiquetas.get(u);
              const enCamino = paso.nodos_camino.has(u) && (paso.tipo === "camino_encontrado" || paso.tipo === "flujo_actualizado");
              return (
                <tr
                  key={u}
                  className={`border-b border-borde last:border-0 ${e && !anterior ? "" : "text-tenue"}`}
                  style={paso.nueva_etiqueta?.nodo === u ? { background: "color-mix(in srgb, var(--n-etiquetado) 45%, transparent)" } : undefined}
                >
                  <td className="py-1 font-mono text-xs text-tenue">{e && !anterior ? i + 1 : ""}</td>
                  <td className="py-1 font-mono font-semibold">
                    {nom(u)}
                    {enCamino && (
                      <span className="ml-1.5 inline-block h-2 w-2 rounded-full" style={{ background: "var(--n-camino-borde)" }} title="en el camino" />
                    )}
                  </td>
                  <td className="py-1">
                    <span className="rounded-full px-2 py-0.5 font-mono text-sm text-[#171717]" style={{ background: tag.fondo }}>
                      {tag.texto}
                    </span>
                  </td>
                  <td className="py-1 text-right font-mono">{e ? (e.delta >= 99999 ? "∞" : e.delta) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-tenue">
          El orden (#) es el orden en que se etiquetaron los nodos en esta iteración.
          {anteriores.length > 0 && " Las etiquetas en gris son de una iteración anterior: esos nodos no están en el camino de esta iteración, así que no se actualizaron."}
        </p>
        <EtiquetasInversas paso={paso} datos={datos} />
      </section>
    </div>
  );
}

/** Explica, tramo por tramo, qué significa usar una arista al revés en este camino. */
function FlujoInverso({ paso, datos }: { paso: Paso; datos: DatosRed }) {
  const tramos = tramosInversos(paso);
  if (!tramos.length) return null;
  const { nom } = datos;
  const delta = paso.cuello_botella;
  const encontrado = paso.tipo === "camino_encontrado";
  return (
    <section
      aria-labelledby="titulo-inverso"
      className="aparecer rounded-md border-2 px-3 py-3"
      style={{ borderColor: "var(--a-inverso)", background: "color-mix(in srgb, var(--a-inverso) 7%, var(--fondo))" }}
    >
      <h2 id="titulo-inverso" className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--a-inverso)" }}>
        <span aria-hidden="true" className="text-base">↩</span>
        {encontrado ? "Este camino usa flujo inverso" : "Flujo devuelto en esta actualización"}
      </h2>
      <p className="mb-3 text-[15px] leading-snug">
        {encontrado
          ? "Una arista que ya lleva flujo se recorre al revés. No se envía flujo nuevo por ella: se devuelve parte del que ya pasaba, para corregir una decisión de una iteración anterior. En el grafo, la flecha rosada gruesa (↩) junto a la arista muestra por dónde regresa el camino."
          : "En las aristas recorridas al revés el flujo disminuye en Δ; en las demás aumenta en Δ. Aun así, el flujo total sube Δ."}
      </p>
      <ul className="flex flex-col gap-3">
        {tramos.map((t) => (
          <Tramo key={`${t.a}-${t.b}`} t={t} delta={delta} nom={nom} encontrado={encontrado} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Nota bajo la tabla de etiquetas: nodos etiquetados con − (la búsqueda llegó a ellos por una
 * arista que ya lleva flujo) cuyo retroceso no forma parte del camino. No se dibujan en el grafo.
 */
function EtiquetasInversas({ paso, datos }: { paso: Paso; datos: DatosRed }) {
  const lista = retrocesos(paso).filter((r) => !r.enCamino);
  if (!lista.length) return null;
  const { nom } = datos;
  const final = paso.tipo === "sin_mas_caminos";
  return (
    <div className="mt-2 flex flex-col gap-1 text-xs text-tenue">
      {lista.map((r) => {
        const n = nom(r.nodo);
        const d = nom(r.desde);
        return (
          <p key={r.nodo}>
            <span className="font-mono">
              {n} [{d}−, {r.delta}]
            </span>
            : la búsqueda llegó a {n} desde {d} por la arista {n}→{d}, que ya lleva flujo.{" "}
            {final
              ? `Por eso ${n} es alcanzable y queda del lado S del corte.`
              : `El camino elegido no pasa por ahí, así que esa arista no cambia y no se usa flujo inverso.`}
          </p>
        );
      })}
    </div>
  );
}

function Tramo({ t, delta, nom, encontrado }: { t: TramoInverso; delta: number; nom: (u: number) => string; encontrado: boolean }) {
  const a = nom(t.a);
  const b = nom(t.b);
  return (
    <li className="rounded-md bg-fondo px-3 py-2 text-[15px] leading-snug">
      <p className="mb-1.5 flex flex-wrap items-center gap-2 font-mono">
        <span className="font-semibold">
          {b} <span style={{ color: "var(--a-inverso)" }}>←</span> {a}
        </span>
        <span className="text-xs text-tenue">recorre al revés la arista {a}→{b}</span>
      </p>
      <p className="mb-1.5 font-mono">
        f({a},{b}): <span className={encontrado ? "" : "line-through opacity-60"}>{t.antes}</span>
        <span className="text-tenue"> − {delta} → </span>
        <span className="font-semibold" style={{ color: "var(--a-inverso)" }}>
          {t.despues}
        </span>
      </p>
      <p className="text-sm text-tenue">
        {t.previo !== null ? (
          <>
            {b} ya recibe {delta} por el camino desde {nom(t.previo)}, así que deja de necesitar {delta} de las unidades que le llegaban desde {a}.
          </>
        ) : (
          <>
            {b} es el inicio del camino: devuelve {delta} de las unidades que recibía desde {a}.
          </>
        )}{" "}
        {t.siguiente !== null ? (
          <>
            Esas {delta} unidades quedan libres en {a} y continúan por el camino hacia {nom(t.siguiente)}.
          </>
        ) : (
          <>Esas {delta} unidades quedan libres en {a}, que es el final del camino.</>
        )}
      </p>
    </li>
  );
}

/** Antes y después del flujo en cada arista del camino. */
function CambiosDelFlujo({ paso, anterior, datos }: { paso: Paso; anterior: Paso; datos: DatosRed }) {
  const { nom } = datos;
  return (
    <section aria-labelledby="titulo-cambios">
      <h2 id="titulo-cambios" className="mb-2 text-xs font-semibold tracking-wider text-tenue uppercase">
        Cambios en el flujo
      </h2>
      <table className="w-full text-[15px]">
        <thead>
          <tr className="border-b border-borde text-left text-xs text-tenue">
            <th className="py-1 font-medium">Arista</th>
            <th className="py-1 font-medium">Antes</th>
            <th className="py-1 font-medium">Después</th>
            <th className="py-1 text-right font-medium">Cambio</th>
          </tr>
        </thead>
        <tbody>
          {paso.aristas_camino.map(([u, v, s]) => (
            <tr key={`${u}-${v}`} className="border-b border-borde font-mono last:border-0">
              <td className="py-1">
                {nom(u)}→{nom(v)}
                {s === "-" && (
                  <span className="ml-1.5 font-sans text-xs" style={{ color: "var(--a-inverso)" }}>
                    inversa
                  </span>
                )}
              </td>
              <td className="py-1 text-tenue">{anterior.flujo[u][v]}</td>
              <td className="py-1 font-semibold">{paso.flujo[u][v]}</td>
              <td className="py-1 text-right font-semibold" style={{ color: s === "+" ? "var(--a-actualizada)" : "var(--a-inverso)" }}>
                {s === "+" ? "+" : "−"}
                {paso.cuello_botella}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
