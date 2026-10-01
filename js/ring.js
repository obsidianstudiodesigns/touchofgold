// Hero: a physically based 9ct gold solitaire with a refractive brilliant-cut diamond.
// Studio "softbox" environment is built in-scene and baked with PMREM so the metal has
// crisp, believable reflections without loading an HDR file.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const stage = document.getElementById('ring-stage');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
  catch { return false; }
}

if (stage && webglOK()) init();
else document.documentElement.classList.add('no-webgl');

function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0;          // lights come up on load
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'A 9ct gold solitaire ring, rotating. Drag to turn it.');
  renderer.domElement.setAttribute('role', 'img');

  const scene = new THREE.Scene();
  const BG = new THREE.Color('#0c2620');
  scene.background = BG;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.25, 9);

  // ---------- studio environment ----------
  scene.environment = buildStudio(renderer);

  // backdrop glow so the ring sits in a pool of light, matched to the page colour at its edges
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshBasicMaterial({ map: radialTexture(), toneMapped: false, depthWrite: false })
  );
  glow.position.z = -8;
  scene.add(glow);

  // ---------- materials ----------
  const gold = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setRGB(0.96, 0.74, 0.40, THREE.LinearSRGBColorSpace),
    metalness: 1, roughness: 0.14, envMapIntensity: 1.25,
  });
  // a hint of anisotropic polish scratches would be overkill; a touch of clearcoat reads as "freshly polished"
  gold.clearcoat = 0.25; gold.clearcoatRoughness = 0.08;

  // Diamonds read as "real" mostly through what they reflect: a busy, high-contrast field of
  // small lights broken up by sharp facets, plus spectral fire. A dedicated sparkle environment
  // and thin-film iridescence give that far more convincingly than transmission against a green wall.
  const diamondMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#eef4f8'), metalness: 1, roughness: 0, flatShading: true,
    envMap: buildSparkle(renderer), envMapIntensity: 1.5,
    iridescence: 0.9, iridescenceIOR: 2.0, iridescenceThicknessRange: [200, 900],
    clearcoat: 1, clearcoatRoughness: 0,
  });

  // ---------- ring ----------
  const ring = new THREE.Group();
  scene.add(ring);
  const body = new THREE.Group();   // rotated so the band stands upright facing camera
  ring.add(body);

  // band: comfort-fit superellipse cross-section, lathed around the finger axis
  const R = 1.08, A = 0.085, B = 0.17, N = 2.8, prof = [];
  for (let i = 0; i <= 96; i++) {
    const t = -Math.PI / 2 + (i / 96) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    prof.push(new THREE.Vector2(R + A * Math.sign(c) * Math.abs(c) ** (2 / N), B * Math.sign(s) * Math.abs(s) ** (2 / N)));
  }
  // taper toward the head: scale cross-section with angle by building the band as a custom sweep
  const band = new THREE.Mesh(taperedBand(prof, R), gold);
  band.rotation.x = Math.PI / 2;
  body.add(band);

  // head: collar rings + six claws
  const topY = R + A;
  const head = new THREE.Group();
  head.position.y = topY - 0.02;
  body.add(head);
  const collarA = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.028, 20, 96), gold);
  collarA.rotation.x = Math.PI / 2; collarA.position.y = 0.26; head.add(collarA);
  const collarB = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.024, 16, 64), gold);
  collarB.rotation.x = Math.PI / 2; collarB.position.y = 0.10; head.add(collarB);

  const stoneR = 0.5;
  const stoneY = 0.5;
  const diamond = new THREE.Mesh(brilliantGeometry(), diamondMat);
  diamond.scale.setScalar(stoneR);
  diamond.position.y = stoneY;
  head.add(diamond);

  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const p0 = new THREE.Vector3(Math.cos(a) * 0.12, 0.02, Math.sin(a) * 0.12);
    const p1 = new THREE.Vector3(Math.cos(a) * (stoneR + 0.03), stoneY + 0.11, Math.sin(a) * (stoneR + 0.03));
    const dir = p1.clone().sub(p0);
    const claw = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, dir.length(), 6, 14), gold);
    claw.position.copy(p0).add(p1).multiplyScalar(0.5);
    claw.quaternion.setFromUnitVectors(up, dir.normalize());
    head.add(claw);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), gold);
    tip.position.set(Math.cos(a) * (stoneR - 0.02), stoneY + 0.15, Math.sin(a) * (stoneR - 0.02));
    tip.scale.set(1, 0.7, 1);
    head.add(tip);
  }

  // pavé shoulders: small brilliants set into the top of the band either side of the head
  const small = new THREE.InstancedMesh(brilliantGeometry(), diamondMat, 14);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(0.05, 0.05, 0.05);
  let k = 0;
  for (const side of [-1, 1]) for (let j = 0; j < 7; j++) {
    const ang = Math.PI / 2 + side * (0.22 + j * 0.085);
    const rr = R + A * 0.92;
    const pos = new THREE.Vector3(Math.cos(ang) * rr, Math.sin(ang) * rr, 0);
    q.setFromUnitVectors(up, pos.clone().normalize());
    const sc = 0.05 - j * 0.0035;
    s3.set(sc, sc, sc);
    small.setMatrixAt(k++, m4.compose(pos, q, s3));
  }
  body.add(small);

  // ---------- scintillation: tiny star glints that flash on the stone ----------
  const starTex = starTexture();
  const glints = [];
  for (let i = 0; i < 9; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: starTex, color: i % 3 ? 0xffffff : 0xfff1d0, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, transparent: true, opacity: 0, toneMapped: false,
    }));
    const a = Math.random() * Math.PI * 2, r = Math.random() * stoneR * 0.85;
    sp.position.set(Math.cos(a) * r, stoneY + 0.06 + Math.random() * 0.1, Math.sin(a) * r);
    sp.userData = { f: 0.6 + Math.random() * 1.1, ph: Math.random() * 10, s: 0.22 + Math.random() * 0.35 };
    head.add(sp); glints.push(sp);
  }

  body.position.y = -0.35;
  ring.rotation.set(0.18, -0.6, 0);

  // ---------- post: subtle bloom so highlights bleed like a camera lens ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.4, 1.6);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- layout ----------
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // keep the ring to the right on wide screens, centred above the copy on narrow ones
    const wide = w / h > 1.05;
    // portrait: zoom out by aspect so the ring always fits the top ~45% of the screen
    camera.setViewOffset(w, h, wide ? -w * 0.2 : 0, wide ? 0 : h * 0.26, w, h);
    camera.position.z = wide ? 10 : Math.min(26, 10 / Math.max(0.42, w / h) * 0.95);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- interaction ----------
  const pointer = { x: 0, y: 0 };
  let drag = null, spin = 0, spinVel = reduceMotion ? 0 : 0.0032;
  const el = renderer.domElement;
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
    if (drag) { const dx = e.clientX - drag.x; drag.x = e.clientX; spin += dx * 0.008; drag.v = dx * 0.008; }
  }, { passive: true });
  el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, v: 0 }; });
  addEventListener('pointerup', () => { if (drag) { spinVel = drag.v || spinVel; drag = null; } });

  let scrollP = 0;
  addEventListener('scroll', () => { scrollP = Math.min(1, scrollY / innerHeight); }, { passive: true });

  // ---------- loop ----------
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);
  const clock = new THREE.Clock();
  const t0 = performance.now();
  let tiltX = 0, tiltY = 0;

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = clock.getElapsedTime();
    const intro = Math.min(1, (performance.now() - t0) / 2600);
    const ease = 1 - Math.pow(1 - intro, 3);

    // showroom lights come up
    renderer.toneMappingExposure = 0.95 * ease;
    ring.scale.setScalar(0.82 + 0.18 * ease);

    if (!drag) {
      spinVel += ((reduceMotion ? 0 : 0.0032) - spinVel) * 0.02; // settle back to idle speed after a flick
      spin += spinVel;
    }
    tiltX += (pointer.y * 0.12 - tiltX) * 0.05;
    tiltY += (pointer.x * 0.25 - tiltY) * 0.05;
    ring.rotation.y = -0.6 + spin + tiltY + (1 - ease) * -1.2;
    ring.rotation.x = 0.18 + tiltX + scrollP * 0.5 + (reduceMotion ? 0 : Math.sin(t * 0.6) * 0.03);
    ring.position.y = (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.06) + scrollP * 0.8;

    // glints flash briefly and sharply, like real scintillation
    for (const g of glints) {
      const { f, ph, s } = g.userData;
      const v = Math.pow(Math.max(0, Math.sin(t * f * 2.3 + ph)), 28);
      g.material.opacity = v * ease;
      g.material.rotation = t * 0.4 + ph;
      g.scale.setScalar(s * (0.4 + v));
    }
    composer.render();
  }
  frame();
  document.documentElement.classList.add('webgl-ready');
}

