// ============================================================
// ✈️ TRAVEL EXPENSE MANAGER — VERSION 2025.6
// MULTI-PAYER (CUSTOM AMOUNTS) | STRUCTURED SUMMARY | LOCALSTORAGE
// ============================================================

// ========== GLOBAL VARIABLES ==========
let users = new Set(JSON.parse(localStorage.getItem("users")) || []);
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

// DOM REFERENCES
const toastContainer = document.getElementById("toast-container");
const summaryDiv = document.getElementById("summary");
const paidByDropdown = document.getElementById("paid_by");
const userListContainer = document.getElementById("userList");
const paymentTypeDropdown = document.getElementById("payment_type");
const multiPayerContainer = document.getElementById("multiPayerContainer");
const multiPayerList = document.getElementById("multiPayerList");

// ========== INITIAL LOAD ==========
updatePaidByDropdown();
renderUserList();
renderMultiPayerList();
loadSummary();
togglePaidByUI(); // ensure UI matches current selection

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
  renderMultiPayerList();
  nameInput.value = "";

  showToast(`✅ Added member: ${name}`, "success");
}

// ============================================================
// 🧾 RENDER USER LIST & DROPDOWN
// ============================================================
function updatePaidByDropdown() {
  // single-payer dropdown
  if (!paidByDropdown) return;
  paidByDropdown.innerHTML = '<option value="">Select who paid</option>';
  users.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    paidByDropdown.appendChild(option);
  });
}

function renderUserList() {
  if (!userListContainer) return;
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
// 🔧 MULTI-PAYER INPUTS (each payer enters how much they actually paid)
// ============================================================
function renderMultiPayerList() {
  if (!multiPayerList) return;
  multiPayerList.innerHTML = "";
  users.forEach((name) => {
    const div = document.createElement("div");
    div.classList.add("user-row");
    div.innerHTML = `
      <label>${name}</label>
      <input type="number" class="multi-paid-input" data-username="${name}"
             placeholder="Amount paid by ${name} (leave 0 if none)" step="0.01" min="0">
    `;
    multiPayerList.appendChild(div);
  });
}

// ============================================================
// 🔄 TOGGLE PAID UI
// ============================================================
function togglePaidByUI() {
  const type = paymentTypeDropdown ? paymentTypeDropdown.value : null;
  if (type === "single") {
    if (paidByDropdown) paidByDropdown.style.display = "block";
    if (multiPayerContainer) multiPayerContainer.style.display = "none";
  } else if (type === "multiple") {
    if (paidByDropdown) paidByDropdown.style.display = "none";
    if (multiPayerContainer) multiPayerContainer.style.display = "block";
  } else {
    if (paidByDropdown) paidByDropdown.style.display = "none";
    if (multiPayerContainer) multiPayerContainer.style.display = "none";
  }
}

// Attach onchange handler if element exists
if (paymentTypeDropdown) {
  paymentTypeDropdown.addEventListener("change", () => {
    togglePaidByUI();
  });
}

// ============================================================
// 💸 ADD EXPENSE (handles single & multiple payers with custom paid amounts)
// ============================================================
document.getElementById("expenseForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const title = this.title.value.trim();
  const location = this.location.value.trim();
  const amount = parseFloat(this.amount.value.trim());
  const paymentType = paymentTypeDropdown ? paymentTypeDropdown.value : null;

  if (!title || !location || isNaN(amount) || !paymentType || users.size === 0) {
    return showToast("⚠ Fill all fields & add members first.", "error");
  }

  // Build paid_by data structure depending on paymentType
  let paid_by;
  if (paymentType === "single") {
    const selected = paidByDropdown.value.trim();
    if (!selected) return showToast("⚠ Please select who paid.", "error");
    // Represent single payer as object to normalize (payerName: amountPaid)
    paid_by = { [selected]: amount };
  } else { // multiple
    // read values from .multi-paid-input
    paid_by = {};
    let totalPaid = 0;
    document.querySelectorAll(".multi-paid-input").forEach((input) => {
      const user = input.dataset.username;
      const val = parseFloat(input.value);
      if (!isNaN(val) && val > 0) {
        paid_by[user] = val;
        totalPaid += val;
      }
    });

    // validate that sum of paid_by equals amount
    if (Math.abs(totalPaid - amount) > 0.01) {
      return showToast(`⚠ Sum of payer amounts (${totalPaid.toFixed(2)}) ≠ Total amount (${amount.toFixed(2)})`, "error");
    }
    // also ensure at least one payer contributed
    if (Object.keys(paid_by).length === 0) {
      return showToast("⚠ Enter amounts for at least one payer.", "error");
    }
  }

  // Read distribution (who owes how much)
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
    return showToast(`⚠ Total owed (${totalOwed.toFixed(2)}) ≠ Total amount (${amount.toFixed(2)})`, "error");
  }
  if (!valid) return showToast("⚠ Enter valid owed amounts.", "error");

  // Build normalized expense object
  const expense = {
    title,
    location,
    amount,
    paymentType,
    // store paid_by as an object: { name: amountPaid, ... }
    paid_by,
    distribution,
    date: new Date().toISOString()
  };

  expenses.push(expense);
  localStorage.setItem("expenses", JSON.stringify(expenses));

  showToast("✅ Expense added!", "success");
  this.reset();
  renderUserList();
  renderMultiPayerList();
  updatePaidByDropdown();
  togglePaidByUI();
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

// ============================================================
// 📈 CALCULATE SUMMARY (uses actual paid amounts from paid_by object)
// ============================================================
function calculateSummary(expenses) {
  const contributions = {}; // amount actually paid per user
  const owedTotals = {}; // amount each user should pay (from distribution)
  let total_expense = 0;

  expenses.forEach((exp) => {
    const { amount, paid_by, distribution } = exp;

    // paid_by is stored as object: {name: amountPaid, ...}
    for (const [payer, paidAmt] of Object.entries(paid_by || {})) {
      contributions[payer] = (contributions[payer] || 0) + (parseFloat(paidAmt) || 0);
      total_expense += parseFloat(paidAmt) || 0; // count actual paid amounts
    }

    for (const [user, owed] of Object.entries(distribution || {})) {
      owedTotals[user] = (owedTotals[user] || 0) + (parseFloat(owed) || 0);
    }
  });

  // Ensure every known user is present in sets (users might have zero paid or zero owed)
  const allUsers = new Set([...Array.from(users), ...Object.keys(contributions), ...Object.keys(owedTotals)]);
  const net_contributions = [];

  allUsers.forEach((person) => {
    const paid = contributions[person] || 0;
    const should_pay = owedTotals[person] || 0;
    const net_balance = +(paid - should_pay); // positive => they should receive money
    net_contributions.push({ person, paid, should_pay, net_balance });
  });

  const settlements_statements = generateSettlements(net_contributions);
  return { total_expense, expenses, net_contributions, settlements_statements };
}

// ============================================================
// 🔁 GENERATE SETTLEMENTS
// ============================================================
function generateSettlements(net_contributions) {
  const debtors = net_contributions.filter(u => u.net_balance < -0.005).map(u => ({ ...u }));
  const creditors = net_contributions.filter(u => u.net_balance > 0.005).map(u => ({ ...u }));
  const statements = [];

  // sort debtors ascending (most negative first), creditors descending (most positive first)
  debtors.sort((a, b) => a.net_balance - b.net_balance);
  creditors.sort((a, b) => b.net_balance - a.net_balance);

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(creditor.net_balance, Math.abs(debtor.net_balance));
    if (amount <= 0.009) break;

    // create statement
    statements.push(`${debtor.person} ➡️ ₹${amount.toFixed(2)} ➡️ ${creditor.person}`);

    // update balances
    debtor.net_balance += amount;
    creditor.net_balance -= amount;

    // advance pointers
    if (Math.abs(debtor.net_balance) < 0.01) i++;
    if (Math.abs(creditor.net_balance) < 0.01) j++;
  }

  return statements.length ? statements : ["All settled up ✅"];
}

