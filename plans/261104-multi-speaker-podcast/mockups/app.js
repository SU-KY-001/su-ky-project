"use strict";
/* Mockup logic mirrors plans/261104-multi-speaker-podcast phase-03 (pure functions) and phase-04 (UI). */
const MAX_SPEAKERS = 30, MIN_SPEAKERS = 2, MAX_TURNS = 300, TURN_MAX_CHARS = 2000, PALETTE = 6;
const CHARS_PER_MINUTE = 700, TURN_GAP_MS = 250;
const SAMPLE = "Chào mừng các bạn quay lại với podcast Hào khí Đại Việt. Hôm nay chúng ta nói về một quyết định làm đổi vận mệnh một quốc gia: cuộc dời đô năm 1010.\n\nCảm ơn bạn đã mở đầu. Mình tò mò ngay từ đầu: kinh đô lúc đó đặt ở đâu, và vì sao phải dời?\n\nTrước đó kinh đô là Hoa Lư, một vùng đất núi non hiểm trở, nằm ở phía nam đồng bằng sông Hồng ngày nay.\n\nNúi non hiểm trở thì tốt cho phòng thủ, nhưng chật hẹp. Thành phố khó mở rộng, đường thủy bộ cũng khó thông thương.\n\nĐúng vậy. Với một triều đại muốn tồn tại lâu dài, Hoa Lư dần trở thành một chiếc áo chật.\n\nNgười đưa ra quyết định là Lý Công Uẩn, người sau này lên ngôi, hiệu là Lý Thái Tổ.\n\nÔng được nhắc đến nhiều nhất qua văn bản gọi là Chiếu dời đô. Văn bản này nói gì, bạn có nhớ không?\n\nChiếu nhắc lại việc các triều đại xưa nhiều lần dời đô để chọn nơi trung tâm, thuận tiện cho dân và cho đất nước.\n\nRồi chiếu nêu thẳng nơi được chọn: thành Đại La, đất rộng và bằng phẳng, có thể làm nơi ở của muôn đời con cháu.\n\nMình thấy cách lập luận đó khá thuyết phục. Không dùng sức mạnh, mà dùng lẽ phải và quyền lợi của dân.\n\nCũng cần nói thêm một chi tiết nhỏ về huyền thoại. Tương truyền khi thuyền cập bến, có rồng vàng bay lên.\n\nVà vì thế vùng đất được đặt tên Thăng Long, nghĩa là rồng bay lên. Một cái tên nghe rất có khí thế.\n\nNhưng nói cho công bằng, huyền thoại là cách người xưa gói ghém ý nghĩa chính trị vào một hình ảnh dễ nhớ.\n\nHay đấy. Vậy về mặt địa lý, Đại La có lợi thế gì thật sự?\n\nNó nằm giữa vùng đồng bằng sông Hồng, có sông lớn chảy qua, thuận cho giao thương và cho việc điều binh bằng đường thủy.\n\nĐất rộng thì thành phố có chỗ để lớn. Về sau Thăng Long thực sự trở thành trung tâm chính trị và văn hóa trong nhiều thế kỷ.\n\nMình đoán việc xây dựng một kinh đô mới cũng không hề đơn giản. Cần người, cần vật liệu, cần cả thời gian.\n\nĐúng, và đó là bài toán của một nhà nước còn non trẻ. Họ phải vừa củng cố quyền lực, vừa xây cung điện và đường sá.\n\nMột điều mình thấy thú vị là triều Lý rất coi trọng Phật giáo trong việc xây dựng và tổ chức đời sống.\n\nChùa chiền được dựng nhiều, và nhiều vị sư có vai trò quan trọng trong việc dạy học cũng như tham mưu cho triều đình.\n\nVậy bạn nghĩ điều gì khiến quyết định dời đô này được nhắc lại mãi đến ngày nay?\n\nTheo mình, vì nó thể hiện tầm nhìn dài hạn. Người quyết định không chỉ nghĩ đến an toàn trước mắt mà nghĩ đến sự phát triển của cả quốc gia.\n\nVà vì nó cho thấy một nhà lãnh đạo dám thay đổi khi hoàn cảnh đã khác. Giữ nguyên thì dễ, thay đổi mới khó.\n\nMình đồng ý. Nhưng cũng nên nhớ rằng mọi chi tiết chúng ta nói hôm nay đều dựa trên ghi chép của người đời sau.\n\nĐúng vậy, nên khi nghe lại, các bạn nên đối chiếu thêm nhiều nguồn sử liệu, thay vì chỉ tin một cách kể duy nhất.\n\nRất đúng, và đó cũng là lý do podcast này có nhiều người cùng kể: mỗi người một góc nhìn.\n\nBạn nào muốn tìm hiểu sâu hơn có thể xem phần nguồn tham khảo ngay bên dưới tập này.\n\nCảm ơn các bạn đã lắng nghe. Hẹn gặp lại ở tập tiếp theo.\n\nHẹn gặp lại, và nhớ chia sẻ tập này cho người bạn cũng thích lịch sử nhé.\n\nTạm biệt, và chúc các bạn một ngày thật nhiều cảm hứng.\n";

