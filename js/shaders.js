/* GLSL kaynakları. Işın izleyicideki jeodezik türevi js/physics.js ile birebir aynıdır. */
(function (root) {
  'use strict';

  const VERT = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const NOISE = `
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * .1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
// 3B gradyan gürültüsü, y ekseninde 'per' periyotlu (açısal koordinat için dikişsiz)
float gnoiseP(vec3 p, float per) {
  vec3 i = floor(p);
  vec3 f = p - i;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float y0 = mod(i.y, per);
  float y1 = mod(i.y + 1.0, per);
  float n000 = dot(hash33(vec3(i.x,       y0, i.z      )) * 2.0 - 1.0, f);
  float n100 = dot(hash33(vec3(i.x + 1.0, y0, i.z      )) * 2.0 - 1.0, f - vec3(1, 0, 0));
  float n010 = dot(hash33(vec3(i.x,       y1, i.z      )) * 2.0 - 1.0, f - vec3(0, 1, 0));
  float n110 = dot(hash33(vec3(i.x + 1.0, y1, i.z      )) * 2.0 - 1.0, f - vec3(1, 1, 0));
  float n001 = dot(hash33(vec3(i.x,       y0, i.z + 1.0)) * 2.0 - 1.0, f - vec3(0, 0, 1));
  float n101 = dot(hash33(vec3(i.x + 1.0, y0, i.z + 1.0)) * 2.0 - 1.0, f - vec3(1, 0, 1));
  float n011 = dot(hash33(vec3(i.x,       y1, i.z + 1.0)) * 2.0 - 1.0, f - vec3(0, 1, 1));
  float n111 = dot(hash33(vec3(i.x + 1.0, y1, i.z + 1.0)) * 2.0 - 1.0, f - vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
             mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float gnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(hash33(i) * 2.0 - 1.0, f);
  float n100 = dot(hash33(i + vec3(1, 0, 0)) * 2.0 - 1.0, f - vec3(1, 0, 0));
  float n010 = dot(hash33(i + vec3(0, 1, 0)) * 2.0 - 1.0, f - vec3(0, 1, 0));
  float n110 = dot(hash33(i + vec3(1, 1, 0)) * 2.0 - 1.0, f - vec3(1, 1, 0));
  float n001 = dot(hash33(i + vec3(0, 0, 1)) * 2.0 - 1.0, f - vec3(0, 0, 1));
  float n101 = dot(hash33(i + vec3(1, 0, 1)) * 2.0 - 1.0, f - vec3(1, 0, 1));
  float n011 = dot(hash33(i + vec3(0, 1, 1)) * 2.0 - 1.0, f - vec3(0, 1, 1));
  float n111 = dot(hash33(i + vec3(1, 1, 1)) * 2.0 - 1.0, f - vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
             mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
`;

  /* ---------------------------------------------------------------- */
  /* Gökyüzü küp haritası üreteci: Samanyolu bandı, toz şeritleri,     */
  /* bulutsular, uzak galaksiler. Parlak yıldızlar ışın izleyicide.    */
  /* ---------------------------------------------------------------- */
  const SKYGEN = `#version 300 es
precision highp float;
uniform int uFace;
uniform float uSize;
out vec4 outColor;
${NOISE}
float fbm(vec3 p, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 9; i++) {
    if (i >= oct) break;
    s += a * gnoise(p);
    p = p * 2.03 + vec3(17.1, -9.3, 5.7);
    a *= 0.5;
  }
  return s;
}
float ridged(vec3 p, int oct) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    float n = 1.0 - abs(gnoise(p) * 1.6);
    s += a * n * n;
    p = p * 2.07 + vec3(3.1, 11.7, -4.3);
    a *= 0.5;
  }
  return s;
}
vec3 galaxy(vec3 d, vec3 c, vec3 ax, float size, float ell, vec3 tint, float br) {
  vec3 ay = normalize(cross(c, ax));
  vec3 axx = normalize(cross(ay, c));
  vec2 p = vec2(dot(d, axx), dot(d, ay)) / size;
  float cosd = dot(d, c);
  if (cosd < 0.9) return vec3(0.0);
  p.y /= ell;
  float rr = length(p);
  float ang = atan(p.y, p.x);
  float arms = 0.55 + 0.45 * sin(2.0 * ang - 6.0 * log(rr + 0.05));
  float disk = exp(-rr * 3.2) * mix(1.0, arms, smoothstep(0.05, 0.4, rr));
  float core = exp(-rr * rr * 60.0) * 2.5;
  return (disk + core) * tint * br;
}
vec3 skyGen(vec3 d) {
  vec3 N = normalize(vec3(-0.32, 0.46, 0.83));
  vec3 C = normalize(cross(N, vec3(0.2, 1.0, 0.1)));
  vec3 E = cross(N, C);
  float b = asin(clamp(dot(d, N), -1.0, 1.0));
  float l = atan(dot(d, E), dot(d, C));

  // bant merkez çizgisini hafifçe büküp düzensizleştir
  float bw = b + 0.07 * fbm(d * 1.6 + 4.0, 4);
  float thin = exp(-bw * bw / (2.0 * 0.06 * 0.06));
  float thick = exp(-bw * bw / (2.0 * 0.17 * 0.17));
  float bulge = exp(-(l * l) / (2.0 * 0.30 * 0.30) - (b * b) / (2.0 * 0.14 * 0.14));
  float towardCore = 0.55 + 0.45 * cos(l);

  // çok ölçekli yıldız bulutları
  float c1 = fbm(d * 5.5 + 1.3, 7);
  float c2 = fbm(d * 17.0 + 7.1, 5);
  float cloud = clamp(0.55 + 1.5 * c1 + 0.55 * c2, 0.0, 2.2);
  cloud *= cloud;
  float lum = (thin * 1.0 + thick * 0.28) * cloud * towardCore + bulge * 2.2 * (0.55 + 0.5 * cloud);

  // toz: merkezde "büyük yarık" ve lifli şeritler
  float dn = fbm(d * 4.2 + 3.1, 6);
  float df = ridged(d * 11.0 + 1.7, 6);
  float lane = exp(-(bw + 0.012) * (bw + 0.012) / (2.0 * 0.028 * 0.028));
  float dust = lane * clamp(0.55 + 1.4 * dn, 0.0, 1.0);
  dust += thick * smoothstep(0.55, 0.95, df * 0.85 + dn * 0.7) * 0.85;
  dust = clamp(dust, 0.0, 1.0);

  vec3 cool = vec3(0.70, 0.80, 1.00);
  vec3 warm = vec3(1.00, 0.80, 0.56);
  vec3 col = mix(cool, warm, clamp(bulge * 1.4 + thin * 0.3 * towardCore, 0.0, 1.0)) * lum;
  col *= 1.0 - 0.94 * dust;
  col *= mix(vec3(1.0), vec3(1.0, 0.72, 0.5), clamp(dust * 1.6, 0.0, 1.0) * 0.55);

  // H II bölgeleri: düzleme yakın küçük pembe düğümler
  float h = fbm(d * 8.0 + 11.0, 6);
  float hii = pow(max(h - 0.2, 0.0) * 3.4, 3.0) * thick;
  col += vec3(1.0, 0.24, 0.36) * hii * 0.9 * (1.0 - 0.6 * dust);
  // geniş, sönük bulutsular
  float n2 = fbm(d * 2.2 - 5.2, 6);
  float n3 = fbm(d * 2.8 + 2.0, 6);
  col += vec3(0.22, 0.52, 0.95) * pow(max(n2 - 0.16, 0.0) * 2.6, 2.4) * 0.10;
  col += vec3(0.95, 0.30, 0.42) * pow(max(n3 - 0.16, 0.0) * 2.6, 2.4) * 0.08;

  // uzak galaksiler
  col += galaxy(d, normalize(vec3(-0.93, -0.28, 0.12)), vec3(0.3, 0.2, 1.0), 0.030, 0.38, vec3(1.0, 0.86, 0.72), 0.9);
  col += galaxy(d, normalize(vec3(0.35, 0.88, -0.30)), vec3(1.0, 0.1, 0.4), 0.018, 0.62, vec3(0.80, 0.86, 1.0), 0.7);
  col += galaxy(d, normalize(vec3(0.62, -0.55, 0.56)), vec3(0.1, 1.0, 0.3), 0.012, 0.25, vec3(1.0, 0.92, 0.85), 0.8);

  col += vec3(0.0012, 0.0015, 0.0024);
  return col * 0.075;
}
void main() {
  vec2 st = gl_FragCoord.xy / uSize * 2.0 - 1.0;
  float sc = st.x, tc = st.y;
  vec3 d;
  if (uFace == 0) d = vec3(1.0, -tc, -sc);
  else if (uFace == 1) d = vec3(-1.0, -tc, sc);
  else if (uFace == 2) d = vec3(sc, 1.0, tc);
  else if (uFace == 3) d = vec3(sc, -1.0, -tc);
  else if (uFace == 4) d = vec3(sc, -tc, 1.0);
  else d = vec3(-sc, -tc, -1.0);
  outColor = vec4(skyGen(normalize(d)), 1.0);
}`;

  /* ---------------------------------------------------------------- */
  /* Kerr jeodezik ışın izleyici                                        */
  /* ---------------------------------------------------------------- */
  const TRACE = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp samplerCube;
in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform vec2 uCenter;
uniform vec2 uJitter;
uniform float uTanHalfFov;
uniform vec4 uQ0, uQ1, uQ2, uQ3;
uniform vec3 uCamPos;
uniform float uA;
uniform float uRh;
uniform int uInside;
uniform int uMaxSteps;
uniform float uStepK;
uniform float uResc;
uniform float uTime;

uniform float uDiskOn;
uniform float uRin, uRout, uRprofMax;
uniform float uTmax;
uniform float uBeaming;
uniform float uDiskDensity;
uniform float uDiskBright;
uniform float uTurb;
uniform float uFlowT;
uniform float uHaze;
uniform float uHazeH;
uniform float uLumNorm;
uniform float uInterstellar;

uniform sampler2D uBB;
uniform float uBBN, uBBlogMin, uBBlogRange;
uniform sampler2D uProf;
uniform float uProfN;
uniform samplerCube uSky;
uniform float uSkyBright, uStarBright, uStarsOn, uGrid, uPixAng;

uniform float uJetOn;
uniform float uJetBright;

${NOISE}

const float PI = 3.14159265358979;

/* --- Kerr-Schild Hamilton türevleri (geçmişe yönelik q, q_t = +1) --- */
void deriv(vec3 x, vec3 q, out vec3 dx, out vec3 dq, out float dt, out float r) {
  float a = uA, a2 = a * a;
  float z2 = x.z * x.z;
  float w = dot(x, x) - a2;
  float r2 = 0.5 * (w + sqrt(w * w + 4.0 * a2 * z2));
  r = sqrt(r2);
  float ir = 1.0 / r;
  float r3 = r2 * r;
  float iDn = 1.0 / (r2 * r2 + a2 * z2);
  float A = r2 + a2;
  float iA = 1.0 / A;
  vec3 gr = vec3(x.x * r3, x.y * r3, x.z * r * A) * iDn;
  vec3 k = vec3((r * x.x + a * x.y) * iA, (r * x.y - a * x.x) * iA, x.z * ir);
  float f = 2.0 * r3 * iDn;
  float m = 3.0 * a2 * z2 - r2 * r2;
  vec3 gf = (2.0 * r2 * iDn * iDn) * (m * gr - vec3(0.0, 0.0, 2.0 * a2 * r * x.z));
  float S = dot(k, q) - 1.0;
  float c = (x.x * q.x + x.y * q.y - 2.0 * r * (k.x * q.x + k.y * q.y)) * iA - x.z * q.z * ir * ir;
  vec3 gk = c * gr + vec3((r * q.x - a * q.y) * iA, (a * q.x + r * q.y) * iA, q.z * ir);
  float fS = f * S;
  dx = q - fS * k;
  dq = 0.5 * S * S * gf + fS * gk;
  dt = -1.0 + fS;
}

void rk4(inout vec3 x, inout vec3 q, inout float t, vec3 k1x, vec3 k1q, float k1t, float h) {
  vec3 k2x, k2q, k3x, k3q, k4x, k4q; float k2t, k3t, k4t, rr;
  deriv(x + 0.5 * h * k1x, q + 0.5 * h * k1q, k2x, k2q, k2t, rr);
  deriv(x + 0.5 * h * k2x, q + 0.5 * h * k2q, k3x, k3q, k3t, rr);
  deriv(x + h * k3x, q + h * k3q, k4x, k4q, k4t, rr);
  x += h / 6.0 * (k1x + 2.0 * (k2x + k3x) + k4x);
  q += h / 6.0 * (k1q + 2.0 * (k2q + k3q) + k4q);
  t += h / 6.0 * (k1t + 2.0 * (k2t + k3t) + k4t);
}

float kerrR(vec3 x) {
  float a2 = uA * uA;
  float w = dot(x, x) - a2;
  return sqrt(0.5 * (w + sqrt(w * w + 4.0 * a2 * x.z * x.z)));
}

/* --- Kara cisim: mutlak parlaklık dahil doğrusal sRGB --- */
vec3 blackbody(float T) {
  float u = (log(max(T, 1.0)) - uBBlogMin) / uBBlogRange;
  if (u <= 0.0) return vec3(0.0);
  u = clamp(u, 0.0, 1.0);
  vec4 v = texture(uBB, vec2(u * (uBBN - 1.0) / uBBN + 0.5 / uBBN, 0.5));
  return v.rgb * exp2(v.a);
}
vec3 bbChroma(float T) {
  float u = clamp((log(max(T, 1.0)) - uBBlogMin) / uBBlogRange, 0.0, 1.0);
  return texture(uBB, vec2(u * (uBBN - 1.0) / uBBN + 0.5 / uBBN, 0.5)).rgb;
}
float bbLum(float T) {
  float u = (log(max(T, 1.0)) - uBBlogMin) / uBBlogRange;
  if (u <= 0.0) return 0.0;
  u = clamp(u, 0.0, 1.0);
  return exp2(texture(uBB, vec2(u * (uBBN - 1.0) / uBBN + 0.5 / uBBN, 0.5)).a);
}

uniform float uBolo;
// Gözlenen ışınım: bolometrik (I ∝ T_gözlenen⁴, g⁴ yasası) ya da görünür bant Planck parlaklığı
vec3 emission(float Tobs) {
  if (uBolo > 0.5) {
    float x = Tobs / uTmax;
    x *= x;
    return bbChroma(Tobs) * (x * x);
  }
  return blackbody(Tobs) * uLumNorm;
}

float diskProfile(float r) {
  float u = log(r / uRin) / log(uRprofMax / uRin);
  u = clamp(u, 0.0, 1.0);
  return texture(uProf, vec2(u * (uProfN - 1.0) / uProfN + 0.5 / uProfN, 0.5)).r;
}

/* --- Disk dokusu: diferansiyel dönen, kayan türbülans --- */
float fbmP(vec3 p, float per, int oct) {
  float s = 0.0, amp = 0.5;
  for (int o = 0; o < 6; o++) {
    if (o >= oct) break;
    s += amp * gnoiseP(p, per);
    p = vec3(p.x * 2.0 + 7.31, p.y * 2.0, p.z * 2.0 + 3.17);
    per *= 2.0;
    amp *= 0.5;
  }
  return s;
}
float diskPattern(float lr, float ang, float te, float seed) {
  // ang: devir cinsinden [0,1). Kümeli yapı + alan bükme; diferansiyel dönme bunları yaylara çeker.
  float warp = fbmP(vec3(lr * 3.0 + seed, ang * 4.0, te * 0.008 + seed), 4.0, 3);
  float u = lr * 7.5 + warp * 2.2;
  float n1 = fbmP(vec3(u, ang * 11.0, te * 0.012 + seed * 0.37), 11.0, 5);
  float n2 = fbmP(vec3(lr * 19.0 + warp * 4.0 - seed, ang * 41.0, te * 0.02 - seed), 41.0, 3);
  float n3 = gnoiseP(vec3(lr * 46.0 + warp * 6.0, ang * 3.0, seed), 3.0);
  float clouds = clamp(0.62 + 1.35 * n1, 0.0, 1.8);
  float clumps = clamp(0.75 + 0.9 * n2, 0.15, 1.5);
  float fine = 0.85 + 0.3 * n3;
  return min(clouds * clouds * clumps * fine * 3.2, 4.0);
}
float diskDensity(float r, float phi, float te, float Om) {
  float lr = log(r);
  float c = te / uFlowT;
  float fc = floor(c);
  float fc2 = floor(c + 0.5);
  float p1 = c - fc;
  float p2 = c + 0.5 - fc2;
  float w1 = 1.0 - abs(2.0 * p1 - 1.0);
  float w2 = 1.0 - w1;
  float s1 = hash13(vec3(fc, 1.7, 3.1)) * 97.0;
  float s2 = hash13(vec3(fc2, 5.3, 0.7)) * 97.0;
  float a1 = fract((phi - Om * p1 * uFlowT) / (2.0 * PI));
  float a2 = fract((phi - Om * p2 * uFlowT) / (2.0 * PI));
  float d1 = diskPattern(lr, a1, te, s1);
  float d2 = diskPattern(lr, a2, te, s2);
  float m = 1.0;
  float d = m + (w1 * (d1 - m) + w2 * (d2 - m)) / sqrt(w1 * w1 + w2 * w2);
  return max(mix(1.0, d, uTurb), 0.0);
}

/* Disk emisyonu: kırmızıya kayma, Doppler ışıması, kara cisim rengi */
float redshiftFactor(vec3 xh, vec3 qh, float r, float sCam, out float Om) {
  float sr = sqrt(r), r15 = r * sr;
  Om = 1.0 / (r15 + uA);
  float den = sqrt(r15) * sqrt(max(r15 - 3.0 * sr + 2.0 * uA, 1e-4));
  float ut = (r15 + uA) / den;
  float L = -(xh.x * qh.y - xh.y * qh.x);
  return sCam / (ut * (1.0 - Om * L));
}

vec4 shadeDisk(vec3 xh, vec3 qh, float te, float cosi, float sCam) {
  float a2 = uA * uA;
  float r = sqrt(max(dot(xh.xy, xh.xy) - a2, 1e-6));
  if (r < uRin * 0.995 || r > uRout) return vec4(0.0);
  float Om;
  float g = redshiftFactor(xh, qh, r, sCam, Om);
  float phi = atan(xh.y, xh.x);
  float pat = diskDensity(r, phi, te, Om);
  float env = smoothstep(uRin * 0.995, uRin * 1.05, r) * (1.0 - smoothstep(uRout * 0.55, uRout, r));
  float thick = mix(1.0, 2.2, uInterstellar);
  float radial = inversesqrt(r / uRin);
  float tau = uDiskDensity * env * radial * (0.22 + 0.78 * pat) * thick / max(cosi, 0.045);
  float alpha = 1.0 - exp(-tau);
  float Trel = diskProfile(r);
  float T = uTmax * Trel * (0.8 + 0.22 * clamp(pat, 0.0, 2.5)) ;
  float Tobs = T * pow(max(g, 1e-3), uBeaming);
  vec3 em = emission(Tobs) * uDiskBright;
  return vec4(em * alpha, alpha);
}

float erfA(float x) {
  float x2 = x * x;
  float ax = 0.147 * x2;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + ax) / (1.0 + ax)));
}

