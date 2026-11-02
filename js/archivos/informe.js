/* ============================================================================
 * informe.js  ·  PARTE 3 (Archivos y salidas)
 *
 * Genera un informe legible (HTML pensado para papel) con:
 *   - el dibujo de la red,
 *   - nodos, estados y relaciones,
 *   - todas las tablas de probabilidad,
 *   - la última consulta: evidencia, distribución, verificación y pasos.
 *
 * "Imprimir" abre el cuadro de impresión del navegador; desde ahí también se
 * puede elegir "Guardar como PDF".
 * ========================================================================== */
(function () {
  'use strict';
  const RB = window.RB;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const p6 = (x) => (isFinite(x) ? x.toFixed(6) : '—');
  const pct = (x) => (isFinite(x) ? (x * 100).toFixed(2) + ' %' : '—');

  const ESTILO = `
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#1b2236;margin:0;padding:28px 34px;font-size:12.5px;line-height:1.45}
    h1{font-size:22px;margin:0 0 2px;color:#312e81}
    h2{font-size:15px;margin:26px 0 8px;padding-bottom:4px;border-bottom:2px solid #c7d2fe;color:#312e81}
    h3{font-size:13px;margin:16px 0 6px}
    .sub{color:#667085;margin:0 0 6px}
    table{border-collapse:collapse;margin:6px 0 4px;page-break-inside:avoid}
    th,td{border:1px solid #cbd2e1;padding:4px 9px;text-align:left}
    th{background:#eef1fb}
    td.num{text-align:right;font-family:Consolas,Menlo,monospace}
    .grafo{border:1px solid #dfe3ef;border-radius:8px;padding:8px;margin:8px 0;page-break-inside:avoid}
    .pastilla{display:inline-block;padding:1px 8px;border-radius:99px;margin:0 4px 2px 0;font-size:11.5px}
    .c{background:#ccfbf1;border:1px solid #0d9488}.e{background:#fef3c7;border:1px solid #d97706}
    .ok{color:#047857;font-weight:bold}.mal{color:#b91c1c;font-weight:bold}
    .bloque{page-break-inside:avoid}
    ol li{margin-bottom:5px}
    .pie{margin-top:28px;color:#98a2b3;font-size:11px;border-top:1px solid #e4e8f1;padding-top:8px}
    @media print{body{padding:0}h2{page-break-after:avoid}}
  `;

  function tablaCpt(red, nodo) {
    const enc =
      nodo.padres.map((p) => `<th>${esc(p)}</th>`).join('') +
      nodo.estados.map((e) => `<th>P(${esc(nodo.nombre)} = ${esc(e)})</th>`).join('') +
      '<th>Σ</th>';
    const filas = nodo.cpt
      .map((fila, i) => {
        const comb = nodo.padres.length
          ? RB.Red.combinacionDeFila(red, nodo, i).map((c) => `<td>${esc(c.estado)}</td>`).join('')
          : '';
        const suma = fila.reduce((a, b) => a + b, 0);
        return `<tr>${comb}${fila.map((v) => `<td class="num">${esc(RB.Red.redondear(v))}</td>`).join('')}<td class="num">${esc(RB.Red.redondear(suma))}</td></tr>`;
      })
      .join('');
    const titulo = nodo.padres.length ? `P(${nodo.nombre} | ${nodo.padres.join(', ')})` : `P(${nodo.nombre})`;
    return `<div class="bloque"><h3>${esc(titulo)}</h3><table><thead><tr>${enc}</tr></thead><tbody>${filas}</tbody></table></div>`;
  }

  function seccionConsulta(res, conPasos) {
    const ev = Object.keys(res.evidencia);
    const f = res.distribucion;
    const filas = f.valores
      .map(
        (v, i) =>
          `<tr>${RB.Inferencia.etiquetasDeIndice(f, i).map((e) => `<td>${esc(e)}</td>`).join('')}<td class="num">${p6(v)}</td><td class="num">${pct(v)}</td></tr>`
      )
      .join('');
    const ver = res.verificacion;
    const verTexto = !ver
      ? ''
      : !ver.disponible
        ? `<p>${esc(ver.motivo)}</p>`
        : ver.ok
          ? `<p class="ok">✓ Verificado: coincide con la enumeración exhaustiva de la distribución conjunta (diferencia máxima ${ver.maxDiferencia.toExponential(1)}).</p>`
          : `<p class="mal">✗ No coincide con la referencia (diferencia ${ver.maxDiferencia.toExponential(2)}).</p>`;

    let pasos = '';
    if (conPasos) {
      pasos =
        '<h3>Pasos del algoritmo</h3><ol>' +
        res.pasos
          .map((p) => {
            if (p.tipo === 'inicio') return `<li><b>Factores iniciales:</b> ${p.factores.map(esc).join(' · ')}</li>`;
            if (p.tipo === 'evidencia')
              return `<li><b>Evidencia ${esc(p.variable)} = ${esc(p.estado)}:</b> ${p.factores.length ? 'se restringen ' + p.factores.map(esc).join(', ') : 'ningún factor la contiene'}.</li>`;
            if (p.tipo === 'eliminacion') {
              const t = p.tabla;
              const tf = t.valores
                .map((v, i) => `<tr>${RB.Inferencia.etiquetasDeIndice(t, i).map((e) => `<td>${esc(e)}</td>`).join('')}<td class="num">${p6(v)}</td></tr>`)
                .join('');
              return `<li><b>Eliminar ${esc(p.variable)}:</b> se multiplican ${p.usados.map(esc).join(' × ')} → ${esc(p.producto)}; se suma sobre ${esc(p.variable)} → <i>${esc(p.resultado)}</i>.
                <table><thead><tr>${t.vars.map((v) => `<th>${esc(v)}</th>`).join('')}<th>valor</th></tr></thead><tbody>${tf}</tbody></table></li>`;
            }
            return `<li><b>Resultado:</b> se multiplican ${p.factores.map(esc).join(' × ')}; suma total = P(evidencia) = ${p6(p.Z)}; se normaliza dividiendo entre ella.</li>`;
          })
          .join('') +
        '</ol>';
    }

    return `
      <h2>4. Consulta realizada</h2>
      <p><b>Consulta:</b> ${res.consulta.map((q) => `<span class="pastilla c">${esc(q)}</span>`).join('')}</p>
      <p><b>Evidencia:</b> ${ev.length ? ev.map((k) => `<span class="pastilla e">${esc(k)} = ${esc(res.evidencia[k])}</span>`).join('') : 'ninguna'}</p>
      <p><b>P(evidencia)</b> = ${p6(res.probEvidencia)} &nbsp;·&nbsp; <b>Orden de eliminación:</b> ${res.ordenEliminacion.length ? res.ordenEliminacion.map(esc).join(' → ') : '(nada que eliminar)'}</p>
      <div class="bloque"><h3>${esc(f.etiqueta)}</h3>
      <table><thead><tr>${res.consulta.map((q) => `<th>${esc(q)}</th>`).join('')}<th>Probabilidad</th><th>%</th></tr></thead><tbody>${filas}</tbody></table></div>
      ${verTexto}${pasos}`;
  }

  // Crea el documento HTML completo del informe.
  function generar(app, opciones) {
    opciones = opciones || {};
    const red = app.red;
    const fecha = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
    const filas = red.nodos
      .map((n) => {
        const hijos = RB.Red.hijosDe(red, n.nombre).map((x) => x.nombre);
        return `<tr><td><b>${esc(n.nombre)}</b></td><td>${n.estados.map(esc).join(', ')}</td><td>${n.padres.length ? n.padres.map(esc).join(', ') : '—'}</td><td>${hijos.length ? hijos.map(esc).join(', ') : '—'}</td></tr>`;
      })
      .join('');
    const aristas = red.nodos.flatMap((n) => n.padres.map((p) => `${esc(p)} → ${esc(n.nombre)}`));

    const svg = RB.Grafo.comoSvg();
    const consulta = app.resultado ? seccionConsulta(app.resultado, opciones.pasos !== false) : '<h2>4. Consulta realizada</h2><p>Todavía no se ha ejecutado ninguna consulta.</p>';

    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe · ${esc(red.nombre)}</title><style>${ESTILO}</style></head><body>
      <h1>${esc(red.nombre)}</h1>
      <p class="sub">Informe de red bayesiana · ${esc(fecha)}</p>
      ${red.descripcion ? `<p>${esc(red.descripcion)}</p>` : ''}
      <h2>1. Estructura de la red</h2>
      <div class="grafo">${svg}</div>
      <h2>2. Nodos y relaciones</h2>
      <table><thead><tr><th>Nodo</th><th>Estados</th><th>Padres</th><th>Hijos</th></tr></thead><tbody>${filas}</tbody></table>
      <p><b>Relaciones dirigidas (${aristas.length}):</b> ${aristas.length ? aristas.join(' &nbsp;·&nbsp; ') : 'ninguna'}</p>
      <h2>3. Tablas de probabilidad condicional</h2>
      ${red.nodos.map((n) => tablaCpt(red, n)).join('')}
      ${consulta}
      <div class="pie">Generado con la aplicación de Redes Bayesianas (eliminación de variables).</div>
    </body></html>`;
  }

  // Abre el diálogo de impresión con el informe (sin salir de la página).
  function imprimir(app) {
    const html = generar(app);
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    const lanzar = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        setTimeout(() => iframe.remove(), 2000);
      }
    };
    // pequeña espera para que el contenido termine de dibujarse
    setTimeout(lanzar, 250);
  }

  function descargar(app) {
    const nombre = RB.Almacenamiento.nombreDeArchivo(app.red).replace(/\.json$/, '') + '-informe.html';
    RB.Almacenamiento.descargarTexto(nombre, generar(app), 'text/html');
  }

  RB.Informe = { generar, imprimir, descargar };
})();
