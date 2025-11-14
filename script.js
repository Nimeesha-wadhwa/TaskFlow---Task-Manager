const STORAGE_KEY = "taskflow_tasks_v1";
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

// DOM
const form = document.getElementById("taskForm");
const titleEl = document.getElementById("title");
const descEl = document.getElementById("description");
const catEl = document.getElementById("category");
const prioEl = document.getElementById("priority");
const dueEl = document.getElementById("due");
const addBtn = document.getElementById("addBtn");
const clearAllBtn = document.getElementById("clearAll");
const exportBtn = document.getElementById("exportBtn");
const printBtn = document.getElementById("printBtn");
const sortSelect = document.getElementById("sortSelect");

const taskList = document.getElementById("taskList");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const percentLarge = document.getElementById("percentLarge");

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function isValidIsoDate(s) {
  if (!s || typeof s !== "string") return false;
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const dd = parseInt(m[3], 10);
  if (mm < 1 || mm > 12) return false;
  const daysInMonth = new Date(y, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) return false;
  return true;
}

function parseDueInput(raw) {
  const v = (raw || "").trim();
  if (!v) return ""; // allow empty
  return isValidIsoDate(v) ? v : null;
}

function validateDueBeforeSave() {
  const dueEl = document.getElementById("due");
  const dueErrorEl = document.getElementById("dueError");

  const parsed = parseDueInput(dueEl.value);

  if (parsed === null) {
    dueErrorEl.style.display = "inline";
    dueErrorEl.textContent = "Format: YYYY-MM-DD (e.g. 2025-11-18)";
    return false; 
  }

  dueErrorEl.style.display = "none";
  return parsed; 
}
function addTask(e) {
  e.preventDefault();
  const title = titleEl.value.trim();
  if (!title) { alert("Please add a title"); return; }
  const dueVal=validateDueBeforeSave();
  if (dueVal===false) return;
  const t = {
    id: uid(),
    title,
    description: descEl.value.trim(),
    category: catEl.value,
    priority: prioEl.value,
    due: dueVal,
    status: "todo",
    created: Date.now()
  };

  tasks.push(t);
  save();
  renderTasks();
  form.reset();
}

function renderTasks() {
  // apply sort
  const sortBy = sortSelect.value || "created";
  let sorted = tasks.slice();
  if (sortBy === "due") {
    sorted.sort((a,b) => (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99"));
  } else if (sortBy === "priority") {
    const order = { "High": 0, "Medium": 1, "Low": 2, "": 3 };
    sorted.sort((a,b) => (order[a.priority] - order[b.priority]));
  } else { // created
    sorted.sort((a,b) => b.created - a.created);
  }

  taskList.innerHTML = "";
  if (!sorted.length) {
    taskList.innerHTML = '<div style="color:#7b8795;padding:22px">No tasks yet — use the form to add one.</div>';
    updateProgress();
    return;
  }

  sorted.forEach(t => {
    const card = document.createElement("div");
    card.className = "task";

    const left = document.createElement("div");
    left.className = "left";
    const h3 = document.createElement("h3");
    h3.textContent = t.title;
    left.appendChild(h3);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<strong>Priority:</strong> ${t.priority || '-'} &nbsp; • &nbsp; <strong>Category:</strong> ${t.category || '-'} &nbsp; • &nbsp; <strong>Due:</strong> ${t.due || '-'}`;
    left.appendChild(meta);

    if (t.description) {
      const p = document.createElement("p");
      p.style.margin = "8px 0 0";
      p.style.color = "#596a78";
      p.textContent = t.description;
      left.appendChild(p);
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const doneBtn = document.createElement("button");
    doneBtn.className = "action-btn done";
    doneBtn.textContent = (t.status === "done") ? "Undone" : "Done";
    doneBtn.onclick = () => {
      t.status = (t.status === "done") ? "todo" : "done";
      save();
      renderTasks();
    };

    const editBtn = document.createElement("button");
    editBtn.className = "action-btn edit";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => {
      titleEl.value = t.title;
      descEl.value = t.description;
      catEl.value = t.category;
      prioEl.value = t.priority;
      dueEl.value = t.due;
      tasks = tasks.filter(x => x.id !== t.id);
      save();
      renderTasks();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const delBtn = document.createElement("button");
    delBtn.className = "action-btn del";
    delBtn.textContent = "Delete";
    delBtn.onclick = () => {

      tasks = tasks.filter(x => x.id !== t.id);
      save();
      renderTasks();
    };

    actions.appendChild(doneBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(left);
    card.appendChild(actions);
    taskList.appendChild(card);
  });

  updateProgress();
}

function updateProgress() {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  progressFill.style.width = pct + "%";
  progressText.innerText = `${done} / ${total} completed`;
  percentLarge.innerText = pct + "%";
}

function clearAll() {
  if (!confirm("Delete ALL tasks? This cannot be undone.")) return;
  tasks = [];
  save();
  renderTasks();
}

function exportTasks() {
  const data = JSON.stringify(tasks, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "taskflow_tasks.json";
  a.click();
  URL.revokeObjectURL(url);
}


function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

form.addEventListener("submit", addTask);
clearAllBtn.addEventListener("click", clearAll);
exportBtn.addEventListener("click", exportTasks);
printBtn.addEventListener("click", printableView);
sortSelect.addEventListener("change", renderTasks);

// initial render
renderTasks();
