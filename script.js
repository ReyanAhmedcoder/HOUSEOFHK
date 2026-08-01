/* ================================================================
   HOUSEOFHK — store logic
   Products and orders persist in localStorage by default and can
   sync to Firebase Realtime Database when configured.
   Admin password: houseofhkbyrayyan
   ================================================================ */

const STORAGE_KEY = "hohk_products";
const ORDERS_STORAGE_KEY = "hohk_orders";
const ADMIN_PASSWORD = "houseofhkbyrayyan";
const WHATSAPP_NUMBER = "918981224354"; // country code + number
const CONTACT_EMAIL = "rayyanhaiderfarooqui@gmail.com";
const FIREBASE_CONFIG = (typeof window !== "undefined" && (window.HOHK_FIREBASE_CONFIG || window.firebaseConfig || firebaseConfig || null)) || null;
if (typeof window !== "undefined" && FIREBASE_CONFIG && !window.HOHK_FIREBASE_CONFIG) {
  window.HOHK_FIREBASE_CONFIG = FIREBASE_CONFIG;
}
const FIREBASE_PRODUCT_PATHS = ["hohk/products", "hohk/admin/products", "products", "admin/products"];
const FIREBASE_ORDER_PATHS = ["hohk/orders", "hohk/admin/orders", "orders", "admin/orders"];

const CATEGORY_LABELS = {
  clothes: "Clothes",
  wallets: "Wallets",
  belts: "Belts",
  sunglasses: "Sunglasses",
  bags: "Bags"
};

const CATEGORIES_BY_GENDER = {
  men: ["clothes", "wallets", "belts", "sunglasses"],
  women: ["clothes", "bags", "belts", "sunglasses"]
};

/* ---------------- Default seed catalogue ---------------- */
const DEFAULT_PRODUCTS = [
  { id: "m-cl-1", gender: "men", category: "clothes", name: "Charcoal Wool Overcoat", price: 12999, image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80" },
  { id: "m-cl-2", gender: "men", category: "clothes", name: "Ivory Silk Shirt", price: 5499, image: "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&q=80" },
  { id: "m-wa-1", gender: "men", category: "wallets", name: "Bronze Leather Billfold", price: 3299, image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80" },
  { id: "m-wa-2", gender: "men", category: "wallets", name: "Champagne Card Holder", price: 2199, image: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=800&q=80" },
  { id: "m-be-1", gender: "men", category: "belts", name: "Signature Buckle Belt", price: 2799, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80" },
  { id: "m-su-1", gender: "men", category: "sunglasses", name: "Bronze Aviator", price: 4499, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80" },

  { id: "w-cl-1", gender: "women", category: "clothes", name: "Champagne Silk Dress", price: 9899, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80" },
  { id: "w-cl-2", gender: "women", category: "clothes", name: "Ivory Tailored Blazer", price: 8299, image: "https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800&q=80" },
  { id: "w-ba-1", gender: "women", category: "bags", name: "Bronze Structured Tote", price: 7599, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: "w-ba-2", gender: "women", category: "bags", name: "Champagne Clutch", price: 4299, image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80" },
  { id: "w-be-1", gender: "women", category: "belts", name: "Slim Gold-Buckle Belt", price: 2399, image: "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=800&q=80" },
  { id: "w-su-1", gender: "women", category: "sunglasses", name: "Champagne Cat-Eye", price: 3999, image: "https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&q=80" }
];

/* ---------------- State ---------------- */
let products = [];
let orders = [];
let activeFilters = { gender: "all", category: "all" };
let selectedProductForOrder = null;
let remoteStorageReady = false;
let remoteSyncTimer = null;

/* ---------------- Storage helpers ---------------- */
function initializeSharedStorage() {
  if (remoteStorageReady) return true;
  if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.databaseURL) return false;

  remoteStorageReady = true;
  return true;
}

function getDatabaseBaseUrl() {
  return (FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL || "").replace(/\/$/, "");
}

function getDatabaseUrlForPath(path) {
  const normalizedPath = String(path || "").replace(/^\/+|\/+$/g, "");
  return `${getDatabaseBaseUrl()}/${normalizedPath}.json`;
}

function getStoredOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || "[]");
  } catch (error) {
    console.error("Failed to load orders from local storage.", error);
    return [];
  }
}

function normalizeRemoteListData(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, entry]) => {
      if (!entry || typeof entry !== "object") return null;
      return entry.id ? entry : { ...entry, id: entry.id || key };
    }).filter(Boolean);
  }

  return [];
}