// ---------- helpers ----------

function buildStudio(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#06140f'), side: THREE.BackSide })
  ));
  const panel = (w, h, pos, intensity, color) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    );
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(10, 1.6, [0, 9, 3], 4.2, '#fff4dc');    // overhead strip softbox
  panel(1.6, 12, [-9, 1, 4], 3.6, '#ffffff');      // key strip left
  panel(1.4, 12, [9, 0, 2], 3.5, '#ffe7b8');   // warm rim right
  panel(6, 4, [0, -1, 11], 0.9, '#fffaf0');
  panel(1, 6, [6, 6, 6], 6, '#ffffff');        // small hard light for diamond fire
  panel(1, 6, [-6, 7, -2], 6, '#ffffff');    // front fill behind camera
  panel(10, 2, [2, -9, -3], 1.2, '#5fae8c');   // emerald bounce from the "velvet" below
  panel(3, 3, [-5, 5, -8], 4, '#ffffff');      // kicker behind
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.025).texture;
  pm.dispose();
  return tex;
}

function buildSparkle(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#5d6f69').multiplyScalar(0.55), side: THREE.BackSide })));
  const rnd = mulberry(7);
  for (let i = 0; i < 140; i++) {
    const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 1.6 - 0.4, rnd() * 2 - 1).normalize().multiplyScalar(12 + rnd() * 6);
    const sz = 0.8 + rnd() * 2.8;
    const tint = ['#ffffff', '#fff6e6', '#eaf4ff', '#ffffff', '#d7ffef'][i % 5];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz * (0.4 + rnd())),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(2.5 + rnd() * 7), side: THREE.DoubleSide }));
    m.position.copy(v); m.lookAt(0, 0, 0); env.add(m);
  }
  // soft grey mid-tones so not every facet goes black
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#c9d6d0').multiplyScalar(0.9), side: THREE.DoubleSide }));
    m.position.set(rnd() * 30 - 15, rnd() * 20 - 8, rnd() * 30 - 15).setLength(20); m.lookAt(0, 0, 0); env.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0).texture;
  pm.dispose();
  return tex;
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function taperedBand(profile, R) {
  // Lathe, then thicken the top of the shank slightly where it meets the head (like a cast ring).
  const g = new THREE.LatheGeometry(profile, 220);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // lathe axis is Y; angle around it, top of ring (after rotation) is -Z here
    const ang = Math.atan2(-v.z, v.x);
    const near = Math.max(0, Math.sin(ang)) ** 6;         // 1 at the top of the shank
    const rad = Math.hypot(v.x, v.z);
    const k = 1 + near * 0.35;
    const radial = R + (rad - R) * k;
    v.x *= radial / rad; v.z *= radial / rad; v.y *= 1 - near * 0.15;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function brilliantGeometry() {
  // round brilliant proportions (girdle radius 1): table 56%, crown ~34°, pavilion ~41°
  const pts = [
    new THREE.Vector2(0.0001, -0.86),
    new THREE.Vector2(0.38, -0.56),
    new THREE.Vector2(0.72, -0.28),
    new THREE.Vector2(1.0, -0.03),
    new THREE.Vector2(1.0, 0.03),
    new THREE.Vector2(0.88, 0.13),
    new THREE.Vector2(0.72, 0.24),
    new THREE.Vector2(0.56, 0.32),
    new THREE.Vector2(0.0001, 0.32),
  ];
  const g = new THREE.LatheGeometry(pts, 32);
  // nudge alternate vertices so neighbouring facets catch light at different angles
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const seg = Math.floor(i / pts.length), row = i % pts.length;
    if (row > 0 && row < pts.length - 1 && seg % 2) { const k = 0.965; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  }
  g.computeVertexNormals();
  return g.toNonIndexed();
}

function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(512, 470, 0, 512, 512, 512);
  g.addColorStop(0, '#2c6a55');
  g.addColorStop(0.18, '#1d4d3e');
  g.addColorStop(0.45, '#123a2e');
  g.addColorStop(0.75, '#0c2620');
  g.addColorStop(1, '#0c2620');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function starTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.08, 'rgba(255,255,255,.8)');
  g.addColorStop(0.25, 'rgba(255,240,210,.15)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[128, 3], [3, 128]]) {
    const lg = x.createLinearGradient(w > h ? 0 : 64, w > h ? 64 : 0, w > h ? 128 : 64, w > h ? 64 : 128);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = lg; x.fillRect(64 - w / 2, 64 - h / 2, w, h);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
