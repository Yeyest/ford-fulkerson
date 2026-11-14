import assert from "node:assert/strict";
import { test } from "node:test";
import { validarArista } from "../src/lib/ff/entrada.ts";
import { fijarNombres, hayNombresPropios, nombreNodo, validarNombre } from "../src/lib/ff/nombres.ts";

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
  assert.match(validarNombre("+5", 1, 8)!, /número/);
  // Solo letras, números y @ $ & * ( ) - _ ? ¿ + [ ] { } : ;
  for (const bueno of ["ñu", "x_1", "@$&", "(*)", "-?¿", "+[]", "{};", "a:b"]) assert.equal(validarNombre(bueno, 1, 8), null, bueno);
  for (const malo of ["#e", "→", "a b", "x.y", "!", "<>", "%"]) assert.match(validarNombre(malo, 1, 8)!, /Usa solo letras/, malo);
  // El editor manual crea aristas con los nombres nuevos (y siguen valiendo letras y números)
  const m = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
  assert.deepEqual(validarArista(m, "Lim,X,10"), { tipo: "aceptar", origen: 0, destino: 2, anterior: 0, capacidad: 10 });
  assert.deepEqual(validarArista(m, "a,1,10"), { tipo: "aceptar", origen: 0, destino: 1, anterior: 0, capacidad: 10 });
  fijarNombres([]);
  assert.equal(nombreNodo(0), "A");
});

test("mensajes de nodo inválido con y sin nombres propios", () => {
  const m = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
  const texto = (linea: string) => {
    const r = validarArista(m, linea);
    return r.tipo === "error" ? r.texto : "";
  };
  // Sin nombres propios: los mismos textos de Python
  fijarNombres(["A", "B"]);
  assert.equal(hayNombresPropios(8), false);
  assert.match(texto("lim,B,3"), /use una letra A-Z o un número/);
  assert.match(texto("J,B,3"), /van de A a H \(0 a 7\)\.$/);
  // Con nombres propios: se mencionan los nombres y el rango sigue usando letras
  fijarNombres(["Lim", "", "", "", "", "", "", "Ñú"]);
  assert.equal(hayNombresPropios(8), true);
  assert.match(texto("lim,B,3"), /use el nombre de un nodo, su letra A-H o un número 0-7/);
  assert.match(texto("J,B,3"), /van de A a H \(0 a 7\), o por su nombre: Lim, B, C, D, E, F, G, Ñú\./);
  fijarNombres([]);
});
