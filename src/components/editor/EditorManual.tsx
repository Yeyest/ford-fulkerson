"use client";

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Confirmacion,
  type EstadoEditor,
  type Mensaje as MensajeEditor,
  type Resultado,
  crearArista,
  deshacer,
  eliminarArista,
  procesarLinea,
  rehacer,
  responderConfirmacion,
  vaciar,
} from "@/lib/ff/editor";
import type { Punto } from "@/lib/ff/geometria";
import { destinosProhibidos } from "@/lib/ff/grafo";
import { listarAristas, nombreNodo } from "@/lib/ff/nombres";
import Burbuja from "../grafo/Burbuja";
import type { Disposicion } from "../grafo/DibujoRed";
import Grafo, { type AristaVista, type NodoVista } from "../grafo/Grafo";
import Lienzo from "../grafo/Lienzo";
import { medidas } from "../grafo/escala";
import { type EstiloNodo, TEXTO_OSCURO } from "../grafo/estilos";
import { useEtiquetas, useGeometria, useTamano } from "../grafo/hooks";
import { Boton, Kbd, Mensaje } from "../ui";
import BarraRapida from "./BarraRapida";
import FormularioArista from "./FormularioArista";
import TablaAristas from "./TablaAristas";

interface Props {
  editor: EstadoEditor;
  onEditor: (e: EstadoEditor) => void;
  disponer: (ancho: number, alto: number) => Disposicion;
  estiloNodo: (id: number) => EstiloNodo;
  /** FIN aceptado (desde la barra rápida). */
  onFin: () => void;
}

interface Arrastre {
  origen: number;
  inicio: Punto; // en píxeles de pantalla
  punto: Punto; // en coordenadas del grafo
  movido: boolean;
}

interface EntradaCapacidad {
  origen: number;
  destino: number;
  valor: string;
}

const esCampo = (el: Element | null) => !!el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);