const VOICES = [["Achernar","Nữ"],["Achird","Nam"],["Algenib","Nam"],["Algieba","Nam"],["Alnilam","Nam"],["Aoede","Nữ"],["Autonoe","Nữ"],["Callirrhoe","Nữ"],["Charon","Nam"],["Despina","Nữ"],["Enceladus","Nam"],["Erinome","Nữ"],["Fenrir","Nam"],["Gacrux","Nữ"],["Iapetus","Nam"],["Kore","Nữ"],["Laomedeia","Nữ"],["Leda","Nữ"],["Orus","Nam"],["Pulcherrima","Nữ"],["Puck","Nam"],["Rasalgethi","Nam"],["Sadachbia","Nam"],["Sadaltager","Nam"],["Schedar","Nam"],["Sulafat","Nữ"],["Umbriel","Nam"],["Vindemiatrix","Nữ"],["Zephyr","Nữ"],["Zubenelgenubi","Nam"]];

const uid = () => crypto.randomUUID();
const $ = (s) => document.querySelector(s);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const state = {
  speakers: [
    { key: "A", name: "Người nói A", voice: "Kore" },
    { key: "B", name: "Người nói B", voice: "Charon" },
  ],
  turns: [{ id: uid(), speaker: "A", text: "", style: "" }],
  selected: new Set(),
  filter: "ALL",
};

/* ---------- pure helpers (map 1-1 to dialogueState.ts in the plan) ---------- */
function nextSpeakerKey(speakers) {
  const taken = new Set(speakers.map((s) => s.key));
  for (let n = 3; ; n++) if (!taken.has("S" + n)) return "S" + n;
}
function addSpeaker(d) {
  if (d.speakers.length >= MAX_SPEAKERS) return false;
  const usedVoices = new Set(d.speakers.map((s) => s.voice));
  const voice = VOICES.find(([v]) => !usedVoices.has(v))[0];
  const names = new Set(d.speakers.map((s) => s.name.toLowerCase()));
  let n = d.speakers.length + 1;
  while (names.has(("Người nói " + n).toLowerCase())) n++;
  d.speakers.push({ key: nextSpeakerKey(d.speakers), name: "Người nói " + n, voice });
  return true;
}
const usedKeys = (d) => [...new Set(d.turns.map((t) => t.speaker).filter((k) => d.speakers.some((s) => s.key === k)))];
const turnsOf = (d, key) => d.turns.filter((t) => t.speaker === key).length;
const unassigned = (d) => d.turns.map((t, i) => (d.speakers.some((s) => s.key === t.speaker) ? -1 : i)).filter((i) => i >= 0);