/* İnce diskin üstündeki sıcak, optik olarak ince korona/pus: segment boyunca analitik Gauss integrali */
vec3 hazeSegment(vec3 x0, vec3 x1, vec3 q, float sCam) {
  if (x0.z * x1.z > 0.0 && min(abs(x0.z), abs(x1.z)) > 4.4 * uHazeH * uRout) return vec3(0.0);
  vec3 xm = 0.5 * (x0 + x1);
  float a2 = uA * uA;
  float rm = sqrt(max(dot(xm.xy, xm.xy) - a2, 1e-6));
  if (rm < uRin * 0.9 || rm > uRout * 1.1) return vec3(0.0);
  float H = uHazeH * rm;
  float z0 = x0.z, z1 = x1.z;
  if (min(abs(z0), abs(z1)) > 4.0 * H && z0 * z1 > 0.0) return vec3(0.0);
  float Ls = length(x1 - x0);
  float dz = z1 - z0;
  float I;
  float s2 = 1.41421356 * H;
  if (abs(dz) < 1e-3 * H) I = Ls * exp(-xm.z * xm.z / (2.0 * H * H));
  else I = Ls / dz * H * 1.2533141 * (erfA(z1 / s2) - erfA(z0 / s2));
  I = abs(I);
  float Om;
  float g = redshiftFactor(xm, q, rm, sCam, Om);
  float env = smoothstep(uRin * 0.9, uRin * 1.25, rm) * (1.0 - smoothstep(uRout * 0.3, uRout * 1.1, rm));
  float T = uTmax * diskProfile(max(rm, uRin)) * 0.92;
  float Tobs = T * pow(max(g, 1e-3), uBeaming);
  return emission(Tobs) * uDiskBright * uHaze * env * I / rm;
}

