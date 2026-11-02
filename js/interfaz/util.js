/* ============================================================================
 * util.js  ·  PARTE 2 (Interfaz)
 *
 * Herramientas pequeñas para la pantalla: crear elementos HTML con h(),
 * formatear probabilidades, avisos (toast) y ventanas de confirmación.
 * ========================================================================== */
(function () {
  'use strict';
  const RB = (window.RB = window.RB || {});

  // h('div', { class: 'caja', onClick: fn }, 'texto', otroElemento)
  function h(tag, props, ...hijos) {
    const el = document.createElement(tag);
    const propiedades = {};
    Object.keys(props || {}).forEach((k) => {
      const v = props[k];
      if (v === false || v == null) return;
      if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (['value', 'checked', 'disabled', 'selected', 'hidden'].includes(k)) propiedades[k] = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    const poner = (x) => {
      if (x == null || x === false) return;
      if (Array.isArray(x)) x.forEach(poner);
      else el.appendChild(x instanceof Node ? x : document.createTextNode(String(x)));
    };
    hijos.forEach(poner);
    Object.keys(propiedades).forEach((k) => (el[k] = propiedades[k]));
    return el;
  }

  const prob = (p) => (isFinite(p) ? p.toFixed(6) : '—');
  const pct = (p) => (isFinite(p) ? (p * 100).toFixed(2) + ' %' : '—');

  function toast(mensaje, tipo) {
    const cont = document.getElementById('toasts');
    const el = h('div', { class: 'toast ' + (tipo || 'info'), role: 'status' }, mensaje);
    cont.appendChild(el);
    setTimeout(() => el.classList.add('sale'), 3600);
    setTimeout(() => el.remove(), 4000);
  }

  // Ventana modal. acciones: [{ texto, valor, primario, peligro }]. Devuelve una promesa con el valor elegido.
  function modal(titulo, cuerpo, acciones) {
    return new Promise((resolve) => {
      const dlg = document.getElementById('dialogo');
      const caja = dlg.querySelector('.dlg-cuerpo');
      dlg.querySelector('.dlg-titulo').textContent = titulo;
      caja.replaceChildren(...(Array.isArray(cuerpo) ? cuerpo : [cuerpo]).map((x) => (x instanceof Node ? x : h('p', {}, x))));
      const pie = dlg.querySelector('.dlg-pie');
      pie.replaceChildren();
      let valor = null;
      (acciones || [{ texto: 'Entendido', valor: true, primario: true }]).forEach((a) => {
        pie.appendChild(
          h(
            'button',
            {
              class: 'btn ' + (a.primario ? 'btn-primario' : '') + (a.peligro ? ' btn-peligro' : ''),
              type: 'button',
              onClick: () => {
                valor = a.valor;
                dlg.close();
              }
            },
            a.texto
          )
        );
      });
      dlg.addEventListener('close', () => resolve(valor), { once: true });
      dlg.showModal();
    });
  }

  function confirmar(titulo, texto, textoOk, peligro) {
    return modal(titulo, texto, [
      { texto: 'Cancelar', valor: false },
      { texto: textoOk || 'Aceptar', valor: true, primario: !peligro, peligro: !!peligro }
    ]);
  }

  function listaDeErrores(errores) {
    return h('ul', { class: 'lista-errores' }, errores.map((e) => h('li', {}, e)));
  }

  // Pequeño sistema de eventos para que los paneles se enteren de los cambios.
  const oyentes = {};
  const bus = {
    on(evento, fn) {
      (oyentes[evento] = oyentes[evento] || []).push(fn);
    },
    emit(evento, datos) {
      (oyentes[evento] || []).forEach((fn) => fn(datos || {}));
    }
  };

  RB.UI = { h, prob, pct, toast, modal, confirmar, listaDeErrores, bus };
})();
