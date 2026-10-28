// Equivalencia con el programa en Python: compara contra tests/fixtures/python.json,
// generado por tests/python/exportar_casos.py a partir del código original.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { type Paso, generarPasosFordFulkerson } from "../src/lib/ff/algoritmo.ts";
import { validarCantidadNodos } from "../src/lib/ff/entrada.ts";
import { evaluarCorte, extremosEfectivos, textosEvaluacion } from "../src/lib/ff/evaluador.ts";
import { generarGrafoAleatorio } from "../src/lib/ff/grafo.ts";
import { calcularPosicionesNodos } from "../src/lib/ff/layout.ts";
import { PyRandom } from "../src/lib/ff/pyrandom.ts";
import { advertirAristasAtipicas, alternarRol, prepararRed, validarRoles } from "../src/lib/ff/red.ts";
import { simularConsola } from "./consola.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
const datos = JSON.parse(readFileSync(new URL("./fixtures/python.json", import.meta.url), "utf-8"));

function pasoAJson(p: Paso) {
  return {
    tipo: p.tipo,
    flujo: p.flujo,
    residual: p.residual,
    flujo_total: p.flujo_total,
    camino: p.camino,
    aristas_camino: p.aristas_camino,
    nodos_camino: [...p.nodos_camino].sort((a, b) => a - b),
    etiquetas: [...p.etiquetas].map(([n, e]) => [n, e.padre, e.signo, e.delta]),
    cuello_botella: p.cuello_botella,
    aristas_corte: p.aristas_corte,
    descripcion: p.descripcion,
    conjunto_alcanzable: p.conjunto_alcanzable ? [...p.conjunto_alcanzable].sort((a, b) => a - b) : null,
  };
}

describe("algoritmo de Ford-Fulkerson (pasos idénticos a Python)", () => {
  for (const caso of datos.algoritmo) {
    test(caso.nombre, () => {
      const avisos = advertirAristasAtipicas(caso.matriz, new Set(caso.fuentes), new Set(caso.sumideros));
      assert.deepEqual(avisos.map((a) => a.texto), caso.avisos);

      const red = prepararRed(caso.matriz, caso.fuentes, caso.sumideros);
      assert.deepEqual(
        {
          n: red.nTrabajo,
          capacidades: red.capacidades,
          fuente: red.fuente,
          sumidero: red.sumidero,
          super_fuente: red.superFuente,
          super_sumidero: red.superSumidero,
        },
        caso.red,
      );

      const pasos = generarPasosFordFulkerson(red.nTrabajo, red.capacidades, red.fuente, red.sumidero, red.superFuente, red.superSumidero);
      assert.equal(pasos.length, caso.pasos.length, "cantidad de pasos");
      pasos.forEach((p, i) => assert.deepEqual(pasoAJson(p), caso.pasos[i], `paso ${i} (${p.tipo})`));

      const layout = calcularPosicionesNodos(red.nTrabajo, red.capacidades, caso.fuentes, caso.sumideros, red.superFuente, red.superSumidero);
      for (const [k, [x, y]] of Object.entries(caso.posiciones) as [string, [number, number]][]) {
        const [jx, jy] = layout.posiciones.get(Number(k))!;
        assert.ok(Math.abs(jx - x) < 1e-12 && Math.abs(jy - y) < 1e-12, `posición del nodo ${k}: ${[jx, jy]} vs ${[x, y]}`);
      }
      assert.deepEqual(
        layout.encabezados.map((e) => [e.titulo, e.tipo]),
        caso.encabezados.map((e: any[]) => [e[1], e[2]]),
      );
    });
  }

  test("los casos incluyen caminos con aristas inversas y redes con S y T", () => {
    const inversas = datos.algoritmo.flatMap((c: any) => c.pasos.flatMap((p: any) => p.aristas_camino)).filter((a: any[]) => a[2] === "-");
    assert.ok(inversas.length > 0);
    assert.ok(datos.algoritmo.some((c: any) => c.red.super_fuente !== null && c.red.super_sumidero !== null));
    assert.ok(datos.algoritmo.some((c: any) => c.red.super_fuente === null && c.red.super_sumidero === null));
  });
});

