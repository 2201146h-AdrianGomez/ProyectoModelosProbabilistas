# Redes Bayesianas · Eliminación de variables

Aplicación web para **construir, visualizar, consultar y resolver redes bayesianas** con el método de
**eliminación de variables** (*Variable Elimination*). Funciona en el navegador, sin instalar nada y sin servidor.

- **Demo en línea:** : (pendiente de publicación)
- **Curso:** Modelos probabilistas · Facultad de Ingeniería Eléctrica, UMSNH

## Qué hace

| Requisito del proyecto | Dónde está |
|---|---|
| Redes de 3 a 10 nodos con nombre, estados, padres y CPT | Panel izquierdo (editor de nodos) |
| Validación: DAG, CPT que suman 1, nombres únicos | Recuadro "Red válida" y mensajes de error |
| Dibujo del grafo dirigido, con nodos que se mueven | Centro (arrastra los nodos, botón *Reorganizar*) |
| Consulta con una o varias variables y evidencia | Panel derecho |
| Eliminación de variables real, con pasos visibles | "Ver el algoritmo paso a paso" |
| Resultados verificables | Cada resultado se compara solo con una enumeración exhaustiva |
| Guardar, abrir y modificar redes | Botones *Guardar* / *Abrir* (archivo `.json`, también se puede arrastrar a la ventana) |
| Impresión / salida legible | Botón *Imprimir* (sirve para "Guardar como PDF") y *Descargar HTML* |

## Cómo ejecutarla

No requiere instalación ni dependencias.

1. Descarga o clona el repositorio.
2. Abre `index.html` con doble clic en tu navegador.

Si prefieres un servidor local (opcional):

```bash
python3 -m http.server 8000     # y abre http://localhost:8000
```

### Requisitos

- Un navegador moderno (Chrome, Edge, Firefox o Safari recientes).
- Para correr las **pruebas automáticas**: Node.js 18 o superior (probado con Node 22). Sin `npm install`.

### Plataformas probadas

| Plataforma | Estado |
|---|---|
| Node.js 22 en Linux (pruebas automáticas) | Probado |
| Windows · Chrome / Edge | Probado |
| macOS · Safari / Chrome | Sin probar |
| GNU/Linux · Brave | Probado|


## Cómo se usa (resumen)

1. **Abre un ejemplo** desde el menú *Ejemplos*, o pulsa *Nueva* y agrega nodos (3 a 10).
2. **Selecciona un nodo** para definir sus estados, marcar sus padres y llenar su tabla de probabilidad.
   Con 2 estados, el segundo valor se completa solo. Cada fila debe sumar 1 (*Normalizar filas* ayuda).
3. **Consulta:** elige las variables de consulta (verde azulado), pon evidencia (ámbar) y pulsa **Ejecutar**.
4. **Lee el resultado:** distribución, P(evidencia), orden de eliminación y verificación automática.
5. **Guarda** la red (`.json`) o **imprime** el informe.

## Ejemplos incluidos

Cinco redes con un número distinto de nodos, cada una con consultas ya resueltas
([`ejemplos/resultados-esperados.json`](ejemplos/resultados-esperados.json)):

| # | Archivo | Nodos | Consulta de muestra | Resultado |
|---|---|---|---|---|
| 1 | `ejemplo1-3-nodos-pasto-mojado.json` | 3 | P(Lluvia \| Pasto mojado = Sí) | Sí 0.357688 · No 0.642312 |
| 2 | `ejemplo2-4-nodos-estudiante.json` | 4 | P(Dificultad \| Carta = Buena) | Alta 0.261461 · Baja 0.738539 |
| 3 | `ejemplo3-5-nodos-alarma.json` | 5 | P(Robo \| Juan llama = Sí, María llama = Sí) | Sí 0.284172 · No 0.715828 |
| 4 | `ejemplo4-6-nodos-auto.json` | 6 | P(Batería \| Arranca = No, Luces = Tenues) | Buena 0.041291 · Débil 0.958709 |
| 5 | `ejemplo5-10-nodos-respiratorio.json` | 10 | P(Cáncer \| Rayos X = Positivo, Fumador = Sí) | Sí 0.234079 · No 0.765921 |

