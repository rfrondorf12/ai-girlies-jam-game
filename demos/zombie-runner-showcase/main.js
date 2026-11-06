// Zombie Runner (showcase): Blender-scripted characters + Kenney city kit + procedural props, toon look, bloom, grading. three.js only, no build step.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const Q = new URLSearchParams(location.search);
const LOW = Q.has('lowfx') || Q.has('nofx'); // ?lowfx = no post-processing, no shadows, fewer props/particles
const FX = !LOW;
const PAL = { sky: '#2a1d4a', fog: '#6b3f6f', horizon: '#c0607a', rim: '#ff7a59', key: '#ffe3c0', hemiTop: '#9b8cff', hemiBot: '#2a1b3a', zombie: '#62a84a', eye: '#ff2a2a' };
const scene = new THREE.Scene();
scene.background = new THREE.Color(PAL.sky);
scene.fog = new THREE.Fog(PAL.fog, 22, 92);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(LOW ? 1 : Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = !LOW; renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

// Lights: hemisphere fill + warm key + colored rim from behind
scene.add(new THREE.HemisphereLight(PAL.hemiTop, PAL.hemiBot, 1.6));
const key = new THREE.DirectionalLight(PAL.key, 2.6);
key.position.set(-8, 14, 10); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 60 }); key.shadow.radius = 4;
const rim = new THREE.DirectionalLight(PAL.rim, 3); rim.position.set(4, 6, -20);
scene.add(key, key.target, rim);

// Toon gradient (3 steps)
const grad = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
// ==== TEXTURES: every surface gets a small canvas-generated map (no downloads, ~128 px each) ====
const TEX = {}; window.__textures = TEX; // name -> texture, listed by ?debug and the tests
function ctex(name, size, draw) { if (TEX[name]) return TEX[name]; const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.name = name; return TEX[name] = t; }
const rnd = (a, b) => a + Math.random() * (b - a);
const speck = (g, s, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * a})`; const r = rnd(1, 3); g.fillRect(Math.random() * s, Math.random() * s, r, r); } };
const blot = (g, s, n, col, r0, r1) => { for (let i = 0; i < n; i++) { const x = Math.random() * s, y = Math.random() * s, r = rnd(r0, r1), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); } };
const scratch = (g, s, n, col, len) => { g.strokeStyle = col; g.lineWidth = 1; for (let i = 0; i < n; i++) { g.beginPath(); const x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y); g.lineTo(x + rnd(-len, len), y + rnd(-len / 4, len / 4)); g.stroke(); } };
const PAT = {
  plain: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); speck(g, s, 150, .05); },
  skin: (b, zombie) => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); speck(g, s, 500, .08); blot(g, s, zombie ? 7 : 4, zombie ? 'rgba(50,25,15,.32)' : 'rgba(120,60,50,.16)', 12, 28);
    if (zombie) { g.lineWidth = 2; scratch(g, s, 6, 'rgba(110,20,40,.55)', 22); blot(g, s, 3, 'rgba(20,40,10,.3)', 10, 22); } },
  weave: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); for (let y = 0; y < s; y += 4) for (let x = 0; x < s; x += 4) { g.fillStyle = ((x + y) / 4) % 2 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.2)'; g.fillRect(x, y, 4, 2); } speck(g, s, 200, .06); blot(g, s, 4, 'rgba(30,20,10,.3)', 8, 20); },
  stripes: (b, alt) => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); g.fillStyle = alt; for (let y = 0; y < s; y += 32) g.fillRect(0, y, s, 12); for (let y = 0; y < s; y += 2) { g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, y, s, 1); } blot(g, s, 5, 'rgba(30,20,10,.3)', 8, 20); },
  denim: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(255,255,255,.16)'; for (let i = -s; i < s; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); } speck(g, s, 250, .07); blot(g, s, 4, 'rgba(20,15,10,.35)', 8, 22); },
  metal: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); for (let y = 0; y < s; y++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .07})`; g.fillRect(0, y, s, 1); } scratch(g, s, 10, 'rgba(0,0,0,.3)', 20); blot(g, s, 3, 'rgba(120,50,20,.4)', 5, 14); },
  hair: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},.14)`; const x = Math.random() * s; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + rnd(-6, 6), s); g.stroke(); } },
  paint: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); speck(g, s, 300, .07); blot(g, s, 5, 'rgba(110,50,20,.35)', 8, 20); scratch(g, s, 12, 'rgba(255,255,255,.22)', 25);
    const gr = g.createLinearGradient(0, s * .55, 0, s); gr.addColorStop(0, 'rgba(30,20,15,0)'); gr.addColorStop(1, 'rgba(30,20,15,.5)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); },
  wood: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); for (let y = 0; y < s; y += 2) { g.fillStyle = `rgba(0,0,0,${Math.random() * .14})`; g.fillRect(0, y, s, 1); } g.fillStyle = 'rgba(0,0,0,.4)'; for (let y = 0; y < s; y += s / 4) g.fillRect(0, y, s, 2); blot(g, s, 3, 'rgba(40,20,10,.45)', 3, 8); },
  crate: b => (g, s) => { PAT.wood(b)(g, s); g.strokeStyle = '#3a2414'; g.lineWidth = s / 10; g.strokeRect(s / 20, s / 20, s * .9, s * .9); g.beginPath(); g.moveTo(s * .1, s * .1); g.lineTo(s * .9, s * .9); g.stroke();
    g.fillStyle = 'rgba(255,230,180,.55)'; g.font = `bold ${s / 8}px sans-serif`; g.fillText('FRAGILE', s * .2, s * .36); },
  container: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); for (let x = 0; x < s; x += 8) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 0, 3, s); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 3, 0, 1, s); } blot(g, s, 8, 'rgba(110,50,20,.55)', 4, 16);
    g.save(); g.translate(s * .15, s * .62); g.rotate(-.15); g.font = `bold ${s / 4.5}px sans-serif`; g.fillStyle = 'rgba(180,255,100,.8)'; g.fillText('RUN!', 0, 0); g.restore(); },
  glass: () => (g, s) => { g.fillStyle = '#141a2c'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(160,190,255,.2)'; g.beginPath(); g.moveTo(s * .2, 0); g.lineTo(s * .45, 0); g.lineTo(s * .15, s); g.lineTo(0, s); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); const cx = s * .7, cy = s * .4; for (let i = 0; i < 7; i++) { g.moveTo(cx, cy); g.lineTo(cx + rnd(-s / 2, s / 2), cy + rnd(-s / 2, s / 2)); } g.stroke(); },
  tire: () => (g, s) => { g.fillStyle = '#1c1820'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(255,255,255,.1)'; for (let x = 0; x < s; x += 6) g.fillRect(x, 0, 3, s); },
  concrete: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); speck(g, s, 600, .11); blot(g, s, 6, 'rgba(0,0,0,.22)', 6, 18); scratch(g, s, 4, 'rgba(0,0,0,.35)', 30); },
  cone: b => (g, s) => { g.fillStyle = b; g.fillRect(0, 0, s, s); g.fillStyle = '#f2eee6'; g.fillRect(0, s * .45, s, s * .18); speck(g, s, 250, .1); blot(g, s, 3, 'rgba(0,0,0,.3)', 6, 14); },
  skyline: () => (g, s) => { g.fillStyle = '#1e1436'; g.fillRect(0, 0, s, s); for (let y = 4; y < s; y += 8) for (let x = 3; x < s; x += 7) { g.fillStyle = `rgba(255,200,120,${Math.random() < .12 ? .35 : .04})`; g.fillRect(x, y, 3, 4); } },
  moon: () => (g, s) => { g.fillStyle = '#ffe6c2'; g.fillRect(0, 0, s, s); blot(g, s, 9, 'rgba(190,140,120,.45)', 4, 14); speck(g, s, 200, .08); },
};
// Character material name -> cloth/skin pattern. Eyes and Mouth stay flat (they are the face decals).
const CHARPAT = { Skin: c => PAT.skin(c), ZSkin: c => PAT.skin(c, 1), ZSkinDark: c => PAT.skin(c, 1), Jacket: c => PAT.weave(c), Shirt: c => PAT.stripes(c, 'rgba(0,0,0,.35)'), Red: c => PAT.stripes(c, 'rgba(255,255,255,.28)'),
  Pants: c => PAT.denim(c), Olive: c => PAT.weave(c), Pack: c => PAT.weave(c), Patch: c => PAT.weave(c), Strap: c => PAT.weave(c), Steel: c => PAT.metal(c), Hair: c => PAT.hair(c), White: c => PAT.plain(c), Dark: c => PAT.plain(c) };
// The character GLBs ship without UVs (keeps them ~80 KB). Add box-projected UVs once per shared geometry, in bind pose.
const uvDone = new WeakSet();
function boxUV(geo, k = 2.5) { if (uvDone.has(geo) || geo.attributes.uv) return; uvDone.add(geo); const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)); let u, v;
    if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); } else if (ay >= az) { u = p.getX(i); v = p.getZ(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * k; uv[i * 2 + 1] = v * k; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
const matCache = new Map(); // shared materials: every clone of a character reuses the same toon materials
const toonify = (root, tint) => root.traverse(o => {
  if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
  const old = Array.isArray(o.material) ? o.material : [o.material];
  const nu = old.map(m => { const key = m.uuid + (tint || ''); if (matCache.has(key)) { if (matCache.get(key).map && !m.map) boxUV(o.geometry); return matCache.get(key); }
    const pat = !m.map && CHARPAT[m.name], hex = m.color ? '#' + m.color.getHexString() : '#ffffff'; if (pat) boxUV(o.geometry);
    const mat = new THREE.MeshToonMaterial({ color: pat ? 0xffffff : tint ? new THREE.Color(tint).multiply(m.color || new THREE.Color(1,1,1)).multiplyScalar(1.6) : m.color, map: pat ? ctex('char-' + m.name + '-' + hex, 128, pat(hex)) : m.map || null, gradientMap: grad });
    mat.name = m.name; matCache.set(key, mat); return mat; });
  o.material = Array.isArray(o.material) ? nu : nu[0];
});

// Post: bloom + vignette
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.6, 0.5, 0.85); composer.addPass(bloom);
const vig = new ShaderPass({ uniforms: { tDiffuse: { value: null }, flash: { value: 0 }, time: { value: 0 } },
  vertexShader: 'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float flash,time;varying vec2 v;
    void main(){ vec2 o=(v-.5)*.0025*(1.+flash*6.); vec4 c=vec4(texture2D(tDiffuse,v+o).r,texture2D(tDiffuse,v).g,texture2D(tDiffuse,v-o).b,1.); // tiny chromatic split
      float l=dot(c.rgb,vec3(.299,.587,.114)); c.rgb=mix(vec3(l),c.rgb,1.18); c.rgb=(c.rgb-.5)*1.08+.5;           // saturation + contrast
      c.rgb+=vec3(-.025,.0,.045)*(1.-l)+vec3(.05,.02,-.03)*l;                                              // teal shadows, warm highlights
      float d=distance(v,vec2(.5)); c.rgb*=smoothstep(.9,.32,d);                                            // vignette
      c.rgb+=(fract(sin(dot(v*vec2(12.9898,78.233)+time,vec2(1.)))*43758.5453)-.5)*.035;                     // film grain
      c.rgb=mix(c.rgb,vec3(1.,.25,.15),flash); gl_FragColor=c; }` });
