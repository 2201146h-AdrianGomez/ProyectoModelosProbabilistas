/* ============================================================================
 * main.js  ·  PARTE 2 (Interfaz)
 *
 * Pegamento de la aplicación: guarda el estado global (la red, la consulta,
 * el resultado), conecta los botones de la barra superior y mantiene todo
 * coherente cuando la red cambia.
 * ========================================================================== */
(function () {
  'use strict';
  const RB = window.RB;
  const { h, toast, confirmar, modal, listaDeErrores, bus } = RB.UI;
  const $ = (id) => document.getElementById(id);

  /* ---------------------------- estado global ---------------------------- */

  const app = {
    red: RB.Red.crearRed('Mi red bayesiana'),
    seleccion: null,
    consulta: { vars: [], evidencia: {}, heuristica: 'minfill', ordenManual: '' },
    resultado: null,
    resultadoError: null
  };
  window.RB.app = app; // útil para depurar desde la consola

  function limpiarConsulta() {
    const c = app.consulta;
    const existe = (v) => RB.Red.buscar(app.red, v);
    c.vars = c.vars.filter(existe);
    Object.keys(c.evidencia).forEach((k) => {
      const n = existe(k);
      if (!n || !n.estados.includes(c.evidencia[k]) || c.vars.includes(k)) delete c.evidencia[k];
    });
    if (app.seleccion && !existe(app.seleccion)) app.seleccion = null;
  }

  let temporizador = null;
  function guardarBorrador() {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => RB.Almacenamiento.guardarBorrador(app.red, { vars: app.consulta.vars, evidencia: app.consulta.evidencia }), 400);
  }

  // Cualquier cambio en la red invalida el resultado anterior.
  // (Este oyente se registra primero, así el resto de los paneles ya ven el estado limpio.)
  bus.on('red', () => {
    limpiarConsulta();
    app.resultado = null;
    app.resultadoError = null;
    $('nombreRed').value = app.red.nombre;
    bus.emit('consulta');
    guardarBorrador();
  });
  bus.on('posiciones', guardarBorrador);

  /* ------------------------- cargar / reemplazar red ------------------------- */

  function cargarRed(red, consulta, mensaje) {
    app.red = red;
    app.seleccion = null;
    app.resultado = null;
    app.resultadoError = null;
    app.consulta = { vars: [], evidencia: {}, heuristica: app.consulta.heuristica, ordenManual: '' };
    if (consulta) {
      app.consulta.vars = (consulta.consulta || consulta.vars || []).slice();
      app.consulta.evidencia = Object.assign({}, consulta.evidencia || {});
    }
    limpiarConsulta();
    bus.emit('red');
    bus.emit('seleccion');
    bus.emit('carga');
    if (mensaje) toast(mensaje, 'ok');
  }

  async function confirmarDescarte() {
    if (!app.red.nodos.length) return true;
    return confirmar('Reemplazar la red actual', 'La red que tienes ahora se reemplazará. Si no la has guardado en un archivo, se perderán los cambios.', 'Continuar', true);
  }

  /* ------------------------------ acciones barra ------------------------------ */

  async function nuevaRed() {
    if (!(await confirmarDescarte())) return;
    cargarRed(RB.Red.crearRed('Mi red bayesiana'), null, 'Red nueva en blanco.');
  }

  function guardarRed() {
    const v = RB.Red.validar(app.red);
    const texto = RB.Almacenamiento.serializar(app.red, app.consulta.vars.length ? { consulta: app.consulta.vars, evidencia: app.consulta.evidencia } : null);
    RB.Almacenamiento.descargarTexto(RB.Almacenamiento.nombreDeArchivo(app.red), texto);
    toast(v.ok ? 'Red guardada en tu carpeta de descargas.' : 'Guardada, pero la red aún tiene problemas pendientes.', v.ok ? 'ok' : 'info');
  }

  async function abrirArchivo(archivo) {
    if (!archivo) return;
    let texto;
    try {
      texto = await RB.Almacenamiento.leerArchivo(archivo);
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
    const r = RB.Almacenamiento.deserializar(texto);
    if (!r.ok) {
      modal('No se pudo abrir el archivo', [h('p', {}, `"${archivo.name}" no es una red válida:`), listaDeErrores(r.errores)]);
      return;
    }
    if (!(await confirmarDescarte())) return;
    cargarRed(r.red, r.consulta, `Se abrió "${r.red.nombre}" (${r.red.nodos.length} nodos).`);
    if (r.avisos.length) toast(r.avisos[0], 'info');
  }

  async function abrirEjemplo(id) {
    const ej = (RB.EJEMPLOS || []).find((e) => e.id === id);
    if (!ej) return;
    if (!(await confirmarDescarte())) return;
    cargarRed(RB.Red.clonar(ej.red), ej.consulta, `Ejemplo cargado: ${ej.titulo}.`);
  }

  /* ------------------------------ menú de ejemplos ------------------------------ */

  function armarMenuEjemplos() {
    const menu = $('menuEjemplos');
    menu.replaceChildren();
    (RB.EJEMPLOS || []).forEach((e) => {
      menu.append(
        h('button', { type: 'button', role: 'menuitem', class: 'menu-item', onClick: () => { cerrarMenu(); abrirEjemplo(e.id); } },
          h('strong', {}, e.titulo),
          h('small', {}, e.red.descripcion)
        )
      );
    });
    if (!(RB.EJEMPLOS || []).length) menu.append(h('p', { class: 'vacio chico' }, 'No se encontraron ejemplos.'));
  }
  function cerrarMenu() {
    $('menuEjemplos').hidden = true;
    $('btnEjemplos').setAttribute('aria-expanded', 'false');
  }

  /* ------------------------------ ayuda ------------------------------ */

  function mostrarAyuda() {
    modal('Cómo usar la aplicación', [
      h('ol', { class: 'ayuda-lista' },
        h('li', {}, h('b', {}, 'Construye la red. '), 'Agrega entre 3 y 10 nodos. Selecciona un nodo para definir sus estados, marcar sus padres (las flechas que llegan a él) y llenar su tabla de probabilidad condicional.'),
        h('li', {}, h('b', {}, 'Revisa que sea válida. '), 'El recuadro de estado te avisa de ciclos, filas que no suman 1 y otros errores.'),
        h('li', {}, h('b', {}, 'Consulta. '), 'En el panel derecho elige qué quieres saber, qué evidencia tienes y pulsa «Ejecutar». El resultado se compara automáticamente con un cálculo independiente.'),
        h('li', {}, h('b', {}, 'Guarda e imprime. '), '«Guardar» descarga un archivo .json que puedes volver a abrir. «Imprimir informe» genera la estructura, las tablas y la consulta; también sirve para guardar como PDF.')
      ),
      h('p', { class: 'ayuda' }, 'Tip: arrastra los nodos con el mouse para ordenarlos. También puedes soltar un archivo .json sobre la ventana para abrirlo.')
    ]);
  }

  /* ---------------------------------- init ---------------------------------- */

  function init() {
    RB.Grafo.init($('grafo'), app);
    RB.Editor.init(app);
    RB.Consulta.init(app);

    armarMenuEjemplos();

    $('btnNueva').addEventListener('click', nuevaRed);
    $('btnGuardar').addEventListener('click', guardarRed);
    $('btnAbrir').addEventListener('click', () => $('archivoEntrada').click());
    $('archivoEntrada').addEventListener('change', (e) => {
      abrirArchivo(e.target.files[0]);
      e.target.value = '';
    });
    $('btnImprimir').addEventListener('click', () => {
      if (!app.red.nodos.length) return toast('No hay nada que imprimir todavía.', 'info');
      RB.Informe.imprimir(app);
    });
    $('btnReorganizar').addEventListener('click', () => RB.Grafo.reorganizar());
    $('btnAyuda').addEventListener('click', mostrarAyuda);

    $('btnEjemplos').addEventListener('click', (e) => {
      e.stopPropagation();
      const abierto = !$('menuEjemplos').hidden;
      $('menuEjemplos').hidden = abierto;
      $('btnEjemplos').setAttribute('aria-expanded', String(!abierto));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menu-contenedor')) cerrarMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrarMenu();
    });

    $('nombreRed').addEventListener('change', (e) => {
      const nombre = e.target.value.trim();
      app.red.nombre = nombre || 'Mi red bayesiana';
      e.target.value = app.red.nombre;
      guardarBorrador();
    });

    // Arrastrar y soltar un archivo
    let contador = 0;
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      contador++;
      document.body.classList.add('arrastrando');
    });
    window.addEventListener('dragleave', () => {
      contador = Math.max(0, contador - 1);
      if (!contador) document.body.classList.remove('arrastrando');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      contador = 0;
      document.body.classList.remove('arrastrando');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) abrirArchivo(f);
    });

    // Recuperar el último borrador; si no hay, empezar con el primer ejemplo
    const borrador = RB.Almacenamiento.cargarBorrador();
    if (borrador) {
      cargarRed(borrador.red, borrador.consulta, null);
      toast('Se recuperó tu último trabajo.', 'info');
    } else if ((RB.EJEMPLOS || []).length) {
      const ej = RB.EJEMPLOS[0];
      cargarRed(RB.Red.clonar(ej.red), ej.consulta, null);
    } else {
      bus.emit('red');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
