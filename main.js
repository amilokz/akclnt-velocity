/* AKCLNT VELOCITY — VX-1 Aero
   A cinematic scroll store: the shoe floats in the hero, pulls apart layer
   by layer in the Exploded chapter, changes colourways live, and settles
   beside the drop countdown.
   Engine core: AKCLNT Studio (three.js). Shoe: Shopify CC BY 4.0 sample,
   split into four layers by AKCLNT Studio. */
import { Engine, THREE, damp } from './src/core/engine.js';
import { Assets } from './src/core/assets.js';
import { Pointer } from './src/core/input.js';
import { smoothScroll, gsap, elementProgress } from './src/core/scroll.js';
import { preloader, cursor, magnetic } from './src/core/ui.js';
import { makeStudio } from './studio.js';
import { ContactShadow } from './shadow.js';

const canvas = document.getElementById('gl');
const IS_SMALL = matchMedia('(pointer: coarse)').matches || innerWidth < 900;
const DPR = IS_SMALL ? 1 : 1.25;

const engine = new Engine({
  canvas, fov: 30, near: 0.05, far: 120, dpr: DPR, background: 0xffffff,
  post: {
    tone: 'neutral',
    ao: { aoRadius: 0.16, intensity: 2.0, distanceFalloff: 1.1, aoSamples: 8 },
    bloom: { intensity: 0.5, luminanceThreshold: 1.25, luminanceSmoothing: 0.25, radius: 0.62 },
    vignette: false, noise: 0.02, ca: 0.0004,
  },
});
const { scene, camera, renderer } = engine;
renderer.setClearColor(0xffffff, 1);
makeStudio(renderer, scene, { front: 2.0, dome: 1.3 });
camera.position.set(0, 0.35, 9);

/* Backdrop — fullscreen gradient, deep graphite navy with a volt breath. */
const backdrop = new THREE.Mesh(
  new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)),
  new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: {
      uC: { value: new THREE.Color(0xffffff) },
      uRes: { value: new THREE.Vector2(1, 1) },
      uFocus: { value: new THREE.Vector2(0.62, 0.5) },
    },
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 1.0, 1.0); }',
    fragmentShader: `uniform vec3 uC; uniform vec2 uRes, uFocus;
      void main(){ vec2 uv = gl_FragCoord.xy / uRes; vec2 d = (uv - uFocus) * vec2(uRes.x / uRes.y, 1.0);
        float r = length(d);
        vec3 c = uC * mix(1.12, 0.93, smoothstep(0.0, 1.3, r));
        c += vec3(0.045, 0.018, 0.0) * (1.0 - smoothstep(0.0, 1.1, r));
        gl_FragColor = vec4(c, 1.0); }`,
  })
);
backdrop.frustumCulled = false;
backdrop.renderOrder = -10;
scene.add(backdrop);
engine.onResize((w, h, dpr) => backdrop.material.uniforms.uRes.value.set(w * dpr, h * dpr));

const shadow = new ContactShadow(renderer, scene, { width: 8.5, depth: 5, y: -1.1, res: IS_SMALL ? 256 : 384, far: 3.4, blur: 3.2, opacity: 0.32 });
shadow.hidden.push(backdrop);

/* ─── Loader ─── */
const assets = new Assets();
const loaderEl = document.querySelector('.loader');

const loader = preloader({
  assets, el: loaderEl, minTime: 650,
  onValue: (v) => { loaderEl.style.setProperty('--p', v); loaderEl.querySelector('.loader-n').textContent = Math.round(v * 100); },
  exit: () => gsap.timeline()
    .to('.loader-inner', { y: -14, opacity: 0, duration: 0.45, ease: 'power2.out' })
    .to(loaderEl, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, 0.2),
});

const pointer = new Pointer({ lambda: 5 });
cursor({ color: '#FFB37A' });
magnetic();
smoothScroll({ lerp: 0.08 });

/* ─── Shoe ─── */
const rig = new THREE.Group();
scene.add(rig);
let shoe = null;
let bands = [];
let shoeMaterial = null;
let midnightTex = null;
const texCache = {};
let spinKick = 0;

function prepShoe(gltf) {
  const root = gltf.scene;
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = 3.5 / size.x;
  const group = new THREE.Group();
  const bandGroups = [];
  root.children.slice().forEach((node) => {
    const bg = new THREE.Group();
    node.position.sub(center);
    bg.add(node);
    group.add(bg);
    bandGroups.push(bg);
    node.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        if (!shoeMaterial) { shoeMaterial = o.material; midnightTex = shoeMaterial.map; shoeMaterial.color.set(0x2e2e33); }
      }
    });
  });
  group.scale.setScalar(s);
  return { group, bandGroups };
}

/* ─── Scroll choreography ─── */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ss = (v, a, b) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

