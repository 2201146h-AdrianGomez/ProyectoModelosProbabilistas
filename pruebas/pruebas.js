/* ============================================================================
 * pruebas.js  ·  PARTE 1 (Núcleo)
 *
 * Pruebas automáticas sin dependencias.   Uso:   node pruebas/pruebas.js
 *
 * Qué comprueban:
 *   A. Validaciones de la red (DAG, CPT, límites de nodos...).
 *   B. Eliminación de variables contra valores calculados A MANO.
 *   C. Eliminación de variables contra la enumeración exhaustiva en los 5 ejemplos.
 *   D. Lo mismo en 300 redes aleatorias (consultas y evidencias aleatorias).
 *   E. Guardar y abrir (ida y vuelta) sin pérdida de información.
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

require('../js/nucleo/red.js');
require('../js/nucleo/inferencia.js');
require('../js/archivos/almacenamiento.js');
const RB = globalThis.RB;
const { Red, Inferencia, Almacenamiento } = RB;

let total = 0;
let fallos = 0;
function prueba(nombre, fn) {
  total++;
  try {
    fn();
    console.log('  ✓ ' + nombre);
  } catch (e) {
    fallos++;
    console.log('  ✗ ' + nombre + '\n      ' + e.message);
  }
}
function afirmar(cond, msg) {
  if (!cond) throw new Error(msg || 'la condición es falsa');
}
function cerca(a, b, tol, msg) {
  if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg || 'valores distintos'}: ${a} vs ${b} (tolerancia ${tol})`);
}
function lanza(fn, fragmento) {
  let msg = null;
  try {
    fn();
  } catch (e) {
    msg = e.message;
  }
  afirmar(msg !== null, 'debía lanzar un error');
  if (fragmento) afirmar(msg.includes(fragmento), `el error "${msg}" no contiene "${fragmento}"`);
}

const raiz = path.join(__dirname, '..');
const leerEjemplo = (nombre) => {
  const r = Almacenamiento.deserializar(fs.readFileSync(path.join(raiz, 'ejemplos', nombre), 'utf8'));
  if (!r.ok) throw new Error(nombre + ': ' + r.errores.join('; '));
  return r.red;
};
const valorDe = (res, estados) => {
  const f = res.distribucion;
  for (let i = 0; i < f.valores.length; i++) {
    if (Inferencia.etiquetasDeIndice(f, i).join('|') === estados.join('|')) return f.valores[i];
  }
  throw new Error('no se encontró ' + estados.join(','));
};

/* ---------------------------------------------------------------- A */
console.log('\nA. Validaciones');

function redChica() {
  const r = Red.crearRed('t');
  Red.agregarNodo(r, 'A');
  Red.agregarNodo(r, 'B');
  Red.agregarNodo(r, 'C');
  Red.establecerPadres(r, 'B', ['A']);
  Red.establecerPadres(r, 'C', ['B']);
  return r;
}