function splitScript(text, max = TURN_MAX_CHARS) {
  const raw = text.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const paragraphs = []; let splitLong = 0;
  for (const p of raw) {
    if (p.length <= max) { paragraphs.push(p); continue; }
    splitLong++;
    let cur = "";
    const push = () => { if (cur) paragraphs.push(cur); cur = ""; };
    for (const sentence of p.split(/(?<=[.!?…])\s+/)) {
      let s = sentence;
      while (s.length > max) { push(); paragraphs.push(s.slice(0, max)); s = s.slice(max); }
      if ((cur ? cur.length + 1 : 0) + s.length > max) push();
      cur = cur ? cur + " " + s : s;
    }
    push();
  }
  return { paragraphs, splitLong };
}
function importTurns(d, paragraphs, mode) {
  const base = mode === "append" ? d.turns.filter((t) => t.text.trim()) : [];
  if (base.length + paragraphs.length > MAX_TURNS) return { error: `Tổng ${base.length + paragraphs.length} lượt vượt giới hạn ${MAX_TURNS}. Chưa nhập gì.` };
  d.turns = [...base, ...paragraphs.map((text) => ({ id: uid(), speaker: "", text, style: "" }))];
  return {};
}
function issues(d) {
  const out = [];
  d.turns.forEach((t, i) => {
    if (!d.speakers.some((s) => s.key === t.speaker)) out.push(`Lượt ${i + 1}: chưa gán người nói`);
    else if (!t.text.trim()) out.push(`Lượt ${i + 1}: chưa có lời`);
  });
  const names = d.speakers.map((s) => s.name.trim().toLowerCase());
  if (names.some((n) => !n)) out.push("Tên người nói không được trống");
  else if (new Set(names).size !== names.length) out.push("Các người nói phải khác tên");
  return out;
}

/* ---------- UI ---------- */
const colorOf = (key) => { const i = state.speakers.findIndex((s) => s.key === key); return i < 0 ? "cx" : "c" + (i % PALETTE); };
const nameOf = (key) => state.speakers.find((s) => s.key === key)?.name ?? null;
const dot = (key) => `<span class="dot ${colorOf(key)}"></span>`;

let toastTimer;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 2600); }

function renderTurns() {
  const box = $("#turns");
  box.innerHTML = state.turns.map((t, i) => {
    const name = nameOf(t.speaker);
    const chip = name
      ? `<button class="chip" data-chip="${t.id}" aria-label="Người nói của lượt ${i + 1}">${dot(t.speaker)}${esc(name)} ▾</button>`
      : `<button class="chip none" data-chip="${t.id}" aria-label="Người nói của lượt ${i + 1}">Chưa gán người ▾</button>`;
    return `<article class="turn ${state.selected.has(t.id) ? "sel" : ""} ${name ? "" : "bad"}" data-id="${t.id}">
      <div class="thead">
        <input type="checkbox" data-sel="${t.id}" ${state.selected.has(t.id) ? "checked" : ""} aria-label="Chọn lượt ${i + 1}">
        <span class="idx">#${i + 1}</span>${chip}
        <input type="text" class="style" data-style="${t.id}" value="${esc(t.style || "")}" placeholder="Giọng điệu (ví dụ: thì thầm)">
        <span class="tools">
          <button class="btn sm ghost" data-up="${t.id}" ${i === 0 ? "disabled" : ""} aria-label="Chuyển lên">↑</button>
          <button class="btn sm ghost" data-down="${t.id}" ${i === state.turns.length - 1 ? "disabled" : ""} aria-label="Chuyển xuống">↓</button>
          <button class="btn sm ghost" data-del="${t.id}" ${state.turns.length <= 1 ? "disabled" : ""} aria-label="Xóa lượt">✕</button>
        </span>
      </div>
      <textarea data-text="${t.id}" maxlength="${TURN_MAX_CHARS}" placeholder="Lời nói của lượt này">${esc(t.text)}</textarea>
    </article>`;
  }).join("");
  const hasText = state.turns.some((t) => t.text.trim());
  $("#dropFull").classList.toggle("hidden", hasText);
  $("#dropMini").classList.toggle("hidden", !hasText);
  renderBulk();
}

