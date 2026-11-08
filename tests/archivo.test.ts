import assert from "node:assert/strict";
import { test } from "node:test";
import { grafoATexto, textoAGrafo } from "../src/lib/ff/archivo.ts";
import { matrizCeros } from "../src/lib/ff/nombres.ts";

function ejemplo() {
  const m = matrizCeros(8);
  m[0][1] = 10;
  m[0][2] = 3;
  m[1][7] = 5;
  return m;
}

const error = (texto: string) => {
  const r = textoAGrafo(texto);
  assert.equal(r.ok, false);
  return r.ok ? "" : r.error;
};

test("el texto del grafo lista los nodos y una arista por línea", () => {
  const texto = grafoATexto(ejemplo(), ["Lim", "", "X"]);
  assert.equal(texto, "nodos: Lim, B, X, D, E, F, G, H\nLim,B,10\nLim,X,3\nB,H,5");
});

test("copiar y pegar devuelve el mismo grafo", () => {
  const r = textoAGrafo(grafoATexto(ejemplo(), ["Lim", "", "X"]));
  assert.ok(r.ok);
  assert.equal(r.grafo.n, 8);
  assert.deepEqual(r.grafo.nombres, ["Lim", "", "X", "", "", "", "", ""]);
  assert.deepEqual(r.grafo.matriz, ejemplo());
});

test("texto escrito a mano: sin lista de nodos, minúsculas, comentarios y FIN", () => {
  const r = textoAGrafo("# mi grafo\n\na, b, 10\nA,C,3\nb,h,5\nFIN\n");
  assert.ok(r.ok);
  assert.equal(r.grafo.n, 8); // al menos 7 nodos; H es el octavo
  assert.deepEqual(r.grafo.matriz, ejemplo());
  const largo = textoAGrafo("A,J,1");
  assert.ok(largo.ok && largo.grafo.n === 10);
});

test("errores al pegar un grafo", () => {
  assert.match(error(""), /vacío/);
  assert.match(error("nodos: A, B, C\nA,B,1"), /entre 7 y 16/);
  assert.match(error("nodos: A, A, C, D, E, F, G, H"), /dos nodos llamados A/);
  assert.match(error("nodos: S, B, C, D, E, F, G, H"), /reservados/);
  assert.match(error("A-B-10"), /Línea 1: .*no es una arista/);
  assert.match(error("nodos: A, B, C, D, E, F, G, H\nA,Z,3"), /Línea 2: el nodo «Z»/);
  assert.match(error("A,B,cero"), /entero entre 1 y 9999/);
  assert.match(error("A,B,0"), /entero entre 1 y 9999/);
  assert.match(error("A,B,10000"), /entero entre 1 y 9999/);
  assert.equal(textoAGrafo("A,B,9999\nB,G,1").ok, true);
  assert.match(error("A,A,2"), /auto-bucle/);
  assert.match(error("A,B,2\nA,B,3"), /Línea 2: .*repetida/);
  assert.match(error("A,B,2\nB,C,2\nC,A,2"), /Línea 3: .*ciclo \(C → A → B → C\)/);
  assert.match(error("A,Q,1"), /máximo 16 nodos/);
});
