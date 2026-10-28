"""
Ejecuta el programa original (referencia/ford_fulkerson.py, sin modificaciones)
sobre muchos casos y guarda sus resultados en tests/fixtures/python.json.
Las pruebas de Node comparan la versión web contra este archivo.

Uso (desde la raíz del proyecto):
    python tests/python/exportar_casos.py
"""
import builtins
import io
import json
import os
import random
import sys
from contextlib import redirect_stdout

os.environ.setdefault("MPLBACKEND", "Agg")
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "referencia"))

import numpy as np  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
import ford_fulkerson as ff  # noqa: E402


# ---------------------------------------------------------------------
#  Utilidades
# ---------------------------------------------------------------------
class EntradaAgotada(Exception):
    pass


def ejecutar_con_entradas(funcion, entradas, *args, **kwargs):
    """Ejecuta `funcion` simulando input(); devuelve (resultado, líneas impresas)."""
    pendientes = list(entradas)
    salida = io.StringIO()
    original = builtins.input

    def falso_input(prompt=""):
        print(f"PROMPT:{prompt}")
        if not pendientes:
            raise EntradaAgotada()
        return pendientes.pop(0)

    builtins.input = falso_input
    resultado, error = None, None
    try:
        with redirect_stdout(salida):
            resultado = funcion(*args, **kwargs)
    except EntradaAgotada:
        error = "AGOTADO"
    except Exception as e:  # noqa: BLE001
        error = f"{type(e).__name__}: {e}"
    finally:
        builtins.input = original
    return resultado, salida.getvalue().split("\n"), error


def matriz_a_lista(m):
    return [[int(x) for x in fila] for fila in m]


def paso_a_json(p):
    return {
        "tipo": p["tipo"],
        "flujo": matriz_a_lista(p["flujo"]),
        "residual": matriz_a_lista(p["residual"]),
        "flujo_total": int(p["flujo_total"]),
        "camino": [[int(a), int(b)] for a, b in p["camino"]],
        "aristas_camino": [[int(a), int(b), s] for a, b, s in p["aristas_camino"]],
        "nodos_camino": sorted(int(x) for x in p["nodos_camino"]),
        "etiquetas": [[int(n), e[0] if e[0] == '-' else int(e[0]), e[1], int(e[2])]
                      for n, e in p["etiquetas"].items()],
        "cuello_botella": int(p["cuello_botella"]),
        "aristas_corte": [[int(a), int(b)] for a, b in p["aristas_corte"]],
        "descripcion": p["descripcion"],
        "conjunto_alcanzable": (sorted(int(x) for x in p["conjunto_alcanzable"])
                                if "conjunto_alcanzable" in p else None),
    }


def dag_arbitrario(rng, n, prob):
    """DAG con aristas entre cualquier par de un orden topológico aleatorio."""
    orden = list(range(n))
    rng.shuffle(orden)
    m = np.zeros((n, n), dtype=int)
    for i in range(n):
        for j in range(i + 1, n):
            if rng.random() < prob:
                m[orden[i]][orden[j]] = rng.randint(1, 20)
    return m


# ---------------------------------------------------------------------
#  1. Algoritmo, layout y avisos sobre muchas redes
# ---------------------------------------------------------------------
def caso_algoritmo(nombre, matriz, fuentes, sumideros):
    fuentes, sumideros = sorted(fuentes), sorted(sumideros)
    salida = io.StringIO()
    with redirect_stdout(salida):
        ff.advertir_aristas_atipicas(matriz, set(fuentes), set(sumideros))
    avisos = [l for l in salida.getvalue().split("\n") if l]

    n_trab, caps, fuente, sumidero, sf, ss = ff.preparar_red(matriz, fuentes, sumideros)
    caso = {
        "nombre": nombre,
        "matriz": matriz_a_lista(matriz),
        "fuentes": fuentes,
        "sumideros": sumideros,
        "avisos": avisos,
        "red": {"n": int(n_trab), "capacidades": matriz_a_lista(caps), "fuente": int(fuente),
                "sumidero": int(sumidero),
                "super_fuente": None if sf is None else int(sf),
                "super_sumidero": None if ss is None else int(ss)},
    }
    try:
        pasos = ff.generar_pasos_ford_fulkerson(n_trab, caps, fuente, sumidero, sf, ss)
        caso["pasos"] = [paso_a_json(p) for p in pasos]
    except Exception as e:  # noqa: BLE001
        caso["error"] = f"{type(e).__name__}: {e}"
    posiciones, encabezados = ff.calcular_posiciones_nodos(n_trab, caps, fuentes, sumideros, sf, ss)
    caso["posiciones"] = {str(k): [float(x), float(y)] for k, (x, y) in posiciones.items()}
    caso["encabezados"] = [[float(x), t, tipo] for x, t, tipo in encabezados]
    return caso


