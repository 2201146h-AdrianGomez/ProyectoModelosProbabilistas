/* ============================================================================
 * red.js  ·  PARTE 1 (Núcleo)
 *
 * Aquí vive el MODELO de la red bayesiana y sus validaciones.
 * No toca la pantalla: solo datos y reglas. Así se puede probar en Node.
 *
 * Cómo se guarda una red (en memoria y en el archivo JSON):
 *
 *   red = {
 *     nombre: "Mi red",
 *     descripcion: "",
 *     nodos: [
 *       {
 *         nombre:   "Alarma",              // identificador único
 *         estados:  ["Sí", "No"],          // valores posibles
 *         padres:   ["Robo", "Terremoto"], // de quién depende (aristas padre -> hijo)
 *         cpt:      [[0.95, 0.05], ...],   // tabla de probabilidad condicional
 *         posicion: { x: 300, y: 120 }     // solo para dibujar (opcional)
 *       }
 *     ]
 *   }
 *
 * CÓMO SE LEE LA CPT:
 *   - Hay UNA FILA por cada combinación de estados de los padres.
 *   - Los padres se recorren en el orden de "padres" y el ÚLTIMO padre es el
 *     que cambia más rápido (como un odómetro).
 *   - Cada fila tiene un número por cada estado del nodo y suma 1.
 *   - Un nodo sin padres tiene una sola fila: su distribución a priori.
 * ========================================================================== */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});

  const MIN_NODOS = 3;       // pide el proyecto: mínimo 3 nodos
  const MAX_NODOS = 10;      // y máximo 10
  const MIN_ESTADOS = 2;
  const MAX_ESTADOS = 8;
  const TOLERANCIA = 1e-6;   // qué tan cerca de 1 debe sumar cada fila

  /* ------------------------------ utilidades ------------------------------ */

  function crearRed(nombre) {
    return { nombre: nombre || 'Mi red bayesiana', descripcion: '', nodos: [] };
  }

  function clonar(red) {
    return JSON.parse(JSON.stringify(red));
  }

  function buscar(red, nombre) {
    return red.nodos.find((n) => n.nombre === nombre) || null;
  }

  function hijosDe(red, nombre) {
    return red.nodos.filter((n) => n.padres.includes(nombre));
  }

  function redondear(x) {
    return Math.round(x * 1e10) / 1e10;
  }

  function errorDeNombre(nombre) {
    if (typeof nombre !== 'string' || nombre.trim() === '') return 'el nombre no puede estar vacío.';
    if (nombre.includes(',')) return 'el nombre no puede contener comas.';
    if (nombre.trim().length > 40) return 'el nombre es demasiado largo (máximo 40 caracteres).';
    return null;
  }

  function errorDeEstados(estados) {
    if (!Array.isArray(estados) || estados.length < MIN_ESTADOS) {
      return `necesita al menos ${MIN_ESTADOS} estados.`;
    }
    if (estados.length > MAX_ESTADOS) return `puede tener como máximo ${MAX_ESTADOS} estados.`;
    const vistos = new Set();
    for (const e of estados) {
      if (typeof e !== 'string' || e.trim() === '') return 'los estados no pueden estar vacíos.';
      const k = e.trim().toLowerCase();
      if (vistos.has(k)) return `el estado "${e}" está repetido.`;
      vistos.add(k);
    }
    return null;
  }

  function existeNombre(red, nombre, ignorar) {
    const k = String(nombre).trim().toLowerCase();
    return red.nodos.some((n) => n.nombre !== ignorar && n.nombre.trim().toLowerCase() === k);
  }

  /* ---------------------------- tamaño de la CPT --------------------------- */

  // Número de filas de la CPT = producto de los estados de los padres.
  function numFilas(red, nodo) {
    return nodo.padres.reduce((acc, p) => acc * buscar(red, p).estados.length, 1);
  }

  // Devuelve [{padre, estado}, ...] que describe la fila i de la CPT.
  function combinacionDeFila(red, nodo, fila) {
    const res = [];
    let resto = fila;
    for (let j = nodo.padres.length - 1; j >= 0; j--) {
      const padre = buscar(red, nodo.padres[j]);
      const k = padre.estados.length;
      res.unshift({ padre: padre.nombre, estado: padre.estados[resto % k] });
      resto = Math.floor(resto / k);
    }
    return res;
  }

  function descripcionFila(red, nodo, fila) {
    if (!nodo.padres.length) return 'la distribución';
    const c = combinacionDeFila(red, nodo, fila).map((x) => `${x.padre}=${x.estado}`);
    return `la fila (${c.join(', ')})`;
  }

  function cptUniforme(red, nodo) {
    const k = nodo.estados.length;
    const filas = numFilas(red, nodo);
    const cpt = [];
    for (let i = 0; i < filas; i++) cpt.push(new Array(k).fill(1 / k));
    return cpt;
  }

  function normalizarCpt(cpt) {
    return cpt.map((fila) => {
      const suma = fila.reduce((a, b) => a + (isFinite(b) && b > 0 ? b : 0), 0);
      if (suma <= 0) return fila.map(() => 1 / fila.length);
      return fila.map((p) => (isFinite(p) && p > 0 ? p / suma : 0));
    });
  }

  /* ------------------------------ grafo (DAG) ------------------------------ */

  // Busca un ciclo. Devuelve [A, B, C, A] si lo hay, o null si es acíclico.
  function encontrarCiclo(red) {
    const hijos = {};
    red.nodos.forEach((n) => (hijos[n.nombre] = []));
    red.nodos.forEach((n) =>
      (n.padres || []).forEach((p) => {
        if (hijos[p]) hijos[p].push(n.nombre);
      })
    );
    const estado = {}; // 1 = en visita, 2 = terminado
    const pila = [];
    function visitar(u) {
      estado[u] = 1;
      pila.push(u);
      for (const v of hijos[u]) {
        if (estado[v] === 1) return pila.slice(pila.indexOf(v)).concat(v);
        if (!estado[v]) {
          const c = visitar(v);
          if (c) return c;
        }
      }
      pila.pop();
      estado[u] = 2;
      return null;
    }
    for (const n of red.nodos) {
      if (!estado[n.nombre]) {
        const c = visitar(n.nombre);
        if (c) return c;
      }
    }
    return null;
  }

  // Orden topológico (padres antes que hijos). null si hay ciclo.
  function ordenTopologico(red) {
    const pendientes = {};
    red.nodos.forEach((n) => (pendientes[n.nombre] = n.padres.filter((p) => buscar(red, p)).length));
    const cola = red.nodos.filter((n) => pendientes[n.nombre] === 0).map((n) => n.nombre);
    const orden = [];
    while (cola.length) {
      const u = cola.shift();
      orden.push(u);
      hijosDe(red, u).forEach((h) => {
        pendientes[h.nombre]--;
        if (pendientes[h.nombre] === 0) cola.push(h.nombre);
      });
    }
    return orden.length === red.nodos.length ? orden : null;
  }

  // Profundidad de cada nodo: 0 para raíces, 1 + la mayor de sus padres...
  function profundidades(red) {
    const prof = {};
    const orden = ordenTopologico(red);
    red.nodos.forEach((n) => (prof[n.nombre] = 0));
    if (!orden) return prof;
    orden.forEach((nombre) => {
      const nodo = buscar(red, nombre);
      nodo.padres.forEach((p) => {
        if (prof[p] + 1 > prof[nombre]) prof[nombre] = prof[p] + 1;
      });
    });
    return prof;
  }

  function descendientes(red, nombre) {
    const res = new Set();
    const pila = [nombre];
    while (pila.length) {
      const u = pila.pop();
      hijosDe(red, u).forEach((h) => {
        if (!res.has(h.nombre)) {
          res.add(h.nombre);
          pila.push(h.nombre);
        }
      });
    }
    return res;
  }

  /* ----------------------------- edición de la red -------------------------- */
  // Todas estas funciones lanzan Error con un mensaje en español si algo no es válido.

  function agregarNodo(red, nombre, estados) {
    if (red.nodos.length >= MAX_NODOS) {
      throw new Error(`Una red puede tener como máximo ${MAX_NODOS} nodos.`);
    }
    nombre = String(nombre == null ? '' : nombre).trim();
    const e1 = errorDeNombre(nombre);
    if (e1) throw new Error('Nombre inválido: ' + e1);
    if (existeNombre(red, nombre)) throw new Error(`Ya existe un nodo llamado "${nombre}".`);
    estados = (estados || ['Sí', 'No']).map((s) => String(s).trim());
    const e2 = errorDeEstados(estados);
    if (e2) throw new Error('Estados inválidos: ' + e2);
    const nodo = { nombre, estados, padres: [], cpt: null, posicion: null };
    nodo.cpt = cptUniforme(red, nodo);
    red.nodos.push(nodo);
    return nodo;
  }

  // Devuelve los nombres de los nodos cuya CPT se reinició.
  function eliminarNodo(red, nombre) {
    red.nodos = red.nodos.filter((n) => n.nombre !== nombre);
    const afectados = [];
    red.nodos.forEach((n) => {
      if (n.padres.includes(nombre)) {
        n.padres = n.padres.filter((p) => p !== nombre);
        n.cpt = cptUniforme(red, n);
        afectados.push(n.nombre);
      }
    });
    return afectados;
  }

  function renombrarNodo(red, viejo, nuevo) {
    nuevo = String(nuevo == null ? '' : nuevo).trim();
    const e = errorDeNombre(nuevo);
    if (e) throw new Error('Nombre inválido: ' + e);
    if (existeNombre(red, nuevo, viejo)) throw new Error(`Ya existe un nodo llamado "${nuevo}".`);
    const nodo = buscar(red, viejo);
    nodo.nombre = nuevo;
    red.nodos.forEach((n) => {
      n.padres = n.padres.map((p) => (p === viejo ? nuevo : p));
    });
  }

  // Cambia la lista completa de estados (agregar/quitar). Reinicia la CPT del
  // nodo y la de sus hijos, porque cambió el tamaño de las tablas.
  function establecerEstados(red, nombre, estados) {
    estados = estados.map((s) => String(s).trim());
    const e = errorDeEstados(estados);
    if (e) throw new Error('Estados inválidos: ' + e);
    const nodo = buscar(red, nombre);
    nodo.estados = estados;
    nodo.cpt = cptUniforme(red, nodo);
    const afectados = [nodo.nombre];
    hijosDe(red, nombre).forEach((h) => {
      h.cpt = cptUniforme(red, h);
      afectados.push(h.nombre);
    });
    return afectados;
  }

  // Solo cambia la etiqueta de un estado: las probabilidades se conservan.
  function renombrarEstado(red, nombre, indice, nuevo) {
    const nodo = buscar(red, nombre);
    const copia = nodo.estados.slice();
    copia[indice] = String(nuevo).trim();
    const e = errorDeEstados(copia);
    if (e) throw new Error('Estado inválido: ' + e);
    nodo.estados = copia;
  }

  // Define quiénes son los padres de un nodo (las aristas que llegan a él).
  // Rechaza ciclos. Reinicia la CPT del nodo porque cambia su forma.
  function establecerPadres(red, nombre, padres) {
    const nodo = buscar(red, nombre);
    const vistos = new Set();
    padres.forEach((p) => {
      if (p === nombre) throw new Error('Un nodo no puede ser padre de sí mismo.');
      if (!buscar(red, p)) throw new Error(`El nodo "${p}" no existe.`);
      if (vistos.has(p)) throw new Error(`El padre "${p}" está repetido.`);
      vistos.add(p);
    });
    const anteriores = nodo.padres;
    nodo.padres = padres.slice();
    const ciclo = encontrarCiclo(red);
    if (ciclo) {
      nodo.padres = anteriores;
      throw new Error(`Esa conexión crearía un ciclo (${ciclo.join(' → ')}). Una red bayesiana debe ser acíclica.`);
    }
    nodo.cpt = cptUniforme(red, nodo);
  }

  /* -------------------------------- validación ------------------------------ */

  // Revisa TODAS las reglas de una red bayesiana. Devuelve { ok, errores, avisos }.
  // opciones.minNodos / opciones.maxNodos permiten relajar el límite (para pruebas).
  function validar(red, opciones) {
    opciones = opciones || {};
    const minN = opciones.minNodos != null ? opciones.minNodos : MIN_NODOS;
    const maxN = opciones.maxNodos != null ? opciones.maxNodos : MAX_NODOS;
    const errores = [];
    const avisos = [];

    if (!red || !Array.isArray(red.nodos)) {
      return { ok: false, errores: ['La red no contiene una lista de nodos.'], avisos };
    }
    const n = red.nodos.length;
    if (n < minN) errores.push(`La red debe tener al menos ${minN} nodos (ahora tiene ${n}).`);
    if (n > maxN) errores.push(`La red puede tener como máximo ${maxN} nodos (ahora tiene ${n}).`);

    // 1) nombres, estados y tipo de los campos
    const nombres = new Set();
    let estructuraOk = true;
    red.nodos.forEach((nodo, i) => {
      if (!nodo || typeof nodo !== 'object') {
        errores.push(`El nodo #${i + 1} no tiene un formato válido.`);
        estructuraOk = false;
        return;
      }
      const et = typeof nodo.nombre === 'string' && nodo.nombre.trim() ? `"${nodo.nombre}"` : `#${i + 1}`;
      const e1 = errorDeNombre(nodo.nombre);
      if (e1) {
        errores.push(`Nodo ${et}: ${e1}`);
        estructuraOk = false;
      } else {
        const k = nodo.nombre.trim().toLowerCase();
        if (nombres.has(k)) {
          errores.push(`El nombre "${nodo.nombre}" está repetido: cada nodo necesita un identificador único.`);
          estructuraOk = false;
        }
        nombres.add(k);
      }
      const e2 = errorDeEstados(nodo.estados);
      if (e2) {
        errores.push(`Nodo ${et}: ${e2}`);
        estructuraOk = false;
      }
      if (!Array.isArray(nodo.padres)) {
        errores.push(`Nodo ${et}: la lista de padres no es válida.`);
        estructuraOk = false;
      }
    });
    if (!estructuraOk) return { ok: false, errores, avisos };

    // 2) padres
    let padresOk = true;
    red.nodos.forEach((nodo) => {
      const vistos = new Set();
      nodo.padres.forEach((p) => {
        if (p === nodo.nombre) {
          errores.push(`"${nodo.nombre}" no puede ser padre de sí mismo.`);
          padresOk = false;
        } else if (!buscar(red, p)) {
          errores.push(`El padre "${p}" de "${nodo.nombre}" no existe en la red.`);
          padresOk = false;
        }
        if (vistos.has(p)) {
          errores.push(`"${nodo.nombre}" tiene al padre "${p}" repetido.`);
          padresOk = false;
        }
        vistos.add(p);
      });
    });
    if (!padresOk) return { ok: false, errores, avisos };

    // 3) ciclos (debe ser un DAG)
    const ciclo = encontrarCiclo(red);
    if (ciclo) {
      errores.push(`La red tiene un ciclo (${ciclo.join(' → ')}); debe ser un grafo dirigido acíclico (DAG).`);
      return { ok: false, errores, avisos };
    }

    // 4) tablas de probabilidad
    red.nodos.forEach((nodo) => {
      const filas = numFilas(red, nodo);
      const k = nodo.estados.length;
      if (!Array.isArray(nodo.cpt) || nodo.cpt.length !== filas) {
        errores.push(
          `La CPT de "${nodo.nombre}" debe tener ${filas} fila(s) (una por cada combinación de estados de sus padres) y tiene ${
            Array.isArray(nodo.cpt) ? nodo.cpt.length : 0
          }.`
        );
        return;
      }
      nodo.cpt.forEach((fila, i) => {
        const donde = `En la CPT de "${nodo.nombre}", ${descripcionFila(red, nodo, i)}`;
        if (!Array.isArray(fila) || fila.length !== k) {
          errores.push(`${donde} debe tener ${k} valores.`);
          return;
        }
        let suma = 0;
        let numerosOk = true;
        fila.forEach((p) => {
          if (typeof p !== 'number' || !isFinite(p)) numerosOk = false;
          else {
            if (p < 0 || p > 1) numerosOk = false;
            suma += p;
          }
        });
        if (!numerosOk) errores.push(`${donde} tiene valores que no son probabilidades (deben estar entre 0 y 1).`);
        else if (Math.abs(suma - 1) > TOLERANCIA) {
          errores.push(`${donde} suma ${redondear(suma)} y debe sumar 1.`);
        }
      });
    });

    // 5) avisos (no impiden usar la red)
    red.nodos.forEach((nodo) => {
      if (!nodo.padres.length && !hijosDe(red, nodo.nombre).length) {
        avisos.push(`"${nodo.nombre}" no está conectado con ningún otro nodo.`);
      }
    });

    return { ok: errores.length === 0, errores, avisos };
  }

  /* --------------------------- acomodo automático --------------------------- */

  // Acomoda los nodos por capas: raíces arriba, hijos abajo.
  function autoLayout(red, ancho, alto) {
    ancho = ancho || 900;
    alto = alto || 580;
    const prof = profundidades(red);
    const capas = [];
    red.nodos.forEach((n) => {
      const d = prof[n.nombre] || 0;
      (capas[d] = capas[d] || []).push(n);
    });
    const L = capas.length;
    const margenY = 75;
    const xs = {};
    capas.forEach((capa, d) => {
      const items = capa.map((n, i) => {
        const px = n.padres.filter((p) => xs[p] != null).map((p) => xs[p]);
        const b = px.length ? px.reduce((a, c) => a + c, 0) / px.length : ((i + 0.5) / capa.length) * ancho;
        return { n, b, i };
      });
      items.sort((a, c) => a.b - c.b || a.i - c.i);
      const y = L === 1 ? alto / 2 : margenY + (d * (alto - 2 * margenY)) / (L - 1);
      items.forEach((it, j) => {
        const x = (ancho * (j + 1)) / (items.length + 1);
        xs[it.n.nombre] = x;
        it.n.posicion = { x: Math.round(x), y: Math.round(y) };
      });
    });
  }

  // Un lugar libre para un nodo nuevo (que no se encime con los demás).
  // Recorre una cuadrícula de 4 columnas y exige que quede separado de cada nodo
  // existente: más de 190 de distancia en horizontal o más de 90 en vertical.
  function posicionLibre(red, ancho, alto) {
    ancho = ancho || 900;
    alto = alto || 580;
    const ocupadas = red.nodos.filter((n) => n.posicion).map((n) => n.posicion);
    const columnas = 4;
    const filas = 5;
    for (let fila = 0; fila < filas; fila++) {
      for (let col = 0; col < columnas; col++) {
        const p = {
          x: 120 + col * ((ancho - 240) / (columnas - 1)),
          y: 80 + fila * ((alto - 160) / (filas - 1))
        };
        if (ocupadas.every((o) => Math.abs(o.x - p.x) > 190 || Math.abs(o.y - p.y) > 90)) {
          return { x: Math.round(p.x), y: Math.round(p.y) };
        }
      }
    }
    return { x: Math.round(ancho / 2), y: Math.round(alto / 2) };
  }

  RB.Red = {
    MIN_NODOS, MAX_NODOS, MIN_ESTADOS, MAX_ESTADOS, TOLERANCIA,
    crearRed, clonar, buscar, hijosDe, descendientes,
    numFilas, combinacionDeFila, descripcionFila, cptUniforme, normalizarCpt, redondear,
    encontrarCiclo, ordenTopologico, profundidades,
    agregarNodo, eliminarNodo, renombrarNodo, establecerEstados, renombrarEstado, establecerPadres,
    validar, autoLayout, posicionLibre
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB.Red;
})(typeof window !== 'undefined' ? window : globalThis);