function renderSpeakers() {
  const taken = (key) => new Set(state.speakers.filter((s) => s.key !== key).map((s) => s.voice));
  $("#spkTitle").textContent = `Người nói (${state.speakers.length}/${MAX_SPEAKERS})`;
  $("#spks").innerHTML = state.speakers.map((s) => `
    <div class="spk" data-key="${s.key}">
      ${dot(s.key)}
      <input type="text" data-name="${s.key}" value="${esc(s.name)}" maxlength="40" aria-label="Tên người nói" style="font-weight:600">
      <button class="x" data-rm="${s.key}" ${state.speakers.length <= MIN_SPEAKERS ? "disabled title=\"Cần tối thiểu 2 người nói\"" : ""} aria-label="Xóa người nói">✕</button>
      <select data-voice="${s.key}" aria-label="Giọng AI">
        ${VOICES.map(([v, g]) => `<option value="${v}" ${v === s.voice ? "selected" : ""} ${taken(s.key).has(v) ? "disabled" : ""}>${v} · ${g}</option>`).join("")}
      </select>
    </div>`).join("");
  const add = $("#addSpk");
  add.disabled = state.speakers.length >= MAX_SPEAKERS;
  add.title = add.disabled ? "Tối đa 30 người nói" : "";
}

function renderBulk() {
  const n = state.selected.size;
  $("#bulk").classList.toggle("hidden", n === 0);
  if (!n) return;
  $("#bulkN").textContent = `Đã chọn ${n} lượt. Gán cho:`;
  $("#bulkWho").innerHTML = state.speakers.map((s) => `<button class="btn sm" data-bulk="${s.key}">${dot(s.key)}${esc(s.name)}</button>`).join("");
}

function renderSummary() {
  const probs = issues(state), used = usedKeys(state), un = unassigned(state).length;
  const chars = state.turns.reduce((n, t) => n + t.text.length, 0);
  $("#sTurns").textContent = state.turns.length;
  $("#sSpk").textContent = `${used.length} / ${state.speakers.length}`;
  $("#sUn").textContent = un;
  $("#sChars").textContent = chars.toLocaleString("vi-VN");
  $("#sDur").textContent = `~${Math.max(1, Math.round(chars / CHARS_PER_MINUTE))} phút`;
  const tag = $("#valTag"); tag.textContent = probs.length ? "Chưa hợp lệ" : "Hợp lệ"; tag.className = "tag " + (probs.length ? "err" : "ok");
  $("#issues").innerHTML = probs.slice(0, 6).map((p) => `<li>${esc(p)}</li>`).join("") + (probs.length > 6 ? `<li>…và ${probs.length - 6} lỗi khác</li>` : "");
  const path = $("#path");
  if (used.length === 2) { path.className = "alert"; path.textContent = "AI sẽ đọc bằng một request đa người nói cho mỗi đoạn (đường hiện có)."; }
  else { path.className = "alert warn"; path.textContent = `AI sẽ gọi từng lượt: ${state.turns.length} lượt gọi.` + (used.length > 2 ? " Chen lời |…| được đọc bằng cùng giọng người đang nói khi có hơn 2 người." : ""); }
  $("#saveState").textContent = probs.length ? "Chưa hợp lệ, chưa lưu" : "Đã lưu tự động";
  $("#saveState").style.color = probs.length ? "var(--danger)" : "var(--ok)";
}

function render() { renderTurns(); renderSpeakers(); renderSummary(); }

/* ---------- menu ---------- */
function closeMenu() { $("#menu").classList.add("hidden"); }
function openMenu(anchor, items, onPick) {
  const m = $("#menu");
  m.innerHTML = items.map((it, i) => `<button data-i="${i}">${it.html}</button>`).join("");
  const r = anchor.getBoundingClientRect();
  m.classList.remove("hidden");
  m.style.left = Math.min(r.left, innerWidth - 210) + "px";
  m.style.top = Math.min(r.bottom + 4, innerHeight - 320) + "px";
  m.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; onPick(items[+b.dataset.i]); closeMenu(); };
}
document.addEventListener("click", (e) => { if (!e.target.closest("#menu") && !e.target.closest("[data-chip]")) closeMenu(); });

