// ── DATA STORE ──────────────────────────────────────────
const db = {
  items: [
    { id:1,  code:'ITM001', name:'Unga Maize Flour 2kg', unit:'pack',   price:145, cost:110, stock:200 },
    { id:2,  code:'ITM002', name:'Cooking Oil 1L',       unit:'bottle', price:320, cost:250, stock:150 },
    { id:3,  code:'ITM003', name:'Sugar 1kg',            unit:'kg',     price:85,  cost:65,  stock:300 },
    { id:4,  code:'ITM004', name:'Milk Fresh 500ml',     unit:'pack',   price:60,  cost:45,  stock:250 },
    { id:5,  code:'ITM005', name:'Bread White Loaf',     unit:'loaf',   price:65,  cost:48,  stock:120 },
    { id:6,  code:'ITM006', name:'Rice Basmati 1kg',     unit:'kg',     price:180, cost:140, stock:180 },
    { id:7,  code:'ITM007', name:'Tomato Sauce 500g',    unit:'jar',    price:110, cost:80,  stock:90  },
    { id:8,  code:'ITM008', name:'Eggs (tray of 30)',    unit:'tray',   price:450, cost:380, stock:60  },
    { id:9,  code:'ITM009', name:'Beef (per kg)',        unit:'kg',     price:800, cost:650, stock:50  },
    { id:10, code:'ITM010', name:'Soft Drink 500ml',     unit:'bottle', price:70,  cost:50,  stock:200 },
  ],
  transactions: [],
  priceHistory: [],
  inventoryLog: [],
  nextTxnId: 1,
};

let cart = [];
let currentUser = null;
const STORAGE_KEY = 'sasDataV1';

const users = [
  { empID: 'M001', firstName: 'Sarabel', role: 'manager', password: 'pass123' },
  { empID: 'M002', firstName: 'Kendie', role: 'manager', password: 'pass123' },
  { empID: 'C001', firstName: 'Brian', role: 'cashier', password: 'pass123' },
  { empID: 'C002', firstName: 'Diana', role: 'cashier', password: 'pass123' },
  { empID: 'I001', firstName: 'Kevin', role: 'inventory', password: 'pass123' },
  { empID: 'I002', firstName: 'Faith', role: 'inventory', password: 'pass123' },
];

const roleViews = {
  manager: ['dashboard', 'stats', 'prices', 'reprint'],
  cashier: ['pos', 'dashboard'],
  inventory: ['inventory', 'dashboard'],
};

function getDefaultDb() {
  return {
    items: [
      { id:1,  code:'ITM001', name:'Unga Maize Flour 2kg', unit:'pack',   price:145, cost:110, stock:200 },
      { id:2,  code:'ITM002', name:'Cooking Oil 1L',       unit:'bottle', price:320, cost:250, stock:150 },
      { id:3,  code:'ITM003', name:'Sugar 1kg',            unit:'kg',     price:85,  cost:65,  stock:300 },
      { id:4,  code:'ITM004', name:'Milk Fresh 500ml',     unit:'pack',   price:60,  cost:45,  stock:250 },
      { id:5,  code:'ITM005', name:'Bread White Loaf',     unit:'loaf',   price:65,  cost:48,  stock:120 },
      { id:6,  code:'ITM006', name:'Rice Basmati 1kg',     unit:'kg',     price:180, cost:140, stock:180 },
      { id:7,  code:'ITM007', name:'Tomato Sauce 500g',    unit:'jar',    price:110, cost:80,  stock:90  },
      { id:8,  code:'ITM008', name:'Eggs (tray of 30)',    unit:'tray',   price:450, cost:380, stock:60  },
      { id:9,  code:'ITM009', name:'Beef (per kg)',        unit:'kg',     price:800, cost:650, stock:50  },
      { id:10, code:'ITM010', name:'Soft Drink 500ml',     unit:'bottle', price:70,  cost:50,  stock:200 },
    ],
    transactions: [],
    priceHistory: [],
    inventoryLog: [],
    nextTxnId: 1,
  };
}

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function loadDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const defaults = getDefaultDb();
    Object.assign(db, defaults);
    saveDb();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.transactions)) {
      throw new Error('Invalid persisted data');
    }
    Object.assign(db, {
      items: parsed.items,
      transactions: parsed.transactions || [],
      priceHistory: parsed.priceHistory || [],
      inventoryLog: parsed.inventoryLog || [],
      nextTxnId: parsed.nextTxnId || 1,
    });
  } catch (err) {
    const defaults = getDefaultDb();
    Object.assign(db, defaults);
    saveDb();
  }
}

