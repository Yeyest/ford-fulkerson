// Curvas de las aristas: esquivan los nodos y, en la pantalla del algoritmo, también sus etiquetas.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { type CajaNodo, type Punto, calcularGeometriaAristas } from "../src/lib/ff/geometria.ts";

const pts = new Map<number, Punto>([
  [0, [0, 100]],
  [1, [400, 100]],
  [2, [200, 40]],
]);
// Etiqueta del nodo 2, justo sobre la recta que une 0 y 1.
const etiqueta: CajaNodo = { nodo: 2, x0: 160, x1: 240, y0: 80, y1: 106 };
const dentro = (p: Punto, c: CajaNodo) => p[0] > c.x0 && p[0] < c.x1 && p[1] > c.y0 && p[1] < c.y1;

describe("calcularGeometriaAristas", () => {
  test("sin etiquetas, la arista va recta (el nodo queda lejos)", () => {
    const g = calcularGeometriaAristas([[0, 1]], pts, 20, [600, 300]);
    assert.equal(g.get("0-1")!.rad, 0);
  });

  test("con etiquetas, la arista se curva para no pasar sobre la de otro nodo", () => {
    const g = calcularGeometriaAristas([[0, 1]], pts, 20, [600, 300], [etiqueta]);
    const c = g.get("0-1")!;
    assert.notEqual(c.rad, 0);
    assert.ok(!c.poli.some((p) => dentro(p, etiqueta)));
  });

  test("la etiqueta de los extremos de la arista no cuenta", () => {
    const propia: CajaNodo = { ...etiqueta, nodo: 0 };
    const g = calcularGeometriaAristas([[0, 1]], pts, 20, [600, 300], [propia]);
    assert.equal(g.get("0-1")!.rad, 0);
  });
});
