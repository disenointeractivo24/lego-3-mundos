/* =========================================================
   Motor 3D (Three.js)
   · UN solo WebGLRenderer (fuera del DOM) dibuja todas las vistas;
     cada vista copia su imagen a un <canvas> 2D propio, así el 3D
     respeta el apilamiento de la página. Solo se dibujan las vistas
     visibles; los GLB se cargan una vez y se clonan (geometría y
     materiales compartidos).
   · Las minifiguras (exportadas de Mecabricks con piezas separadas)
     reciben un "esqueleto" automático: hombros, caderas y cuello,
     calculado a partir de la geometría de cada pieza. Así se pueden
     posar y animar de forma dinámica.
   ========================================================= */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const movil = matchMedia('(max-width: 820px)').matches;
const DPR = Math.min(devicePixelRatio || 1, movil ? 1.5 : 2);

/* ---------- renderer compartido ---------- */
let renderer;
function getRenderer() {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(1); // las vistas ya trabajan en píxeles físicos
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}
export function webglDisponible() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

/* ---------- carga con caché ---------- */
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
// Colores LEGO (id de Mecabricks → sRGB), extraídos de los .dae exportados
const COLORES = { 1: '#f4f4f4', 5: '#d5bc7c', 21: '#d6001e', 23: '#2653a7', 24: '#f8c718', 26: '#1d1f22', 28: '#157d26',
  106: '#f57d23', 111: '#5b5450', 141: '#053515', 154: '#7c021f', 182: '#e5771f', 194: '#a3a2a4', 196: '#0e3e9a', 199: '#4d5156', 283: '#fad1b1' };

// Mecabricks exporta los estampados como calcomanías con transparencia y pierde el
// color del plástico: recomponemos la textura (color base + calcomanía encima).
const recompuestas = new Map();
function recomponer(m) {
  const id = /^MB\|(\d+)\|/.exec(m.name || '')?.[1];
  const base = id && COLORES[id];
  if (!base || !m.map?.image) return;
  const clave = m.map.uuid + base;
  if (!recompuestas.has(clave)) {
    const img = m.map.image, w = img.width || 512, h = img.height || 512;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const t = new THREE.CanvasTexture(cv);
    t.flipY = m.map.flipY; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = m.map.wrapS; t.wrapT = m.map.wrapT;
    t.anisotropy = 4;
    recompuestas.set(clave, t);
  }
  m.map = recompuestas.get(clave);
  m.color.set(0xffffff);
  m.needsUpdate = true;
}

// los GLB salen del exportador con materiales "metálicos": los pasamos a plástico ABS
function plastico(escena) {
  escena.traverse((o) => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      if ('metalness' in m) { m.metalness = 0; m.roughness = m.transparent ? .08 : .3; m.envMapIntensity = .8; }
      const id = /^MB\|(\d+)$/.exec(m.name || '')?.[1];
      if (id && COLORES[id] && !m.map) m.color.set(COLORES[id]);
      recomponer(m);
    });
  });
  return escena;
}
let entorno = null;
function getEntorno() {
  if (entorno) return entorno;
  const pm = new THREE.PMREMGenerator(getRenderer());
  entorno = pm.fromScene(new RoomEnvironment(), .04).texture;
  pm.dispose();
  return entorno;
}
function cargar(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url).then((g) => plastico(g.scene)));
  return cache.get(url).then((s) => s.clone(true));
}