/* Göreli jet (isteğe bağlı): dönme ekseni boyunca senkrotron benzeri ışıma.
   Doğru parçası boyunca eksene olan uzaklığın Gauss kesitli integrali analitik alınır
   (uzun adımlarda bile jet kaçırılmaz). Doppler güçlendirmesi D^(2+α), α = 0,6. */
float gaussSeg(float rho2, float bl, float sStar, float w) {
  float k = bl / (1.41421356 * w);
  float I = exp(-rho2 / (2.0 * w * w));
  if (k < 1e-3) return I;
  return I * 1.2533141 * w / bl * (erfA((1.0 - sStar) * k) - erfA(-sStar * k));
}
vec3 jetSegment(vec3 x0, vec3 x1, float sCam, vec3 dir) {
  vec2 a = x0.xy, b = x1.xy - x0.xy;
  float bb = dot(b, b);
  float sStar = bb > 1e-12 ? clamp(-dot(a, b) / bb, 0.0, 1.0) : 0.5;
  vec3 pc = mix(x0, x1, sStar);
  float h = abs(pc.z);
  if (h < 1.2 || h > 140.0) return vec3(0.0);
  float width = 0.45 + 0.3 * pow(h, 0.75);
  float rho2 = dot(pc.xy, pc.xy);
  if (rho2 > 16.0 * width * width) return vec3(0.0);
  float L = length(x1 - x0);
  float bl = sqrt(bb);
  float core = gaussSeg(rho2, bl, sStar, width * 0.35);
  float sheath = gaussSeg(rho2, bl, sStar, width);
  float knots = 0.55 + 0.9 * max(gnoise(vec3(pc.xy * 0.35, h * 0.18 - uTime * 0.05)), -0.4);
  float prof = smoothstep(1.2, 6.0, h) * exp(-h / 60.0) / (1.0 + 0.04 * h);
  float dens = (1.2 * core + 0.35 * sheath) * knots * prof;
  float beta = 0.85;
  float gam = 1.0 / sqrt(1.0 - beta * beta);
  float mu = -dir.z * sign(pc.z);
  float D = 1.0 / (gam * (1.0 - beta * mu));
  float boost = pow(D, 2.6) * pow(max(sCam, 1e-3), 2.6 * uBeaming);
  vec3 col = mix(vec3(0.62, 0.72, 1.0), vec3(0.45, 0.5, 1.0), clamp(sheath - core, 0.0, 1.0));
  return col * dens * boost * L * uJetBright * 0.2;
}

