/* =========================================================
   LEGO · Propuesta parallax (v2) — scroll, sets, taller y laboratorio
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hayGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const anima = hayGsap && !reduce;
  if (hayGsap) gsap.registerPlugin(ScrollTrigger);
  const nav = $('#nav');

  let toastT;
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2600); };

  /* ---------- Títulos: palabra por palabra ---------- */
  $$('[data-palabras]').forEach((h) => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i)
      .map((l) => l.trim().split(/\s+/).map((p) => `<span class="palabra" aria-hidden="true"><span>${p}</span></span>`).join(' '))
      .join('<br>');
  });

  /* ---------- Vías rojas: capas de la pista con studs ---------- */
  $$('.via').forEach((svg) => {
    const p = $('.via__trazo', svg); const d = p.getAttribute('d');
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    ['v-sombra', 'v-lado', 'v-cara', 'v-brillo', 'v-studs', 'v-studs-luz'].forEach((c) => {
      const n = document.createElementNS(ns, 'path'); n.setAttribute('d', d); n.setAttribute('class', c); g.appendChild(n);
    });
    // máscara para "construir" la vía con el scroll
    const id = 'm' + Math.random().toString(36).slice(2, 8);
    const mask = document.createElementNS(ns, 'mask'); mask.setAttribute('id', id); mask.setAttribute('maskUnits', 'userSpaceOnUse');
    const vb = svg.viewBox.baseVal; mask.setAttribute('x', -200); mask.setAttribute('y', -200); mask.setAttribute('width', vb.width + 400); mask.setAttribute('height', vb.height + 400);
    const mp = document.createElementNS(ns, 'path'); mp.setAttribute('d', d); mp.setAttribute('stroke', '#fff'); mp.setAttribute('stroke-width', 90); mp.setAttribute('fill', 'none'); mp.setAttribute('stroke-linecap', 'round');
    mask.appendChild(mp); svg.appendChild(mask); g.setAttribute('mask', `url(#${id})`);
    p.replaceWith(g); svg._mascara = mp;
  });

  /* ---------- Menú / puntos / pestañas ---------- */
  const tip = $('#tip');
  const mostrarTip = (p) => { const r = p.getBoundingClientRect(); tip.textContent = p.dataset.tip; tip.style.left = r.left + r.width / 2 + 'px'; tip.style.top = r.top + 'px'; tip.classList.add('is-on'); };
  const ocultarTip = () => tip.classList.remove('is-on');
  $$('.punto').forEach((p) => {
    p.addEventListener('mouseenter', () => mostrarTip(p));
    p.addEventListener('mouseleave', ocultarTip);
    p.addEventListener('focus', () => mostrarTip(p));
    p.addEventListener('blur', ocultarTip);
  });
  window.addEventListener('scroll', ocultarTip, { passive: true });

  /* =========================================================
     RECIÉN SALIDOS · sets reales (precios tiendalego.com.co, nov. 2026)
     ========================================================= */
  const SETS = [
    { img: 'set-playstation.png', tag: 'EXCLUSIVO', cls: 'negra', set: '72306', dato: 'ENVÍO GRATIS', nombre: 'PlayStation 1', precio: '$ 999.900' },
    { img: 'set-doom.png', tag: 'NUEVO', cls: 'roja', set: '76345', dato: 'ENVÍO GRATIS', nombre: 'Busto del Doctor Doom', precio: '$ 399.900' },
    { img: 'set-hogwarts.png', tag: 'NUEVO', cls: 'azul', set: '40975', dato: '10+', nombre: 'Mini Castillo de Hogwarts™', precio: '$ 279.900' },
    { img: 'set-pokeball.png', tag: 'MÁS VENDIDO', cls: 'amarilla', set: '72154', dato: 'ENVÍO GRATIS', nombre: 'Poké Ball: Grandes Momentos del Entrenador', precio: '$ 1.699.900' },
    { img: 'set-messi.webp', caja: true, tag: 'NUEVO', cls: 'azul', set: '43011', dato: '10+', nombre: 'Lionel Messi: Fenómenos del Fútbol', precio: '$ 199.900' },
    { img: 'set-shrek.webp', caja: true, tag: 'NUEVO', cls: 'roja', set: '72423', dato: '18+', nombre: 'Shrek, Burro y Gato con Botas', precio: '$ 949.900' },
    { img: 'set-ministerio.webp', caja: true, tag: 'EXCLUSIVO', cls: 'negra', set: '76476', dato: '18+', nombre: 'Ministerio de Magia: Edición para Coleccionistas', precio: '$ 2.899.900' },
    { img: 'set-vengadores.jpg', caja: true, tag: 'MÁS VENDIDO', cls: 'amarilla', set: '76269', dato: 'ENVÍO GRATIS', nombre: 'Torre de los Vengadores', precio: '$ 3.299.900' },
  ];
  const grid = $('#sets-grid');
  grid.innerHTML = SETS.map((s) => `
    <article class="producto">
      <div class="producto__foto${s.caja ? ' producto__foto--caja' : ''}">
        <img src="img/${s.img}" alt="${s.nombre}" loading="lazy">
        <span class="etiqueta etiqueta--${s.cls}">${s.tag}</span>
      </div>
      <div class="producto__info">
        <div class="producto__datos"><span>SET ${s.set}</span><span>${s.dato}</span></div>
        <h3 class="producto__nombre">${s.nombre}</h3>
        <p class="producto__precio">${s.precio}</p>
        <button class="boton boton--amarillo producto__add" type="button">Agregar al carrito <i aria-hidden="true">→</i></button>
      </div>
    </article>`).join('');

  // agregar al carrito: un ladrillo vuela hasta la bolsa (como en la landing inicial)
  const contador = $('#contador');
  const bolsa = $('.nav__bolsa');
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.producto__add'); if (!btn) return;
    const nombre = btn.closest('.producto').querySelector('.producto__nombre').textContent;
    const sumar = () => { contador.textContent = +contador.textContent + 1; contador.classList.remove('is-pop'); void contador.offsetWidth; contador.classList.add('is-pop'); };
    if (!anima) { sumar(); toast(`¡Agregado a la bolsa! ${nombre}`); return; }
    const a = btn.getBoundingClientRect(), b = bolsa.getBoundingClientRect();
    const v = document.createElement('img');
    v.src = `img/${['15-ladrillo-rojo', '16-ladrillo-azul', '17-ladrillo-amarillo'][Math.floor(Math.random() * 3)]}.webp`;
    v.className = 'volador'; v.alt = ''; document.body.appendChild(v);
    const sx = a.left + a.width / 2 - 26, sy = a.top - 20, dx = b.left + b.width / 2 - 26 - sx, dy = b.top + b.height / 2 - 20 - sy;
    gsap.set(v, { left: sx, top: sy });
    gsap.timeline({ onComplete: () => { v.remove(); sumar(); } })
      .to(v, { x: dx * .5, y: Math.min(-140, dy * .5 - 140), rotation: 200, duration: .42, ease: 'power1.out' })
      .to(v, { x: dx, y: dy, rotation: 380, scale: .4, duration: .45, ease: 'power2.in' });
    toast(`¡Agregado a la bolsa! ${nombre}`);
  });
  // inclinación 3D de la tarjeta con el puntero
  $$('.producto').forEach((p) => {
    p.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = p.getBoundingClientRect(); const dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
      p.style.setProperty('--rx', `${-dy * 8}deg`); p.style.setProperty('--ry', `${dx * 10}deg`);
    });
    p.addEventListener('pointerleave', () => { p.style.removeProperty('--rx'); p.style.removeProperty('--ry'); });
  });

  /* caja 3D del taller (paso a paso) */
  const CAJA_TALLER = { tema: 'CITY', nombre: 'Explorador Espacial', set: '60432', edad: '8+', img: '08-nave', iw: '92%', c1: '#14206a', c2: '#0d1650', c3: '#070c33', arte: 'radial-gradient(circle at 70% 30%, #3a4bb8, #14206a 55%, #070c33)' };
  const cajaHTML = (s, conTapa = false) => `
    <div class="caja" style="--c1:${s.c1};--c2:${s.c2};--c3:${s.c3};--fondo-arte:${s.arte};--iw:${s.iw}">
      <div class="caja__sombra"></div>
      <div class="caja__3d">
        <div class="caja__cara caja__lado"><span>${s.tema} · ${s.nombre.toUpperCase()}</span></div>
        <div class="caja__cara ${conTapa ? 'caja__tapa' : 'caja__arriba'}"></div>
        <div class="caja__cara caja__frente">
          <div class="caja__arte"><img src="img/${s.img}.webp" alt="" loading="lazy"></div>
          <div class="caja__banda"><img src="img/logo-lego.png" alt=""><span class="caja__tema">${s.tema}</span></div>
          <div class="caja__edad">${s.edad}<small>${s.set}</small></div>
          <div class="caja__brillo"></div>
        </div>
        ${conTapa ? '<div class="caja__luz"></div>' : ''}
      </div>
    </div>`;


  /* =========================================================
     PIEZA A PIEZA · taller
     ========================================================= */
  const cajaTaller = $('#taller-caja');
  cajaTaller.innerHTML = cajaHTML(CAJA_TALLER, true);
  const PIEZAS = [
    // tipo, desktop [x,y,w,r], móvil [x,y,w,r], color
    ['img:15-ladrillo-rojo', [560, 300, 110, -14], [70, 300, 70, -14]],
    ['img:16-ladrillo-azul', [780, 110, 80, 18], [270, 190, 56, 18]],
    ['img:17-ladrillo-amarillo', [700, 360, 70, 30], [230, 320, 50, 30]],
    ['img:16-ladrillo-azul', [500, 150, 64, -22], [40, 200, 46, -22]],
    ['p-placa', [620, 150, 120, 12], [130, 190, 80, 12], '#f2f2f2'],
    ['p-placa', [800, 300, 100, -20], [300, 290, 66, -20], '#e3000b'],
    ['p-viga', [590, 240, 150, -6], [110, 260, 100, -6]],
    ['p-viga', [760, 210, 110, 24], [250, 240, 76, 24]],
    ['p-cupula', [660, 80, 120, -8], [170, 140, 80, -8]],
    ['p-motor', [860, 180, 64, 0], [340, 230, 44, 0]],
    ['p-ala', [480, 260, 130, 8], [20, 260, 84, 8], '#e3000b'],
    ['p-ala', [860, 380, 110, -16], [320, 350, 70, -16], '#1f5fbf'],
    ['p-placa', [720, 260, 70, 40], [190, 280, 50, 40], '#9aa0a6'],
    ['img:17-ladrillo-amarillo', [520, 400, 46, -30], [20, 350, 36, -30]],
  ];
  const piezasCont = $('#taller-piezas');
  piezasCont.innerHTML = PIEZAS.map(([t, d, m, c]) => {
    const inner = t.startsWith('img:') ? `<img src="img/${t.slice(4)}.webp" alt="">` : `<div class="${t}"${c ? ` style="--pc:${c}"` : ''}></div>`;
    return `<div class="pieza" style="--x:${d[0]};--y:${d[1]};--w:${d[2]};--r:${d[3]};--mx:${m[0]};--my:${m[1]};--mw:${m[2]}">${inner}</div>`;
  }).join('');

  const pasosItems = $$('#pasos-barra li[data-paso]');
  const pasosLineas = $$('#pasos-barra .pasos__linea span');
  const NOTAS = ['Abre la caja: cada bolsa numerada es una etapa.', 'Construye: cada pieza encuentra su lugar.', 'Disfruta: tu set está listo para despegar.'];
  const nota = $('#taller-nota');
  let pasoActual = -1;
  const marcarPaso = (i) => {
    if (i === pasoActual) return; pasoActual = i;
    pasosItems.forEach((li, k) => li.classList.toggle('is-on', k <= i));
    nota.textContent = NOTAS[i];
    if (anima) gsap.fromTo(nota, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .35, ease: 'back.out(2)' });
  };
  marcarPaso(0);

  /* =========================================================
     LABORATORIO · crea tu minifigura
     Comportamiento de la landing inicial: la sección se fija,
     caen piernas → torso → cabeza, luego se activan los carretes.
     GUARDAR encaja las piezas; ALEATORIO gira con frenado escalonado.
     ========================================================= */
  const PERSONAJES = [
    { id: 'obrero', nombre: 'Constructor' }, { id: 'pirata', nombre: 'Pirata' }, { id: 'astronauta', nombre: 'Astronauta' },
    { id: 'cientifica', nombre: 'Científica' }, { id: 'explorador', nombre: 'Explorador' }, { id: 'piloto', nombre: 'Piloto' },
  ];
  // tamaño recortado de cada PNG (px del original): mantiene la escala real entre piezas
  const DIM = {
    'cabeza-astronauta': [940, 1116], 'cabeza-cientifica': [846, 1126], 'cabeza-explorador': [1192, 1150], 'cabeza-obrero': [958, 1112], 'cabeza-piloto': [982, 1078], 'cabeza-pirata': [1168, 1006],
    'torso-astronauta': [1196, 1042], 'torso-cientifica': [1202, 1056], 'torso-explorador': [1204, 1072], 'torso-obrero': [1156, 1042], 'torso-piloto': [1208, 1062], 'torso-pirata': [1200, 1068],
    'piernas-astronauta': [828, 1166], 'piernas-cientifica': [860, 1164], 'piernas-explorador': [814, 1144], 'piernas-obrero': [786, 1134], 'piernas-piloto': [798, 1152], 'piernas-pirata': [804, 1144],
  };
  const ESCALA_CABEZA = .78;  // las cabezas venían más grandes que el torso
  const SOLAPE_CUELLO = .165; // la cabeza tapa el cuello del torso
  const SOLAPE_CADERA = .29;  // el torso tapa los pines de las piernas
  const REF = 2600;           // alto de una figura completa en px del original
  const PARTES = ['cabeza', 'torso', 'piernas'];
  const N = PERSONAJES.length;
  const tam = (p, id) => { const [w, h] = DIM[`${p}-${id}`]; return p === 'cabeza' ? [w * ESCALA_CABEZA, h * ESCALA_CABEZA] : [w, h]; };
  const idDe = (i) => PERSONAJES[((i % N) + N) % N].id;
  const nombreDe = (i) => PERSONAJES[((i % N) + N) % N].nombre;

  const idx = { cabeza: 1, torso: 1, piernas: 1 }; // pirata
  try {
    const g = JSON.parse(localStorage.getItem('lego-lab-figura'));
    if (g) PARTES.forEach((p) => { const i = PERSONAJES.findIndex((c) => c.id === g[p]); if (i >= 0) idx[p] = i; });
  } catch (e) { /* sin almacenamiento */ }

  const escena = $('#lab-escena');
  const figura = $('#figura');
  const nombreFig = $('#lab-nombre');
  let alto = 300, activa = !anima, armada = false;

  // geometría de la figura: posición inferior, ancho, alto y centro de cada pieza
  const geometria = (sel, h, sep) => {
    const k = h / REF;
    const [lw, lh] = tam('piernas', sel.piernas), [tw, th] = tam('torso', sel.torso), [hw, hh] = tam('cabeza', sel.cabeza);
    const torsoB = lh * k - SOLAPE_CADERA * th * k + sep;
    const cabezaB = torsoB + th * k - SOLAPE_CUELLO * th * k + sep;
    return {
      piernas: { b: 0, w: lw * k, h: lh * k, c: lh * k * .5 },
      torso: { b: torsoB, w: tw * k, h: th * k, c: torsoB + th * k * .45 },
      cabeza: { b: cabezaB, w: hw * k, h: hh * k, c: cabezaB + hh * k * .5 },
    };
  };
  const seleccion = () => ({ cabeza: idDe(idx.cabeza), torso: idDe(idx.torso), piernas: idDe(idx.piernas) });
  const separacion = () => (armada ? 0 : alto * .03);

  // DOM: por fila, tres imágenes (anterior · actual · siguiente) y dos flechas
  const filas = {};
  const flechaSVG = (dir) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  ['piernas', 'torso', 'cabeza'].forEach((p, z) => {
    const fila = document.createElement('div'); fila.className = 'fila'; fila.style.zIndex = z + 1;
    const marco = document.createElement('div'); marco.className = 'fila__marco';
    fila.appendChild(marco);
    const imgs = [-1, 0, 1].map((d) => { const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.className = 'fila__pieza'; im.src = `img/${p}-${idDe(idx[p] + d)}.webp`; fila.appendChild(im); return im; });
    const flechas = [-1, 1].map((d) => {
      const b = document.createElement('button'); b.className = 'figura__flecha'; b.type = 'button';
      b.setAttribute('aria-label', `${p} ${d < 0 ? 'anterior' : 'siguiente'}`); b.innerHTML = flechaSVG(d);
      b.addEventListener('click', (e) => { e.stopPropagation(); mover(p, d, .45); });
      fila.appendChild(b); return b;
    });
    figura.appendChild(fila);
    filas[p] = { fila, marco, slots: { prev: imgs[0], cur: imgs[1], next: imgs[2] }, flechas };
  });

  // posiciones de cada hueco del carrete
  const LADO = .5;
  const specs = (p, g) => {
    const sideX = g.torso.w * .95;
    const lado = (d) => {
      const [w, h] = tam(p, idDe(idx[p] + d)); const k = g[p].w / tam(p, idDe(idx[p]))[0];
      const ww = w * k * LADO, hh = h * k * LADO;
      return { left: d * sideX, bottom: g[p].c - hh / 2, width: ww, opacity: activa && !armada ? .35 : 0 };
    };
    return { prev: lado(-1), cur: { left: 0, bottom: g[p].b, width: g[p].w, opacity: 1 }, next: lado(1), sideX };
  };
  function colocar(dur = 0, solo) {
    const g = geometria(seleccion(), alto, separacion());
    PARTES.forEach((p) => {
      if (solo && !solo.includes(p)) return;
      const f = filas[p], s = specs(p, g);
      ['prev', 'cur', 'next'].forEach((k) => {
        const props = { left: s[k].left, bottom: s[k].bottom, width: s[k].width, opacity: s[k].opacity };
        if (dur && anima) gsap.to(f.slots[k], { ...props, duration: dur, ease: 'back.out(1.6)', overwrite: 'auto' }); else gsap.set(f.slots[k], props);
      });
      const media = escena.clientWidth / 2;
      const fx = Math.min(s.sideX + g.torso.w * .34 + 26, media - 28);
      f.flechas.forEach((b, i) => { b.style.left = `${(i ? 1 : -1) * fx}px`; b.style.bottom = `${g[p].c}px`; });
      Object.assign(f.marco.style, { left: `${-g[p].w / 2 - 8}px`, bottom: `${g[p].b - 8}px`, width: `${g[p].w + 16}px`, height: `${g[p].h + 16}px` });
    });
  }
  const actualizarNombre = () => {
    nombreFig.textContent = PARTES.map((p) => nombreDe(idx[p])).join(' · ');
    $$('.preset').forEach((b) => b.classList.toggle('is-on', PARTES.every((p) => idDe(idx[p]) === b.dataset.id)));
  };

  // el podio del fondo está al ~80 % del alto de la imagen (1536 × 1024, alineada abajo)
  function ajustarEscena() {
    const W = escena.clientWidth, H = escena.clientHeight;
    const s = Math.max(W / 1536, H / 1024), imgH = 1024 * s, offY = H - imgH;
    const piso = H - (offY + .8 * imgH);
    alto = Math.min(H * .44, imgH * .42, W * .64);
    figura.style.bottom = `${piso}px`;
    figura.style.height = `${alto}px`;
    escena.style.setProperty('--piso', `${piso}px`);
    escena.style.setProperty('--botones', `${Math.max(16, H - (offY + .955 * imgH))}px`); // justo bajo el podio
    colocar(0);
  }
  new ResizeObserver(ajustarEscena).observe(escena);

  const haz = $('#lab-haz'), anillo = $('#lab-anillo');
  const pulso = () => {
    if (!anima) return;
    gsap.fromTo(haz, { opacity: .9 }, { opacity: 0, duration: .7, ease: 'power2.out' });
    gsap.fromTo(anillo, { opacity: 1, scale: .6 }, { opacity: 0, scale: 1.4, duration: .8, ease: 'power2.out' });
  };
  const sacudir = () => anima && gsap.fromTo(figura, { x: 0 }, { keyframes: [{ x: 3, duration: .04 }, { x: -3, duration: .04 }, { x: 0, duration: .04 }] });

  // carrete: la pieza lateral se desliza al centro
  function mover(p, dir, dur) {
    if (armada) desarmar();
    const f = filas[p];
    idx[p] += dir;
    const sale = dir > 0 ? f.slots.prev : f.slots.next;
    f.slots = dir > 0 ? { prev: f.slots.cur, cur: f.slots.next, next: sale } : { prev: sale, cur: f.slots.prev, next: f.slots.cur };
    const g = geometria(seleccion(), alto, separacion());
    const s = specs(p, g);
    actualizarNombre();
    if (!anima || !dur) { sale.src = `img/${p}-${idDe(idx[p] + dir)}.webp`; colocar(0); return Promise.resolve(); }
    return new Promise((res) => {
      gsap.to(sale, { left: -dir * s.sideX * 2, opacity: 0, duration: dur * .5, ease: 'power2.in', overwrite: 'auto',
        onComplete: () => { sale.src = `img/${p}-${idDe(idx[p] + dir)}.webp`; gsap.set(sale, { left: dir * s.sideX * 2 }); colocar(dur * .5, [p]); } });
      ['prev', 'cur', 'next'].forEach((k) => { if (f.slots[k] !== sale) gsap.to(f.slots[k], { left: s[k].left, bottom: s[k].bottom, width: s[k].width, opacity: s[k].opacity, duration: dur, ease: 'back.out(1.4)', overwrite: 'auto' }); });
      colocar(dur, PARTES.filter((q) => q !== p)); // el torso cambia de alto: reacomoda las demás filas
      gsap.delayedCall(dur, res);
    });
  }

  // GUARDAR: las piezas se juntan y se forma la minifigura (como en la landing inicial)
  function armar() {
    if (armada) return;
    armada = true; figura.classList.add('is-armada');
    const g = geometria(seleccion(), alto, 0);
    if (!anima) { colocar(0); return; }
    PARTES.forEach((p) => ['prev', 'next'].forEach((k) => gsap.to(filas[p].slots[k], { opacity: 0, duration: .25, overwrite: 'auto' })));
    const tl = gsap.timeline();
    ['piernas', 'torso', 'cabeza'].forEach((p, i) => {
      const cur = filas[p].slots[0] || filas[p].slots.cur, b = g[p].b;
      tl.to(cur, { bottom: b + 18, duration: .16, ease: 'power2.out', overwrite: 'auto' }, .1 + i * .2)
        .to(cur, { bottom: b, duration: .38, ease: 'bounce.out' }, .26 + i * .2);
    });
    tl.add(() => colocar(0), '>')
      .add(sacudir, '<')
      .to(figura, { y: -22, duration: .16, ease: 'power2.out' })
      .to(figura, { y: 0, duration: .45, ease: 'bounce.out' })
      .fromTo($$('.fila__marco', figura), { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: .4, ease: 'back.out(2)', stagger: .06 }, '-=.5')
      .add(pulso, '<');
  }
  function desarmar() {
    if (!armada) return;
    armada = false; figura.classList.remove('is-armada');
    if (anima) gsap.to($$('.fila__marco', figura), { opacity: 0, duration: .2 });
    colocar(anima ? .4 : 0);
  }
  figura.addEventListener('click', (e) => { if (armada && !e.target.closest('.figura__flecha')) desarmar(); });

  // presets: las piezas del personaje caen y encajan
  const presets = $('#presets');
  presets.innerHTML = PERSONAJES.map((c) => `<button class="preset" type="button" role="listitem" data-id="${c.id}" aria-label="${c.nombre}"><div class="preset__fig"></div><span>${c.nombre}</span></button>`).join('');
  $$('.preset', presets).forEach((b) => {
    const cont = $('.preset__fig', b);
    const ims = ['piernas', 'torso', 'cabeza'].map((p, z) => { const im = document.createElement('img'); im.alt = ''; im.loading = 'lazy'; im.style.zIndex = z + 1; im.src = `img/${p}-${b.dataset.id}.webp`; cont.appendChild(im); return [p, im]; });
    const pintar = () => { const g = geometria({ cabeza: b.dataset.id, torso: b.dataset.id, piernas: b.dataset.id }, cont.clientHeight, 0); ims.forEach(([p, im]) => { im.style.width = `${g[p].w}px`; im.style.bottom = `${g[p].b}px`; }); };
    new ResizeObserver(pintar).observe(cont);
    b.addEventListener('click', () => {
      if (armada) desarmar();
      const i = PERSONAJES.findIndex((c) => c.id === b.dataset.id);
      PARTES.forEach((p) => { idx[p] = i; const s = filas[p].slots; s.prev.src = `img/${p}-${idDe(i - 1)}.webp`; s.cur.src = `img/${p}-${idDe(i)}.webp`; s.next.src = `img/${p}-${idDe(i + 1)}.webp`; });
      colocar(0); actualizarNombre();
      if (!anima) return;
      const tl = gsap.timeline();
      ['piernas', 'torso', 'cabeza'].forEach((p, k) => tl.fromTo(filas[p].slots.cur, { y: -window.innerHeight * .6, rotation: k % 2 ? 8 : -8 }, { y: 0, rotation: 0, duration: .55, ease: 'bounce.out' }, k * .25));
      tl.add(pulso, '-=.2').add(sacudir, '<');
    });
  });
  actualizarNombre();

  // ALEATORIO: las tres filas giran con frenado escalonado
  let girando = false;
  $('#btn-aleatorio').addEventListener('click', async () => {
    if (girando) return; girando = true;
    if (armada) desarmar();
    await Promise.all(['cabeza', 'torso', 'piernas'].map((p, f) => (async () => {
      const vueltas = 6 + f * 3 + Math.floor(Math.random() * 4);
      for (let n = 0; n < vueltas; n++) await mover(p, 1, anima ? .12 + (n / vueltas) ** 2 * .4 : 0);
    })()));
    if (anima) gsap.timeline().to(figura, { y: -16, duration: .16, ease: 'power2.out' }).to(figura, { y: 0, duration: .4, ease: 'bounce.out' });
    pulso(); girando = false;
  });
  $('#btn-guardar').addEventListener('click', () => {
    try { localStorage.setItem('lego-lab-figura', JSON.stringify(seleccion())); } catch (e) { /* sin almacenamiento */ }
    armar();
    setTimeout(() => toast(`¡Guardada! ${nombreFig.textContent}`), anima ? 1200 : 0);
  });

  // activa/desactiva los carretes laterales y las flechas
  const activar = (on) => {
    if (on === activa) return; activa = on;
    figura.classList.toggle('is-activa', on);
    colocar(anima ? .4 : 0);
  };
  figura.classList.toggle('is-activa', activa);


  /* =========================================================
     SCROLL (GSAP)
     ========================================================= */
  const navScroll = () => nav.classList.toggle('is-scroll', window.scrollY > 40);
  window.addEventListener('scroll', navScroll, { passive: true }); navScroll();
  if (!hayGsap) return;

  if (reduce) return;

  // taller: sección fija; la caja se abre, las piezas salen y la nave se arma
  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 761px)', mob: '(max-width: 760px)' }, () => {
    const caja3d = $('.caja__3d', cajaTaller), tapa = $('.caja__tapa', cajaTaller), luz = $('.caja__luz', cajaTaller);
    const piezas = $$('.pieza', piezasCont);
    const nave = $('#taller-nave'), naveImg = $('img', nave), destello = $('.destello', nave);
    const origen = (el) => {
      const c = cajaTaller.getBoundingClientRect(), e = el.getBoundingClientRect();
      return { x: c.left + c.width * .45 - (e.left + e.width / 2), y: c.top + c.height * .3 - (e.top + e.height / 2) };
    };
    const flecha = (id) => $$('path', $(id)).map((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; return p; });
    const f1 = flecha('#flecha-1'), f2 = flecha('#flecha-2');
    gsap.set(piezas, { x: (i, el) => origen(el).x, y: (i, el) => origen(el).y, scale: .2, opacity: 0 });
    gsap.set(naveImg, { opacity: 0, scale: .7, filter: 'blur(10px) brightness(1.8)' });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.pasos__pin', start: 'top top', end: '+=1800', pin: true, scrub: .6, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (st) => { marcarPaso(st.progress < .34 ? 0 : st.progress < .66 ? 1 : 2); },
      },
    });
    tl.fromTo(cajaTaller, { y: 120, rotation: -10, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: .1, ease: 'back.out(1.6)' }, 0)
      .to(caja3d, { keyframes: [{ rotateZ: -3, duration: .02 }, { rotateZ: 3, duration: .02 }, { rotateZ: -2, duration: .02 }, { rotateZ: 0, duration: .02 }] }, .1)
      .fromTo(tapa, { '--abre': '90deg' }, { '--abre': '215deg', duration: .12, ease: 'back.out(1.4)' }, .18)
      .to(luz, { opacity: 1, duration: .08 }, .22)
      .to(pasosLineas[0], { scaleX: 1, duration: .2 }, .14)
      .to('#flecha-1', { opacity: 1, duration: .02 }, .3).to(f1, { strokeDashoffset: 0, duration: .1 }, .3)
      .to(piezas, { x: 0, y: 0, scale: 1, opacity: 1, duration: .22, ease: 'back.out(1.3)', stagger: .012 }, .32)
      .to(luz, { opacity: .3, duration: .1 }, .5)
      .to(pasosLineas[1], { scaleX: 1, duration: .2 }, .46)
      .to('#flecha-2', { opacity: 1, duration: .02 }, .62).to(f2, { strokeDashoffset: 0, duration: .1 }, .62)
      .to(naveImg, { opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)', duration: .22, ease: 'power2.out' }, .68)
      .fromTo(destello, { opacity: 0, scale: .3 }, { opacity: 1, scale: 3, duration: .06 }, .84)
      .to(destello, { opacity: 0, duration: .08 }, .9)
      .to(nave, { y: -12, rotate: -3, duration: .1 }, .9);
    // flotación de las piezas sueltas (independiente del scroll)
    const idle = piezas.map((p, i) => gsap.to($('*', p), { y: (i % 2 ? -1 : 1) * 8, duration: 1.6 + (i % 4) * .3, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    // los pasos de la barra llevan a su etapa
    pasosItems.forEach((li, i) => $('button', li).addEventListener('click', () => {
      const st = tl.scrollTrigger; window.scrollTo({ top: st.start + (st.end - st.start) * [.2, .55, .98][i], behavior: 'smooth' });
    }));
    return () => idle.forEach((t) => t.kill());
  });

  // laboratorio: sección fija; caen piernas (0–30 %), torso (30–60 %), cabeza (60–90 %); al 90 % se activan los carretes
  {
    const orden = ['piernas', 'torso', 'cabeza'];
    const tlLab = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#lab-escena', start: 'top top', end: '+=1400', pin: true, scrub: .5, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: (st) => activar(st.progress >= .9) },
    });
    orden.forEach((p, i) => {
      const t0 = i * .3, f = filas[p];
      tlLab.fromTo(f.fila, { y: () => -window.innerHeight }, { y: 0, duration: .24, ease: 'power2.in' }, t0)
        .to(f.fila, { y: -12, duration: .03, ease: 'power1.out' }, t0 + .24)
        .to(f.fila, { y: 0, duration: .03, ease: 'power1.in' }, t0 + .27)
        .fromTo(f.marco, { opacity: .6 }, { opacity: 0, duration: .03 }, t0 + .24)
        .fromTo(figura, { x: 0 }, { keyframes: [{ x: 3, duration: .01 }, { x: -3, duration: .01 }, { x: 0, duration: .01 }] }, t0 + .24);
    });
    tlLab.to(figura, { y: -26, duration: .04, ease: 'power2.out' }, .87)
      .to(figura, { y: 0, duration: .04, ease: 'bounce.out' }, .91)
      .fromTo('#lab-anillo', { opacity: 0, scale: .6 }, { opacity: 1, scale: 1.2, duration: .03 }, .9)
      .to('#lab-anillo', { opacity: 0, duration: .04 }, .93)
      .to({}, { duration: .04 }, .96);
  }

  // parallax por capas
  $$('.capa[data-v]').forEach((el) => {
    const v = parseFloat(el.dataset.v); if (!v) return;
    gsap.fromTo(el, { y: () => v * window.innerHeight * .5 }, {
      y: () => -v * window.innerHeight * .5, ease: 'none',
      scrollTrigger: { trigger: el.closest('.escena'), start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  });

  // las vías se construyen con el scroll
  $$('.via').forEach((svg) => {
    const mp = svg._mascara; if (!mp || !svg.getClientRects().length) return;
    const len = mp.getTotalLength(); mp.style.strokeDasharray = len; mp.style.strokeDashoffset = len;
    gsap.to(mp, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: svg.closest('.escena'), start: 'top 85%', end: 'bottom 60%', scrub: .6 } });
  });

  // hero
  gsap.timeline({ delay: .15 })
    .from('.bloque--hero .palabra > span', { yPercent: 110, duration: .8, ease: 'power4.out', stagger: .07 })
    .from('.bloque--hero .bajada, .bloque--hero .boton, .bloque--hero .desliza', { y: 20, opacity: 0, duration: .6, stagger: .1, ease: 'power3.out' }, '-=.4')
    .from('[data-hero]', { scale: 0, opacity: 0, duration: .7, stagger: .08, ease: 'back.out(2.2)' }, .2)
    .from('.nav', { y: -30, opacity: 0, duration: .6, ease: 'power3.out' }, 0);
  const heroCapas = $$('.hero-astro, [data-hero]');
  const moverHero = heroCapas.map((el, i) => ({ f: gsap.quickTo(el, 'xPercent', { duration: .9, ease: 'power3.out' }), k: i === 0 ? 2.5 : 5 + i }));
  window.addEventListener('pointermove', (e) => {
    if (window.scrollY > window.innerHeight || e.pointerType === 'touch') return;
    const dx = e.clientX / window.innerWidth - .5; moverHero.forEach((m) => m.f(dx * m.k));
  }, { passive: true });
  $$('[data-hero]').forEach((b) => { b.style.pointerEvents = 'auto'; b.style.cursor = 'pointer'; b.addEventListener('click', () => gsap.fromTo(b, { scale: 1 }, { keyframes: [{ scale: 1.25, duration: .15 }, { scale: 1, duration: .5, ease: 'elastic.out(1, .4)' }] })); });

  // títulos de sección
  $$('.titulo').forEach((t) => {
    if (t.closest('.bloque--hero')) return;
    gsap.from($$('.palabra > span', t), { yPercent: 110, duration: .7, ease: 'power4.out', stagger: .06, scrollTrigger: { trigger: t, start: 'top 85%' } });
  });
  // categorías: cada mosaico cae y encaja con rebote; la foto hace parallax dentro
  gsap.fromTo('.tema', { y: -220, opacity: 0, rotation: (i) => (i % 2 ? 6 : -6) }, { y: 0, opacity: 1, rotation: 0, duration: .9, ease: 'bounce.out', stagger: .08, clearProps: 'transform,opacity', scrollTrigger: { trigger: '#temas-grid', start: 'top 82%' } });
  $$('.tema').forEach((t) => gsap.fromTo($('.tema__foto', t), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: true } }));
  gsap.from('.escena--espacio .boton', { y: 24, opacity: 0, duration: .6, ease: 'back.out(2)', scrollTrigger: { trigger: '.escena--espacio .boton', start: 'top 90%' } });

  // sets: las tarjetas salen de abajo como si se abriera una caja (giro y rebote)
  gsap.fromTo('.producto', { y: 200, opacity: 0, rotation: (i) => (i % 2 ? 10 : -10) }, { y: 0, opacity: 1, rotation: 0, duration: 1, ease: 'back.out(1.7)', stagger: .08, clearProps: 'transform,opacity', scrollTrigger: { trigger: '#sets-grid', start: 'top 82%' } });

  const labEl = $('#laboratorio');
  const navOscuro = () => nav.classList.toggle('is-oscuro', labEl.getBoundingClientRect().top <= 60);
  window.addEventListener('scroll', navOscuro, { passive: true }); navOscuro();
  [['#mundos', 0], ['#sets', 1], ['#laboratorio', 2]].forEach(([id, i]) => {
    ScrollTrigger.create({ trigger: id, start: 'top 60%', end: 'bottom 40%', onToggle: (st) => $$('.nav__links a')[i].classList.toggle('is-activo', st.isActive) });
  });

  gsap.fromTo('.preset', { y: 40, opacity: 0 }, { y: 0, opacity: 1, clearProps: 'transform,opacity', stagger: .07, duration: .6, ease: 'back.out(2)', scrollTrigger: { trigger: '#presets', start: 'top 92%' } });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
