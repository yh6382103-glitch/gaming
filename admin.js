(function () {
  var $ = function (id) { return document.getElementById(id); };
  var cfg = window.UGC_CONFIG || {};
  var configured = cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf("YOUR-PROJECT") === -1 && cfg.SUPABASE_ANON_KEY && cfg.SUPABASE_ANON_KEY.indexOf("YOUR-") === -1;
  if (!configured || !window.supabase) { $("setup").classList.remove("hide"); return; }
  var db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function say(target, text, ok) { target.replaceChildren(); if (text) target.appendChild(el("div", "msg " + (ok ? "ok" : "err"), text)); }

  var players = [], editingId = null;

  async function checkAdmin() {
    var s = await db.auth.getSession();
    var user = s.data.session && s.data.session.user;
    if (!user) return show(false);
    var r = await db.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (r.data) { show(true); loadAll(); }
    else { await db.auth.signOut(); show(false); say($("loginMsg"), "This account is not an administrator.", false); }
  }
  function show(isAdmin) { $("dash").classList.toggle("hide", !isAdmin); $("loginView").classList.toggle("hide", isAdmin); }

  $("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var r = await db.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    if (r.error) return say($("loginMsg"), "Invalid email or password.", false);
    $("password").value = "";
    checkAdmin();
  });
  $("logout").addEventListener("click", async function () { await db.auth.signOut(); show(false); });

  async function loadAll() { await loadPlayers(); await loadBoard(); }

  async function loadPlayers() {
    var r = await db.from("players").select("*").order("created_at", { ascending: true });
    if (r.error) return say($("formMsg"), "Could not load players: " + r.error.message, false);
    players = r.data; $("total").textContent = players.length; render();
  }
  function render() {
    var q = $("q").value.trim().toLowerCase();
    var list = players.filter(function (p) { return !q || p.player_id.toLowerCase().indexOf(q) !== -1; });
    var body = $("rows"); body.replaceChildren();
    if (!list.length) { var tr = el("tr"), td = el("td", "empty", "No players found."); td.colSpan = 6; tr.appendChild(td); body.appendChild(tr); return; }
    list.forEach(function (p) {
      var tr = el("tr");
      [p.player_id, p.name, p.age, p.club_id, p.phone].forEach(function (v) { tr.appendChild(el("td", null, String(v))); });
      var act = el("td");
      var eb = el("button", "b sm ghost", "Edit"); eb.onclick = function () { startEdit(p); };
      var db_ = el("button", "b sm", "Delete"); db_.onclick = function () { del(p); };
      act.appendChild(eb); act.appendChild(db_); tr.appendChild(act); body.appendChild(tr);
    });
  }
  $("q").addEventListener("input", render);

  function validate(p) {
    var errs = [];
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(p.player_id)) errs.push("Player ID must be 1-32 letters, digits, - or _");
    if (!p.name) errs.push("Name is required");
    if (!/^\d{1,3}$/.test(p.age) || +p.age < 5 || +p.age > 100) errs.push("Age must be a number 5-100");
    if (!p.club_id) errs.push("Club ID is required");
    if (!/^[0-9+\s-]{6,20}$/.test(p.phone)) errs.push("Phone must contain only digits (6-20 characters)");
    return errs;
  }
  function readForm() {
    return { player_id: $("f_id").value.trim(), name: $("f_name").value.trim().replace(/\s+/g, " "), age: $("f_age").value.trim(), club_id: $("f_club").value.trim(), phone: $("f_phone").value.trim() };
  }
  function resetForm() {
    editingId = null; $("pform").reset(); $("f_id").disabled = false;
    $("formTitle").textContent = "Add Player"; $("saveBtn").textContent = "ADD PLAYER"; $("cancelEdit").classList.add("hide");
  }
  function startEdit(p) {
    editingId = p.player_id;
    $("f_id").value = p.player_id; $("f_id").disabled = true;
    $("f_name").value = p.name; $("f_age").value = p.age; $("f_club").value = p.club_id; $("f_phone").value = p.phone;
    $("formTitle").textContent = "Edit Player " + p.player_id; $("saveBtn").textContent = "SAVE CHANGES"; $("cancelEdit").classList.remove("hide");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $("cancelEdit").addEventListener("click", function () { resetForm(); say($("formMsg"), ""); });

  $("pform").addEventListener("submit", async function (e) {
    e.preventDefault();
    var p = readForm();
    if (editingId) p.player_id = editingId;
    var errs = validate(p);
    if (errs.length) return say($("formMsg"), errs.join("\n"), false);
    var row = { player_id: p.player_id, name: p.name, age: +p.age, club_id: p.club_id, phone: p.phone };
    var r;
    if (editingId) r = await db.from("players").update({ name: row.name, age: row.age, club_id: row.club_id, phone: row.phone }).eq("player_id", editingId);
    else r = await db.from("players").insert(row);
    if (r.error) return say($("formMsg"), r.error.code === "23505" ? "Player ID " + row.player_id + " already exists." : r.error.message, false);
    say($("formMsg"), editingId ? "Player updated." : "Player added.", true);
    resetForm(); loadPlayers();
  });

  async function del(p) {
    if (!confirm("Delete player " + p.player_id + " (" + p.name + ")? This cannot be undone.")) return;
    var r = await db.from("players").delete().eq("player_id", p.player_id);
    if (r.error) return say($("formMsg"), r.error.message, false);
    say($("formMsg"), "Player deleted.", true); loadPlayers();
  }

  // ---- Import ----
  var norm = function (k) { return String(k).trim().toLowerCase().replace(/[\s-]+/g, "_"); };
  var aliases = { player_id: ["player_id", "playerid", "id"], name: ["name", "full_name"], age: ["age"], club_id: ["club_id", "clubid", "club"], phone: ["phone", "phone_number", "phonenumber", "mobile"] };
  function pick(obj, key) {
    for (var i = 0; i < aliases[key].length; i++) if (obj[aliases[key][i]] !== undefined) return String(obj[aliases[key][i]]).trim();
    return undefined;
  }
  $("file").addEventListener("change", async function (e) {
    var f = e.target.files[0]; if (!f) return;
    var out = $("importMsg");
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) return say(out, "Unsupported file type. Use .csv, .xlsx or .xls.", false);
    if (f.size > 5 * 1024 * 1024) return say(out, "File too large (max 5 MB).", false);
    if (!window.XLSX) return say(out, "Excel reader failed to load. Check your connection.", false);
    try {
      var buf = await f.arrayBuffer();
      // raw:true + string cells keeps leading zeros in phone numbers when the sheet stores them as text
      var wb = XLSX.read(buf, { type: "array", raw: true, cellDates: false });
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
      if (!rows.length) return say(out, "The file has no data rows.", false);
      var first = {}; Object.keys(rows[0]).forEach(function (k) { first[norm(k)] = 1; });
      var missing = Object.keys(aliases).filter(function (k) { return !aliases[k].some(function (a) { return first[a]; }); });
      if (missing.length) return say(out, "Missing column(s): " + missing.join(", "), false);

      var good = [], bad = [], seen = {}, existing = {};
      players.forEach(function (p) { existing[p.player_id] = 1; });
      rows.forEach(function (raw, i) {
        var o = {}; Object.keys(raw).forEach(function (k) { o[norm(k)] = raw[k]; });
        var p = { player_id: pick(o, "player_id"), name: (pick(o, "name") || "").replace(/\s+/g, " "), age: pick(o, "age"), club_id: pick(o, "club_id"), phone: pick(o, "phone") };
        var errs = validate(p);
        if (!errs.length && existing[p.player_id]) errs.push("Player ID already exists");
        if (!errs.length && seen[p.player_id]) errs.push("Duplicate Player ID inside file");
        if (errs.length) bad.push("Row " + (i + 2) + ": " + errs.join("; "));
        else { seen[p.player_id] = 1; good.push({ player_id: p.player_id, name: p.name, age: +p.age, club_id: p.club_id, phone: p.phone }); }
      });
      var msg = "";
      if (good.length) {
        var r = await db.from("players").insert(good);
        if (r.error) return say(out, "Import failed: " + r.error.message, false);
        msg += "Imported " + good.length + " player(s).";
      }
      if (bad.length) msg += (msg ? "\n" : "") + "Skipped " + bad.length + " row(s):\n" + bad.slice(0, 15).join("\n") + (bad.length > 15 ? "\n…and " + (bad.length - 15) + " more" : "");
      say(out, msg || "Nothing to import.", good.length > 0 && !bad.length);
      loadPlayers();
    } catch (err) { say(out, "Could not read that file: " + err.message, false); }
    e.target.value = "";
  });

  // ---- Leaderboard ----
  async function loadBoard() {
    var r = await db.from("leaderboard").select("*").order("points", { ascending: false });
    var body = $("lrows"); body.replaceChildren();
    (r.data || []).forEach(function (row) {
      var tr = el("tr");
      [row.name, row.game, row.points].forEach(function (v) { tr.appendChild(el("td", null, String(v))); });
      var td = el("td"), b = el("button", "b sm", "Delete");
      b.onclick = async function () { if (confirm("Delete this entry?")) { await db.from("leaderboard").delete().eq("id", row.id); loadBoard(); } };
      td.appendChild(b); tr.appendChild(td); body.appendChild(tr);
    });
  }
  $("lform").addEventListener("submit", async function (e) {
    e.preventDefault();
    var r = await db.from("leaderboard").insert({ name: $("l_name").value.trim(), game: $("l_game").value, points: parseInt($("l_pts").value, 10) });
    if (!r.error) { $("lform").reset(); loadBoard(); }
  });

  checkAdmin();
})();