/* --- Yıldızlar: küp yüzü ızgarası, piksel izdüşümüne göre analitik süzme --- */
vec2 cubeUV(vec3 d, out float face) {
  vec3 ad = abs(d);
  if (ad.x >= ad.y && ad.x >= ad.z) { face = d.x > 0.0 ? 0.0 : 1.0; return d.yz / ad.x; }
  if (ad.y >= ad.z) { face = d.y > 0.0 ? 2.0 : 3.0; return d.xz / ad.y; }
  face = d.z > 0.0 ? 4.0 : 5.0; return d.xy / ad.z;
}
vec3 faceDir(float face, vec2 uv) {
  if (face < 0.5) return vec3(1.0, uv);
  if (face < 1.5) return vec3(-1.0, uv);
  if (face < 2.5) return vec3(uv.x, 1.0, uv.y);
  if (face < 3.5) return vec3(uv.x, -1.0, uv.y);
  if (face < 4.5) return vec3(uv, 1.0);
  return vec3(uv, -1.0);
}
const float SIG_STAR = 0.00006;
/*
 * Yıldızlar nokta kaynaktır. Piksel süzgeci görüntü uzayında izotroptur; gökyüzündeki
 * açısal fark, merceklenme Jacobian'ının (J = [∂d/∂x, ∂d/∂y]) tersiyle piksel ofsetine
 * çevrilir. Böylece güçlü merceklenmede yıldızlar yanlış yere uzamaz, akı büyütmesi
 * (μ = Ω_ref / Ω_piksel) ve yüzey parlaklığının korunumu doğru çıkar.
 */
