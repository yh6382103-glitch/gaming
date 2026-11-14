(function () {
  var cfg = window.UGC_CONFIG || {};
  var configured = cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf("YOUR-PROJECT") === -1 && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY.indexOf("YOUR-") === -1;
  var db = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  // nav
  var burger = document.getElementById("burger"), links = document.getElementById("links");
  burger.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", function (e) { if (e.target.tagName === "A") { links.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); } });
  var secs = ["home", "about", "players", "leaderboard", "contact"];
  window.addEventListener("scroll", function () {
    var cur = "home";
    secs.forEach(function (id) { var el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 120) cur = id; });
    links.querySelectorAll("a").forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + cur); });
  }, { passive: true });
  document.getElementById("goSearch").addEventListener("click", function () { setTimeout(function () { document.getElementById("pid").focus(); }, 400); });

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function field(label, value) { var f = el("div", "field"); f.appendChild(el("small", null, label)); f.appendChild(el("span", null, value)); return f; }

  var result = document.getElementById("result");
  function showMessage(title, msg) {
    result.replaceChildren();
    var c = el("div", "card notfound");
    c.appendChild(el("h3", null, title));
    c.appendChild(el("p", null, msg));
    result.appendChild(c);
  }
  function showPlayer(p) {
    result.replaceChildren();
    result.appendChild(el("div", "flash ok", "Player information retrieved successfully!"));
    var c = el("div", "card");
    c.appendChild(el("span", "verified", "PLAYER VERIFIED"));
    c.appendChild(el("h3", null, p.name));
    var pid = el("div", "pid", "PLAYER ID: "); pid.appendChild(el("b", null, p.player_id));
    c.appendChild(pid);
    var f = el("div", "fields");
    f.appendChild(field("Age", String(p.age)));
    f.appendChild(field("Club ID", p.club_id));
    f.appendChild(field("Phone Number", p.phone));
    c.appendChild(f);
    result.appendChild(c);
  }

  document.getElementById("searchForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var id = document.getElementById("pid").value.trim();
    var btn = document.getElementById("searchBtn");
    if (!id) return;
    if (!db) { showMessage("DATABASE NOT CONNECTED", "Add your Supabase URL and anon key in config.js (see README.md)."); return; }
    btn.disabled = true;
    try {
      var r = await db.rpc("lookup_player", { p_id: id });
      if (r.error) throw r.error;
      if (r.data && r.data.length) showPlayer(r.data[0]);
      else showMessage("PLAYER NOT FOUND!", "The Player ID you entered does not exist in our database. Please check your ID and try again.");
    } catch (err) {
      showMessage("SEARCH ERROR", "Could not reach the database. Please try again in a moment.");
    } finally { btn.disabled = false; }
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // leaderboard
  (async function () {
    var body = document.getElementById("lbBody");
    function msg(t) { body.replaceChildren(); var tr = el("tr"), td = el("td", "empty", t); td.colSpan = 4; tr.appendChild(td); body.appendChild(tr); }
    if (!db) return msg("Leaderboard will appear once the database is connected.");
    var r = await db.from("leaderboard").select("name,game,points").order("points", { ascending: false }).limit(20);
    if (r.error) return msg("Leaderboard unavailable.");
    if (!r.data.length) return msg("No scores yet – check back after the first matches.");
    body.replaceChildren();
    r.data.forEach(function (row, i) {
      var tr = el("tr");
      [i + 1, row.name, row.game, row.points].forEach(function (v) { tr.appendChild(el("td", null, String(v))); });
      body.appendChild(tr);
    });
  })();
})();
