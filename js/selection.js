// 看板の選択：PCはカーソルで予告・クリックで遊ぶ、スマホは1回目で予告・2回目で遊ぶ
export function createSelection(billboard, { navigate }) {
  let selected = null;
  const play = () => { const u = billboard.playUrl(); if (u) navigate(u); };
  const sel = {
    locked: false,
    hover(id) {
      if (sel.locked || id === selected) return;
      selected = id;
      id ? billboard.preview(id) : billboard.clear();
    },
    tap(target) {
      if (sel.locked) return;
      if (!target) { selected = null; billboard.clear(); return; }
      if (target.billboard) { if (selected) play(); return; }
      if (target.workId === selected) { play(); return; }
      selected = target.workId;
      billboard.preview(selected);
    },
  };
  return sel;
}
