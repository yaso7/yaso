/* =====================================================================
   INK FIELD SHADER: raw WebGL, domain-warped noise, no libraries.
   Loaded before script.js. script.js calls inkInit(gl, U) once, then
   drives the uniforms every frame.
   ===================================================================== */
const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const FS = `precision highp float;
  uniform float uTime, uVel, uScroll, uMode; uniform vec2 uRes, uMouse; uniform vec3 uA, uB, uC, uRip;
  float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
    return mix(mix(h(i), h(i + vec2(1., 0.)), u.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0., a = .5; mat2 r = mat2(.8, -.6, .6, .8);
    for (int i = 0; i < 5; i++) { v += a * n(p); p = r * p * 2.02; a *= .5; } return v; }
  // Theme patterns (uMode 1..5). Each returns 0..1: how much accent colour this pixel gets.
  float pat(vec2 p, float t){
    if (uMode < 1.5) {                                   // 1 brooklyn: checkerboard
      vec2 g = p * 3.2 + vec2(0., t * 2.);
      return smoothstep(-.04, .04, sin(g.x * 3.14159) * sin(g.y * 3.14159));
    }
    if (uMode < 2.5) {                                   // 2 seoul: warped zebra stripes
      float v = p.x * 2.4 + 1.6 * fbm(p * 1.1 + vec2(0., t)) + .5 * sin(p.y * 2.2 + t * 3.);
      return smoothstep(-.2, .2, sin(v * 12.));
    }
    if (uMode < 3.5) {                                   // 3 moscow: dry-brush strokes
      vec2 q = mat2(.5, .866, -.866, .5) * p;
      float a = n(vec2(q.x * 42., q.y * 2.2 + t)), b = fbm(vec2(q.x * 7., q.y * .9) + 3.);
      return smoothstep(.44, .58, a * .55 + b * .75);
    }
    if (uMode < 4.5) {                                   // 4 milan: overlapping line-drawn fans
      vec2 g = p * 2.6 + vec2(0., t * 1.5);
      float row = floor(g.y * 2.), R = .56;
      vec2 q = vec2(fract(g.x + .5 * mod(row, 2.)) - .5, fract(g.y * 2.) * .5);
      float r = length(q), ang = atan(q.x, q.y);
      if (r > R) {                                       // outside this fan: use the one from the row below
        vec2 q2 = vec2(fract(g.x + .5 * mod(row + 1., 2.)) - .5, q.y + .5);
        r = length(q2); ang = atan(q2.x, q2.y);
      }
      float rim = smoothstep(.03, .012, abs(r - R));
      float veins = smoothstep(.82, .97, cos(ang * 26.)) * smoothstep(.1, .2, r) * step(r, R);
      return max(rim, veins);
    }
    vec2 g = p * 4.2 + vec2(0., t * 2.);                 // 5 osaka: broken squiggles (truchet arcs)
    vec2 id = floor(g), f = fract(g);
    if (h(id) > .5) f.x = 1. - f.x;
    float d = min(abs(length(f) - .5), abs(length(f - 1.) - .5));
    return smoothstep(.11, .07, d) * step(.22, h(id + 7.3));
  }
  void main(){
    vec2 uv = gl_FragCoord.xy / uRes; vec2 asp = vec2(uRes.x / uRes.y, 1.);
    vec2 p = (uv - .5) * asp * 2.2; vec2 m = uMouse * asp * 1.1;
    if (uRip.z < 3.) {
      vec2 dv = p - uRip.xy * asp * 1.1; float d0 = length(dv);
      p += normalize(dv + 1e-5) * sin(d0 * 24. - uRip.z * 9.) * exp(-uRip.z * 1.6) * exp(-d0 * 2.2) * .06;
    }
    float d = length(p - m);
    p += (p - m) * smoothstep(.9, 0., d) * .25 * (1. + uVel);
    p.y += uScroll * .6;
    float t = uTime * .04;
    vec3 col;
    if (uMode < .5) {                                    // 0: the original ink field (default theme)
      vec2 q = vec2(fbm(p + t), fbm(p - t + 4.1));
      float f = fbm(p + 2.2 * q);
      float bands = smoothstep(.0, .02, abs(fract(f * 9.) - .5) - .47);
      col = mix(uA, uB, f);
      col = mix(col, uC, (1. - bands) * .2 * smoothstep(1.2, 0., d));
    } else {                                             // themes: dark field + accent pattern, brighter near the pointer
      col = mix(uA, uB, .25 + .35 * n(p * 1.4 + t));
      col = mix(col, uC, pat(p, t) * (.11 + .2 * smoothstep(1.2, 0., d)));
    }
    col += (h(gl_FragCoord.xy + uTime) - .5) * .03;
    gl_FragColor = vec4(col, 1.);
  }`;
function inkInit(gl, U) {
  if (!gl) return false;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return false;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  ['uTime', 'uVel', 'uScroll', 'uMode', 'uRes', 'uMouse', 'uA', 'uB', 'uC', 'uRip'].forEach(k => U[k] = gl.getUniformLocation(pr, k));
  gl.uniform1f(U.uMode, 0.);   // 0 = ink (default); script.js switches it when a theme is picked
  gl.uniform3f(U.uA, .047, .051, .059);
  gl.uniform3f(U.uB, .115, .125, .155);
  gl.uniform3f(U.uC, 1., .416, .239);
  return true;
}
