import random
import textwrap
from collections import Counter

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Button
from matplotlib.patches import Patch
from matplotlib.lines import Line2D

INFINITO = 999999

C_SUPER_FUENTE = '#1b5e20'
C_SUPER_SUMIDERO = '#b71c1c'
C_FUENTE = '#a5d6a7'
C_SUMIDERO = '#ef9a9a'
C_INTERMEDIO = '#eceff1'
C_ETIQUETADO = '#fff59d'
C_EN_CAMINO = '#ffcc80'
C_LADO_S = '#90caf9'

B_NORMAL = '#37474f'
B_ETIQUETADO = '#f9a825'
B_CAMINO = '#e65100'
B_ACTUALIZADO = '#2e7d32'
B_LADO_S = '#1565c0'
B_LADO_T = '#90a4ae'

A_SIN_FLUJO = '#b0bec5'
A_PARCIAL = '#42a5f5'
A_SATURADA = '#0d47a1'
A_CAMINO_DIRECTO = '#ef6c00'
A_CAMINO_INVERSO = '#d81b60'
A_ACTUALIZADA = '#2e7d32'
A_FRONTERA = '#e57373'
A_CORTE = '#d32f2f'

T_MAS = '#c8e6c9'
T_MENOS = '#f8bbd0'
T_FUENTE = '#bbdefb'
T_VACIA = '#f5f5f5'

BANDAS = {
    'super_fuente': '#c8e6c9',
    'fuente': '#e8f5e9',
    'sumidero': '#ffebee',
    'super_sumidero': '#ffcdd2',
}

INSIGNIAS = {
    'inicio': ('INICIO', '#546e7a'),
    'camino_encontrado': ('ETIQUETADO: CAMINO AUMENTANTE ENCONTRADO', '#ef6c00'),
    'flujo_actualizado': ('ACTUALIZACIÓN DEL FLUJO', '#2e7d32'),
    'sin_mas_caminos': ('ETIQUETADO SIN LLEGAR AL SUMIDERO', '#c62828'),
    'corte_minimo': ('RESULTADO: FLUJO MÁXIMO Y CORTE MÍNIMO', '#b71c1c'),
}

# Curvaturas candidatas para dibujar las aristas evitando los nodos
CANDIDATOS_RAD = [0.0, 0.08, -0.08, 0.16, -0.16, 0.25, -0.25, 0.35, -0.35, 0.5, -0.5]


def nombre_nodo(u, super_fuente=None, super_sumidero=None):
    if super_fuente is not None and u == super_fuente:
        return "S"
    if super_sumidero is not None and u == super_sumidero:
        return "T"
    if isinstance(u, (int, np.integer)):
        letra = ""
        temp = int(u)
        while True:
            letra = chr(ord('A') + (temp % 26)) + letra
            temp = temp // 26 - 1
            if temp < 0:
                break
        return letra
    return str(u)


# =====================================================================
#  GENERACIÓN / INGRESO DEL GRAFO
# =====================================================================
def detectar_ciclos(cantidad_nodos, matriz_capacidades):
    grados_entrada = [0] * cantidad_nodos
    for origen in range(cantidad_nodos):
        for destino in range(cantidad_nodos):
            if matriz_capacidades[origen][destino] > 0:
                grados_entrada[destino] += 1

    cola = [nodo for nodo in range(cantidad_nodos) if grados_entrada[nodo] == 0]
    nodos_visitados = 0

    while cola:
        actual = cola.pop(0)
        nodos_visitados += 1
        for destino in range(cantidad_nodos):
            if matriz_capacidades[actual][destino] > 0:
                grados_entrada[destino] -= 1
                if grados_entrada[destino] == 0:
                    cola.append(destino)

    return nodos_visitados != cantidad_nodos


