import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// 3D-фигурка в hero: шея и голова следят за курсором, глаза периодически моргают.
// Модель: assets/models/figurka.glb (скелет Figurka_Rig, кости neck → head).
// Глаза нарисованы на текстуре, поэтому моргание — подмена текстуры на кадры с полуприкрытыми и закрытыми глазами.

const MODEL_URL = "./assets/models/figurka.glb";
const BLINK_URLS = { half: "./assets/models/figurka_half.webp", closed: "./assets/models/figurka_closed.webp" };
// Карты свойств материала по зонам (волосы/сумка, ткань, металл ботинок, глаза, телефон, кожа):
// coat — R лак, G гладкость лака; pearl — R перламутр, G толщина плёнки; sheen — цвет отлива; mr — G шероховатость, B металл
const FX_URLS = {
  coat: "./assets/models/figurka_coat.webp",
  pearl: "./assets/models/figurka_pearl.webp",
  sheen: "./assets/models/figurka_sheen.webp",
  mr: "./assets/models/figurka_mr.webp",
};
const DRACO_URL = "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/";

// Доли поворота: шея и голова вместе дают полный угол
const NECK_SHARE = 0.4;
const HEAD_SHARE = 0.6;
const MAX_YAW = 0.55;
const MAX_PITCH = 0.28;

const desktopHost = document.getElementById("character-host");
const mobileHost = document.getElementById("character-host-mobile");
const mobileQuery = window.matchMedia("(max-width: 1120px)");

const announceReady = () => window.dispatchEvent(new Event("character:ready"));