vec3 starLayer(vec3 d, vec3 ju, vec3 jv, float omPix, float cells, float prob, float bScale, float seed, float shift) {
  float face;
  vec2 uv = cubeUV(d, face);
  vec2 gpos = (uv * 0.5 + 0.5) * cells;
  vec2 ci = floor(gpos);
  float cellAng = 2.0 / cells / (1.0 + 0.5 * dot(uv, uv));
  float fpAng = sqrt(omPix);
  float wMean = smoothstep(0.3, 0.8, max(length(ju), length(jv)) / cellAng);
  float uu = dot(ju, ju), vv = dot(jv, jv), uvd = dot(ju, jv);
  float det = uu * vv - uvd * uvd;
  float omRef = uPixAng * uPixAng;
  // yıldızın içsel boyutu (piksel cinsinden, izotrop yaklaşık)
  float sStar2 = SIG_STAR * SIG_STAR / max(omPix, 1e-14);
  float s2 = 0.30 + sStar2;
  float mu = omRef / max(omPix, 1e-14);
  vec3 acc = vec3(0.0);
  if (wMean < 0.999 && det > 1e-24) {
    float idet = 1.0 / det;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 c = ci + vec2(float(i), float(j));
        if (c.x < 0.0 || c.y < 0.0 || c.x >= cells || c.y >= cells) continue;
        vec3 h = hash33(vec3(c, face * 37.0 + seed));
        if (h.x > prob) continue;
        vec2 sp = c + 0.15 + 0.7 * h.yz;
        vec3 sd = normalize(faceDir(face, sp / cells * 2.0 - 1.0));
        vec3 dd = sd - d;
        float bu = dot(ju, dd), bv = dot(jv, dd);
        float pa = (vv * bu - uvd * bv) * idet;
        float pb = (uu * bv - uvd * bu) * idet;
        float r2 = pa * pa + pb * pb;
        if (r2 > 12.0 * s2) continue;
        float h2 = hash13(vec3(c.yx + 0.5, face * 11.0 + seed * 1.7));
        float h3 = hash13(vec3(c + 0.25, face * 5.0 + seed * 3.1 + 17.0));
        float flux = bScale * min(pow(max(h2, 1e-3), -0.75), 80.0);
        float T = h3 < 0.55 ? mix(3000.0, 5800.0, h3 / 0.55) : mix(5800.0, 26000.0, pow((h3 - 0.55) / 0.45, 2.0));
        float Ts = T * shift;
        float sh2 = shift * shift;
        vec3 col = bbChroma(Ts) * (uBolo > 0.5 ? sh2 * sh2 : bbLum(Ts) / bbLum(T));
        acc += col * flux * mu * exp(-r2 / (2.0 * s2)) / (6.2831853 * s2);
      }
    }
  }
  float meanFlux = prob * bScale * 3.5 * omRef / (cellAng * cellAng) / 1.0;
  vec3 meanCol = vec3(1.0, 0.96, 0.92) * meanFlux;
  return mix(acc, meanCol, wMean);
}

vec3 gridSky(vec3 d, float fp) {
  float th = acos(clamp(d.z, -1.0, 1.0));
  float ph = atan(d.y, d.x);
  float stp = PI / 12.0;
  float dth = abs(fract(th / stp + 0.5) - 0.5) * stp;
  float dph = abs(fract(ph / stp + 0.5) - 0.5) * stp * sin(th);
  float lw = max(fp * 1.2, 0.0025);
  float line = max(1.0 - smoothstep(0.0, lw, dth), 1.0 - smoothstep(0.0, lw, dph));
  float chk = mod(floor(th / stp) + floor(ph / stp), 2.0);
  vec3 base = mix(vec3(0.05, 0.07, 0.12), vec3(0.09, 0.05, 0.10), chk);
  base = mix(base, d.z > 0.0 ? vec3(0.02, 0.1, 0.16) : vec3(0.16, 0.08, 0.02), 0.5);
  return base + line * vec3(0.55, 0.75, 1.0) * 0.6;
}

