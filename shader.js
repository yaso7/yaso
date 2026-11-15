/* =====================================================================
   BACKGROUND SHADER: raw WebGL, no libraries.
   Loaded before script.js. script.js calls inkInit(gl, U) once, then
   drives the uniforms every frame.

   uMode picks the design (THEMES in data.js):
     0 ink       the original domain-warped ink field (pointer bulge, click ripple)
     1 brooklyn  checker flag     waves; tiles flip like a split-flap board
     2 seoul     marbled stripes  crawl; the pointer is a whirlpool
     3 moscow    dry-brush paint  drags; the pointer is a wet brush
     4 milan     line-drawn fans  sway; they lean toward the pointer and open
     5 osaka     memphis squiggles re-roll; they wiggle near the pointer
   Every theme function gets the pixel P, the pointer M and the last click R
   (all in the same space) and returns vec2(how much accent colour, how lit up).
   ===================================================================== */
const VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const FS = `precision highp float;
  uniform float uTime, uVel, uScroll, uMode, uHas; uniform vec2 uRes, uMouse; uniform vec3 uA, uB, uC, uRip;
  float h(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
    return mix(mix(h(i), h(i + vec2(1., 0.)), u.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0., a = .5; mat2 r = mat2(.8, -.6, .6, .8);
    for (int i = 0; i < 5; i++) { v += a * n(p); p = r * p * 2.02; a *= .5; } return v; }
  mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  /* 1 BROOKLYN: red/black checker. Idle: the cloth waves and a few tiles flip at random.
     Hover: tiles near the pointer turn over (they narrow, then show the other colour).
     Click: a ring of turning tiles spreads from the point. */
  vec2 brooklyn(vec2 P, vec2 M, vec2 R, float ra, float px){
    float t = uTime, S = 5.;
    vec2 q = P + vec2(.035 * sin(P.y * 2.4 + t * .9), .03 * sin(P.x * 2. - t * .7));
    vec2 g = q * S, id = floor(g), f = fract(g) - .5, cc = (id + .5) / S;
    float bit = mod(id.x + id.y, 2.);
    float hv = smoothstep(.5, .28, length(cc - M)) * uHas;
    float rg = ra < 3. ? smoothstep(.2, 0., abs(length(cc - R) - ra * 1.1)) : 0.;
    float idle = smoothstep(.96, 1., sin(t * .7 + h(id) * 6.2832));
    float turn = clamp(max(max(hv, rg), idle), 0., 1.);
    float wd = abs(cos(turn * 3.14159)) * .5;
    float inside = wd > .499 ? 1. : smoothstep(wd + px * S, wd - px * S, abs(f.x));
    return vec2(inside * (turn < .5 ? bit : 1. - bit), max(hv, rg));
  }

  /* 2 SEOUL: orange with black marbled stripes. Idle: the stripes crawl and slowly morph.
     Hover: the pointer is a whirlpool that twists them. Click: a twist pulse travels outward. */
  vec2 seoul(vec2 P, vec2 M, vec2 R, float ra, float px){
    float t = uTime;
    vec2 dv = P - M; float hv = smoothstep(.7, 0., length(dv)) * uHas;
    vec2 q = M + rot(2.4 * hv * hv) * dv;
    float rg = ra < 3. ? smoothstep(.25, 0., abs(length(q - R) - ra * .9)) * exp(-ra * .9) : 0.;
    q += normalize(q - R + 1e-5) * rg * .12;
    float w = fbm(q * .9 + vec2(0., t * .03)), w2 = fbm(q * 1.7 - vec2(t * .02, 0.) + 5.2);
    float v = q.x * 1.2 + q.y * .5 + 2.6 * w + 1.1 * w2;
    return vec2(smoothstep(-.08, .08, sin(v * 13. - t * .6) + .12), max(hv * .8, rg));
  }

  /* 3 MOSCOW: solid purple with black dry-brush scratches. Idle: paint drags along the stroke
     and a slow re-coat sweeps across. Hover: the pointer is a wet brush that fills the scratches
     (longer when it moves fast). Click: one loaded stroke is drawn through the point. */
  vec2 moscow(vec2 P, vec2 M, vec2 R, float ra, float px){
    float t = uTime;
    vec2 al = vec2(.4472, .8944), ac = vec2(.8944, -.4472);            // along / across the stroke
    float a = dot(P, al), b = dot(P, ac);
    float fine = n(vec2(b * 95., a * 1.3 - t * .22)), clump = fbm(vec2(b * 11., a * .6 - t * .05) + 3.);
    float gap = smoothstep(.8, .9, fine * .62 + clump * .8);              // thin scratches; the field stays mostly paint
    vec2 dm = P - M;
    float wet = smoothstep(.55, .15, length(vec2(dot(dm, ac) * 2.8, dot(dm, al) * (.8 / (1. + uVel * 2.5))))) * uHas;
    float bristle = .75 + .25 * n(vec2(b * 170., a * 2.));
    vec2 dr = P - R; float sb = dot(dr, ac), sa = dot(dr, al);
    float edge = .1 * (.8 + .4 * n(vec2(sa * 3., 1.7)));
    float stroke = ra < 3. ? smoothstep(edge, edge * .6, abs(sb)) * smoothstep(ra * 3.2, ra * 3.2 - .3, abs(sa)) * exp(-ra * .7) : 0.;
    float sweep = smoothstep(.35, 0., abs(b - (fract(t * .07) * 6. - 3.)));
    float paint = mix(1. - gap, bristle, max(wet, stroke));
    paint = mix(paint, 1. - gap * .35, sweep * .8);
    return vec2(paint, max(max(wet, stroke), sweep * .35));
  }

  /* 4 MILAN: blue fans with dark veins and rims. Idle: each fan sways like a leaf.
     Hover: fans near the pointer lean toward it and open wider. Click: a gust shakes them. */
  vec3 fan(vec2 q, vec2 ctr, vec2 M, vec2 R, float ra, float seed){   // -> (colour, inside this fan?, lit)
    float t = uTime;
    float hv = smoothstep(.6, .15, length(ctr - M)) * uHas;
    float rg = ra < 3. ? smoothstep(.3, 0., abs(length(ctr - R) - ra * .9)) * exp(-ra * .8) : 0.;
    float sway = .14 * sin(t * 1.1 + ctr.x * 3.1 + ctr.y * 1.7 + seed * 2.) + .6 * rg * sin(t * 9.)
               + hv * .5 * clamp((M.x - ctr.x) * 3., -1., 1.);
    float r = length(q), ang = atan(q.x, q.y) + sway;
    float edge = .56 * (1. + .07 * hv) * (1. - .035 * (.5 + .5 * cos(ang * 14.)));   // scalloped rim
    float inside = step(r, edge);
    float veins = smoothstep(.034, .02, abs(sin(ang * 7.)) * r) * smoothstep(.05, .14, r);
    float rim = smoothstep(.06, .03, edge - r);
    return vec3(inside * (1. - max(veins, rim)), inside, max(hv, rg));
  }
  vec2 milan(vec2 P, vec2 M, vec2 R, float ra, float px){
    // Fans overlap like scales: rows sit H apart (less than a fan's radius) and a lower row is in front.
    float S = 2.4, H = .31; vec2 off = vec2(0., uTime * .02), g = P * S + off;
    float row = floor(g.y / H) - 1., xo = .5 * mod(row, 2.), cl = floor(g.x + xo);          // front: the row below
    vec3 a = fan(vec2(g.x + xo - cl - .5, g.y - row * H), (vec2(cl + .5 - xo, row * H) - off) / S, M, R, ra, h(vec2(cl, row)));
    if (a.y < .5) {                                                                         // behind it: this row
      row += 1.; xo = .5 * mod(row, 2.); cl = floor(g.x + xo);
      a = fan(vec2(g.x + xo - cl - .5, g.y - row * H), (vec2(cl + .5 - xo, row * H) - off) / S, M, R, ra, h(vec2(cl, row)));
    }
    return vec2(a.x, a.z);
  }

  /* 5 OSAKA: green memphis marks on black (arcs, zigzags, rings, waves). Idle: tiles re-roll
     into a new mark now and then and pop in. Hover: nearby tiles wiggle, thicken and re-roll
     fast. Click: a ring of re-rolls spreads from the point. */
  vec2 osaka(vec2 P, vec2 M, vec2 R, float ra, float px){
    float t = uTime, S = 4.2;
    vec2 g = P * S, id = floor(g), c = fract(g) - .5, cc = (id + .5) / S;
    float hv = smoothstep(.55, .2, length(cc - M)) * uHas;
    float rg = ra < 3. ? smoothstep(.25, 0., abs(length(cc - R) - ra)) : 0.;
    float r0 = h(id), fast = step(.5, hv);
    float clock = mix(t * .22 + r0 * 9., t * 4. + r0 * 4., fast);
    float epoch = floor(clock) + step(.3, rg) * floor(ra * 6.), ph = fract(clock);
    vec2 sd = id + epoch * vec2(17.3, 9.1);
    float ty = h(sd), rt = h(sd + 3.7);
    c = rot(sin(t * 7. + r0 * 20.) * .3 * hv) * c;
    if (rt > .5) c = vec2(c.y, -c.x);
    float d = 1.;
    if (ty < .42) { vec2 f = c + .5; d = min(abs(length(f) - .5), abs(length(f - 1.) - .5)); }
    else if (ty < .66) d = abs(c.y - (abs(fract(c.x * 2. + .25) - .5) * 2. - .5) * .28) * .85 + step(.4, abs(c.x));
    else if (ty < .8) d = abs(length(c) - .2);
    else if (ty < .92) d = abs(c.y - .13 * sin(c.x * 12.566)) * .8 + step(.42, abs(c.x));
    float wdt = (.065 + .03 * hv) * smoothstep(0., .18, ph);
    return vec2(smoothstep(wdt + px * S * 1.5, wdt, d) * step(.001, wdt), max(hv, rg));
  }

  vec3 theme(vec2 p, vec2 m, vec2 asp){
    vec2 sc = vec2(0., uScroll * .6);                                   // the pattern scrolls a little with the page
    vec2 P = p + sc, M = m + sc, R = uRip.xy * asp * 1.1 + sc;
    float ra = uRip.z, px = 2.2 / uRes.y;
    vec2 r;
    if (uMode < 1.5) r = brooklyn(P, M, R, ra, px);
    else if (uMode < 2.5) r = seoul(P, M, R, ra, px);
    else if (uMode < 3.5) r = moscow(P, M, R, ra, px);
    else if (uMode < 4.5) r = milan(P, M, R, ra, px);
    else r = osaka(P, M, R, ra, px);
    float spot = smoothstep(1., 0., length(p - m)) * uHas;
    float k = mix(mix(.32, .26, uHas), 1., clamp(max(r.y, spot * .45), 0., 1.));   // calm at rest, full colour where it reacts
    return mix(uA * .75, uC, r.x * k);
  }

  void main(){
    vec2 uv = gl_FragCoord.xy / uRes; vec2 asp = vec2(uRes.x / uRes.y, 1.);
    vec2 p = (uv - .5) * asp * 2.2; vec2 m = uMouse * asp * 1.1;
    vec3 col;
    if (uMode < .5) {                                    // 0: the original ink field (default theme)
      if (uRip.z < 3.) {
        vec2 dv = p - uRip.xy * asp * 1.1; float d0 = length(dv);
        p += normalize(dv + 1e-5) * sin(d0 * 24. - uRip.z * 9.) * exp(-uRip.z * 1.6) * exp(-d0 * 2.2) * .06;
      }
      float d = length(p - m);
      p += (p - m) * smoothstep(.9, 0., d) * .25 * (1. + uVel);
      p.y += uScroll * .6;
      float t = uTime * .04;
      vec2 q = vec2(fbm(p + t), fbm(p - t + 4.1));
      float f = fbm(p + 2.2 * q);
      float bands = smoothstep(.0, .02, abs(fract(f * 9.) - .5) - .47);
      col = mix(uA, uB, f);
      col = mix(col, uC, (1. - bands) * .2 * smoothstep(1.2, 0., d));
    } else col = theme(p, m, asp);
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
  ['uTime', 'uVel', 'uScroll', 'uMode', 'uHas', 'uRes', 'uMouse', 'uA', 'uB', 'uC', 'uRip'].forEach(k => U[k] = gl.getUniformLocation(pr, k));
  gl.uniform1f(U.uMode, 0.);   // 0 = ink (default); script.js switches it when a theme is picked
  gl.uniform3f(U.uA, .047, .051, .059);
  gl.uniform3f(U.uB, .115, .125, .155);
  gl.uniform3f(U.uC, 1., .416, .239);
  return true;
}
