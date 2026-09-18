/* LAZT hero: a campus hall assembling out of a gaussian point cloud.
   Plain WebGL 1, no dependencies. The page works without it. */
(() => {
  'use strict';

  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const DEBUG = /[?&]debug\b/.test(location.search);

  let gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG });
  } catch (e) { gl = null; }
  if (!gl) { canvas.remove(); return; }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = Math.min(innerWidth, innerHeight) < 600 || matchMedia('(pointer: coarse)').matches;   // phones, tablets
  const DENSITY = compact ? 0.55 : 1;

  /* ------------------------------------------------------------ random */
  let seed = 20260918;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const rr = (a, b) => a + (b - a) * rnd();

  /* ------------------------------------------------------- point cloud */
  const BLD = 0, EDGE = 1, GROUND = 2, TREE = 3, WALK = 4, DUST = 5;
  const pts = [];                                   // x, y, z, kind
  const push = (x, y, z, k) => { pts.push(x, y, z, k); };
  const count = c => Math.max(1, Math.round(c * DENSITY));
  const J = 0.018;                                  // surface jitter

  function quad(o, u, v, c, k, hole) {              // parallelogram o + a·u + b·v
    for (let i = 0, N = count(c); i < N; i++) {
      const a = rnd(), b = rnd();
      if (hole && hole(a, b)) continue;
      push(o[0] + a * u[0] + b * v[0] + rr(-J, J),
           o[1] + a * u[1] + b * v[1] + rr(-J, J),
           o[2] + a * u[2] + b * v[2] + rr(-J, J), k);
    }
  }
  function tri(p, q, r, c, k) {
    for (let i = 0, N = count(c); i < N; i++) {
      let a = rnd(), b = rnd();
      if (a + b > 1) { a = 1 - a; b = 1 - b; }
      push(p[0] + a * (q[0] - p[0]) + b * (r[0] - p[0]),
           p[1] + a * (q[1] - p[1]) + b * (r[1] - p[1]),
           p[2] + a * (q[2] - p[2]) + b * (r[2] - p[2]), k);
    }
  }
  function seg(p, q, c, k) {
    for (let i = 0, N = count(c); i < N; i++) {
      const t = rnd();
      push(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t, k);
    }
  }
  // punch a grid of windows into a facade (a, b are the 0..1 facade coords)
  const windows = (cols, rows, extra) => (a, b) => {
    if (extra && extra(a, b)) return true;
    const la = (a * cols) % 1, lb = (b * rows) % 1;
    return Math.abs(la - 0.5) < 0.21 && Math.abs(lb - 0.53) < 0.25;
  };

  const D = 46;                                     // points per square unit

  // main hall: x[-5,5] y[0,3.4] z[-1.6,1.6], pitched roof along x
  const HX = 5, HY = 3.4, HZ = 1.6, RIDGE = 4.9;
  quad([-HX, 0, HZ], [2 * HX, 0, 0], [0, HY, 0], 34 * D, BLD, windows(10, 3, a => Math.abs(a - 0.5) < 0.115));
  quad([-HX, 0, -HZ], [2 * HX, 0, 0], [0, HY, 0], 14 * D, BLD, windows(10, 3));
  quad([-HX, HY, HZ], [2 * HX, 0, 0], [0, RIDGE - HY, -HZ], 22 * D, BLD);
  quad([-HX, HY, -HZ], [2 * HX, 0, 0], [0, RIDGE - HY, HZ], 12 * D, BLD);
  for (const sx of [-1, 1]) tri([sx * HX, HY, -HZ], [sx * HX, HY, HZ], [sx * HX, RIDGE, 0], 3 * D, BLD);

  // chapel tower + spire, centered and stepping forward
  const TX = 1.1, TZ0 = 0.4, TZ1 = 2.6, TY = 7.2, APEX = 10.4, TZM = (TZ0 + TZ1) / 2;
  const towerFront = (a, b) =>
    (Math.abs(a - 0.5) < 0.17 && b < 0.2) ||                               // door
    (Math.abs(a - 0.5) < 0.1 && b > 0.28 && b < 0.48) ||                   // lancet window
    (b > 0.8 && b < 0.93 && Math.abs(Math.abs(a - 0.5) - 0.21) < 0.1);     // belfry
  quad([-TX, 0, TZ1], [2 * TX, 0, 0], [0, TY, 0], 16 * D, BLD, towerFront);
  for (const sx of [-1, 1]) {
    quad([sx * TX, 0, TZ0], [0, 0, TZ1 - TZ0], [0, TY, 0], 13 * D, BLD,
      (a, b) => b > 0.8 && b < 0.93 && Math.abs(a - 0.5) < 0.22);
  }
  quad([-TX, RIDGE - 0.3, TZ0], [2 * TX, 0, 0], [0, TY - RIDGE + 0.3, 0], 5 * D, BLD);
  const apex = [0, APEX, TZM];
  const c0 = [-TX, TY, TZ0], c1 = [TX, TY, TZ0], c2 = [TX, TY, TZ1], c3 = [-TX, TY, TZ1];
  tri(c3, c2, apex, 4 * D, BLD);
  tri(c2, c1, apex, 3.4 * D, BLD);
  tri(c0, c3, apex, 3.4 * D, BLD);
  tri(c1, c0, apex, 2.2 * D, BLD);
  for (let i = 0, N = count(170); i < N; i++) {                         // rose window
    const t = rnd() * Math.PI * 2;
    push(Math.cos(t) * 0.46, 4.72 + Math.sin(t) * 0.46, TZ1 + 0.02, EDGE);
  }
  seg([0, APEX, TZM], [0, APEX + 0.95, TZM], 44, EDGE);                  // cross
  seg([-0.32, APEX + 0.62, TZM], [0.32, APEX + 0.62, TZM], 26, EDGE);

  // wings stepping forward at both ends, ridges along z
  const WX0 = 5, WX1 = 7.6, WZ0 = -1.6, WZ1 = 3.8, WY = 2.8, WR = 3.95;
  for (const sx of [-1, 1]) {
    const x0 = sx * WX0, x1 = sx * WX1, xm = sx * (WX0 + WX1) / 2, xl = Math.min(x0, x1);
    quad([xl, 0, WZ1], [WX1 - WX0, 0, 0], [0, WY, 0], 7.3 * D, BLD, windows(3, 2));
    tri([x0, WY, WZ1], [x1, WY, WZ1], [xm, WR, WZ1], 1.6 * D, BLD);
    quad([x0, 0, HZ], [0, 0, WZ1 - HZ], [0, WY, 0], 6 * D, BLD, windows(2, 2));
    quad([x1, 0, WZ0], [0, 0, WZ1 - WZ0], [0, WY, 0], 10 * D, BLD, windows(5, 2));
    quad([x0, WY, WZ0], [0, 0, WZ1 - WZ0], [xm - x0, WR - WY, 0], 9 * D, BLD);
    quad([x1, WY, WZ0], [0, 0, WZ1 - WZ0], [xm - x1, WR - WY, 0], 9 * D, BLD);
    // silhouette edges
    seg([x0, WY, WZ1], [xm, WR, WZ1], 64, EDGE);
    seg([x1, WY, WZ1], [xm, WR, WZ1], 64, EDGE);
    seg([xm, WR, WZ0], [xm, WR, WZ1], 130, EDGE);
    seg([x0, 0, WZ1], [x0, WY, WZ1], 60, EDGE);
    seg([x1, 0, WZ1], [x1, WY, WZ1], 60, EDGE);
    seg([x1, WY, WZ0], [x1, WY, WZ1], 110, EDGE);
    seg([x0, 0, WZ1], [x1, 0, WZ1], 50, EDGE);
  }

  // main hall + tower silhouette edges
  seg([-HX, RIDGE, 0], [HX, RIDGE, 0], 260, EDGE);
  seg([-HX, HY, HZ], [HX, HY, HZ], 230, EDGE);
  seg([-HX, 0, HZ], [HX, 0, HZ], 170, EDGE);
  for (const sx of [-1, 1]) {
    seg([sx * HX, HY, HZ], [sx * HX, RIDGE, 0], 48, EDGE);
    seg([sx * TX, 0, TZ1], [sx * TX, TY, TZ1], 150, EDGE);
  }
  seg(c3, c2, 46, EDGE); seg(c2, c1, 46, EDGE); seg(c0, c3, 46, EDGE);
  for (const c of [c0, c1, c2, c3]) seg(c, apex, 92, EDGE);

  // lawn
  for (let i = 0, N = count(3200); i < N; i++) {
    const r = 13.5 * Math.pow(rnd(), 0.62), t = rnd() * Math.PI * 2;
    const x = Math.cos(t) * r, z = 4 + Math.sin(t) * r * 0.85;
    if (Math.abs(x) < WX1 + 0.1 && z > WZ0 - 0.1 && z < HZ + 0.1) continue;
    if (Math.abs(x) > WX0 - 0.1 && Math.abs(x) < WX1 + 0.1 && z < WZ1 + 0.1 && z > WZ0) continue;
    push(x, rr(-0.03, 0.03), z, GROUND);
  }
  // walkways: one from the chapel door, one across the lawn
  for (let i = 0, N = count(620); i < N; i++) {
    const t = rnd(), z = TZ1 + t * 11;
    push(Math.sin(t * Math.PI * 1.1) * 1.3 * t + rr(-0.42, 0.42), 0.02, z, WALK);
  }
  for (let i = 0, N = count(520); i < N; i++) {
    const x = rr(-12.5, 12.5);
    push(x, 0.02, 7.4 + Math.sin(x * 0.28) * 0.6 + rr(-0.38, 0.38), WALK);
  }

  // trees
  for (const [tx, tz] of [[-3.7, 6.1], [3.9, 6.5], [-8.6, 6.1], [8.8, 6.3], [-6.3, 9.9], [6.5, 10.3], [-11.2, 2.6], [11.4, 3]]) {
    const R = rr(1, 1.35), cy = rr(2.3, 2.9);
    seg([tx, 0, tz], [tx, cy - R * 0.55, tz], 34, TREE);
    for (let i = 0, N = count(300); i < N; i++) {
      const u = rr(-1, 1), th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = R * (0.72 + 0.28 * rnd());
      push(tx + Math.cos(th) * s * r, cy + u * r * 0.85, tz + Math.sin(th) * s * r, TREE);
    }
  }

  // floating dust for depth
  for (let i = 0, N = count(650); i < N; i++) push(rr(-17, 17), rr(0.2, 14), rr(-8, 14), DUST);

  /* ---------------------------------------------------- vertex buffer */
  const C1 = [0.133, 0.827, 0.933];                 // #22d3ee
  const C2 = [0.655, 0.545, 0.98];                  // #a78bfa
  const TEAL = [0.176, 0.831, 0.749];               // #2dd4bf
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const N = pts.length / 4;
  const STRIDE = 11;                                // target3 start3 color3 meta2
  const data = new Float32Array(N * STRIDE);
  for (let i = 0; i < N; i++) {
    const x = pts[i * 4], y = pts[i * 4 + 1], z = pts[i * 4 + 2], k = pts[i * 4 + 3];
    const h = Math.min(1, Math.max(0, y / 10.8));
    let col, size, lum;
    switch (k) {
      case EDGE:   col = mix(mix(C1, C2, h), [1, 1, 1], 0.18); lum = rr(0.95, 1.2); size = rr(0.07, 0.1); break;
      case GROUND: col = C1; lum = rr(0.17, 0.36); size = rr(0.08, 0.15); break;
      case WALK:   col = mix(C1, [0.85, 0.95, 1], 0.3); lum = rr(0.3, 0.5); size = rr(0.08, 0.12); break;
      case TREE:   col = mix(TEAL, C1, rnd() * 0.5); lum = rr(0.32, 0.62); size = rr(0.12, 0.2); break;
      case DUST:   col = mix(C1, C2, rnd()); lum = rr(0.2, 0.45); size = rr(0.05, 0.1); break;
      default:     col = mix(C1, C2, Math.pow(h, 0.85)); lum = rr(0.62, 0.98); size = rr(0.1, 0.15);
    }
    let sx = x, sy = y, sz = z;                     // start: a loose cloud around the hall
    if (k !== DUST) {
      const u = rr(-1, 1), th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = rr(2.5, 7.5);
      sx = x + Math.cos(th) * s * d;
      sy = y * 0.35 + 3.2 + u * d * 0.6;
      sz = z + Math.sin(th) * s * d;
    }
    const o = i * STRIDE;
    data[o] = x; data[o + 1] = y; data[o + 2] = z;
    data[o + 3] = sx; data[o + 4] = sy; data[o + 5] = sz;
    data[o + 6] = col[0] * lum; data[o + 7] = col[1] * lum; data[o + 8] = col[2] * lum;
    data[o + 9] = size; data[o + 10] = rnd();
  }

  /* ---------------------------------------------------------- shaders */
  const VS = `
    attribute vec3 aTarget;
    attribute vec3 aStart;
    attribute vec3 aColor;
    attribute vec2 aMeta;
    uniform mat4 uMV;
    uniform mat4 uP;
    uniform float uScan;
    uniform float uTime;
    uniform float uSizeK;
    uniform float uCloud;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float p = clamp((uScan - aTarget.y) / 1.8, 0.0, 1.0);
      float e = 1.0 - pow(1.0 - p, 3.0);
      float ph = aMeta.y * 6.2831853;
      vec3 drift = vec3(sin(uTime * 0.53 + ph), cos(uTime * 0.41 + ph * 1.7), sin(uTime * 0.47 + ph * 2.3));
      vec3 pos = mix(aStart + drift * 0.45, aTarget + drift * 0.012, e);
      vec4 mv = uMV * vec4(pos, 1.0);
      gl_Position = uP * mv;
      float arriving = step(0.0001, p) * (1.0 - smoothstep(0.0, 0.7, p));
      float twinkle = 0.88 + 0.12 * sin(uTime * 1.6 + ph * 5.0);
      vColor = aColor * twinkle + arriving * vec3(0.45, 0.8, 1.0);
      vAlpha = mix(uCloud, 1.0, e) + arriving * 0.5;
      gl_PointSize = clamp(aMeta.x * uSizeK / -mv.z * (1.0 + arriving * 1.2), 1.0, 64.0);
    }`;
  const FS = `
    precision mediump float;
    uniform float uGain;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float r2 = dot(c, c) * 4.0;
      if (r2 > 1.0) discard;
      float a = exp(-r2 * 4.5) * vAlpha * uGain;
      gl_FragColor = vec4(vColor * a, a);
    }`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  } catch (err) {
    console.warn('[LAZT] hero disabled:', err);
    canvas.remove();
    return;
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const attrib = (name, size, offset) => {
    const loc = gl.getAttribLocation(prog, name);
    if (loc < 0) return;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, offset * 4);
  };
  attrib('aTarget', 3, 0);
  attrib('aStart', 3, 3);
  attrib('aColor', 3, 6);
  attrib('aMeta', 2, 9);

  const U = {};
  for (const name of ['uMV', 'uP', 'uScan', 'uTime', 'uSizeK', 'uCloud', 'uGain']) U[name] = gl.getUniformLocation(prog, name);

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);                     // additive glow
  gl.clearColor(0, 0, 0, 0);
  gl.uniform1f(U.uGain, 0.72);

  /* --------------------------------------------------------- matrices */
  const proj = new Float32Array(16), view = new Float32Array(16);
  function perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f;
    out[10] = (far + near) * nf; out[11] = -1;
    out[14] = 2 * far * near * nf;
  }
  function lookAt(out, eye, target) {
    let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
    let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = zz, xy = 0, xz = -zx;                  // up = +y
    l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
  }

  /* ----------------------------------------------------------- layout */
  const FOV = 30 * Math.PI / 180, TAN = Math.tan(FOV / 2);
  const TARGET = [0, 4.3, 2.6];
  const SCENE_W = 19, SCENE_H = 11.8;               // footprint incl. trees, height incl. cross
  let dist = 40, w = 1, h = 1;

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, compact ? 2 : 1.75);
    w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);

    const aspect = w / h, wide = aspect >= 1.05;
    const fracW = wide ? 0.46 : 0.84, fracH = wide ? 0.8 : 0.4;
    dist = Math.max((SCENE_W / 2 / fracW) / (TAN * aspect), (SCENE_H / 2 / fracH) / TAN);
    perspective(proj, FOV, aspect, 0.5, 400);
    proj[8] = -(wide ? 0.48 : 0);                   // view offset: push the hall right on wide screens,
    proj[9] = -(wide ? -0.04 : 0.56);               // and up (above the copy) on tall ones
    gl.uniformMatrix4fv(U.uP, false, proj);
    gl.uniform1f(U.uSizeK, h / (2 * TAN));
  }

  /* ------------------------------------------------------------- draw */
  const eye = [0, 0, 0];
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  const SCAN_DELAY = 0.35, SCAN_TIME = 4.2, SCAN_FROM = -1.2, SCAN_TO = APEX + 2.6;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function draw(t) {
    const k = Math.min(1, Math.max(0, (t - SCAN_DELAY) / SCAN_TIME));
    const yaw = -0.45 + 0.15 * Math.sin(t * 0.09) + mx * 0.14;
    const pitch = 0.2 + 0.035 * Math.sin(t * 0.07) - my * 0.05;
    eye[0] = TARGET[0] + dist * Math.sin(yaw) * Math.cos(pitch);
    eye[1] = TARGET[1] + dist * Math.sin(pitch);
    eye[2] = TARGET[2] + dist * Math.cos(yaw) * Math.cos(pitch);
    lookAt(view, eye, TARGET);
    gl.uniformMatrix4fv(U.uMV, false, view);
    gl.uniform1f(U.uScan, SCAN_FROM + (SCAN_TO - SCAN_FROM) * ease(k));
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uCloud, 0.11 * Math.min(1, t / 0.5));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, N);
  }

  /* ------------------------------------------------------------- loop */
  let clock = 0, last = 0, raf = 0, running = false, onScreen = true, frameNo = 0, frozen = false;

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    mx += (tmx - mx) * 0.04;
    my += (tmy - my) * 0.04;
    // phones: once assembled, 30 fps is plenty for a slow drift
    if (!(compact && clock > SCAN_DELAY + SCAN_TIME && (frameNo++ & 1))) draw(clock);
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    const go = onScreen && !document.hidden && !reduceMotion && !frozen;
    if (go && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!go && running) { running = false; cancelAnimationFrame(raf); }
  }

  layout();
  if (reduceMotion) draw(60);

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { layout(); if (!running) draw(reduceMotion ? 60 : clock); }).observe(canvas);
  } else {
    addEventListener('resize', () => { layout(); if (!running) draw(reduceMotion ? 60 : clock); });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(canvas);
  }
  document.addEventListener('visibilitychange', sync);
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', e => {
      tmx = (e.clientX / innerWidth) * 2 - 1;
      tmy = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; cancelAnimationFrame(raf); canvas.remove(); });

  // ?debug exposes a manual render hook (for checking frames without animation)
  if (DEBUG) window.LAZT_HERO = { render: t => { frozen = true; sync(); layout(); draw(t); }, points: N };

  sync();
})();