export default function EditorManual({ editor, onEditor, disponer, estiloNodo, onFin }: Props) {
  const [ref, { w, h }] = useTamano<HTMLDivElement>();
  const convertidorRef = useRef<((x: number, y: number) => Punto) | null>(null);

  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [entrada, setEntrada] = useState<EntradaCapacidad | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [aristaSel, setAristaSel] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<(MensajeEditor & { vez: number }) | null>(null);
  const [ciclo, setCiclo] = useState<{ nodos: number[]; vez: number } | null>(null);
  const [temblor, setTemblor] = useState<{ nodo: number; vez: number } | null>(null);
  const [destacarTabla, setDestacarTabla] = useState(0);
  const [preguntarVaciar, setPreguntarVaciar] = useState(false);

  const m = editor.matriz;
  const n = m.length;
  const nom = (u: number) => nombreNodo(u);

  // Los avisos informativos se ocultan solos; los errores quedan hasta la próxima acción
  useEffect(() => {
    if (!mensaje || mensaje.nivel === "error" || mensaje.nivel === "aviso") return;
    const t = setTimeout(() => setMensaje(null), 3500);
    return () => clearTimeout(t);
  }, [mensaje]);

  // El ciclo resaltado desaparece a los pocos segundos
  useEffect(() => {
    if (!ciclo) return;
    const t = setTimeout(() => setCiclo(null), 3500);
    return () => clearTimeout(t);
  }, [ciclo]);

  const cancelar = useCallback(() => {
    setSeleccion(null);
    setArrastre(null);
    setEntrada(null);
    setAristaSel(null);
  }, []);

  /** Aplica el resultado de cualquier acción del editor (misma función para las tres vías). */
  const aplicar = useCallback(
    (r: Resultado, opciones: { mantenerEntrada?: boolean } = {}) => {
      if (r.confirmacion) {
        setConfirmacion(r.confirmacion);
        setEntrada(null);
        setMensaje(null);
        return;
      }
      if (r.estado !== editor) onEditor(r.estado);
      const msj = r.mensajes[0];
      setMensaje(msj ? { ...msj, vez: Date.now() } : null);
      if (msj?.ciclo) setCiclo({ nodos: msj.ciclo, vez: Date.now() });
      if (msj?.nivel === "error" && msj.origen !== undefined && msj.origen === msj.destino) setTemblor({ nodo: msj.origen, vez: Date.now() });
      if (r.lista) setDestacarTabla(Date.now());
      const errorDeCapacidad = msj?.nivel === "error" && msj.texto.startsWith("Error: la capacidad");
      if (!(opciones.mantenerEntrada && errorDeCapacidad)) setEntrada(null);
      setSeleccion(null);
      if (r.finalizado) onFin();
    },
    [editor, onEditor, onFin],
  );

  const prohibidosDe = useCallback((origen: number) => destinosProhibidos(m, origen), [m]);

  /** Origen y destino elegidos en el dibujo: se pide la capacidad o se rechaza al instante. */
  const elegirPar = useCallback(
    (origen: number, destino: number) => {
      setSeleccion(null);
      if (origen === destino || prohibidosDe(origen).has(destino)) {
        // Auto-bucle o ciclo: la misma validación de Python lo rechaza
        aplicar(crearArista(editor, nom(origen), nom(destino), "1"));
        return;
      }
      setEntrada({ origen, destino, valor: m[origen][destino] > 0 ? String(m[origen][destino]) : "" });
    },
    [aplicar, editor, m, prohibidosDe],
  );

  // ----- Arrastre con el ratón / toques en el celular -----
  // Los listeners se registran en el mismo pointerdown (un toque rápido termina
  // antes de que corra un efecto); leen la selección actual desde una ref.
  const actualRef = useRef({ seleccion, elegirPar });
  useEffect(() => {
    actualRef.current = { seleccion, elegirPar };
  });

  const alBajarEnNodo = (id: number, e: ReactPointerEvent<SVGGElement>) => {
    const convertir = convertidorRef.current;
    if (e.button !== 0 || !convertir) return;
    e.stopPropagation();
    e.preventDefault(); // sin selección de texto durante el arrastre
    (e.currentTarget as SVGGElement).focus({ preventScroll: true });
    setConfirmacion(null);
    setAristaSel(null);
    const inicio: Punto = [e.clientX, e.clientY];
    let movido = false;
    setArrastre({ origen: id, inicio, punto: convertir(e.clientX, e.clientY), movido });

    const mover = (ev: PointerEvent) => {
      movido = movido || Math.hypot(ev.clientX - inicio[0], ev.clientY - inicio[1]) > 6;
      setArrastre((a) => (a ? { ...a, punto: convertir(ev.clientX, ev.clientY), movido } : a));
    };
    const terminar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", cancelarArrastre);
      setArrastre(null);
    };
    const cancelarArrastre = () => terminar();
    function soltar(ev: PointerEvent) {
      terminar();
      const { seleccion: sel, elegirPar: elegir } = actualRef.current;
      if (!movido) {
        // Toque: primero el origen, luego el destino
        if (sel === null) setSeleccion(id);
        else if (sel === id) setSeleccion(null);
        else elegir(sel, id);
        return;
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-nodo]");
      if (el) elegir(id, Number(el.getAttribute("data-nodo")));
    }
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", cancelarArrastre);
  };

  // ----- Atajos de teclado -----
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (esCampo(document.activeElement)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); aplicar(deshacer(editor)); }
      else if (ctrl && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); aplicar(rehacer(editor)); }
      else if ((e.key === "Delete" || e.key === "Supr") && aristaSel) {
        const [u, v] = aristaSel.split("-").map(Number);
        aplicar(eliminarArista(editor, u, v));
        setAristaSel(null);
      } else if (e.key === "Escape") {
        cancelar();
        setConfirmacion(null);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aplicar, editor, aristaSel, cancelar]);

  const origenActivo = arrastre?.origen ?? seleccion;
  const prohibidos = useMemo(() => (origenActivo === null ? new Set<number>() : prohibidosDe(origenActivo)), [origenActivo, prohibidosDe]);

  const responder = (si: boolean) => {
    if (!confirmacion) return;
    const c = confirmacion;
    setConfirmacion(null);
    aplicar(responderConfirmacion(editor, c, si));
  };

  const totalAristas = listarAristas(m).length;

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-330px)] lg:min-h-[520px] lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <BarraRapida
          n={n}
          onLinea={(linea) => {
            const r = procesarLinea(editor, linea);
            aplicar(r);
            return !(r.mensajes[0]?.nivel === "error");
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Boton tam="sm" onClick={() => aplicar(deshacer(editor))} disabled={!editor.historial.length} title="Deshacer (Ctrl+Z)">
            ↶ Deshacer
          </Boton>
          <Boton tam="sm" onClick={() => aplicar(rehacer(editor))} disabled={!editor.rehacer.length} title="Rehacer (Ctrl+Y)">
            ↷ Rehacer
          </Boton>
          <Boton tam="sm" variante="peligro" onClick={() => setPreguntarVaciar(true)} disabled={!totalAristas}>
            Vaciar el grafo
          </Boton>
          {preguntarVaciar && (
            <span role="alertdialog" aria-label="Confirmar vaciado" className="aparecer flex items-center gap-2 text-sm">
              ¿Vaciar el grafo? Se quitarán {totalAristas} arista(s).
              <Boton
                tam="sm"
                variante="primario"
                autoFocus
                onClick={() => {
                  setPreguntarVaciar(false);
                  aplicar(vaciar(editor));
                }}
              >
                Vaciar
              </Boton>
              <Boton tam="sm" variante="fantasma" onClick={() => setPreguntarVaciar(false)}>
                Cancelar
              </Boton>
            </span>
          )}
          <span className="ml-auto hidden text-sm text-tenue xl:inline">
            Arrastra de un nodo a otro (o toca origen y destino). <Kbd>Ctrl Z</Kbd> <Kbd>Ctrl Y</Kbd> <Kbd>Supr</Kbd>
          </span>
        </div>

        {/* Mensajes sin un elemento del dibujo asociado (formato, nodo inválido…) */}
        <div aria-live="polite" className="min-h-[2px]">
          {mensaje && (mensaje.origen === undefined || !w) && (
            <Mensaje key={mensaje.vez} nivel={mensaje.nivel} className="aparecer">
              {mensaje.texto}
            </Mensaje>
          )}
          {mensaje && mensaje.origen !== undefined && <span className="sr-only">{mensaje.texto}</span>}
          {confirmacion && <span className="sr-only">{confirmacion.texto}</span>}
        </div>

        <div ref={ref} className="relative h-[60dvh] min-h-[360px] rounded-lg border border-borde bg-superficie lg:h-auto lg:min-h-0 lg:flex-1">
          {w > 0 && h > 0 && (
            <Dibujo
              ancho={w}
              alto={h}
              editor={editor}
              disponer={disponer}
              estiloNodo={estiloNodo}
              convertidorRef={convertidorRef}
              prohibidos={prohibidos}
              origenActivo={origenActivo}
              arrastre={arrastre}
              entrada={entrada}
              setEntrada={setEntrada}
              confirmacion={confirmacion}
              responder={responder}
              aristaSel={aristaSel}
              setAristaSel={setAristaSel}
              mensaje={mensaje}
              ciclo={ciclo}
              temblor={temblor}
              alBajarEnNodo={alBajarEnNodo}
              onTeclaNodo={(id) => {
                if (seleccion === null) setSeleccion(id);
                else if (seleccion === id) setSeleccion(null);
                else elegirPar(seleccion, id);
              }}
              onConfirmarEntrada={(e) => aplicar(crearArista(editor, nom(e.origen), nom(e.destino), e.valor), { mantenerEntrada: true })}
              onEliminar={(u, v) => (aplicar(eliminarArista(editor, u, v)), setAristaSel(null))}
              onFondo={cancelar}
            />
          )}
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 lg:min-h-0 lg:w-[320px] lg:overflow-y-auto">
        <FormularioArista n={n} onAgregar={(o, d, c) => aplicar(crearArista(editor, o, d, c))} />
        <TablaAristas
          matriz={m}
          destacar={destacarTabla}
          onEditar={(u, v, valor) => aplicar(crearArista(editor, nom(u), nom(v), valor))}
          onEliminar={(u, v) => aplicar(eliminarArista(editor, u, v))}
        />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Dibujo del editor (dentro del lienzo con zoom)
// ---------------------------------------------------------------------
interface PropsDibujo {
  ancho: number;
  alto: number;
  editor: EstadoEditor;
  disponer: (w: number, h: number) => Disposicion;
  estiloNodo: (id: number) => EstiloNodo;
  convertidorRef: { current: ((x: number, y: number) => Punto) | null };
  prohibidos: Set<number>;
  origenActivo: number | null;
  arrastre: Arrastre | null;
  entrada: EntradaCapacidad | null;
  setEntrada: (e: EntradaCapacidad | null) => void;
  confirmacion: Confirmacion | null;
  responder: (si: boolean) => void;
  aristaSel: string | null;
  setAristaSel: (k: string | null) => void;
  mensaje: (MensajeEditor & { vez: number }) | null;
  ciclo: { nodos: number[]; vez: number } | null;
  temblor: { nodo: number; vez: number } | null;
  alBajarEnNodo: (id: number, e: ReactPointerEvent<SVGGElement>) => void;
  onTeclaNodo: (id: number) => void;
  onConfirmarEntrada: (e: EntradaCapacidad) => void;
  onEliminar: (u: number, v: number) => void;
  onFondo: () => void;
}

function Dibujo(p: PropsDibujo) {
  const { ancho, alto, editor, prohibidos, origenActivo, arrastre, entrada, confirmacion, aristaSel, mensaje, ciclo, temblor } = p;
  const m = editor.matriz;
  const nom = (u: number) => nombreNodo(u);
  const { pts, bandas, orientacion } = p.disponer(ancho, alto);
  const med = medidas([...pts.values()], ancho);
  const pares = listarAristas(m);
  const geo = useGeometria(pts, pares, med.radio, ancho, alto);
  const textos = new Map(pares.map(([u, v]) => [`${u}-${v}`, String(m[u][v])]));
  const etiquetas = useEtiquetas(geo, textos, pts, ancho, alto, med.radio, med.fuenteEtiqueta);

  // Aristas del ciclo que se formaría (ciclo = [origen, destino, …, origen])
  const aristasCiclo = new Set<string>();
  if (ciclo) for (let i = 1; i < ciclo.nodos.length - 1; i++) aristasCiclo.add(`${ciclo.nodos[i]}-${ciclo.nodos[i + 1]}`);
  const nodosCiclo = new Set(ciclo?.nodos ?? []);

  const nodos: NodoVista[] = [...pts].map(([id, punto]) => {
    const estilo = p.estiloNodo(id);
    const esOrigen = id === origenActivo;
    const prohibido = origenActivo !== null && !esOrigen && prohibidos.has(id);
    return {
      id,
      nombre: nom(id),
      p: punto,
      ...estilo,
      borde: esOrigen ? "var(--texto)" : nodosCiclo.has(id) ? "var(--a-corte)" : estilo.borde,
      grosor: esOrigen || nodosCiclo.has(id) ? 3.5 : estilo.grosor,
      colorTexto: estilo.colorTexto ?? TEXTO_OSCURO,
      atenuado: prohibido,
      prohibido,
      tiembla: temblor?.nodo === id ? temblor.vez : false,
      rotulo: `Nodo ${nom(id)}${esOrigen ? ", origen elegido" : ""}${prohibido ? ", cerraría un ciclo" : ""}`,
      enfocable: true,
      presionado: esOrigen,
    };
  });

  const aristas: AristaVista[] = pares.map(([u, v]) => {
    const clave = `${u}-${v}`;
    const enCiclo = aristasCiclo.has(clave);
    const sel = aristaSel === clave;
    return {
      clave,
      geo: geo.get(clave)!,
      color: enCiclo ? "var(--a-corte)" : sel ? "var(--texto)" : "var(--a-residual)",
      ancho: enCiclo || sel ? 3.5 : 2,
      halo: sel ? "var(--borde-fuerte)" : undefined,
      pulso: enCiclo,
      etiqueta: { texto: textos.get(clave)!, pos: etiquetas.get(clave)!, borde: enCiclo ? "var(--a-corte)" : "var(--borde-fuerte)" },
      rotulo: `Arista ${nom(u)} a ${nom(v)}, capacidad ${m[u][v]}. Enter para editar la capacidad, Supr para eliminarla.`,
      enfocable: true,
      presionada: sel,
    };
  });

  const posArista = (u: number, v: number): Punto => {
    const e = etiquetas.get(`${u}-${v}`);
    if (e) return e;
    const a = pts.get(u)!;
    const b = pts.get(v)!;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };

  // Posición de la burbuja del último mensaje
  let posMensaje: Punto | null = null;
  if (mensaje && mensaje.origen !== undefined) {
    posMensaje = mensaje.destino !== undefined && mensaje.destino !== mensaje.origen ? posArista(mensaje.origen, mensaje.destino) : pts.get(mensaje.origen)!;
  }

  const pOrigen = arrastre?.movido ? pts.get(arrastre.origen) : undefined;

  return (
    <Lienzo ancho={ancho} alto={alto} etiqueta="Editor del grafo" convertidorRef={p.convertidorRef} onFondo={p.onFondo}>
      <Grafo
        nodos={nodos}
        aristas={aristas}
        radio={med.radio}
        fuenteNodo={med.fuenteNodo}
        fuenteEtiqueta={med.fuenteEtiqueta}
        fuenteTag={med.fuenteTag}
        bandas={bandas}
        orientacion={orientacion}
        onNodoPointerDown={p.alBajarEnNodo}
        onNodoTecla={(id, e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.onTeclaNodo(id); }
        }}
        onAristaClick={(clave, enEtiqueta) => {
          const [u, v] = clave.split("-").map(Number);
          if (enEtiqueta) p.setEntrada({ origen: u, destino: v, valor: String(m[u][v]) });
          else p.setAristaSel(aristaSel === clave ? null : clave);
        }}
        onAristaTecla={(clave, e) => {
          const [u, v] = clave.split("-").map(Number);
          if (e.key === "Enter") { e.preventDefault(); p.setEntrada({ origen: u, destino: v, valor: String(m[u][v]) }); }
          else if (e.key === " ") { e.preventDefault(); p.setAristaSel(aristaSel === clave ? null : clave); }
          else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); e.stopPropagation(); p.onEliminar(u, v); }
        }}
      />

      {/* Arista que se está arrastrando */}
      {pOrigen && arrastre && (
        <line
          x1={pOrigen[0]}
          y1={pOrigen[1]}
          x2={arrastre.punto[0]}
          y2={arrastre.punto[1]}
          stroke="var(--texto)"
          strokeWidth={2}
          strokeDasharray="6 5"
          pointerEvents="none"
        />
      )}

      {/* Arista rechazada por cerrar un ciclo */}
      {ciclo && pts.get(ciclo.nodos[0]) && pts.get(ciclo.nodos[1]) && (
        <line
          x1={pts.get(ciclo.nodos[0])![0]}
          y1={pts.get(ciclo.nodos[0])![1]}
          x2={pts.get(ciclo.nodos[1])![0]}
          y2={pts.get(ciclo.nodos[1])![1]}
          stroke="var(--a-corte)"
          strokeWidth={3}
          strokeDasharray="8 6"
          className="pulso-ciclo"
          pointerEvents="none"
        />
      )}

      {/* Acciones de la arista seleccionada (para pantallas táctiles) */}
      {aristaSel && etiquetas.get(aristaSel) && (
        <foreignObject x={etiquetas.get(aristaSel)![0] - 90} y={etiquetas.get(aristaSel)![1] + 16} width={180} height={44}>
          <div className="aparecer flex gap-1 rounded-md border border-borde-fuerte bg-fondo p-1">
            <button
              type="button"
              className="flex-1 rounded px-2 py-1 text-sm hover:bg-superficie-2"
              onClick={() => {
                const [u, v] = aristaSel.split("-").map(Number);
                p.setEntrada({ origen: u, destino: v, valor: String(m[u][v]) });
                p.setAristaSel(null);
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className="flex-1 rounded px-2 py-1 text-sm text-[var(--a-corte)] hover:bg-superficie-2"
              onClick={() => {
                const [u, v] = aristaSel.split("-").map(Number);
                p.onEliminar(u, v);
              }}
            >
              Eliminar
            </button>
          </div>
        </foreignObject>
      )}

      {/* Campo de capacidad junto a la arista */}
      {entrada && (
        <CampoCapacidad
          key={`${entrada.origen}-${entrada.destino}`}
          p={posArista(entrada.origen, entrada.destino)}
          ancho={ancho}
          entrada={entrada}
          onCambio={(valor) => p.setEntrada({ ...entrada, valor })}
          onConfirmar={() => p.onConfirmarEntrada(entrada)}
          onCancelar={() => p.setEntrada(null)}
        />
      )}

      {/* "¿Sobrescribir?" junto a la arista */}
      {confirmacion && (
        <Burbuja p={posArista(confirmacion.origen, confirmacion.destino)} ancho={ancho} alto={alto} nivel="aviso" interactiva>
          <span className="block">{confirmacion.texto.replace(/:\s*$/, "")}</span>
          <span
            className="mt-2 flex gap-2"
            onKeyDown={(e) => {
              if (e.key.toLowerCase() === "s") p.responder(true);
              if (e.key.toLowerCase() === "n") p.responder(false);
            }}
          >
            <Boton tam="sm" variante="primario" autoFocus onClick={() => p.responder(true)}>
              Sí (S)
            </Boton>
            <Boton tam="sm" onClick={() => p.responder(false)}>
              No (N)
            </Boton>
          </span>
        </Burbuja>
      )}

      {mensaje && posMensaje && !confirmacion && (
        <Burbuja key={mensaje.vez} p={posMensaje} ancho={ancho} alto={alto} nivel={mensaje.nivel}>
          {mensaje.texto}
        </Burbuja>
      )}
    </Lienzo>
  );
}

function CampoCapacidad({
  p,
  ancho,
  entrada,
  onCambio,
  onConfirmar,
  onCancelar,
}: {
  p: Punto;
  ancho: number;
  entrada: EntradaCapacidad;
  onCambio: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const w = 190;
  const x = Math.min(Math.max(p[0] - w / 2, 4), ancho - w - 4);
  return (
    <foreignObject x={x} y={p[1] - 20} width={w} height={40}>
      <div className="aparecer flex h-full items-center gap-1 rounded-md border border-texto bg-fondo px-2">
        <label className="shrink-0 font-mono text-sm" htmlFor="campo-capacidad">
          {nombreNodo(entrada.origen)}→{nombreNodo(entrada.destino)}
        </label>
        <input
          id="campo-capacidad"
          autoFocus
          inputMode="numeric"
          placeholder="capacidad"
          aria-label={`Capacidad de la arista ${nombreNodo(entrada.origen)} a ${nombreNodo(entrada.destino)}`}
          value={entrada.valor}
          onChange={(e) => onCambio(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onConfirmar(); }
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancelar(); }
          }}
          className="w-full min-w-0 bg-transparent font-mono text-[15px] outline-none"
        />
        <button type="button" aria-label="Confirmar capacidad" className="text-sm" onClick={onConfirmar}>
          ↵
        </button>
      </div>
    </foreignObject>
  );
}
