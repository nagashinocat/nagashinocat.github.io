// 部品用の漫画マテリアル（建物の質感）
// 頂点色（壁のしみ・屋根・手すり・室外機・ネオン）＋3段の陰影＋影のカケアミ。
// 縦の面には窓を描く：窓枠・桟・カーテン・人影・鉄格子・室外機・窓下の雨だれ・階ごとのスラブ。1階はお店とシャッター。
// 壁には汚れのムラ、縦の雨だれ、錆。頂点色のアルファ=1 は自分で光る（ネオン）。墨の輪郭は裏返しで太らせる
import * as THREE from 'three';

export function toonMaterial({ tint = new THREE.Color(1, 1, 1), seed = 0, cell = [0.05, 0.042], scale = [1, 1, 1], ground = 0.06 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tint: { value: tint }, seed: { value: seed }, cell: { value: new THREE.Vector2(...cell) }, scl: { value: new THREE.Vector3(...scale) }, groundY: { value: ground },
      light: { value: new THREE.Vector3(-0.6, 0.55, 0.55).normalize() },
    },
    vertexShader: `
      attribute vec4 color;
      varying vec4 vC; varying vec3 vN; varying vec3 vW; varying vec3 vO; varying vec3 vON;
      void main() {
        vC = vec4(pow(color.rgb, vec3(2.2)), color.a);
        vO = position; vON = normal;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform vec3 tint; uniform vec3 light; uniform float seed; uniform vec2 cell; uniform vec3 scl; uniform float groundY;
      varying vec4 vC; varying vec3 vN; varying vec3 vW; varying vec3 vO; varying vec3 vON;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21) + seed * 0.137); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
      const vec3 INK = vec3(0.078, 0.043, 0.094);
      void main() {
        vec3 n = normalize(gl_FrontFacing ? vN : -vN);
        vec3 on = normalize(vON);
        float d = dot(n, light);
        float band = d > 0.45 ? 1.0 : d > 0.0 ? 0.76 : 0.52;
        vec3 base = vC.rgb * tint;
        vec3 p = vO * scl;
        // 壁のムラ・汚れ・雨だれ・錆（世界の大きさで）
        vec2 wp = vec2(p.x + p.z, p.y);
        float grime = fbm(wp * 38.0);
        float streak = fbm(vec2(wp.x * 160.0, wp.y * 9.0));
        base *= 0.78 + 0.42 * grime;
        base *= 1.0 - 0.35 * smoothstep(0.55, 0.85, streak);
        base = mix(base, vec3(0.32, 0.16, 0.1), 0.25 * smoothstep(0.62, 0.9, fbm(wp * 22.0 + 7.0)));
        float glow = vC.a;
        vec3 col = base * band;
        if (abs(on.y) < 0.45 && vC.a < 0.5) {
          vec2 t = normalize(vec2(-on.z, on.x));
          float u = dot(p.xz, t), v = p.y;
          vec2 c = vec2(u, v) / cell;
          vec2 id = floor(c), f = fract(c);
          float r = h21(id + floor(on.xz * 3.0) * 7.0);
          bool ground = v < groundY;
          // 階ごとのスラブ（下の濃い帯と上の明るい縁）
          if (!ground && f.y < 0.07) col *= 0.55;
          else if (!ground && f.y < 0.1) col *= 1.15;
          vec2 inner = ground ? vec2(0.05, 0.1) : vec2(0.17, 0.22);
          bool inWin = f.x > inner.x && f.x < 1.0 - inner.x && f.y > inner.y && f.y < 1.0 - inner.y * 0.55;
          if (inWin) {
            vec2 g = (f - inner) / (1.0 - inner * vec2(2.0, 1.55));
            vec3 w; float lit = 0.0;
            if (ground) {
              if (r < 0.32) { w = mix(vec3(1.0, 0.6, 0.25), vec3(1.0, 0.85, 0.6), g.y); lit = 1.0; }
              else if (r < 0.5) { w = vec3(1.0, 0.35, 0.48); lit = 1.0; }
              else if (r < 0.62) { w = vec3(0.45, 0.85, 1.0); lit = 1.0; }
              else { w = vec3(0.36, 0.36, 0.4) * (0.7 + 0.3 * step(0.5, fract(g.y * 14.0))); }
            } else if (r < 0.4) { w = mix(vec3(1.0, 0.68, 0.3), vec3(1.0, 0.88, 0.6), h21(id * 1.7)); lit = 1.0; }
            else if (r < 0.47) { w = vec3(0.55, 0.8, 1.0); lit = 1.0; }
            else { w = vec3(0.07, 0.05, 0.1) + vec3(0.1, 0.06, 0.14) * vnoise(g * 3.0 + id); }
            if (lit > 0.5) {
              float k = h21(id * 2.3);
              if (k < 0.35 && g.x < 0.42) w *= 0.55;
              if (k > 0.85 && abs(g.x - 0.6) < 0.08 && g.y < 0.6) w *= 0.25;
              w *= 0.8 + 0.2 * g.y;
            }
            if (abs(g.x - 0.5) < 0.04 || (!ground && abs(g.y - 0.55) < 0.035)) w = INK * 1.4;
            col = lit > 0.5 ? w : w * band;
            glow = lit;
            if (!ground && h21(id * 4.1) < 0.28) {
              if (fract(g.x * 5.0) < 0.12 || fract(g.y * 3.0) < 0.1) { col = vec3(0.16, 0.12, 0.14) * band; glow = 0.0; }
            }
          } else if (!ground) {
            float a = h21(id * 5.7);
            if (a < 0.22 && f.y < inner.y && f.x > 0.55 && f.x < 0.95 && f.y > 0.02) {
              vec2 q = vec2((f.x - 0.55) / 0.4, f.y / inner.y);
              col = vec3(0.78, 0.76, 0.7) * band;
              float rr = length(q - vec2(0.35, 0.5));
              if (rr < 0.28 && rr > 0.2) col *= 0.45;
              if (q.x > 0.7 && fract(q.y * 6.0) < 0.4) col *= 0.6;
              if (q.x < 0.04 || q.x > 0.96 || q.y < 0.06 || q.y > 0.94) col = INK;
            } else if (f.y < inner.y && abs(f.x - 0.3 - 0.4 * h21(id)) < 0.03) col *= 0.6;
          }
          float e = min(min(abs(f.x - inner.x), abs(f.x - 1.0 + inner.x)), min(abs(f.y - inner.y), abs(f.y - 1.0 + inner.y * 0.55)));
          if (e < 0.03 && f.x > inner.x - 0.03 && f.x < 1.0 - inner.x + 0.03 && f.y > inner.y - 0.03 && f.y < 1.0 - inner.y * 0.55 + 0.03) col = INK;
        }
        if (glow < 0.5 && band < 0.6) {
          vec2 sp = gl_FragCoord.xy;
          if (fract((sp.x + sp.y) * 0.25) < 0.2) col *= 0.7;
        }
        float bounce = clamp(-n.y, 0.0, 1.0) * 0.25 + clamp(1.0 - vW.y * 3.0, 0.0, 1.0) * 0.12;
        if (glow < 0.5) col += vec3(0.5, 0.18, 0.5) * bounce * 0.35;
        if (vC.a > 0.5) col = base * 1.25;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

export function outlineMaterial(thickness = 0.004) {
  return new THREE.ShaderMaterial({
    uniforms: { t: { value: thickness } },
    vertexShader: `uniform float t; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vec3 n = normalize(mat3(modelMatrix) * normal); w.xyz += n * t; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `void main() { gl_FragColor = vec4(0.078, 0.043, 0.094, 1.0); }`,
    side: THREE.BackSide,
  });
}