vec3 skyColor(vec3 d, vec3 ddx, vec3 ddy, float fp, float sCam) {
  float omPix = max(length(cross(ddx, ddy)), 1e-14);
  float shift = pow(max(sCam, 1e-3), uBeaming);
  float boost = min(pow(shift, 4.0), 60.0);
  if (uGrid > 0.5) return gridSky(d, fp);
  vec3 c = textureGrad(uSky, d, ddx, ddy).rgb * uSkyBright * boost;
  if (uStarsOn > 0.5) {
    float mw = dot(textureLod(uSky, d, 5.0).rgb, vec3(0.3, 0.5, 0.2)) * 60.0;
    vec3 s = starLayer(d, ddx, ddy, omPix, 40.0, 0.28, 1.5, 1.0, shift);
    s += starLayer(d, ddx, ddy, omPix, 115.0, 0.33, 0.2, 2.0, shift);
    s += starLayer(d, ddx, ddy, omPix, 320.0, clamp(0.05 + mw * 0.3, 0.0, 0.85), 0.05, 3.0, shift);
    c += s * uStarBright;
  }
  return c;
}

void main() {
  vec2 frag = gl_FragCoord.xy + uJitter;
  vec2 ndc = (frag - uCenter) / (0.5 * uRes.y);
  vec3 dl = normalize(vec3(ndc * uTanHalfFov, 1.0));
  vec4 qm = uQ0 + dl.x * uQ1 + dl.y * uQ2 + dl.z * uQ3;

  vec3 col = vec3(0.0);
  float Acc = 0.0;
  bool escaped = false;
  vec3 x = uCamPos;
  vec3 q = vec3(0.0);
  vec3 dx = -normalize(uCamPos);
  float sCam = 1.0;
  bool valid = qm.x > 1e-5;
  if (valid) {
    sCam = 1.0 / qm.x;
    q = qm.yzw * sCam;
    float t = 0.0;
    vec3 dq; float dtl, r;
    deriv(x, q, dx, dq, dtl, r);
    float q0 = length(q);
    float a2 = uA * uA;
    float rinLo = uRin * 0.9, routHi = uRout * 1.05;
    for (int i = 0; i < 2000; i++) {
      if (i >= uMaxSteps) break;
      // uzakta bükülme zayıf: adım r ile birlikte süperlineer büyür
      float ds = uStepK * max(r, 0.8) * clamp(r * 0.14, 1.0, 3.5);
      if (uInside == 0) ds = min(ds, max(0.6 * (r - uRh), 0.035) + 0.02 * r);
      float h = ds * inversesqrt(max(dot(dx, dx), 1e-12));
      // ufka asimptotik yaklaşan ışında kovaryant momentum ıraksar: adım başına %10'dan fazla değişmesin
      h = min(h, 0.1 * length(q) * inversesqrt(max(dot(dq, dq), 1e-20)));
      vec3 xn = x, qn = q; float tn = t;
      rk4(xn, qn, tn, dx, dq, dtl, h);

      if (uHaze > 0.0 && uDiskOn > 0.5) {
        col += (1.0 - Acc) * hazeSegment(x, xn, q, sCam);
      }
      if (uJetOn > 0.5) {
        col += (1.0 - Acc) * jetSegment(x, xn, sCam, normalize(dx));
      }
      if (uDiskOn > 0.5 && x.z * xn.z < 0.0) {
        float fr = x.z / (x.z - xn.z);
        vec2 xl = mix(x.xy, xn.xy, fr);
        float rl = sqrt(max(dot(xl, xl) - a2, 0.0));
        if (rl > rinLo && rl < routHi) {
          // kesişimi hassaslaştır: kesirli RK4 adımı + bir Newton düzeltmesi
          vec3 xh = x, qh = q; float th = t;
          rk4(xh, qh, th, dx, dq, dtl, h * fr);
          vec3 vh, dqh; float dth, rh;
          deriv(xh, qh, vh, dqh, dth, rh);
          float corr = clamp(-xh.z / vh.z, -0.5 * h, 0.5 * h);
          xh += vh * corr; qh += dqh * corr; th += dth * corr;
          float cosi = abs(vh.z) * inversesqrt(dot(vh, vh));
          vec4 e = shadeDisk(xh, qh, uTime + th, cosi, sCam);
          col += (1.0 - Acc) * e.rgb;
          Acc += (1.0 - Acc) * e.a;
        }
      }
      x = xn; q = qn; t = tn;
      if (Acc > 0.995) break;
      deriv(x, q, dx, dq, dtl, r);
      if (uInside == 0 && (r < uRh * 1.01 + 0.005 || dot(q, q) > 3600.0)) break;
      if (uInside == 1 && (dot(q, q) > 640000.0 * q0 * q0 || r < 0.05)) break;
      if (r > uResc && dot(x, dx) > 0.0) { escaped = true; break; }
      if (!(r == r)) break;
    }
  }
  vec3 dir = normalize(dx);
  vec3 ddx = dFdx(dir), ddy = dFdy(dir);
  float fp = max(max(length(ddx), length(ddy)) * 0.5, uPixAng * 0.35);
  vec3 sky = skyColor(dir, ddx, ddy, fp, sCam);
  if (escaped) col += (1.0 - Acc) * sky;
  outColor = vec4(col, 1.0);
}`;

  /* ---------------------------------------------------------------- */
  /* Zamansal kenar yumuşatma (TAA), komşuluk varyans kırpma           */
  /* ---------------------------------------------------------------- */
  // Işın izleme çözünürlüğünde komşuluk istatistiği (ortalama, sapma): TAAU'da 9 okuma yerine 2
  const NEIGH = `#version 300 es