async function readFromSharedDatabase(paths) {
  if (!initializeSharedStorage()) {
    return null;
  }

  for (const path of paths) {
    try {
      const response = await fetch(getDatabaseUrlForPath(path), { method: "GET" });
      if (!response.ok) {
        continue;
      }

      const value = await response.json();
      if (value !== null && value !== undefined) {
        return { path, value };
      }
    } catch (error) {
      console.error(`Failed to read shared data from ${path}`, error);
    }
  }

  return null;
}

async function writeToSharedDatabase(paths, data) {
  if (!initializeSharedStorage()) {
    return false;
  }

  try {
    for (const path of paths) {
      const response = await fetch(getDatabaseUrlForPath(path), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to write shared data.", error);
    return false;
  }
}

function ensureRemoteSyncLoop() {
  if (!initializeSharedStorage() || remoteSyncTimer) return;

  remoteSyncTimer = window.setInterval(async () => {
    if (document.hidden) return;

    try {
      const productsPayload = await readFromSharedDatabase(FIREBASE_PRODUCT_PATHS);
      if (productsPayload && productsPayload.value !== null) {
        const remoteProducts = normalizeRemoteListData(productsPayload.value);
        if (remoteProducts.length > 0) {
          products = remoteProducts;
          renderAdminProductList();
          renderCategoryFilters();
          renderProductGrid();
        }
      }

      const ordersPayload = await readFromSharedDatabase(FIREBASE_ORDER_PATHS);
      if (ordersPayload && ordersPayload.value !== null) {
        orders = normalizeRemoteListData(ordersPayload.value);
        if (document.getElementById("adminPanelView") && document.getElementById("adminPanelView").hidden === false) {
          renderAdminOrderList();
        }
      }
    } catch (error) {
      console.error("Failed to refresh shared data.", error);
    }
  }, 4000);
}

function subscribeToRemoteProductUpdates() {
  ensureRemoteSyncLoop();
}

function subscribeToRemoteOrderUpdates() {
  ensureRemoteSyncLoop();
}

async function loadProducts() {
  if (initializeSharedStorage()) {
    try {
      const sharedData = await readFromSharedDatabase(FIREBASE_PRODUCT_PATHS);
      if (sharedData && sharedData.value !== null) {
        const remoteProducts = normalizeRemoteListData(sharedData.value);
        if (remoteProducts.length > 0) {
          products = remoteProducts;
          subscribeToRemoteProductUpdates();
          return;
        }
      }

      products = [...DEFAULT_PRODUCTS];
      await writeToSharedDatabase(FIREBASE_PRODUCT_PATHS, products);
      subscribeToRemoteProductUpdates();
      return;
    } catch (error) {
      console.error("Failed to load products from shared storage, falling back to local storage.", error);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      products = JSON.parse(raw);
    } else {
      products = [...DEFAULT_PRODUCTS];
      await saveProducts();
    }
  } catch (error) {
    console.error("Failed to load products, resetting to defaults.", error);
    products = [...DEFAULT_PRODUCTS];
  }
}

async function saveProducts() {
  if (await writeToSharedDatabase(FIREBASE_PRODUCT_PATHS, products)) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

async function loadOrders() {
  if (initializeSharedStorage()) {
    try {
      const sharedData = await readFromSharedDatabase(FIREBASE_ORDER_PATHS);
      if (sharedData && sharedData.value !== null) {
        orders = normalizeRemoteListData(sharedData.value);
        subscribeToRemoteOrderUpdates();
        return;
      }
    } catch (error) {
      console.error("Failed to load orders from shared storage, falling back to local storage.", error);
    }
  }

  orders = getStoredOrders();
}

async function saveOrders() {
  if (await writeToSharedDatabase(FIREBASE_ORDER_PATHS, orders)) {
    return;
  }

  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function formatPrice(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

/* ================================================================
   RENDERING
   ================================================================ */
function renderCategoryFilters() {
  const catFiltersEl = document.getElementById("catFilters");
  catFiltersEl.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "filter-pill" + (activeFilters.category === "all" ? " active" : "");
  allBtn.dataset.cat = "all";
  allBtn.textContent = "All Categories";
  catFiltersEl.appendChild(allBtn);

  let cats;
  if (activeFilters.gender === "all") {
    cats = [...new Set([...CATEGORIES_BY_GENDER.men, ...CATEGORIES_BY_GENDER.women])];
  } else {
    cats = CATEGORIES_BY_GENDER[activeFilters.gender];
  }

  cats.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-pill" + (activeFilters.category === cat ? " active" : "");
    btn.dataset.cat = cat;
    btn.textContent = CATEGORY_LABELS[cat];
    catFiltersEl.appendChild(btn);
  });

  catFiltersEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilters.category = btn.dataset.cat;
      renderCategoryFilters();
      renderProductGrid();
    });
  });
}