// ============================================================
// 🧮 RENDER STRUCTURED SUMMARY (full transparency)
// ============================================================
function renderSummaryHTML(data) {
  const { total_expense, expenses, net_contributions, settlements_statements } = data;

  // Expense history
  let expenseTable = `
    <h3>🧾 Expense History</h3>
    <table class="summary-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Location</th>
          <th>Paid By (actual amounts)</th>
          <th>Total (₹)</th>
          <th>Distribution (owed)</th>
        </tr>
      </thead>
      <tbody>
  `;
  expenses.forEach(exp => {
    const distDetails = Object.entries(exp.distribution || {})
      .map(([n, v]) => `${n}: ₹${Number(v).toFixed(2)}`).join("<br>");
    const payersDetails = Object.entries(exp.paid_by || {})
      .map(([n, v]) => `${n}: ₹${Number(v).toFixed(2)}`).join("<br>");
    expenseTable += `
      <tr>
        <td>${escapeHtml(exp.title)}</td>
        <td>${escapeHtml(exp.location)}</td>
        <td>${payersDetails || "-"}</td>
        <td>₹${Number(exp.amount).toFixed(2)}</td>
        <td>${distDetails || "-"}</td>
      </tr>
    `;
  });
  expenseTable += "</tbody></table>";

  // Net contributions
  const contribTable = `
    <h3>💰 Net Contributions</h3>
    <table class="summary-table">
      <thead><tr><th>Name</th><th>Paid (₹)</th><th>Should Pay (₹)</th><th>Net (₹)</th></tr></thead>
      <tbody>
        ${net_contributions.map(u => `
          <tr>
            <td>${escapeHtml(u.person)}</td>
            <td>₹${u.paid.toFixed(2)}</td>
            <td>₹${u.should_pay.toFixed(2)}</td>
            <td class="${u.net_balance >= 0 ? 'pos' : 'neg'}">
              ${u.net_balance >= 0 ? '+' : ''}₹${u.net_balance.toFixed(2)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Settlements
  const settlementTable = `
    <h3>🔁 Settlements</h3>
    <table class="summary-table">
      <thead><tr><th>From</th><th>To</th><th>Amount (₹)</th></tr></thead>
      <tbody>
        ${settlements_statements.map(s => {
          // statements are in the form "A ➡️ ₹X.XX ➡️ B"
          const parts = s.split("➡️").map(p => p.trim());
          if (parts.length === 3) {
            const from = parts[0];
            const amt = parts[1].replace('₹','').trim();
            const to = parts[2];
            return `<tr><td>${escapeHtml(from)}</td><td>${escapeHtml(to)}</td><td>₹${amt}</td></tr>`;
          } else {
            return `<tr><td colspan="3">${escapeHtml(s)}</td></tr>`;
          }
        }).join('')}
      </tbody>
    </table>
  `;

  return `
    <div class="summary-section">
      <h3>📈 Total Expense: ₹${Number(total_expense).toFixed(2)}</h3>
      ${expenseTable}
      ${contribTable}
      ${settlementTable}
    </div>
  `;
}

// small helper to prevent basic HTML injection when rendering user-supplied strings
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  renderMultiPayerList();
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
