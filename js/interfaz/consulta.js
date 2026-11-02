/* ============================================================================
 * consulta.js  ·  PARTE 3 (Consultas y resultados)
 *
 * Panel derecho: elegir variables de consulta, poner evidencia, ejecutar la
 * eliminación de variables y mostrar el resultado (con sus pasos y la
 * verificación contra la enumeración exhaustiva).
 * ========================================================================== */
(function () {
  'use strict';
  const RB = window.RB;
  const { h, prob, pct, bus, toast } = RB.UI;
  let app;

  const $ = (id) => document.getElementById(id);

  const HEURISTICAS = [
    ['minfill', 'Automático · mínimo relleno (min-fill)'],
    ['mingrado', 'Automático · mínimo grado'],
    ['lista', 'En el orden de la lista de nodos'],
    ['manual', 'Personalizado (yo elijo el orden)']
  ];

  /* ------------------------------- formulario ------------------------------- */

  function cambioDeSeleccion() {
    app.resultadoError = null;
    bus.emit('consulta');
    renderFormulario();
    renderResultado();
  }

  function alternarConsulta(nombre) {
    const vars = app.consulta.vars;
    const i = vars.indexOf(nombre);
    if (i >= 0) vars.splice(i, 1);
    else {
      vars.push(nombre);
      delete app.consulta.evidencia[nombre];
    }
    cambioDeSeleccion();
  }

  function ponerEvidencia(nombre, estado) {
    if (estado === '') delete app.consulta.evidencia[nombre];
    else {
      app.consulta.evidencia[nombre] = estado;
      const i = app.consulta.vars.indexOf(nombre);
      if (i >= 0) app.consulta.vars.splice(i, 1);
    }
    cambioDeSeleccion();
  }

  function renderFormulario() {
    const cont = $('formConsulta');
    cont.replaceChildren();
    const red = app.red;
    const c = app.consulta;

    if (!red.nodos.length) {
      cont.append(h('p', { class: 'vacio' }, 'Cuando haya nodos podrás elegir qué consultar.'));
      return;
    }

    cont.append(
      h('div', { class: 'bloque' },
        h('label', { class: 'etiqueta' }, '1 · ¿Qué quieres saber? (variables de consulta)'),
        h('div', { class: 'chips' }, red.nodos.map((n) =>
          h('button', {
            type: 'button', class: 'chip' + (c.vars.includes(n.nombre) ? ' chip-consulta' : ''),
            'aria-pressed': c.vars.includes(n.nombre) ? 'true' : 'false',
            onClick: () => alternarConsulta(n.nombre)
          }, n.nombre)
        ))
      )
    );

    cont.append(
      h('div', { class: 'bloque' },
        h('label', { class: 'etiqueta' }, '2 · ¿Qué ya sabes? (evidencia)'),
        h('div', { class: 'evidencias' }, red.nodos.map((n) => {
          const enConsulta = c.vars.includes(n.nombre);
          const sel = h('select', { class: 'campo campo-chico', disabled: enConsulta, 'aria-label': `Evidencia de ${n.nombre}`, value: c.evidencia[n.nombre] || '' },
            h('option', { value: '' }, enConsulta ? '(es de consulta)' : '— sin evidencia —'),
            n.estados.map((e) => h('option', { value: e }, e))
          );
          sel.addEventListener('change', () => ponerEvidencia(n.nombre, sel.value));
          return h('div', { class: 'evidencia-fila' + (n.nombre in c.evidencia ? ' con-evidencia' : '') }, h('span', {}, n.nombre), sel);
        }))
      )
    );

    const selOrden = h('select', { class: 'campo', 'aria-label': 'Orden de eliminación', value: c.heuristica },
      HEURISTICAS.map(([v, t]) => h('option', { value: v }, t))
    );
    selOrden.addEventListener('change', () => {
      c.heuristica = selOrden.value;
      renderFormulario();
    });
    const bloqueOrden = h('div', { class: 'bloque' }, h('label', { class: 'etiqueta' }, '3 · Orden de eliminación'), selOrden);
    if (c.heuristica === 'manual') {
      const ocultas = red.nodos.map((n) => n.nombre).filter((v) => !c.vars.includes(v) && !(v in c.evidencia));
      const inp = h('input', { type: 'text', class: 'campo', value: c.ordenManual, placeholder: ocultas.join(', ') || '(no hay variables por eliminar)', 'aria-label': 'Orden manual' });
      inp.addEventListener('input', () => (c.ordenManual = inp.value));
      bloqueOrden.append(inp, h('p', { class: 'ayuda' }, `Escribe estas variables separadas por comas en el orden que quieras: ${ocultas.join(', ') || '(ninguna)'}.`));
    }
    cont.append(bloqueOrden);

    // Estado: ¿se puede ejecutar?
    const v = RB.Red.validar(red);
    const motivos = [];
    if (!v.ok) motivos.push('Corrige los problemas de la red (panel izquierdo).');
    if (!c.vars.length) motivos.push('Elige al menos una variable de consulta.');
    cont.append(
      h('button', { class: 'btn btn-primario btn-grande', type: 'button', id: 'btnEjecutar', disabled: motivos.length > 0, onClick: ejecutar }, '▶ Ejecutar eliminación de variables')
    );
    if (motivos.length) cont.append(h('p', { class: 'ayuda ayuda-mal' }, motivos.join(' ')));
  }

  /* -------------------------------- ejecutar -------------------------------- */

  function ejecutar() {
    const c = app.consulta;
    app.resultadoError = null;
    try {
      let orden = null;
      if (c.heuristica === 'manual') {
        orden = c.ordenManual.split(',').map((s) => s.trim()).filter(Boolean);
      }
      const res = RB.Inferencia.eliminacionDeVariables(app.red, c.vars, c.evidencia, {
        heuristica: c.heuristica === 'manual' ? 'minfill' : c.heuristica,
        orden
      });
      res.verificacion = RB.Inferencia.compararConReferencia(app.red, res);
      res.firma = JSON.stringify([c.vars, c.evidencia]);
      res.fecha = new Date();
      app.resultado = res;
    } catch (e) {
      app.resultado = null;
      app.resultadoError = e.message;
    }
    bus.emit('resultado');
    renderResultado();
    const r = $('resultado');
    if (r && r.scrollIntoView) r.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* -------------------------------- resultado -------------------------------- */

  function tablaDeFactor(f) {
    const filas = f.valores.map((v, i) => h('tr', {}, RB.Inferencia.etiquetasDeIndice(f, i).map((e) => h('td', {}, e)), h('td', { class: 'num' }, prob(v))));
    return h('table', { class: 'mini-tabla' },
      h('thead', {}, h('tr', {}, f.vars.map((v) => h('th', {}, v)), h('th', {}, f.vars.length ? 'valor' : 'valor (constante)'))),
      h('tbody', {}, filas)
    );
  }

  function pasosHtml(res) {
    const items = res.pasos.map((p) => {
      if (p.tipo === 'inicio') {
        return h('li', {}, h('strong', {}, 'Factores iniciales (una CPT por nodo): '), p.factores.join(' · '));
      }
      if (p.tipo === 'evidencia') {
        return h('li', {}, h('strong', {}, `Evidencia ${p.variable} = ${p.estado}: `), p.factores.length ? `se restringen ${p.factores.join(', ')}.` : 'ningún factor la contiene.');
      }
      if (p.tipo === 'eliminacion') {
        return h('li', {},
          h('strong', {}, `Eliminar ${p.variable}: `),
          `se multiplican ${p.usados.join(' × ')} → ${p.producto}; se suma sobre ${p.variable} → `, h('em', {}, p.resultado), '.',
          h('details', { class: 'sub-detalle' }, h('summary', {}, `Ver ${p.resultado}`), tablaDeFactor(p.tabla))
        );
      }
      return h('li', {}, h('strong', {}, 'Resultado: '), `se multiplican ${p.factores.join(' × ')}; la suma total es P(evidencia) = ${prob(p.Z)}; al dividir entre ella se normaliza.`);
    });
    return h('ol', { class: 'pasos' }, items);
  }

  function renderResultado() {
    const cont = $('resultado');
    cont.replaceChildren();

    if (app.resultadoError) {
      cont.append(h('div', { class: 'tarjeta tarjeta-error' }, h('strong', {}, 'No se pudo calcular'), h('p', {}, app.resultadoError)));
      return;
    }
    const res = app.resultado;
    if (!res) {
      cont.append(h('p', { class: 'vacio' }, 'Aquí aparecerá la distribución calculada, con el detalle paso a paso.'));
      return;
    }

    const desactualizado = res.firma !== JSON.stringify([app.consulta.vars, app.consulta.evidencia]);
    const evTexto = Object.keys(res.evidencia).map((k) => `${k} = ${res.evidencia[k]}`);

    const titulo = `P(${res.consulta.join(', ')}${evTexto.length ? ' | ' + evTexto.join(', ') : ''})`;

    // barras de la distribución conjunta
    const f = res.distribucion;
    const maximo = Math.max.apply(null, f.valores);
    const filas = f.valores.map((p, i) =>
      h('tr', {},
        RB.Inferencia.etiquetasDeIndice(f, i).map((e) => h('td', { class: 'td-estado' }, e)),
        h('td', { class: 'num' }, prob(p)),
        h('td', { class: 'barra-celda' },
          h('div', { class: 'barra-pista' }, h('div', { class: 'barra', style: `width:${maximo > 0 ? (p / maximo) * 100 : 0}%` })),
          h('span', { class: 'pct' }, pct(p))
        )
      )
    );
    const tabla = h('table', { class: 'resultado-tabla' },
      h('thead', {}, h('tr', {}, res.consulta.map((q) => h('th', {}, q)), h('th', {}, 'Probabilidad'), h('th', {}, ''))),
      h('tbody', {}, filas)
    );

    // marginales (solo si hay más de una variable de consulta)
    let marginales = null;
    if (res.consulta.length > 1) {
      marginales = h('div', { class: 'marginales' },
        h('h4', {}, 'Probabilidad de cada variable por separado'),
        res.consulta.map((q) =>
          h('div', { class: 'marginal' }, h('strong', {}, q), res.marginales[q].map((m) => h('span', { class: 'marginal-dato' }, `${m.estado}: ${pct(m.p)}`)))
        )
      );
    }

    // verificación
    const ver = res.verificacion;
    let bloqueVer;
    if (!ver.disponible) bloqueVer = h('div', { class: 'verif neutra' }, ver.motivo);
    else if (ver.ok) {
      bloqueVer = h('div', { class: 'verif ok' },
        h('strong', {}, '✓ Verificado. '),
        `Coincide con la enumeración exhaustiva de la distribución conjunta (diferencia máxima ${ver.maxDiferencia.toExponential(1)}).`
      );
    } else {
      bloqueVer = h('div', { class: 'verif mal' }, h('strong', {}, '✗ No coincide '), `con la referencia (diferencia ${ver.maxDiferencia.toExponential(2)}). Revisa la implementación.`);
    }

    const nombreOrden = { manual: 'personalizado', minfill: 'mínimo relleno', mingrado: 'mínimo grado', lista: 'orden de la lista' }[res.heuristica];

    cont.append(
      h('div', { class: 'tarjeta' + (desactualizado ? ' obsoleta' : '') },
        desactualizado ? h('div', { class: 'banner-obsoleto' }, 'La selección cambió: vuelve a ejecutar para actualizar este resultado.') : null,
        h('div', { class: 'res-titulo' }, titulo),
        h('div', { class: 'res-meta' },
          h('div', {}, h('span', { class: 'meta-etq' }, 'Consulta'), res.consulta.map((q) => h('span', { class: 'pastilla consulta' }, q))),
          h('div', {}, h('span', { class: 'meta-etq' }, 'Evidencia'), evTexto.length ? evTexto.map((t) => h('span', { class: 'pastilla evidencia' }, t)) : h('span', { class: 'meta-vacio' }, 'ninguna')),
          h('div', {}, h('span', { class: 'meta-etq' }, 'P(evidencia)'), h('span', { class: 'mono' }, prob(res.probEvidencia))),
          h('div', {}, h('span', { class: 'meta-etq' }, 'Se eliminó'), h('span', { class: 'mono' }, res.ordenEliminacion.length ? res.ordenEliminacion.join(' → ') : '(nada que eliminar)'), h('span', { class: 'meta-vacio' }, ` · ${nombreOrden}`))
        ),
        tabla,
        marginales,
        bloqueVer,
        h('details', { class: 'detalle' }, h('summary', {}, 'Ver el algoritmo paso a paso'), pasosHtml(res)),
        h('div', { class: 'fila' },
          h('button', { class: 'btn btn-suave', type: 'button', onClick: () => RB.Informe.imprimir(app) }, '🖨 Imprimir informe'),
          h('button', { class: 'btn btn-suave', type: 'button', onClick: () => RB.Informe.descargar(app) }, '⬇ Descargar HTML')
        )
      )
    );
  }

  /* ---------------------------------- init ---------------------------------- */

  function init(aplicacion) {
    app = aplicacion;
    bus.on('red', () => {
      renderFormulario();
      renderResultado();
    });
    bus.on('carga', () => {
      renderFormulario();
      renderResultado();
    });
    renderFormulario();
    renderResultado();
  }

  RB.Consulta = { init, ejecutar, renderFormulario, renderResultado };
})();