/* ---------- esqueleto automático de minifigura ---------- */
function armarMinifig(escena) {
  escena.updateMatrixWorld(true);
  const piezas = [];
  escena.traverse((o) => { if (o.isMesh) piezas.push(o); });
  // endereza la figura: algunas venían giradas en su escena original (p. ej. 23°)
  const giros = piezas.map((m) => new THREE.Euler().setFromQuaternion(m.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y).sort((a, b) => a - b);
  const giro = giros[Math.floor(giros.length / 2)] || 0;
  if (Math.abs(giro) > .02) {
    const c0 = new THREE.Box3().setFromObject(escena).getCenter(new THREE.Vector3());
    const tmp = new THREE.Group(); tmp.position.copy(c0); escena.add(tmp); tmp.updateMatrixWorld(true);
    piezas.forEach((m) => tmp.attach(m));
    tmp.rotation.y = -giro; tmp.updateMatrixWorld(true);
    piezas.forEach((m) => escena.attach(m));
    escena.remove(tmp); escena.updateMatrixWorld(true);
  }
  const caja = new THREE.Box3().setFromObject(escena);
  const H = caja.max.y - caja.min.y, y0 = caja.min.y;
  // figuras extraídas de otras escenas no están en x=0: se mide todo respecto al eje de las piernas/torso
  const centro = caja.getCenter(new THREE.Vector3());
  const info = piezas.map((m) => {
    const b = new THREE.Box3().setFromObject(m);
    const c = b.getCenter(new THREE.Vector3());
    return { m, b, c: new THREE.Vector3(c.x - centro.x, c.y, c.z - centro.z), s: b.getSize(new THREE.Vector3()), o: m.getWorldPosition(new THREE.Vector3()) };
  });
  const torso = info.filter((p) => Math.abs(p.c.x) < H * .06 && p.s.x < H * .5 && (p.c.y - y0) / H > .3 && (p.c.y - y0) / H < .66)
    .sort((a, b) => b.s.x - a.s.x)[0];
  const anchoTorso = torso ? torso.s.x : H * .35;
  const raiz = new THREE.Group();
  const centroZ = torso ? torso.c.z : 0;
  raiz.position.set(0, 0, 0);
  escena.add(raiz);

  const rol = new Map();
  for (const p of info) {
    const ry = (p.c.y - y0) / H;
    if (p.s.x > anchoTorso * 1.7) rol.set(p, 'capa');
    else if (ry > .68 && Math.abs(p.c.x) < H * .08) rol.set(p, 'cabeza');
    else if (Math.abs(p.c.x) > anchoTorso * .36 && ry > .25 && ry < .75) rol.set(p, 'lateral');
    else if (p.b.min.y - y0 < H * .04 && Math.abs(p.c.x) > H * .04) rol.set(p, 'pierna');
    else rol.set(p, 'cuerpo');
  }
  const articulaciones = {};
  // brazos y manos: por lado, la pieza más alta es el brazo
  for (const lado of [-1, 1]) {
    const lat = info.filter((p) => rol.get(p) === 'lateral' && Math.sign(p.c.x) === lado).sort((a, b) => b.b.max.y - a.b.max.y);
    if (!lat.length) continue;
    const brazo = lat[0];
    const piv = new THREE.Group();
    // en Mecabricks el origen de cada pieza suele ser el pasador del hombro; si no (p. ej. Harry),
    // se calcula: lado interno del brazo, cerca de su parte superior, en el centro de profundidad
    const b = brazo.b, interior = lado > 0 ? b.min.x : b.max.x;
    const hombro = new THREE.Vector3(interior, b.max.y - brazo.s.y * .2, (b.min.z + b.max.z) / 2);
    piv.position.copy(brazo.o.distanceTo(hombro) > brazo.s.y * .25 ? hombro : brazo.o);
    raiz.add(piv); piv.updateMatrixWorld(true);
    lat.forEach((p) => piv.attach(p.m));
    articulaciones[lado < 0 ? 'brazoI' : 'brazoD'] = piv;
  }
  for (const lado of [-1, 1]) {
    const pierna = info.find((p) => rol.get(p) === 'pierna' && Math.sign(p.c.x) === lado);
    if (!pierna) continue;
    const piv = new THREE.Group();
    piv.position.copy(pierna.o); // origen = pasador de la cadera
    raiz.add(piv); piv.updateMatrixWorld(true);
    piv.attach(pierna.m);
    articulaciones[lado < 0 ? 'piernaI' : 'piernaD'] = piv;
  }
  const cabezas = info.filter((p) => rol.get(p) === 'cabeza');
  if (cabezas.length) {
    const baseY = Math.min(...cabezas.map((p) => p.b.min.y));
    const piv = new THREE.Group();
    piv.position.set(0, baseY, centroZ);
    raiz.add(piv); piv.updateMatrixWorld(true);
    cabezas.forEach((p) => piv.attach(p.m));
    articulaciones.cabeza = piv;
  }
  info.filter((p) => ['cuerpo', 'capa'].includes(rol.get(p))).forEach((p) => raiz.attach(p.m));
  return { raiz, articulaciones };
}

/* ---------- poses (radianes). Negativo en x = hacia delante/arriba ---------- */
export const POSES = {
  neutra:   { brazoI: [0, 0, 0], brazoD: [0, 0, 0], piernaI: [0, 0, 0], piernaD: [0, 0, 0], cabeza: [0, 0, 0], cuerpo: [0, 0, 0] },
  // poses naturales (como las fotos oficiales): sin girar el cuerpo, ángulos moderados
  fuerza:   { brazoI: [.15, 0, 0], brazoD: [-1.25, 0, 0], piernaI: [.22, 0, 0], piernaD: [-.22, 0, 0], cabeza: [0, .15, 0], cuerpo: [0, 0, 0] },
  hechizo:  { brazoI: [.2, 0, 0], brazoD: [-2.1, 0, 0], piernaI: [.18, 0, 0], piernaD: [-.18, 0, 0], cabeza: [-.06, -.12, 0], cuerpo: [0, 0, 0] },
  telarana: { brazoI: [-.35, 0, 0], brazoD: [-1.7, 0, 0], piernaI: [-.4, 0, 0], piernaD: [.3, 0, 0], cabeza: [-.05, .15, 0], cuerpo: [0, 0, 0] },
  apunta:   { brazoI: [-1.15, 0, 0], brazoD: [-1.2, 0, 0], piernaI: [.2, 0, 0], piernaD: [-.2, 0, 0], cabeza: [0, -.1, 0], cuerpo: [0, 0, 0] },
  saludo:   { brazoI: [.15, 0, 0], brazoD: [-2.3, 0, 0], piernaI: [-.18, 0, 0], piernaD: [.18, 0, 0], cabeza: [0, .12, 0], cuerpo: [0, 0, 0] },
};

/* ---------- Vista ---------- */
class Vista {
  constructor(el, { zoom = false, interactiva = false, rotBase = [.08, -.35], luz = 'plana', encuadre = 1, alabeo = 0 } = {}) {
    this.alabeo = alabeo; this.conZoom = zoom;
    this.el = el;
    this.cv = document.createElement('canvas');
    this.cv.className = 'vista3d';
    this.cv.setAttribute('aria-hidden', 'true');
    el.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    this.scene = new THREE.Scene();
    this.scene.environment = getEntorno();
    this.camera = new THREE.PerspectiveCamera(26, 1, .1, 400);
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.base = { x: rotBase[0], y: rotBase[1] };
    this.rot = { ...this.base };
    this.vel = 0;
    this.encuadre = encuadre;
    this.visible = false;
    this.listo = false;
    this.figura = null;
    this.entrada = 1;
    this.luces(luz);
    if (interactiva) this.interaccion();
  }

  luces(tipo) {
    // estética plana: mucha luz ambiente, una principal suave y un contraluz de color
    const hemi = new THREE.HemisphereLight(0xffffff, tipo === 'calida' ? 0x5a2a20 : 0x8090a8, 1.2);
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 8, 10);
    this.contra = new THREE.DirectionalLight(tipo === 'calida' ? 0xffc46b : 0xbfe4ff, 1.6); this.contra.position.set(-6, 4, -8);
    this.extra = new THREE.PointLight(0xffb048, 0, 60); this.extra.position.set(0, 4, 8);
    this.scene.add(hemi, key, this.contra, this.extra);
  }

  async poner(url, { minifig = false, pose = 'neutra', radio = 5 } = {}) {
    const token = (this.token = Symbol());
    const escena = await cargar(url);
    if (token !== this.token) return;
    const g = new THREE.Group();
    let rig = null;
    if (minifig) rig = armarMinifig(escena);
    // centrar y escalar
    escena.updateMatrixWorld(true);
    const esfera = new THREE.Box3().setFromObject(escena).getBoundingSphere(new THREE.Sphere());
    escena.position.sub(esfera.center);
    g.add(escena);
    g.scale.setScalar(radio / esfera.radius);
    if (this.figura) this.pivot.remove(this.figura.g);
    this.figura = { g, rig, pose: POSES[pose] || POSES.neutra, actual: JSON.parse(JSON.stringify(POSES.neutra)) };
    this.pivot.add(g);
    // encuadre de cámara según la esfera
    const dist = (radio * this.encuadre) / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.position.set(0, radio * .05, dist);
    this.camera.lookAt(0, 0, 0);
    this.entrada = reduce ? 1 : 0;
    this.listo = true;
    this.el.classList.add('is-3d');
  }

  setPose(nombre) { if (this.figura) this.figura.pose = POSES[nombre] || POSES.neutra; }

  interaccion() {
    const el = this.el;
    let activo = false, px = 0, py = 0, tactil = false, decidido = false, horizontal = false;
    el.addEventListener('pointerdown', (e) => {
      activo = true; px = e.clientX; py = e.clientY; tactil = e.pointerType === 'touch'; decidido = !tactil; horizontal = !tactil;
      this.tocando = performance.now(); this.vel = 0; this.volver = false;
      if (!tactil) el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!activo) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (!decidido) { if (Math.abs(dx) + Math.abs(dy) < 6) return; decidido = true; horizontal = Math.abs(dx) > Math.abs(dy); }
      if (!horizontal) return; // en táctil, el gesto vertical sigue siendo scroll
      px = e.clientX; py = e.clientY;
      this.vel = dx * .01;
      this.rot.y += this.vel;
      if (!tactil) this.rot.x = THREE.MathUtils.clamp(this.rot.x + dy * .006, -.6, .8);
      this.tocando = performance.now();
    });
    const fin = () => { activo = false; };
    el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);

    /* ---- zoom: botones, doble clic, Ctrl + rueda / pellizco en trackpad, pellizco táctil ---- */
    this.zoom = 1; this.zoomObj = 1;
    let mas = null, menos = null;
    if (this.conZoom) {
    const ZMIN = 1, ZMAX = 2.6;
    const setZoom = (z) => {
      this.zoomObj = THREE.MathUtils.clamp(z, ZMIN, ZMAX);
      el.classList.toggle('is-zoom', this.zoomObj > 1.01);
      if (menos) menos.disabled = this.zoomObj <= ZMIN + .001; mas.disabled = this.zoomObj >= ZMAX - .001;
      this.tocando = performance.now();
    };
    const ui = document.createElement('div'); ui.className = 'visor__zoom';
    ui.innerHTML = '<button type="button" data-z="1" aria-label="Acercar">+</button><button type="button" data-z="-1" aria-label="Alejar">−</button>';
    document.body.appendChild(ui); this.ui = ui;
    // posición fija en pantalla: esquina inferior derecha de la parte visible del visor
    let pend = false;
    const ubicar = () => { pend = false;
      const r = el.getBoundingClientRect(), s = (el.closest('section') || el).getBoundingClientRect();
      const top = Math.max(r.top, s.top, 80), bot = Math.min(r.bottom, s.bottom - 110, innerHeight - 16), der = Math.min(r.right, s.right, innerWidth - 90);
      const ver = bot - top > 130 && el.classList.contains('is-3d') && r.right > 60;
      ui.classList.toggle('is-on', ver);
      if (ver) { ui.style.left = (der - 52) + 'px'; ui.style.top = (bot - 96) + 'px'; } };
    const pedir = () => { if (!pend) { pend = true; requestAnimationFrame(ubicar); } };
    addEventListener('scroll', pedir, { passive: true }); addEventListener('resize', pedir);
    new MutationObserver(pedir).observe(el, { attributes: true, attributeFilter: ['class'] }); pedir();
    [mas, menos] = ui.querySelectorAll('button');
    ui.addEventListener('pointerdown', (e) => e.stopPropagation());
    ui.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setZoom(this.zoomObj * (b.dataset.z > 0 ? 1.35 : 1 / 1.35)); });
    el.addEventListener('dblclick', () => setZoom(this.zoomObj > 1.2 ? 1 : 2.2));
    el.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(this.zoomObj * Math.exp(-e.deltaY * .01)); }, { passive: false });
    const toques = new Map(); let dist0 = 0, z0 = 1;
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; toques.set(e.pointerId, e); if (toques.size === 2) { const [a, b] = [...toques.values()]; dist0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); z0 = this.zoomObj; } });
    el.addEventListener('pointermove', (e) => { if (!toques.has(e.pointerId)) return; toques.set(e.pointerId, e); if (toques.size === 2 && dist0) { const [a, b] = [...toques.values()]; setZoom(z0 * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / dist0); } });
    const quitar = (e) => { toques.delete(e.pointerId); if (toques.size < 2) dist0 = 0; };
    el.addEventListener('pointerup', quitar); el.addEventListener('pointercancel', quitar);
    el.style.touchAction = 'pan-y';
    setZoom(1);
    }
    el.addEventListener('keydown', (e) => {
      const k = { ArrowLeft: [0, -.2], ArrowRight: [0, .2], ArrowUp: [-.15, 0], ArrowDown: [.15, 0] }[e.key];
      if (k) { this.rot.x = THREE.MathUtils.clamp(this.rot.x + k[0], -.6, .8); this.rot.y += k[1]; this.tocando = performance.now(); e.preventDefault(); }
      else if (e.key === 'Home') { this.reset(); this.zoomObj = 1; e.preventDefault(); }
      else if (mas && (e.key === '+' || e.key === '=')) { mas.click(); e.preventDefault(); }
      else if (menos && e.key === '-') { menos.click(); e.preventDefault(); }
    });
  }

  reset() {
    const d = Math.PI * 2;
    this.rot.y = this.base.y + ((((this.rot.y - this.base.y) % d) + d + Math.PI) % d) - Math.PI;
    this.volver = true; this.vel = 0;
  }

  dibujar(t, dt) {
    const r = this.el.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * DPR)), h = Math.max(1, Math.round(r.height * DPR));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    if (this.zoomObj !== undefined) this.zoom += (this.zoomObj - this.zoom) * Math.min(1, dt * (reduce ? 60 : 8));
    this.camera.zoom = this.zoom || 1;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();

    // rotación: arrastre, inercia, regreso
    const quieto = !this.tocando || performance.now() - this.tocando > 2500;
    if (this.volver) {
      this.rot.x += (this.base.x - this.rot.x) * Math.min(1, dt * 6);
      this.rot.y += (this.base.y - this.rot.y) * Math.min(1, dt * 6);
      if (Math.abs(this.base.y - this.rot.y) < .002) this.volver = false;
    } else if (Math.abs(this.vel) > .0005) { this.rot.y += this.vel; this.vel *= .93; }
    else if (quieto && this.tocando && Math.abs(this.rot.y - this.base.y) > .01) this.reset(); // vuelve al frente sola
    // acoplado al scroll: el sujeto gira un poco al pasar
    const prog = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    const sway = reduce || !quieto ? 0 : Math.sin(t * .5) * .1;
    this.pivot.rotation.set(this.rot.x, this.rot.y + sway + (reduce ? 0 : prog * .45), this.alabeo + (reduce ? 0 : Math.sin(t * .7) * .04 - prog * .15));

    // pose con muelle + respiración
    const f = this.figura;
    if (f) {
      if (this.entrada < 1) this.entrada = Math.min(1, this.entrada + dt * 1.6);
      const e = 1 - Math.pow(1 - this.entrada, 3);
      f.g.position.y = reduce ? 0 : (1 - e) * -2.5 + Math.sin(t * 1.4) * .08;
      f.g.rotation.y = reduce ? 0 : (1 - e) * -1.1;
      if (f.rig) {
        const k = Math.min(1, dt * (reduce ? 60 : 5));
        for (const [nombre, art] of Object.entries(f.rig.articulaciones)) {
          const obj = f.pose[nombre] || [0, 0, 0], act = f.actual[nombre];
          const osc = reduce ? 0 : Math.sin(t * 1.6 + nombre.length) * .05;
          for (let i = 0; i < 3; i++) act[i] += (obj[i] - act[i]) * k;
          art.rotation.set(act[0] + (i0(nombre) ? osc : 0), act[1], act[2]);
        }
        const c = f.pose.cuerpo, ac = f.actual.cuerpo;
        for (let i = 0; i < 3; i++) ac[i] += (c[i] - ac[i]) * k;
        f.rig.raiz.rotation.set(ac[0], ac[1], ac[2]);
      }
    }
    // el búfer compartido solo crece; cada vista se dibuja en una región (esquina inferior izq.)
    const R = getRenderer();
    const tam = R.getSize(new THREE.Vector2());
    if (w > tam.x || h > tam.y) R.setSize(Math.max(w, tam.x), Math.max(h, tam.y), false);
    const H = R.domElement.height;
    R.setScissorTest(true);
    R.setViewport(0, 0, w, h); R.setScissor(0, 0, w, h);
    R.clear();
    R.render(this.scene, this.camera);
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(R.domElement, 0, H - h, w, h, 0, 0, w, h);
  }
}
const i0 = (n) => n.startsWith('brazo');

