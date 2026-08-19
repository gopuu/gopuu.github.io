let employeeRows = [];
let employeeModal;

const pageMeta = {
  dashboard: { title: "Dashboard", subtitle: "Overview" },
  employees: { title: "Employee Master", subtitle: "Manage employee records" }
};

document.addEventListener("DOMContentLoaded", () => {
  employeeModal = new bootstrap.Modal(document.getElementById("employeeModal"));

  document.querySelectorAll(".nav-link[data-page]").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  document.getElementById("dashboardEmployeesBtn").addEventListener("click", () => showPage("employees"));
  document.getElementById("addEmployeeBtn").addEventListener("click", () => openEmployeeModal());
  document.getElementById("refreshBtn").addEventListener("click", refreshCurrentPage);
  document.getElementById("employeeSearch").addEventListener("input", renderEmployees);
  document.getElementById("employeeForm").addEventListener("submit", saveEmployee);
  document.getElementById("mobileMenuBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  CRM_API.init();
  setTimeout(loadDashboard, 1000);
});

async function loadDashboard() {
  try {
    const result = await CRM_API.call("dashboard");
    document.getElementById("employeeCount").textContent = result.employeeCount ?? 0;
  } catch (e) {
    showAlert(e.message, "danger");
  }
}

async function loadEmployees() {
  setLoading(true);
  try {
    const result = await CRM_API.call("employee_list");
    employeeRows = result.rows || [];
    renderEmployees();
    document.getElementById("employeeCount").textContent = employeeRows.length;
  } catch (e) {
    showAlert(e.message, "danger");
  } finally {
    setLoading(false);
  }
}

function showPage(page) {
  document.querySelectorAll(".page-section").forEach(x => x.classList.add("d-none"));
  document.getElementById("page-" + page).classList.remove("d-none");

  document.querySelectorAll(".nav-link[data-page]").forEach(x => {
    x.classList.toggle("active", x.dataset.page === page);
  });

  document.getElementById("pageTitle").textContent = pageMeta[page].title;
  document.getElementById("pageSubtitle").textContent = pageMeta[page].subtitle;

  if (page === "employees") loadEmployees();
  if (window.innerWidth < 992) document.getElementById("sidebar").classList.remove("open");
}

async function refreshCurrentPage() {
  const active = document.querySelector(".nav-link.active")?.dataset.page || "dashboard";
  if (active === "dashboard") await loadDashboard();
  else if (active === "employees") await loadEmployees();
}

function renderEmployees() {
  const tbody = document.getElementById("employeeTbody");
  const q = document.getElementById("employeeSearch").value.trim().toLowerCase();

  const filtered = employeeRows.filter(x =>
    Object.values(x).some(v => String(v ?? "").toLowerCase().includes(q))
  );

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5 text-muted">No employees found.</td></tr>`;
  } else {
    tbody.innerHTML = filtered.map((x, i) => {
      const fullName = [x.FirstName, x.LastName].filter(Boolean).join(" ");
      const statusClass = String(x.Status).toLowerCase() === "active"
        ? "badge-active" : "badge-inactive";
      return `
        <tr>
          <td>${i + 1}</td>
          <td><span class="fw-semibold">${esc(x.EmployeeCode)}</span></td>
          <td>${esc(fullName)}</td>
          <td>${esc(x.Mobile)}</td>
          <td>${esc(x.Email)}</td>
          <td>${esc(x.Department)}</td>
          <td>${esc(x.Designation)}</td>
          <td><span class="badge-status ${statusClass}">${esc(x.Status || "Inactive")}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-light me-1" title="Edit" onclick="editEmployee('${escAttr(x.EmployeeId)}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-light text-danger" title="Delete" onclick="deleteEmployee('${escAttr(x.EmployeeId)}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
    }).join("");
  }

  document.getElementById("employeeSummary").textContent =
    `${filtered.length} of ${employeeRows.length} record(s)`;
}

function openEmployeeModal(row = null) {
  document.getElementById("employeeForm").reset();
  document.getElementById("EmployeeId").value = row?.EmployeeId || "";
  document.getElementById("EmployeeCode").value = row?.EmployeeCode || "";
  document.getElementById("FirstName").value = row?.FirstName || "";
  document.getElementById("LastName").value = row?.LastName || "";
  document.getElementById("Mobile").value = row?.Mobile || "";
  document.getElementById("Email").value = row?.Email || "";
  document.getElementById("Department").value = row?.Department || "";
  document.getElementById("Designation").value = row?.Designation || "";
  document.getElementById("JoiningDate").value = normalizeDateForInput(row?.JoiningDate);
  document.getElementById("Status").value = row?.Status || "Active";
  document.getElementById("Address").value = row?.Address || "";
  document.getElementById("City").value = row?.City || "";
  document.getElementById("State").value = row?.State || "";
  document.getElementById("Pincode").value = row?.Pincode || "";

  document.getElementById("employeeModalTitle").textContent =
    row ? "Edit Employee" : "Add Employee";
  document.querySelector(".save-text").textContent =
    row ? "Update Employee" : "Save Employee";

  employeeModal.show();
}

function editEmployee(id) {
  const row = employeeRows.find(x => String(x.EmployeeId) === String(id));
  if (row) openEmployeeModal(row);
}

async function saveEmployee(e) {
  e.preventDefault();

  const data = {
    EmployeeId: document.getElementById("EmployeeId").value.trim(),
    EmployeeCode: document.getElementById("EmployeeCode").value.trim(),
    FirstName: document.getElementById("FirstName").value.trim(),
    LastName: document.getElementById("LastName").value.trim(),
    Mobile: document.getElementById("Mobile").value.trim(),
    Email: document.getElementById("Email").value.trim(),
    Department: document.getElementById("Department").value.trim(),
    Designation: document.getElementById("Designation").value.trim(),
    JoiningDate: document.getElementById("JoiningDate").value,
    Status: document.getElementById("Status").value,
    Address: document.getElementById("Address").value.trim(),
    City: document.getElementById("City").value.trim(),
    State: document.getElementById("State").value.trim(),
    Pincode: document.getElementById("Pincode").value.trim()
  };

  if (!data.EmployeeCode || !data.FirstName) {
    showAlert("Employee Code and First Name are required.", "warning");
    return;
  }

  const btn = document.getElementById("saveEmployeeBtn");
  btn.disabled = true;
  document.getElementById("saveSpinner").classList.remove("d-none");

  try {
    await CRM_API.call("employee_save", data);
    employeeModal.hide();
    showAlert("Employee saved successfully.", "success");
    await loadEmployees();
  } catch (err) {
    showAlert(err.message, "danger");
  } finally {
    btn.disabled = false;
    document.getElementById("saveSpinner").classList.add("d-none");
  }
}

async function deleteEmployee(id) {
  const row = employeeRows.find(x => String(x.EmployeeId) === String(id));
  if (!row) return;

  if (!confirm(`Delete employee "${[row.FirstName, row.LastName].filter(Boolean).join(" ")}"?`)) return;

  setLoading(true);
  try {
    await CRM_API.call("employee_delete", { EmployeeId: id });
    showAlert("Employee deleted successfully.", "success");
    await loadEmployees();
  } catch (e) {
    showAlert(e.message, "danger");
  } finally {
    setLoading(false);
  }
}

function normalizeDateForInput(value) {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function setLoading(show) {
  document.getElementById("loadingOverlay").classList.toggle("d-none", !show);
}

function showAlert(message, type = "info") {
  const host = document.getElementById("alertHost");
  const id = "alert_" + Date.now();
  host.innerHTML = `
    <div id="${id}" class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${esc(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
  setTimeout(() => document.getElementById(id)?.remove(), 5000);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escAttr(value) { return esc(value); }
