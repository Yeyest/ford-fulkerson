// Geometría del dibujo, en píxeles de pantalla (y hacia abajo):
// curvas que esquivan los nodos (calcular_geometria_aristas), etiquetas sin
// solapamiento (colocar_etiquetas) y línea de corte (dibujar_linea_corte).

export type Punto = [number, number];

export const CANDIDATOS_RAD = [0.0, 0.08, -0.08, 0.16, -0.16, 0.25, -0.25, 0.35, -0.35, 0.5, -0.5];

export interface Curva {
  rad: number;
  p1: Punto;
  p2: Punto;
  ctrl: Punto;
  /** 41 puntos de la curva (t de 0 a 1). */
  poli: Punto[];
}

export function bezier(p1: Punto, p2: Punto, c: Punto, t: number): Punto {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const d = t * t;
  return [a * p1[0] + b * c[0] + d * p2[0], a * p1[1] + b * c[1] + d * p2[1]];
}

export function controlArc3(p1: Punto, p2: Punto, rad: number): Punto {
  // connectionstyle arc3 de matplotlib
  return [(p1[0] + p2[0]) / 2 + rad * (p2[1] - p1[1]), (p1[1] + p2[1]) / 2 - rad * (p2[0] - p1[0])];
}

function linspace(a: number, b: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

const TS = linspace(0.06, 0.94, 30);
const TS_MUESTREO = linspace(0, 1, 41);

export function curva(p1: Punto, p2: Punto, rad: number): Curva {
  const ctrl = controlArc3(p1, p2, rad);
  return { rad, p1, p2, ctrl, poli: TS_MUESTREO.map((t) => bezier(p1, p2, ctrl, t)) };
}

/**
 * Elige para cada arista la curvatura que mejor esquiva los demás nodos.
 * Con `limites` también penaliza las curvas que se salen del lienzo.
 */
export function calcularGeometriaAristas(
  aristas: readonly [number, number][],
  pts: ReadonlyMap<number, Punto>,
  radio: number,
  limites?: [number, number],
): Map<string, Curva> {
  const umbral = radio + 12;
  const geometria = new Map<string, Curva>();
  for (const [u, v] of aristas) {
    const p1 = pts.get(u)!;
    const p2 = pts.get(v)!;
    const otros = [...pts].filter(([k]) => k !== u && k !== v).map(([, p]) => p);
    let mejorRad = 0;
    let mejorCosto: number | null = null;
    for (const rad of CANDIDATOS_RAD) {
      const ctrl = controlArc3(p1, p2, rad);
      let penal = 0;
      for (const o of otros) {
        let d = Infinity;
        for (const t of TS) {
          const q = bezier(p1, p2, ctrl, t);
          d = Math.min(d, Math.hypot(q[0] - o[0], q[1] - o[1]));
        }
        const x = Math.max(umbral - d, 0);
        penal += x * x;
      }
      if (limites) {
        const [w, h] = limites;
        for (const t of TS) {
          const [qx, qy] = bezier(p1, p2, ctrl, t);
          const fuera = Math.max(12 - qx, qx - (w - 12), 12 - qy, qy - (h - 12), 0);
          penal += fuera * fuera;
        }
      }
      const costo = penal * 10 + Math.abs(rad) * 40;
      if (mejorCosto === null || costo < mejorCosto) {
        mejorCosto = costo;
        mejorRad = rad;
      }
    }
    geometria.set(`${u}-${v}`, curva(p1, p2, mejorRad));
  }
  return geometria;
}

/** Tamaño aproximado de una etiqueta en fuente monoespaciada. */
export function cajaTexto(texto: string, tamFuente: number): [number, number] {
  return [[...texto].length * 0.6 * tamFuente + 12, tamFuente + 10];
}

/**
 * colocar_etiquetas: prueba varias posiciones t de la curva y desplazamientos
 * perpendiculares, penalizando solapes con etiquetas, nodos, otras aristas y bordes.
 */
export function colocarEtiquetas(
  geometria: ReadonlyMap<string, Curva>,
  centros: readonly Punto[],
  w: number,
  h: number,
  radio: number,
  dims: ReadonlyMap<string, [number, number]>,
): Map<string, Punto> {
  const claves = [...geometria.keys()];
  const resultado = new Map<string, Punto>();
  if (!claves.length) return resultado;

  const orden = [...claves].sort((a, b) => {
    const ga = geometria.get(a)!;
    const gb = geometria.get(b)!;
    return Math.hypot(ga.p2[0] - ga.p1[0], ga.p2[1] - ga.p1[1]) - Math.hypot(gb.p2[0] - gb.p1[0], gb.p2[1] - gb.p1[1]);
  });
  const tsCandidatos = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.2, 0.8];
  const multiplos = [0.0, 1.0, -1.0, 1.8, -1.8];
  const colocadas: [number, number, number, number][] = [];

  for (const a of orden) {
    const g = geometria.get(a)!;
    const [ancho, alto] = dims.get(a)!;
    const hw = ancho / 2;
    const hh = alto / 2;
    const otras = claves.filter((k) => k !== a).flatMap((k) => geometria.get(k)!.poli);
    let mejorC: Punto = g.poli[20];
    let mejorCosto: number | null = null;

    for (const t of tsCandidatos) {
      const q = bezier(g.p1, g.p2, g.ctrl, t);
      const tang: Punto = [
        2 * (1 - t) * (g.ctrl[0] - g.p1[0]) + 2 * t * (g.p2[0] - g.ctrl[0]),
        2 * (1 - t) * (g.ctrl[1] - g.p1[1]) + 2 * t * (g.p2[1] - g.ctrl[1]),
      ];
      const norma = Math.hypot(tang[0], tang[1]);
      const normal: Punto = norma > 1e-9 ? [-tang[1] / norma, tang[0] / norma] : [0, 1];

      for (const m of multiplos) {
        const c: Punto = [q[0] + normal[0] * m * alto, q[1] + normal[1] * m * alto];
        let costo = Math.abs(t - 0.5) * 60 + Math.abs(m) * 25;

        if (c[0] - hw < 0 || c[0] + hw > w || c[1] - hh < 0 || c[1] + hh > h) costo += 400;

        for (const [cx, cy, chw, chh] of colocadas) {
          const ox = hw + chw + 3 - Math.abs(c[0] - cx);
          const oy = hh + chh + 3 - Math.abs(c[1] - cy);
          if (ox > 0 && oy > 0) costo += 300 + 3 * ox * oy;
        }

        for (const n of centros) {
          const dx = Math.max(Math.abs(n[0] - c[0]) - hw, 0);
          const dy = Math.max(Math.abs(n[1] - c[1]) - hh, 0);
          costo += Math.max(radio + 4 - Math.hypot(dx, dy), 0) * 30;
        }

        let dentro = 0;
        for (const p of otras) if (Math.abs(p[0] - c[0]) < hw + 2 && Math.abs(p[1] - c[1]) < hh + 2) dentro++;
        costo += 6 * dentro;

        if (mejorCosto === null || costo < mejorCosto) {
          mejorCosto = costo;
          mejorC = c;
        }
      }
    }
    colocadas.push([mejorC[0], mejorC[1], hw, hh]);
    resultado.set(a, mejorC);
  }
  return resultado;
}