composer.addPass(vig); composer.addPass(new OutputPass());
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });

// Canvas-texture road
const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d');
g.fillStyle = '#353042'; g.fillRect(0, 0, 256, 256);
for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(20,16,30,.35)'; g.fillRect(20 + Math.random() * 200, Math.random() * 256, 30 + Math.random() * 40, 20 + Math.random() * 30); } // patches
g.strokeStyle = 'rgba(10,8,18,.6)'; g.lineWidth = 1.5; for (let i = 0; i < 7; i++) { g.beginPath(); let x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); for (let k = 0; k < 5; k++) g.lineTo(x += (Math.random() - .5) * 30, y += Math.random() * 18); g.stroke(); } // cracks
for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,255,255'},${Math.random() * .08})`; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
g.fillStyle = '#f2d36b'; g.fillRect(83, 0, 5, 128); g.fillRect(168, 0, 5, 128);
g.fillStyle = '#8a7fa0'; g.fillRect(0, 0, 8, 256); g.fillRect(248, 0, 8, 256); g.fillStyle = '#e8e2f0'; g.fillRect(12, 0, 3, 256); g.fillRect(241, 0, 3, 256);
const roadTex = new THREE.CanvasTexture(cv); roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(1, 25); roadTex.colorSpace = THREE.SRGBColorSpace;
roadTex.anisotropy = 4;
const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 220), new THREE.MeshToonMaterial({ map: roadTex, gradientMap: grad }));
road.rotation.x = -Math.PI / 2; road.position.z = -90; road.receiveShadow = true; scene.add(road);
const sv = document.createElement('canvas'); sv.width = sv.height = 128; const sg2 = sv.getContext('2d'); sg2.fillStyle = '#5a4c70'; sg2.fillRect(0, 0, 128, 128);
sg2.strokeStyle = '#43375a'; sg2.lineWidth = 3; for (let i = 0; i <= 128; i += 32) { sg2.beginPath(); sg2.moveTo(i, 0); sg2.lineTo(i, 128); sg2.moveTo(0, i); sg2.lineTo(128, i); sg2.stroke(); }
for (let i = 0; i < 300; i++) { sg2.fillStyle = `rgba(0,0,0,${Math.random() * .12})`; sg2.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
const sideTex = new THREE.CanvasTexture(sv); sideTex.wrapS = sideTex.wrapT = THREE.RepeatWrapping; sideTex.repeat.set(55, 55); sideTex.colorSpace = THREE.SRGBColorSpace;
const side = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshToonMaterial({ map: sideTex, gradientMap: grad }));
side.rotation.x = -Math.PI / 2; side.position.set(0, -0.02, -90); side.receiveShadow = true; scene.add(side);
// Sky dome: vertical gradient (deep purple -> pink horizon), no textures
const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#140c2e') }, mid: { value: new THREE.Color(PAL.fog) }, bot: { value: new THREE.Color(PAL.horizon) } },
  vertexShader: 'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top,mid,bot;varying vec3 p;void main(){float h=p.y;vec3 c=h>.08?mix(mid,top,smoothstep(.08,.55,h)):mix(bot,mid,smoothstep(-.02,.08,h));gl_FragColor=vec4(c,1.);}' }));