def casos_algoritmo():
    casos = []

    # Red clásica en la que el segundo camino necesita una arista inversa.
    m = np.zeros((7, 7), dtype=int)
    for u, v, c in [(0, 1, 10), (0, 2, 10), (1, 3, 10), (1, 2, 5), (2, 4, 10),
                    (3, 6, 10), (4, 3, 10), (4, 5, 10), (5, 6, 10)]:
        m[u][v] = c
    casos.append(caso_algoritmo("clasica_7", m, [0], [6]))

    # Camino que obliga a deshacer flujo (A→B→D→F se usa primero, luego C←B).
    m = np.zeros((8, 8), dtype=int)
    for u, v, c in [(0, 1, 8), (0, 2, 4), (1, 3, 8), (1, 2, 3), (2, 3, 2), (2, 4, 6),
                    (3, 7, 7), (4, 5, 6), (5, 7, 9), (3, 6, 2), (6, 7, 3)]:
        m[u][v] = c
    casos.append(caso_algoritmo("inversa_8", m, [0], [7]))

    rng = random.Random(2024)
    # Grafos por capas (generador original) con distintos roles.
    for i in range(60):
        n = rng.randint(7, 16)
        nf = rng.randint(1, 3)
        ns = rng.randint(1, 3)
        nodos = list(range(n))
        rng.shuffle(nodos)
        fuentes, sumideros = sorted(nodos[:nf]), sorted(nodos[nf:nf + ns])
        random.seed(1000 + i)
        m = ff.generar_grafo_aleatorio(n, fuentes, sumideros)
        casos.append(caso_algoritmo(f"capas_{i}", m, fuentes, sumideros))

    # DAG arbitrarios (aristas atípicas, nodos aislados, varias fuentes/sumideros).
    for i in range(60):
        n = rng.randint(7, 16)
        m = dag_arbitrario(rng, n, rng.choice([0.2, 0.3, 0.45]))
        nf = rng.randint(1, 3)
        ns = rng.randint(1, 3)
        nodos = list(range(n))
        rng.shuffle(nodos)
        casos.append(caso_algoritmo(f"dag_{i}", m, nodos[:nf], nodos[nf:nf + ns]))
    return casos


# ---------------------------------------------------------------------
#  2. Generador aleatorio con semilla
# ---------------------------------------------------------------------
def casos_generador():
    casos = []
    rng = random.Random(77)
    for i in range(40):
        n = rng.randint(7, 16)
        nodos = list(range(n))
        rng.shuffle(nodos)
        nf, ns = rng.randint(1, 3), rng.randint(1, 3)
        fuentes, sumideros = sorted(nodos[:nf]), sorted(nodos[nf:nf + ns])
        semilla = 5000 + i * 7
        random.seed(semilla)
        m = ff.generar_grafo_aleatorio(n, fuentes, sumideros)
        casos.append({"semilla": semilla, "n": n, "fuentes": fuentes, "sumideros": sumideros,
                      "matriz": matriz_a_lista(m)})
    return casos


# ---------------------------------------------------------------------
#  3. Ingreso manual (mismas entradas por consola)
# ---------------------------------------------------------------------
SESIONES_MANUALES = [
    ("errores_basicos", 8, [
        "FIN", "LISTA", "DESHACER",
        "A,B", "A,B,10,3", "A,,5", "", "hola",
        "Z,B,5", "A,9,5", "AB,C,4", "-1,B,3", "a,b,x", "A,B,0", "A,B,-4", "A,B,2.5",
        "C,C,5", "2,2,7",
        "A,B,10", "a, b , 10", "A,B,12", "talvez", "n",
        "A,B,12", "SI",
        "B,C,4", "C,A,3", "C,D,1", "D,B,9", "D,A,9",
        "LISTA", "DESHACER", "DESHACER", "DESHACER", "DESHACER", "DESHACER", "FIN",
        "0,7,25", "7, 0, 3", "007,1,+5", "1,2,1_0", "FIN",
    ]),
    ("muchas_aristas", 16, [
        "A,B,1", "B,C,2", "C,D,3", "D,E,4", "E,F,5", "F,G,6", "G,H,7", "H,I,8",
        "I,J,9", "J,K,10", "K,L,11", "L,M,12", "M,N,13", "N,O,14", "O,P,15",
        "P,A,1", "K,C,2", "A,P,99", "Q,A,1", "15,0,1", "16,0,1", "FIN",
    ]),
    ("sobrescribir_no", 7, ["A,B,5", "A,B,5", "A,B,6", "no", "A,B,6", "Y", "DESHACER", "LISTA", "FIN"]),
]


def casos_manual():
    casos = []
    for nombre, n, entradas in SESIONES_MANUALES:
        matriz, lineas, error = ejecutar_con_entradas(ff.ingresar_grafo_manual, entradas, n)
        casos.append({"nombre": nombre, "n": n, "entradas": entradas, "lineas": lineas,
                      "error": error,
                      "matriz": None if matriz is None else matriz_a_lista(matriz)})
    return casos


# ---------------------------------------------------------------------
#  4. Validación de n y de los roles (iniciar_programa / pedir_nodos)
# ---------------------------------------------------------------------
def casos_n():
    casos = []
    for texto in ["abc", "6", "17", "7.5", "", " 9 ", "+10", "1_6", "-8", "07", "16", "7", "٨"]:
        _, lineas, _ = ejecutar_con_entradas(ff.iniciar_programa, [texto])
        mensajes = [l for l in lineas if l.startswith(("Entrada no válida", "El valor debe"))]
        acepta = any("SELECCIÓN DE FUENTES" in l for l in lineas)
        casos.append({"texto": texto, "mensajes": mensajes, "acepta": acepta})
    return casos


