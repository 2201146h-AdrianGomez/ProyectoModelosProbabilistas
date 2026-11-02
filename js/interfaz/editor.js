/* ============================================================================
 * editor.js  ·  PARTE 2 (Interfaz)
 *
 * Panel izquierdo: estado de la red, lista de nodos, alta de nodos y el
 * formulario de propiedades de un nodo (nombre, estados, padres y CPT).
 * ========================================================================== */
(function () {
  'use strict';
  const RB = window.RB;
  const { h, toast, confirmar, bus } = RB.UI;
  let app;

  const $ = (id) => document.getElementById(id);

  /* ---------------------------- estado de la red ---------------------------- */

  function renderEstado() {
    const cont = $('estadoRed');
    const red = app.red;
    const v = RB.Red.validar(red);
    cont.replaceChildren();
    cont.className = 'estado-red ' + (v.ok ? 'ok' : 'mal');
    cont.append(
      h('div', { class: 'estado-linea' },
        h('span', { class: 'estado-icono' }, v.ok ? '✓' : '!'),
        h('strong', {}, v.ok ? 'Red válida' : 'La red aún no es válida'),
        h('span', { class: 'estado-conteo' }, `${red.nodos.length}/${RB.Red.MAX_NODOS} nodos`)
      )
    );
    if (!v.ok) {
      const mostrar = v.errores.slice(0, 3);
      cont.append(RB.UI.listaDeErrores(mostrar));
      if (v.errores.length > 3) {
        cont.append(
          h('button', { class: 'enlace', type: 'button', onClick: () => RB.UI.modal('Problemas de la red', RB.UI.listaDeErrores(v.errores)) }, `Ver los ${v.errores.length} problemas`)
        );
      }
    } else if (v.avisos.length) {
      cont.append(h('p', { class: 'aviso' }, v.avisos[0]));
    }
  }

  /* ------------------------------ lista de nodos ----------------------------- */

  function renderLista() {
    const cont = $('listaNodos');
    cont.replaceChildren();
    if (!app.red.nodos.length) {
      cont.append(h('p', { class: 'vacio' }, 'Sin nodos todavía.'));
    }
    app.red.nodos.forEach((n) => {
      const meta = n.padres.length ? `← ${n.padres.join(', ')}` : 'sin padres';
      cont.append(
        h('button', {
          class: 'nodo-item' + (app.seleccion === n.nombre ? ' activo' : ''),
          type: 'button',
          onClick: () => {
            app.seleccion = n.nombre;
            bus.emit('seleccion');
          }
        },
          h('span', { class: 'nodo-punto' }),
          h('span', { class: 'nodo-texto' }, h('strong', {}, n.nombre), h('small', {}, `${n.estados.length} estados · ${meta}`))
        )
      );
    });
    $('btnAgregarNodo').disabled = app.red.nodos.length >= RB.Red.MAX_NODOS;
  }

  function agregarNodo(ev) {
    ev.preventDefault();
    const campo = $('nuevoNodo');
    try {
      const nodo = RB.Red.agregarNodo(app.red, campo.value);
      nodo.posicion = RB.Red.posicionLibre(app.red, RB.Grafo.W, RB.Grafo.H);
      campo.value = '';
      app.seleccion = nodo.nombre;
      bus.emit('red');
      bus.emit('seleccion');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  /* ------------------------------- propiedades ------------------------------- */

  function aviso(afectados) {
    if (afectados && afectados.length) {
      toast('Se reinició la tabla de probabilidad de: ' + afectados.join(', ') + '.', 'info');
    }
  }

  function renderPropiedades() {
    const cont = $('propNodo');
    cont.replaceChildren();
    const nodo = app.seleccion ? RB.Red.buscar(app.red, app.seleccion) : null;
    if (!nodo) {
      cont.append(h('p', { class: 'vacio' }, 'Selecciona un nodo en el grafo o en la lista para ver y editar sus estados, sus padres y su tabla de probabilidad.'));
      return;
    }

    /* nombre + borrar */
    const inputNombre = h('input', { type: 'text', class: 'campo', value: nodo.nombre, maxlength: 40, 'aria-label': 'Nombre del nodo' });
    inputNombre.addEventListener('change', () => {
      const viejo = nodo.nombre;
      try {
        RB.Red.renombrarNodo(app.red, viejo, inputNombre.value);
        const nuevo = nodo.nombre;
        app.seleccion = nuevo;
        app.consulta.vars = app.consulta.vars.map((x) => (x === viejo ? nuevo : x));
        if (viejo in app.consulta.evidencia) {
          app.consulta.evidencia[nuevo] = app.consulta.evidencia[viejo];
          delete app.consulta.evidencia[viejo];
        }
        bus.emit('red');
        bus.emit('seleccion');
      } catch (e) {
        toast(e.message, 'error');
        inputNombre.value = viejo;
      }
    });
    const btnBorrar = h('button', {
      class: 'btn btn-icono btn-peligro-suave', type: 'button', title: 'Eliminar nodo', 'aria-label': 'Eliminar nodo',
      onClick: async () => {
        const ok = await confirmar('Eliminar nodo', `¿Eliminar "${nodo.nombre}"? Sus conexiones también se quitarán.`, 'Eliminar', true);
        if (!ok) return;
        const afectados = RB.Red.eliminarNodo(app.red, nodo.nombre);
        app.seleccion = null;
        bus.emit('red');
        bus.emit('seleccion');
        aviso(afectados);
      }
    }, '🗑');
    cont.append(h('div', { class: 'bloque' }, h('label', { class: 'etiqueta' }, 'Nombre del nodo'), h('div', { class: 'fila' }, inputNombre, btnBorrar)));

    /* estados */
    const lista = h('div', { class: 'estados' });
    nodo.estados.forEach((e, i) => {
      const inp = h('input', { type: 'text', class: 'campo', value: e, maxlength: 30, 'aria-label': `Estado ${i + 1}` });
      inp.addEventListener('change', () => {
        const anterior = nodo.estados[i];
        try {
          RB.Red.renombrarEstado(app.red, nodo.nombre, i, inp.value);
          if (app.consulta.evidencia[nodo.nombre] === anterior) app.consulta.evidencia[nodo.nombre] = nodo.estados[i];
          bus.emit('red', { origen: 'estado' });
        } catch (err) {
          toast(err.message, 'error');
          inp.value = anterior;
        }
      });
      const quitar = h('button', {
        class: 'btn btn-icono', type: 'button', title: 'Quitar estado', 'aria-label': 'Quitar estado', disabled: nodo.estados.length <= RB.Red.MIN_ESTADOS,
        onClick: () => {
          try {
            const afectados = RB.Red.establecerEstados(app.red, nodo.nombre, nodo.estados.filter((_, j) => j !== i));
            bus.emit('red');
            aviso(afectados);
          } catch (err) {
            toast(err.message, 'error');
          }
        }
      }, '✕');
      lista.append(h('div', { class: 'fila' }, h('span', { class: 'num-estado' }, i + 1), inp, quitar));
    });
    const agregar = h('button', {
      class: 'btn btn-suave', type: 'button', disabled: nodo.estados.length >= RB.Red.MAX_ESTADOS,
      onClick: () => {
        let k = nodo.estados.length + 1;
        while (nodo.estados.includes('Estado ' + k)) k++;
        try {
          const afectados = RB.Red.establecerEstados(app.red, nodo.nombre, nodo.estados.concat(['Estado ' + k]));
          bus.emit('red');
          aviso(afectados);
        } catch (err) {
          toast(err.message, 'error');
        }
      }
    }, '＋ Agregar estado');
    cont.append(h('div', { class: 'bloque' }, h('label', { class: 'etiqueta' }, 'Estados posibles'), lista, agregar));

    /* padres */
    const prohibidos = RB.Red.descendientes(app.red, nodo.nombre);
    const otros = app.red.nodos.filter((n) => n.nombre !== nodo.nombre);
    const casillas = otros.length
      ? h('div', { class: 'padres' }, otros.map((o) => {
          const ciclo = prohibidos.has(o.nombre);
          const cb = h('input', { type: 'checkbox', checked: nodo.padres.includes(o.nombre), disabled: ciclo });
          cb.addEventListener('change', () => {
            const seleccion = new Set(nodo.padres);
            if (cb.checked) seleccion.add(o.nombre);
            else seleccion.delete(o.nombre);
            const nuevos = app.red.nodos.map((n) => n.nombre).filter((x) => seleccion.has(x));
            try {
              RB.Red.establecerPadres(app.red, nodo.nombre, nuevos);
              bus.emit('red');
              aviso([nodo.nombre]);
            } catch (err) {
              toast(err.message, 'error');
              cb.checked = !cb.checked;
            }
          });
          return h('label', { class: 'casilla' + (ciclo ? ' desactivada' : ''), title: ciclo ? 'Crearía un ciclo' : '' }, cb, h('span', {}, o.nombre));
        }))
      : h('p', { class: 'vacio chico' }, 'Agrega más nodos para poder conectarlos.');
    cont.append(h('div', { class: 'bloque' }, h('label', { class: 'etiqueta' }, 'Padres (flechas que llegan a este nodo)'), casillas));

    /* CPT */
    cont.append(construirCpt(nodo));
  }

  function construirCpt(nodo) {
    const red = app.red;
    const k = nodo.estados.length;
    const sumas = [];

    const pintarSuma = (i) => {
      const s = nodo.cpt[i].reduce((a, b) => a + (isFinite(b) ? b : NaN), 0);
      const celda = sumas[i];
      celda.textContent = isFinite(s) ? String(RB.Red.redondear(s)) : '—';
      celda.className = 'suma ' + (isFinite(s) && Math.abs(s - 1) <= RB.Red.TOLERANCIA ? 'ok' : 'mal');
    };

    const encabezado = h('tr', {},
      nodo.padres.map((p) => h('th', { class: 'th-padre' }, p)),
      nodo.estados.map((e) => h('th', { class: 'th-estado' }, `P(${e})`)),
      h('th', { class: 'th-suma' }, 'Σ')
    );

    const filas = nodo.cpt.map((fila, i) => {
      const comb = nodo.padres.length ? RB.Red.combinacionDeFila(red, nodo, i) : null;
      const inputs = [];
      const celdas = fila.map((valor, j) => {
        const inp = h('input', { type: 'number', step: 'any', min: 0, max: 1, class: 'celda-prob', value: isFinite(valor) ? String(RB.Red.redondear(valor)) : '', 'aria-label': `P(${nodo.estados[j]})` });
        inputs.push(inp);
        inp.addEventListener('input', () => {
          const x = inp.value === '' ? NaN : parseFloat(inp.value);
          nodo.cpt[i][j] = x;
          // Con 2 estados, el otro se completa solo (1 - p)
          if (k === 2 && isFinite(x)) {
            const otro = RB.Red.redondear(1 - x);
            nodo.cpt[i][1 - j] = otro;
            inputs[1 - j].value = String(otro);
          }
          pintarSuma(i);
          bus.emit('red', { origen: 'cpt' });
        });
        return h('td', {}, inp);
      });
      const suma = h('td', { class: 'suma' });
      sumas.push(suma);
      return h('tr', {}, comb ? comb.map((c) => h('td', { class: 'td-padre' }, c.estado)) : null, celdas, suma);
    });

    const tabla = h('table', { class: 'cpt' }, h('thead', {}, encabezado), h('tbody', {}, filas));
    nodo.cpt.forEach((_, i) => pintarSuma(i));

    const titulo = nodo.padres.length ? `P(${nodo.nombre} | ${nodo.padres.join(', ')})` : `P(${nodo.nombre})`;
    return h('div', { class: 'bloque' },
      h('label', { class: 'etiqueta' }, 'Tabla de probabilidad condicional'),
      h('div', { class: 'cpt-titulo' }, titulo),
      h('div', { class: 'cpt-scroll' }, tabla),
      h('p', { class: 'ayuda' }, k === 2 ? 'Cada fila debe sumar 1. Con 2 estados, el segundo valor se completa solo.' : 'Cada fila debe sumar 1.'),
      h('div', { class: 'fila' },
        h('button', { class: 'btn btn-suave', type: 'button', onClick: () => { nodo.cpt = RB.Red.normalizarCpt(nodo.cpt); bus.emit('red'); } }, 'Normalizar filas'),
        h('button', { class: 'btn btn-suave', type: 'button', onClick: () => { nodo.cpt = RB.Red.cptUniforme(app.red, nodo); bus.emit('red'); } }, 'Uniforme')
      )
    );
  }

  /* ---------------------------------- init ---------------------------------- */

  function renderTodo() {
    renderEstado();
    renderLista();
    renderPropiedades();
  }

  function init(aplicacion) {
    app = aplicacion;
    $('formNodo').addEventListener('submit', agregarNodo);
    bus.on('red', (d) => {
      renderEstado();
      renderLista();
      if (d.origen !== 'cpt') renderPropiedades();
    });
    bus.on('seleccion', () => {
      renderLista();
      renderPropiedades();
    });
    renderTodo();
  }

  RB.Editor = { init };
})();
