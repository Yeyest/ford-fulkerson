// Acciones del editor: crear, editar, eliminar, deshacer, rehacer y vaciar.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  type EstadoEditor,
  crearArista,
  deshacer,
  editorVacio,
  eliminarArista,
  procesarLinea,
  rehacer,
  responderConfirmacion,
  vaciar,
} from "../src/lib/ff/editor.ts";
import { destinosProhibidos, detectarCiclos } from "../src/lib/ff/grafo.ts";
import { PyRandom } from "../src/lib/ff/pyrandom.ts";
import { prepararRed } from "../src/lib/ff/red.ts";

function accionAlAzar(estado: EstadoEditor, rnd: PyRandom): EstadoEditor {
  const n = estado.matriz.length;
  const op = rnd.randint(0, 9);
  if (op <= 4) {
    const r = crearArista(estado, String(rnd.randint(0, n - 1)), String(rnd.randint(0, n - 1)), String(rnd.randint(1, 9)));
    return r.confirmacion ? responderConfirmacion(estado, r.confirmacion, rnd.random() < 0.5).estado : r.estado;
  }
  if (op === 5) {
    const aristas = estado.matriz.flatMap((fila, u) => fila.flatMap((c, v) => (c > 0 ? [[u, v]] : [])));
    if (!aristas.length) return estado;
    const [u, v] = rnd.choice(aristas);
    return eliminarArista(estado, u, v).estado;
  }
  if (op === 6 || op === 7) return deshacer(estado).estado;
  if (op === 8) return rehacer(estado).estado;
  return rnd.random() < 0.2 ? vaciar(estado).estado : estado;
}

describe("acciones del editor", () => {
  test("cualquier secuencia de acciones deja siempre un grafo acíclico", () => {
    for (let semilla = 1; semilla <= 40; semilla++) {
      const rnd = new PyRandom(semilla);
      let estado = editorVacio(rnd.randint(7, 16));
      for (let i = 0; i < 400; i++) {
        estado = accionAlAzar(estado, rnd);
        assert.equal(detectarCiclos(estado.matriz.length, estado.matriz), false, `semilla ${semilla}, acción ${i}`);
      }
    }
  });

  test("Deshacer restaura exactamente el estado anterior", () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const rnd = new PyRandom(semilla);
      let estado = editorVacio(8);
      const anteriores: string[] = [];
      for (let i = 0; i < 200; i++) {
        const antes = JSON.stringify(estado.matriz);
        const despues = accionAlAzar(estado, rnd);
        if (despues.historial.length === estado.historial.length + 1) anteriores.push(antes);
        else if (despues.historial.length === estado.historial.length - 1) anteriores.pop();
        estado = despues;
      }
      while (estado.historial.length) {
        estado = deshacer(estado).estado;
        assert.equal(JSON.stringify(estado.matriz), anteriores.pop());
      }
      assert.equal(anteriores.length, 0);
    }
  });

  test("Rehacer vuelve a aplicar lo deshecho y se vacía con una acción nueva", () => {
    let e = editorVacio(7);
    e = procesarLinea(e, "A,B,5").estado;
    e = procesarLinea(e, "B,C,3").estado;
    const conDos = JSON.stringify(e.matriz);
    e = deshacer(e).estado;
    e = deshacer(e).estado;
    assert.equal(e.rehacer.length, 2);
    e = rehacer(e).estado;
    e = rehacer(e).estado;
    assert.equal(JSON.stringify(e.matriz), conDos);

    e = deshacer(e).estado;
    assert.equal(e.rehacer.length, 1);
    e = procesarLinea(e, "A,D,4").estado; // acción nueva
    assert.equal(e.rehacer.length, 0);
    assert.equal(rehacer(e).mensajes[0].texto, "No hay acciones para rehacer.");

    e = deshacer(e).estado;
    e = eliminarArista(e, 0, 1).estado; // eliminar también es una acción nueva
    assert.equal(e.rehacer.length, 0);
    e = deshacer(e).estado;
    e = vaciar(e).estado; // y vaciar
    assert.equal(e.rehacer.length, 0);
  });

  test("Deshacer una eliminación y un vaciado usa los mensajes de Python", () => {
    let e = editorVacio(7);
    e = procesarLinea(e, "A,B,5").estado;
    e = procesarLinea(e, "B,C,3").estado;
    e = eliminarArista(e, 0, 1).estado;
    assert.equal(e.matriz[0][1], 0);
    const r = deshacer(e);
    assert.equal(r.mensajes[0].texto, "Se restauró la capacidad de A->B a 5.");
    assert.equal(r.estado.matriz[0][1], 5);
    e = vaciar(r.estado).estado;
    assert.ok(e.matriz.every((fila) => fila.every((c) => c === 0)));
    e = deshacer(e).estado;
    assert.equal(e.matriz[0][1], 5);
    assert.equal(e.matriz[1][2], 3);
  });

  test("los destinos prohibidos son exactamente los que el validador rechaza por ciclo o auto-bucle", () => {
    const rnd = new PyRandom(5);
    let e = editorVacio(10);
    for (let i = 0; i < 60; i++) e = accionAlAzar(e, rnd);
    for (let u = 0; u < 10; u++) {
      const prohibidos = destinosProhibidos(e.matriz, u);
      for (let v = 0; v < 10; v++) {
        if (e.matriz[u][v] > 0) continue;
        const r = crearArista(e, String(u), String(v), "1");
        const rechazada = r.mensajes.some((m) => m.texto.includes("ciclo") || m.texto.includes("auto-bucle"));
        assert.equal(prohibidos.has(v), rechazada, `${u}->${v}`);
      }
    }
  });
});

describe("nodos virtuales S y T", () => {
  const m = Array.from({ length: 7 }, () => new Array(7).fill(0));
  m[0][2] = 4;
  m[1][2] = 3;
  m[2][5] = 9;
  m[2][6] = 2;

  test("una fuente y un sumidero: sin nodos virtuales", () => {
    const r = prepararRed(m, [0], [5]);
    assert.equal(r.superFuente, null);
    assert.equal(r.superSumidero, null);
    assert.equal(r.nTrabajo, 7);
  });
  test("varias fuentes: se crea S", () => {
    const r = prepararRed(m, [0, 1], [5]);
    assert.equal(r.superFuente, 7);
    assert.equal(r.superSumidero, null);
    assert.equal(r.fuente, 7);
  });
  test("varios sumideros: se crea T", () => {
    const r = prepararRed(m, [0], [5, 6]);
    assert.equal(r.superFuente, null);
    assert.equal(r.superSumidero, 7);
  });
  test("varias fuentes y varios sumideros: se crean S y T", () => {
    const r = prepararRed(m, [0, 1], [5, 6]);
    assert.equal(r.superFuente, 7);
    assert.equal(r.superSumidero, 8);
    assert.equal(r.nTrabajo, 9);
  });
});
