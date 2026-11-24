// 訪問者カウンター：GoatCounter（無料の集計サービス）で数えて、サイト全体の合計を街の看板に出す
// 使い方：GoatCounter に「nagashinocat」というコードで登録し、設定で
// 「Allow adding visitor counts on your website」を有効にする
export const GOATCOUNTER = 'nagashinocat';

// {count: "1,234"} → 1234（読めなければ null）
export function parseCount(json) {
  const s = json && typeof json.count === 'string' ? json.count.replace(/[,\s ]/g, '') : '';
  return /^\d+$/.test(s) ? Number(s) : null;
}
// 手元での確認や撮影では数えない（数が水増しされないように）
export function shouldCount({ hostname, search }) {
  return !/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(hostname) && !/[?&]manual\b/.test(search);
}
// カウンターに並べる桁（6桁、あふれたら増やす）
export function counterDigits(n, width = 6) {
  return n == null ? '-'.repeat(width) : String(n).padStart(width, '0');
}

// この訪問を数えて、サイト全体の合計を返す（失敗したら null）
export async function visit(code = GOATCOUNTER, loc = location) {
  if (!shouldCount(loc)) return null;
  try {
    await new Promise((ok, ng) => {
      const s = document.createElement('script');
      s.async = true; s.src = 'https://gc.zgo.at/count.js';
      s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
      s.onload = ok; s.onerror = ng; document.head.append(s);
    });
  } catch { /* 数えられなくても、合計の表示は試す */ }
  try {
    const r = await fetch(`https://${code}.goatcounter.com/counter/TOTAL.json`);
    return r.ok ? parseCount(await r.json()) : null;
  } catch { return null; }
}