function getFilteredProducts() {
  return products.filter((p) => {
    const genderOk = activeFilters.gender === "all" || p.gender === activeFilters.gender;
    const catOk = activeFilters.category === "all" || p.category === activeFilters.category;
    return genderOk && catOk;
  });
}

function renderProductGrid() {
  const grid = document.getElementById("productGrid");
  const emptyState = document.getElementById("emptyState");
  const list = getFilteredProducts();

  grid.innerHTML = "";

  if (list.length === 0) {
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    list.forEach((p) => grid.appendChild(buildProductCard(p)));
  }
}

function buildProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  card.innerHTML = `
    <div class="product-image-wrap">
      <img src="${escapeAttr(product.image)}" alt="${escapeAttr(product.name)}" loading="lazy">
    </div>
    <div class="product-body">
      <span class="product-cat">${escapeHtml(product.gender)} · ${escapeHtml(CATEGORY_LABELS[product.category] || product.category)}</span>
      <h3 class="product-title">${escapeHtml(product.name)}</h3>
      <p class="product-price"><strong>${formatPrice(product.price)}</strong></p>
      <button class="order-btn" data-order-id="${escapeAttr(product.id)}">Order Now via COD</button>
    </div>
  `;

  card.querySelector(".order-btn").addEventListener("click", () => openOrderModal(product.id));
  return card;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

/* ================================================================
   NAV / FILTER INTERACTIONS
   ================================================================ */
function goToShopWith(gender, category) {
  activeFilters.gender = gender;
  activeFilters.category = category || "all";
  document.querySelectorAll("#genderFilters .filter-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.gender === gender);
  });
  renderCategoryFilters();
  renderProductGrid();
  document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
  closeMobileNav();
}

function setupNav() {
  // gender + category dropdown buttons in header
  document.querySelectorAll(".dropdown button[data-gender]").forEach((btn) => {
    btn.addEventListener("click", () => {
      goToShopWith(btn.dataset.gender, btn.dataset.cat);
    });
  });

  // hero category tiles
  document.querySelectorAll(".tile[data-gender]").forEach((tile) => {
    tile.addEventListener("click", () => {
      goToShopWith(tile.dataset.gender, tile.dataset.cat === "all" ? "all" : tile.dataset.cat);
    });
  });

  // shop all link
  document.querySelector("[data-shop-all]").addEventListener("click", (e) => {
    e.preventDefault();
    goToShopWith("all", "all");
  });

  // gender filter pills inside shop
  document.querySelectorAll("#genderFilters .filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilters.gender = btn.dataset.gender;
      activeFilters.category = "all";
      document.querySelectorAll("#genderFilters .filter-pill").forEach((b) => b.classList.toggle("active", b === btn));
      renderCategoryFilters();
      renderProductGrid();
    });
  });

  // mobile hamburger
  const hamburger = document.getElementById("hamburgerBtn");
  const mainNav = document.getElementById("mainNav");
  hamburger.addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });

  // mobile dropdown toggle (tap nav-link to expand dropdown on small screens)
  document.querySelectorAll(".nav-item.has-dropdown > .nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      if (window.innerWidth <= 800) {
        e.preventDefault();
        link.parentElement.classList.toggle("mobile-open");
      }
    });
  });
}