/* ---------- events ---------- */
const turnById = (id) => state.turns.find((t) => t.id === id);
$("#turns").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-chip]");
  if (chip) {
    const t = turnById(chip.dataset.chip);
    openMenu(chip, state.speakers.map((s) => ({ key: s.key, html: `${dot(s.key)}${esc(s.name)}` })), (it) => { t.speaker = it.key; render(); });
    return;
  }
  const move = (id, d) => { const i = state.turns.findIndex((t) => t.id === id), j = i + d; if (j < 0 || j >= state.turns.length) return; [state.turns[i], state.turns[j]] = [state.turns[j], state.turns[i]]; render(); };
  if (e.target.closest("[data-up]")) return move(e.target.closest("[data-up]").dataset.up, -1);
  if (e.target.closest("[data-down]")) return move(e.target.closest("[data-down]").dataset.down, 1);
  const del = e.target.closest("[data-del]");
  if (del && state.turns.length > 1) { state.turns = state.turns.filter((t) => t.id !== del.dataset.del); state.selected.delete(del.dataset.del); render(); }
});
$("#turns").addEventListener("change", (e) => {
  const id = e.target.dataset.sel;
  if (id) { e.target.checked ? state.selected.add(id) : state.selected.delete(id); renderTurns(); }
});
$("#turns").addEventListener("input", (e) => {
  const t = turnById(e.target.dataset.text || e.target.dataset.style);
  if (!t) return;
  if (e.target.dataset.text) t.text = e.target.value; else t.style = e.target.value;
  renderSummary();
});

$("#bulkWho").addEventListener("click", (e) => {
  const b = e.target.closest("[data-bulk]"); if (!b) return;
  const n = state.selected.size;
  state.turns.forEach((t) => { if (state.selected.has(t.id)) t.speaker = b.dataset.bulk; });
  state.selected.clear(); render(); toast(`Đã gán ${n} lượt cho ${nameOf(b.dataset.bulk)}`);
});
$("#bulkClear").onclick = () => { state.selected.clear(); renderTurns(); };
$("#selUn").onclick = () => { unassigned(state).forEach((i) => state.selected.add(state.turns[i].id)); renderTurns(); };

$("#addTurn").onclick = () => {
  const last = state.turns.at(-1);
  const i = state.speakers.findIndex((s) => s.key === last?.speaker);
  const next = state.speakers[(i + 1) % state.speakers.length].key; // cycles, no A/B assumption
  if (state.turns.length >= MAX_TURNS) return toast(`Tối đa ${MAX_TURNS} lượt`);
  state.turns.push({ id: uid(), speaker: next, text: "", style: "" }); render();
};

/* speakers */
$("#addSpk").onclick = () => { if (addSpeaker(state)) render(); };
$("#spks").addEventListener("click", (e) => {
  const rm = e.target.closest("[data-rm]"); if (!rm || rm.disabled) return;
  const used = turnsOf(state, rm.dataset.rm);
  if (used) return toast(`${used} lượt đang dùng người này, hãy gán lại trước`);
  state.speakers = state.speakers.filter((s) => s.key !== rm.dataset.rm); render();
});
$("#spks").addEventListener("change", (e) => {
  const s = state.speakers.find((x) => x.key === (e.target.dataset.name || e.target.dataset.voice)); if (!s) return;
  if (e.target.dataset.name) s.name = e.target.value; else s.voice = e.target.value;
  render();
});

/* import */
let pending = null;
const pasteBox = $("#paste");
pasteBox.addEventListener("input", () => { $("#pasteInfo").textContent = pasteBox.value.trim() ? `${splitScript(pasteBox.value).paragraphs.length} đoạn` : ""; });
function doImport(mode) {
  const r = importTurns(state, pending.paragraphs, mode);
  if (r.error) { toast(r.error); return; }
  state.selected.clear(); pasteBox.value = ""; $("#pasteInfo").textContent = "";
  render();
  toast(`Đã nhập ${pending.paragraphs.length} lượt` + (pending.splitLong ? `. Đã tách thêm ${pending.splitLong} đoạn quá dài` : ""));
}
function startImport(text) {
  const r = splitScript(text);
  if (!r.paragraphs.length) return toast("Không thấy đoạn nào");
  pending = r;
  if (state.turns.some((t) => t.text.trim())) $("#mAsk").classList.remove("hidden"); else doImport("replace");
}
$("#split").onclick = () => startImport(pasteBox.value);
$("#sample").onclick = () => { pasteBox.value = SAMPLE; pasteBox.dispatchEvent(new Event("input")); };
$("#openPaste").onclick = () => { $("#dropFull").classList.remove("hidden"); $("#dropMini").classList.add("hidden"); pasteBox.focus(); };
$("#askCancel").onclick = () => $("#mAsk").classList.add("hidden");
$("#askAppend").onclick = () => { $("#mAsk").classList.add("hidden"); doImport("append"); };
$("#askReplace").onclick = () => { $("#mAsk").classList.add("hidden"); doImport("replace"); };