precision highp float;
uniform sampler2D uCur;
layout(location = 0) out vec4 oMu;
layout(location = 1) out vec4 oSig;
vec3 tm(vec3 c) { return c / (1.0 + max(c.r, max(c.g, c.b))); }
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 sz = textureSize(uCur, 0) - 1;
  vec3 m1 = vec3(0.0), m2 = vec3(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 n = tm(texelFetch(uCur, clamp(p + ivec2(i, j), ivec2(0), sz), 0).rgb);
    m1 += n; m2 += n * n;
  }
  vec3 mu = m1 / 9.0;
  oMu = vec4(mu, 1.0);
  oSig = vec4(sqrt(max(m2 / 9.0 - mu * mu, 0.0)), 1.0);
}`;

  const TAA = `#version 300 es
precision highp float;
uniform sampler2D uCur, uHist, uMu, uSig;
uniform vec2 uCurSize, uOutSize, uJitter;
uniform float uAlpha;
uniform float uClampOn;
uniform float uGamma;
out vec4 outColor;
vec3 tm(vec3 c) { return c / (1.0 + max(c.r, max(c.g, c.b))); }
vec3 itm(vec3 c) { return c / max(1.0 - max(c.r, max(c.g, c.b)), 1e-4); }
/*
 * Zamansal üst örnekleme (TAAU): ışın izleme düşük çözünürlükte ve alt-piksel titreşimle
 * yapılır; geçmiş tamponu ekran çözünürlüğündedir. Kamera durunca görüntü tam
 * çözünürlüğe yakınsar. Komşuluk varyans kırpması hayalet izleri önler.
 */
void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 ratio = uCurSize / uOutSize;
  vec2 tpos = p * ratio;
  ivec2 sz = ivec2(uCurSize) - 1;
  ivec2 ii = clamp(ivec2(floor(tpos - uJitter)), ivec2(0), sz);
  vec2 d = (vec2(ii) + 0.5 + uJitter - tpos) / ratio;
  vec3 cb = tm(texture(uCur, (tpos - uJitter) / uCurSize).rgb);
  vec3 o;
  if (uAlpha >= 0.999) {
    o = cb;
  } else {
    vec3 cn = tm(texelFetch(uCur, ii, 0).rgb);
    vec3 mu = texelFetch(uMu, ii, 0).rgb;
    vec3 sg = texelFetch(uSig, ii, 0).rgb;
    vec3 h = tm(texture(uHist, p / uOutSize).rgb);
    if (uClampOn > 0.5) h = clamp(h, mu - uGamma * sg, mu + uGamma * sg);
    float w = exp(-0.5 * dot(d, d) / 0.36);
    if (uAlpha >= 0.45) {
      o = mix(h, mix(cb, cn, 0.35 * w), uAlpha);
    } else {
      o = mix(h, cn, clamp(uAlpha * w * 1.6, 0.0, 1.0));
    }
  }
  outColor = vec4(itm(o), 1.0);
}`;

  /* ---------------------------------------------------------------- */
  /* Bloom: 13 dokulu aşağı örnekleme + çadır filtreli yukarı örnekleme */
  /* ---------------------------------------------------------------- */
  const DOWN = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uFirst;
out vec4 outColor;
vec3 s(vec2 o) { return texture(uSrc, vUv + o * uTexel).rgb; }
float kw(vec3 c) { return 1.0 / (1.0 + max(c.r, max(c.g, c.b))); }
void main() {
  vec3 a = s(vec2(-2, 2)), b = s(vec2(0, 2)), c = s(vec2(2, 2));
  vec3 d = s(vec2(-2, 0)), e = s(vec2(0, 0)), f = s(vec2(2, 0));
  vec3 g = s(vec2(-2, -2)), h = s(vec2(0, -2)), i = s(vec2(2, -2));
  vec3 j = s(vec2(-1, 1)), k = s(vec2(1, 1)), l = s(vec2(-1, -1)), m = s(vec2(1, -1));
  vec3 res;
  if (uFirst > 0.5) {
    vec3 g0 = (j + k + l + m) * 0.25;
    vec3 g1 = (a + b + d + e) * 0.25;
    vec3 g2 = (b + c + e + f) * 0.25;
    vec3 g3 = (d + e + g + h) * 0.25;
    vec3 g4 = (e + f + h + i) * 0.25;
    float w0 = kw(g0) * 0.5, w1 = kw(g1) * 0.125, w2 = kw(g2) * 0.125, w3 = kw(g3) * 0.125, w4 = kw(g4) * 0.125;
    res = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else {
    res = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  outColor = vec4(res, 1.0);
}`;

  const UP = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uWeight;