def generar_grafo_aleatorio(cantidad_nodos, lista_fuentes, lista_sumideros):
    matriz_cap = np.zeros((cantidad_nodos, cantidad_nodos), dtype=int)
    fuentes = list(lista_fuentes)
    sumideros = list(lista_sumideros)

    intermedios = [u for u in range(cantidad_nodos) if u not in fuentes and u not in sumideros]
    random.shuffle(intermedios)

    capas_intermedias = []
    m = len(intermedios)
    if m > 0:
        minimo = max(1, -(-m // 5))
        maximo = min(max(minimo, (m + 1) // 2), 6)
        k = random.randint(minimo, maximo)
        capas_intermedias = [[] for _ in range(k)]
        for i, nodo in enumerate(intermedios):
            if i < k:
                capas_intermedias[i].append(nodo)
            else:
                random.choice(capas_intermedias).append(nodo)

    capas = [fuentes] + capas_intermedias + [sumideros]

    for i in range(len(capas) - 1):
        actual, siguiente = capas[i], capas[i + 1]

        for u in actual:
            cantidad = random.randint(1, min(2, len(siguiente)))
            for v in random.sample(siguiente, cantidad):
                matriz_cap[u][v] = random.randint(5, 25)

        for v in siguiente:
            if not any(matriz_cap[u][v] > 0 for u in actual):
                u = random.choice(actual)
                matriz_cap[u][v] = random.randint(5, 25)

        if i + 2 < len(capas):
            for u in actual:
                if random.random() < 0.15:
                    v = random.choice(capas[i + 2])
                    if matriz_cap[u][v] == 0:
                        matriz_cap[u][v] = random.randint(5, 25)

    return matriz_cap


# ---------------------------------------------------------------------
#  Ingreso manual con validación incremental (arista por arista)
# ---------------------------------------------------------------------
def buscar_camino_dirigido(matriz_cap, origen, destino):
    """BFS dirigido. Devuelve la lista de nodos origen→…→destino o None."""
    padre = {origen: None}
    cola = [origen]
    while cola:
        u = cola.pop(0)
        if u == destino:
            ruta = []
            while u is not None:
                ruta.append(u)
                u = padre[u]
            return ruta[::-1]
        for v in range(len(matriz_cap)):
            if matriz_cap[u][v] > 0 and v not in padre:
                padre[v] = u
                cola.append(v)
    return None


def _parsear_nodo(texto, cantidad_nodos):
    """Convierte 'A' / 'a' / '0' en el índice del nodo, validando el rango."""
    val = texto.strip().upper()
    if val.isdecimal():
        nodo = int(val)
    elif len(val) == 1 and 'A' <= val <= 'Z':
        nodo = ord(val) - ord('A')
    else:
        raise ValueError(f"'{texto.strip()}' no es un nodo válido (use una letra A-Z o un número).")
    if not (0 <= nodo < cantidad_nodos):
        raise ValueError(
            f"el nodo '{texto.strip()}' está fuera de rango; los nodos válidos van de "
            f"A a {nombre_nodo(cantidad_nodos - 1)} (0 a {cantidad_nodos - 1}).")
    return nodo


def _confirmar_si_no(mensaje):
    while True:
        respuesta = input(mensaje).strip().upper()
        if respuesta in ('S', 'SI', 'SÍ', 'Y', 'YES'):
            return True
        if respuesta in ('N', 'NO'):
            return False
        print("   Responda S (sí) o N (no).")


def mostrar_resumen_red(matriz_cap):
    n = len(matriz_cap)
    aristas = [(u, v) for u in range(n) for v in range(n) if matriz_cap[u][v] > 0]
    print(f"   ── Red actual: {len(aristas)} arista(s) aceptada(s) ──")
    if aristas:
        listado = ", ".join(f"{nombre_nodo(u)}->{nombre_nodo(v)}({int(matriz_cap[u][v])})"
                            for u, v in aristas)
        print(textwrap.fill(listado, width=72, initial_indent="   ", subsequent_indent="   "))
    else:
        print("   (todavía no hay aristas)")


def ingresar_grafo_manual(cantidad_nodos):
    matriz_cap = np.zeros((cantidad_nodos, cantidad_nodos), dtype=int)
    historial = []   # (origen, destino, capacidad_anterior) para poder deshacer

    ultimo = nombre_nodo(cantidad_nodos - 1)
    print("\n--- INGRESO MANUAL DE ARISTAS (validación en tiempo real) ---")
    print("Formato de cada arista: origen,destino,capacidad")
    print(f"Ejemplos: A,B,10   o   0,1,10      (nodos válidos: A-{ultimo} / 0-{cantidad_nodos - 1})")
    print("Cada arista se valida al instante; si crea un ciclo se descarta y la red sigue válida.")
    print("Comandos: FIN (terminar) | DESHACER (quita la última acción) | LISTA (ver la red)\n")

    while True:
        entrada = input("Arista (origen,destino,capacidad): ").strip()
        comando = entrada.upper()

        # ---------------- Comandos ----------------
        if comando == 'FIN':
            if not np.any(matriz_cap > 0):
                print("Error: debe ingresar al menos una arista antes de finalizar.")
                continue
            break
        if comando == 'LISTA':
            mostrar_resumen_red(matriz_cap)
            continue
        if comando == 'DESHACER':
            if not historial:
                print("No hay acciones para deshacer.")
                continue
            u, v, anterior = historial.pop()
            matriz_cap[u][v] = anterior
            if anterior > 0:
                print(f"Se restauró la capacidad de {nombre_nodo(u)}->{nombre_nodo(v)} a {anterior}.")
            else:
                print(f"Se quitó la arista {nombre_nodo(u)}->{nombre_nodo(v)}.")
            mostrar_resumen_red(matriz_cap)
            continue

        # ---------------- a) Formato ----------------
        partes = [p.strip() for p in entrada.split(',')]
        if len(partes) != 3 or any(p == '' for p in partes):
            print("Error de formato: use exactamente origen,destino,capacidad (ej: A,B,10).")
            continue

        # ---------------- b) Rango de nodos ----------------
        try:
            origen = _parsear_nodo(partes[0], cantidad_nodos)
            destino = _parsear_nodo(partes[1], cantidad_nodos)
        except ValueError as error:
            print(f"Error: {error}")
            continue

        try:
            capacidad = int(partes[2])
        except ValueError:
            print(f"Error: la capacidad '{partes[2]}' debe ser un número entero (ej: 10).")
            continue
        if capacidad <= 0:
            print("Error: la capacidad debe ser un entero mayor a 0.")
            continue

        nom_o, nom_d = nombre_nodo(origen), nombre_nodo(destino)

        # ---------------- c) Auto-bucle ----------------
        if origen == destino:
            print(f"Error: {nom_o}->{nom_d} es un auto-bucle (un nodo no puede conectarse consigo mismo). "
                  f"Se ha descartado.")
            continue

        # ---------------- d) Arista ya existente ----------------
        anterior = int(matriz_cap[origen][destino])
        if anterior > 0:
            if anterior == capacidad:
                print(f"Aviso: la arista {nom_o}->{nom_d} ya existe con capacidad {anterior}. Sin cambios.")
                continue
            sobrescribir = _confirmar_si_no(
                f"Aviso: la arista {nom_o}->{nom_d} ya existe con capacidad {anterior}. "
                f"¿Sobrescribir con {capacidad}? (S/N): ")
            if not sobrescribir:
                print(f"Se conserva {nom_o}->{nom_d} con capacidad {anterior}.")
                continue
        else:
            # ---------------- e) ¿Crearía un ciclo? ----------------
            # Añadir origen->destino cierra un ciclo si destino ya alcanza a origen.
            camino = buscar_camino_dirigido(matriz_cap, destino, origen)
            if camino is not None:
                ciclo = " → ".join(nombre_nodo(x) for x in [origen] + camino)
                print(f"Error: La arista {nom_o}->{nom_d} crearía un ciclo con las aristas ya "
                      f"ingresadas ({ciclo}). Se ha descartado.")
                continue

        # ---------------- Arista aceptada ----------------
        matriz_cap[origen][destino] = capacidad
        historial.append((origen, destino, anterior))
        if anterior > 0:
            print(f"OK: capacidad de {nom_o}->{nom_d} actualizada de {anterior} a {capacidad}.")
        else:
            print(f"OK: arista {nom_o}->{nom_d} (capacidad {capacidad}) aceptada.")
        mostrar_resumen_red(matriz_cap)

    # Comprobación defensiva final (no debería fallar: cada arista se validó al ingresar)
    if detectar_ciclos(cantidad_nodos, matriz_cap):
        raise RuntimeError("Inconsistencia interna: la red ingresada contiene un ciclo.")

    total = int(np.count_nonzero(matriz_cap))
    print(f"\nGrafo acíclico validado con éxito ({total} arista(s)).")
    return matriz_cap


def advertir_aristas_atipicas(matriz_cap, fuentes, sumideros):
    n = len(matriz_cap)
    for u in range(n):
        for v in range(n):
            if matriz_cap[u][v] > 0:
                if v in fuentes:
                    print(f"Aviso: la arista {nombre_nodo(u)}->{nombre_nodo(v)} entra a un nodo fuente.")
                if u in sumideros:
                    print(f"Aviso: la arista {nombre_nodo(u)}->{nombre_nodo(v)} sale de un nodo sumidero.")

ETIQUETA_FUENTE = ('-', '', INFINITO)


def buscar_camino_con_etiquetas(matriz_cap, matriz_flujo, fuente, sumidero):
    num_nodos = len(matriz_cap)
    etiquetas = {fuente: ETIQUETA_FUENTE}
    cola = [fuente]

    while cola and sumidero not in etiquetas:
        u = cola.pop(0)
        delta_u = etiquetas[u][2]

        for v in range(num_nodos):
            if v in etiquetas:
                continue

            residual_directo = matriz_cap[u][v] - matriz_flujo[u][v]
            if matriz_cap[u][v] > 0 and residual_directo > 0:
                etiquetas[v] = (u, '+', int(min(delta_u, residual_directo)))
                cola.append(v)
            elif matriz_cap[v][u] > 0 and matriz_flujo[v][u] > 0:
                etiquetas[v] = (u, '-', int(min(delta_u, matriz_flujo[v][u])))
                cola.append(v)

            if sumidero in etiquetas:
                break

    if sumidero not in etiquetas:
        return None, etiquetas

    camino = []
    actual = sumidero
    while actual != fuente:
        predecesor = etiquetas[actual][0]
        camino.append((predecesor, actual))
        actual = predecesor
    camino.reverse()

    return camino, etiquetas


def calcular_conjuntos_corte(etiquetas, num_nodos):
    conjunto_s = set(etiquetas.keys())
    conjunto_t = set(range(num_nodos)) - conjunto_s
    return conjunto_s, conjunto_t


def calcular_aristas_corte(capacidades, etiquetas, num_nodos):
    conjunto_s, conjunto_t = calcular_conjuntos_corte(etiquetas, num_nodos)
    return [(u, v) for u in sorted(conjunto_s) for v in sorted(conjunto_t)
            if capacidades[u][v] > 0]


def modificar_flujo_arista(flujo, u, v, cambio):
    flujo[u][v] += cambio
    flujo[v][u] -= cambio


def verificar_red_de_flujo(capacidades, flujo, fuente, sumidero, flujo_total):
    if np.any(flujo > capacidades):
        raise AssertionError("Se violó la restricción de capacidad: f(u,v) > c(u,v).")
    if not np.array_equal(flujo, -flujo.T):
        raise AssertionError("Se violó la simetría: f(u,v) ≠ −f(v,u).")
    for u in range(len(capacidades)):
        if u in (fuente, sumidero):
            continue
        if flujo[u].sum() != 0:
            raise AssertionError(f"Se violó la conservación del flujo en el nodo {u}.")
    if flujo[fuente].sum() != flujo_total or flujo[sumidero].sum() != -flujo_total:
        raise AssertionError("El flujo neto de la fuente/sumidero no coincide con el flujo total.")


def verificar_corte_minimo(capacidades, flujo, conjunto_s, conjunto_t, aristas_corte, flujo_total):
    for u, v in aristas_corte:
        if flujo[u][v] != capacidades[u][v]:
            raise AssertionError(f"La arista del corte {u}→{v} no está saturada.")
    for u in conjunto_t:
        for v in conjunto_s:
            if capacidades[u][v] > 0 and flujo[u][v] != 0:
                raise AssertionError(f"El arco {u}→{v} (de T hacia S) debería tener flujo 0.")
    capacidad_corte = sum(int(capacidades[u][v]) for u, v in aristas_corte)
    if capacidad_corte != flujo_total:
        raise AssertionError("La capacidad del corte no coincide con el flujo máximo.")
    return capacidad_corte


def generar_pasos_ford_fulkerson(num_nodos, matriz_cap, fuente, sumidero,
                                 super_fuente=None, super_sumidero=None):
    def nom(u):
        return nombre_nodo(u, super_fuente, super_sumidero)

    capacidades = np.copy(matriz_cap)
    if np.any((capacidades > 0) & (capacidades.T > 0)):
        raise ValueError("La red tiene arcos antiparalelos (u→v y v→u); no es un DAG.")
    flujo = np.zeros((num_nodos, num_nodos), dtype=int)
    pasos = []

    def nuevo_paso(tipo, flujo_total, etiquetas, descripcion, **extra):
        paso = {
            'tipo': tipo,
            'flujo': np.copy(flujo),
            'residual': capacidades - flujo,
            'flujo_total': flujo_total,
            'camino': [],
            'aristas_camino': [],
            'nodos_camino': set(),
            'etiquetas': dict(etiquetas),
            'cuello_botella': 0,
            'aristas_corte': [],
            'descripcion': descripcion,
        }
        paso.update(extra)
        pasos.append(paso)

    desc_inicio = "Flujo 0 en todas las aristas (cumple 0 ≤ f ≤ c).\n"
    if super_fuente is not None and super_sumidero is not None:
        desc_inicio += "Los nodos S y T son virtuales y se conectan con capacidad ∞.\n"
    elif super_fuente is not None:
        desc_inicio += "El nodo S es una super-fuente virtual (capacidad ∞ hacia cada fuente).\n"
    elif super_sumidero is not None:
        desc_inicio += "El nodo T es un super-sumidero virtual (capacidad ∞ desde cada sumidero).\n"
    desc_inicio += (f"La fuente {nom(fuente)} se etiqueta [-, ∞]; desde ella se propagan "
                    f"las etiquetas [padre±, Δ].")
    nuevo_paso('inicio', 0, {fuente: ETIQUETA_FUENTE}, desc_inicio)

    flujo_total = 0
    iteracion = 1

    while True:
        camino, etiquetas = buscar_camino_con_etiquetas(capacidades, flujo, fuente, sumidero)

        if not camino:
            conjunto_s, conjunto_t = calcular_conjuntos_corte(etiquetas, num_nodos)
            aristas_frontera = calcular_aristas_corte(capacidades, etiquetas, num_nodos)
            etiquetados = ", ".join(nom(u) for u in sorted(conjunto_s))
            sin_etiqueta = ", ".join(nom(u) for u in sorted(conjunto_t))
            nuevo_paso(
                'sin_mas_caminos', flujo_total, etiquetas,
                f"Iteración {iteracion}: {nom(sumidero)} sin etiqueta → no hay más caminos.\n"
                f"Lado S (etiquetados): {{{etiquetados}}}   Lado T (sin etiqueta): {{{sin_etiqueta}}}\n"
                f"Rojas punteadas S→T: saturadas (f = c); las T→S tienen f = 0.",
                aristas_corte=aristas_frontera
            )
            break

        delta = int(etiquetas[sumidero][2])
        etiq_p, etiq_signo, _ = etiquetas[sumidero]
        aristas_camino = []
        recorrido = nom(camino[0][0])
        for p, v in camino:
            signo = etiquetas[v][1]
            if signo == '+':
                aristas_camino.append((p, v, '+'))
                recorrido += f" → {nom(v)}"
            else:
                aristas_camino.append((v, p, '-'))
                recorrido += f" ← {nom(v)}"
        nodos_camino = {n for arista in camino for n in arista}

        nuevo_paso(
            'camino_encontrado', flujo_total, etiquetas,
            f"Iteración {iteracion}: {nom(sumidero)} etiquetado [{nom(etiq_p)}{etiq_signo}, {delta}]"
            f" → camino aumentante.\n"
            f"Camino aumentante: {recorrido}   (← = arista recorrida al revés)\n"
            f"Cuello de botella Δ = {delta} = mín. residual del camino",
            camino=camino, aristas_camino=aristas_camino, nodos_camino=nodos_camino,
            cuello_botella=delta
        )

        for u, v, signo in aristas_camino:
            if signo == '+':
                modificar_flujo_arista(flujo, u, v, +delta)
            else:
                modificar_flujo_arista(flujo, u, v, -delta)

        flujo_total += delta
        verificar_red_de_flujo(capacidades, flujo, fuente, sumidero, flujo_total)

        nuevo_paso(
            'flujo_actualizado', flujo_total, etiquetas,
            f"Iteración {iteracion}: se envían Δ = {delta} unidades por el camino.\n"
            f"Directas (+): f(u,v) += Δ   |   Inversas (−): f(u,v) −= Δ\n"
            f"Simetría y conservación de flujo verificadas (entra = sale).\n"
            f"Flujo acumulado total = {flujo_total}",
            camino=camino, aristas_camino=aristas_camino, nodos_camino=nodos_camino,
            cuello_botella=delta
        )
        iteracion += 1

    conjunto_s, conjunto_t = calcular_conjuntos_corte(etiquetas, num_nodos)
    aristas_corte = calcular_aristas_corte(capacidades, etiquetas, num_nodos)
    capacidad_corte = verificar_corte_minimo(
        capacidades, flujo, conjunto_s, conjunto_t, aristas_corte, flujo_total)

    lado_s = ", ".join(nom(u) for u in sorted(conjunto_s))
    lado_t = ", ".join(nom(u) for u in sorted(conjunto_t))
    if aristas_corte:
        texto_corte = ", ".join(f"{nom(u)}→{nom(v)}" for u, v in aristas_corte)
    else:
        texto_corte = "ninguna"
    if 1 < len(aristas_corte) <= 6:
        detalle_suma = " + ".join(str(int(capacidades[u][v])) for u, v in aristas_corte) + " = "
    else:
        detalle_suma = ""

    nuevo_paso(
        'corte_minimo', flujo_total, etiquetas,
        f"¡Ejecución finalizada!  Flujo máximo = {flujo_total}\n"
        f"Lado S (alcanzables): {{{lado_s}}}   Lado T: {{{lado_t}}}\n"
        f"Aristas del corte mínimo (rojo), u∈S → v∈T: {texto_corte}\n"
        f"Capacidad del corte = Σ c(u,v) = {detalle_suma}{capacidad_corte} = flujo máximo",
        conjunto_alcanzable=conjunto_s, aristas_corte=aristas_corte
    )

    return pasos


# =====================================================================
#  LAYOUT DEL GRAFO
# =====================================================================
def _orientacion(p, q, r):
    return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])


def _segmentos_se_cruzan(p1, p2, p3, p4):
    d1 = _orientacion(p3, p4, p1)
    d2 = _orientacion(p3, p4, p2)
    d3 = _orientacion(p1, p2, p3)
    d4 = _orientacion(p1, p2, p4)
    return d1 * d2 < 0 and d3 * d4 < 0


def calcular_posiciones_nodos(num_nodos, matriz_cap, lista_fuentes, lista_sumideros,
                              super_fuente=None, super_sumidero=None):
    fuentes = sorted(set(lista_fuentes))
    sumideros = sorted(set(lista_sumideros))
    set_fuentes, set_sumideros = set(fuentes), set(sumideros)

    especiales = set_fuentes | set_sumideros
    if super_fuente is not None:
        especiales.add(super_fuente)
    if super_sumidero is not None:
        especiales.add(super_sumidero)
    intermedios = [u for u in range(num_nodos) if u not in especiales]
    set_intermedios = set(intermedios)

    aristas = [(u, v) for u in range(num_nodos) for v in range(num_nodos) if matriz_cap[u][v] > 0]

    capa = {f: 0 for f in fuentes}
    for u in intermedios:
        capa[u] = 1
    for _ in range(len(intermedios) + 1):
        cambio = False
        for u, v in aristas:
            if v in set_intermedios and u in capa and capa[v] < capa[u] + 1:
                capa[v] = capa[u] + 1
                cambio = True
        if not cambio:
            break

    if intermedios:
        L = max(capa[u] for u in intermedios)
        for u in sorted(intermedios, key=lambda x: -capa[x]):
            entradas = sum(1 for a, b in aristas if b == u and a in capa)
            capas_suc = []
            for a, b in aristas:
                if a != u:
                    continue
                if b in set_sumideros:
                    capas_suc.append(L + 1)
                elif b in set_intermedios:
                    capas_suc.append(capa[b])
            if capas_suc and len(capas_suc) > entradas:
                tope = min(capas_suc) - 1
                if tope > capa[u]:
                    capa[u] = tope

    grupos = {}
    for u in intermedios:
        grupos.setdefault(capa[u], []).append(u)
    capas_ordenadas = sorted(grupos.keys())

    columnas, tipos, titulos = [], [], []
    if super_fuente is not None:
        columnas.append([super_fuente]); tipos.append('super_fuente'); titulos.append("Super-Fuente")
    columnas.append(list(fuentes)); tipos.append('fuente')
    titulos.append("Fuente" if len(fuentes) == 1 else "Fuentes")
    for i, d in enumerate(capas_ordenadas):
        columnas.append(sorted(grupos[d])); tipos.append('capa'); titulos.append(f"Capa {i + 1}")
    columnas.append(list(sumideros)); tipos.append('sumidero')
    titulos.append("Sumidero" if len(sumideros) == 1 else "Sumideros")
    if super_sumidero is not None:
        columnas.append([super_sumidero]); tipos.append('super_sumidero'); titulos.append("Super-Sumidero")

    indice_col = {nodo: c for c, col in enumerate(columnas) for nodo in col}

    vecinos_izq = {u: [] for u in range(num_nodos)}
    vecinos_der = {u: [] for u in range(num_nodos)}
    for u, v in aristas:
        cu, cv = indice_col[u], indice_col[v]
        if cu < cv:
            vecinos_der[u].append(v)
            vecinos_izq[v].append(u)
        elif cu > cv:
            vecinos_izq[u].append(v)
            vecinos_der[v].append(u)

    def rangos(orden):
        r = {}
        for col in orden:
            m = len(col)
            for i, nodo in enumerate(col):
                r[nodo] = 0.5 if m == 1 else i / (m - 1)
        return r

    def contar_cruces(orden):
        r = rangos(orden)
        pts = {n: (indice_col[n], r[n]) for n in r}
        cruces = 0
        for i in range(len(aristas)):
            a, b = aristas[i]
            for j in range(i + 1, len(aristas)):
                c, d = aristas[j]
                if len({a, b, c, d}) < 4:
                    continue
                if _segmentos_se_cruzan(pts[a], pts[b], pts[c], pts[d]):
                    cruces += 1
        return cruces

    def barrido(orden, hacia_derecha):
        r = rangos(orden)
        indices = range(len(orden)) if hacia_derecha else range(len(orden) - 1, -1, -1)
        for c in indices:
            col = orden[c]
            if len(col) < 2:
                continue
            claves = {}
            for nodo in col:
                vec = vecinos_izq[nodo] if hacia_derecha else vecinos_der[nodo]
                claves[nodo] = sum(r[w] for w in vec) / len(vec) if vec else r[nodo]
            col.sort(key=lambda x: claves[x])
            m = len(col)
            for i, nodo in enumerate(col):
                r[nodo] = 0.5 if m == 1 else i / (m - 1)

    rng = random.Random(7)
    mejor, mejor_cruces = None, float('inf')
    for intento in range(30):
        orden = [list(col) for col in columnas]
        if intento > 0:
            for col in orden:
                rng.shuffle(col)
        for _ in range(8):
            barrido(orden, True)
            barrido(orden, False)
            cruces = contar_cruces(orden)
            if cruces < mejor_cruces:
                mejor_cruces = cruces
                mejor = [list(col) for col in orden]
            if mejor_cruces == 0:
                break
        if mejor_cruces == 0:
            break

    Y_MIN, Y_MAX = 0.14, 0.84
    max_m = max(len(c) for c in mejor)
    sep = min(0.2, (Y_MAX - Y_MIN) / max(max_m - 1, 1))

    y = {}
    for col in mejor:
        m = len(col)
        for i, nodo in enumerate(col):
            y[nodo] = 0.49 + ((m - 1) / 2 - i) * sep

    for _ in range(15):
        for col in mejor:
            m = len(col)
            deseado = []
            for nodo in col:
                vec = [y[w] for w in vecinos_izq[nodo] + vecinos_der[nodo]]
                if vec:
                    deseado.append(0.5 * y[nodo] + 0.5 * (sum(vec) / len(vec)))
                else:
                    deseado.append(y[nodo])
            abajo = deseado[:]
            for i in range(1, m):
                abajo[i] = min(abajo[i], abajo[i - 1] - sep)
            arriba = deseado[:]
            for i in range(m - 2, -1, -1):
                arriba[i] = max(arriba[i], arriba[i + 1] + sep)
            res = [(a + b) / 2 for a, b in zip(abajo, arriba)]
            if min(res) < Y_MIN:
                d = Y_MIN - min(res)
                res = [r + d for r in res]
            if max(res) > Y_MAX:
                d = max(res) - Y_MAX
                res = [r - d for r in res]
            for nodo, val in zip(col, res):
                y[nodo] = val

    total = len(mejor)
    posiciones, encabezados = {}, []
    for idx, col in enumerate(mejor):
        x = 0.5 if total == 1 else 0.07 + 0.86 * idx / (total - 1)
        encabezados.append((x, titulos[idx], tipos[idx]))
        for nodo in col:
            posiciones[nodo] = (x, y[nodo])

    return posiciones, encabezados


# =====================================================================
#  GEOMETRÍA DE ARISTAS Y COLOCACIÓN DE ETIQUETAS SIN SOLAPAMIENTO
# =====================================================================
def _bezier(p1, p2, ctrl, t):
    t = np.asarray(t, dtype=float)[:, None]
    return (1 - t) ** 2 * p1 + 2 * (1 - t) * t * ctrl + t ** 2 * p2


def estimar_caja_texto(texto, fontsize, dpi):
    """Tamaño aproximado (ancho, alto) en píxeles de una etiqueta con caja redondeada."""
    ancho = (len(texto) * 0.62 * fontsize + 0.9 * fontsize) * dpi / 72
    alto = 2.0 * fontsize * dpi / 72
    return ancho, alto


def calcular_geometria_aristas(num_nodos, matriz_cap, posiciones, w, h, radio_px):
    """
    Para cada arista elige la curvatura (arc3) que mejor esquiva los nodos y
    devuelve su curva Bézier muestreada. Todo en píxeles del eje.
    """
    umbral = radio_px + 12
    pts = {u: np.array([x * w, y * h]) for u, (x, y) in posiciones.items()}
    ts = np.linspace(0.06, 0.94, 30)
    ts_muestreo = np.linspace(0.0, 1.0, 41)

    geometria = {}
    for u in range(num_nodos):
        for v in range(num_nodos):
            if matriz_cap[u][v] <= 0:
                continue
            p1, p2 = pts[u], pts[v]
            otros = np.array([pts[k] for k in pts if k not in (u, v)]).reshape(-1, 2)
            mejor_rad, mejor_costo = 0.0, None
            for rad in CANDIDATOS_RAD:
                ctrl = (p1 + p2) / 2 + rad * np.array([p2[1] - p1[1], -(p2[0] - p1[0])])
                curva = _bezier(p1, p2, ctrl, ts)
                penal = 0.0
                if len(otros):
                    d = np.linalg.norm(curva[None, :, :] - otros[:, None, :], axis=2).min(axis=1)
                    penal = float(np.sum(np.clip(umbral - d, 0, None) ** 2))
                costo = penal * 10 + abs(rad) * 40
                if mejor_costo is None or costo < mejor_costo:
                    mejor_costo, mejor_rad = costo, rad

            ctrl = (p1 + p2) / 2 + mejor_rad * np.array([p2[1] - p1[1], -(p2[0] - p1[0])])
            geometria[(u, v)] = {
                'rad': mejor_rad, 'p1': p1, 'p2': p2, 'ctrl': ctrl,
                'poli': _bezier(p1, p2, ctrl, ts_muestreo),
            }
    return geometria


def colocar_etiquetas(geometria, posiciones, w, h, radio_px, dims):
    """
    Coloca la etiqueta de cada arista evitando que se solape con:
      - las etiquetas ya colocadas,
      - los círculos de los nodos,
      - las demás aristas,
      - los bordes del área de dibujo.
    Para cada arista prueba varias posiciones t de la curva Bézier y, si hace
    falta, desplaza la etiqueta en perpendicular a la curva (offset adaptativo).
    Las aristas cortas se colocan primero porque tienen menos opciones.

    dims: {(u,v): (ancho_px, alto_px)} tamaño estimado de cada etiqueta.
    Devuelve {(u,v): np.array([x_px, y_px])}.
    """
    aristas = list(geometria.keys())
    if not aristas:
        return {}

    centros = np.array([[x * w, y * h] for x, y in posiciones.values()]).reshape(-1, 2)
    todas = np.vstack([geometria[a]['poli'] for a in aristas])
    dueno = np.concatenate([np.full(len(geometria[a]['poli']), i) for i, a in enumerate(aristas)])
    indice = {a: i for i, a in enumerate(aristas)}

    orden = sorted(aristas, key=lambda a: float(np.linalg.norm(geometria[a]['p2'] - geometria[a]['p1'])))
    ts_candidatos = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.2, 0.8]
    multiplos = [0.0, 1.0, -1.0, 1.8, -1.8]

    colocadas = np.empty((0, 4))   # columnas: cx, cy, semiancho, semialto
    resultado = {}

    for a in orden:
        g = geometria[a]
        ancho, alto = dims[a]
        hw, hh = ancho / 2.0, alto / 2.0
        otras = todas[dueno != indice[a]]
        mejor_c, mejor_costo = None, None

        for t in ts_candidatos:
            q = _bezier(g['p1'], g['p2'], g['ctrl'], [t])[0]
            tang = 2 * (1 - t) * (g['ctrl'] - g['p1']) + 2 * t * (g['p2'] - g['ctrl'])
            norma = float(np.linalg.norm(tang))
            normal = np.array([-tang[1], tang[0]]) / norma if norma > 1e-9 else np.array([0.0, 1.0])

            for m in multiplos:
                c = q + normal * m * alto
                costo = abs(t - 0.5) * 60 + abs(m) * 25

                # Fuera del área de dibujo
                if c[0] - hw < 0 or c[0] + hw > w or c[1] - hh < 0 or c[1] + hh > h:
                    costo += 400

                # Solape con etiquetas ya colocadas
                if len(colocadas):
                    ox = hw + colocadas[:, 2] + 3 - np.abs(c[0] - colocadas[:, 0])
                    oy = hh + colocadas[:, 3] + 3 - np.abs(c[1] - colocadas[:, 1])
                    solapa = (ox > 0) & (oy > 0)
                    if solapa.any():
                        costo += float(np.sum(300 + 3 * ox[solapa] * oy[solapa]))

                # Solape con los círculos de los nodos
                dxn = np.maximum(np.abs(centros[:, 0] - c[0]) - hw, 0)
                dyn = np.maximum(np.abs(centros[:, 1] - c[1]) - hh, 0)
                dn = np.hypot(dxn, dyn)
                costo += float(np.clip(radio_px + 4 - dn, 0, None).sum()) * 30

                # Tapar otras aristas
                if len(otras):
                    dentro = (np.abs(otras[:, 0] - c[0]) < hw + 2) & (np.abs(otras[:, 1] - c[1]) < hh + 2)
                    costo += 6 * int(dentro.sum())

                if mejor_costo is None or costo < mejor_costo:
                    mejor_costo, mejor_c = costo, c

        colocadas = np.vstack([colocadas, [mejor_c[0], mejor_c[1], hw, hh]])
        resultado[a] = mejor_c

    return resultado


# =====================================================================
#  GEOMETRÍA DE LA LÍNEA DE CORTE (compartida por ambas ventanas)
# =====================================================================
def _distancia_punto_segmento(p, a, b):
    """Distancia del punto p al segmento a-b (todo en píxeles)."""
    ab = b - a
    den = float(np.dot(ab, ab))
    if den < 1e-12:
        return float(np.linalg.norm(p - a))
    t = min(max(float(np.dot(p - a, ab)) / den, 0.0), 1.0)
    return float(np.linalg.norm(p - (a + t * ab)))


def trazar_poligonal_sin_colisiones(ruta, centros, radio_seguro, max_iter=5):
    """
    Recibe una poligonal (lista de puntos en píxeles) y la modifica insertando
    puntos de desvío para que ningún tramo entre en el círculo de seguridad
    (radio_seguro) de alguno de los nodos (centros).
    """
    ruta = [np.asarray(p, dtype=float) for p in ruta]
    if len(centros) == 0 or len(ruta) < 2:
        return np.array(ruta)

    for _ in range(max_iter):
        nueva = [ruta[0]]
        hubo_choque = False
        for a, b in zip(ruta[:-1], ruta[1:]):
            ab = b - a
            largo2 = float(np.dot(ab, ab))
            if largo2 > 1e-9:
                largo = np.sqrt(largo2)
                normal = np.array([-ab[1], ab[0]]) / largo
                choques = []
                for c in centros:
                    if _distancia_punto_segmento(c, a, b) < radio_seguro:
                        t = float(np.dot(c - a, ab)) / largo2
                        choques.append((t, c))
                choques.sort(key=lambda par: par[0])
                for _t, c in choques:
                    # Se rodea el nodo por el lado en el que ya está la poligonal
                    lado = float(np.dot(c - a, normal))
                    signo = -1.0 if lado >= 0 else 1.0
                    nueva.append(c + signo * normal * radio_seguro * 1.35)
                    hubo_choque = True
            nueva.append(b)
        ruta = nueva
        if not hubo_choque:
            break
    return np.array(ruta)


def dibujar_linea_corte(eje, dpi, puntos, cuerdas, posiciones, radio_pt, rotulo=True):
    """
    Dibuja la línea roja discontinua del corte.

    puntos    : lista de (x, y) normalizados (0-1) con el punto medio/etiqueta de
                cada arista cortada.
    cuerdas   : lista de (dx, dy) normalizados con la dirección (origen→destino)
                de cada arista cortada (se usa para orientar la línea si solo
                hay una arista).
    posiciones: lista de (x, y) normalizados con el centro de cada nodo.
    radio_pt  : radio del nodo en puntos tipográficos.

    La línea une los puntos medios de las aristas cortadas (ordenados de arriba
    hacia abajo) y rodea los nodos para no atravesarlos nunca.
    """
    if not puntos:
        return

    caja = eje.get_window_extent()
    w, h = caja.width, caja.height
    escala = np.array([w, h], dtype=float)

    pares = sorted(zip(puntos, cuerdas), key=lambda pc: (-pc[0][1], pc[0][0]))
    pts = [np.array(p, dtype=float) * escala for p, _ in pares]

    ext = 0.06 * h
    if len(pts) == 1:
        # Con una sola arista, la línea cruza la arista de forma perpendicular
        cuerda = np.array(pares[0][1], dtype=float) * escala
        norma = float(np.linalg.norm(cuerda))
        if norma > 1e-9:
            perp = np.array([-cuerda[1], cuerda[0]]) / norma
        else:
            perp = np.array([0.0, 1.0])
        if perp[1] < 0:
            perp = -perp
        sup = pts[0] + perp * ext
        inf = pts[0] - perp * ext
    else:
        sup = pts[0] + np.array([0.0, ext])
        inf = pts[-1] - np.array([0.0, ext])

    sup[1] = min(sup[1], max(pts[0][1], 0.90 * h))
    inf[1] = max(inf[1], min(pts[-1][1], 0.07 * h))
    sup[0] = min(max(sup[0], 0.02 * w), 0.98 * w)
    inf[0] = min(max(inf[0], 0.02 * w), 0.98 * w)

    ruta = [sup] + pts + [inf]
    centros = np.array([np.array(p, dtype=float) * escala for p in posiciones]).reshape(-1, 2)
    radio_px = radio_pt * dpi / 72
    poligonal = trazar_poligonal_sin_colisiones(ruta, centros, radio_px + 8)

    muestras = []
    for a, b in zip(poligonal[:-1], poligonal[1:]):
        n = max(int(np.linalg.norm(b - a) / 4), 2)
        t = np.linspace(0, 1, n, endpoint=False)[:, None]
        muestras.append(a + (b - a) * t)
    muestras.append(poligonal[-1:])
    trayecto = np.vstack(muestras)

    # Seguro final: se corta la línea si aún quedara dentro de algún nodo
    dist = np.linalg.norm(trayecto[:, None, :] - centros[None, :, :], axis=2).min(axis=1)
    trayecto[dist < radio_px + 3] = np.nan

    eje.plot(trayecto[:, 0] / w, trayecto[:, 1] / h, color='#d32f2f',
             linestyle='--', linewidth=2.5, alpha=0.85, zorder=2.5)

    if rotulo:
        x_fin, y_fin = inf / escala
        eje.text(x_fin, max(y_fin - 0.01, 0.06), "LÍNEA DE CORTE (S | T)",
                 ha='center', va='top', fontsize=9, fontweight='bold',
                 color='#b71c1c', zorder=3,
                 bbox=dict(boxstyle='round,pad=0.2', facecolor='#ffebee',
                           edgecolor='#d32f2f'))


# =====================================================================
#  EVALUADOR INTERACTIVO DE CORTES MANUALES (SELECCIÓN DE ARISTAS)
# =====================================================================
class EvaluadorCortesInteractive:
    """
    Flujo de uso:
      1. «Empezar Selección de Aristas»: se activa el modo selección.
      2. Clic sobre una arista (o su etiqueta) para marcarla / desmarcarla.
      3. «Finalizar y Evaluar Corte»: se omiten las aristas marcadas, se hace
         una búsqueda BFS desde la fuente y:
            Lado S = nodos aún alcanzables, Lado T = nodos inalcanzables.
         El corte es válido si el sumidero queda en T.
         c(S,T) = Σ c(u,v) de las aristas dirigidas u∈S → v∈T.
    """

    FS_ETIQUETA = 9

    def __init__(self, num_nodos, matriz_cap, fuentes_set, sumideros_set, posiciones,
                 encabezados, super_fuente=None, super_sumidero=None):
        self.num_nodos = num_nodos
        self.matriz_cap = matriz_cap
        self.fuentes_set = fuentes_set
        self.sumideros_set = sumideros_set
        self.posiciones = posiciones
        self.encabezados = encabezados
        self.super_fuente = super_fuente
        self.super_sumidero = super_sumidero

        # Fuente y sumidero efectivos de la red de trabajo
        self.fuente = super_fuente if super_fuente is not None else min(fuentes_set)
        self.sumidero = super_sumidero if super_sumidero is not None else min(sumideros_set)

        # Estado de la selección y de la evaluación
        self.modo_seleccion = False
        self.aristas_seleccionadas = set()
        self.evaluado = False
        self.conjunto_s = set()
        self.conjunto_t = set()
        self.aristas_corte = []
        self.aristas_sin_efecto = []
        self.es_corte_valido = False
        self.camino_restante = []

        self.figura = plt.figure(figsize=(14, 9))
        self.eje = self.figura.add_axes([0.02, 0.13, 0.96, 0.66])
        self.eje_info = self.figura.add_axes([0.02, 0.80, 0.96, 0.19])
        self.txt_ayuda = self.figura.text(0.02, 0.098, '', fontsize=9, color='#555555',
                                          fontstyle='italic', ha='left', va='center')

        eje_btn_sel = self.figura.add_axes([0.22, 0.03, 0.34, 0.05])
        eje_btn_reset = self.figura.add_axes([0.58, 0.03, 0.20, 0.05])
        self.btn_sel = Button(eje_btn_sel, 'Empezar Selección de Aristas',
                              color='#bbdefb', hovercolor='#90caf9')
        self.btn_reset = Button(eje_btn_reset, '↺ Reiniciar Selección',
                                color='lightgray', hovercolor='0.85')
        self.btn_sel.on_clicked(self.alternar_seleccion)
        self.btn_reset.on_clicked(self.reiniciar)

        self._cache_curvas = {}
        max_m = max(Counter(round(x, 4) for x, _ in posiciones.values()).values())
        if max_m <= 4:
            self.tam_nodo, self.fs_nodo = 1900, 12
        elif max_m <= 6:
            self.tam_nodo, self.fs_nodo = 1500, 11
        elif max_m <= 8:
            self.tam_nodo, self.fs_nodo = 1100, 10
        else:
            self.tam_nodo, self.fs_nodo = 800, 9

        xs = sorted({x for x, _, _ in encabezados})
        self.ancho_banda = 0.42 * (xs[1] - xs[0]) if len(xs) > 1 else 0.1

        self.figura.canvas.mpl_connect('button_press_event', self.al_hacer_clic)
        self.renderizar()

    # -----------------------------------------------------------------
    #  Utilidades
    # -----------------------------------------------------------------
    def nom(self, u):
        return nombre_nodo(u, self.super_fuente, self.super_sumidero)

    @staticmethod
    def _cap_a_texto(c):
        return "∞" if c >= 99999 else str(int(c))

    @staticmethod
    def _ajustar(texto, ancho=150):
        return "\n".join(textwrap.fill(linea, ancho) for linea in texto.split("\n"))

    def _texto_aristas(self, aristas):
        if not aristas:
            return "ninguna"
        return ", ".join(f"{self.nom(u)}→{self.nom(v)}" for u, v in aristas)

    # -----------------------------------------------------------------
    #  Curvas de las aristas y posición de sus etiquetas (sin solapes)
    # -----------------------------------------------------------------
    def _calcular_curvas(self):
        caja = self.eje.get_window_extent()
        w, h = caja.width, caja.height
        clave = (round(w), round(h))
        if clave in self._cache_curvas:
            return self._cache_curvas[clave]

        radio_px = np.sqrt(self.tam_nodo) / 2 * self.figura.dpi / 72
        geometria = calcular_geometria_aristas(
            self.num_nodos, self.matriz_cap, self.posiciones, w, h, radio_px)
        dims = {(u, v): estimar_caja_texto(self._cap_a_texto(self.matriz_cap[u][v]),
                                           self.FS_ETIQUETA, self.figura.dpi)
                for (u, v) in geometria}
        pos_etq = colocar_etiquetas(geometria, self.posiciones, w, h, radio_px, dims)

        escala = np.array([w, h], dtype=float)
        curvas = {}
        for arista, g in geometria.items():
            lx, ly = pos_etq[arista]
            curvas[arista] = (g['rad'], (lx / w, ly / h), g['poli'] / escala)

        self._cache_curvas[clave] = curvas
        return curvas

    # -----------------------------------------------------------------
    #  Interacción: botones
    # -----------------------------------------------------------------
    def _actualizar_boton(self):
        if self.modo_seleccion:
            texto, color, hover = 'Finalizar y Evaluar Corte', '#ffcc80', '#ffb74d'
        else:
            texto, color, hover = 'Empezar Selección de Aristas', '#bbdefb', '#90caf9'
        self.btn_sel.label.set_text(texto)
        self.btn_sel.color = color
        self.btn_sel.hovercolor = hover
        self.btn_sel.ax.set_facecolor(color)

    def alternar_seleccion(self, evento=None):
        if not self.modo_seleccion:
            # Inicio de la selección: se descarta el resultado anterior
            self.modo_seleccion = True
            self.evaluado = False
        else:
            # Fin de la selección: se evalúa el corte
            self.modo_seleccion = False
            self.evaluar_corte()
        self._actualizar_boton()
        self.renderizar()

    def reiniciar(self, evento=None):
        self.aristas_seleccionadas.clear()
        self.modo_seleccion = False
        self.evaluado = False
        self.conjunto_s = set()
        self.conjunto_t = set()
        self.aristas_corte = []
        self.aristas_sin_efecto = []
        self.es_corte_valido = False
        self.camino_restante = []
        self._actualizar_boton()
        self.renderizar()

    # -----------------------------------------------------------------
    #  Interacción: clic sobre aristas
    # -----------------------------------------------------------------
    def _arista_en_posicion(self, x_pix, y_pix):
        caja = self.eje.get_window_extent()
        w, h = caja.width, caja.height
        escala = np.array([w, h], dtype=float)
        click = np.array([x_pix - caja.x0, y_pix - caja.y0], dtype=float)

        # Un clic dentro de un nodo no selecciona ninguna arista
        radio_px = np.sqrt(self.tam_nodo) / 2 * self.figura.dpi / 72
        for pos in self.posiciones.values():
            if np.linalg.norm(click - np.array(pos) * escala) <= radio_px:
                return None

        curvas = self._calcular_curvas()
        mejor, mejor_d = None, 12.0
        for arista, (_rad, etiqueta, poli) in curvas.items():
            pts = poli * escala
            a, b = pts[:-1], pts[1:]
            ab = b - a
            den = np.maximum((ab ** 2).sum(axis=1), 1e-9)
            t = np.clip(((click - a) * ab).sum(axis=1) / den, 0.0, 1.0)
            q = a + t[:, None] * ab
            d = float(np.linalg.norm(click - q, axis=1).min())
            # Clic sobre la etiqueta (caja de capacidad) también cuenta
            d_etq = max(float(np.linalg.norm(click - np.array(etiqueta) * escala)) - 12.0, 0.0)
            d = min(d, d_etq)
            if d < mejor_d:
                mejor, mejor_d = arista, d
        return mejor

    def al_hacer_clic(self, evento):
        if not self.modo_seleccion:
            return
        if evento.inaxes != self.eje or evento.x is None or evento.y is None:
            return
        if evento.button != 1:
            return
        barra = getattr(self.figura.canvas, 'toolbar', None)
        if barra is not None and getattr(barra, 'mode', None):
            return  # zoom / pan activos

        arista = self._arista_en_posicion(evento.x, evento.y)
        if arista is None:
            return
        if arista in self.aristas_seleccionadas:
            self.aristas_seleccionadas.remove(arista)
        else:
            self.aristas_seleccionadas.add(arista)
        self.renderizar()

    # -----------------------------------------------------------------
    #  Evaluación del corte
    # -----------------------------------------------------------------
    def _alcanzables_sin_aristas(self, aristas_omitidas):
        """BFS dirigido desde la fuente omitiendo las aristas indicadas."""
        visitados = {self.fuente}
        padre = {self.fuente: None}
        cola = [self.fuente]
        while cola:
            u = cola.pop(0)
            for v in range(self.num_nodos):
                if v in visitados:
                    continue
                if self.matriz_cap[u][v] > 0 and (u, v) not in aristas_omitidas:
                    visitados.add(v)
                    padre[v] = u
                    cola.append(v)
        return visitados, padre

    def evaluar_corte(self):
        visitados, padre = self._alcanzables_sin_aristas(self.aristas_seleccionadas)
        self.conjunto_s = visitados
        self.conjunto_t = set(range(self.num_nodos)) - visitados

        # Solo cuentan las aristas dirigidas que van de S hacia T
        self.aristas_corte = sorted(
            (u, v) for u in self.conjunto_s for v in self.conjunto_t
            if self.matriz_cap[u][v] > 0
        )
        self.aristas_sin_efecto = sorted(self.aristas_seleccionadas - set(self.aristas_corte))

        self.es_corte_valido = self.sumidero in self.conjunto_t
        self.camino_restante = []
        if not self.es_corte_valido:
            nodo = self.sumidero
            ruta = [nodo]
            while padre[nodo] is not None:
                nodo = padre[nodo]
                ruta.append(nodo)
            self.camino_restante = ruta[::-1]
        self.evaluado = True

    # -----------------------------------------------------------------
    #  Estilo de nodos
    # -----------------------------------------------------------------
    def _estilo_nodo_base(self, u):
        texto = 'black'
        if u == self.super_fuente:
            relleno, texto = C_SUPER_FUENTE, 'white'
        elif u == self.super_sumidero:
            relleno, texto = C_SUPER_SUMIDERO, 'white'
        elif u in self.fuentes_set:
            relleno = C_FUENTE
        elif u in self.sumideros_set:
            relleno = C_SUMIDERO
        else:
            relleno = C_INTERMEDIO
        return relleno, B_NORMAL, 1.5, texto

    # -----------------------------------------------------------------
    #  Dibujo
    # -----------------------------------------------------------------
    def renderizar(self):
        self.eje.clear()
        self.eje_info.clear()

        conjunto_aristas_corte = set(self.aristas_corte) if self.evaluado else set()

        # Columnas de fondo
        for x, titulo, tipo_col in self.encabezados:
            if tipo_col in BANDAS:
                self.eje.axvspan(x - self.ancho_banda, x + self.ancho_banda, ymin=0.03, ymax=0.91,
                                 color=BANDAS[tipo_col], zorder=0, lw=0)
            self.eje.text(x, 0.955, titulo, ha='center', va='center', fontsize=9,
                          fontweight='bold', color='#455a64', zorder=1)

        curvas = self._calcular_curvas()
        radio_pt = np.sqrt(self.tam_nodo) / 2

        # Aristas
        for u in range(self.num_nodos):
            for v in range(self.num_nodos):
                cap = self.matriz_cap[u][v]
                if cap <= 0:
                    continue
                x1, y1 = self.posiciones[u]
                x2, y2 = self.posiciones[v]
                rad, (lx, ly), _poli = curvas[(u, v)]
                conexion = f"arc3,rad={rad}"

                seleccionada = (u, v) in self.aristas_seleccionadas
                cruza = (u, v) in conjunto_aristas_corte
                halo = False

                if seleccionada and (not self.evaluado or cruza):
                    color, ancho, estilo, halo = A_CORTE, 4.5, '-', True
                    color_texto = '#b71c1c'
                elif seleccionada:
                    # Marcada, pero no cruza de S a T: no suma a c(S,T)
                    color, ancho, estilo = A_CAMINO_DIRECTO, 3.2, '--'
                    color_texto = '#e65100'
                else:
                    color = A_SIN_FLUJO
                    ancho = 2.2 if self.modo_seleccion else 1.8
                    estilo = '-'
                    color_texto = '#263238'

                if halo:
                    self.eje.annotate(
                        '', xy=(x2, y2), xytext=(x1, y1),
                        arrowprops=dict(
                            arrowstyle='-', color='#ffcdd2', lw=ancho + 7, alpha=0.9,
                            shrinkA=radio_pt + 2, shrinkB=radio_pt + 3,
                            connectionstyle=conexion
                        ),
                        zorder=1.5
                    )

                self.eje.annotate(
                    '', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(
                        arrowstyle="-|>", color=color, lw=ancho, linestyle=estilo,
                        mutation_scale=18, shrinkA=radio_pt + 2, shrinkB=radio_pt + 3,
                        connectionstyle=conexion
                    ),
                    zorder=2
                )

                self.eje.text(
                    lx, ly, self._cap_a_texto(cap), fontsize=self.FS_ETIQUETA, color=color_texto,
                    fontweight='bold', ha='center', va='center', zorder=3,
                    bbox=dict(boxstyle="round,pad=0.2", fc='white', ec=color,
                              lw=1.8 if seleccionada else 1.2, alpha=0.95)
                )

        # Nodos
        for u in range(self.num_nodos):
            x, y = self.posiciones[u]
            if self.evaluado:
                en_s = u in self.conjunto_s
                relleno = C_LADO_S if en_s else C_INTERMEDIO
                borde = B_LADO_S if en_s else B_LADO_T
                grosor = 3.0 if en_s else 1.5
                color_texto = 'black'
                if u == self.sumidero and en_s:
                    borde, grosor = A_CORTE, 4.0   # el sumidero sigue alcanzable
            else:
                en_s = None
                relleno, borde, grosor, color_texto = self._estilo_nodo_base(u)

            self.eje.scatter(x, y, s=self.tam_nodo, c=relleno, edgecolors=borde,
                             linewidths=grosor, zorder=4)
            self.eje.text(x, y, self.nom(u), fontsize=self.fs_nodo,
                          fontweight='bold', color=color_texto, ha='center', va='center', zorder=5)

            if self.evaluado:
                lado_txt = "S" if en_s else "T"
                self.eje.annotate(
                    f"[{lado_txt}]", xy=(x, y), xytext=(0, -(radio_pt + 8)),
                    textcoords='offset points', ha='center', va='center', fontsize=8,
                    color='#1565c0' if en_s else '#546e7a', zorder=5,
                    bbox=dict(boxstyle="round,pad=0.15",
                              fc='#e3f2fd' if en_s else '#f5f5f5', ec=borde, lw=0.8)
                )

        self.eje.set_xlim(0, 1)
        self.eje.set_ylim(0, 1)
        self.eje.axis('off')

        # Línea discontinua que pasa por las aristas cortadas sin tocar los nodos
        if self.evaluado and self.aristas_corte:
            puntos = [curvas[a][1] for a in self.aristas_corte]
            cuerdas = [(self.posiciones[v][0] - self.posiciones[u][0],
                        self.posiciones[v][1] - self.posiciones[u][1])
                       for u, v in self.aristas_corte]
            dibujar_linea_corte(self.eje, self.figura.dpi, puntos, cuerdas,
                                list(self.posiciones.values()), radio_pt)

        self._dibujar_panel()
        self.figura.canvas.draw_idle()

    def _dibujar_panel(self):
        self.eje_info.axis('off')
        tr = self.eje_info.transAxes

        if not self.evaluado:
            if self.modo_seleccion:
                badge, col_badge = "MODO SELECCIÓN ACTIVO", "#1565c0"
                ayuda = ("Haz clic sobre una arista (o sobre su capacidad) para marcarla o desmarcarla. "
                         "Al terminar, pulsa «Finalizar y Evaluar Corte».")
            else:
                badge, col_badge = "SELECCIÓN INACTIVA", "#546e7a"
                ayuda = ("Pulsa «Empezar Selección de Aristas» para elegir las aristas que quieres cortar.")

            sel = sorted(self.aristas_seleccionadas)
            self.eje_info.text(0.0, 0.98, f" {badge} ", transform=tr, fontsize=10, color='white',
                               fontweight='bold', va='top',
                               bbox=dict(boxstyle='round,pad=0.3', fc=col_badge, ec='none'))
            self.eje_info.text(0.0, 0.70, f"Aristas marcadas para el corte: {len(sel)}",
                               transform=tr, fontsize=11, fontweight='bold', color='#1a237e', va='top')
            self.eje_info.text(0.0, 0.50, self._ajustar(self._texto_aristas(sel)),
                               transform=tr, fontsize=10, color='#263238', va='top', linespacing=1.3)
            self.txt_ayuda.set_text(ayuda)
            return

        # ---- Resultado de la evaluación ----
        if self.es_corte_valido:
            badge = "CORTE VÁLIDO (el sumidero ya no es alcanzable desde la fuente)"
            col_badge = "#2e7d32"
        else:
            badge = "CORTE INVÁLIDO (el sumidero sigue alcanzable desde la fuente)"
            col_badge = "#c62828"

        self.eje_info.text(0.0, 0.98, f" {badge} ", transform=tr, fontsize=10, color='white',
                           fontweight='bold', va='top',
                           bbox=dict(boxstyle='round,pad=0.3', fc=col_badge, ec='none'))

        str_s = ", ".join(self.nom(u) for u in sorted(self.conjunto_s))
        str_t = ", ".join(self.nom(u) for u in sorted(self.conjunto_t))
        self.eje_info.text(0.0, 0.72, self._ajustar(f"Lado S = {{{str_s}}}    |    Lado T = {{{str_t}}}"),
                           transform=tr, fontsize=11, fontweight='bold', color='#1a237e', va='top')

        if self.aristas_corte:
            capacidades = [self.matriz_cap[u][v] for u, v in self.aristas_corte]
            infinita = any(c >= 99999 for c in capacidades)
            total_txt = "∞" if infinita else str(int(sum(int(c) for c in capacidades)))
            detalle = ""
            if 1 < len(capacidades) <= 8:
                detalle = " + ".join(self._cap_a_texto(c) for c in capacidades) + " = "
            txt_cap = (f"Aristas dirigidas de S→T: {self._texto_aristas(self.aristas_corte)}\n"
                       f"Capacidad del corte c(S,T) = Σ c(u,v) = {detalle}{total_txt}")
        else:
            txt_cap = ("No hay aristas dirigidas que crucen de S hacia T.\n"
                       "Capacidad del corte c(S,T) = 0")
        txt_cap = self._ajustar(txt_cap)
        self.eje_info.text(0.0, 0.54, txt_cap, transform=tr, fontsize=10,
                           color='#263238', va='top', linespacing=1.3)

        notas = []
        if not self.es_corte_valido and self.camino_restante:
            notas.append("Camino que sigue activo: " +
                         " → ".join(self.nom(u) for u in self.camino_restante))
        if self.aristas_sin_efecto:
            notas.append("Marcadas que no cruzan de S a T (no suman a c(S,T)): " +
                         self._texto_aristas(self.aristas_sin_efecto))
        if notas:
            n_lineas = txt_cap.count("\n") + 1
            y_nota = max(0.54 - n_lineas * 0.112 - 0.02, 0.14)
            self.eje_info.text(0.0, y_nota, self._ajustar("\n".join(notas)), transform=tr,
                               fontsize=9, color='#bf360c', va='top', linespacing=1.3)

        self.txt_ayuda.set_text("Pulsa «Empezar Selección de Aristas» para modificar la selección "
                                "o «Reiniciar Selección» para empezar de cero.")


# =====================================================================
#  VISUALIZADOR PRINCIPAL FORD-FULKERSON
# =====================================================================
class VisualizadorFordFulkerson:
    FS_ETIQUETA = 8

    def __init__(self, num_nodos, matriz_cap, fuentes_set, sumideros_set, pasos, posiciones,
                 encabezados, super_fuente=None, super_sumidero=None):
        self.num_nodos = num_nodos
        self.matriz_cap = matriz_cap
        self.fuentes_set = fuentes_set
        self.sumideros_set = sumideros_set
        self.pasos = pasos
        self.posiciones = posiciones
        self.encabezados = encabezados
        self.super_fuente = super_fuente
        self.super_sumidero = super_sumidero
        self.indice_paso = 0
        self._cache_geo = {}
        self._cache_curvas = {}
        self.evaluadores = []   # referencias para que las ventanas de cortes sigan activas

        max_m = max(Counter(round(x, 4) for x, _ in posiciones.values()).values())
        if max_m <= 4:
            self.tam_nodo, self.fs_nodo = 1900, 12
        elif max_m <= 6:
            self.tam_nodo, self.fs_nodo = 1500, 11
        elif max_m <= 8:
            self.tam_nodo, self.fs_nodo = 1100, 10
        else:
            self.tam_nodo, self.fs_nodo = 800, 9
        self.fs_tag = max(6.5, self.fs_nodo - 3.5)

        xs = sorted({x for x, _, _ in encabezados})
        self.ancho_banda = 0.42 * (xs[1] - xs[0]) if len(xs) > 1 else 0.1

        self.figura = plt.figure(figsize=(14, 9))
        self.eje = self.figura.add_axes([0.02, 0.13, 0.96, 0.66])
        self.eje_info = self.figura.add_axes([0.02, 0.80, 0.96, 0.19])

        eje_btn_prev = self.figura.add_axes([0.18, 0.03, 0.16, 0.05])
        eje_btn_sig = self.figura.add_axes([0.36, 0.03, 0.16, 0.05])
        eje_btn_corte = self.figura.add_axes([0.54, 0.03, 0.28, 0.05])

        self.btn_prev = Button(eje_btn_prev, '← Anterior', color='lightgray', hovercolor='0.85')
        self.btn_sig = Button(eje_btn_sig, 'Siguiente →', color='lightgray', hovercolor='0.85')
        self.btn_corte = Button(eje_btn_corte, '✂ Probar Cortes Manuales', color='#bbdefb', hovercolor='#90caf9')

        self.btn_prev.on_clicked(self.paso_anterior)
        self.btn_sig.on_clicked(self.paso_siguiente)
        self.btn_corte.on_clicked(self.abrir_evaluador_cortes)
        self.figura.canvas.mpl_connect('key_press_event', self.tecla)

        self.dibujar_paso_actual()

    def abrir_evaluador_cortes(self, evento=None):
        evaluador = EvaluadorCortesInteractive(
            self.num_nodos, self.matriz_cap, self.fuentes_set, self.sumideros_set,
            self.posiciones, self.encabezados, self.super_fuente, self.super_sumidero
        )
        # Se guarda la referencia: si no, Python podría liberar el evaluador
        # y sus botones/clics de esa ventana dejarían de responder.
        self.evaluadores.append(evaluador)
        plt.show()

    def obtener_nombre_nodo(self, u):
        return nombre_nodo(u, self.super_fuente, self.super_sumidero)

    @staticmethod
    def _ajustar(texto, ancho=62):
        return "\n".join(textwrap.fill(linea, ancho) for linea in texto.split("\n"))

    def _calcular_curvas(self, textos):
        """
        Curvas de las aristas (geometría fija, en caché por tamaño de ventana) y
        posición de las etiquetas, recalculada según el texto real de cada paso
        para que ninguna etiqueta se superponga con otra.
        """
        caja = self.eje.get_window_extent()
        w, h = caja.width, caja.height
        clave_geo = (round(w), round(h))
        radio_px = np.sqrt(self.tam_nodo) / 2 * self.figura.dpi / 72

        if clave_geo not in self._cache_geo:
            self._cache_geo[clave_geo] = calcular_geometria_aristas(
                self.num_nodos, self.matriz_cap, self.posiciones, w, h, radio_px)
        geometria = self._cache_geo[clave_geo]

        clave = (clave_geo, tuple(sorted(textos.items())))
        if clave in self._cache_curvas:
            return self._cache_curvas[clave]

        dims = {a: estimar_caja_texto(textos[a], self.FS_ETIQUETA, self.figura.dpi)
                for a in geometria}
        pos_etq = colocar_etiquetas(geometria, self.posiciones, w, h, radio_px, dims)

        escala = np.array([w, h], dtype=float)
        curvas = {}
        for arista, g in geometria.items():
            lx, ly = pos_etq[arista]
            curvas[arista] = (g['rad'], (lx / w, ly / h), g['poli'] / escala)

        self._cache_curvas[clave] = curvas
        return curvas

    def estilo_arista(self, u, v, paso, aristas_camino, aristas_corte):
        tipo = paso['tipo']
        flujo = paso['flujo'][u][v]
        cap = self.matriz_cap[u][v]

        if tipo == 'camino_encontrado' and (u, v) in aristas_camino:
            if aristas_camino[(u, v)] == '+':
                return A_CAMINO_DIRECTO, 4.5, '-'
            return A_CAMINO_INVERSO, 4.5, '--'
        if tipo == 'flujo_actualizado' and (u, v) in aristas_camino:
            return A_ACTUALIZADA, 4.5, '-'
        if tipo == 'corte_minimo' and (u, v) in aristas_corte:
            return A_CORTE, 4.5, '-'
        if tipo == 'sin_mas_caminos' and (u, v) in aristas_corte:
            return A_FRONTERA, 3.0, '--'

        if flujo == 0:
            return A_SIN_FLUJO, 1.6, '-'
        if flujo >= cap:
            return A_SATURADA, 3.2, '-'
        return A_PARCIAL, 2.6, '-'

    def estilo_nodo(self, u, paso):
        tipo = paso['tipo']
        etiquetas = paso.get('etiquetas', {})
        nodos_camino = paso.get('nodos_camino', set())
        en_camino = tipo in ('camino_encontrado', 'flujo_actualizado') and u in nodos_camino

        texto = 'black'
        if u == self.super_fuente:
            relleno, texto = C_SUPER_FUENTE, 'white'
        elif u == self.super_sumidero:
            relleno, texto = C_SUPER_SUMIDERO, 'white'
        elif u in self.fuentes_set:
            relleno = C_FUENTE
        elif u in self.sumideros_set:
            relleno = C_SUMIDERO
        elif en_camino:
            relleno = C_EN_CAMINO
        elif tipo in ('camino_encontrado', 'sin_mas_caminos') and u in etiquetas:
            relleno = C_ETIQUETADO
        else:
            relleno = C_INTERMEDIO

        borde, grosor = B_NORMAL, 1.5
        if tipo == 'flujo_actualizado':
            if u in nodos_camino:
                borde, grosor = B_ACTUALIZADO, 3.5
        elif tipo != 'corte_minimo':
            if tipo == 'camino_encontrado' and u in nodos_camino:
                borde, grosor = B_CAMINO, 3.5
            elif u in etiquetas:
                borde, grosor = B_ETIQUETADO, 2.8

        return relleno, borde, grosor, texto

    def estilo_tag(self, u, etiquetas):
        if u not in etiquetas:
            return "[ ]", T_VACIA, '#78909c'
        p, signo, delta = etiquetas[u]
        if p == '-':
            return "[-, ∞]", T_FUENTE, 'black'
        delta_str = "∞" if delta >= 99999 else str(delta)
        texto = f"[{self.obtener_nombre_nodo(p)}{signo}, {delta_str}]"
        return texto, (T_MAS if signo == '+' else T_MENOS), 'black'

    def _crear_leyenda(self):
        h = [
            Line2D([0], [0], linestyle='None', marker='o', markersize=10,
                   fillstyle='left', markerfacecolor=C_FUENTE,
                   markerfacecoloralt=C_SUMIDERO, markeredgecolor=B_NORMAL,
                   label='Fuente / Sumidero'),
            Line2D([0], [0], color=A_CAMINO_DIRECTO, lw=3,
                   label='Camino aumentante: directa (+)'),
            Line2D([0], [0], color=A_CAMINO_INVERSO, lw=3, linestyle='--',
                   label='Camino aumentante: inversa (−)'),
            Line2D([0], [0], color=A_SATURADA, lw=3,
                   label='Arista saturada (f = c)'),
            Line2D([0], [0], color=A_CORTE, lw=3,
                   label='Corte mínimo (S→T)'),
            Patch(facecolor=T_MAS, edgecolor='#90a4ae',
                  label='Etiqueta de nodo [p±, Δ]'),
        ]
        self.eje_info.legend(handles=h, loc='center right', ncol=2, fontsize=8.5,
                             frameon=True, title='Leyenda', title_fontsize=9,
                             handlelength=2.0, columnspacing=1.5, labelspacing=0.5)

    def _dibujar_linea_corte(self, aristas_corte, curvas, radio_pt):
        aristas = list(aristas_corte)
        puntos = [curvas[(u, v)][1] for (u, v) in aristas]
        cuerdas = [(self.posiciones[v][0] - self.posiciones[u][0],
                    self.posiciones[v][1] - self.posiciones[u][1]) for (u, v) in aristas]
        dibujar_linea_corte(self.eje, self.figura.dpi, puntos, cuerdas,
                            list(self.posiciones.values()), radio_pt)

    def dibujar_paso_actual(self):
        self.eje.clear()
        self.eje_info.clear()
        paso = self.pasos[self.indice_paso]
        tipo = paso['tipo']
        matriz_f = paso['flujo']
        matriz_c = self.matriz_cap
        aristas_camino = {(u, v): s for u, v, s in paso.get('aristas_camino', [])}
        aristas_corte = set(paso.get('aristas_corte', []))
        etiquetas = paso.get('etiquetas', {})
        delta = paso.get('cuello_botella', 0)

        # Texto de cada etiqueta de arista en este paso (se usa para calcular
        # su tamaño y evitar solapamientos entre etiquetas)
        textos = {}
        for u in range(self.num_nodos):
            for v in range(self.num_nodos):
                if matriz_c[u][v] <= 0:
                    continue
                cap_str = "∞" if matriz_c[u][v] >= 99999 else str(matriz_c[u][v])
                texto = f"({cap_str}, {matriz_f[u][v]})"
                if tipo == 'camino_encontrado' and (u, v) in aristas_camino:
                    signo = '+' if aristas_camino[(u, v)] == '+' else '−'
                    texto += f" ({signo}{delta})"
                textos[(u, v)] = texto

        curvas = self._calcular_curvas(textos)
        radio_pt = np.sqrt(self.tam_nodo) / 2

        for x, titulo, tipo_col in self.encabezados:
            if tipo_col in BANDAS:
                self.eje.axvspan(x - self.ancho_banda, x + self.ancho_banda, ymin=0.03, ymax=0.91,
                                 color=BANDAS[tipo_col], zorder=0, lw=0)
            self.eje.text(x, 0.955, titulo, ha='center', va='center', fontsize=9,
                          fontweight='bold', color='#455a64', zorder=1)

        for u in range(self.num_nodos):
            for v in range(self.num_nodos):
                if matriz_c[u][v] <= 0:
                    continue
                x1, y1 = self.posiciones[u]
                x2, y2 = self.posiciones[v]
                color, ancho, estilo = self.estilo_arista(u, v, paso, aristas_camino, aristas_corte)
                rad, (lx, ly), _poli = curvas[(u, v)]
                conexion = f"arc3,rad={rad}"

                if tipo == 'corte_minimo' and (u, v) in aristas_corte:
                    self.eje.annotate(
                        '', xy=(x2, y2), xytext=(x1, y1),
                        arrowprops=dict(
                            arrowstyle='-', color='#ffcdd2', lw=ancho + 7, alpha=0.9,
                            shrinkA=radio_pt + 2, shrinkB=radio_pt + 3,
                            connectionstyle=conexion
                        ),
                        zorder=1.5
                    )

                self.eje.annotate(
                    '', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(
                        arrowstyle="-|>", color=color, lw=ancho, linestyle=estilo,
                        mutation_scale=18, shrinkA=radio_pt + 2, shrinkB=radio_pt + 3,
                        connectionstyle=conexion
                    ),
                    zorder=2
                )

                self.eje.text(
                    lx, ly, textos[(u, v)], fontsize=self.FS_ETIQUETA, color='#263238',
                    fontweight='bold', ha='center', va='center', zorder=3,
                    bbox=dict(boxstyle="round,pad=0.2", fc='white', ec=color, lw=1.3, alpha=0.95)
                )

        for u in range(self.num_nodos):
            x, y = self.posiciones[u]
            relleno, borde, grosor, color_texto = self.estilo_nodo(u, paso)
            self.eje.scatter(x, y, s=self.tam_nodo, c=relleno, edgecolors=borde,
                             linewidths=grosor, zorder=4)
            self.eje.text(x, y, self.obtener_nombre_nodo(u), fontsize=self.fs_nodo,
                          fontweight='bold', color=color_texto, ha='center', va='center', zorder=5)

            texto_tag, fondo_tag, color_tag = self.estilo_tag(u, etiquetas)
            self.eje.annotate(
                texto_tag, xy=(x, y), xytext=(0, -(radio_pt + 9)), textcoords='offset points',
                ha='center', va='center', fontsize=self.fs_tag, color=color_tag, zorder=5,
                bbox=dict(boxstyle="round,pad=0.2", fc=fondo_tag, ec='#90a4ae', lw=0.8)
            )

        self.eje.set_xlim(0, 1)
        self.eje.set_ylim(0, 1)
        self.eje.axis('off')

        if tipo == 'corte_minimo' and aristas_corte:
            self._dibujar_linea_corte(aristas_corte, curvas, radio_pt)

        texto_insignia, color_insignia = INSIGNIAS[tipo]
        self.eje_info.axis('off')
        self.eje_info.text(0.0, 0.98, f" {texto_insignia} ", transform=self.eje_info.transAxes,
                           fontsize=10, color='white', fontweight='bold', va='top',
                           bbox=dict(boxstyle='round,pad=0.3', fc=color_insignia, ec='none'))
        self.eje_info.text(0.0, 0.76, f"Etapa {self.indice_paso + 1} de {len(self.pasos)}   —   "
                                      f"Flujo acumulado: {paso['flujo_total']}",
                           transform=self.eje_info.transAxes, fontsize=13, fontweight='bold', va='top')
        self.eje_info.text(0.0, 0.54, self._ajustar(paso['descripcion']),
                           transform=self.eje_info.transAxes, fontsize=10, va='top',
                           color='#263238', linespacing=1.4)
        self._crear_leyenda()

        self.figura.canvas.draw_idle()

    def paso_siguiente(self, evento=None):
        if self.indice_paso < len(self.pasos) - 1:
            self.indice_paso += 1
            self.dibujar_paso_actual()

    def paso_anterior(self, evento=None):
        if self.indice_paso > 0:
            self.indice_paso -= 1
            self.dibujar_paso_actual()

    def tecla(self, evento):
        if evento.key in ('right', 'n'):
            self.paso_siguiente()
        elif evento.key in ('left', 'p'):
            self.paso_anterior()


# =====================================================================
#  PROGRAMA PRINCIPAL
# =====================================================================
def pedir_nodos(mensaje, n, nombre, excluir=()):
    while True:
        texto = input(mensaje)
        try:
            lista = sorted({int(x.strip()) for x in texto.split(',') if x.strip()})
        except ValueError:
            print("Entrada inválida. Ingrese números enteros válidos separados por comas.")
            continue
        if not lista:
            print(f"Error: Debe ingresar al menos un nodo {nombre}.")
            continue
        if any(x < 0 or x >= n for x in lista):
            print(f"Error: Todos los nodos {nombre} deben estar en el rango [0, {n - 1}].")
            continue
        if any(x in excluir for x in lista):
            print("Error: Un nodo no puede ser fuente y sumidero simultáneamente.")
            continue
        return lista


def preparar_red(matriz_capacidades, lista_fuentes, lista_sumideros):
    n_trabajo = len(matriz_capacidades)
    capacidades = np.copy(matriz_capacidades)
    super_fuente = None
    super_sumidero = None

    if len(lista_fuentes) > 1:
        super_fuente = n_trabajo
        n_trabajo += 1
        capacidades = np.pad(capacidades, ((0, 1), (0, 1)), mode='constant')
        for f in lista_fuentes:
            capacidades[super_fuente][f] = INFINITO
        fuente_final = super_fuente
    else:
        fuente_final = lista_fuentes[0]

    if len(lista_sumideros) > 1:
        super_sumidero = n_trabajo
        n_trabajo += 1
        capacidades = np.pad(capacidades, ((0, 1), (0, 1)), mode='constant')
        for s in lista_sumideros:
            capacidades[s][super_sumidero] = INFINITO
        sumidero_final = super_sumidero
    else:
        sumidero_final = lista_sumideros[0]

    return n_trabajo, capacidades, fuente_final, sumidero_final, super_fuente, super_sumidero


def construir_visualizador(matriz_capacidades, lista_fuentes, lista_sumideros):
    (n_trabajo, capacidades, fuente_final, sumidero_final,
     super_fuente, super_sumidero) = preparar_red(matriz_capacidades, lista_fuentes, lista_sumideros)

    posiciones, encabezados = calcular_posiciones_nodos(
        n_trabajo, capacidades, lista_fuentes, lista_sumideros, super_fuente, super_sumidero
    )
    pasos = generar_pasos_ford_fulkerson(
        n_trabajo, capacidades, fuente_final, sumidero_final, super_fuente, super_sumidero
    )
    return VisualizadorFordFulkerson(
        n_trabajo, capacidades, set(lista_fuentes), set(lista_sumideros),
        pasos, posiciones, encabezados, super_fuente, super_sumidero
    )


def iniciar_programa():
    print("=========================================================")
    print(" SIMULADOR INTERACTIVO ALGORITMO FORD-FULKERSON (DAG) ")
    print("=========================================================")

    while True:
        try:
            n = int(input("\nIngrese el número de nodos n ∈ [7, 16]: "))
            if 7 <= n <= 16:
                break
            print("El valor debe estar dentro del rango cerrado [7, 16].")
        except ValueError:
            print("Entrada no válida. Ingrese un número entero.")

    print("\n--- SELECCIÓN DE FUENTES Y SUMIDEROS ---")
    print(f"Rango de nodos válidos para el grafo original: [0, {n - 1}]")
    lista_fuentes = pedir_nodos(
        "Ingrese los nodos fuente (separados por coma, ej: 0 o 0,1): ", n, "fuente")
    lista_sumideros = pedir_nodos(
        f"Ingrese los nodos sumidero (separados por coma, ej: {n - 1} o {n - 2},{n - 1}): ",
        n, "sumidero", excluir=lista_fuentes)

    print("\nModos de generación del grafo:")
    print("1. Generación Aleatoria (DAG por capas, garantizado acíclico)")
    print("2. Creación Manual con Validación en Tiempo Real")

    while True:
        opcion = input("Seleccione una opción (1 o 2): ").strip()
        if opcion in ['1', '2']:
            break
        print("Opción no válida. Ingrese 1 o 2.")

    if opcion == '1':
        matriz_capacidades = generar_grafo_aleatorio(n, lista_fuentes, lista_sumideros)
        print("\nGrafo aleatorio generado correctamente.")
    else:
        matriz_capacidades = ingresar_grafo_manual(n)
        advertir_aristas_atipicas(matriz_capacidades, set(lista_fuentes), set(lista_sumideros))

    if len(lista_fuentes) > 1:
        print("Super-Fuente virtual creada automáticamente: Nodo S")
    if len(lista_sumideros) > 1:
        print("Super-Sumidero virtual creado automáticamente: Nodo T")

    print("\nAbriendo la interfaz gráfica interactiva (flechas ← → o botones para navegar)...")
    visualizador = construir_visualizador(matriz_capacidades, lista_fuentes, lista_sumideros)
    plt.show()


if __name__ == "__main__":
    iniciar_programa()
