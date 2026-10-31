import assert from "node:assert/strict";
import { test } from "node:test";
import { validarArista } from "../src/lib/ff/entrada.ts";
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
  assert.match(validarNombre("A,B", 1, 8)!, /comas/);
  assert.match(validarNombre("12", 1, 8)!, /número/);
  // El editor manual crea aristas con los nombres nuevos (y siguen valiendo letras y números)
  const m = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
  assert.deepEqual(validarArista(m, "Lim,X,10"), { tipo: "aceptar", origen: 0, destino: 2, anterior: 0, capacidad: 10 });
  assert.deepEqual(validarArista(m, "a,1,10"), { tipo: "aceptar", origen: 0, destino: 1, anterior: 0, capacidad: 10 });
  fijarNombres([]);
  assert.equal(nombreNodo(0), "A");
});