sky.position.z = -10; scene.add(sky);
const moon = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({ map: ctex('moon', 64, PAT.moon()), fog: false }));
moon.position.set(-38, 48, -128); moon.lookAt(0, 4, 8); scene.add(moon);
// Distant skyline silhouettes with a few lit windows (one InstancedMesh each, no fog so they read against the sky)
const SKN = 70, sky1 = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: ctex('skyline', 64, PAT.skyline()), fog: false }), SKN);
const WN = LOW ? 0 : 140, wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1.4), new THREE.MeshBasicMaterial({ color: '#ffc46b', fog: false }), Math.max(1, WN));
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(); let wi = 0;
  for (let i = 0; i < SKN; i++) { const a = -1.25 + 2.5 * i / SKN + (Math.random() - .5) * .03, r = 118 + Math.random() * 8, w = 6 + Math.random() * 9, h = 10 + Math.random() * 32 * (1 - Math.abs(a) * .35);
    const x = Math.sin(a) * r, z = -Math.cos(a) * r - 10; q.setFromEuler(new THREE.Euler(0, -a, 0)); m.compose(new THREE.Vector3(x, h / 2 - 2, z), q, new THREE.Vector3(w, h, w)); sky1.setMatrixAt(i, m);
    for (let k = 0; k < 3 && wi < WN; k++) if (Math.random() < .7) { m.compose(new THREE.Vector3(x + Math.cos(a) * (Math.random() - .5) * w * .7, 2 + Math.random() * (h - 4), z + Math.sin(a) * (Math.random() - .5) * w * .7 + w * .52 * Math.cos(a) * 0 + .1), q, new THREE.Vector3(.9, .9, 1));
      const off = new THREE.Vector3(0, 0, 1).applyQuaternion(q).multiplyScalar(w / 2 + .05); m.setPosition(new THREE.Vector3().setFromMatrixPosition(m).add(off)); wins.setMatrixAt(wi++, m); } }
  wins.count = wi; }
scene.add(sky1, wins);