function closeMobileNav() {
  document.getElementById("mainNav").classList.remove("open");
}

/* ================================================================
   ORDER MODAL
   ================================================================ */
function openOrderModal(productId) {
  selectedProductForOrder = products.find((p) => p.id === productId);
  if (!selectedProductForOrder) return;

  const summary = document.getElementById("orderProductSummary");
  summary.innerHTML = `
    <img src="${escapeAttr(selectedProductForOrder.image)}" alt="${escapeAttr(selectedProductForOrder.name)}">
    <div>
      <p class="op-name">${escapeHtml(selectedProductForOrder.name)}</p>
      <p class="op-price">${formatPrice(selectedProductForOrder.price)}</p>
    </div>
  `;

  document.getElementById("orderForm").hidden = false;
  document.getElementById("orderForm").reset();
  document.getElementById("orderConfirm").hidden = true;

  document.getElementById("orderOverlay").classList.add("open");
}

function closeOrderModal() {
  document.getElementById("orderOverlay").classList.remove("open");
  selectedProductForOrder = null;
}

function setupOrderModal() {
  document.querySelectorAll("[data-close-order]").forEach((btn) => btn.addEventListener("click", closeOrderModal));
  document.getElementById("orderOverlay").addEventListener("click", (e) => {
    if (e.target.id === "orderOverlay") closeOrderModal();
  });

  document.getElementById("orderForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!selectedProductForOrder) return;

    const form = e.target;
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const address = form.address.value.trim();
    const qty = form.qty.value || 1;
    const product = selectedProductForOrder;
    const total = product.price * qty;

    const messageLines = [
      `New Houseofhk Order (COD)`,
      `Owner: Rayyan Haider Farooqui`,
      `Owner Address: Kolkata, 700039`,
      `Product: ${product.name}`,
      `Quantity: ${qty}`,
      `Total: ${formatPrice(total)}`,
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Address: ${address}`,
      `Payment: Cash on Delivery`
    ];
    const messageText = messageLines.join("\n");

    const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(messageText)}`;
    const mailLink = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Houseofhk COD Order — " + product.name)}&body=${encodeURIComponent(messageText)}`;

    document.getElementById("waLink").href = waLink;
    document.getElementById("mailLink").href = mailLink;

    form.hidden = true;
    document.getElementById("orderConfirm").hidden = false;

    // keep a shared record of orders for reference across devices
    try {
      orders.push({ product: product.name, qty, total, name, phone, address, date: new Date().toISOString() });
      saveOrders();
      if (document.getElementById("adminPanelView") && document.getElementById("adminPanelView").hidden === false) {
        renderAdminOrderList();
      }
    } catch (err) { /* non-critical */ }
  });
}

/* ================================================================
   ADMIN PANEL
   ================================================================ */