const stages = [
  { el: '.hero',       st: { x: 1.72, y: 0.05, ry: -0.35, rx: 0.12, rz: 0.04, camZ: 8.6, s: 0.85, explode: 0 } },
  { el: '.anchor-descent', st: { x: 0.15, y: -0.5, ry: -0.25, rx: 0.08, rz: 0.02, camZ: 8.8, s: 0.95, explode: 0 } },
  { el: '.exploded',   st: { x: 0, y: 0.05, ry: -0.20, rx: 0.05, rz: 0, camZ: 9.6, s: 1.02, explode: 1 }, at: 0.45 },
  { el: '.tech',       st: { x: 1.8, y: 0, ry: 0.75, rx: 0.08, rz: 0, camZ: 9.2, s: 0.95, explode: 0.55 }, at: 0.3 },
  { el: '.colourways', st: { x: 0, y: -0.1, ry: -0.30, rx: 0.04, rz: 0, camZ: 8.2, s: 1.05, explode: 0 }, at: 0.35 },
  { el: '.lab',        st: { x: 1.7, y: 0, ry: 0.50, rx: 0.10, rz: 0, camZ: 9.6, s: 0.9, explode: 0.12 }, at: 0.4 },
  { el: '.cta',        st: { x: 1.35, y: -0.05, ry: -0.85, rx: 0.10, rz: 0.04, camZ: 9.8, s: 0.95, explode: 0.2 }, at: 0.4 },
];
if (IS_SMALL) stages[0].st = { x: 0.9, y: -0.2, ry: -0.5, rx: 0.1, rz: 0.05, camZ: 8.6, s: 0.85, explode: 0 };
const modelEl = document.querySelector('.hero-model');
const filmEl = document.querySelector('.hero-film');
if (filmEl) filmEl.addEventListener('loadedmetadata', () => { filmEl.pause(); try { filmEl.currentTime = 0.01; } catch {} });
const sideItems = [...document.querySelectorAll('.stack-side li')];
let anchors = [];
function measure() {
  const y = window.scrollY;
  anchors = stages.map((s) => {
    const el = document.querySelector(s.el);
    const top = el.getBoundingClientRect().top + y;
    return { scroll: top + el.offsetHeight * (s.at ?? 0), st: s.st };
  });
}
measure();
addEventListener('resize', measure);
setTimeout(measure, 600);
setTimeout(measure, 1800);

function stageState(scrollY) {
  if (!anchors.length) return stages[0].st;
  if (scrollY <= anchors[0].scroll) return anchors[0].st;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1];
    if (scrollY <= b.scroll) {
      const t = ss(scrollY, a.scroll, b.scroll);
      const o = {};
      for (const k in a.st) o[k] = lerp(a.st[k], b.st[k], t);
      return o;
    }
  }
  return anchors[anchors.length - 1].st;
}

const steps = [...document.querySelectorAll('[data-k]')];
const windows = {
  1: ['.exploded', 0.02, 0.30], 2: ['.exploded', 0.30, 0.55], 3: ['.exploded', 0.55, 0.78], 4: ['.exploded', 0.78, 0.995],
  5: ['.tech', 0.04, 0.46], 6: ['.tech', 0.40, 0.72], 7: ['.tech', 0.66, 0.97],
  8: ['.colourways', 0.08, 0.96], 9: ['.lab', 0.12, 0.97], 10: ['.cta', 0.1, 1.01],
};
const sectionEls = {};
for (const k in windows) sectionEls[windows[k][0]] = document.querySelector(windows[k][0]);
const win = (p, a, b) => ss(p, a, a + 0.07) * (1 - ss(p, b - 0.07, b));

const labelEls = [...document.querySelectorAll('.label')];
const projV = new THREE.Vector3();
function updateLabels(explodeCur, pExp) {
  const show = explodeCur > 0.18 && pExp > 0 && pExp < 1;
  for (const el of labelEls) {
    const band = bands[+el.dataset.band];
    if (!band || !show) { el.style.setProperty('--v', 0); continue; }
    band.getWorldPosition(projV);
    projV.x += (+el.dataset.band % 2 === 0 ? -1 : 1) * 1.3;
    projV.project(camera);
    el.style.setProperty('--lx', ((projV.x * 0.5 + 0.5) * innerWidth).toFixed(1) + 'px');
    el.style.setProperty('--ly', ((-projV.y * 0.5 + 0.5) * innerHeight).toFixed(1) + 'px');
    el.style.setProperty('--v', Math.min(1, (explodeCur - 0.18) / 0.35).toFixed(3));
  }
}

/* Colourways — live texture swap on the shared shoe material. */
document.querySelectorAll('.cw-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    document.querySelectorAll('.cw-btn').forEach((b) => b.classList.toggle('active', b === btn));
    spinKick += 3.2;
    if (!shoeMaterial) return;
    const name = btn.dataset.tex;
    if (name === 'midnight') { shoeMaterial.map = midnightTex; shoeMaterial.color.set(0x2e2e33); shoeMaterial.needsUpdate = true; return; }
    if (!texCache[name]) texCache[name] = await assets.texture(`img/velocity/tex-${name}.webp`, { flipY: false });
    shoeMaterial.map = texCache[name];
    shoeMaterial.color.set(0xffffff);
    shoeMaterial.needsUpdate = true;
  });
});

