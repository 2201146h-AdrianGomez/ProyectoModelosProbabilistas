/* ============================================================================
 * generar-ejemplos.js  ·  PARTE 3 (Archivos y salidas)
 *
 * Define las 5 redes de ejemplo (3, 4, 5, 6 y 10 nodos) y genera:
 *   - ejemplos/*.json                  las redes en el formato documentado
 *   - ejemplos/resultados-esperados.json  consultas calculadas por ENUMERACIÓN
 *                                      (método independiente de la eliminación de variables)
 *   - js/archivos/ejemplos-data.js           los mismos ejemplos embebidos para el menú "Ejemplos"
 *                                      (así la página funciona incluso abriéndola con doble clic)
 *
 * Uso:   node herramientas/generar-ejemplos.js
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

require('../js/nucleo/red.js');
require('../js/nucleo/inferencia.js');
require('../js/archivos/almacenamiento.js');
const RB = globalThis.RB;

const SINO = ['Sí', 'No'];

const EJEMPLOS = [
  /* ------------------------------------------------------------- 1 · 3 nodos */
  {
    archivo: 'ejemplo1-3-nodos-pasto-mojado.json',
    titulo: 'Ejemplo 1 · Pasto mojado (3 nodos)',
    red: {
      nombre: 'Pasto mojado',
      descripcion: 'Clásico de 3 nodos: la lluvia puede encender el aspersor y ambos mojan el pasto.',
      nodos: [
        { nombre: 'Lluvia', estados: SINO, padres: [], cpt: [[0.2, 0.8]] },
        { nombre: 'Aspersor', estados: SINO, padres: ['Lluvia'], cpt: [[0.01, 0.99], [0.4, 0.6]] },
        {
          nombre: 'Pasto mojado',
          estados: SINO,
          padres: ['Aspersor', 'Lluvia'],
          cpt: [[0.99, 0.01], [0.9, 0.1], [0.8, 0.2], [0.0, 1.0]]
        }
      ]
    },
    consultas: [
      { consulta: ['Lluvia'], evidencia: { 'Pasto mojado': 'Sí' } },
      { consulta: ['Aspersor'], evidencia: { 'Pasto mojado': 'Sí' } },
      { consulta: ['Pasto mojado'], evidencia: {} }
    ]
  },

  /* ------------------------------------------------------------- 2 · 4 nodos */
  {
    archivo: 'ejemplo2-4-nodos-estudiante.json',
    titulo: 'Ejemplo 2 · Estudiante (4 nodos)',
    red: {
      nombre: 'Estudiante',
      descripcion: 'La calificación depende de la dificultad del curso y de la preparación; la carta de recomendación depende de la calificación (un nodo con 3 estados).',
      nodos: [
        { nombre: 'Dificultad', estados: ['Alta', 'Baja'], padres: [], cpt: [[0.4, 0.6]] },
        { nombre: 'Preparación', estados: ['Buena', 'Mala'], padres: [], cpt: [[0.7, 0.3]] },
        {
          nombre: 'Calificación',
          estados: ['Alta', 'Media', 'Baja'],
          padres: ['Dificultad', 'Preparación'],
          cpt: [
            [0.3, 0.4, 0.3],
            [0.05, 0.25, 0.7],
            [0.9, 0.08, 0.02],
            [0.5, 0.3, 0.2]
          ]
        },
        {
          nombre: 'Carta',
          estados: ['Buena', 'Mala'],
          padres: ['Calificación'],
          cpt: [[0.9, 0.1], [0.6, 0.4], [0.01, 0.99]]
        }
      ]
    },
    consultas: [
      { consulta: ['Dificultad'], evidencia: { Carta: 'Buena' } },
      { consulta: ['Calificación'], evidencia: { Preparación: 'Mala' } },
      { consulta: ['Dificultad', 'Preparación'], evidencia: { Calificación: 'Baja' } }
    ]
  },

  /* ------------------------------------------------------------- 3 · 5 nodos */
  {
    archivo: 'ejemplo3-5-nodos-alarma.json',
    titulo: 'Ejemplo 3 · Alarma de la casa (5 nodos)',
    red: {
      nombre: 'Alarma de la casa',
      descripcion: 'Un robo o un terremoto activan la alarma; los vecinos Juan y María llaman si la oyen.',
      nodos: [
        { nombre: 'Robo', estados: SINO, padres: [], cpt: [[0.001, 0.999]] },
        { nombre: 'Terremoto', estados: SINO, padres: [], cpt: [[0.002, 0.998]] },
        {
          nombre: 'Alarma',
          estados: SINO,
          padres: ['Robo', 'Terremoto'],
          cpt: [[0.95, 0.05], [0.94, 0.06], [0.29, 0.71], [0.001, 0.999]]
        },
        { nombre: 'Juan llama', estados: SINO, padres: ['Alarma'], cpt: [[0.9, 0.1], [0.05, 0.95]] },
        { nombre: 'María llama', estados: SINO, padres: ['Alarma'], cpt: [[0.7, 0.3], [0.01, 0.99]] }
      ]
    },
    consultas: [
      { consulta: ['Robo'], evidencia: { 'Juan llama': 'Sí', 'María llama': 'Sí' } },
      { consulta: ['Alarma'], evidencia: { 'Juan llama': 'Sí' } },
      { consulta: ['Robo', 'Terremoto'], evidencia: { Alarma: 'Sí' } }
    ]
  },

  /* ------------------------------------------------------------- 4 · 6 nodos */
  {
    archivo: 'ejemplo4-6-nodos-auto.json',
    titulo: 'Ejemplo 4 · Auto que no enciende (6 nodos)',
    red: {
      nombre: 'Auto que no enciende',
      descripcion: 'El frío debilita la batería; la batería y la gasolina deciden si el auto arranca; las luces delatan el estado de la batería.',
      nodos: [
        { nombre: 'Frío', estados: SINO, padres: [], cpt: [[0.3, 0.7]] },
        { nombre: 'Batería', estados: ['Buena', 'Débil'], padres: ['Frío'], cpt: [[0.6, 0.4], [0.9, 0.1]] },
        { nombre: 'Gasolina', estados: ['Suficiente', 'Vacío'], padres: [], cpt: [[0.9, 0.1]] },
        { nombre: 'Luces', estados: ['Brillan', 'Tenues'], padres: ['Batería'], cpt: [[0.95, 0.05], [0.2, 0.8]] },
        {
          nombre: 'Arranca',
          estados: SINO,
          padres: ['Batería', 'Gasolina'],
          cpt: [[0.98, 0.02], [0.0, 1.0], [0.3, 0.7], [0.0, 1.0]]
        },
        { nombre: 'Visita al taller', estados: SINO, padres: ['Arranca'], cpt: [[0.05, 0.95], [0.8, 0.2]] }
      ]
    },
    consultas: [
      { consulta: ['Batería'], evidencia: { Arranca: 'No', Luces: 'Tenues' } },
      { consulta: ['Gasolina'], evidencia: { Arranca: 'No' } },
      { consulta: ['Visita al taller'], evidencia: { Frío: 'Sí' } }
    ]
  },

  /* ------------------------------------------------------------ 5 · 10 nodos */
  {
    archivo: 'ejemplo5-10-nodos-respiratorio.json',
    titulo: 'Ejemplo 5 · Diagnóstico respiratorio (10 nodos)',
    red: {
      nombre: 'Diagnóstico respiratorio',
      descripcion: 'Red didáctica de 10 nodos: hábitos y antecedentes influyen en enfermedades que producen síntomas y resultados de estudios.',
      nodos: [
        { nombre: 'Fumador', estados: SINO, padres: [], cpt: [[0.3, 0.7]] },
        { nombre: 'Contaminación', estados: ['Alta', 'Baja'], padres: [], cpt: [[0.2, 0.8]] },
        { nombre: 'Viaje', estados: SINO, padres: [], cpt: [[0.1, 0.9]] },
        { nombre: 'Bronquitis', estados: SINO, padres: ['Fumador'], cpt: [[0.6, 0.4], [0.3, 0.7]] },
        {
          nombre: 'Cáncer',
          estados: SINO,
          padres: ['Fumador', 'Contaminación'],
          cpt: [[0.05, 0.95], [0.03, 0.97], [0.02, 0.98], [0.001, 0.999]]
        },
        { nombre: 'Tuberculosis', estados: SINO, padres: ['Viaje'], cpt: [[0.05, 0.95], [0.01, 0.99]] },
        {
          nombre: 'Anormalidad',
          estados: SINO,
          padres: ['Tuberculosis', 'Cáncer'],
          cpt: [[0.99, 0.01], [0.9, 0.1], [0.95, 0.05], [0.05, 0.95]]
        },
        { nombre: 'Rayos X', estados: ['Positivo', 'Negativo'], padres: ['Anormalidad'], cpt: [[0.98, 0.02], [0.05, 0.95]] },
        {
          nombre: 'Disnea',
          estados: SINO,
          padres: ['Bronquitis', 'Anormalidad'],
          cpt: [[0.9, 0.1], [0.8, 0.2], [0.7, 0.3], [0.1, 0.9]]
        },
        { nombre: 'Tos', estados: SINO, padres: ['Bronquitis'], cpt: [[0.85, 0.15], [0.15, 0.85]] }
      ]
    },
    consultas: [
      { consulta: ['Cáncer'], evidencia: { 'Rayos X': 'Positivo', Fumador: 'Sí' } },
      { consulta: ['Bronquitis', 'Tuberculosis'], evidencia: { Disnea: 'Sí', Tos: 'Sí' } },
      { consulta: ['Anormalidad'], evidencia: { 'Rayos X': 'Negativo' } }
    ]
  }
];