/** Tramo de la curva entre los bordes de los nodos, con la punta de flecha. */
export function recortarCurva(g: { p1: Punto; p2: Punto; ctrl: Punto }, r1: number, r2: number) {
  const { p1, p2, ctrl } = g;
  const buscar = (desde: Punto, r: number, inicio: boolean) => {
    let lo = inicio ? 0 : 0.5;
    let hi = inicio ? 0.5 : 1;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const q = bezier(p1, p2, ctrl, mid);
      const dentro = Math.hypot(q[0] - desde[0], q[1] - desde[1]) < r;
      if (inicio === dentro) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const a = buscar(p1, r1, true);
  const b = buscar(p2, r2, false);
  const q0 = bezier(p1, p2, ctrl, a);
  const q2 = bezier(p1, p2, ctrl, b);
  const k0 = (1 - a) * (1 - b);
  const k1 = (1 - a) * b + a * (1 - b);
  const k2 = a * b;
  const q1: Punto = [k0 * p1[0] + k1 * ctrl[0] + k2 * p2[0], k0 * p1[1] + k1 * ctrl[1] + k2 * p2[1]];
  const tx = q2[0] - q1[0];
  const ty = q2[1] - q1[1];
  const n = Math.hypot(tx, ty) || 1;
  return { q0, q1, q2, dir: [tx / n, ty / n] as Punto };
}

export function caminoSvg(q0: Punto, q1: Punto, q2: Punto): string {
  const f = (x: number) => x.toFixed(2);
  return `M${f(q0[0])},${f(q0[1])} Q${f(q1[0])},${f(q1[1])} ${f(q2[0])},${f(q2[1])}`;
}

function distanciaPuntoSegmento(p: Punto, a: Punto, b: Punto): number {
  const ab: Punto = [b[0] - a[0], b[1] - a[1]];
  const den = ab[0] * ab[0] + ab[1] * ab[1];
  if (den < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.min(Math.max(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / den, 0), 1);
  return Math.hypot(p[0] - (a[0] + t * ab[0]), p[1] - (a[1] + t * ab[1]));
}

/** trazar_poligonal_sin_colisiones: inserta desvíos para no atravesar nodos. */
export function trazarPoligonalSinColisiones(ruta: Punto[], centros: readonly Punto[], radioSeguro: number, maxIter = 5): Punto[] {
  if (!centros.length || ruta.length < 2) return ruta;
  for (let it = 0; it < maxIter; it++) {
    const nueva: Punto[] = [ruta[0]];
    let huboChoque = false;
    for (let i = 0; i < ruta.length - 1; i++) {
      const a = ruta[i];
      const b = ruta[i + 1];
      const ab: Punto = [b[0] - a[0], b[1] - a[1]];
      const largo2 = ab[0] * ab[0] + ab[1] * ab[1];
      if (largo2 > 1e-9) {
        const largo = Math.sqrt(largo2);
        const normal: Punto = [-ab[1] / largo, ab[0] / largo];
        const choques: [number, Punto][] = [];
        for (const c of centros) {
          if (distanciaPuntoSegmento(c, a, b) < radioSeguro) {
            choques.push([((c[0] - a[0]) * ab[0] + (c[1] - a[1]) * ab[1]) / largo2, c]);
          }
        }
        choques.sort((x, y) => x[0] - y[0]);
        for (const [, c] of choques) {
          const lado = (c[0] - a[0]) * normal[0] + (c[1] - a[1]) * normal[1];
          const signo = lado >= 0 ? -1 : 1;
          nueva.push([c[0] + signo * normal[0] * radioSeguro * 1.35, c[1] + signo * normal[1] * radioSeguro * 1.35]);
          huboChoque = true;
        }
      }
      nueva.push(b);
    }
    ruta = nueva;
    if (!huboChoque) break;
  }
  return ruta;
}

/**
 * dibujar_linea_corte: une los puntos (etiquetas) de las aristas cortadas de
 * arriba hacia abajo, rodeando los nodos. Devuelve tramos (la línea se corta
 * si aún quedara dentro de un nodo) y el punto inferior para el rótulo.
 */
export function lineaCorte(
  puntos: readonly Punto[],
  cuerdas: readonly Punto[],
  centros: readonly Punto[],
  radio: number,
  w: number,
  h: number,
): { tramos: Punto[][]; fin: Punto } | null {
  if (!puntos.length) return null;
  const pares = puntos.map((p, i) => ({ p, c: cuerdas[i] })).sort((a, b) => a.p[1] - b.p[1] || a.p[0] - b.p[0]);
  const pts = pares.map((x) => x.p);
  const ext = 0.06 * h;
  let sup: Punto;
  let inf: Punto;
  if (pts.length === 1) {
    const [cx, cy] = pares[0].c;
    const norma = Math.hypot(cx, cy);
    let perp: Punto = norma > 1e-9 ? [-cy / norma, cx / norma] : [0, -1];
    if (perp[1] > 0) perp = [-perp[0], -perp[1]]; // hacia arriba
    sup = [pts[0][0] + perp[0] * ext, pts[0][1] + perp[1] * ext];
    inf = [pts[0][0] - perp[0] * ext, pts[0][1] - perp[1] * ext];
  } else {
    sup = [pts[0][0], pts[0][1] - ext];
    inf = [pts[pts.length - 1][0], pts[pts.length - 1][1] + ext];
  }
  sup[1] = Math.max(sup[1], Math.min(pts[0][1], 0.1 * h));
  inf[1] = Math.min(inf[1], Math.max(pts[pts.length - 1][1], 0.93 * h));
  sup[0] = Math.min(Math.max(sup[0], 0.02 * w), 0.98 * w);
  inf[0] = Math.min(Math.max(inf[0], 0.02 * w), 0.98 * w);

  const poligonal = trazarPoligonalSinColisiones([sup, ...pts, inf], centros, radio + 8);

  // Muestreo y "seguro final": se corta la línea si quedara dentro de un nodo
  const tramos: Punto[][] = [];
  let actual: Punto[] = [];
  const agregar = (p: Punto) => {
    const dentro = centros.some((c) => Math.hypot(c[0] - p[0], c[1] - p[1]) < radio + 3);
    if (dentro) {
      if (actual.length > 1) tramos.push(actual);
      actual = [];
    } else actual.push(p);
  };
  for (let i = 0; i < poligonal.length - 1; i++) {
    const a = poligonal[i];
    const b = poligonal[i + 1];
    const n = Math.max(Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4), 2);
    for (let k = 0; k < n; k++) agregar([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  agregar(poligonal[poligonal.length - 1]);
  if (actual.length > 1) tramos.push(actual);
  return { tramos, fin: inf };
}
