// 飛び出す角度（0=ページに寝ている、π/2=立っている）
const H = Math.PI / 2;
const easeOutBack = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
export function popupAngle(t, delay, dur = 0.7) {
  const x = (t - delay) / dur;
  if (x <= 0) return 0;
  if (x >= 1) return H;
  return H * easeOutBack(x);
}
// 畳む：行き過ぎずに素直に倒れる
export function foldAngle(t, delay, dur = 0.45) {
  const x = (t - delay) / dur;
  if (x <= 0) return H;
  if (x >= 1) return 0;
  return H * (1 - x * x);
}
