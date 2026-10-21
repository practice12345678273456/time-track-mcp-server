// TimeTrack front-end: talks to the FastAPI routes in fast_api.py

let allEntries = [];

const $ = (id) => document.getElementById(id);

// Prevent user-typed text from being treated as HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const msg = Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return data;
}

// ---------- Rendering ----------

function renderStats(entries) {
  const hours = entries.reduce((sum, e) => sum + e.hours, 0);
  $("stat-hours").textContent = hours.toFixed(1);
  $("stat-entries").textContent = entries.length;
  $("stat-projects").textContent = new Set(entries.map((e) => e.project)).size;
  $("stat-employees").textContent = new Set(entries.map((e) => e.employee_name)).size;
}

function renderTable() {
  const q = $("search").value.trim().toLowerCase();
  const rows = allEntries.filter((e) =>
    [e.employee_name, e.project, e.description].join(" ").toLowerCase().includes(q)
  );

  $("entries-body").innerHTML = rows
    .map(
      (e) => `
      <tr>
        <td>${escapeHtml(e.entry_date)}</td>
        <td>${escapeHtml(e.employee_name)}</td>
        <td><span class="tag">${escapeHtml(e.project)}</span></td>
        <td class="num">${e.hours.toFixed(2)}</td>
        <td>${escapeHtml(e.description)}</td>
      </tr>`
    )
    .join("");

  $("empty").hidden = rows.length > 0;
}

function fillDatalists(entries) {
  const names = [...new Set(entries.map((e) => e.employee_name))].sort();
  $("employee-list").innerHTML = names.map((n) => `<option value="${escapeHtml(n)}">`).join("");
}

async function loadProjects() {
  const projects = await api("/api/projects");
  const select = $("summary-project");
  const current = select.value;

  $("project-list").innerHTML = projects.map((p) => `<option value="${escapeHtml(p)}">`).join("");
  select.innerHTML = projects.map((p) => `<option>${escapeHtml(p)}</option>`).join("");

  if (projects.includes(current)) select.value = current;
  if (projects.length) await loadSummary(select.value);
}

async function loadSummary(project) {
  const summary = await api(`/api/projects/${encodeURIComponent(project)}/summary`);
  const max = Math.max(...Object.values(summary.by_employee));

  $("summary-total").textContent = `${summary.total_hours.toFixed(1)} hours logged in total`;
  $("summary-bars").innerHTML = Object.entries(summary.by_employee)
    .map(
      ([name, hrs]) => `
      <div class="bar-row">
        <span class="bar-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(hrs / max) * 100}%"></div></div>
        <span class="bar-value">${hrs.toFixed(1)}h</span>
      </div>`
    )
    .join("");
}

async function loadEntries() {
  allEntries = await api("/api/entries");
  renderStats(allEntries);
  renderTable();
  fillDatalists(allEntries);
}

async function refresh() {
  await Promise.all([loadEntries(), loadProjects()]);
}

// ---------- Events ----------

$("entry-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector("button");
  const message = $("form-message");

  const data = Object.fromEntries(new FormData(form));
  data.hours = parseFloat(data.hours);

  button.disabled = true;
  try {
    await api("/api/entries", { method: "POST", body: JSON.stringify(data) });
    message.textContent = "Entry saved ✔";
    message.className = "message ok";
    form.hours.value = "";
    form.description.value = "";
    await refresh();
  } catch (err) {
    message.textContent = err.message;
    message.className = "message err";
  } finally {
    button.disabled = false;
  }
});

$("search").addEventListener("input", renderTable);
$("summary-project").addEventListener("change", (e) => loadSummary(e.target.value));

// Default the date field to today
document.querySelector('input[name="entry_date"]').value = new Date().toLocaleDateString("en-CA");

refresh().catch((err) => {
  $("form-message").textContent = "Could not reach the server: " + err.message;
  $("form-message").className = "message err";
});