function setTheme(theme) {
  const selected = theme === 'light' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', selected);
  localStorage.setItem('sasTheme', selected);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = selected === 'dark' ? 'Light Mode' : 'Dark Mode';
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'dark';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// ── CLOCK ────────────────────────────────────────────────
function updateClock() {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('en-GB');
}
setInterval(updateClock, 1000);
updateClock();

// ── NAVIGATION ───────────────────────────────────────────
function showView(id, btn) {
  if (currentUser && !roleViews[currentUser.role].includes(id)) {
    toast('Access denied for your role', 'danger');
    return;
  }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  if (btn) btn.classList.add('active');

  if (id === 'inventory')  renderInventoryTable();
  if (id === 'stats')      renderStats();
  if (id === 'prices')     renderPriceTable();
  if (id === 'reprint')    renderReprintTable();
  if (id === 'dashboard')  renderDashboard();
  if (id === 'pos')        renderProductList();
}

function applyRoleAccess() {
  const allowed = roleViews[currentUser.role] || [];
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const view = btn.dataset.view;
    btn.style.display = allowed.includes(view) ? 'flex' : 'none';
  });
}

async function login(empID, password) {
  const user = users.find(u => u.empID === empID && u.password === password);
  if (!user) throw new Error('Invalid credentials. Please check Employee ID and password.');
  currentUser = { empID: user.empID, firstName: user.firstName, role: user.role };
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('active-user').textContent = `${user.firstName} (${user.role})`;
  document.getElementById('logout-btn').style.display = 'inline-flex';
  document.getElementById('login-screen').style.display = 'none';
  applyRoleAccess();
  const defaultView = roleViews[currentUser.role][0];
  const defaultBtn = document.querySelector(`.nav-btn[data-view="${defaultView}"]`);
  showView(defaultView, defaultBtn);
  toast(`Welcome ${user.firstName}`, 'accent');
}

function logout() {
  currentUser = null;
  cart = [];
  renderCart();
  updateCartBadge();
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('active-user').textContent = 'Not signed in';
  document.getElementById('logout-btn').style.display = 'none';
  document.querySelectorAll('.nav-btn').forEach(btn => { btn.style.display = 'none'; });
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('login-screen').style.display = 'flex';
}

// ── PRODUCT LIST ─────────────────────────────────────────
function renderProductList(filter = '') {
  const list = document.getElementById('product-list');
  const filtered = db.items.filter(i =>
    i.name.toLowerCase().includes(filter.toLowerCase()) ||
    i.code.toLowerCase().includes(filter.toLowerCase())
  );
  list.innerHTML = filtered.map(item => `
    <div class="product-row" onclick="addToCart(${item.id})">
      <div>
        <div class="product-name">${item.name}</div>
        <div class="product-code">${item.code}</div>
      </div>
      <div class="product-price">KES ${item.price}</div>
      <div class="product-stock">${item.stock} ${item.unit}s</div>
      <button class="add-btn" onclick="event.stopPropagation();addToCart(${item.id})">+</button>
    </div>
  `).join('') || `<div style="padding:32px;text-align:center;color:var(--muted)">No products found</div>`;
}

function filterProducts(val) {
  renderProductList(val);
}

// ── CART ─────────────────────────────────────────────────
function addToCart(itemId) {
  const item = db.items.find(i => i.id === itemId);
  if (!item || item.stock <= 0) { toast('Insufficient stock', 'danger'); return; }

  const existing = cart.find(c => c.id === itemId);
  if (existing) {
    if (existing.qty >= item.stock) { toast('Max stock reached', 'danger'); return; }
    existing.qty++;
  } else {
    cart.push({ id: itemId, qty: 1 });
  }
  renderCart();
  updateCartBadge();
}

