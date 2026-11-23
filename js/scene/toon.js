// 部品用の漫画マテリアル
// 頂点色（壁のしみ・屋根・手すり・室外機・ネオン）＋3段の陰影。縦の面には窓を描く（明かり・暗いガラス・青白い光・1階の店）
// 頂点色のアルファ=1 は自分で光る（ネオン）。墨の輪郭は裏返しで太らせる
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
      void main() {
        vec3 n = normalize(gl_FrontFacing ? vN : -vN);
        vec3 on = normalize(vON);
        float d = dot(n, light);
        float band = d > 0.45 ? 1.0 : d > 0.0 ? 0.78 : 0.56;
        vec3 base = vC.rgb * tint;
        float glow = vC.a;
        vec3 col = base * band;
        // 縦の面：窓の格子
        if (abs(on.y) < 0.45 && vC.a < 0.5) {
          vec2 t = normalize(vec2(-on.z, on.x));
          vec3 p = vO * scl;
          float u = dot(p.xz, t), v = p.y;
          vec2 c = vec2(u, v) / cell;
          vec2 id = floor(c), f = fract(c);
          float r = h21(id + floor(on.xz * 3.0) * 7.0);
          bool ground = v < groundY;
          vec2 inner = ground ? vec2(0.06, 0.08) : vec2(0.18, 0.24);
          bool inWin = f.x > inner.x && f.x < 1.0 - inner.x && f.y > inner.y && f.y < 1.0 - inner.y * 0.6;
          if (inWin) {
            vec3 w;
            if (ground) { w = r < 0.35 ? vec3(1.0, 0.62, 0.28) : r < 0.55 ? vec3(1.0, 0.36, 0.5) : r < 0.7 ? vec3(0.45, 0.85, 1.0) : vec3(0.1, 0.07, 0.1); glow = r < 0.7 ? 1.0 : 0.0; }
            else if (r < 0.42) { w = mix(vec3(1.0, 0.72, 0.32), vec3(1.0, 0.86, 0.55), h21(id * 1.7)); glow = 1.0; }
            else if (r < 0.5) { w = vec3(0.55, 0.8, 1.0); glow = 1.0; }
            else { w = vec3(0.08, 0.06, 0.11) + vec3(0.12, 0.05, 0.14) * h21(id * 3.1); glow = 0.0; }
            // カーテンや人影
            if (glow > 0.5 && h21(id * 2.3) < 0.3 && f.x < 0.45) w *= 0.6;
            col = glow > 0.5 ? w : w * band;
          } else if (f.y < inner.y * 0.7 && r < 0.5 && !ground) {
            col *= 0.6; // 窓の下のひさしの影
          }
          // 墨の窓枠
          float e = min(min(abs(f.x - inner.x), abs(f.x - 1.0 + inner.x)), min(abs(f.y - inner.y), abs(f.y - 1.0 + inner.y * 0.6)));
          if (inWin && e < 0.035) col = vec3(0.078, 0.043, 0.094);
        }
        // 下からのネオンの照り返し
        float bounce = clamp(-n.y, 0.0, 1.0) * 0.25 + clamp(1.0 - vW.y * 2.5, 0.0, 1.0) * 0.1;
        if (glow < 0.5) col += vec3(0.5, 0.2, 0.55) * bounce * 0.4;
        if (vC.a > 0.5) col = base * 1.2;
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
