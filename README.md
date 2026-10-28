# Ford-Fulkerson paso a paso

Sitio web para estudiar el **problema del flujo máximo** con el algoritmo de Ford-Fulkerson
(etiquetado `[padre±, Δ]`). Es la versión web de un programa en Python
(`referencia/ford_fulkerson.py`) y reproduce su lógica: las mismas validaciones, los mismos
mensajes y los mismos pasos.

## Qué hace

1. **Nodos:** eliges n ∈ [7, 16].
2. **Modo:** *Aleatorio* (DAG por capas) o *Manual*.
3. **Grafo:** en modo manual construyes las aristas sobre el dibujo de tres formas:
   - arrastrando de un nodo a otro (o tocando el origen y luego el destino);
   - con la barra rápida (`A,B,10`, `0,1,10`, `FIN`, `DESHACER`, `LISTA`);
   - con el formulario.

   Cada arista se valida al instante: no se aceptan auto-bucles ni ciclos.
4. **Fuentes y sumideros:** con varias fuentes se crea un origen ficticio **S**, y con varios
   sumideros un destino ficticio **T**.
5. **Revisión:** muestra la red final con los avisos de aristas atípicas.
6. **Ejecución:** recorres el algoritmo paso a paso:
   - **Navegación:** botones Anterior y Siguiente, teclas ← → / p n y reproducción automática
     con la barra espaciadora.
   - **Línea de tiempo:** marca cada paso y permite saltar a cualquiera.
   - **Vistas:** red de flujo `f/c` o red residual.
   - **Resultado:** el flujo máximo, el corte mínimo y la lista de caminos aumentantes.
   - **Evaluador de cortes manuales:** prueba tus propios cortes.

Funciona en computadora y celular. También se puede usar solo con el teclado, tiene modo
oscuro y respeta `prefers-reduced-motion`.

## Uso local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # sitio estático en la carpeta out/
```

## Pruebas

```bash
npm test           # lógica del algoritmo y del editor (Node 22.18 o superior)
npm run test:python   # vuelve a generar tests/fixtures/python.json con el programa original
```

`tests/equivalencia.test.ts` compara la versión web con el programa en Python en:

- 122 redes: pasos, etiquetas, flujos, Δ, cortes y posiciones de los nodos;
- el generador aleatorio con semilla;
- sesiones completas de ingreso manual, con la misma salida de consola;
- la validación de n;
- el evaluador de cortes.

Para regenerar los datos de Python hace falta Python 3.12 con `numpy` y `matplotlib`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/lib/ff/` | Lógica traducida de Python, sin interfaz: `algoritmo.ts`, `entrada.ts`, `editor.ts`, `red.ts`, `layout.ts`, `evaluador.ts`, `geometria.ts`, `pyrandom.ts` |
| `src/components/asistente/` | Los pasos del asistente |
| `src/components/editor/` | Editor manual de aristas |
| `src/components/algoritmo/` | Pantalla del algoritmo, resultado y evaluador de cortes |
| `src/components/grafo/` | Dibujo SVG, zoom y colores con significado (`estilos.ts`) |
| `src/app/globals.css` | Paleta de colores (modo claro y oscuro) |
| `referencia/` | Programa original en Python, sin modificaciones |

## Publicación

El flujo `.github/workflows/pages.yml` ejecuta las pruebas, compila el sitio con
`BASE_PATH=/<nombre-del-repositorio>` y lo publica en GitHub Pages en cada push a `main`.
