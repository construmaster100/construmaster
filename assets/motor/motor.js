// Motor de renderizado compartido para los modelos de presupuesto (ConstruMaster).
// No depende de un modelo en particular: recibe datos y devuelve HTML.
var Motor = (function () {
  'use strict';

  function normalizar(txt) {
    return String(txt == null ? '' : txt)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escaparHtml(txt) {
    return String(txt == null ? '' : txt)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatoMoneda(valor) {
    if (valor === null || valor === undefined || valor === '') return '';
    var n = Number(valor);
    if (isNaN(n)) return escaparHtml(valor);
    return '$ ' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  function formatoValor(valor) {
    if (typeof valor === 'number') return formatoMoneda(valor);
    return escaparHtml(valor);
  }

  // ---------------------------------------------------------------
  function renderPanelProyecto(campos) {
    if (!campos || !campos.length) {
      return '<section class="datos-proyecto"><div class="campo"><span class="vacio">Sin datos de proyecto</span></div></section>';
    }
    var html = campos.map(function (c) {
      return '<div class="campo"><label>' + escaparHtml(c.etiqueta) + '</label><span>' + formatoValor(c.valor) + '</span></div>';
    }).join('');
    return '<section class="datos-proyecto">' + html + '</section>';
  }

  // ---------------------------------------------------------------
  function renderSidebarCapitulos(capitulos, etapas, vistaActual, prefijo) {
    var html = '<button type="button" class="item-sidebar' + (vistaActual === 'resumen' ? ' activo' : '') + '" data-vista="' + prefijo + 'resumen">Resumen</button>';
    ['negra', 'gris', 'blanca'].forEach(function (key) {
      var etapa = etapas[key];
      if (!etapa) return;
      var caps = capitulos.filter(function (c) { return c.etapa === key; });
      if (!caps.length) return;
      var abierto = caps.some(function (c) { return vistaActual === prefijo + 'cap-' + c.n; });
      html += '<details class="grupo-etapa"' + (abierto ? ' open' : '') + '>' +
        '<summary style="border-left-color:' + etapa.color + '">' + escaparHtml(etapa.nombre) + '</summary>';
      caps.forEach(function (c) {
        var activo = vistaActual === prefijo + 'cap-' + c.n ? ' activo' : '';
        html += '<button type="button" class="item-capitulo' + activo + '" data-vista="' + prefijo + 'cap-' + c.n + '">' +
          '<span class="num">' + c.n + '</span>' + escaparHtml(c.nombre) + '</button>';
      });
      html += '</details>';
    });
    return html;
  }

  // ---------------------------------------------------------------
  function renderResumen(datos, prefijo) {
    var html = renderPanelProyecto(datos.proyecto);
    ['negra', 'gris', 'blanca'].forEach(function (key) {
      var etapa = datos.etapas[key];
      if (!etapa) return;
      var caps = datos.capitulos.filter(function (c) { return c.etapa === key; });
      if (!caps.length) return;
      html += '<h3 class="titulo-etapa" style="border-left-color:' + etapa.color + '">' + escaparHtml(etapa.nombre) + '</h3><div class="grilla-capitulos">';
      caps.forEach(function (c) {
        html += '<button type="button" class="tarjeta-capitulo" style="--borde-etapa:' + etapa.color + '" data-vista="' + prefijo + 'cap-' + c.n + '">' +
          '<span class="num">Capítulo ' + c.n + '</span><span class="nombre">' + escaparHtml(c.nombre) + '</span>' +
          '<span class="subtotal">' + formatoMoneda(c.subtotal) + '</span></button>';
      });
      html += '</div>';
    });
    return html;
  }

  function renderTablaCapitulo(cap, etapaColor) {
    var filasHtml;
    if (!cap || !cap.filas || !cap.filas.length) {
      filasHtml = '<tr><td colspan="7" class="vacio">Sin ítems en este capítulo.</td></tr>';
    } else {
      filasHtml = cap.filas.map(function (f) {
        return '<tr><td>' + escaparHtml(f.ref) + '</td><td>' + escaparHtml(f.item) + '</td><td>' + escaparHtml(f.subitem) +
          '</td><td>' + escaparHtml(f.unidad) + '</td><td>' + escaparHtml(f.cant) + '</td><td>' +
          formatoMoneda(f.valorU) + '</td><td>' + formatoMoneda(f.valorTotal) + '</td></tr>';
      }).join('');
    }
    var fuente = cap.hoja ? '<p class="fuente-hoja">Datos leídos de la hoja: <strong>' + escaparHtml(cap.hoja) + '</strong></p>' : '';
    return '<h2 style="border-left:4px solid ' + etapaColor + '; padding-left:10px;">' + cap.n + '. ' + escaparHtml(cap.nombre) + '</h2>' +
      fuente +
      '<table class="tabla-presupuesto"><thead><tr><th>REF</th><th>ITEM</th><th>SUB-ITEM</th><th>UNIDAD</th><th>CANT.</th><th>VALOR U.</th><th>VALOR TOTAL</th></tr></thead>' +
      '<tbody>' + filasHtml + '</tbody>' +
      '<tfoot><tr><td colspan="6">SUB-TOTAL</td><td>' + formatoMoneda(cap.subtotal) + '</td></tr></tfoot></table>';
  }

  // ---------------------------------------------------------------
  function renderGaleriaImagenes(imagenes) {
    if (!imagenes || !imagenes.length) {
      return '<h2>Imágenes</h2><p class="vacio">Este archivo no tiene imágenes incrustadas.</p>';
    }
    var tarjetas = imagenes.map(function (img) {
      return '<figure class="tarjeta-imagen"><img src="' + img.dataUrl + '" alt="' + escaparHtml(img.nombre) + '"><figcaption>' + escaparHtml(img.nombre) + '</figcaption></figure>';
    }).join('');
    return '<h2>Imágenes del proyecto</h2><div class="grilla-imagenes">' + tarjetas + '</div>';
  }

  // ---------------------------------------------------------------
  function etiquetasUnicas(materiales) {
    var conteo = {};
    materiales.forEach(function (m) {
      (m.etiquetas || []).forEach(function (t) { conteo[t] = (conteo[t] || 0) + 1; });
    });
    return Object.keys(conteo).sort(function (a, b) { return conteo[b] - conteo[a]; }).map(function (t) {
      return { etiqueta: t, conteo: conteo[t] };
    });
  }

  function renderMateriales(materiales, filtroTexto, etiquetaActiva) {
    var textoNorm = normalizar(filtroTexto || '');
    var filtrados = materiales.filter(function (m) {
      if (etiquetaActiva && (m.etiquetas || []).indexOf(etiquetaActiva) === -1) return false;
      if (textoNorm && normalizar(m.nombre).indexOf(textoNorm) === -1) return false;
      return true;
    });

    var etiquetas = etiquetasUnicas(materiales).slice(0, 30);
    var chips = '<button type="button" class="chip-etiqueta' + (!etiquetaActiva ? ' activo' : '') + '" data-etiqueta="">Todas (' + materiales.length + ')</button>' +
      etiquetas.map(function (e) {
        return '<button type="button" class="chip-etiqueta' + (etiquetaActiva === e.etiqueta ? ' activo' : '') + '" data-etiqueta="' + escaparHtml(e.etiqueta) + '">' +
          escaparHtml(e.etiqueta) + ' (' + e.conteo + ')</button>';
      }).join('');

    var filas = filtrados.slice(0, 400).map(function (m) {
      var tags = (m.etiquetas || []).map(function (t) { return '<span class="etiqueta-mini">' + escaparHtml(t) + '</span>'; }).join('');
      return '<tr><td>' + escaparHtml(m.nombre) + '</td><td>' + tags + '</td><td>' + formatoMoneda(m.precio) + '</td></tr>';
    }).join('');

    var avisoLimite = filtrados.length > 400 ? '<p class="fuente-hoja">Mostrando 400 de ' + filtrados.length + ' resultados — refiná la búsqueda para ver más.</p>' : '';

    return '<h2>Materiales</h2>' +
      '<p class="fuente-hoja">' + materiales.length + ' materiales del catálogo COMFER.</p>' +
      '<input type="text" class="buscador-materiales" id="buscador-materiales" placeholder="Buscar material por nombre…" value="' + escaparHtml(filtroTexto || '') + '">' +
      '<div class="chips-etiquetas">' + chips + '</div>' +
      '<p class="fuente-hoja">' + filtrados.length + ' resultado(s)</p>' +
      '<table class="tabla-presupuesto tabla-materiales"><thead><tr><th>Nombre</th><th>Etiquetas</th><th>Precio de venta</th></tr></thead><tbody>' +
      (filas || '<tr><td colspan="3" class="vacio">Sin resultados.</td></tr>') + '</tbody></table>' + avisoLimite;
  }

  // ===================================================================
  // Parseo de Excel (misma logica validada en Node, portada tal cual;
  // se usa cuando el usuario carga un archivo nuevo con "Cargar Excel").
  // ===================================================================
  var ETIQUETAS_COLUMNA = {
    cap: ['cap'], ref: ['ref'], item: ['item'], subitem: ['sub-item', 'subitem'], unidad: ['unidad'],
    cant: ['cant.', 'cant', 'und total', 'cant. total'], valorU: ['valor u.', 'valor u', 'valor unitario'], valorTotal: ['valor total'],
  };

  function encontrarColumnas(filaEncabezado) {
    var mapa = {};
    filaEncabezado.forEach(function (celda, idx) {
      var norm = normalizar(celda);
      Object.keys(ETIQUETAS_COLUMNA).forEach(function (campo) {
        if (ETIQUETAS_COLUMNA[campo].indexOf(norm) !== -1) mapa[campo] = idx;
      });
    });
    return mapa;
  }

  function esFilaVacia(fila) {
    return !fila || fila.every(function (c) { return c === undefined || c === null || String(c).trim() === ''; });
  }

  function parsearHojaPresupuestoUnica(sheet) {
    var filas2d = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    var capitulos = {};
    var columnas = null;
    var capActual = null;

    for (var i = 0; i < filas2d.length; i++) {
      var fila = filas2d[i];
      var candidato = encontrarColumnas(fila);
      if (candidato.ref !== undefined && candidato.item !== undefined && candidato.valorTotal !== undefined && candidato.cap !== undefined) {
        columnas = candidato;
        continue;
      }
      if (!columnas) continue;
      if (esFilaVacia(fila)) continue;

      var normValorU = normalizar(fila[columnas.valorU]);
      if (normValorU === 'sub-total' || normValorU === 'subtotal') continue;

      var normCant = normalizar(fila[columnas.cant]);
      if (normCant === 'sub-total' || normCant === 'subtotal' || normCant === 'total') { capActual = null; continue; }

      var celdaCap = fila[columnas.cap];
      if (celdaCap && String(celdaCap).trim() !== '') {
        var m = /^(\d+)/.exec(String(celdaCap).trim());
        if (m) {
          var n = Number(m[1]);
          var nombre = String(celdaCap).replace(/^\d+\.?\)?\s*/, '').replace(/\s+/g, ' ').trim();
          capActual = n;
          if (!capitulos[n]) capitulos[n] = { n: n, nombre: nombre, filas: [], subtotal: 0 };
        }
      }
      if (!capActual || !capitulos[capActual]) continue;

      var valorTotal = fila[columnas.valorTotal];
      var valorU = columnas.valorU !== undefined ? fila[columnas.valorU] : '';
      var ref = fila[columnas.ref];
      var item = fila[columnas.item];
      var subitem = columnas.subitem !== undefined ? fila[columnas.subitem] : '';
      if (!ref && !item && !subitem && (valorTotal === '' || valorTotal === undefined)) continue;

      capitulos[capActual].filas.push({
        ref: ref, item: item, subitem: subitem,
        unidad: columnas.unidad !== undefined ? fila[columnas.unidad] : '',
        cant: columnas.cant !== undefined ? fila[columnas.cant] : '',
        valorU: valorU !== '' && !isNaN(Number(valorU)) ? Number(valorU) : null,
        valorTotal: valorTotal !== '' && !isNaN(Number(valorTotal)) ? Number(valorTotal) : null,
      });
      if (valorTotal !== '' && !isNaN(Number(valorTotal))) capitulos[capActual].subtotal += Number(valorTotal);
    }
    return Object.keys(capitulos).map(function (k) { return capitulos[k]; }).sort(function (a, b) { return a.n - b.n; });
  }

  function parsearHojaCapitulo(sheet) {
    var filas2d = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    var indiceEncabezado = -1, columnas = null;
    for (var i = 0; i < filas2d.length; i++) {
      var candidato = encontrarColumnas(filas2d[i]);
      if (candidato.ref !== undefined && candidato.item !== undefined && candidato.valorTotal !== undefined) {
        indiceEncabezado = i; columnas = candidato; break;
      }
    }
    if (indiceEncabezado === -1) return { filas: [], subtotal: 0 };

    var filas = [];
    var subtotal = 0;
    for (var r = indiceEncabezado + 1; r < filas2d.length; r++) {
      var fila = filas2d[r];
      if (esFilaVacia(fila)) continue;
      var normValorU = normalizar(fila[columnas.valorU]);
      var normCant = normalizar(fila[columnas.cant]);
      var primerCelda = normalizar(fila[0]);
      if (normValorU === 'sub-total' || normValorU === 'subtotal' || normCant === 'sub-total' ||
        normCant === 'subtotal' || primerCelda === 'sub-total') {
        break;
      }
      var valorTotal = fila[columnas.valorTotal];
      var valorU = columnas.valorU !== undefined ? fila[columnas.valorU] : '';
      var ref = fila[columnas.ref];
      var item = fila[columnas.item];
      var subitem = columnas.subitem !== undefined ? fila[columnas.subitem] : '';
      if (!ref && !item && !subitem && (valorTotal === '' || valorTotal === undefined)) continue;
      filas.push({
        ref: ref, item: item, subitem: subitem,
        unidad: columnas.unidad !== undefined ? fila[columnas.unidad] : '',
        cant: columnas.cant !== undefined ? fila[columnas.cant] : '',
        valorU: valorU !== '' && !isNaN(Number(valorU)) ? Number(valorU) : null,
        valorTotal: valorTotal !== '' && !isNaN(Number(valorTotal)) ? Number(valorTotal) : null,
      });
      if (valorTotal !== '' && !isNaN(Number(valorTotal))) subtotal += Number(valorTotal);
    }
    return { filas: filas, subtotal: subtotal };
  }

  function extraerCamposProyecto(sheet, filaInicio, filaFin, columnaMinima, columnaMaxima) {
    var filas2d = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    var campos = [];
    var fin = Math.min(filaFin, filas2d.length);
    var colMin = columnaMinima || 0;
    var colMax = columnaMaxima || Infinity;
    for (var r = filaInicio; r < fin; r++) {
      var fila = filas2d[r];
      if (!fila) continue;
      for (var c = colMin; c < fila.length && c <= colMax; c++) {
        var texto = fila[c];
        if (texto === '' || texto === undefined || texto === null) continue;
        if (typeof texto === 'number') continue;
        texto = String(texto).trim();
        if (!texto) continue;
        var esEtiqueta = texto.charAt(texto.length - 1) === ':' || /^[A-ZÁÉÍÓÚÑ0-9 .%()]+$/.test(texto);
        if (!esEtiqueta) continue;
        var valor, idxValor = -1;
        for (var v = c + 1; v < fila.length && v <= colMax; v++) {
          if (fila[v] !== '' && fila[v] !== undefined && fila[v] !== null) { valor = fila[v]; idxValor = v; break; }
        }
        if (valor === undefined) continue;
        var etiqueta = texto.replace(/:$/, '').trim();
        if (normalizar(etiqueta) === 'fecha' && typeof valor === 'number') {
          try { valor = XLSX.SSF.format('dd/mm/yyyy', valor); } catch (e) {}
        }
        campos.push({ etiqueta: etiqueta, valor: valor });
        c = idxValor;
      }
    }
    return campos;
  }

  var VOCAB_CATEGORIA = [
    'PORCELANATO', 'MOSAICO', 'PISO', 'PARED', 'BALDOSA', 'BRICK', 'GRES',
    'SANITARIO', 'LAVAMANOS', 'LAVAPLATOS', 'LAVADERO', 'DUCHA', 'GRIFERIA', 'MONOCONTROL', 'LLAVE', 'REGISTRO',
    'SIFON', 'REJILLA', 'DESAGUE', 'ACOPLE', 'TEE', 'CODO', 'TUBO', 'TUBERIA', 'CONDUIT', 'MANGUERA',
    'CPVC', 'PVC', 'GUARDAESCOBA', 'BOQUILLA', 'PEGACOR', 'PEGANTE', 'PEGAMASTER', 'ADHESIVO',
    'LIMPIADOR', 'DESINFECTANTE', 'ESTUCO', 'TEXTUCO', 'MASTIC', 'PINTURA', 'BROCHA', 'RODILLO',
    'FLEJE', 'VARILLA', 'MALLA', 'CEMENTO', 'CONCRETO', 'ARENA', 'LADRILLO', 'BLOQUE', 'TEJA', 'PERFIL',
    'MUEBLE', 'CLOSET', 'ARMARIO', 'BARRA', 'DIVISION', 'ESPEJO', 'ACCESORIOS',
    'CALENTADOR', 'TANQUE', 'BOMBA', 'CABLE', 'INTERRUPTOR', 'TOMACORRIENTE', 'LAMPARA', 'BOMBILLO',
  ];
  var VOCAB_COLOR = [
    'BLANCO', 'NEGRO', 'GRIS', 'BEIGE', 'CAFE', 'AZUL', 'VERDE', 'ROJO', 'AMARILLO', 'MARFIL',
    'CROMO', 'MATE', 'GREY', 'BLACK', 'CELESTE', 'CARAMELO', 'DORADO', 'PLATA',
  ];
  var VOCAB_MARCA = [
    'CORONA', 'ALFA', 'GERFOR', 'STRETTO', 'PEGAMASTER', 'KLIPEN', 'XYLON', 'INTRAPLAS',
    'CONCOLOR', 'DALAMO', 'VESSEL', 'KORAL',
  ];

  function etiquetasMaterial(nombre) {
    var norm = normalizar(nombre).toUpperCase();
    var palabras = {};
    norm.split(/[^A-ZÁÉÍÓÚÑ0-9]+/).forEach(function (p) { if (p) palabras[p] = true; });
    var etiquetas = [];
    VOCAB_CATEGORIA.forEach(function (p) { if (palabras[p] && etiquetas.indexOf(p) === -1) etiquetas.push(p); });
    VOCAB_COLOR.forEach(function (p) { if (palabras[p] && etiquetas.indexOf(p) === -1) etiquetas.push(p); });
    VOCAB_MARCA.forEach(function (p) { if (palabras[p] && etiquetas.indexOf(p) === -1) etiquetas.push(p); });
    if (!etiquetas.length) etiquetas.push('OTROS');
    return etiquetas;
  }

  function extraerMateriales(sheet) {
    var filas2d = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    var materiales = [];
    filas2d.forEach(function (fila) {
      var nombre = fila[0];
      var precio = fila[1];
      if (!nombre || typeof nombre !== 'string') return;
      if (normalizar(nombre) === 'nombre') return;
      materiales.push({
        nombre: String(nombre).trim(),
        precio: precio !== '' && !isNaN(Number(precio)) ? Number(precio) : null,
        etiquetas: etiquetasMaterial(nombre),
      });
    });
    return materiales;
  }

  function extraerImagenesDesdeBuffer(arrayBuffer) {
    return JSZip.loadAsync(arrayBuffer).then(function (zip) {
      var archivos = Object.keys(zip.files).filter(function (ruta) {
        return /^xl\/media\//i.test(ruta) && !zip.files[ruta].dir;
      });
      var promesas = archivos.map(function (ruta) {
        return zip.files[ruta].async('base64').then(function (b64) {
          var ext = (/\.([a-zA-Z0-9]+)$/.exec(ruta) || [, 'png'])[1].toLowerCase();
          var mime = ext === 'jpg' ? 'jpeg' : ext;
          return { nombre: ruta.split('/').pop(), dataUrl: 'data:image/' + mime + ';base64,' + b64 };
        });
      });
      return Promise.all(promesas);
    }).catch(function () { return []; });
  }

  return {
    normalizar: normalizar,
    escaparHtml: escaparHtml,
    formatoMoneda: formatoMoneda,
    renderPanelProyecto: renderPanelProyecto,
    renderSidebarCapitulos: renderSidebarCapitulos,
    renderResumen: renderResumen,
    renderTablaCapitulo: renderTablaCapitulo,
    renderGaleriaImagenes: renderGaleriaImagenes,
    renderMateriales: renderMateriales,
    etiquetasUnicas: etiquetasUnicas,
    parsearHojaPresupuestoUnica: parsearHojaPresupuestoUnica,
    parsearHojaCapitulo: parsearHojaCapitulo,
    extraerCamposProyecto: extraerCamposProyecto,
    extraerMateriales: extraerMateriales,
    extraerImagenesDesdeBuffer: extraerImagenesDesdeBuffer,
  };
})();