describe("generador aleatorio (misma semilla → mismo grafo que Python)", () => {
  for (const caso of datos.generador) {
    test(`semilla ${caso.semilla}, n=${caso.n}`, () => {
      const m = generarGrafoAleatorio(caso.n, caso.fuentes, caso.sumideros, new PyRandom(caso.semilla));
      assert.deepEqual(m, caso.matriz);
    });
  }
});

describe("ingreso manual (misma salida que la consola de Python)", () => {
  for (const caso of datos.manual) {
    test(caso.nombre, () => {
      const inicio = caso.lineas.findIndex((l: string) => l.startsWith("PROMPT:Arista"));
      const esperado = caso.lineas.slice(inicio);
      const r = simularConsola(caso.n, caso.entradas);
      assert.deepEqual(r.lineas, esperado);
      assert.equal(r.error, caso.error);
      assert.deepEqual(r.matriz, caso.matriz);
    });
  }
});

describe("validación de n", () => {
  for (const caso of datos.n) {
    test(JSON.stringify(caso.texto), () => {
      const { error } = validarCantidadNodos(caso.texto);
      assert.deepEqual(error ? [error] : [], caso.mensajes);
      assert.equal(error === null, caso.acepta);
    });
  }
});

describe("roles (mismos mensajes que pedir_nodos)", () => {
  test("se exige al menos una fuente y un sumidero", () => {
    const [sinFuente, sinSumidero] = datos.roles;
    assert.deepEqual(validarRoles({ fuentes: [], sumideros: [3] }), sinFuente.mensajes);
    assert.deepEqual(validarRoles({ fuentes: [0], sumideros: [] }), sinSumidero.mensajes);
    assert.deepEqual(validarRoles({ fuentes: [], sumideros: [] }), [...sinFuente.mensajes, ...sinSumidero.mensajes]);
    assert.deepEqual(validarRoles({ fuentes: [0], sumideros: [3] }), []);
  });

  test("un nodo no puede ser fuente y sumidero a la vez (en ambos sentidos)", () => {
    const esperado = datos.roles[2].mensajes[0];
    const a = alternarRol({ fuentes: [3], sumideros: [] }, 3, "sumidero");
    assert.equal(a.error, esperado);
    assert.deepEqual(a.roles, { fuentes: [3], sumideros: [] });
    const b = alternarRol({ fuentes: [], sumideros: [3] }, 3, "fuente");
    assert.equal(b.error, esperado);
    assert.deepEqual(b.roles, { fuentes: [], sumideros: [3] });
  });
});

describe("evaluador de cortes manuales (misma lógica y textos)", () => {
  for (const caso of datos.evaluador) {
    test(caso.nombre, () => {
      const red = prepararRed(caso.matriz, caso.fuentes, caso.sumideros);
      const { fuente, sumidero } = extremosEfectivos(caso.fuentes, caso.sumideros, red.superFuente, red.superSumidero);
      assert.equal(fuente, caso.fuente);
      assert.equal(sumidero, caso.sumidero);
      const e = evaluarCorte(red.capacidades, fuente, sumidero, caso.seleccion);
      assert.deepEqual([...e.conjuntoS].sort((a, b) => a - b), caso.conjunto_s);
      assert.deepEqual([...e.conjuntoT].sort((a, b) => a - b), caso.conjunto_t);
      assert.deepEqual(e.aristasCorte, caso.aristas_corte);
      assert.deepEqual(e.aristasSinEfecto, caso.aristas_sin_efecto);
      assert.equal(e.esCorteValido, caso.es_corte_valido);
      assert.deepEqual(e.caminoRestante, caso.camino_restante);

      const t = textosEvaluacion(red.capacidades, e, red.superFuente, red.superSumidero);
      const textos = [` ${t.insignia} `, t.lados, t.capacidad];
      if (t.notas.length) textos.push(t.notas.join("\n"));
      assert.deepEqual(textos, caso.textos);
    });
  }

  test("hay casos válidos, inválidos y con aristas que no cruzan de S a T", () => {
    assert.ok(datos.evaluador.some((c: any) => c.es_corte_valido));
    assert.ok(datos.evaluador.some((c: any) => !c.es_corte_valido));
    assert.ok(datos.evaluador.some((c: any) => c.aristas_sin_efecto.length > 0));
  });
});
