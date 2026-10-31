/* ============================================================================
 * almacenamiento.js  ·  PARTE 3 (Archivos y salidas)
 *
 * Guardar y abrir redes en archivos JSON, validando que lo que se abre sea
 * una red correcta. El formato está documentado en docs/FORMATO.md.
 *
 * Las funciones "puras" (serializar / deserializar) también corren en Node,
 * por eso se usan en las pruebas y en el generador de ejemplos.
 * ========================================================================== */
(function (root) {
  'use strict';
  const RB = (root.RB = root.RB || {});

  const FORMATO = 'red-bayesiana';
  const VERSION = 1;
  const CLAVE_BORRADOR = 'bn-borrador-v1';

  const q = JSON.stringify;
  const lista = (arr) => '[' + arr.map((x) => q(x)).join(', ') + ']';
  const numeros = (arr) => '[' + arr.map((x) => String(x)).join(', ') + ']';

  /* ------------------------------ escribir JSON ----------------------------- */

  // Texto JSON "bonito": cada fila de la CPT queda en una sola línea.
  // consulta (opcional): { consulta: [...], evidencia: {...} } para recordar una consulta de ejemplo.
  function serializar(red, consulta) {
    const nodos = red.nodos.map((n) => {
      const props = [
        `      "nombre": ${q(n.nombre)}`,
        `      "estados": ${lista(n.estados)}`,
        `      "padres": ${lista(n.padres)}`,
        `      "cpt": [\n` + n.cpt.map((fila) => `        ${numeros(fila)}`).join(',\n') + `\n      ]`
      ];
      if (n.posicion) {
        props.push(`      "posicion": { "x": ${Math.round(n.posicion.x)}, "y": ${Math.round(n.posicion.y)} }`);
      }
      return '    {\n' + props.join(',\n') + '\n    }';
    });
    const cabecera = [
      `  "formato": ${q(FORMATO)}`,
      `  "version": ${VERSION}`,
      `  "nombre": ${q(red.nombre || 'Mi red bayesiana')}`,
      `  "descripcion": ${q(red.descripcion || '')}`,
      `  "nodos": [\n${nodos.join(',\n')}\n  ]`
    ];
    if (consulta && consulta.consulta && consulta.consulta.length) {
      cabecera.push(
        `  "consultaSugerida": { "consulta": ${lista(consulta.consulta)}, "evidencia": ${q(consulta.evidencia || {})} }`
      );
    }
    return '{\n' + cabecera.join(',\n') + '\n}\n';
  }

  /* ------------------------------- leer JSON -------------------------------- */

  function posicionValida(p) {
    return p && typeof p === 'object' && isFinite(p.x) && isFinite(p.y) ? { x: Number(p.x), y: Number(p.y) } : null;
  }

  // Convierte el texto de un archivo en una red y la valida.
  // Devuelve { ok, red, consulta, errores, avisos }.
  function deserializar(texto) {
    const falla = (msg) => ({ ok: false, red: null, consulta: null, errores: [msg], avisos: [] });
    let obj;
    try {
      obj = JSON.parse(texto);
    } catch (e) {
      return falla('El archivo no es un JSON válido (' + e.message + ').');
    }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return falla('El archivo no contiene un objeto JSON con una red.');
    }
    if (obj.formato !== FORMATO) {
      return falla(`El archivo no parece una red de esta aplicación (debe incluir "formato": "${FORMATO}").`);
    }
    if (typeof obj.version !== 'number' || obj.version > VERSION) {
      return falla(`La versión del formato (${obj.version}) no es compatible; esta aplicación entiende hasta la versión ${VERSION}.`);
    }
    if (!Array.isArray(obj.nodos)) return falla('El archivo no tiene la lista "nodos".');

    const red = {
      nombre: typeof obj.nombre === 'string' && obj.nombre.trim() ? obj.nombre : 'Red importada',
      descripcion: typeof obj.descripcion === 'string' ? obj.descripcion : '',
      nodos: obj.nodos.map((n) => ({
        nombre: n && n.nombre,
        estados: n && n.estados,
        padres: n && n.padres === undefined ? [] : n && n.padres,
        cpt: n && n.cpt,
        posicion: n ? posicionValida(n.posicion) : null
      }))
    };

    const v = RB.Red.validar(red);
    if (!v.ok) return { ok: false, red: null, consulta: null, errores: v.errores, avisos: v.avisos };

    completarPosiciones(red);

    // consulta sugerida (opcional): solo se conserva si es coherente con la red
    let consulta = null;
    const avisos = v.avisos.slice();
    const cs = obj.consultaSugerida;
    if (cs && Array.isArray(cs.consulta)) {
      const ev = cs.evidencia && typeof cs.evidencia === 'object' ? cs.evidencia : {};
      const buenas =
        cs.consulta.length > 0 &&
        cs.consulta.every((x) => RB.Red.buscar(red, x)) &&
        Object.keys(ev).every((x) => {
          const nodo = RB.Red.buscar(red, x);
          return nodo && nodo.estados.includes(ev[x]) && !cs.consulta.includes(x);
        });
      if (buenas) consulta = { consulta: cs.consulta.slice(), evidencia: Object.assign({}, ev) };
      else avisos.push('La "consultaSugerida" del archivo no coincide con la red y se ignoró.');
    }
    return { ok: true, red, consulta, errores: [], avisos };
  }

  // Si el archivo no trae posiciones (o solo de algunos nodos), las calcula.
  function completarPosiciones(red) {
    const sin = red.nodos.filter((n) => !n.posicion);
    if (!sin.length) return;
    if (sin.length === red.nodos.length) {
      RB.Red.autoLayout(red);
    } else {
      sin.forEach((n) => (n.posicion = RB.Red.posicionLibre(red)));
    }
  }

  /* ------------------------ funciones del navegador ------------------------ */

  function nombreDeArchivo(red) {
    const base = String(red.nombre || 'red-bayesiana')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return (base || 'red-bayesiana') + '.json';
  }

  function descargarTexto(nombreArchivo, texto, mime) {
    const blob = new Blob([texto], { type: (mime || 'application/json') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function leerArchivo(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      lector.readAsText(archivo, 'utf-8');
    });
  }

  /* ----------------------- borrador automático (opcional) -------------------- */
  // Guarda una copia en el navegador para no perder el trabajo si se cierra la pestaña.

  function guardarBorrador(red, consulta) {
    try {
      root.localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ red, consulta }));
    } catch (e) {
      /* sin almacenamiento disponible: no pasa nada */
    }
  }

  function cargarBorrador() {
    try {
      const txt = root.localStorage.getItem(CLAVE_BORRADOR);
      if (!txt) return null;
      const d = JSON.parse(txt);
      if (!d || !d.red || !Array.isArray(d.red.nodos)) return null;
      const bien = d.red.nodos.every(
        (n) => n && typeof n.nombre === 'string' && Array.isArray(n.estados) && Array.isArray(n.padres) && Array.isArray(n.cpt)
      );
      return bien ? d : null;
    } catch (e) {
      return null;
    }
  }

  RB.Almacenamiento = {
    FORMATO, VERSION,
    serializar, deserializar, completarPosiciones,
    nombreDeArchivo, descargarTexto, leerArchivo, guardarBorrador, cargarBorrador
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = RB.Almacenamiento;
})(typeof window !== 'undefined' ? window : globalThis);
