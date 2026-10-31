# Formato de archivo de las redes

Las redes se guardan como **JSON** (texto, codificación UTF-8, extensión `.json`). Se puede editar a mano y
la aplicación valida todo lo que abre.

## Ejemplo mínimo

```json
{
  "formato": "red-bayesiana",
  "version": 1,
  "nombre": "Pasto mojado",
  "descripcion": "Clásico de 3 nodos.",
  "nodos": [
    {
      "nombre": "Lluvia",
      "estados": ["Sí", "No"],
      "padres": [],
      "cpt": [
        [0.2, 0.8]
      ],
      "posicion": { "x": 500, "y": 75 }
    },
    {
      "nombre": "Aspersor",
      "estados": ["Sí", "No"],
      "padres": ["Lluvia"],
      "cpt": [
        [0.01, 0.99],
        [0.4, 0.6]
      ]
    },
    {
      "nombre": "Pasto mojado",
      "estados": ["Sí", "No"],
      "padres": ["Aspersor", "Lluvia"],
      "cpt": [
        [0.99, 0.01],
        [0.9, 0.1],
        [0.8, 0.2],
        [0, 1]
      ]
    }
  ],
  "consultaSugerida": { "consulta": ["Lluvia"], "evidencia": { "Pasto mojado": "Sí" } }
}
```

## Campos

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `formato` | texto | sí | Siempre `"red-bayesiana"`. |
| `version` | número | sí | Versión del formato (ahora `1`). |
| `nombre` | texto | sí | Nombre de la red. |
| `descripcion` | texto | no | Descripción libre. |
| `nodos` | lista | sí | Entre 3 y 10 nodos. |
| `consultaSugerida` | objeto | no | Consulta que se precarga al abrir la red: `consulta` (lista de nombres) y `evidencia` (objeto `nombre → estado`). |

### Cada nodo

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | texto | sí | Identificador único dentro de la red. |
| `estados` | lista de textos | sí | De 2 a 8 estados, sin repetir. |
| `padres` | lista de textos | no | Nombres de los nodos padre. Si falta, se toma como lista vacía (nodo sin padres). Cada padre debe existir. |
| `cpt` | lista de listas de números | sí | Tabla de probabilidad condicional (ver abajo). |
| `posicion` | `{ "x": n, "y": n }` | no | Dónde se dibuja el nodo. Si falta, la aplicación lo acomoda sola. |

## Cómo se lee la CPT

`cpt` tiene **una fila por cada combinación de estados de los padres** y **una columna por cada estado del nodo**.

- El **primer padre** de la lista es el que cambia **más lento** y el **último** el que cambia **más rápido**.
- Los estados se recorren en el orden en que aparecen en `estados`.
- Cada fila debe **sumar 1** (con tolerancia de 1e-6).

Ejemplo: `Pasto mojado` con `padres: ["Aspersor", "Lluvia"]` y estados `["Sí", "No"]` tiene 2 × 2 = 4 filas:

| Fila | Aspersor | Lluvia | P(Sí) | P(No) |
|---|---|---|---|---|
| 0 | Sí | Sí | 0.99 | 0.01 |
| 1 | Sí | No | 0.90 | 0.10 |
| 2 | No | Sí | 0.80 | 0.20 |
| 3 | No | No | 0.00 | 1.00 |

Un nodo **sin padres** tiene una sola fila (su distribución a priori).

## Qué valida la aplicación al abrir un archivo

- El JSON es legible y tiene `formato: "red-bayesiana"`.
- Hay entre 3 y 10 nodos.
- Cada nodo tiene nombre (único), de 2 a 8 estados distintos y una lista de padres válida.
- Cada padre existe, no es el propio nodo y no está repetido.
- **No hay ciclos** (la red debe ser un grafo dirigido acíclico).
- La `cpt` tiene el número correcto de filas y columnas, valores entre 0 y 1, y **cada fila suma 1**.

Si algo falla, la aplicación **no abre la red** y muestra la lista de problemas encontrados.

## Compatibilidad

Los campos desconocidos se ignoran. Si cambia la estructura en el futuro, se incrementará `version`.
