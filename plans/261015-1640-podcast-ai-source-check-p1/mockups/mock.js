// Điều khiển mockup: view (data-panel/data-v/data-go), modal (data-open/data-close/data-step-go), hiện dần khi cuộn.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const panelOf = (e) => (e.dataset.target ? $(e.dataset.target) : e.closest("[data-panel]"));
function setView(p, v) {
  p.dataset.view = v;
  $$(":scope>[data-v]", p).forEach((e) => e.classList.toggle("on", e.dataset.v.split(" ").includes(v)));
  $$("[data-seg]").filter((e) => panelOf(e) === p).forEach((e) => e.classList.toggle("on", e.dataset.go === v));
  (p.dataset.auto || "").split(",").filter(Boolean).forEach((rule) => {
    const [from, to, ms] = rule.split(":");
    if (from === v) setTimeout(() => p.dataset.view === from && setView(p, to), +ms);
  });
  $$(".meter>span[data-fill]", p).forEach((m) => { m.style.width = "0"; requestAnimationFrame(() => requestAnimationFrame(() => (m.style.width = m.dataset.fill))); });
  p.dispatchEvent(new CustomEvent("view", { detail: v }));
}
function setStep(m, n) {
  m.dataset.step = n;
  $$("[data-s]", m).forEach((e) => e.classList.toggle("on", e.dataset.s.split(" ").includes(String(n))));
  $$(".dots span", m).forEach((d, i) => d.classList.toggle("on", i < n));
  const t = $(".dtitle", m), s = $(`[data-s~="${n}"][data-title]`, m); if (t && s) t.textContent = s.dataset.title;
  $$("[data-first]", m).forEach((p) => p.closest("[data-s]").dataset.s.split(" ").includes(String(n)) && setView(p, p.dataset.first));
}
document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]"), close = e.target.closest("[data-close]"), go = e.target.closest("[data-go]"), st = e.target.closest("[data-step-go]");
  if (open) { const m = $(open.dataset.open); m.classList.add("open"); setStep(m, +(open.dataset.at || 1)); }
  if (st) setStep(st.closest(".modal"), +st.dataset.stepGo);
  if (go) setView(panelOf(go), go.dataset.go);
  if (close) close.closest(".modal").classList.remove("open");
  if (e.target.classList.contains("modal")) e.target.classList.remove("open");
});
document.addEventListener("keydown", (e) => e.key === "Escape" && $$(".modal.open").forEach((m) => m.classList.remove("open")));
$$("[data-panel]").forEach((p) => setView(p, p.dataset.view));
$$(".modal").forEach((m) => setStep(m, 1));
const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && (x.target.classList.add("in"), io.unobserve(x.target))), { threshold: 0.05 });
$$(".wrap .card").forEach((el, i) => { el.classList.add("rv"); el.style.setProperty("--index", i % 6); io.observe(el); });
