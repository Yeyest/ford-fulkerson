// Fuentes, sumideros y red de trabajo (pedir_nodos, advertir_aristas_atipicas, preparar_red).
import { INFINITO, type Matriz, copiarMatriz, nombreNodo } from "./nombres.ts";

export type Rol = "fuente" | "sumidero";

export interface Roles {
  fuentes: number[];
  sumideros: number[];
}

export const MENSAJE_AMBOS_ROLES = "Error: Un nodo no puede ser fuente y sumidero simultáneamente.";

/** Mensaje de pedir_nodos cuando falta al menos un nodo de un tipo. */
export function mensajeFaltaRol(rol: Rol): string {
  return `Error: Debe ingresar al menos un nodo ${rol}.`;
}

/** Asigna o quita un rol a un nodo. Un nodo no puede tener los dos roles. */
export function alternarRol(roles: Roles, nodo: number, rol: Rol): { roles: Roles; error: string | null } {
  const propio = rol === "fuente" ? roles.fuentes : roles.sumideros;
  const otro = rol === "fuente" ? roles.sumideros : roles.fuentes;
  if (propio.includes(nodo)) {
    const lista = propio.filter((x) => x !== nodo);
    return { roles: rol === "fuente" ? { ...roles, fuentes: lista } : { ...roles, sumideros: lista }, error: null };
  }
  if (otro.includes(nodo)) return { roles, error: MENSAJE_AMBOS_ROLES };
  const lista = [...propio, nodo].sort((a, b) => a - b);
  return { roles: rol === "fuente" ? { ...roles, fuentes: lista } : { ...roles, sumideros: lista }, error: null };
}

/** Errores que impiden continuar (al menos una fuente y un sumidero). */
export function validarRoles(roles: Roles): string[] {
  const errores: string[] = [];
  if (!roles.fuentes.length) errores.push(mensajeFaltaRol("fuente"));
  if (!roles.sumideros.length) errores.push(mensajeFaltaRol("sumidero"));
  return errores;
}

export interface AristaAtipica {
  origen: number;
  destino: number;
  texto: string;
}

/** advertir_aristas_atipicas: aristas que entran a una fuente o salen de un sumidero. */
export function advertirAristasAtipicas(m: Matriz, fuentes: ReadonlySet<number>, sumideros: ReadonlySet<number>): AristaAtipica[] {
  const avisos: AristaAtipica[] = [];
  const n = m.length;
  for (let u = 0; u < n; u++) {
    for (let v = 0; v < n; v++) {
      if (m[u][v] > 0) {
        if (fuentes.has(v))
          avisos.push({ origen: u, destino: v, texto: `Aviso: la arista ${nombreNodo(u)}->${nombreNodo(v)} entra a un nodo fuente.` });
        if (sumideros.has(u))
          avisos.push({ origen: u, destino: v, texto: `Aviso: la arista ${nombreNodo(u)}->${nombreNodo(v)} sale de un nodo sumidero.` });
      }
    }
  }
  return avisos;
}

export interface RedDeTrabajo {
  nTrabajo: number;
  capacidades: Matriz;
  fuente: number;
  sumidero: number;
  superFuente: number | null;
  superSumidero: number | null;
}

/** preparar_red: agrega S (varias fuentes) y/o T (varios sumideros) con capacidad INFINITO. */
export function prepararRed(m: Matriz, listaFuentes: readonly number[], listaSumideros: readonly number[]): RedDeTrabajo {
  let nTrabajo = m.length;
  let capacidades = copiarMatriz(m);
  let superFuente: number | null = null;
  let superSumidero: number | null = null;
  let fuente: number;
  let sumidero: number;

  const agrandar = (c: Matriz): Matriz => [...c.map((fila) => [...fila, 0]), new Array<number>(c.length + 1).fill(0)];

  if (listaFuentes.length > 1) {
    superFuente = nTrabajo;
    nTrabajo += 1;
    capacidades = agrandar(capacidades);
    for (const f of listaFuentes) capacidades[superFuente][f] = INFINITO;
    fuente = superFuente;
  } else {
    fuente = listaFuentes[0];
  }

  if (listaSumideros.length > 1) {
    superSumidero = nTrabajo;
    nTrabajo += 1;
    capacidades = agrandar(capacidades);
    for (const s of listaSumideros) capacidades[s][superSumidero] = INFINITO;
    sumidero = superSumidero;
  } else {
    sumidero = listaSumideros[0];
  }

  return { nTrabajo, capacidades, fuente, sumidero, superFuente, superSumidero };
}

/** Mensajes de iniciar_programa sobre los nodos virtuales. */
export function mensajesNodosVirtuales(roles: Roles): string[] {
  const mensajes: string[] = [];
  if (roles.fuentes.length > 1) mensajes.push("Super-Fuente virtual creada automáticamente: Nodo S");
  if (roles.sumideros.length > 1) mensajes.push("Super-Sumidero virtual creado automáticamente: Nodo T");
  return mensajes;
}