/* ---------- retrato: miniatura de la cabeza de una minifigura (para los iconos) ---------- */
export async function retrato(url, tam = 128) {
  const escena = await cargar(url);
  const scene = new THREE.Scene();
  scene.environment = getEntorno();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8090a8, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(3, 6, 10); scene.add(key);
  scene.add(escena);
  escena.updateMatrixWorld(true);
  const caja = new THREE.Box3().setFromObject(escena);
  const h = caja.max.y - caja.min.y;
  // encuadra el tercio superior (cabeza y hombros)
  const centro = new THREE.Vector3((caja.min.x + caja.max.x) / 2, caja.max.y - h * .2, (caja.min.z + caja.max.z) / 2);
  const cam = new THREE.PerspectiveCamera(24, 1, h * .01, h * 20);
  cam.position.set(centro.x + h * .35, centro.y + h * .08, centro.z + h * 1.35);
  cam.lookAt(centro);
  const R = getRenderer();
  const t = R.getSize(new THREE.Vector2());
  if (tam > t.x || tam > t.y) R.setSize(Math.max(tam, t.x), Math.max(tam, t.y), false);
  R.setScissorTest(true); R.setViewport(0, 0, tam, tam); R.setScissor(0, 0, tam, tam);
  R.clear(); R.render(scene, cam);
  const cv = document.createElement('canvas'); cv.width = cv.height = tam;
  cv.getContext('2d').drawImage(R.domElement, 0, R.domElement.height - tam, tam, tam, 0, 0, tam, tam);
  return cv.toDataURL('image/png');
}

/* ---------- bucle global ---------- */
const vistas = new Set();
const reloj = new THREE.Clock();
let corriendo = false;
const io = new IntersectionObserver((ents) => {
  ents.forEach((e) => { for (const v of vistas) if (v.el === e.target) v.visible = e.isIntersecting; });
  arrancar();
}, { rootMargin: '10% 0px' });

function arrancar() {
  if (corriendo || document.hidden) return;
  if (![...vistas].some((v) => v.visible && v.listo)) return;
  corriendo = true; reloj.getDelta(); requestAnimationFrame(bucle);
}
function bucle() {
  const activas = [...vistas].filter((v) => v.visible && v.listo);
  if (!activas.length || document.hidden) { corriendo = false; return; }
  const dt = Math.min(reloj.getDelta(), .05), t = reloj.elapsedTime;
  activas.forEach((v) => v.dibujar(t, dt));
  requestAnimationFrame(bucle);
}
document.addEventListener('visibilitychange', arrancar);

export function crearVista(el, opciones) {
  const v = new Vista(el, opciones);
  vistas.add(v); io.observe(el);
  const poner = v.poner.bind(v);
  v.poner = async (...a) => { await poner(...a); arrancar(); };
  return v;
}