// Soft round particle sprite
const sc = document.createElement('canvas'); sc.width = sc.height = 64; const sg = sc.getContext('2d');
const rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64); const dot = new THREE.CanvasTexture(sc);
const stc = document.createElement('canvas'); stc.width = stc.height = 64; const stg = stc.getContext('2d'); stg.fillStyle = '#fff'; stg.beginPath();
for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 30, a = i * Math.PI / 5 - Math.PI / 2; stg.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } stg.fill(); const star = new THREE.CanvasTexture(stc);
const PN = 160, pPos = new Float32Array(PN * 3), pVel = [];
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ color: '#fff0a0', size: .32, map: star, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const parts = new THREE.Points(pGeo, pMat); parts.frustumCulled = false; scene.add(parts); let pLife = 0;
// Shockwave ring for hits (stylized, no gore)
const wave = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 40), new THREE.MeshBasicMaterial({ color: '#fff0c0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
wave.rotation.x = -Math.PI / 2; wave.visible = false; scene.add(wave); let waveT = 0;
function shock(p) { wave.position.set(p.x, .08, p.z); waveT = .6; wave.visible = true; }
function burst(p, color = '#fff0a0', n = PN, spd = 8) { pMat.color.set(color); for (let i = 0; i < PN; i++) { pPos.set(i < n ? [p.x, p.y + 1, p.z] : [0, -99, 0], i * 3); pVel[i] = new THREE.Vector3((Math.random() - .5) * spd, Math.random() * spd, (Math.random() - .5) * spd); } pLife = 1.2; }
// Ambient floating embers
const EN = LOW ? 40 : 160, ePos = new Float32Array(EN * 3); for (let i = 0; i < EN; i++) ePos.set([(Math.random() - .5) * 40, Math.random() * 12, -Math.random() * 80], i * 3);
const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
scene.add(new THREE.Points(eGeo, new THREE.PointsMaterial({ color: '#ffb070', size: .25, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

let actx;
function beep(f, d = .1, type = 'square', v0 = .06) {
  try { actx ??= new AudioContext(); const o = actx.createOscillator(), v = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, actx.currentTime); o.frequency.exponentialRampToValueAtTime(f * 1.5, actx.currentTime + d);
    v.gain.setValueAtTime(v0, actx.currentTime); v.gain.exponentialRampToValueAtTime(.001, actx.currentTime + d);
    o.connect(v).connect(actx.destination); o.start(); o.stop(actx.currentTime + d); } catch {}
}

const hud = document.getElementById('hud'), msg = document.getElementById('msg'), best = document.getElementById('best');
const S = { squash: 0, best: +(localStorage.getItem('zr-best') || 0), state: 'loading', lane: 1, x: 0, y: 0, vy: 0, dist: 0, score: 0, level: 1, speed: 10, zombies: [], obs: [], ground: 0, grounded: true, lastHit: null, obsT: 2.5, spawnT: 0, frames: 0, shake: 0, flash: 0 };
window.__game = S;
const LANES = [-3, 0, 3], GRAVITY = -30, JUMP_V = 11, LEVEL_LEN = 250;
msg.innerHTML = 'Loading…';

const loader = new GLTFLoader();
const load = u => new Promise((res, rej) => loader.load(u, res, undefined, rej));
const CH = ['Survivor', 'Zombie', 'FastZombie', 'Brute', 'Soldier'];
const [surv, zomb, fast, brute, soldier, ...city] = await Promise.all([...CH.map(n => `assets/characters/${n}.glb`),
  ...['building-small-a', 'building-small-b', 'building-small-c', 'building-small-d', 'building-garage', 'grass-trees-tall', 'road-straight-lightposts'].map(n => `assets/city/${n}.glb`)].map(load));
window.__clips = Object.fromEntries([surv, zomb, fast, brute, soldier].map((g, i) => [CH[i], g.animations.map(a => a.name)]));
const clipOf = (g, n) => THREE.AnimationClip.findByName(g.animations, n);
const glowEyes = root => root.traverse(o => { if (o.isMesh && o.material.name === 'Eyes') { o.material.emissive = new THREE.Color(PAL.eye); o.material.emissiveIntensity = 2.5; } });
const keepMatNames = root => { const n = new Map(); root.traverse(o => { if (o.isMesh) n.set(o, o.material.name); }); return () => n.forEach((v, o) => o.material.name = v); };

// Player: Survivor from the AGJ character pack (Idle / Run / Jump clips). Model faces +Z, so turn it to run into the screen.
const player = SkeletonUtils.clone(surv.scene); toonify(player); player.scale.setScalar(1.35); scene.add(player);
const pMix = new THREE.AnimationMixer(player);
const act = { Idle: pMix.clipAction(clipOf(surv, 'Idle')), Running: pMix.clipAction(clipOf(surv, 'Run')), Jump: pMix.clipAction(clipOf(surv, 'Jump')) };
act.Death = act.Idle; // no death clip: we tip the player over in code instead
act.Jump.setLoop(THREE.LoopOnce); act.Jump.clampWhenFinished = true;
let cur = act.Idle; cur.play();
const fade = a => { if (a === cur) return; a.reset().play(); cur.crossFadeTo(a, .15, false); cur = a; };
window.__pclip = () => cur.getClip().name;

// Enemies: Zombie walks; FastZombie (level 2+) runs; Brute (level 3+) is big and slow. All lunge when close.
const KINDS = {
  Zombie:     { g: zomb,  move: 'Walk', hit: 'Attack', scale: 1.4,  extra: 1.5,  ts: 1.3, hw: .9 },
  FastZombie: { g: fast,  move: 'Run',  hit: 'Lunge',  scale: 1.4,  extra: 6,    ts: 1.2, hw: .8 },
  Brute:      { g: brute, move: 'Walk', hit: 'Attack', scale: 1.35, extra: -1.5, ts: 1.0, hw: 1.4 },
};
const pools = { Zombie: [], FastZombie: [], Brute: [] };
function makeEnemy(kind) {
  const K = KINDS[kind], z = SkeletonUtils.clone(K.g.scene); const fix = keepMatNames(z); toonify(z); fix(); glowEyes(z); z.scale.setScalar(K.scale);
  const m = new THREE.AnimationMixer(z), mv = m.clipAction(clipOf(K.g, K.move)), at = m.clipAction(clipOf(K.g, K.hit));
  mv.timeScale = K.ts; at.setLoop(THREE.LoopOnce); at.clampWhenFinished = true;
  const tel = new THREE.Mesh(telGeo, telMat()); tel.rotation.x = -Math.PI / 2; tel.position.y = .04; z.add(tel);
  Object.assign(z.userData, { kind, mix: m, mv, at, lunged: false, tel });
  return z;
}
function lunge(z) { const u = z.userData; if (u.lunged) return; u.lunged = true; u.at.reset().play(); u.mv.crossFadeTo(u.at, .1, false); }
function resetEnemy(z) { const u = z.userData; u.lunged = false; u.at.stop(); u.mv.reset().play(); u.mv.setEffectiveWeight(1); u.mv.time = Math.random(); }

// Soldier cameo: stands guard on the sidewalk, firing (Attack clip). Scenery only, no collision.
const guard = SkeletonUtils.clone(soldier.scene); toonify(guard); guard.scale.setScalar(1.35); scene.add(guard);
const gMix = new THREE.AnimationMixer(guard); gMix.clipAction(clipOf(soldier, 'Attack')).play();
guard.position.set(5.2, 0, -60); guard.rotation.y = -.6;
// Modular street from Kenney City Kit
const props = new THREE.Group(); scene.add(props);
city.forEach(c => toonify(c.scene));
const winMat = new THREE.MeshBasicMaterial({ color: '#ffcf6a' });
for (let i = 0; i < 28; i++) for (const s of [-1, 1]) {
  const pick = i % 4 === 3 ? city[5] : city[Math.floor(Math.random() * 5)];
  const b = pick.scene.clone(); b.traverse(o => o.castShadow = false); b.scale.setScalar(4.2); b.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
  b.position.set(s * (9.5 + Math.random() * 1.5), 0, -i * 5.5);
  if (false) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.9, .7), winMat); w.position.set(-s * 0.02, 1.6 + Math.random() * 1.2, 0); w.rotation.y = -s * Math.PI / 2; const gw = new THREE.Group(); gw.add(w); gw.position.copy(b.position).setX(s * 7.4); gw.userData.side = s; props.add(gw); }
  props.add(b);
}
const haloMat = new THREE.SpriteMaterial({ map: dot, color: '#ffd27a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 });
const coneGeo = new THREE.ConeGeometry(1.5, 3.2, 16, 1, true), coneMat = new THREE.MeshBasicMaterial({ color: '#ffcf80', transparent: true, opacity: .07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const poolGeo = new THREE.CircleGeometry(1.7, 24), poolMat = new THREE.MeshBasicMaterial({ map: dot, color: '#ffb860', transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending });
// ---- Instanced scenery: each repeated part is ONE InstancedMesh (one draw call) that scrolls by rewriting matrices ----
const ANCH = [], INST = [], _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _sc = new THREE.Vector3();
function instanced(geo, mat, items, shadow) { const im = new THREE.InstancedMesh(geo, mat, items.length); im.castShadow = !!shadow && !LOW; im.receiveShadow = !LOW; im.frustumCulled = false; im.userData.items = items; INST.push(im); scene.add(im); return im; }
function syncInst() { for (const im of INST) { im.userData.items.forEach((it, i) => im.setMatrixAt(i, _m.compose(_v.set(it.a.x + (it.dx || 0), it.dy || 0, it.a.z), _q.setFromEuler(_e.set(it.rx || 0, it.ry || 0, it.rz || 0)), _sc.set(it.sx || 1, it.sy || 1, it.sz || 1)))); im.instanceMatrix.needsUpdate = true; } }
const lampA = []; for (let i = 0; i < 14; i++) for (const s of [-1, 1]) lampA.push({ x: s * 5.6, z: -i * 11 - (s > 0 ? 5 : 0), s });
ANCH.push(...lampA);
const poleMat = new THREE.MeshToonMaterial({ map: ctex('lamp-pole', 64, PAT.metal('#3b3248')), gradientMap: grad });
instanced(new THREE.CylinderGeometry(.06, .08, 3.2, 6), poleMat, lampA.map(a => ({ a, dy: 1.6 })), true);
instanced(new THREE.SphereGeometry(.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe8a0' }), lampA.map(a => ({ a, dy: 3.25 })));
if (!LOW) { instanced(coneGeo, coneMat, lampA.map(a => ({ a, dy: 1.62 }))); instanced(poolGeo, poolMat, lampA.map(a => ({ a, dx: -a.s * .6, dy: .03, rx: -Math.PI / 2 }))); }
const haloPos = new Float32Array(lampA.length * 3), haloGeo = new THREE.BufferGeometry(); haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
const halos = new THREE.Points(haloGeo, new THREE.PointsMaterial({ map: dot, color: '#ffd27a', size: 4.2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 })); halos.frustumCulled = false; scene.add(halos);
const syncHalos = () => { lampA.forEach((a, i) => haloPos.set([a.x, 3.25, a.z], i * 3)); haloGeo.attributes.position.needsUpdate = true; };

// ---- Procedural street props (code-built, no extra downloads): wrecked cars, barricades, cones, debris, fences ----
const T = (c, pat) => new THREE.MeshToonMaterial({ map: ctex('prop-' + c, 128, (pat || PAT.plain)(c)), gradientMap: grad });
const M = { rust: T('#8a3b2a', PAT.paint), teal: T('#2f6f78', PAT.paint), cream: T('#d8c9a0', PAT.paint), glass: T('#1a2236', PAT.glass), tire: T('#141118', PAT.tire), cone: T('#ff7a2a', PAT.cone), white: T('#f2eee6', PAT.concrete), wood: T('#7a5232', PAT.wood), metal: T('#6d6a7a', PAT.metal), debris: T('#3a3443', PAT.concrete), crate: T('#9a6a3a', PAT.crate), cont: T('#3d6e8a', PAT.container), contR: T('#8a3a2a', PAT.container), cab: T('#c8b070', PAT.paint) };
const stripeCv = document.createElement('canvas'); stripeCv.width = 64; stripeCv.height = 16; { const c = stripeCv.getContext('2d'); for (let i = -2; i < 8; i++) { c.fillStyle = i % 2 ? '#f2eee6' : '#e0402a'; c.beginPath(); c.moveTo(i * 10, 16); c.lineTo(i * 10 + 10, 16); c.lineTo(i * 10 + 18, 0); c.lineTo(i * 10 + 8, 0); c.fill(); } }
const stripeTex = new THREE.CanvasTexture(stripeCv); stripeTex.colorSpace = THREE.SRGBColorSpace;
const fenceCv = document.createElement('canvas'); fenceCv.width = fenceCv.height = 32; { const c = fenceCv.getContext('2d'); c.strokeStyle = '#9a93ad'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(32, 32); c.moveTo(32, 0); c.lineTo(0, 32); c.stroke(); }
const fenceTex = new THREE.CanvasTexture(fenceCv); fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(8, 3);
const GEO = new Map(), geo = (k, f) => GEO.get(k) || GEO.set(k, f()).get(k); // shared geometry cache
// bake(): merge a prop's parts into one mesh per material (a wrecked car goes from 10 draw calls to 5)
function bake(g) { g.updateMatrixWorld(true); const byMat = new Map(), out = new THREE.Group();
  for (const o of g.children.slice()) { if (!o.isMesh || Array.isArray(o.material) || o.material.isMeshBasicMaterial && o.material.transparent) { out.add(o); continue; }
    if (!byMat.has(o.material)) byMat.set(o.material, []); byMat.get(o.material).push(o.geometry.index ? o.geometry.clone().applyMatrix4(o.matrix) : o.geometry.clone().applyMatrix4(o.matrix)); }
  byMat.forEach((geos, mat) => { const m = new THREE.Mesh(mergeGeometries(geos.map(q => q.index ? q : q)), mat); m.castShadow = m.receiveShadow = !LOW; out.add(m); }); return out; }
const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(geo(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = !LOW; return o; };
function car(paint) {
  const g = new THREE.Group();
  g.add(box(1.9, .6, 4, paint, 0, .55, 0), box(1.6, .55, 2, paint, 0, 1.1, .2), box(1.62, .4, 1.6, M.glass, 0, 1.12, .2), box(1.92, .18, .3, M.metal, 0, .45, -2.05), box(1.92, .18, .3, M.metal, 0, .45, 2.05));
  for (const [x, z] of [[-.95, -1.3], [.95, -1.3], [-.95, 1.3], [.95, 1.3]]) { const w = new THREE.Mesh(geo('tire', () => new THREE.CylinderGeometry(.36, .36, .28, 10)), M.tire); w.rotation.z = Math.PI / 2; w.position.set(x, .36, z); g.add(w); }
  const hl = new THREE.Mesh(geo('hl', () => new THREE.BoxGeometry(.3, .14, .05)), M.hl ||= new THREE.MeshBasicMaterial({ color: '#ffe9a8' })); hl.position.set(.6, .6, 2.02); g.add(hl); // one working headlight
  return bake(g);
}
function barricade() { const g = new THREE.Group(), board = new THREE.Mesh(new THREE.BoxGeometry(2.2, .32, .08), [M.white, M.white, M.white, M.white, new THREE.MeshToonMaterial({ map: stripeTex, gradientMap: grad }), new THREE.MeshToonMaterial({ map: stripeTex, gradientMap: grad })]);
  board.position.y = .9; g.add(board, box(.1, 1, .5, M.wood, -.9, .5, 0), box(.1, 1, .5, M.wood, .9, .5, 0)); return bake(g); }
function crate() { const g = new THREE.Group(); g.add(box(1.3, 1.3, 1.3, M.crate, 0, .65, 0), box(.9, .3, .9, M.crate, .1, 1.45, -.1)); g.children[1].rotation.y = .4; g.children[1].position.y = 1.15; return bake(g); }
function truck() { const g = new THREE.Group(), red = Math.random() < .5;
  g.add(box(2.3, 2.5, 4.2, red ? M.contR : M.cont, 0, 1.65, -.5), box(2.2, 1.6, 1.2, M.cab, 0, 1.2, 2.1), box(2, .6, .05, M.glass, 0, 1.6, 2.72), box(2.3, .3, 5.4, M.metal, 0, .45, 0));
  for (const [x, z] of [[-1.05, -1.8], [1.05, -1.8], [-1.05, 1.9], [1.05, 1.9]]) { const w = new THREE.Mesh(geo('tire', () => new THREE.CylinderGeometry(.36, .36, .28, 10)), M.tire); w.rotation.z = Math.PI / 2; w.position.set(x, .36, z); g.add(w); }
  return bake(g); }
function cone() { const g = new THREE.Group(), c = new THREE.Mesh(geo('cone', () => new THREE.ConeGeometry(.22, .7, 10)), M.cone); c.position.y = .38; g.add(c, box(.5, .05, .5, M.cone, 0, .025, 0)); return bake(g); }
function fence(len) { const g = new THREE.Group(), f = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.6), M.fence ||= new THREE.MeshBasicMaterial({ map: fenceTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  f.position.y = 1; f.rotation.y = Math.PI / 2; g.add(f); for (let i = 0; i <= len; i += len / 3) g.add(box(.08, 1.9, .08, M.metal, 0, .95, i - len / 2)); return bake(g); }
const paints = [M.rust, M.teal, M.cream];
for (let i = 0; i < 9; i++) { const sd = i % 2 ? 1 : -1, c = car(paints[i % 3]); c.position.set(sd * (5.9 + Math.random() * .6), 0, -8 - i * 16 - Math.random() * 6); c.rotation.y = (Math.random() - .5) * .9;
  if (i % 4 === 2) { c.rotation.z = sd * 1.35; c.position.y = .9; c.position.x = sd * 6.6; } props.add(c); }   // some flipped on their side
for (let i = 0; i < 7; i++) { const b = barricade(), sd = i % 2 ? -1 : 1; b.position.set(sd * 5.9, 0, -14 - i * 21); b.rotation.y = sd * .5 + (Math.random() - .5) * .3; props.add(b); }
for (let i = 0; i < 16; i++) { const c = cone(), sd = Math.random() < .5 ? -1 : 1; c.position.set(sd * (4.7 + Math.random() * .8), 0, -Math.random() * 140); if (Math.random() < .3) { c.rotation.z = 1.5; c.position.y = .2; } props.add(c); }
if (!LOW) { for (let i = 0; i < 6; i++) { const f = fence(9), sd = i % 2 ? 1 : -1; f.position.set(sd * 7.6, 0, -20 - i * 24); props.add(f); }
  const deb = [[], []]; for (let i = 0; i < 60; i++) { const a = { x: (Math.random() - .5) * 12, z: -Math.random() * 142 }; ANCH.push(a); deb[Math.random() < .3 ? 0 : 1].push({ a, dy: .04, ry: Math.random() * 3, sx: .15 + Math.random() * .35, sy: .05 + Math.random() * .1, sz: .15 + Math.random() * .35 }); }
  instanced(geo('box1,1,1', () => new THREE.BoxGeometry(1, 1, 1)), M.wood, deb[0]); instanced(geo('box1,1,1', () => new THREE.BoxGeometry(1, 1, 1)), M.debris, deb[1]); }
syncInst(); syncHalos();


// Enemy telegraph: pulsing red ring under enemies that are coming down your lane
const telGeo = new THREE.RingGeometry(.35, .5, 28), telMat = () => new THREE.MeshBasicMaterial({ color: '#ff3a3a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });

// ==== WORLD OBSTACLES (solid, pooled) ====================================================
const OBST = {            // hw/hd = half width/depth, h = height. land: you can stand on top. tall: must change lane.
  barricade: { make: () => barricade(),                         hw: 1.1,  hd: .3,   h: 1.05, land: false },
  crate:     { make: () => crate(),                             hw: .65,  hd: .65,  h: 1.3,  land: true },
  car:       { make: () => car(paints[(Math.random() * 3) | 0]), hw: .95,  hd: 2.05, h: 1.38, land: true },
  truck:     { make: () => truck(),                             hw: 1.15, hd: 2.6,  h: 2.9,  land: false, tall: true },
};
const obPools = Object.fromEntries(Object.keys(OBST).map(k => [k, []])); let obId = 0;
function spawnObstacle(kind, lane, z) {
  const o = obPools[kind].pop() || OBST[kind].make(); if (!o.parent) scene.add(o);
  o.userData.kind = kind; o.userData.id = ++obId; o.visible = true; o.position.set(LANES[lane], 0, z); o.rotation.set(0, kind === 'barricade' ? 0 : (Math.random() - .5) * .08, 0);
  S.obs.push(o); return o;
}
function recycleObstacle(o) { o.visible = false; obPools[o.userData.kind].push(o); }
window.__spawnObstacle = spawnObstacle; window.__reset = () => reset();

// ==== COLLISION: one small module, AABB only ==============================================
// Every solid thing gets a named axis-aligned box {name, min:[x,y,z], max:[x,y,z]}.
// Rules: run into the side of any obstacle = crash. Low ones can be jumped. land:true tops are floor.
const PLAYER_COL = { hw: .3, hd: .3, h: 1.7 };
const aabb = (name, x, y, z, hw, h, hd, extra) => ({ name, min: [x - hw, y, z - hd], max: [x + hw, y + h, z + hd], ...extra });
const overlaps = (a, b, axes = [0, 1, 2]) => axes.every(i => a.min[i] < b.max[i] && a.max[i] > b.min[i]);
const playerBox = () => aabb('player', S.x, S.y, 0, PLAYER_COL.hw, PLAYER_COL.h, PLAYER_COL.hd);
const obstacleBox = o => { const c = OBST[o.userData.kind]; return aabb(`${o.userData.kind}#${o.userData.id}`, o.position.x, 0, o.position.z, c.hw, c.h, c.hd, { land: c.land, tall: !!c.tall, kind: o.userData.kind }); };
const enemyBox = z => { const K = KINDS[z.userData.kind]; return aabb(z.userData.kind, z.position.x, z.position.y, z.position.z, K.hw - PLAYER_COL.hw, z.userData.kind === 'Brute' ? 1.8 : 1.4, .5 + (K.hw - .9) * .5, { enemy: true }); };
// Resolve the player against the world after moving. Returns ground height under the player and the box hit, if any.
function collideWorld(prevY) {
  const p = playerBox(), out = { ground: 0, hit: null };
  for (const o of S.obs) { const b = obstacleBox(o);
    if (!overlaps(p, b, [0, 2])) continue;                                                   // not above or beside us
    if (b.land && prevY >= b.max[1] - .08) { out.ground = Math.max(out.ground, b.max[1]); continue; } // we came from above: it is floor
    if (p.min[1] < b.max[1] - .02) { out.hit = b; break; }                                  // we are inside it: crash
  }
  return out;
}
// Enemies climb over obstacles instead of walking through them.
const groundUnder = (x, z, hw) => { let g = 0; for (const o of S.obs) { const b = obstacleBox(o); if (x + hw > b.min[0] && x - hw < b.max[0] && z > b.min[2] - .3 && z < b.max[2] + .3) g = Math.max(g, b.max[1]); } return g; };
window.__col = () => ({ player: playerBox(), obstacles: S.obs.map(obstacleBox), enemies: S.zombies.map(enemyBox), ground: S.ground, grounded: S.grounded, lastHit: S.lastHit });

// ?debug overlay: draws every collider box (cyan player, yellow low, red tall, green standable top, magenta enemies)
const DEBUG = Q.has('debug'), dbgHelpers = [];
const dbgInfo = DEBUG ? Object.assign(document.body.appendChild(document.createElement('div')), { id: 'dbg' }) : null;
function drawDebug() {
  if (!DEBUG) return; const boxes = [playerBox(), ...S.obs.map(obstacleBox), ...S.zombies.filter(z => z.visible).map(enemyBox)];
  while (dbgHelpers.length < boxes.length) { const h = new THREE.Box3Helper(new THREE.Box3(), 0xffffff); h.material.depthTest = false; h.renderOrder = 999; scene.add(h); dbgHelpers.push(h); }
  dbgHelpers.forEach((h, i) => { const b = boxes[i]; h.visible = !!b; if (!b) return; h.box.min.fromArray(b.min); h.box.max.fromArray(b.max);
    h.material.color.set(b.name === 'player' ? '#3ff' : b.enemy ? '#f4f' : b.tall ? '#f33' : b.land ? '#4f4' : '#ff3'); });
  dbgInfo.innerHTML = `DEBUG colliders: ${boxes.length} &nbsp; ground ${S.ground.toFixed(2)} m &nbsp; ${S.grounded ? 'on ground' : 'airborne'} &nbsp; last hit: ${S.lastHit || '-'}<br>
    <b style="color:#3ff">player</b> <b style="color:#ff3">low (jump)</b> <b style="color:#4f4">standable top</b> <b style="color:#f33">tall (dodge)</b> <b style="color:#f4f">enemy</b><br>textures: ${Object.keys(TEX).length} canvas maps`;
}

// ==== PERFORMANCE: FPS panel (?fps or F) + adaptive quality ===============================
// Target: 60 FPS desktop, 30 FPS phone. If the 3 s average stays under 30, quality steps down:
// HIGH (bloom, grading, shadows, pixel ratio <=1.5) -> MEDIUM (pixel ratio 1) -> LOW (no post FX, no shadows). ?noadapt turns this off.
const PERF = { times: [], show: Q.has('fps'), level: LOW ? 0 : 2, lowSince: 0, adapt: !Q.has('noadapt'), log: [] };
const LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
const fpsEl = Object.assign(document.body.appendChild(document.createElement('div')), { id: 'fps' }); fpsEl.hidden = !PERF.show;
addEventListener('keydown', e => { if (e.code === 'KeyF') fpsEl.hidden = PERF.show = !PERF.show; });
function setQuality(l, why) {
  PERF.level = l; PERF.log.push(`${LEVELS[l]} (${why})`); console.info('[quality]', LEVELS[l], why);
  if (l <= 1) { renderer.setPixelRatio(1); composer.setPixelRatio(1); composer.setSize(innerWidth, innerHeight); }
  if (l === 0) { renderer.shadowMap.enabled = false; key.castShadow = false; scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); }
}
let perfTxtT = 0;
function perfTick(now) {
  const T = PERF.times; T.push(now); while (T.length && now - T[0] > 3000) T.shift();
  const cur = T.length > 1 ? 1000 / (T[T.length - 1] - T[T.length - 2]) : 0, avg = T.length > 1 ? (T.length - 1) / ((T[T.length - 1] - T[0]) / 1000) : 0;
  let minF = 999; for (let i = 1; i < T.length; i++) minF = Math.min(minF, 1000 / (T[i] - T[i - 1]));
  PERF.cur = cur; PERF.avg = avg; PERF.min = minF;
  if (PERF.adapt && PERF.level > 0 && T.length > 2 && now - T[0] > 2900) { if (avg < 30) { PERF.lowSince ||= now; if (now - PERF.lowSince > 3000) { setQuality(PERF.level - 1, `avg ${avg.toFixed(0)} FPS < 30 for 3 s`); PERF.lowSince = 0; T.length = 0; } } else PERF.lowSince = 0; }
  if (PERF.show && now - perfTxtT > 250) { perfTxtT = now; const i = renderer.info.render;
    fpsEl.innerHTML = `<b>${cur.toFixed(0)}</b> FPS &nbsp; avg ${avg.toFixed(1)} &nbsp; min ${minF === 999 ? '-' : minF.toFixed(0)}<br>draw calls ${i.calls} &nbsp; triangles ${(i.triangles / 1000).toFixed(1)}k<br>quality ${LEVELS[PERF.level]}${PERF.adapt ? ' (auto)' : ''} &nbsp; target 60 desktop / 30 phone`; }
}
window.__perf = PERF;

function reset() {
  S.zombies.forEach(z => { z.visible = false; pools[z.userData.kind].push(z); }); S.zombies = []; S.obs.forEach(recycleObstacle); S.obs = []; player.rotation.x = 0;
  Object.assign(S, { state: 'run', lane: 1, x: 0, y: 0, vy: 0, dist: 0, score: 0, level: 1, speed: 10, spawnT: 1, obsT: 2.5, ground: 0, grounded: true, lastHit: null });
  msg.textContent = ''; fade(act.Running); camPos.set(0, 4.1, 7.6); camTgt.set(0, 1.5, -8);
}
function jump() { if (S.state === 'loading') return; if (S.state !== 'run') return reset(); if (S.grounded) { S.grounded = false; S.vy = JUMP_V; S.squash = -.7; beep(330, .15); fade(act.Jump); burst(player.position, '#6f5a99', 10, 3); } }
function move(d) { if (S.state === 'run') { S.lane = Math.max(0, Math.min(2, S.lane + d)); beep(520, .05, 'triangle', .03); } }
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); jump(); }
  if (['ArrowLeft', 'KeyA'].includes(e.code)) move(-1);
  if (['ArrowRight', 'KeyD'].includes(e.code)) move(1);
});
let tx = 0; addEventListener('pointerdown', e => tx = e.clientX);
addEventListener('pointerup', e => { const dx = e.clientX - tx; Math.abs(dx) > 40 ? move(Math.sign(dx)) : jump(); });

function spawn() {
  const r = Math.random(), kind = S.level >= 3 && r < .22 ? 'Brute' : S.level >= 2 && r < .5 ? 'FastZombie' : 'Zombie';
  const z = pools[kind].pop() || makeEnemy(kind); if (!z.parent) scene.add(z); resetEnemy(z);
  z.visible = true; z.position.set(LANES[Math.random() < .4 ? S.lane : Math.floor(Math.random() * 3)], 0, -65); // 40% aim at your lane, so no camping
  S.zombies.push(z);
}
window.__kinds = () => S.zombies.map(z => z.userData.kind + ':' + (z.userData.lunged ? z.userData.at.getClip().name : z.userData.mv.getClip().name));

function gameOver(title, by) {
  S.state = 'over'; S.overT = 0; S.lastHit = by; S.shake = .6; S.flash = .6; burst(player.position, '#fff0a0', 60, 7); shock(player.position); fade(act.Death); beep(90, .7, 'sawtooth', .1);
  const nb = S.score > S.best; if (nb) { S.best = S.score; try { localStorage.setItem('zr-best', S.best); } catch {} }
  msg.innerHTML = `<div class="over"><div class="ot">${title}</div><div class="os"><span>${S.score} m</span><span>Level ${S.level}</span><span>${nb ? 'NEW BEST' : 'Best ' + S.best + ' m'}</span></div><div class="press">Space / tap to run again</div></div>`;
}
function step(dt) {
  S.frames++; const t = performance.now() / 1000;
  if (S.state === 'run') {
    S.x += (LANES[S.lane] - S.x) * Math.min(1, dt * 12);
    const prevY = S.y; S.vy += GRAVITY * dt; S.y += S.vy * dt;
    const C = collideWorld(prevY); S.ground = C.ground;                 // world collision (see COLLISION module)
    if (S.y <= C.ground && S.vy <= 0) { const wasAir = !S.grounded; S.y = C.ground; S.vy = 0; S.grounded = true;
      if (wasAir) { S.squash = 1; S.shake = Math.max(S.shake, .12); if (cur === act.Jump) fade(act.Running); burst(player.position, '#c9b8ff', 14, 3); } }
    else if (S.y > C.ground + .01) S.grounded = false;
    if (C.hit) { gameOver('CRASHED!', C.hit.name); }
    S.dist += S.speed * dt; S.score = Math.floor(S.dist);
    const lvl = 1 + Math.floor(S.dist / LEVEL_LEN);
    if (lvl > S.level) { S.level = lvl; S.speed = 10 + (lvl - 1) * 3; msg.innerHTML = `<div class="lvl">LEVEL ${lvl}</div><div class="lvlsub">${lvl === 2 ? 'Runners incoming' : lvl === 3 ? 'Brutes awake' : 'Faster!'}</div>`; S.fovKick = 8; beep(440, .4, 'triangle', .08); setTimeout(() => { if (S.state === 'run') msg.textContent = ''; }, 1400); }
    S.obsT -= dt;
    if (S.obsT <= 0 && !Q.has('noobs')) { const r = Math.random(), kind = r < .3 ? 'barricade' : r < .55 ? 'crate' : r < .78 ? 'car' : 'truck'; spawnObstacle(kind, Math.floor(Math.random() * 3), -70); S.obsT = Math.max(1.6, 3.4 - S.level * .3) * (.7 + Math.random() * .6); }
    for (const o of S.obs) o.position.z += S.speed * dt;
    S.obs = S.obs.filter(o => { if (o.position.z > 9) { recycleObstacle(o); return false; } return true; });  // off-screen: back to the pool
    S.spawnT -= dt;
    if (S.spawnT <= 0 && !Q.has('nozombies')) { spawn(); S.spawnT = Math.max(.35, 1.4 - S.level * .18) * (.6 + Math.random() * .8); }
    for (const z of S.zombies) {
      z.position.z += (S.speed + KINDS[z.userData.kind].extra) * dt;
      if (z.position.z > -4.5 && z.position.z < 1 && Math.abs(z.position.x - player.position.x) < 1.6) lunge(z);
      z.position.y += (groundUnder(z.position.x, z.position.z, .4) - z.position.y) * Math.min(1, dt * 10); // climb over obstacles
      if (S.state === 'run' && overlaps(playerBox(), enemyBox(z))) { lunge(z); z.position.z = player.position.z - 1.3; gameOver('CAUGHT!', z.userData.kind); break; }
    }
    S.zombies = S.zombies.filter(z => { if (z.position.z > 8) { z.visible = false; pools[z.userData.kind].push(z); return false; } return true; });
    roadTex.offset.y += S.speed * dt / 8.8; sideTex.offset.y += S.speed * dt / 4;
    guard.position.z += S.speed * dt; if (guard.position.z > 12) guard.position.z = -150 - Math.random() * 60;
    props.children.forEach(p => { p.position.z += S.speed * dt; if (p.position.z > 12) p.position.z -= 154; p.visible = p.position.z > -100; }); // past the fog = not drawn
    for (const a of ANCH) { a.z += S.speed * dt; if (a.z > 12) a.z -= 154; } syncInst(); syncHalos();
  }
  pMix.update(dt * (S.state === 'run' && cur === act.Running ? S.speed / 10 : 1));
  for (const z of S.zombies) { z.userData.mix.update(dt); const u = z.userData, warn = S.state === 'run' && Math.abs(z.position.x - LANES[S.lane]) < 1 && z.position.z > -22 && z.position.z < -1;
    u.tel.material.opacity += ((warn ? .55 + .45 * Math.sin(t * 14) : 0) - u.tel.material.opacity) * Math.min(1, dt * 10); u.tel.scale.setScalar(1 + (warn ? .25 * Math.sin(t * 14) : 0)); }
  gMix.update(dt);
  if (waveT > 0) { waveT -= dt; const k = 1 - waveT / .6; wave.scale.setScalar(1 + k * 5); wave.material.opacity = 1 - k; wave.visible = waveT > 0; }
  if (S.state === 'over') player.rotation.x = Math.max(-1.45, player.rotation.x - dt * 5);
  player.position.set(S.x, S.y, 0); player.rotation.y = Math.PI; player.rotation.z = (S.x - LANES[S.lane]) * .16;
  S.squash += (0 - S.squash) * Math.min(1, dt * 9); const sq = S.squash; player.scale.set(1.35 * (1 + sq * .18), 1.35 * (1 - sq * .22), 1.35 * (1 + sq * .18));
  if (pLife > 0) { pLife -= dt; for (let i = 0; i < PN; i++) { pVel[i].y -= 15 * dt; pPos[i * 3] += pVel[i].x * dt; pPos[i * 3 + 1] = Math.max(0, pPos[i * 3 + 1] + pVel[i].y * dt); pPos[i * 3 + 2] += pVel[i].z * dt; } pGeo.attributes.position.needsUpdate = true; pMat.opacity = Math.min(1, pLife); }
  parts.visible = pLife > 0;
  for (let i = 0; i < EN; i++) { ePos[i * 3 + 1] += dt * .6; ePos[i * 3 + 2] += S.state === 'run' ? S.speed * dt * .5 : 0; if (ePos[i * 3 + 1] > 12) ePos[i * 3 + 1] = 0; if (ePos[i * 3 + 2] > 8) ePos[i * 3 + 2] -= 80; } eGeo.attributes.position.needsUpdate = true;
  S.shake = Math.max(0, S.shake - dt); S.flash = Math.max(0, S.flash - dt * 1.5); vig.uniforms.flash.value = S.flash * .6;
  const sh = S.shake * .5; vig.uniforms.time.value = t % 100;
  let cp, ct;
  if (S.state === 'title') { const a = Math.sin(t * .35) * .9; cp = new THREE.Vector3(Math.sin(a) * 4.2 + 1.2, 1.5, -Math.cos(a) * 4.6); ct = new THREE.Vector3(0.9, 2.9, 0); } // slow orbit in front of the hero
  else if (S.state === 'over') { S.overT += dt; cp = new THREE.Vector3(S.x + 3.2, 2.4, 4.4); ct = new THREE.Vector3(S.x, .9, -.6); }
  else { cp = new THREE.Vector3(S.x * .55, 4.1 + S.y * .25, 7.6); ct = new THREE.Vector3(S.x * .4, 1.5 + S.y * .3, -8); }
  camPos.lerp(cp, Math.min(1, dt * (S.state === 'run' ? 7 : 2.5))); camTgt.lerp(ct, Math.min(1, dt * (S.state === 'run' ? 8 : 2.5)));
  camera.position.copy(camPos).add(new THREE.Vector3((Math.random() - .5) * sh, (Math.random() - .5) * sh, 0)); camera.lookAt(camTgt);
  camera.rotateZ((S.x - LANES[S.lane]) * .02);
  S.fovKick = Math.max(0, (S.fovKick || 0) - dt * 10);
  const fov = 58 + (S.state === 'run' ? (S.speed - 10) * .9 + S.fovKick : 0); if (Math.abs(camera.fov - fov) > .01) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
  if (window.__cam) { camera.position.set(...window.__cam.p); camera.lookAt(...window.__cam.t); } // test hook for closeups
  hud.innerHTML = S.state === 'title' ? '' : `<div class="dist">${S.score}<small>m</small></div><div class="pill">LEVEL ${S.level}</div><div class="spd"><i style="width:${Math.min(100, (S.speed - 8) / 12 * 100)}%"></i></div>`;
  best.textContent = S.best ? `BEST ${S.best} m` : '';
  drawDebug();
}
S.state = 'title'; msg.innerHTML = '<div class="title"><span>ZOMBIE</span><span>RUNNER</span></div><div class="press">Space / tap to start</div><div class="keys">← → or swipe to dodge &nbsp;·&nbsp; Space / up to jump</div>';
let last = performance.now(); const camPos = new THREE.Vector3(0, 3, -6), camTgt = new THREE.Vector3(0, 1.6, 0);
window.__scene = scene;
renderer.info.autoReset = false; window.__renderer = renderer;
renderer.setAnimationLoop(() => { renderer.info.reset(); const now = performance.now(); const dt = Math.min(.05, (now - last) / 1000); last = now; step(dt); PERF.level > 0 ? composer.render() : renderer.render(scene, camera); perfTick(now); });
