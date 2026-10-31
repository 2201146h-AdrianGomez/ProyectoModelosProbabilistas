/* ============================================================================
 * inferencia.js  ·  PARTE 1 (Núcleo)
 *
 * Eliminación de variables (Variable Elimination) y, aparte, un método de
 * REFERENCIA por enumeración para poder comprobar que los resultados son
 * correctos (el proyecto pide resultados verificables).
 *
 * IDEA DEL ALGORITMO (en palabras simples):
 *   1. Cada nodo aporta un "factor": su tabla de probabilidad (CPT).
 *   2. Evidencia: si sabemos que X=x, en cada factor nos quedamos solo con
 *      las filas donde X vale x (se llama "restringir").
 *   3. Las variables que no son de consulta ni de evidencia estorban: las
 *      eliminamos una por una. Para eliminar la variable V:
 *        a) juntamos (multiplicamos) todos los factores donde aparece V,
 *        b) sumamos sobre los valores de V (V desaparece),
 *        c) el resultado es un factor nuevo que sustituye a los anteriores.
 *   4. Al final multiplicamos lo que queda y dividimos entre la suma total
 *      (normalizar). Esa suma es P(evidencia).
 *
 * Un FACTOR es una tabla con:
 *   vars     nombres de las variables, en orden
 *   card     cuántos estados tiene cada variable
 *   estados  los nombres de los estados de cada variable
 *   valores  los números, en orden "odómetro": la ÚLTIMA variable cambia más rápido
 * ========================================================================== */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});

  /* --------------------------------- factores -------------------------------- */

  function tamano(card) {
    return card.reduce((a, b) => a * b, 1);
  }

  // strides[i] = cuánto se avanza en "valores" al subir 1 el estado de la variable i
  function strides(card) {
    const s = new Array(card.length);
    let acc = 1;
    for (let i = card.length - 1; i >= 0; i--) {
      s[i] = acc;
      acc *= card[i];
    }
    return s;
  }

  // Avanza un "odómetro" de dígitos (el último dígito cambia más rápido).
  function avanzar(dig, card) {
    for (let k = dig.length - 1; k >= 0; k--) {
      dig[k]++;
      if (dig[k] < card[k]) return;
      dig[k] = 0;
    }
  }

  function crearFactor(vars, card, estados, valores, etiqueta) {
    return { vars, card, estados, valores, etiqueta: etiqueta || null };
  }

  function describirFactor(f) {
    if (f.etiqueta) return f.etiqueta;
    return f.vars.length ? `φ(${f.vars.join(', ')})` : 'φ( )';
  }

  // El factor inicial de un nodo es su CPT: variables = padres + el propio nodo.
  function factorDeNodo(red, nodo) {
    const vars = nodo.padres.concat([nodo.nombre]);
    const nodos = vars.map((v) => RB.Red.buscar(red, v));
    const valores = [];
    nodo.cpt.forEach((fila) => fila.forEach((p) => valores.push(p)));
    const etiqueta = nodo.padres.length
      ? `P(${nodo.nombre} | ${nodo.padres.join(', ')})`
      : `P(${nodo.nombre})`;
    return crearFactor(
      vars,
      nodos.map((n) => n.estados.length),
      nodos.map((n) => n.estados.slice()),
      valores,
      etiqueta
    );
  }

  // Multiplicación de factores: cada entrada del resultado es el producto de
  // las entradas que le corresponden en a y en b.
  function multiplicar(a, b) {
    const vars = a.vars.slice();
    const card = a.card.slice();
    const estados = a.estados.slice();
    b.vars.forEach((v, i) => {
      if (!vars.includes(v)) {
        vars.push(v);
        card.push(b.card[i]);
        estados.push(b.estados[i]);
      }
    });
    const n = tamano(card);
    const sA = strides(a.card);
    const sB = strides(b.card);
    const posA = a.vars.map((v) => vars.indexOf(v));
    const posB = b.vars.map((v) => vars.indexOf(v));
    const out = new Array(n);
    const dig = new Array(vars.length).fill(0);
    for (let idx = 0; idx < n; idx++) {
      let ia = 0;
      let ib = 0;
      for (let j = 0; j < posA.length; j++) ia += dig[posA[j]] * sA[j];
      for (let j = 0; j < posB.length; j++) ib += dig[posB[j]] * sB[j];
      out[idx] = a.valores[ia] * b.valores[ib];
      avanzar(dig, card);
    }
    return crearFactor(vars, card, estados, out, null);
  }

  // Suma sobre una variable: la variable desaparece del factor.
  function sumarVariable(f, v) {
    const pos = f.vars.indexOf(v);
    const vars = f.vars.filter((_, i) => i !== pos);
    const card = f.card.filter((_, i) => i !== pos);
    const estados = f.estados.filter((_, i) => i !== pos);
    const out = new Array(tamano(card)).fill(0);
    const sOut = strides(card);
    const dig = new Array(f.vars.length).fill(0);
    for (let idx = 0; idx < f.valores.length; idx++) {
      let io = 0;
      let j = 0;
      for (let k = 0; k < f.vars.length; k++) {
        if (k === pos) continue;
        io += dig[k] * sOut[j++];
      }
      out[io] += f.valores[idx];
      avanzar(dig, f.card);
    }
    return crearFactor(vars, card, estados, out, null);
  }

  // Evidencia: nos quedamos solo con las entradas donde la variable v vale "e".
  function restringir(f, v, e) {
    const pos = f.vars.indexOf(v);
    if (pos < 0) return f;
    const vars = f.vars.filter((_, i) => i !== pos);
    const card = f.card.filter((_, i) => i !== pos);
    const estados = f.estados.filter((_, i) => i !== pos);
    const out = new Array(tamano(card)).fill(0);
    const sOut = strides(card);
    const dig = new Array(f.vars.length).fill(0);
    for (let idx = 0; idx < f.valores.length; idx++) {
      if (dig[pos] === e) {
        let io = 0;
        let j = 0;
        for (let k = 0; k < f.vars.length; k++) {
          if (k === pos) continue;
          io += dig[k] * sOut[j++];
        }
        out[io] = f.valores[idx];
      }
      avanzar(dig, f.card);
    }
    return crearFactor(vars, card, estados, out, null);
  }

  // Cambia el orden de las variables de un factor (mismos números, otra disposición).
  function reordenar(f, orden) {
    const pos = orden.map((v) => f.vars.indexOf(v));
    const card = pos.map((p) => f.card[p]);
    const estados = pos.map((p) => f.estados[p]);
    const sF = strides(f.card);
    const n = tamano(card);
    const out = new Array(n);
    const dig = new Array(orden.length).fill(0);
    for (let idx = 0; idx < n; idx++) {
      let i = 0;
      for (let j = 0; j < orden.length; j++) i += dig[j] * sF[pos[j]];
      out[idx] = f.valores[i];
      avanzar(dig, card);
    }
    return crearFactor(orden.slice(), card, estados, out, f.etiqueta);
  }

  function sumaTotal(f) {
    return f.valores.reduce((a, b) => a + b, 0);
  }

  function normalizar(f) {
    const z = sumaTotal(f);
    return crearFactor(f.vars, f.card, f.estados, f.valores.map((x) => x / z), f.etiqueta);
  }

  // Convierte un índice de "valores" en la lista de nombres de estado.
  function etiquetasDeIndice(f, idx) {
    const s = strides(f.card);
    return f.vars.map((_, i) => f.estados[i][Math.floor(idx / s[i]) % f.card[i]]);
  }

  /* -------------------------- orden de eliminación --------------------------- */

  // Elige cuál variable eliminar a continuación.
  //   'minfill'  : la que agrega menos conexiones nuevas entre sus vecinas
  //   'mingrado' : la que tiene menos vecinas
  //   'lista'    : en el orden en que aparecen los nodos
  function elegirVariable(red, factores, pendientes, heuristica) {
    const orden = (v) => red.nodos.findIndex((n) => n.nombre === v);
    if (heuristica === 'lista') {
      return pendientes.slice().sort((a, b) => orden(a) - orden(b))[0];
    }
    const ady = new Map();
    const dame = (v) => {
      if (!ady.has(v)) ady.set(v, new Set());
      return ady.get(v);
    };
    factores.forEach((f) =>
      f.vars.forEach((a) =>
        f.vars.forEach((b) => {
          if (a !== b) dame(a).add(b);
        })
      )
    );
    let mejor = null;
    let mejorPuntaje = null;
    pendientes.forEach((v) => {
      const vecinos = Array.from(dame(v));
      let relleno = 0;
      for (let i = 0; i < vecinos.length; i++) {
        for (let j = i + 1; j < vecinos.length; j++) {
          if (!dame(vecinos[i]).has(vecinos[j])) relleno++;
        }
      }
      const puntaje = heuristica === 'mingrado' ? [vecinos.length, relleno, orden(v)] : [relleno, vecinos.length, orden(v)];
      if (
        !mejorPuntaje ||
        puntaje[0] < mejorPuntaje[0] ||
        (puntaje[0] === mejorPuntaje[0] && (puntaje[1] < mejorPuntaje[1] || (puntaje[1] === mejorPuntaje[1] && puntaje[2] < mejorPuntaje[2])))
      ) {
        mejor = v;
        mejorPuntaje = puntaje;
      }
    });
    return mejor;
  }

  /* ----------------------- ELIMINACIÓN DE VARIABLES --------------------------- */
  //
  //   consulta  : ["Robo"]                      variables por las que se pregunta
  //   evidencia : { Juan: "Sí", María: "Sí" }   lo que ya se sabe
  //   opciones  : { heuristica: 'minfill'|'mingrado'|'lista', orden: [nombres a eliminar] }
  //
  // Devuelve P(consulta | evidencia) y un registro de todos los pasos.
  function eliminacionDeVariables(red, consulta, evidencia, opciones) {
    opciones = opciones || {};
    evidencia = evidencia || {};
    const heuristica = opciones.heuristica || 'minfill';

    const val = RB.Red.validar(red, { minNodos: 1 });
    if (!val.ok) throw new Error('La red no es válida: ' + val.errores[0]);

    if (!Array.isArray(consulta) || consulta.length === 0) {
      throw new Error('Selecciona al menos una variable de consulta.');
    }
    const existe = (v) => RB.Red.buscar(red, v);
    consulta.forEach((q) => {
      if (!existe(q)) throw new Error(`La variable de consulta "${q}" no existe.`);
    });
    if (new Set(consulta).size !== consulta.length) throw new Error('Hay variables de consulta repetidas.');

    const evNombres = Object.keys(evidencia);
    const evIndice = {};
    evNombres.forEach((v) => {
      const nodo = existe(v);
      if (!nodo) throw new Error(`La variable de evidencia "${v}" no existe.`);
      const i = nodo.estados.indexOf(evidencia[v]);
      if (i < 0) throw new Error(`"${evidencia[v]}" no es un estado de "${v}".`);
      if (consulta.includes(v)) throw new Error(`"${v}" no puede ser a la vez variable de consulta y de evidencia.`);
      evIndice[v] = i;
    });

    const pasos = [];
    let factores = red.nodos.map((n) => factorDeNodo(red, n));
    pasos.push({ tipo: 'inicio', factores: factores.map(describirFactor) });

    // 1) Evidencia
    evNombres.forEach((v) => {
      const afectados = [];
      factores = factores.map((f) => {
        if (!f.vars.includes(v)) return f;
        afectados.push(describirFactor(f));
        const g = restringir(f, v, evIndice[v]);
        g.etiqueta = `${describirFactor(f)}[${v}=${evidencia[v]}]`;
        return g;
      });
      pasos.push({ tipo: 'evidencia', variable: v, estado: evidencia[v], factores: afectados });
    });

    // 2) Variables a eliminar: todas menos consulta y evidencia
    const ocultas = red.nodos.map((n) => n.nombre).filter((v) => !consulta.includes(v) && !(v in evIndice));
    let ordenFijo = null;
    if (opciones.orden && opciones.orden.length) {
      const a = opciones.orden.slice().sort().join('|');
      const b = ocultas.slice().sort().join('|');
      if (a !== b) {
        throw new Error('El orden de eliminación debe incluir exactamente las variables que no son de consulta ni de evidencia: ' + (ocultas.join(', ') || '(ninguna)'));
      }
      ordenFijo = opciones.orden.slice();
    }

    const pendientes = ocultas.slice();
    const ordenUsado = [];
    let k = 0;
    while (pendientes.length) {
      const v = ordenFijo ? ordenFijo[ordenUsado.length] : elegirVariable(red, factores, pendientes, heuristica);
      pendientes.splice(pendientes.indexOf(v), 1);
      ordenUsado.push(v);
      k++;

      const usados = factores.filter((f) => f.vars.includes(v));
      const resto = factores.filter((f) => !f.vars.includes(v));
      let producto = usados[0];
      for (let i = 1; i < usados.length; i++) producto = multiplicar(producto, usados[i]);
      const etiquetaProducto = `φ(${producto.vars.join(', ')})`;
      const tau = sumarVariable(producto, v);
      tau.etiqueta = `τ${k}(${tau.vars.join(', ')})`;
      factores = resto.concat([tau]);
      pasos.push({
        tipo: 'eliminacion',
        numero: k,
        variable: v,
        usados: usados.map(describirFactor),
        producto: etiquetaProducto,
        resultado: tau.etiqueta,
        tabla: tau
      });
    }

    // 3) Multiplicar lo que queda y normalizar
    let final = factores[0];
    for (let i = 1; i < factores.length; i++) final = multiplicar(final, factores[i]);
    final = reordenar(final, consulta);
    const Z = sumaTotal(final);
    if (!(Z > 0)) {
      throw new Error('La evidencia tiene probabilidad 0: no se puede calcular una distribución condicional.');
    }
    const distribucion = normalizar(final);
    distribucion.etiqueta = `P(${consulta.join(', ')}${evNombres.length ? ' | ' + evNombres.join(', ') : ''})`;
    pasos.push({ tipo: 'final', factores: factores.map(describirFactor), Z });

    // Distribuciones marginales de cada variable de consulta
    const marginales = {};
    consulta.forEach((q) => {
      let g = distribucion;
      consulta.forEach((otra) => {
        if (otra !== q) g = sumarVariable(g, otra);
      });
      marginales[q] = g.estados[0].map((e, i) => ({ estado: e, p: g.valores[i] }));
    });

    return {
      consulta: consulta.slice(),
      evidencia: Object.assign({}, evidencia),
      heuristica: ordenFijo ? 'manual' : heuristica,
      ordenEliminacion: ordenUsado,
      pasos,
      distribucion,
      probEvidencia: Z,
      marginales
    };
  }

  /* ------------------------- MÉTODO DE REFERENCIA ----------------------------- */
  // Enumeración exhaustiva: recorre TODAS las combinaciones posibles de la red,
  // calcula la probabilidad conjunta de cada una (producto de las CPT) y suma las
  // que coinciden con la evidencia. Es lento pero muy simple, y no usa nada del
  // código de factores: sirve para comprobar la eliminación de variables.
  function enumeracion(red, consulta, evidencia) {
    evidencia = evidencia || {};
    const nodos = red.nodos;
    const n = nodos.length;
    const idx = {};
    nodos.forEach((nd, i) => (idx[nd.nombre] = i));
    const card = nodos.map((nd) => nd.estados.length);
    const total = tamano(card);
    const padresIdx = nodos.map((nd) => nd.padres.map((p) => idx[p]));
    const fijo = nodos.map((nd) => (nd.nombre in evidencia ? nd.estados.indexOf(evidencia[nd.nombre]) : -1));
    const qIdx = consulta.map((q) => idx[q]);
    const qCard = qIdx.map((i) => card[i]);
    const salida = new Array(tamano(qCard)).fill(0);
    const dig = new Array(n).fill(0);
    let pe = 0;
    for (let t = 0; t < total; t++) {
      let coincide = true;
      for (let i = 0; i < n; i++) {
        if (fijo[i] >= 0 && dig[i] !== fijo[i]) {
          coincide = false;
          break;
        }
      }
      if (coincide) {
        let p = 1;
        for (let i = 0; i < n && p !== 0; i++) {
          let fila = 0;
          for (const pi of padresIdx[i]) fila = fila * card[pi] + dig[pi];
          p *= nodos[i].cpt[fila][dig[i]];
        }
        let q = 0;
        for (let j = 0; j < qIdx.length; j++) q = q * qCard[j] + dig[qIdx[j]];
        salida[q] += p;
        pe += p;
      }
      avanzar(dig, card);
    }
    return { valores: pe > 0 ? salida.map((x) => x / pe) : salida, probEvidencia: pe };
  }

  // Compara un resultado de eliminación de variables con la enumeración.
  function compararConReferencia(red, resultado) {
    const total = red.nodos.reduce((a, n) => a * n.estados.length, 1);
    if (total > 3e6) return { disponible: false, motivo: 'La red es demasiado grande para la enumeración exhaustiva.' };
    const ref = enumeracion(red, resultado.consulta, resultado.evidencia);
    let maxDif = 0;
    resultado.distribucion.valores.forEach((v, i) => {
      maxDif = Math.max(maxDif, Math.abs(v - ref.valores[i]));
    });
    const difPe = Math.abs(resultado.probEvidencia - ref.probEvidencia);
    return {
      disponible: true,
      maxDiferencia: maxDif,
      difProbEvidencia: difPe,
      probEvidenciaReferencia: ref.probEvidencia,
      referencia: ref.valores,
      ok: maxDif < 1e-9 && difPe < 1e-9
    };
  }

  RB.Inferencia = {
    eliminacionDeVariables, enumeracion, compararConReferencia,
    factorDeNodo, multiplicar, sumarVariable, restringir, reordenar, normalizar,
    describirFactor, etiquetasDeIndice, sumaTotal
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB.Inferencia;
})(typeof window !== 'undefined' ? window : globalThis);
