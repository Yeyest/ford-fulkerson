import assert from "node:assert/strict";
import { test } from "node:test";
import { fijarNombres, nombreNodo, validarNombre } from "../src/lib/ff/nombres.ts";

test("nombres personalizados de los nodos", () => {
  fijarNombres(["Lim", "", "X"]);
  assert.equal(nombreNodo(0), "Lim");
  assert.equal(nombreNodo(1), "B");
  assert.equal(nombreNodo(0, 0, null), "S");
  assert.equal(validarNombre("C", 3, 8), null); // C quedó libre al renombrar el nodo 2
  assert.match(validarNombre("Lim", 1, 8)!, /Ya hay/);
  assert.match(validarNombre("T", 1, 8)!, /reservados/);
  assert.match(validarNombre("ABCD", 1, 8)!, /3 caracteres/);
  fijarNombres([]);
  assert.equal(nombreNodo(0), "A");
});