function changeQty(itemId, delta) {
  const entry = cart.find(c => c.id === itemId);
  if (!entry) return;
  entry.qty += delta;
  if (entry.qty <= 0) cart = cart.filter(c => c.id !== itemId);
  renderCart();
  updateCartBadge();
}

function clearCart() {
  cart = [];
  renderCart();
  updateCartBadge();
}

function updateCartBadge() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  const badge = document.getElementById('cart-count-badge');
  badge.textContent = total;
  badge.style.display = total > 0 ? 'inline-block' : 'none';
}

function renderCart() {
  const el = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');

  if (cart.length === 0) {
    el.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">◻</div>
        <div>Cart is empty</div>
        <div style="font-size:11px;margin-top:4px;color:var(--muted2)">Add items from the left</div>
      </div>`;
    totalEl.textContent = 'KES 0.00';
    return;
  }

  let total = 0;
  el.innerHTML = cart.map(entry => {
    const item = db.items.find(i => i.id === entry.id);
    const lineTotal = item.price * entry.qty;
    total += lineTotal;
    return `
      <div class="cart-item">
        <div style="flex:1">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-sub">KES ${item.price} / ${item.unit}</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
          <span class="qty-num">${entry.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
        </div>
        <div class="cart-item-total">KES ${lineTotal.toFixed(2)}</div>
      </div>`;
  }).join('');

  totalEl.textContent = `KES ${total.toFixed(2)}`;
}

// ── CHECKOUT ─────────────────────────────────────────────
async function processCheckout() {
  if (cart.length === 0) { toast('Cart is empty', 'danger'); return; }
  if (!currentUser) { toast('Please login first', 'danger'); return; }

  const cashier = currentUser.firstName;
  const now = new Date();
  const txn = {
    id: db.nextTxnId++,
    date: now.toLocaleDateString('en-GB'),
    time: now.toLocaleTimeString('en-GB'),
    cashier,
    items: cart.map(entry => {
      const item = db.items.find(i => i.id === entry.id);
      return { ...item, qty: entry.qty, lineTotal: item.price * entry.qty };
    }),
    total: cart.reduce((s, c) => s + db.items.find(i => i.id === c.id).price * c.qty, 0),
  };
  cart.forEach(entry => {
    db.items.find(i => i.id === entry.id).stock -= entry.qty;
  });
  db.transactions.push(txn);
  saveDb();
  showReceipt(txn);

  cart = [];
  renderCart();
  updateCartBadge();
  renderProductList(document.getElementById('pos-search').value);
}

function showReceipt(txn) {
  document.getElementById('r-no').textContent      = String(txn.id).padStart(6, '0');
  document.getElementById('r-date').textContent    = txn.date;
  document.getElementById('r-time').textContent    = txn.time;
  document.getElementById('r-cashier').textContent = txn.cashier;
  document.getElementById('r-total').textContent   = `KES ${txn.total.toFixed(2)}`;

  document.getElementById('receipt-lines').innerHTML = txn.items.map(i => `
    <div class="receipt-line">
      <span class="receipt-line-name">${i.name}</span>
      <span class="receipt-line-qty">${i.qty}×</span>
      <span class="receipt-line-amt">KES ${i.lineTotal.toFixed(2)}</span>
    </div>
  `).join('');

  document.getElementById('receipt-modal').classList.add('open');
  toast(`Sale #${String(txn.id).padStart(6,'0')} — KES ${txn.total.toFixed(2)}`, 'accent');
}

async function reprintById() {
  const raw = document.getElementById('reprint-id').value;
  const id = parseInt(raw, 10);
  if (!id) { toast('Enter a valid receipt number', 'danger'); return; }
  const txn = db.transactions.find(t => t.id === id);
  if (!txn) { toast('Receipt not found', 'danger'); return; }
  showReceipt(txn);
}

function renderReprintTable() {
  const tbody = document.getElementById('reprint-tbody');
  if (db.transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:28px">No receipts available</td></tr>`;
    return;
  }

  tbody.innerHTML = [...db.transactions].reverse().slice(0, 20).map(t => `
    <tr>
      <td class="td-mono">#${String(t.id).padStart(6,'0')}</td>
      <td>${t.cashier}</td>
      <td>${t.items.reduce((s, i) => s + i.qty, 0)} items</td>
      <td class="td-mono" style="color:var(--accent)">KES ${t.total.toFixed(2)}</td>
      <td class="td-mono" style="color:var(--muted)">${t.time}</td>
      <td><button class="btn btn-sm" onclick="showReceipt(db.transactions.find(x => x.id === ${t.id}))">Reprint</button></td>
    </tr>
  `).join('');
}

// ── INVENTORY ────────────────────────────────────────────
function renderInventoryTable(filter = '') {
  const tbody = document.getElementById('inventory-tbody');
  const filtered = db.items.filter(i =>
    i.name.toLowerCase().includes((filter || '').toLowerCase()) ||
    i.code.toLowerCase().includes((filter || '').toLowerCase())
  );
  const maxStock = Math.max(...db.items.map(i => i.stock));

  tbody.innerHTML = filtered.map(item => {
    const pct      = Math.round((item.stock / maxStock) * 100);
    const low      = item.stock < 20;
    const med      = item.stock < 60 && !low;
    const barColor = low ? 'var(--danger)' : med ? 'var(--warn)' : 'var(--accent)';
    const badge    = low
      ? `<span class="badge badge-red">Low</span>`
      : med
      ? `<span class="badge badge-warn">Medium</span>`
      : `<span class="badge badge-green">OK</span>`;

    return `<tr>
      <td class="td-code">${item.code}</td>
      <td><strong style="font-weight:500">${item.name}</strong></td>
      <td><span class="badge badge-muted">${item.unit}</span></td>
      <td class="td-mono td-right">KES ${item.price.toFixed(2)}</td>
      <td class="td-mono td-right" style="color:var(--muted)">KES ${item.cost.toFixed(2)}</td>
      <td class="td-mono td-right">${item.stock}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="stock-bar-wrap" style="flex:1">
            <div class="stock-bar-bg">
              <div class="stock-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
          </div>
          ${badge}
        </div>
      </td>
      <td><button class="btn btn-sm" onclick="quickRestock(${item.id})">Restock</button></td>
    </tr>`;
  }).join('');
}

function openRestockModal() {
  if (!currentUser) { toast('Please login first', 'danger'); return; }
  const sel = document.getElementById('restock-item-select');
  sel.innerHTML = db.items.map(i =>
    `<option value="${i.id}">${i.code} — ${i.name}</option>`
  ).join('');
  document.getElementById('restock-actor').textContent = `Logged by: ${currentUser.empID} (${currentUser.firstName})`;
  document.getElementById('restock-modal').classList.add('open');
}

function quickRestock(id) {
  if (!currentUser) { toast('Please login first', 'danger'); return; }
  const sel = document.getElementById('restock-item-select');
  sel.innerHTML = db.items.map(i =>
    `<option value="${i.id}" ${i.id === id ? 'selected' : ''}>${i.code} — ${i.name}</option>`
  ).join('');
  document.getElementById('restock-actor').textContent = `Logged by: ${currentUser.empID} (${currentUser.firstName})`;
  document.getElementById('restock-modal').classList.add('open');
}

async function confirmRestock() {
  if (!currentUser) { toast('Please login first', 'danger'); return; }
  const id  = parseInt(document.getElementById('restock-item-select').value);
  const qty = parseFloat(document.getElementById('restock-qty').value);
  const emp = currentUser.empID;

  if (!qty || qty <= 0) { toast('Enter a valid quantity', 'danger'); return; }

  const item = db.items.find(i => i.id === id);
  if (!item) { toast('Item not found', 'danger'); return; }
  item.stock += qty;
  db.inventoryLog.push({ itemId: id, qty, employee: emp, at: new Date().toISOString() });
  saveDb();

  closeModal('restock-modal');
  renderInventoryTable(document.getElementById('inv-search').value);
  toast(`${item.name} restocked +${qty} units by ${emp}`, 'accent');

  document.getElementById('restock-qty').value      = '';
}

// ── STATS ─────────────────────────────────────────────────
function renderStats() {
  const tbody = document.getElementById('stats-tbody');
  const statsMap = {};

  db.transactions.forEach(txn => {
    txn.items.forEach(i => {
      if (!statsMap[i.id]) statsMap[i.id] = { ...i, qtySold: 0, revenue: 0, cost: 0 };
      statsMap[i.id].qtySold  += i.qty;
      statsMap[i.id].revenue  += i.lineTotal;
      statsMap[i.id].cost     += i.cost * i.qty;
    });
  });

  const rows        = Object.values(statsMap).sort((a, b) => b.revenue - a.revenue);
  const totalRev    = rows.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = rows.reduce((s, r) => s + (r.revenue - r.cost), 0);
  const totalUnits  = rows.reduce((s, r) => s + r.qtySold, 0);

  document.getElementById('stat-revenue').textContent =
    `KES ${totalRev.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  document.getElementById('stat-profit').textContent =
    `KES ${totalProfit.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  document.getElementById('stat-units').textContent = totalUnits;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:28px">No sales recorded yet</td></tr>`;
    document.getElementById('revenue-chart').innerHTML = `<div style="color:var(--muted);font-size:12px;padding:20px">No data</div>`;
    document.getElementById('profit-chart').innerHTML  = `<div style="color:var(--muted);font-size:12px;padding:20px">No data</div>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const profit = r.revenue - r.cost;
    const margin = ((profit / r.revenue) * 100).toFixed(1);
    return `<tr>
      <td class="td-code">${r.code}</td>
      <td>${r.name}</td>
      <td class="td-mono td-right">${r.qtySold}</td>
      <td class="td-mono td-right">KES ${r.revenue.toFixed(2)}</td>
      <td class="td-mono td-right" style="color:var(--muted)">KES ${r.cost.toFixed(2)}</td>
      <td class="td-mono td-right" style="color:var(--accent)">KES ${profit.toFixed(2)}</td>
      <td><span class="badge badge-green">${margin}%</span></td>
    </tr>`;
  }).join('');

  // Bar charts
  const maxRev    = Math.max(...rows.map(r => r.revenue));
  const maxProfit = Math.max(...rows.map(r => r.revenue - r.cost));

  document.getElementById('revenue-chart').innerHTML = rows.slice(0, 6).map(r => {
    const h = Math.round((r.revenue / maxRev) * 100);
    return `<div class="chart-bar-wrap">
      <div class="chart-bar" style="height:${h}px" title="${r.name}: KES ${r.revenue.toFixed(0)}">
        <div style="position:absolute;bottom:0;left:0;right:0;height:${h}px;background:var(--accent);opacity:0.55;border-radius:3px 3px 0 0"></div>
      </div>
      <div class="chart-bar-label">${r.code.replace('ITM','')}</div>
    </div>`;
  }).join('');

  document.getElementById('profit-chart').innerHTML = rows.slice(0, 6).map(r => {
    const profit = r.revenue - r.cost;
    const h = Math.max(4, Math.round((profit / maxProfit) * 100));
    return `<div class="chart-bar-wrap">
      <div class="chart-bar" style="height:${h}px" title="${r.name}: KES ${profit.toFixed(0)}">
        <div style="position:absolute;bottom:0;left:0;right:0;height:${h}px;background:#ffb347;opacity:0.6;border-radius:3px 3px 0 0"></div>
      </div>
      <div class="chart-bar-label">${r.code.replace('ITM','')}</div>
    </div>`;
  }).join('');
}

// ── PRICE TABLE ───────────────────────────────────────────
function renderPriceTable() {
  const tbody = document.getElementById('price-tbody');
  tbody.innerHTML = db.items.map(item => {
    const margin = (((item.price - item.cost) / item.price) * 100).toFixed(1);
    return `<tr>
      <td class="td-code">${item.code}</td>
      <td><strong style="font-weight:500">${item.name}</strong></td>
      <td><span class="badge badge-muted">${item.unit}</span></td>
      <td class="td-mono td-right">KES ${item.price.toFixed(2)}</td>
      <td class="td-mono td-right" style="color:var(--muted)">KES ${item.cost.toFixed(2)}</td>
      <td><span class="badge badge-green">${margin}%</span></td>
      <td>
        <input class="form-input" type="number"
          id="price-input-${item.id}" value="${item.price}"
          min="${item.cost}" style="width:110px;padding:6px 10px">
      </td>
      <td>
        <button class="btn btn-sm btn-accent" onclick="applyPrice(${item.id})">Update</button>
      </td>
    </tr>`;
  }).join('');
}

async function applyPrice(id) {
  const input    = document.getElementById('price-input-' + id);
  const newPrice = parseFloat(input.value);
  const item     = db.items.find(i => i.id === id);

  if (!newPrice || newPrice <= 0)  { toast('Enter a valid price', 'danger'); return; }
  if (newPrice < item.cost)        { toast('Price cannot be below cost price', 'danger'); return; }

  const old  = item.price;
  db.priceHistory.push({
    itemId: id, oldPrice: item.price, newPrice, changedAt: new Date().toISOString(),
  });
  item.price = newPrice;
  saveDb();
  renderPriceTable();
  toast(`${item.name}: KES ${old.toFixed(2)} → KES ${newPrice.toFixed(2)}`, 'accent');
}

// ── DASHBOARD ─────────────────────────────────────────────
function renderDashboard() {
  const totalRev   = db.transactions.reduce((s, t) => s + t.total, 0);
  const totalItems = db.transactions.reduce(
    (s, t) => s + t.items.reduce((ss, i) => ss + i.qty, 0), 0
  );
  const lowStock = db.items.filter(i => i.stock < 20).length;

  document.getElementById('dash-revenue').textContent =
    `KES ${totalRev.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  document.getElementById('dash-items-sold').textContent = totalItems;
  document.getElementById('dash-low-stock').textContent  = lowStock;

  const tbody = document.getElementById('recent-txns');
  if (db.transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:28px">No transactions yet today</td></tr>`;
    return;
  }

  tbody.innerHTML = [...db.transactions].reverse().slice(0, 8).map(t => `
    <tr>
      <td class="td-mono">#${String(t.id).padStart(6,'0')}</td>
      <td>${t.cashier}</td>
      <td>${t.items.reduce((s, i) => s + i.qty, 0)} items</td>
      <td class="td-mono" style="color:var(--accent)">KES ${t.total.toFixed(2)}</td>
      <td class="td-mono" style="color:var(--muted)">${t.time}</td>
      <td><span class="badge badge-green">Completed</span></td>
    </tr>`).join('');
}

// ── MODALS ────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Click outside to close any modal
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── TOASTS ────────────────────────────────────────────────
function toast(msg, type = 'accent') {
  const container = document.getElementById('toasts');
  const el        = document.createElement('div');
  el.className    = `toast toast-${type}`;
  el.innerHTML    = `<span style="color:${type === 'accent' ? 'var(--accent)' : 'var(--danger)'}">●</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── INIT ──────────────────────────────────────────────────
setTheme(localStorage.getItem('sasTheme') || 'dark');
renderProductList();
renderCart();
updateCartBadge();
document.querySelectorAll('.nav-btn').forEach(btn => { btn.style.display = 'none'; });
document.getElementById('app-shell').classList.add('hidden');
document.getElementById('login-screen').style.display = 'flex';
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const empID = document.getElementById('emp-id').value.trim().toUpperCase();
  const password = document.getElementById('emp-password').value;
  try {
    await login(empID, password);
    renderProductList();
    renderDashboard();
  } catch (err) {
    const loginErr = document.getElementById('login-error');
    loginErr.textContent = err.message || 'Invalid credentials. Please check Employee ID and password.';
    loginErr.style.display = 'block';
  }
  e.target.reset();
});

loadDb();
renderProductList();