Los ejemplos 1 y 3 son clásicos de libro; sus resultados (0.3577 y 0.284) coinciden con los publicados.

## Cómo verificar que los resultados son correctos

Hay tres comprobaciones independientes:

1. **Dentro de la app:** cada consulta se recalcula con una *enumeración exhaustiva* de la distribución conjunta
   (un método distinto, sin factores) y muestra "✓ Verificado" con la diferencia máxima.
2. **Pruebas automáticas:** `node pruebas/pruebas.js` (74 pruebas). Incluye cálculos hechos a mano, los 5 ejemplos con
   3 órdenes de eliminación distintos, **300 redes aleatorias** comparadas contra la enumeración, y guardar/abrir sin pérdida.
3. **Archivo de referencia:** `ejemplos/resultados-esperados.json`, generado por enumeración.

```bash
node pruebas/pruebas.js          # corre las pruebas
node herramientas/generar-ejemplos.js   # regenera ejemplos/ y js/archivos/ejemplos-data.js
```

## El algoritmo en pocas palabras

1. Cada nodo aporta un **factor**: su CPT.
2. **Evidencia:** en cada factor se conservan solo las filas donde la variable vale lo observado.
3. Cada variable **oculta** (ni de consulta ni de evidencia) se elimina: se **multiplican** los factores que la
   contienen y se **suma** sobre sus valores; el factor resultante sustituye a los anteriores.
4. Se multiplican los factores restantes y se **normaliza**. La suma antes de normalizar es **P(evidencia)**.

El orden de eliminación puede ser automático (mínimo relleno o mínimo grado), el de la lista o uno escrito por el usuario;
el resultado es el mismo, solo cambia el tamaño de los factores intermedios.

## Estructura del repositorio

```
index.html                  Página principal
css/estilos.css             Estilos
js/nucleo/red.js            Modelo de la red, validaciones (DAG, CPT) y acomodo del grafo      (Parte 1)
js/nucleo/inferencia.js     Factores, eliminación de variables y enumeración de referencia    (Parte 1)
js/interfaz/util.js         Utilidades de pantalla (avisos, ventanas, eventos)                 (Parte 2)
js/interfaz/grafo.js        Dibujo y arrastre del grafo (SVG)                                  (Parte 2)
js/interfaz/editor.js       Editor de nodos, estados, padres y CPT                             (Parte 2)
js/main.js                  Estado global y botones de la barra superior                       (Parte 2)
js/interfaz/consulta.js     Panel de consultas y resultados                                    (Parte 3)
js/archivos/almacenamiento.js  Guardar y abrir JSON con validación                             (Parte 3)
js/archivos/informe.js      Informe imprimible                                                 (Parte 3)
js/archivos/ejemplos-data.js   Ejemplos embebidos (generado)                                   (Parte 3)
ejemplos/                   5 redes de ejemplo y resultados esperados
pruebas/pruebas.js          Pruebas automáticas
herramientas/generar-ejemplos.js   Define y genera los ejemplos
docs/FORMATO.md             Formato del archivo de red
```

## Documentación

- [Formato de archivo de las redes](docs/FORMATO.md)
- Manual de usuario y memoria técnica: (docs/(pendiente))

## Integrantes y contribuciones

| Integrante | Parte | Contribuciones |
|---|---|---|
| Luis Adrián Gómez Saavedra | Parte 2 · Interfaz | HTML/CSS, dibujo del grafo, editor de nodos y de tablas de probabilidad, barra superior |
| Luis Roberto Villafuerte Gómez| Parte 1 · Núcleo | Modelo de la red, validaciones, factores, eliminación de variables, enumeración de referencia y pruebas |
| Jonathan Miguel Anguiano Huitron| Parte 3 · Consultas, archivos y salidas | Panel de consultas, guardar/abrir JSON, informe imprimible, ejemplos y documentación |

El historial de commits (`git shortlog -sn`) respalda esta tabla.