// Если 3D недоступно — возвращаем прежние зацикленные видео
const showFallback = () => {
  const make = (src, className) => {
    const video = document.createElement("video");
    Object.assign(video, { autoplay: true, muted: true, loop: true, playsInline: true });
    video.className = className;
    video.src = src;
    return video;
  };
  desktopHost?.replaceWith(make("./assets/hero-alpha.webm", "hero__video"));
  mobileHost?.replaceWith(make("./assets/avatar-mobile-alpha.webm", "hero__figure-video"));
  announceReady();
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (error) {
  renderer = null;
}

if (!renderer || !desktopHost || !mobileHost) {
  showFallback();
} else {
  init().catch((error) => {
    console.error(error);
    renderer.domElement.remove();
    showFallback();
  });
}

async function init() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "character-canvas";
  // размеры задаём и здесь, чтобы холст не зависел от того, успел ли загрузиться CSS
  Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  // Светлая дневная студия (high-key): голубое «небо» сверху и сзади, тёплое солнце спереди,
  // светлый отражённый свет от пола. Перламутру и хрому есть что отражать.
  const studio = new RoomEnvironment();
  const softbox = (color, k, x, y, z, w, h) => {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }),
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    studio.add(panel);
  };
  softbox(0xa9dcff, 2.6, 0, 7, -1, 12, 6); // небо сверху
  softbox(0x9fd6ff, 2.2, 0, 3, -6, 12, 6); // небо за спиной
  softbox(0xfff1da, 3.4, 3, 4, 5, 5, 4); // солнце спереди справа
  softbox(0xd8efff, 1.8, -5, 2, 3, 4, 6); // холодная заливка слева
  softbox(0xfff6ea, 1.6, 0, -2, 4, 8, 3); // отражение от светлого пола
  softbox(0xffd0ea, 1.2, 5, 1, -2, 3, 5); // лёгкий розовый блик для перламутра
  scene.environment = pmrem.fromScene(studio, 0.04).texture;
  scene.environmentIntensity = 0.85;
  scene.add(new THREE.HemisphereLight(0xd2ecff, 0xf3e6d2, 0.75));
  // холодная мягкая заливка слева спереди — тени не проваливаются
  const fill = new THREE.DirectionalLight(0xdaeeff, 0.55);
  fill.position.set(-3, 2.5, 4);
  scene.add(fill);
  // тёплое «солнце» сверху справа спереди — основной рисующий свет и мягкая тень на пол
  const sideLight = new THREE.SpotLight(0xfff0d8, 42, 0, 0.55, 1, 2);
  sideLight.position.set(1.3, 5.6, 2.8);
  sideLight.target.position.set(0, 0.9, 0);
  sideLight.castShadow = true;
  sideLight.shadow.mapSize.set(2048, 2048);
  sideLight.shadow.camera.near = 0.5;
  sideLight.shadow.camera.far = 10;
  sideLight.shadow.bias = -0.0004;
  sideLight.shadow.normalBias = 0.02;
  sideLight.shadow.radius = 10;
  scene.add(sideLight, sideLight.target);
  // контровой свет слева сзади — светло-голубой, как отсвет неба по силуэту
  const rimLight = new THREE.SpotLight(0xd6efff, 40, 0, 0.7, 1, 2);
  rimLight.position.set(-1.7, 2.4, -1.6);
  rimLight.target.position.set(0, 1.0, 0);
  scene.add(rimLight, rimLight.target);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.05, 100);

  const draco = new DRACOLoader().setDecoderPath(DRACO_URL);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const textureLoader = new THREE.TextureLoader();
  // как у текстур из glTF: без переворота по Y; цветовые — в sRGB, карты данных — линейные
  const loadTex = (url, isColor) =>
    textureLoader.loadAsync(url).then((texture) => {
      texture.flipY = false;
      texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      return texture;
    });
  const [gltf, halfMap, closedMap, coatMap, pearlMap, sheenMap, mrMap] = await Promise.all([
    loader.loadAsync(MODEL_URL),
    loadTex(BLINK_URLS.half, true),
    loadTex(BLINK_URLS.closed, true),
    loadTex(FX_URLS.coat, false),
    loadTex(FX_URLS.pearl, false),
    loadTex(FX_URLS.sheen, true),
    loadTex(FX_URLS.mr, false),
  ]);
  const model = gltf.scene;
  scene.add(model);
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  const bones = {};
  let skinMaterial = null;
  model.traverse((node) => {
    if (node.isBone) bones[node.name] = node;
    if (node.isMesh) {
      node.frustumCulled = false;
      const base = node.material;
      // Перламутр, лак и отлив по зонам: волосы и сумка — перламутр, ткань — зелёная основа под
      // прозрачным лаком с фиолетовым отливом, пряжки — хром, глаза — стеклянный лак
      skinMaterial = new THREE.MeshPhysicalMaterial({
        map: base.map,
        normalMap: base.normalMap,
        normalScale: base.normalScale,
        roughnessMap: mrMap,
        metalnessMap: mrMap,
        roughness: 1,
        metalness: 1,
        clearcoat: 1,
        clearcoatMap: coatMap,
        clearcoatRoughness: 1,
        clearcoatRoughnessMap: coatMap,
        iridescence: 1,
        iridescenceMap: pearlMap,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [120, 720],
        iridescenceThicknessMap: pearlMap,
        sheen: 1,
        sheenColor: new THREE.Color(0xffffff),
        sheenColorMap: sheenMap,
        sheenRoughness: 0.35,
      });
      // Отлив по краю силуэта: на ткани — фиолетовый из карты отлива, на волосах и сумке —
      // пастельная радуга, меняющаяся с углом зрения, как у перламутра
      skinMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.uRim = { value: 0.55 };
        shader.fragmentShader = shader.fragmentShader
          .replace("void main() {", "uniform float uRim;\nvoid main() {")
          .replace(
            "#include <opaque_fragment>",
            `
            vec3 fxTint = texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
            vec2 fxPearl = texture2D( iridescenceMap, vIridescenceMapUv ).rg;
            float fxFres = pow( 1.0 - clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 ), 2.2 );
            vec3 fxRainbow = 0.6 + 0.4 * cos( 6.2831 * ( fxFres * 1.4 + fxPearl.g * 1.7 + vec3( 0.0, 0.33, 0.67 ) ) );
            float fxHair = smoothstep( 0.9, 0.98, fxPearl.r );
            float fxCloth = smoothstep( 0.7, 0.8, fxPearl.r ) * ( 1.0 - fxHair );
            // ткань: зелёная основа чуть приглушается, сверху — прозрачный слой с фиолетовым отливом
            outgoingLight = mix( outgoingLight, vec3( dot( outgoingLight, vec3( 0.333 ) ) ), 0.22 * fxCloth );
            outgoingLight += fxTint * ( 0.1 + pow( fxFres, 0.7 ) * 0.55 ) * fxCloth * uRim;
            outgoingLight += mix( fxTint, fxRainbow * 0.85, fxHair ) * fxFres * uRim * ( 1.0 - fxCloth );
            #include <opaque_fragment>`,
          );
      };
      node.material = skinMaterial;
      base.dispose();
    }
  });
  if (!bones.head || !bones.neck) throw new Error("В модели нет костей neck/head");
  if (!skinMaterial?.map) throw new Error("У модели нет основной текстуры");

  const openMap = skinMaterial.map;
  for (const map of [halfMap, closedMap]) {
    map.wrapS = openMap.wrapS;
    map.wrapT = openMap.wrapT;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    renderer.initTexture(map);
  }

  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const FIGURE_H = box.max.y - box.min.y;

  // Пол: прозрачная плоскость, которая показывает только тень от бокового света,
  // плюс мягкая контактная тень прямо под ботинками
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.16, color: 0x3a4a66 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = box.min.y;
  floor.receiveShadow = true;
  scene.add(floor);
  const contactTexture = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(64,70,92,0.7)");
    grad.addColorStop(0.55, "rgba(64,70,92,0.26)");
    grad.addColorStop(1, "rgba(64,70,92,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(FIGURE_H * 0.42, FIGURE_H * 0.26),
    new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, box.min.y + 0.002, 0.02);
  scene.add(contact);

  // Стеклянные глаза: глаза нарисованы на текстуре, поэтому блики — два мягких пятна на каждом глазу,
  // привязанные к голове. Точку на поверхности глаза находим лучом спереди.
  const EYES = [
    { x: -0.1425, y: 1.4975 },
    { x: 0.109, y: 1.4975 },
  ];
  const glintTexture = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.85)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const glintMat = new THREE.MeshBasicMaterial({ map: glintTexture, transparent: true, depthWrite: false, toneMapped: false });
  const glints = [];
  const ray = new THREE.Raycaster();
  const skinned = [];
  model.traverse((node) => node.isMesh && skinned.push(node));
  for (const eye of EYES) {
    ray.set(new THREE.Vector3(eye.x, eye.y, 2), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObjects(skinned, false)[0];
    if (!hit) continue;
    for (const [dx, dy, size, opacity] of [[-0.018, 0.016, 0.026, 0.95], [0.02, -0.014, 0.011, 0.8]]) {
      const glint = new THREE.Mesh(new THREE.CircleGeometry(size / 2, 24), glintMat.clone());
      glint.material.opacity = opacity;
      glint.position.set(eye.x + dx, eye.y + dy, hit.point.z + 0.004);
      model.add(glint);
      glints.push(glint);
      model.updateMatrixWorld(true);
      bones.head.attach(glint);
    }
  }

  // Поворот в пространстве модели → локальный кватернион кости
  const rig = (bone) => {
    const parentWorld = new THREE.Quaternion();
    bone.parent.getWorldQuaternion(parentWorld);
    const modelQuat = new THREE.Quaternion();
    model.getWorldQuaternion(modelQuat);
    parentWorld.premultiply(modelQuat.clone().invert());
    return { bone, rest: bone.quaternion.clone(), parentWorld, parentInv: parentWorld.clone().invert() };
  };
  const neckRig = rig(bones.neck);
  const headRig = rig(bones.head);
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const delta = new THREE.Quaternion();
  const applyLook = (r, yaw, pitch, roll = 0) => {
    euler.set(pitch, yaw, roll);
    delta.setFromEuler(euler);
    delta.premultiply(r.parentInv).multiply(r.parentWorld);
    r.bone.quaternion.copy(delta).multiply(r.rest);
  };

  // ---------- кадрирование ----------
  let currentHost = null;
  const frame = () => {
    const isMobile = mobileQuery.matches;
    const host = isMobile ? mobileHost : desktopHost;
    if (host !== currentHost) {
      host.appendChild(renderer.domElement);
      currentHost = host;
    }
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fill — доля высоты кадра под фигурку, ground — где пол (доля от верха)
    const fill = isMobile ? 0.86 : 0.6;
    const ground = isMobile ? 0.96 : 0.86;
    const viewH = FIGURE_H / fill;
    const dist = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const cy = box.min.y + (ground - 0.5) * viewH;
    camera.position.set(0, cy, dist);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
  };
  frame();
  window.addEventListener("resize", frame);
  mobileQuery.addEventListener("change", frame);
  const sizeWatcher = new ResizeObserver(frame);
  sizeWatcher.observe(desktopHost);
  sizeWatcher.observe(mobileHost);

  // ---------- курсор ----------
  const pointer = { x: 0, y: 0, last: -Infinity };
  const onPointer = (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.last = performance.now();
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });

  // ---------- моргание: кадры open → half → closed → half → open ----------
  const BLINK_FRAMES = [
    [0, halfMap],
    [45, closedMap],
    [125, halfMap],
    [170, openMap],
  ];
  let nextBlink = performance.now() + 1800;
  let blinkStart = -1;
  let doubleBlink = false;
  const updateBlink = (now) => {
    if (blinkStart < 0 && now >= nextBlink) blinkStart = now;
    if (blinkStart < 0) return;
    const t = now - blinkStart;
    let map = openMap;
    for (const [at, frameMap] of BLINK_FRAMES) if (t >= at) map = frameMap;
    if (skinMaterial.map !== map) {
      skinMaterial.map = map;
      for (const glint of glints) glint.visible = map === openMap;
    }
    if (t >= 170) {
      blinkStart = -1;
      if (!doubleBlink && Math.random() < 0.2) {
        doubleBlink = true;
        nextBlink = now + 120;
      } else {
        doubleBlink = false;
        nextBlink = now + 2400 + Math.random() * 3600;
      }
    }
  };

  // ---------- цикл ----------
  let visible = true;
  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  }).observe(document.querySelector(".hero"));

  if (new URLSearchParams(location.search).has("character-debug")) {
    window.__character = { THREE, renderer, scene, camera, model, neckRig, headRig, applyLook, skinMaterial, openMap, halfMap, closedMap, glints };
  }

  const headPos = new THREE.Vector3();
  const look = { yaw: 0, pitch: 0 };
  const clock = new THREE.Clock();
  const clamp = THREE.MathUtils.clamp;
  let announced = false;

  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) {
      clock.getDelta();
      return;
    }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const now = performance.now();

    let ty;
    let tp;
    if (now - pointer.last < 4000) {
      bones.head.getWorldPosition(headPos);
      headPos.y += FIGURE_H * 0.12;
      headPos.project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      const hx = rect.left + ((headPos.x + 1) / 2) * rect.width;
      const hy = rect.top + ((1 - headPos.y) / 2) * rect.height;
      ty = clamp((pointer.x - hx) / (window.innerWidth * 0.45), -1, 1) * MAX_YAW;
      tp = clamp((pointer.y - hy) / (window.innerHeight * 0.5), -1, 1) * MAX_PITCH;
    } else {
      ty = Math.sin(t * 0.35) * 0.14;
      tp = Math.sin(t * 0.27) * 0.04;
    }
    const ease = 1 - Math.exp(-dt * 5);
    look.yaw += (ty - look.yaw) * ease;
    look.pitch += (tp - look.pitch) * ease;

    applyLook(neckRig, look.yaw * NECK_SHARE, look.pitch * NECK_SHARE);
    applyLook(headRig, look.yaw * HEAD_SHARE, look.pitch * HEAD_SHARE, -look.yaw * 0.06);

    updateBlink(now);

    renderer.render(scene, camera);
    if (!announced) {
      announced = true;
      announceReady();
    }
  });
}