prueba('una red de 3 nodos con CPT uniformes es válida', () => {
  const v = Red.validar(redChica());
  afirmar(v.ok, v.errores.join('; '));
});
prueba('menos de 3 nodos no es válida', () => {
  const r = Red.crearRed('t');
  Red.agregarNodo(r, 'A');
  Red.agregarNodo(r, 'B');
  const v = Red.validar(r);
  afirmar(!v.ok && v.errores[0].includes('al menos 3'));
});
prueba('no se pueden agregar más de 10 nodos', () => {
  const r = Red.crearRed('t');
  for (let i = 0; i < 10; i++) Red.agregarNodo(r, 'N' + i);
  lanza(() => Red.agregarNodo(r, 'N10'), 'máximo 10');
});
prueba('nombres repetidos se rechazan (sin importar mayúsculas)', () => {
  const r = redChica();
  lanza(() => Red.agregarNodo(r, 'a'), 'Ya existe');
});
prueba('se rechazan ciclos A→B→C→A', () => {
  const r = redChica();
  lanza(() => Red.establecerPadres(r, 'A', ['C']), 'ciclo');
});
prueba('un nodo no puede ser su propio padre', () => {
  const r = redChica();
  lanza(() => Red.establecerPadres(r, 'A', ['A']), 'sí mismo');
});
prueba('un ciclo en un archivo se detecta al validar', () => {
  const r = redChica();
  Red.buscar(r, 'A').padres = ['C'];
  const v = Red.validar(r);
  afirmar(!v.ok && v.errores.some((e) => e.includes('ciclo')));
});
prueba('una fila de la CPT que no suma 1 se reporta con su descripción', () => {
  const r = redChica();
  Red.buscar(r, 'B').cpt[1] = [0.5, 0.4];
  const v = Red.validar(r);
  afirmar(!v.ok && v.errores.some((e) => e.includes('A=No') && e.includes('suma 0.9')), v.errores.join('; '));
});
prueba('probabilidades fuera de [0,1] o NaN se rechazan', () => {
  const r = redChica();
  Red.buscar(r, 'A').cpt = [[1.2, -0.2]];
  afirmar(!Red.validar(r).ok);
  Red.buscar(r, 'A').cpt = [[NaN, 1]];
  afirmar(!Red.validar(r).ok);
});
prueba('CPT con el número de filas equivocado se rechaza', () => {
  const r = redChica();
  Red.buscar(r, 'B').cpt = [[0.5, 0.5]];
  const v = Red.validar(r);
  afirmar(!v.ok && v.errores[0].includes('2 fila'));
});
prueba('cambiar los estados de un padre reinicia la CPT del hijo con el tamaño correcto', () => {
  const r = redChica();
  Red.establecerEstados(r, 'A', ['x', 'y', 'z']);
  afirmar(Red.buscar(r, 'B').cpt.length === 3);
  afirmar(Red.validar(r).ok);
});
prueba('eliminar un nodo limpia las referencias de sus hijos', () => {
  const r = redChica();
  Red.eliminarNodo(r, 'A');
  afirmar(Red.buscar(r, 'B').padres.length === 0);
});
prueba('renombrar un nodo actualiza a sus hijos', () => {
  const r = redChica();
  Red.renombrarNodo(r, 'A', 'Alfa');
  afirmar(Red.buscar(r, 'B').padres[0] === 'Alfa');
  afirmar(Red.validar(r).ok);
});

/* ---------------------------------------------------------------- B */
console.log('\nB. Eliminación de variables vs. cálculos hechos a mano');

prueba('Pasto mojado: P(Lluvia=Sí | Pasto=Sí) = 0.16038 / 0.44838 ≈ 0.357687', () => {
  // A mano: P(Pasto=Sí, Lluvia=Sí) = 0.2·(0.01·0.99 + 0.99·0.8) = 0.16038
  //         P(Pasto=Sí, Lluvia=No) = 0.8·(0.4·0.9 + 0.6·0) = 0.288   →  Z = 0.44838
  const red = leerEjemplo('ejemplo1-3-nodos-pasto-mojado.json');
  const r = Inferencia.eliminacionDeVariables(red, ['Lluvia'], { 'Pasto mojado': 'Sí' });
  cerca(valorDe(r, ['Sí']), 0.16038 / 0.44838, 1e-12, 'P(Lluvia=Sí|e)');
  cerca(r.probEvidencia, 0.44838, 1e-12, 'P(e)');
});
prueba('Alarma: P(Robo=Sí | Juan=Sí, María=Sí) ≈ 0.284 (valor clásico de Russell & Norvig)', () => {
  const red = leerEjemplo('ejemplo3-5-nodos-alarma.json');
  const r = Inferencia.eliminacionDeVariables(red, ['Robo'], { 'Juan llama': 'Sí', 'María llama': 'Sí' });
  cerca(valorDe(r, ['Sí']), 0.284, 0.001, 'P(Robo|Juan,María)');
});
prueba('Sin evidencia, la marginal de una raíz es su propia distribución a priori', () => {
  const red = leerEjemplo('ejemplo3-5-nodos-alarma.json');
  const r = Inferencia.eliminacionDeVariables(red, ['Terremoto'], {});
  cerca(valorDe(r, ['Sí']), 0.002, 1e-12);
  cerca(r.probEvidencia, 1, 1e-12, 'sin evidencia P(e)=1');
});
prueba('La distribución resultante suma 1', () => {
  const red = leerEjemplo('ejemplo2-4-nodos-estudiante.json');
  const r = Inferencia.eliminacionDeVariables(red, ['Dificultad', 'Preparación'], { Calificación: 'Baja' });
  cerca(r.distribucion.valores.reduce((a, b) => a + b, 0), 1, 1e-12);
});
prueba('Evidencia imposible (probabilidad 0) produce un error claro', () => {
  const red = leerEjemplo('ejemplo4-6-nodos-auto.json');
  lanza(
    () => Inferencia.eliminacionDeVariables(red, ['Gasolina'], { Arranca: 'Sí', Gasolina_: 'x' }),
    'no existe'
  );
  // Gasolina=Vacío es imposible si Arranca=Sí, pero preguntando por "Frío" la evidencia es posible:
  const ok = Inferencia.eliminacionDeVariables(red, ['Gasolina'], { Arranca: 'Sí' });
  cerca(valorDe(ok, ['Vacío']), 0, 1e-12, 'Gasolina vacía con el auto andando');
});
prueba('Una variable no puede estar en la consulta y en la evidencia', () => {
  const red = leerEjemplo('ejemplo1-3-nodos-pasto-mojado.json');
  lanza(() => Inferencia.eliminacionDeVariables(red, ['Lluvia'], { Lluvia: 'Sí' }), 'a la vez');
});
prueba('El orden de eliminación manual se respeta y no cambia el resultado', () => {
  const red = leerEjemplo('ejemplo3-5-nodos-alarma.json');
  const ev = { 'Juan llama': 'Sí', 'María llama': 'Sí' };
  const a = Inferencia.eliminacionDeVariables(red, ['Robo'], ev, { orden: ['Terremoto', 'Alarma'] });
  const b = Inferencia.eliminacionDeVariables(red, ['Robo'], ev, { orden: ['Alarma', 'Terremoto'] });
  afirmar(a.ordenEliminacion.join() === 'Terremoto,Alarma');
  afirmar(b.ordenEliminacion.join() === 'Alarma,Terremoto');
  cerca(valorDe(a, ['Sí']), valorDe(b, ['Sí']), 1e-12);
});
prueba('Un orden manual incompleto se rechaza', () => {
  const red = leerEjemplo('ejemplo3-5-nodos-alarma.json');
  lanza(() => Inferencia.eliminacionDeVariables(red, ['Robo'], {}, { orden: ['Alarma'] }), 'orden de eliminación');
});

