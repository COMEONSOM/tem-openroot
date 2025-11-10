// ============================================================
// ✈️ TRAVEL EXPENSE MANAGER — LOCAL VERSION 2.0
// NO AUTH SYSTEM | LOCALSTORAGE-BASED DATA
// ============================================================

// ========== GLOBAL VARIABLES ==========
let users = new Set(JSON.parse(localStorage.getItem("users")) || []);
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

// DOM REFERENCES
const toastContainer = document.getElementById("toast-container");
const summaryDiv = document.getElementById("summary");
const paidByDropdown = document.getElementById("paid_by");
const userListContainer = document.getElementById("userList");

// ========== INITIAL LOAD ==========
updatePaidByDropdown();
renderUserList();
loadSummary();

// ============================================================
// 👥 ADD USER
// ============================================================
function addUser() {
  const nameInput = document.getElementById("newUserName");
  const name = nameInput.value.trim();

  if (!name || users.has(name)) {
    return showToast("⚠ Enter a unique member name.", "error");
  }

  users.add(name);
  localStorage.setItem("users", JSON.stringify([...users]));

  updatePaidByDropdown();
  renderUserList();
  nameInput.value = "";

  showToast(`✅ Added member: ${name}`, "success");
}

// ============================================================
// 🧾 RENDER USER LIST & DROPDOWN
// ============================================================
function updatePaidByDropdown() {
  paidByDropdown.innerHTML = '<option value="">Who Paid?</option>';
  users.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    paidByDropdown.appendChild(option);
  });
}

function renderUserList() {
  userListContainer.innerHTML = "";
  users.forEach((name) => {
    const div = document.createElement("div");
    div.classList.add("user-row");
    div.innerHTML = `
      <label>${name}</label>
      <input type="number" class="owed-input" data-username="${name}"
             placeholder="Amount owed by ${name}" step="0.01" required>
    `;
    userListContainer.appendChild(div);
  });
}

// ============================================================
// 💸 ADD EXPENSE
// ============================================================
document.getElementById("expenseForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const title = this.title.value.trim();
  const location = this.location.value.trim();
  const amount = parseFloat(this.amount.value.trim());
  const paidBy = this.paid_by.value.trim();

  if (!title || !location || isNaN(amount) || !paidBy || users.size === 0) {
    return showToast("⚠ Fill all fields & add members first.", "error");
  }

  const distribution = {};
  let valid = true;

  document.querySelectorAll(".owed-input").forEach((input) => {
    const user = input.dataset.username;
    const owed = parseFloat(input.value);
    if (isNaN(owed)) valid = false;
    distribution[user] = owed || 0;
  });

  const totalOwed = Object.values(distribution).reduce((sum, val) => sum + val, 0);
  if (Math.abs(totalOwed - amount) > 0.01) {
    return showToast(`⚠ Total owed (${totalOwed}) ≠ Total amount (${amount})`, "error");
  }

  if (!valid) return showToast("⚠ Enter valid owed amounts.", "error");

  const expense = {
    title,
    location,
    amount,
    paid_by: paidBy,
    distribution,
    date: new Date().toISOString()
  };

  expenses.push(expense);
  localStorage.setItem("expenses", JSON.stringify(expenses));

  showToast("✅ Expense added!", "success");
  this.reset();
  renderUserList();
  loadSummary();
});

// ============================================================
// 📊 LOAD & RENDER SUMMARY
// ============================================================
function loadSummary() {
  if (expenses.length === 0) {
    summaryDiv.innerHTML = "<p>🗒️ No expenses yet. Add one above!</p>";
    return;
  }

  const summary = calculateSummary(expenses);
  summaryDiv.innerHTML = renderSummaryHTML(summary);
}

// Calculate total, contributions, and settlements
function calculateSummary(expenses) {
  const contributions = {};
  const owedTotals = {};

  expenses.forEach((exp) => {
    const { amount, paid_by, distribution } = exp;

    contributions[paid_by] = (contributions[paid_by] || 0) + amount;

    for (const [user, owed] of Object.entries(distribution)) {
      owedTotals[user] = (owedTotals[user] || 0) + owed;
    }
  });

  const allUsers = new Set([...Object.keys(contributions), ...Object.keys(owedTotals)]);
  const net_contributions = [];
  let total_expense = 0;

  allUsers.forEach((person) => {
    const paid = contributions[person] || 0;
    const should_pay = owedTotals[person] || 0;
    const net_balance = paid - should_pay;
    total_expense += paid;
    net_contributions.push({ person, paid, should_pay, net_balance });
  });

  const settlements_statements = generateSettlements(net_contributions);
  return { total_expense, net_contributions, settlements_statements };
}

// Generate settlement suggestions
function generateSettlements(net_contributions) {
  const debtors = net_contributions.filter(u => u.net_balance < 0).map(u => ({ ...u }));
  const creditors = net_contributions.filter(u => u.net_balance > 0).map(u => ({ ...u }));
  const statements = [];

  debtors.sort((a, b) => a.net_balance - b.net_balance);
  creditors.sort((a, b) => b.net_balance - a.net_balance);

  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (debtor.net_balance === 0) break;
      if (creditor.net_balance === 0) continue;

      const amount = Math.min(creditor.net_balance, -debtor.net_balance);
      if (amount > 0) {
        statements.push(`${debtor.person} ➡️ ₹${amount.toFixed(2)} ➡️ ${creditor.person}`);
        debtor.net_balance += amount;
        creditor.net_balance -= amount;
      }
    }
  }

  return statements.length ? statements : ["All settled up ✅"];
}

// Render summary section
function renderSummaryHTML(data) {
  const { total_expense, net_contributions, settlements_statements } = data;

  return `
    <h3>💰 Total Expense: ₹${total_expense.toFixed(2)}</h3>
    <h3>📊 Contributions</h3>
    <ul>
      ${net_contributions
        .map(u =>
          `<li>${u.person}: Paid ₹${u.paid.toFixed(2)}, Owes ₹${u.should_pay.toFixed(2)}, Net: ₹${u.net_balance.toFixed(2)}</li>`
        ).join("")}
    </ul>
    <h3>🔁 Settlements</h3>
    <ul>${settlements_statements.map(s => `<li>${s}</li>`).join("")}</ul>
  `;
}

// ============================================================
// 🗑️ DELETE ALL DATA
// ============================================================
function deleteHistory() {
  if (!confirm("⚠️ This will delete all users and expenses permanently.")) return;

  localStorage.removeItem("users");
  localStorage.removeItem("expenses");
  users.clear();
  expenses = [];

  updatePaidByDropdown();
  renderUserList();
  loadSummary();

  showToast("🗑️ All expense history deleted.", "success");
}

// ============================================================
// 🔔 TOAST SYSTEM
// ============================================================
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  if (toastContainer.children.length > 5) {
    toastContainer.removeChild(toastContainer.firstChild);
  }

  setTimeout(() => toast.remove(), 4000);
}