/* Drop countdown — first release, 5 Nov 2026, 19:00 PKT. */
const dropAt = new Date('2026-11-05T19:00:00+05:00').getTime();
const cdEls = { d: document.getElementById('cd-d'), h: document.getElementById('cd-h'), m: document.getElementById('cd-m'), s: document.getElementById('cd-s') };
function tickCountdown() {
  let diff = Math.max(0, dropAt - Date.now());
  const d = Math.floor(diff / 864e5); diff -= d * 864e5;
  const h = Math.floor(diff / 36e5); diff -= h * 36e5;
  const m = Math.floor(diff / 6e4); diff -= m * 6e4;
  const s = Math.floor(diff / 1e3);
  const pad = (n) => String(n).padStart(2, '0');
  if (cdEls.d) { cdEls.d.textContent = pad(d); cdEls.h.textContent = pad(h); cdEls.m.textContent = pad(m); cdEls.s.textContent = pad(s); }
}
tickCountdown();
setInterval(tickCountdown, 1000);

/* ─── Boot ─── */
const shoeLoad = assets.gltf('models/velocity/shoe.glb');
(async () => {
  try {
    const gltf = await shoeLoad;
    const built = prepShoe(gltf);
    shoe = built.group;
    bands = built.bandGroups;
    rig.add(shoe);
  } catch (err) {
    console.error('AKCLNT VELOCITY — shoe failed to load', err);
  }
  await loader.finish();
  gsap.to('.hero-inner > *', { opacity: 1, y: 0, duration: 1.2, stagger: 0.09, ease: 'power3.out', delay: 0.1 });
  gsap.to('.hero-spec', { opacity: 1, duration: 1.2, delay: 0.55 });
  gsap.to('.hint', { opacity: 1, duration: 1.2, delay: 0.85 });
  window.__ready = true;
})();

const cur = { ...stages[0].st };
let explodeCur = 0;
engine.onTick((dt, t) => {
  pointer.update(dt);
  const scrollY = window.scrollY;
  const target = stageState(scrollY);
  const pExp = elementProgress(sectionEls['.exploded']);
  let ry = target.ry;
  if (pExp > 0 && pExp < 1) ry += (pExp - 0.45) * 1.7;
  spinKick = damp(spinKick, 0, 2.2, dt);
  ry += spinKick * dt * 2.4;
  for (const k in cur) cur[k] = damp(cur[k], k === 'ry' ? ry : target[k], 4.2, dt);

  let exT = target.explode;
  if (pExp > 0 && pExp < 1) exT = ss(pExp, 0.06, 0.38) * (1 - ss(pExp, 0.93, 1) * 0.45);
  explodeCur = damp(explodeCur, exT, 5, dt);

  const xF = IS_SMALL ? 0.42 : 1;
  rig.position.set(
    cur.x * xF + pointer.sx * 0.14,
    cur.y + Math.sin(t * 0.8) * 0.045 - pointer.sy * 0.08,
    0
  );
  rig.rotation.set(cur.rx + pointer.sy * 0.07, cur.ry + pointer.sx * 0.16, cur.rz);
  const reveal = IS_SMALL ? 1 : ss(scrollY, innerHeight * 0.25, innerHeight * 0.6);
  rig.scale.setScalar(Math.max(0.0001, cur.s * reveal));
  camera.position.set(0, 0.35, cur.camZ + (IS_SMALL ? 1.7 : 0));
  camera.lookAt(0, -0.05, 0);

  if (shoe) bands.forEach((bg, i) => {
    const off = i - 1.5;
    bg.position.y = off * 0.8 * explodeCur + Math.sin(t * 1.25 + i * 1.7) * 0.035 * explodeCur;
    bg.position.x = off * 0.13 * explodeCur;
    bg.rotation.y = off * 0.18 * explodeCur;
    bg.rotation.z = off * 0.05 * explodeCur;
  });
  updateLabels(explodeCur, pExp);

  for (const el of steps) {
    const w = windows[el.dataset.k];
    if (!w) continue;
    const v = win(elementProgress(sectionEls[w[0]]), w[1], w[2]);
    el.style.setProperty('--v', v.toFixed(3));
    el.classList.toggle('is-v', v > 0.4);
  }
  document.querySelectorAll('.rail li').forEach((li) => {
    const w = windows[li.dataset.k];
    li.classList.toggle('on', w ? win(pExp, w[1], w[2]) > 0.4 : false);
  });
  for (const li of sideItems) {
    const w = windows[li.dataset.side];
    li.classList.toggle('on', w ? win(pExp, w[1], w[2]) > 0.4 : false);
  }
  if (modelEl) {
    const mf = 1 - ss(scrollY, innerHeight * 0.25, innerHeight * 0.6);
    modelEl.style.opacity = mf.toFixed(3);
    modelEl.style.visibility = mf <= 0.01 ? 'hidden' : 'visible';
  }
  if (filmEl && !IS_SMALL && scrollY < innerHeight * 0.7 && filmEl.readyState >= 1) {
    const dur = filmEl.duration || 10;
    const ft = Math.min(1, scrollY / (innerHeight * 0.6)) * (dur - 0.05);
    if (Math.abs(filmEl.currentTime - ft) > 0.045) { try { filmEl.currentTime = ft; } catch {} }
  }
});

engine.start();