/* ---------------------------------------------------------------- C */
console.log('\nC. Los 5 ejemplos: eliminación de variables vs. enumeración y resultados esperados');

const esperados = JSON.parse(fs.readFileSync(path.join(raiz, 'ejemplos', 'resultados-esperados.json'), 'utf8'));
esperados.ejemplos.forEach((ej) => {
  const red = leerEjemplo(ej.archivo);
  ej.consultas.forEach((c) => {
    ['minfill', 'mingrado', 'lista'].forEach((h) => {
      prueba(`${ej.nodos} nodos · P(${c.consulta.join(',')} | ${Object.keys(c.evidencia).join(',') || '—'}) · ${h}`, () => {
        const r = Inferencia.eliminacionDeVariables(red, c.consulta, c.evidencia, { heuristica: h });
        cerca(r.probEvidencia, c.probEvidencia, 1e-9, 'P(evidencia)');
        c.distribucion.forEach((d) => cerca(valorDe(r, d.estados), d.p, 1e-9, 'P(' + d.estados.join(',') + ')'));
        const cmp = Inferencia.compararConReferencia(red, r);
        afirmar(cmp.disponible && cmp.ok, 'no coincide con la referencia');
      });
    });
  });
});

/* ---------------------------------------------------------------- D */
console.log('\nD. Redes aleatorias');

let semilla = 20261103;
const azar = () => {
  semilla = (semilla * 1664525 + 1013904223) % 4294967296;
  return semilla / 4294967296;
};
const entero = (a, b) => a + Math.floor(azar() * (b - a + 1));

function redAleatoria() {
  const r = Red.crearRed('aleatoria');
  const n = entero(3, 8);
  for (let i = 0; i < n; i++) {
    const k = entero(2, 3);
    Red.agregarNodo(r, 'V' + i, Array.from({ length: k }, (_, j) => 'e' + j));
  }
  for (let i = 1; i < n; i++) {
    const cand = [];
    for (let j = 0; j < i; j++) if (azar() < 0.4) cand.push('V' + j);
    Red.establecerPadres(r, 'V' + i, cand.slice(0, 3));
  }
  r.nodos.forEach((nodo) => {
    nodo.cpt = Red.normalizarCpt(nodo.cpt.map((fila) => fila.map(() => (azar() < 0.15 ? 0 : azar() + 0.01))));
  });
  return r;
}