def casos_roles():
    casos = []
    for entradas, excluir, nombre in [
        ([""], (), "fuente"), ([" , "], (), "sumidero"),
        (["0,3"], (3,), "sumidero"), (["3"], (3,), "sumidero"),
    ]:
        _, lineas, _ = ejecutar_con_entradas(ff.pedir_nodos, entradas, "msg: ", 8, nombre, excluir=excluir)
        casos.append({"entradas": entradas, "excluir": list(excluir), "nombre": nombre,
                      "mensajes": [l for l in lineas if l.startswith("Error")]})
    return casos


# ---------------------------------------------------------------------
#  5. Evaluador de cortes manuales
# ---------------------------------------------------------------------
def caso_evaluador(nombre, matriz, fuentes, sumideros, seleccion):
    n_trab, caps, _f, _s, sf, ss = ff.preparar_red(matriz, sorted(fuentes), sorted(sumideros))
    posiciones, encabezados = ff.calcular_posiciones_nodos(n_trab, caps, fuentes, sumideros, sf, ss)
    ev = ff.EvaluadorCortesInteractive(n_trab, caps, set(fuentes), set(sumideros),
                                       posiciones, encabezados, sf, ss)
    ev.aristas_seleccionadas = set(tuple(a) for a in seleccion)
    ev.evaluar_corte()
    ev.renderizar()
    textos = [t.get_text() for t in ev.eje_info.texts]
    plt.close(ev.figura)
    return {
        "nombre": nombre, "matriz": matriz_a_lista(matriz), "fuentes": sorted(fuentes),
        "sumideros": sorted(sumideros), "seleccion": [list(a) for a in seleccion],
        "fuente": int(ev.fuente), "sumidero": int(ev.sumidero),
        "conjunto_s": sorted(int(x) for x in ev.conjunto_s),
        "conjunto_t": sorted(int(x) for x in ev.conjunto_t),
        "aristas_corte": [[int(u), int(v)] for u, v in ev.aristas_corte],
        "aristas_sin_efecto": [[int(u), int(v)] for u, v in ev.aristas_sin_efecto],
        "es_corte_valido": bool(ev.es_corte_valido),
        "camino_restante": [int(x) for x in ev.camino_restante],
        "textos": textos,
    }


def casos_evaluador():
    m = np.zeros((7, 7), dtype=int)
    for u, v, c in [(0, 1, 10), (0, 2, 10), (1, 3, 10), (1, 2, 5), (2, 4, 10),
                    (3, 6, 10), (4, 3, 10), (4, 5, 10), (5, 6, 10)]:
        m[u][v] = c
    casos = [
        caso_evaluador("valido", m, [0], [6], [(0, 1), (0, 2)]),
        caso_evaluador("invalido", m, [0], [6], [(0, 1), (2, 4)]),
        caso_evaluador("sin_efecto", m, [0], [6], [(3, 6), (5, 6), (1, 2), (4, 3)]),
        caso_evaluador("vacio", m, [0], [6], []),
        caso_evaluador("invalido_real", m, [0], [6], [(0, 1), (3, 6)]),
        caso_evaluador("virtuales", m, [0, 1], [5, 6], [(7, 0), (2, 4), (1, 3)]),
        caso_evaluador("virtuales_valido", m, [0, 1], [5, 6], [(7, 0), (7, 1)]),
    ]
    rng = random.Random(99)
    for i in range(20):
        n = rng.randint(7, 12)
        mm = dag_arbitrario(rng, n, 0.35)
        nodos = list(range(n))
        rng.shuffle(nodos)
        f, s = nodos[:rng.randint(1, 2)], nodos[2:2 + rng.randint(1, 2)]
        n_trab, caps, *_ = ff.preparar_red(mm, sorted(f), sorted(s))
        aristas = [(u, v) for u in range(n_trab) for v in range(n_trab) if caps[u][v] > 0]
        seleccion = rng.sample(aristas, min(len(aristas), rng.randint(0, 5)))
        casos.append(caso_evaluador(f"azar_{i}", mm, f, s, seleccion))
    return casos


def main():
    datos = {
        "algoritmo": casos_algoritmo(),
        "generador": casos_generador(),
        "manual": casos_manual(),
        "n": casos_n(),
        "roles": casos_roles(),
        "evaluador": casos_evaluador(),
    }
    destino = os.path.join(RAIZ, "tests", "fixtures", "python.json")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False)
    inversas = sum(1 for c in datos["algoritmo"] for p in c.get("pasos", [])
                   for a in p["aristas_camino"] if a[2] == '-')
    print(f"{len(datos['algoritmo'])} redes, {inversas} aristas inversas usadas, "
          f"{sum(1 for c in datos['algoritmo'] if 'error' in c)} con error -> {destino}")


if __name__ == "__main__":
    main()