/* views */
function show(view) {
  document.querySelectorAll(".step[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === view));
  $("#v-script").classList.toggle("hidden", view !== "script");
  $("#v-voice").classList.toggle("hidden", view !== "voice");
  if (view === "voice") renderSheet();
}
document.querySelectorAll(".step[data-view]").forEach((b) => (b.onclick = () => show(b.dataset.view)));

function renderSheet() {
  $("#filters").innerHTML = [["ALL", "Tất cả"], ...state.speakers.map((s) => [s.key, s.name])]
    .map(([k, label]) => `<button class="btn sm ${state.filter === k ? "p" : ""}" data-f="${k}">${k === "ALL" ? "" : dot(k)}${esc(label)}</button>`).join("");
  $("#sheet").innerHTML = state.turns.map((t, i) => {
    const dim = state.filter !== "ALL" && state.filter !== t.speaker;
    return `<li class="${dim ? "dim" : ""}"><div class="who">${dot(t.speaker)}#${i + 1} · ${esc(nameOf(t.speaker) ?? "(chưa gán)")}${t.style ? ` <span class="tag">${esc(t.style)}</span>` : ""}</div><p>${esc(t.text) || '<span class="low">(chưa có lời)</span>'}</p></li>`;
  }).join("");
}
$("#filters").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { state.filter = b.dataset.f; renderSheet(); } });

/* AI generate (simulated) */
let timer;
$("#gen").onclick = () => {
  const probs = issues(state), used = usedKeys(state);
  const body = $("#genBody"), go = $("#genGo");
  go.disabled = probs.length > 0; go.classList.remove("hidden");
  const perTurn = used.length !== 2;
  const calls = perTurn ? state.turns.length : Math.max(1, Math.ceil(state.turns.reduce((n, t) => n + t.text.length, 0) / 3000));
  body.innerHTML = probs.length
    ? `<div class="alert err">Chưa thể tạo giọng AI:<br>${probs.slice(0, 5).map(esc).join("<br>")}${probs.length > 5 ? "<br>…" : ""}</div>`
    : `<table>
        <tr><td class="low">Đường tạo</td><td>${perTurn ? "Từng lượt (single-speaker)" : "Một request đa người nói"}</td></tr>
        <tr><td class="low">Số lượt gọi</td><td>${calls}</td></tr>
        <tr><td class="low">Người nói dùng</td><td>${used.length}</td></tr>
        <tr><td class="low">Nghỉ giữa lượt</td><td>${perTurn ? TURN_GAP_MS + " ms" : "không"}</td></tr>
      </table>
      <div class="meter"><span id="bar"></span></div><p class="low" id="genState">Sẵn sàng.</p>`;
  $("#mGen").classList.remove("hidden");
  go.onclick = () => {
    go.disabled = true; let done = 0; clearInterval(timer);
    timer = setInterval(() => {
      done++; $("#bar").style.width = (done / calls * 100) + "%"; $("#genState").textContent = `Đang tạo ${done}/${calls}`;
      if (done >= calls) { clearInterval(timer); $("#genState").textContent = `Xong: ${calls} lượt gọi (giả lập).`; }
    }, perTurn ? 90 : 400);
  };
};
$("#genClose").onclick = () => { clearInterval(timer); $("#mGen").classList.add("hidden"); };

render();
