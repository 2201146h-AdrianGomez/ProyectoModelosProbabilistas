/* ============================================================================
 * grafo.js  ·  PARTE 2 (Interfaz)
 *
 * Dibuja la red como un grafo dirigido en un SVG:
 *   - cada nodo es una caja con su nombre; se puede ARRASTRAR para moverlo
 *   - cada arista es una flecha de padre a hijo
 *   - nodos de consulta (verde azulado) y de evidencia (ámbar) se resaltan
 *
 * Todo el estilo va "en línea" (atributos) para que el mismo SVG se pueda
 * copiar tal cual al informe de impresión.
 * ========================================================================== */
(function () {
  'use strict';
  const RB = window.RB;
  const { bus } = RB.UI;
  const NS = 'http://www.w3.org/2000/svg';

  // Tamaño lógico del lienzo. El ancho es fijo; el alto se adapta a la proporción
  // real del espacio disponible (ver ajustarLienzo) para aprovechar la pantalla.
  let W = 900;
  let H = 580;
  const ALTO = 60;

  const COLOR = {
    fondo: '#ffffff', borde: '#818cf8', texto: '#1b2236', sub: '#667085',
    consultaFondo: '#ccfbf1', consultaBorde: '#0d9488',
    evidFondo: '#fef3c7', evidBorde: '#d97706',
    arista: '#8590ad', sel: '#4f46e5'
  };

  let svg, app;
  let gAristas, gNodos;
  let vistaNodos = {}; // nombre -> { g, rect, halo, titulo, sub }
  let vistaAristas = []; // { padre, hijo, path }
  let arrastre = null;

  const el = (nombre, attrs, texto) => {
    const e = document.createElementNS(NS, nombre);
    Object.keys(attrs || {}).forEach((k) => e.setAttribute(k, attrs[k]));
    if (texto != null) e.textContent = texto;
    return e;
  };

  const anchoDe = (nombre) => Math.max(120, Math.round(nombre.length * 10) + 38);

  // Recorta un texto con "…" para que quepa dentro de la caja de un nodo
  const recortar = (texto, ancho) => {
    const max = Math.max(6, Math.floor((ancho - 16) / 6.8));
    return texto.length > max ? texto.slice(0, max - 1) + '…' : texto;
  };

  // Ajusta el alto lógico a la proporción del espacio real y evita recortar nodos ya colocados
  function ajustarLienzo() {
    const caja = svg.getBoundingClientRect();
    if (caja.width > 0 && caja.height > 0) {
      H = Math.max(480, Math.min(760, Math.round((W * caja.height) / caja.width)));
    }
    const bajo = app.red.nodos.filter((n) => n.posicion).map((n) => n.posicion.y + ALTO / 2 + 10);
    H = Math.max(H, Math.ceil(Math.max(0, ...bajo)));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }

  /* ----------------------------- construcción ----------------------------- */

  function construir() {
    ajustarLienzo();
    svg.replaceChildren();
    vistaNodos = {};
    vistaAristas = [];

    const defs = el('defs');
    [['flecha', COLOR.arista], ['flechaSel', COLOR.sel]].forEach(([id, color]) => {
      const m = el('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 9, markerHeight: 9, orient: 'auto' });
      m.appendChild(el('path', { d: 'M0 0 L10 5 L0 10 z', fill: color }));
      defs.appendChild(m);
    });
    svg.appendChild(defs);

    const red = app.red;
    if (!red.nodos.length) {
      svg.appendChild(el('text', { x: W / 2, y: H / 2 - 6, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: '#98a2b3' }, 'Aún no hay nodos'));
      svg.appendChild(el('text', { x: W / 2, y: H / 2 + 22, 'text-anchor': 'middle', 'font-size': 14, fill: '#98a2b3' }, 'Agrega uno desde el panel izquierdo o abre un ejemplo.'));
      return;
    }

    // Los nodos sin posición (recién creados o importados) se acomodan solos
    const sin = red.nodos.filter((n) => !n.posicion);
    if (sin.length === red.nodos.length) RB.Red.autoLayout(red, W, H);
    else sin.forEach((n) => (n.posicion = RB.Red.posicionLibre(red, W, H)));

    red.nodos.forEach((n) => {
      const mx = anchoDe(n.nombre) / 2 + 6;
      n.posicion = {
        x: Math.round(Math.min(W - mx, Math.max(mx, n.posicion.x))),
        y: Math.round(Math.min(H - ALTO / 2 - 6, Math.max(ALTO / 2 + 6, n.posicion.y)))
      };
    });

    gAristas = el('g');
    gNodos = el('g');
    svg.appendChild(gAristas);
    svg.appendChild(gNodos);

    red.nodos.forEach((n) =>
      n.padres.forEach((p) => {
        const path = el('path', { fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'round' });
        gAristas.appendChild(path);
        vistaAristas.push({ padre: p, hijo: n.nombre, path });
      })
    );

    red.nodos.forEach((n) => {
      const w = anchoDe(n.nombre);
      const g = el('g', { class: 'nodo', 'data-nombre': n.nombre, style: 'cursor:grab' });
      const halo = el('rect', { x: -w / 2 - 5, y: -ALTO / 2 - 5, width: w + 10, height: ALTO + 10, rx: 18, fill: 'none', 'stroke-width': 4, opacity: 0 });
      const rect = el('rect', { x: -w / 2, y: -ALTO / 2, width: w, height: ALTO, rx: 14, 'stroke-width': 2 });
      const titulo = el('text', { y: -4, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: COLOR.texto, 'pointer-events': 'none' }, n.nombre);
      const sub = el('text', { y: 16, 'text-anchor': 'middle', 'font-size': 13, fill: COLOR.sub, 'pointer-events': 'none' });
      g.append(halo, rect, titulo, sub);
      gNodos.appendChild(g);
      vistaNodos[n.nombre] = { g, rect, halo, titulo, sub };
    });

    estilos();
    colocar();

    // En pantallas angostas el lienzo se desplaza: se empieza viendo el centro
    const caja = svg.parentElement;
    if (caja) caja.scrollLeft = (caja.scrollWidth - caja.clientWidth) / 2;
  }

  /* ------------------------------- estilos -------------------------------- */

  function estilos() {
    const red = app.red;
    const consulta = app.consulta.vars;
    const ev = app.consulta.evidencia;
    red.nodos.forEach((n) => {
      const v = vistaNodos[n.nombre];
      if (!v) return;
      const esC = consulta.includes(n.nombre);
      const esE = n.nombre in ev;
      const seleccionado = app.seleccion === n.nombre;
      v.rect.setAttribute('fill', esC ? COLOR.consultaFondo : esE ? COLOR.evidFondo : COLOR.fondo);
      v.rect.setAttribute('stroke', esC ? COLOR.consultaBorde : esE ? COLOR.evidBorde : COLOR.borde);
      v.halo.setAttribute('stroke', COLOR.sel);
      v.halo.setAttribute('opacity', seleccionado ? 0.35 : 0);
      v.sub.textContent = recortar(esC ? 'consulta' : esE ? `evidencia: ${ev[n.nombre]}` : `${n.estados.length} estados`, anchoDe(n.nombre));
    });
    vistaAristas.forEach((a) => {
      const resalta = app.seleccion && (a.padre === app.seleccion || a.hijo === app.seleccion);
      a.path.setAttribute('stroke', resalta ? COLOR.sel : COLOR.arista);
      a.path.setAttribute('stroke-width', resalta ? 2.6 : 2);
      a.path.setAttribute('marker-end', `url(#${resalta ? 'flechaSel' : 'flecha'})`);
    });
  }

  /* ------------------------------ posiciones ------------------------------ */

  // Punto del borde de una caja (centro c) en dirección al punto d
  function borde(c, d, hw, hh) {
    const dx = d.x - c.x;
    const dy = d.y - c.y;
    if (!dx && !dy) return c;
    const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return { x: c.x + dx * t, y: c.y + dy * t };
  }

  function colocar() {
    const red = app.red;
    red.nodos.forEach((n) => {
      const v = vistaNodos[n.nombre];
      if (v && n.posicion) v.g.setAttribute('transform', `translate(${n.posicion.x},${n.posicion.y})`);
    });
    vistaAristas.forEach((a) => {
      const p = RB.Red.buscar(red, a.padre);
      const h = RB.Red.buscar(red, a.hijo);
      if (!p || !h) return;
      const hwP = anchoDe(p.nombre) / 2 + 3;
      const hwH = anchoDe(h.nombre) / 2 + 5;
      const ini = borde(p.posicion, h.posicion, hwP, ALTO / 2 + 3);
      const fin = borde(h.posicion, p.posicion, hwH, ALTO / 2 + 5);
      a.path.setAttribute('d', `M${ini.x.toFixed(1)} ${ini.y.toFixed(1)} L${fin.x.toFixed(1)} ${fin.y.toFixed(1)}`);
    });
  }

  /* ------------------------------- arrastre -------------------------------- */

  function aCoordenadas(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  }

  function alPresionar(e) {
    const g = e.target.closest('g.nodo');
    if (!g) {
      if (app.seleccion) {
        app.seleccion = null;
        bus.emit('seleccion');
      }
      return;
    }
    const nombre = g.dataset.nombre;
    const nodo = RB.Red.buscar(app.red, nombre);
    const p = aCoordenadas(e);
    arrastre = { nombre, dx: p.x - nodo.posicion.x, dy: p.y - nodo.posicion.y, movido: false };
    svg.setPointerCapture(e.pointerId);
    g.style.cursor = 'grabbing';
    if (app.seleccion !== nombre) {
      app.seleccion = nombre;
      bus.emit('seleccion');
    }
  }

  function alMover(e) {
    if (!arrastre) return;
    const nodo = RB.Red.buscar(app.red, arrastre.nombre);
    const p = aCoordenadas(e);
    const mx = anchoDe(nodo.nombre) / 2 + 6;
    nodo.posicion = {
      x: Math.round(Math.min(W - mx, Math.max(mx, p.x - arrastre.dx))),
      y: Math.round(Math.min(H - ALTO / 2 - 6, Math.max(ALTO / 2 + 6, p.y - arrastre.dy)))
    };
    arrastre.movido = true;
    colocar();
  }

  function alSoltar() {
    if (!arrastre) return;
    const v = vistaNodos[arrastre.nombre];
    if (v) v.g.style.cursor = 'grab';
    if (arrastre.movido) bus.emit('posiciones');
    arrastre = null;
  }

  function reorganizar() {
    if (!app.red.nodos.length) return;
    RB.Red.autoLayout(app.red, W, H);
    colocar();
    bus.emit('posiciones');
  }

  /* --------------------------- SVG para el informe --------------------------- */

  // Devuelve el grafo como texto SVG autónomo (recortado a donde están los nodos).
  function comoSvg() {
    const nodos = app.red.nodos.filter((n) => n.posicion);
    if (!nodos.length) return '';
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    nodos.forEach((n) => {
      const w = anchoDe(n.nombre) / 2 + 12;
      x0 = Math.min(x0, n.posicion.x - w);
      x1 = Math.max(x1, n.posicion.x + w);
      y0 = Math.min(y0, n.posicion.y - ALTO / 2 - 12);
      y1 = Math.max(y1, n.posicion.y + ALTO / 2 + 12);
    });
    const copia = svg.cloneNode(true);
    copia.setAttribute('xmlns', NS);
    copia.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
    copia.setAttribute('width', '100%');
    copia.removeAttribute('class');
    // Tamaño natural (1 a 1), sin pasar de lo que cabe en una hoja: evita nodos gigantes si hay pocos
    copia.setAttribute('style', `display:block;margin:0 auto;max-width:${Math.round(Math.min(x1 - x0, 760))}px`);
    copia.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    copia.querySelectorAll('g.nodo').forEach((g) => g.removeAttribute('style'));
    // Se quita el resalte de selección (no tiene sentido en papel)
    copia.querySelectorAll('g.nodo rect:first-child').forEach((r) => r.setAttribute('opacity', 0));
    return copia.outerHTML;
  }

  /* ---------------------------------- init --------------------------------- */

  function init(svgEl, aplicacion) {
    svg = svgEl;
    app = aplicacion;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let espera = null;
    window.addEventListener('resize', () => {
      clearTimeout(espera);
      espera = setTimeout(ajustarLienzo, 150);
    });
    svg.addEventListener('pointerdown', alPresionar);
    svg.addEventListener('pointermove', alMover);
    svg.addEventListener('pointerup', alSoltar);
    svg.addEventListener('pointercancel', alSoltar);
    bus.on('red', () => construir());
    bus.on('seleccion', () => estilos());
    bus.on('consulta', () => estilos());
    construir();
  }

  RB.Grafo = {
    init, construir, reorganizar, comoSvg,
    get W() { return W; },
    get H() { return H; }
  };
})();
