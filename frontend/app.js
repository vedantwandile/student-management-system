(() => {
  const API = (window.APP_CONFIG.API_BASE_URL || "").replace(/\/$/, "");
  const $ = (id) => document.getElementById(id);
  let editingId = null;     // studentId being edited, or null when adding
  let toastTimer = null;

  /* ---------- helpers ---------- */
  function toast(message, type = "success") {
    const el = $("toast");
    el.textContent = message;
    el.className = "toast " + type;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 4500);
  }

  async function api(path, options = {}) {
    let res;
    try {
      res = await fetch(API + path, {
        headers: { "Content-Type": "application/json" },
        ...options
      });
    } catch {
      throw new Error("Cannot reach the server. It may be starting up - wait a few seconds and try again.");
    }
    let body = {};
    try { body = await res.json(); } catch { /* non-JSON error */ }
    if (!res.ok) throw new Error(body.message || `Request failed (${res.status})`);
    return body;
  }

  /* ---------- navigation ---------- */
  function show(view) {
    document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== "view-" + view));
    document.querySelectorAll("#nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === view));
    if (view === "home") loadHome();
    if (view === "list") loadList();
    if (view === "add" && editingId === null) resetForm();
  }
  document.querySelectorAll("#nav button").forEach((b) =>
    b.addEventListener("click", () => { if (b.dataset.view === "add") editingId = null; show(b.dataset.view); }));
  document.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => { editingId = null; show(b.dataset.go); }));

  /* ---------- server status ---------- */
  async function checkHealth() {
    const box = $("status");
    try {
      const res = await fetch(API + "/health");
      const ok = res.ok;
      box.className = "status " + (ok ? "ok" : "down");
      $("statusText").textContent = ok ? "Server and database online" : "Database unavailable";
    } catch {
      box.className = "status down";
      $("statusText").textContent = "Server unreachable";
    }
  }

  /* ---------- table rendering (text nodes only, so data can't inject HTML) ---------- */
  function renderTable(container, students, emptyMessage) {
    container.replaceChildren();
    if (!students.length) {
      const d = document.createElement("div");
      d.className = "empty";
      d.textContent = emptyMessage;
      container.appendChild(d);
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const table = document.createElement("table");
    const head = table.createTHead().insertRow();
    ["Student ID", "Name", "Email", "Department", "Semester", "Contact", ""].forEach((h) => {
      const th = document.createElement("th"); th.textContent = h; head.appendChild(th);
    });
    const body = table.createTBody();
    students.forEach((s) => {
      const tr = body.insertRow();
      [s.studentId, s.name, s.email, s.department, s.semester, s.contact || "–"].forEach((v) => {
        tr.insertCell().textContent = v;
      });
      const actions = tr.insertCell();
      actions.className = "row-actions";
      const edit = document.createElement("button");
      edit.className = "btn small"; edit.textContent = "Edit";
      edit.addEventListener("click", () => startEdit(s));
      const del = document.createElement("button");
      del.className = "btn small danger"; del.textContent = "Delete";
      del.addEventListener("click", () => confirmDelete(s));
      actions.append(edit, del);
    });
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  /* ---------- Home ---------- */
  async function loadHome() {
    try {
      const { data } = await api("/api/students");
      $("statTotal").textContent = data.length;
      $("statDepts").textContent = new Set(data.map((s) => s.department.toLowerCase())).size;
    } catch { $("statTotal").textContent = "–"; $("statDepts").textContent = "–"; }
  }

  /* ---------- List ---------- */
  async function loadList() {
    $("listTable").innerHTML = '<div class="empty">Loading students…</div>';
    try {
      const { data } = await api("/api/students");
      renderTable($("listTable"), data, "No students yet. Use “Add student” to create the first record.");
    } catch (e) {
      renderTable($("listTable"), [], e.message);
      toast(e.message, "error");
    }
  }

  /* ---------- Search ---------- */
  $("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $("searchInput").value.trim();
    if (!q) return toast("Enter a Student ID, name, email or department to search.", "error");
    $("searchTable").innerHTML = '<div class="empty">Searching…</div>';
    try {
      const { data } = await api("/api/students?search=" + encodeURIComponent(q));
      renderTable($("searchTable"), data, `No students match “${q}”.`);
    } catch (err) {
      renderTable($("searchTable"), [], err.message);
      toast(err.message, "error");
    }
  });

  /* ---------- Add / Edit ---------- */
  function resetForm() {
    $("studentForm").reset();
    $("studentId").disabled = false;
    $("formTitle").textContent = "Add student";
    $("submitBtn").textContent = "Add student";
    $("cancelEdit").hidden = true;
    $("formError").hidden = true;
  }

  function startEdit(s) {
    editingId = s.studentId;
    show("add");
    $("formTitle").textContent = "Edit student " + s.studentId;
    $("submitBtn").textContent = "Save changes";
    $("cancelEdit").hidden = false;
    $("studentId").value = s.studentId;
    $("studentId").disabled = true;
    $("name").value = s.name;
    $("email").value = s.email;
    $("department").value = s.department;
    $("semester").value = s.semester;
    $("contact").value = s.contact || "";
  }
  $("cancelEdit").addEventListener("click", () => { editingId = null; show("list"); });

  function validate(d) {
    if (!d.studentId) return "Enter a Student ID.";
    if (!d.name) return "Enter the student's name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return "Enter a valid email address.";
    if (!d.department) return "Enter the department.";
    if (!(d.semester >= 1 && d.semester <= 8)) return "Semester must be a number from 1 to 8.";
    if (d.contact && !/^\d{10}$/.test(d.contact)) return "Contact number must be exactly 10 digits.";
    return "";
  }

  $("studentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      studentId: f.studentId.value.trim(),
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      department: f.department.value.trim(),
      semester: Number(f.semester.value),
      contact: f.contact.value.trim()
    };
    const problem = validate(data);
    $("formError").hidden = !problem;
    $("formError").textContent = problem;
    if (problem) return;

    const btn = $("submitBtn");
    btn.disabled = true;
    try {
      if (editingId) {
        const res = await api("/api/students/" + encodeURIComponent(editingId), { method: "PUT", body: JSON.stringify(data) });
        toast(res.message);
        editingId = null;
        show("list");
      } else {
        const res = await api("/api/students", { method: "POST", body: JSON.stringify(data) });
        toast(res.message);
        resetForm();
      }
    } catch (err) {
      $("formError").textContent = err.message;
      $("formError").hidden = false;
      toast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- Delete ---------- */
  function confirmDelete(s) {
    const dlg = $("confirmDialog");
    $("confirmText").textContent = `${s.name} (${s.studentId}) will be permanently removed.`;
    dlg.returnValue = "";
    dlg.onclose = async () => {
      if (dlg.returnValue !== "delete") return;
      try {
        const res = await api("/api/students/" + encodeURIComponent(s.studentId), { method: "DELETE" });
        toast(res.message);
        loadList();
        if (!$("view-search").hidden) $("searchForm").requestSubmit();
      } catch (err) { toast(err.message, "error"); }
    };
    dlg.showModal();
  }

  /* ---------- init ---------- */
  checkHealth();
  loadHome();
})();