function setupAdmin() {
  const adminOverlay = document.getElementById("adminOverlay");
  const loginView = document.getElementById("adminLoginView");
  const panelView = document.getElementById("adminPanelView");
  const loginForm = document.getElementById("adminLoginForm");
  const passwordInput = document.getElementById("adminPassword");
  const errorMsg = document.getElementById("adminError");

  document.getElementById("adminTrigger").addEventListener("click", () => {
    loginView.hidden = false;
    panelView.hidden = true;
    errorMsg.hidden = true;
    loginForm.reset();
    adminOverlay.classList.add("open");
  });

  document.querySelectorAll("[data-close-admin]").forEach((btn) => btn.addEventListener("click", () => {
    adminOverlay.classList.remove("open");
  }));
  adminOverlay.addEventListener("click", (e) => {
    if (e.target.id === "adminOverlay") adminOverlay.classList.remove("open");
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (passwordInput.value === ADMIN_PASSWORD) {
      loginView.hidden = true;
      panelView.hidden = false;
      renderAdminCategoryOptions("men");
      renderAdminProductList();
      renderAdminOrderList();
    } else {
      errorMsg.hidden = false;
      passwordInput.value = "";
    }
  });

  document.getElementById("adminLogout").addEventListener("click", () => {
    adminOverlay.classList.remove("open");
  });

  const addForm = document.getElementById("addProductForm");
  addForm.gender.addEventListener("change", () => renderAdminCategoryOptions(addForm.gender.value));

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = addForm.name.value.trim();
    const price = parseFloat(addForm.price.value);
    const gender = addForm.gender.value;
    const category = addForm.category.value;
    const imageFile = addForm.image.files[0];

    if (!name || !price || !gender || !category || !imageFile) return;

    const image = await readFileAsDataUrl(imageFile);

    const id = "custom-" + Date.now();
    products.push({ id, gender, category, name, price, image });
    await saveProducts();

    renderAdminProductList();
    renderCategoryFilters();
    renderProductGrid();
    addForm.reset();
    renderAdminCategoryOptions("men");
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function renderAdminCategoryOptions(gender) {
  const select = document.getElementById("adminCategorySelect");
  select.innerHTML = '<option value="" disabled selected>Category</option>';
  const cats = CATEGORIES_BY_GENDER[gender] || [];
  cats.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = CATEGORY_LABELS[cat];
    select.appendChild(opt);
  });
}

function renderAdminProductList() {
  const list = document.getElementById("adminProductList");
  list.innerHTML = "";

  if (products.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No products yet.</p>';
    return;
  }

  products.forEach((p) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}">
      <div class="ar-info">
        <p class="ar-name">${escapeHtml(p.name)}</p>
        <p class="ar-meta">${escapeHtml(p.gender)} · ${escapeHtml(CATEGORY_LABELS[p.category] || p.category)} · ${formatPrice(p.price)}</p>
      </div>
      <button data-remove-id="${escapeAttr(p.id)}">Remove</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      products = products.filter((prod) => prod.id !== p.id);
      await saveProducts();
      renderAdminProductList();
      renderCategoryFilters();
      renderProductGrid();
    });
    list.appendChild(row);
  });
}

function formatOrderDate(dateString) {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function renderAdminOrderList() {
  const list = document.getElementById("adminOrderList");
  list.innerHTML = "";

  if (orders.length === 0) {
    try {
      orders = getStoredOrders();
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  }

  if (orders.length === 0) {
    list.innerHTML = '<p class="admin-order-empty">No orders have been placed yet.</p>';
    return;
  }

  orders.slice().reverse().forEach((order) => {
    const item = document.createElement("div");
    item.className = "admin-order-item";
    item.innerHTML = `
      <div class="order-top">
        <strong>${escapeHtml(order.name || "Customer")}</strong>
        <span class="order-meta">${escapeHtml(order.date ? formatOrderDate(order.date) : "New order")}</span>
      </div>
      <p><strong>Phone:</strong> ${escapeHtml(order.phone || "Not provided")}</p>
      <p><strong>Product:</strong> ${escapeHtml(order.product || "Unknown")}</p>
      <p><strong>Qty:</strong> ${escapeHtml(order.qty || 1)} · <strong>Total:</strong> ${escapeHtml(formatPrice(order.total || 0))}</p>
      <p class="order-address"><strong>Address:</strong> ${escapeHtml(order.address || "Not provided")}</p>
    `;
    list.appendChild(item);
  });
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  await loadProducts();
  await loadOrders();
  renderCategoryFilters();
  renderProductGrid();
  setupNav();
  setupOrderModal();
  setupAdmin();
});