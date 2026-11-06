# AGJ Character Pack

Five low-poly, rigged and animated characters for three.js browser games. Each is a single `.glb` file under 60 KB. They use one shared palette, so they look like a set.

| File | Role | Clips |
|---|---|---|
| `characters/Survivor.glb` | Player: hero with a backpack and red bandana | Idle, Walk, Run, Jump |
| `characters/Zombie.glb` | Basic enemy, arms out | Idle, Walk, Attack |
| `characters/FastZombie.glb` | Lean enemy that runs | Idle, Run, Lunge |
| `characters/Brute.glb` | Big, slow enemy | Idle, Walk, Attack |
| `characters/Soldier.glb` | Non-zombie NPC or ally, carries a rifle | Idle, Walk, Run, Attack |

Every character faces +Z (toward a default camera), stands on y = 0 and is about 2 units tall (the Brute is about 2.5). They all share one skeleton: `hips`, `spine`, `head`, `arm.L`, `arm.R`, `leg.L`, `leg.R`.

## Loading in three.js (CDN, no build step)

```html
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const gltf = await new GLTFLoader().loadAsync('characters/Zombie.glb');
const zombie = SkeletonUtils.clone(gltf.scene);   // clone for each enemy you spawn
scene.add(zombie);
const mixer = new THREE.AnimationMixer(zombie);
const clip = name => THREE.AnimationClip.findByName(gltf.animations, name);
let current = mixer.clipAction(clip('Walk')); current.play();
// switch clips smoothly
function play(name) { const next = mixer.clipAction(clip(name)); if (next === current) return; next.reset().play(); current.crossFadeTo(next, 0.15, false); current = next; }
// in your render loop: mixer.update(deltaSeconds);
</script>
```

Clone with `SkeletonUtils.clone`, not `scene.clone()`. A plain clone breaks the skeleton. For one-shot clips (Jump, Attack, Lunge), set `action.setLoop(THREE.LoopOnce)` and `action.clampWhenFinished = true`.

## Recolouring

The material names are the same in every file: `Skin`, `ZSkin`, `ZSkinDark`, `Shirt`, `Jacket`, `Pants`, `Olive`, `Dark`, `Pack`, `Hair`, `Red`, `Eyes`. Change one by name:

```js
zombie.traverse(o => { if (o.isMesh && o.material.name === 'Shirt') { o.material = o.material.clone(); o.material.color.set('#aa3355'); } });
```

Clone the material before changing it so other copies keep their colour. For a toon look, swap each material for `new THREE.MeshToonMaterial({ color: m.color, emissive: m.emissive })` (see `test.html`).

## Tweaking or adding characters

The generator lives in `blender/make_characters.py`. Each character is a list of boxes (size, position, material, bone) plus a dictionary of clips. Copy an entry in `CHARS`, change it, then run:

```
blender -b --python blender/make_characters.py            # all characters
blender -b --python blender/make_characters.py -- Brute   # just one
```

Rotation conventions: a positive spine X rotation leans forward, and a positive arm X rotation raises the arms. Rebuilding all five takes about 2 seconds. Blender 4.2 LTS works headless, with no GPU needed.

## Preview

Serve the folder (`python3 -m http.server 8000 --bind 127.0.0.1`) and open `test.html`. Optional query settings: `?clip=Run`, `?only=Brute`, `&close`, `&side`.