out vec4 outColor;
void main() {
  vec2 t = uTexel;
  vec3 r = texture(uSrc, vUv).rgb * 4.0;
  r += (texture(uSrc, vUv + vec2(-t.x, 0)).rgb + texture(uSrc, vUv + vec2(t.x, 0)).rgb +
        texture(uSrc, vUv + vec2(0, -t.y)).rgb + texture(uSrc, vUv + vec2(0, t.y)).rgb) * 2.0;
  r += texture(uSrc, vUv + vec2(-t.x, -t.y)).rgb + texture(uSrc, vUv + vec2(t.x, -t.y)).rgb +
       texture(uSrc, vUv + vec2(-t.x, t.y)).rgb + texture(uSrc, vUv + vec2(t.x, t.y)).rgb;
  outColor = vec4(r / 16.0 * uWeight, 1.0);
}`;

  /* ---------------------------------------------------------------- */
  /* Son birleştirme: pozlama, bloom, ACES film ton eşleme, vinyet     */
  /* ---------------------------------------------------------------- */
  const COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uHDR, uBloom, uEHTSrc, uEHTMax, uAE;
uniform float uAEOn;
uniform vec2 uHDRSize, uEHTSize;
uniform float uExposure, uBloomStr, uVignette, uGrain, uTime, uEHT, uFade, uSharpen;
out vec4 outColor;

const mat3 ACESIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
const mat3 ACESOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
vec3 RRTODT(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 aces(vec3 c) { return clamp(ACESOut * RRTODT(ACESIn * c), 0.0, 1.0); }
vec3 srgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x, y = s.y - 4.0 * s.x, z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w) * (1.0 / 6.0);
}
vec3 bicubic(sampler2D t, vec2 uv, vec2 size) {
  vec2 inv = 1.0 / size;
  uv = uv * size - 0.5;
  vec2 fxy = fract(uv);
  uv -= fxy;
  vec4 xc = cubic(fxy.x), yc = cubic(fxy.y);
  vec4 c = uv.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = c + vec4(xc.yw, yc.yw) / s;
  off *= inv.xxyy;
  vec3 s0 = texture(t, off.xz).rgb, s1 = texture(t, off.yz).rgb, s2 = texture(t, off.xw).rgb, s3 = texture(t, off.yw).rgb;
  float sx = s.x / (s.x + s.y), sy = s.z / (s.z + s.w);
  return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
}
vec3 afmhot(float x) { return clamp(vec3(2.0 * x, 2.0 * x - 0.5, 2.0 * x - 1.0), 0.0, 1.0); }

void main() {
  vec2 uv = vUv;
  vec3 c;
  if (uEHT > 0.5) {
    vec3 b = bicubic(uEHTSrc, uv, uEHTSize);
    float mx = max(texelFetch(uEHTMax, ivec2(0), 0).r, 1e-6);
    float l = dot(b, vec3(0.2126, 0.7152, 0.0722)) / mx;
    c = afmhot(clamp(l * 0.97, 0.0, 1.0));
    c = pow(c, vec3(2.2));
  } else {
    vec2 d = uv - 0.5;
    vec2 tx = 1.0 / uHDRSize;
    vec3 base = texture(uHDR, uv).rgb;
    // hafif keskinleştirme
    vec3 nb = texture(uHDR, uv + vec2(tx.x, 0)).rgb + texture(uHDR, uv - vec2(tx.x, 0)).rgb +
              texture(uHDR, uv + vec2(0, tx.y)).rgb + texture(uHDR, uv - vec2(0, tx.y)).rgb;
    base = max(base + (base - nb * 0.25) * uSharpen, 0.0);
    vec3 bl = texture(uBloom, uv).rgb;
    c = base + bl * uBloomStr;
    c *= uExposure;
    if (uAEOn > 0.5) {
      vec2 ae = texelFetch(uAE, ivec2(0), 0).rg;
      c *= clamp(ae.g / max(ae.r, 1e-5), 0.02, 1.0);
    }
    float v = 1.0 - uVignette * pow(length(d * vec2(1.0, 0.8)) * 1.35, 2.4);
    c *= max(v, 0.0);
    c = aces(c);
  }
  c *= uFade;
  c = srgb(c);
  float n = h12(gl_FragCoord.xy + fract(uTime) * 97.0) - 0.5;
  c += n * (1.0 / 255.0 + uGrain);
  outColor = vec4(c, 1.0);
}`;

  const SKYVIEW = `#version 300 es
precision highp float;
in vec2 vUv;
uniform samplerCube uSky;
out vec4 outColor;
void main() {
  float ph = (vUv.x * 2.0 - 1.0) * 3.14159265;
  float th = vUv.y * 3.14159265;
  vec3 d = vec3(sin(th) * cos(ph), sin(th) * sin(ph), -cos(th));
  vec3 c = texture(uSky, d).rgb * 6.0;
  outColor = vec4(pow(c / (1.0 + c), vec3(1.0 / 2.2)), 1.0);
}`;

  const MAXLUM = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
out vec4 outColor;
void main() {
  float m = 0.0;
  for (int j = 0; j < 32; j++) for (int i = 0; i < 32; i++) {
    vec3 c = texture(uSrc, (vec2(float(i), float(j)) + 0.5) / 32.0).rgb;
    m = max(m, dot(c, vec3(0.2126, 0.7152, 0.0722)));
  }
  outColor = vec4(m, m, m, 1.0);
}`;

  // Otomatik pozlama ölçümü: bulanık seviyenin merkez ağırlıklı aritmetik ortalaması.
  // .r = zamanla yumuşatılmış ortalama, .g = düşüş başındaki referans
  const AUTOEXP = `#version 300 es
precision highp float;
uniform sampler2D uSrc, uPrev;
uniform float uBlend, uReset;
out vec4 outColor;
void main() {
  float s = 0.0, n = 0.0;
  for (int j = 0; j < 16; j++) for (int i = 0; i < 16; i++) {
    vec2 uv = (vec2(float(i), float(j)) + 0.5) / 16.0;
    float l = dot(texture(uSrc, uv).rgb, vec3(0.2126, 0.7152, 0.0722));
    float w = 1.0 - 0.55 * length(uv - 0.5) * 1.41;
    s += w * min(l, 40.0); n += w;
  }
  float avg = max(s / n, 1e-4);
  vec4 prev = texelFetch(uPrev, ivec2(0), 0);
  float cur = uReset > 0.5 ? avg : mix(prev.r, avg, uBlend);
  float ref = uReset > 0.5 ? avg : prev.g;
  outColor = vec4(cur, ref, 0.0, 1.0);
}`;

  root.BHShaders = { VERT, SKYGEN, TRACE, NEIGH, TAA, DOWN, UP, COMPOSITE, SKYVIEW, MAXLUM, AUTOEXP };
})(window);
