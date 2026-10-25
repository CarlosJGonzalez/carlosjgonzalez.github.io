/*
 * Oleaje — fondo de olas en líneas (Three.js)
 * Uso: <div id="oleaje" data-color="#c8f542" data-opacity="0.25"></div>
 *      <script type="module" src="oleaje.js"></script>
 */
// También funciona con <script src="oleaje_v2.js" defer></script>.
(async () => {
  if (document.readyState === "loading") {
    await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
  }
  const el = document.getElementById("oleaje");
  if (!el) return;
  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js");
    init(el, THREE);
  } catch (error) {
    el.dataset.waveStatus = "error";
    console.error("Oleaje: It could not be started. Check your connection and browser errors..", error);
  }
})();

function init(el, THREE) {
  const color = el.dataset.color || "#c8f542";
  const opacity = parseFloat(el.dataset.opacity || "0.25");
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
  renderer.setSize(el.clientWidth, el.clientHeight);
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x05070a, 6, 26);
  const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 100);
  camera.position.set(0, 3.2, 8);
  camera.lookAt(0, 0, -2);

  // Ajuste 1: menos líneas en móvil
  const segX = isMobile ? 40 : 90;
  const segZ = isMobile ? 30 : 70;
  const geo = new THREE.PlaneGeometry(40, 30, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute("position");
  const base = Float32Array.from(pos.array);
  const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = -6;
  scene.add(mesh);

  function shape(t) {
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      pos.setY(i,
        Math.sin(x * 0.35 + t * 0.45) * 0.45 +
        Math.sin(z * 0.5 + t * 0.6) * 0.35 +
        Math.sin((x + z) * 0.8 + t * 0.8) * 0.12);
    }
    pos.needsUpdate = true;
  }

  let mx = 0, my = 0;
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  let raf = 0, visible = true, t = 0, last = performance.now();
  function prefersStill() {
    return el.dataset.motion !== "animate" && reduceMotion.matches;
  }
  function updateStatus() {
    el.dataset.waveStatus = prefersStill() ? "reduced-motion" : !visible ? "offscreen" : document.hidden ? "hidden-tab" : "animating";
    el.dispatchEvent(new CustomEvent("wave-status", { detail: el.dataset.waveStatus }));
  }
  function frame(now) {
    raf = 0;
    if (!visible || prefersStill() || document.hidden) { updateStatus(); return; }
    t += Math.min((now - last) / 1000, 0.05);
    last = now;
    shape(t);
    camera.position.x += (mx * 2 - camera.position.x) * 0.03;
    camera.position.y += (3.2 - my * 1.2 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -2);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    updateStatus();
    if (raf || !visible || prefersStill() || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  // Ajuste 3: oleaje quieto con movimiento reducido
  function renderStill() { shape(1.5); renderer.render(scene, camera); }

  // Ajuste 2: pausa fuera de pantalla (y con la pestaña oculta)
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      if (!entry) return;
      visible = entry.isIntersecting;
      visible ? start() : stop();
      updateStatus();
    }).observe(el);
  }
  function syncMotion() {
    stop();
    if (prefersStill()) renderStill();
    else start();
    updateStatus();
  }
  document.addEventListener("visibilitychange", syncMotion);
  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", syncMotion);
  else reduceMotion.addListener(syncMotion);
  new MutationObserver(syncMotion).observe(el, { attributes: true, attributeFilter: ["data-motion"] });

  window.addEventListener("resize", () => {
    camera.aspect = el.clientWidth / el.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(el.clientWidth, el.clientHeight);
    if (!raf) renderStill();
  });

  renderStill();
  syncMotion();
}
