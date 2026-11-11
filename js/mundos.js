/* =========================================================
   LEGO · Cada mundo empieza con un ladrillo — interacción
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const movil = () => innerWidth <= 820;

  /* ---------- parallax por capas (fondo lento, modelo medio, título rápido) ---------- */
  const capas = $$('[data-p]').map((el) => ({ el, p: parseFloat(el.dataset.p) || 0, sec: el.closest('.cap') }));
  const parallax = () => {
    if (reduce) return;
    const k = movil() ? .5 : 1, rels = new Map();
    for (const c of capas) {
      let rel = rels.get(c.sec);
      if (rel === undefined) { const r = c.sec.getBoundingClientRect(); rel = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; rels.set(c.sec, rel); }
      if (Math.abs(rel) > 1.6) continue;
      c.el.style.transform = `translate3d(0, ${(rel * c.p * innerHeight * k / (window.__zf || 1)).toFixed(1)}px, 0)` + (c.el.classList.contains('mundo__banda') || c.el.classList.contains('hero__banda') ? ` skewX(${c.el.closest('.mundo--hp') ? 24 : -22}deg)` : '');
    }
  };

  /* ---------- rueda de navegación + capítulo activo ---------- */
  const caps = $$('.cap');
  const prog = $('#rueda-prog'), sig = $('#rueda-sig');
  const puntos = $$('.menu [data-cap]');
  let capActual = -1;
  const ui = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.strokeDashoffset = (176 * (1 - scrollY / Math.max(1, max))).toFixed(1);
    const centro = innerHeight * .45;
    let idx = 0;
    caps.forEach((c, i) => { if (c.getBoundingClientRect().top < centro) idx = i; });
    if (idx !== capActual) {
      capActual = idx;
      puntos.forEach((a) => { if (+a.dataset.cap === idx) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      const siguiente = caps[Math.min(idx + 1, caps.length - 1)];
      sig.href = '#' + (idx === caps.length - 1 ? 'inicio' : siguiente.id);
      sig.setAttribute('aria-label', idx === caps.length - 1 ? 'Volver al inicio' : 'Ir al siguiente capítulo');
      // color de la interfaz fija según el fondo del capítulo
      document.body.classList.toggle('en-tienda', idx === caps.length - 1);
      const claro = idx <= 1;
      document.body.style.setProperty('--c-ui', claro ? '#1b2233' : '#fff');
      document.body.style.setProperty('--c-ui-inv', claro ? '#fff' : '#1b2233');
    }
  };

  let pendiente = false;
  const enScroll = () => { if (pendiente) return; pendiente = true; requestAnimationFrame(() => { pendiente = false; parallax(); ui(); }); };
  addEventListener('scroll', enScroll, { passive: true });
  addEventListener('resize', enScroll);
  enScroll();

  /* ---------- menú móvil ---------- */
  const menu = $('#menu'), menuBtn = $('#menu-boton');
  const cerrarMenu = () => { menu.classList.remove('is-abierto'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => {
    const abrir = menuBtn.getAttribute('aria-expanded') !== 'true';
    menu.classList.toggle('is-abierto', abrir); menuBtn.setAttribute('aria-expanded', String(abrir));
    if (abrir) menu.querySelector('a')?.focus();
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) cerrarMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { cerrarMenu(); menuBtn.focus(); } });

  /* ---------- entradas ---------- */
  const ioR = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); ioR.unobserve(e.target); } }), { threshold: .2 });
  $$('.revela').forEach((el) => ioR.observe(el));

  /* ---------- Harry Potter: encender el castillo ---------- */
  const hp = $('#harry-potter');
  const btnLuz = $('#btn-luz'), btnLuzTxt = $('#btn-luz-txt');
  btnLuz.addEventListener('click', () => {
    const on = btnLuz.getAttribute('aria-pressed') !== 'true';
    btnLuz.setAttribute('aria-pressed', String(on));
    hp.classList.toggle('is-luz', on);
    btnLuzTxt.textContent = on ? 'Apagar el castillo' : 'Encender el castillo';
    document.dispatchEvent(new CustomEvent('castillo:luz', { detail: on }));
  });

  /* ---------- logo de Marvel: se quita el fondo rojo para que quede transparente ---------- */
  $$('img[src$="logo-marvel.webp"]').forEach((img) => {
    const quitar = () => {
      try {
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, cv.width, cv.height), p = d.data;
        for (let i = 0; i < p.length; i += 4) {
          const r = p[i], g = p[i + 1], bl = p[i + 2];
          const rojo = Math.max(0, Math.min(1, (r - (g + bl) / 2 - 40) / 80)); // 1 = fondo rojo, 0 = letras blancas
          p[i] = p[i + 1] = p[i + 2] = 255; p[i + 3] = Math.round(p[i + 3] * (1 - rojo));
        }
        ctx.putImageData(d, 0, 0); img.src = cv.toDataURL(); img.classList.add('logo-blanco');
      } catch { /* si el navegador bloquea el lienzo, queda el logo original */ }
    };
    img.complete && img.naturalWidth ? quitar() : img.addEventListener('load', quitar, { once: true });
  });

  /* ---------- 3D ---------- */
  const heroIconos = $('#hero-iconos'), heroNombre = $('#hero-nombre');
  const sinTresD = () => { document.documentElement.classList.add('sin-3d'); heroNombre.textContent = 'Vista 3D no disponible'; $('#nave-credito').textContent = 'La vista 3D no está disponible en este navegador; te mostramos la foto del set.'; };

  Promise.all([import('./escena3d.js'), fetch('models/modelos.json').then((r) => r.json())]).then(([m3d, man]) => {
    if (!m3d.webglDisponible()) return sinTresD();
    const figs = man.minifiguras || [];
    const porId = Object.fromEntries(figs.map((f) => [f.id, f]));

    /* portada: carrusel de minifiguras */
    const visorHero = $('#visor-hero');
    const vHero = m3d.crearVista(visorHero, { interactiva: true, rotBase: [.05, -.3], encuadre: movil() ? 1.3 : 1.05 });
    let i = 0;
    heroIconos.innerHTML = figs.map((f, k) => `<button type="button" class="icono icono--solo" data-k="${k}" aria-pressed="${k === 0}" aria-label="${f.nombre} (${f.licencia})" title="${f.nombre}" style="--c:${f.color}">
        <span class="icono__img icono__img--retrato"><img alt="" data-retrato="${f.archivo}"></span></button>`).join('');
    const mostrar = (k, auto = false) => {
      i = (k + figs.length) % figs.length;
      const f = figs[i];
      vHero.poner(f.archivo, { minifig: true, pose: f.pose, radio: 5 });
      // el cambio automático no se anuncia al lector de pantalla; el manual sí
      heroNombre.setAttribute('aria-live', auto ? 'off' : 'polite');
      heroNombre.innerHTML = `<b>${f.nombre}</b><span>${f.licencia}</span>`;
      $$('.icono', heroIconos).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.k === i)));
      document.querySelector('.hero').style.setProperty('--licencia', f.color);
      reiniciarTiempo();
    };

    /* avance automático: cada 6 s; se pausa con hover, foco, arrastre, fuera de pantalla o con el botón */
    const DURACION = 6000;
    const barra = $('#hero-tiempo'), btnPausa = $('#hero-pausa'), hero = $('#inicio');
    let transcurrido = 0, ultimo = performance.now(), enPantalla = true, hover = false, foco = false, pausaManual = reduce;
    const pausado = () => pausaManual || hover || foco || !enPantalla || document.hidden || (vHero.tocando && performance.now() - vHero.tocando < 4000);
    function reiniciarTiempo() { transcurrido = 0; if (barra) barra.style.transform = 'scaleX(0)'; }
    const tickAuto = (now) => {
      const dt = now - ultimo; ultimo = now;
      if (!pausado()) {
        transcurrido += dt;
        if (barra) barra.style.transform = `scaleX(${Math.min(1, transcurrido / DURACION).toFixed(3)})`;
        if (transcurrido >= DURACION) mostrar(i + 1, true);
      }
      requestAnimationFrame(tickAuto);
    };
    if (!reduce) requestAnimationFrame(tickAuto);
    const zonaHover = [$('.hero__escenario'), $('.carrusel')];
    zonaHover.forEach((z) => { z?.addEventListener('pointerenter', () => { hover = true; }); z?.addEventListener('pointerleave', () => { hover = false; }); });
    hero.addEventListener('focusin', () => { foco = true; });
    hero.addEventListener('focusout', (e) => { if (!hero.contains(e.relatedTarget)) foco = false; });
    new IntersectionObserver((ents) => { enPantalla = ents[0].isIntersecting; }, { threshold: .4 }).observe(hero);
    btnPausa?.addEventListener('click', () => {
      pausaManual = !pausaManual;
      btnPausa.setAttribute('aria-pressed', String(pausaManual));
      btnPausa.setAttribute('aria-label', pausaManual ? 'Reanudar el cambio automático' : 'Pausar el cambio automático');
      btnPausa.firstElementChild.textContent = pausaManual ? '▶' : '❚❚';
    });

    heroIconos.addEventListener('click', (e) => { const b = e.target.closest('.icono'); if (b) mostrar(+b.dataset.k); });
    $('#hero-prev').addEventListener('click', () => mostrar(i - 1));
    $('#hero-next').addEventListener('click', () => mostrar(i + 1));
    mostrar(0);
    // retratos 3D de cada minifigura para los iconos
    $$('img[data-retrato]', heroIconos).reduce((p, img) => p.then(() => m3d.retrato(img.dataset.retrato).then((u) => { img.src = u; }).catch(() => {})), Promise.resolve());

    /* minifiguras decorativas en abanico y capítulos (se cargan al acercarse) */
    const ioFig = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (!e.isIntersecting) return;
      ioFig.unobserve(e.target);
      const f = porId[e.target.dataset.fig]; if (!f) return;
      const v = m3d.crearVista(e.target, { rotBase: [.05, e.target.classList.contains('fig-cap--mv') ? .5 : -.4], encuadre: 1 });
      v.poner(f.archivo, { minifig: true, pose: f.pose, radio: 5 });
    }), { rootMargin: '50% 0px' });
    $$('[data-fig]').forEach((el) => ioFig.observe(el));

    /* sets 3D de Harry Potter y Marvel */
    const montarSet = (el, cfg, opciones, radio = 6) => {
      if (!el || !cfg?.archivo) return;
      if (movil()) { // sets de miles de piezas: en móvil se muestra un render fijo del modelo (sin cargar el 3D)
        el.classList.add('sin-3d', 'con-render');
        const img = el.querySelector('.visor__respaldo');
        const render = { 'visor-castillo': 'img/render-hogwarts.webp' }[el.id] || 'img/render-torre.webp';
        if (img) { img.src = render; img.removeAttribute('srcset'); }
        return;
      }
      const io = new IntersectionObserver((ents) => {
        if (!ents.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const v = m3d.crearVista(el, { interactiva: true, zoom: true, ...opciones });
        v.poner(cfg.archivo, { radio }).catch(() => el.classList.add('sin-3d'));
        if (el.id === 'visor-castillo') document.addEventListener('castillo:luz', (e) => { v.extra.intensity = e.detail ? 90 : 0; });
      }, { rootMargin: '60% 0px' });
      io.observe(el);
    };
    montarSet($('#visor-castillo'), man.castillo, { rotBase: [.3, .55], encuadre: .6, luz: 'calida' });
    montarSet($('#visor-quinjet'), man.torre, { rotBase: [.12, 3.55], encuadre: .56 });

    /* X-wing */
    const visorNave = $('#visor-nave'), reset = $('#nave-reset'), credito = $('#nave-credito');
    const ioNave = new IntersectionObserver((ents) => {
      if (!ents.some((e) => e.isIntersecting)) return;
      ioNave.disconnect();
      const v = m3d.crearVista(visorNave, { interactiva: true, zoom: true, rotBase: [.42, -.75], encuadre: .66, alabeo: -.28 });
      v.poner(man.nave.archivo, { radio: 6 }).then(() => {
        credito.textContent = man.nave.credito; reset.disabled = false;
      }).catch(() => { credito.textContent = 'No se pudo cargar el modelo 3D; te mostramos la foto del set.'; });
      reset.addEventListener('click', () => v.reset());
    }, { rootMargin: '60% 0px' });
    ioNave.observe(visorNave);
  }).catch((err) => { console.warn('[3D]', err); sinTresD(); });
})();