/* ------------------------------------------------------------------ generar */

const raiz = path.join(__dirname, '..');
// Posiciones a mano del ejemplo de 10 nodos (así ninguna flecha atraviesa otro nodo).
// Los otros ejemplos se acomodan solos al abrirse.
const POSICIONES_EJEMPLO_5 = {
  Fumador: { x: 310, y: 80 },
  'Contaminación': { x: 620, y: 80 },
  Viaje: { x: 790, y: 80 },
  Bronquitis: { x: 160, y: 220 },
  'Cáncer': { x: 470, y: 220 },
  Tuberculosis: { x: 790, y: 220 },
  Tos: { x: 80, y: 370 },
  Anormalidad: { x: 630, y: 370 },
  Disnea: { x: 330, y: 500 },
  'Rayos X': { x: 790, y: 500 }
};
EJEMPLOS[4].red.nodos.forEach((n) => {
  if (!POSICIONES_EJEMPLO_5[n.nombre]) throw new Error('Falta la posición de ' + n.nombre);
  n.posicion = POSICIONES_EJEMPLO_5[n.nombre];
});

fs.mkdirSync(path.join(raiz, 'ejemplos'), { recursive: true });

const esperados = [];
const embebidos = [];

EJEMPLOS.forEach((ej, i) => {
  const red = ej.red;
  RB.Red.autoLayout(red);
  const v = RB.Red.validar(red);
  if (!v.ok) throw new Error(`El ejemplo ${i + 1} no es válido:\n - ${v.errores.join('\n - ')}`);

  // El archivo trae la primera consulta como "consultaSugerida"
  const texto = RB.Almacenamiento.serializar(red, ej.consultas[0]);
  fs.writeFileSync(path.join(raiz, 'ejemplos', ej.archivo), texto, 'utf8');

  // Comprobamos que lo escrito se puede volver a leer sin pérdida
  const lectura = RB.Almacenamiento.deserializar(texto);
  if (!lectura.ok) throw new Error('Releyendo ' + ej.archivo + ': ' + lectura.errores.join('; '));
  if (JSON.stringify(lectura.red.nodos) !== JSON.stringify(red.nodos)) {
    throw new Error('La lectura de ' + ej.archivo + ' no coincide con la red original.');
  }

  const consultas = ej.consultas.map((c) => {
    const ref = RB.Inferencia.enumeracion(red, c.consulta, c.evidencia);
    const dist = [];
    const factorDummy = {
      vars: c.consulta,
      card: c.consulta.map((q) => RB.Red.buscar(red, q).estados.length),
      estados: c.consulta.map((q) => RB.Red.buscar(red, q).estados.slice())
    };
    ref.valores.forEach((p, idx) => {
      dist.push({ estados: RB.Inferencia.etiquetasDeIndice(factorDummy, idx), p: Number(p.toPrecision(12)) });
    });
    return {
      consulta: c.consulta,
      evidencia: c.evidencia,
      probEvidencia: Number(ref.probEvidencia.toPrecision(12)),
      distribucion: dist
    };
  });
  esperados.push({ archivo: ej.archivo, nodos: red.nodos.length, metodo: 'enumeración exhaustiva de la conjunta', consultas });
  embebidos.push({ id: 'ejemplo' + (i + 1), titulo: ej.titulo, nodos: red.nodos.length, consulta: ej.consultas[0], red });
  console.log(`✓ ${ej.archivo}  (${red.nodos.length} nodos)`);
});

const nodosPorEjemplo = embebidos.map((e) => e.nodos);
if (new Set(nodosPorEjemplo).size !== nodosPorEjemplo.length) throw new Error('Los ejemplos repiten cantidad de nodos.');

fs.writeFileSync(
  path.join(raiz, 'ejemplos', 'resultados-esperados.json'),
  JSON.stringify({ descripcion: 'Resultados de referencia calculados por enumeración, para comparar con la eliminación de variables.', ejemplos: esperados }, null, 2) + '\n',
  'utf8'
);

fs.writeFileSync(
  path.join(raiz, 'js', 'archivos', 'ejemplos-data.js'),
  '/* Archivo GENERADO por herramientas/generar-ejemplos.js — no editar a mano. */\n' +
    'window.RB = window.RB || {};\nwindow.RB.EJEMPLOS = ' + JSON.stringify(embebidos, null, 1) + ';\n',
  'utf8'
);

console.log('\nListo: 5 ejemplos con', nodosPorEjemplo.join(', '), 'nodos.');