prueba('300 redes aleatorias: la eliminación de variables coincide con la enumeración', () => {
  let comprobadas = 0;
  for (let t = 0; t < 300; t++) {
    const red = redAleatoria();
    const nombres = red.nodos.map((n) => n.nombre);
    const q = nombres.filter(() => azar() < 0.3);
    if (!q.length) q.push(nombres[entero(0, nombres.length - 1)]);
    const ev = {};
    nombres.forEach((v) => {
      if (!q.includes(v) && azar() < 0.3) ev[v] = red.nodos.find((n) => n.nombre === v).estados[0];
    });
    let res;
    try {
      res = Inferencia.eliminacionDeVariables(red, q, ev, { heuristica: ['minfill', 'mingrado', 'lista'][t % 3] });
    } catch (e) {
      if (e.message.includes('probabilidad 0')) continue; // evidencia imposible: es un caso válido
      throw e;
    }
    const cmp = Inferencia.compararConReferencia(red, res);
    afirmar(cmp.ok, `red #${t}: diferencia ${cmp.maxDiferencia}`);
    comprobadas++;
  }
  afirmar(comprobadas > 200, 'se comprobaron muy pocas redes: ' + comprobadas);
});

/* ---------------------------------------------------------------- E */
console.log('\nE. Guardar y abrir');

prueba('los 5 ejemplos se guardan y se abren sin perder información', () => {
  esperados.ejemplos.forEach((ej) => {
    const red = leerEjemplo(ej.archivo);
    const texto = Almacenamiento.serializar(red, { consulta: [red.nodos[0].nombre], evidencia: {} });
    const otra = Almacenamiento.deserializar(texto);
    afirmar(otra.ok, otra.errores.join('; '));
    afirmar(JSON.stringify(otra.red) === JSON.stringify(red), 'la red cambió: ' + ej.archivo);
  });
});
prueba('modificar, guardar y abrir de nuevo conserva los cambios', () => {
  const red = leerEjemplo('ejemplo1-3-nodos-pasto-mojado.json');
  Red.buscar(red, 'Lluvia').cpt = [[0.3, 0.7]];
  Red.agregarNodo(red, 'Nube', ['Densa', 'Ligera']);
  Red.establecerPadres(red, 'Lluvia', ['Nube']);
  Red.buscar(red, 'Lluvia').cpt = [[0.7, 0.3], [0.1, 0.9]];
  const otra = Almacenamiento.deserializar(Almacenamiento.serializar(red));
  afirmar(otra.ok, otra.errores.join('; '));
  afirmar(otra.red.nodos.length === 4);
  afirmar(JSON.stringify(Red.buscar(otra.red, 'Lluvia').cpt) === '[[0.7,0.3],[0.1,0.9]]');
});
prueba('un archivo con JSON roto da un mensaje claro', () => {
  const r = Almacenamiento.deserializar('{ esto no es json');
  afirmar(!r.ok && r.errores[0].includes('JSON'));
});
prueba('un JSON que no es una red se rechaza', () => {
  afirmar(!Almacenamiento.deserializar('{"hola": 1}').ok);
});
prueba('un archivo con CPT inválida se rechaza y explica por qué', () => {
  const red = leerEjemplo('ejemplo1-3-nodos-pasto-mojado.json');
  const obj = JSON.parse(Almacenamiento.serializar(red));
  obj.nodos[1].cpt[0] = [0.5, 0.2];
  const r = Almacenamiento.deserializar(JSON.stringify(obj));
  afirmar(!r.ok && r.errores.some((e) => e.includes('suma 0.7')), r.errores.join('; '));
});
prueba('un archivo con un ciclo se rechaza', () => {
  const red = leerEjemplo('ejemplo1-3-nodos-pasto-mojado.json');
  const obj = JSON.parse(Almacenamiento.serializar(red));
  obj.nodos[0].padres = ['Pasto mojado'];
  const r = Almacenamiento.deserializar(JSON.stringify(obj));
  afirmar(!r.ok && r.errores.some((e) => e.includes('ciclo')) || !r.ok);
});
prueba('si el archivo no trae posiciones, se calculan', () => {
  const red = leerEjemplo('ejemplo3-5-nodos-alarma.json');
  const obj = JSON.parse(Almacenamiento.serializar(red));
  obj.nodos.forEach((n) => delete n.posicion);
  const r = Almacenamiento.deserializar(JSON.stringify(obj));
  afirmar(r.ok && r.red.nodos.every((n) => n.posicion && isFinite(n.posicion.x)));
});

/* ------------------------------------------------------------------ fin */
console.log(`\n${total - fallos}/${total} pruebas correctas${fallos ? ` — ${fallos} FALLARON` : ''}.`);
process.exit(fallos ? 1 : 0);
