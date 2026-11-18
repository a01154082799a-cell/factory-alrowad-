
// ==========================================
// مصنع الرواد ERP
// النظام الكامل: تسجيل الدخول والمنتجات والمخزن
// والعملاء والموردون وفواتير البيع والشراء والتقارير
// ==========================================

const SUPABASE_URL = "https://lctdfdukxexmdcttenmr.supabase.co";
const SUPABASE_KEY = "sb_publishable_0Z7G5wlwPP8NTC19QSxW4Q_fWbyeuHf";

const authClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
// عناصر الصفحة
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton");

const mainApp = document.getElementById("mainApp");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");
const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");

let currentUser = null;
let products = [];
let warehouseItems = [];
let customers = [];
let suppliers = [];
let salesInvoices = [];
let purchaseInvoices = [];
let invoiceItems = [];
let currentPage = "dashboard";

const pages = {
  dashboard: "الرئيسية",
  products: "المنتجات",
  warehouse: "المخزن",
  sales: "فواتير البيع",
  purchases: "فواتير الشراء",
  customers: "العملاء",
  suppliers: "الموردون",
  reports: "التقارير"
};

// ==========================================
// أدوات مساعدة
// ==========================================

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function money(value) {
  return Number(value || 0).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " ج.م";
}

function number(value) {
  return Number(value || 0).toLocaleString("ar-EG");
}

function showMessage(message, isError = false) {
  const toast = document.getElementById("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.style.display = "block";
  toast.style.background = isError ? "#a93226" : "#203945";

  setTimeout(() => {
    toast.style.display = "none";
  }, 3500);
}

function setLoading(button, loading, normalText) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? "جاري التنفيذ..." : normalText;
}

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString().slice(0, 10);
}

function productStock(productId) {
  const item = warehouseItems.find(
    row => row.product_id === productId
  );
  return Number(item?.quantity || 0);
}

function productName(productId) {
  const product = products.find(p => p.id === productId);
  return product ? product.name : "منتج غير معروف";
}

function showError(prefix, error) {
  console.error(prefix, error);
  showMessage(prefix + ": " + (error?.message || "خطأ غير معروف"), true);
}

// ==========================================
// تسجيل الدخول والخروج
// ==========================================

function showLogin() {
  currentUser = null;
  mainApp.hidden = true;
  loginScreen.style.display = "flex";
}

async function showApp(user) {
  currentUser = user;

  loginScreen.style.display = "none";
  mainApp.hidden = false;
  userEmail.textContent = user.email || "مدير النظام";

  await loadAllData();
  renderPage("dashboard");
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginMessage.textContent = "أدخل البريد الإلكتروني وكلمة المرور";
    return;
  }

  setLoading(loginButton, true, "تسجيل الدخول");
  loginMessage.textContent = "";

  try {
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      loginMessage.textContent = "تعذر تسجيل الدخول: " + error.message;
      return;
    }

    loginPassword.value = "";
    console.log("LOGIN SUCCESS:", data.user);
await showApp(data.user);

  } catch (error) {
    console.error(error);
    loginMessage.textContent = "حدث خطأ في الاتصال";
  } finally {
    setLoading(loginButton, false, "تسجيل الدخول");
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  const { error } = await authClient.auth.signOut();

  logoutButton.disabled = false;

  if (error) {
    showMessage("تعذر تسجيل الخروج: " + error.message, true);
    return;
  }

  showLogin();
});

authClient.auth.onAuthStateChange(event => {
  if (event === "SIGNED_OUT") {
    showLogin();
  }
});

// ==========================================
// تحميل البيانات
// ==========================================

async function loadProducts() {
  const { data, error } = await authClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  products = data || [];
}

async function loadWarehouse() {
  const { data, error } = await authClient
    .from("warehouse")
    .select("*");

  if (error) throw error;
  warehouseItems = data || [];
}

async function loadCustomers() {
  const { data, error } = await authClient
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  customers = data || [];
}

async function loadSuppliers() {
  const { data, error } = await authClient
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  suppliers = data || [];
}

async function loadSalesInvoices() {
  const { data, error } = await authClient
    .from("sales_invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  salesInvoices = data || [];
}

async function loadPurchaseInvoices() {
  const { data, error } = await authClient
    .from("purchase_invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  purchaseInvoices = data || [];
}

async function loadAllData() {
  if (!currentUser) return;

  try {
    await Promise.all([
      loadProducts(),
      loadWarehouse(),
      loadCustomers(),
      loadSuppliers(),
      loadSalesInvoices(),
      loadPurchaseInvoices()
    ]);
  } catch (error) {
    showError("تعذر تحميل بيانات النظام", error);
  }
}

// ==========================================
// التنقل
// ==========================================

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", async () => {
    if (!currentUser) return;

    const page = button.dataset.page;
    if (!pages[page]) return;

    document.querySelectorAll(".nav-btn").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    await loadAllData();
    renderPage(page);
  });
});

function renderPage(page) {
  currentPage = page;
  pageTitle.textContent = pages[page] || "الرئيسية";

  const renderers = {
    dashboard: renderDashboard,
    products: renderProducts,
    warehouse: renderWarehouse,
    sales: renderSales,
    purchases: renderPurchases,
    customers: renderCustomers,
    suppliers: renderSuppliers,
    reports: renderReports
  };

  if (renderers[page]) renderers[page]();
}

// ==========================================
// لوحة التحكم
// ==========================================

function renderDashboard() {
  const totalQuantity = warehouseItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0), 0
  );

  const totalSales = salesInvoices.reduce(
    (sum, item) => sum + Number(item.total || 0), 0
  );

  const totalPurchases = purchaseInvoices.reduce(
    (sum, item) => sum + Number(item.total || 0), 0
  );

  const customerDebt = salesInvoices.reduce(
    (sum, item) => sum + Number(item.remaining || 0), 0
  );

  const supplierDebt = purchaseInvoices.reduce(
    (sum, item) => sum + Number(item.remaining || 0), 0
  );

  content.innerHTML = `
    <div class="dashboard">
      <h2>مرحباً بك في مصنع الرواد</h2>
      <p>ملخص إدارة المصنع</p>

      <div class="dashboard-cards">
        <div class="dashboard-card">
          <span>عدد المنتجات</span>
          <strong>${products.length}</strong>
        </div>

        <div class="dashboard-card">
          <span>أصناف المخزن</span>
          <strong>${warehouseItems.length}</strong>
        </div>

        <div class="dashboard-card">
          <span>إجمالي الكميات</span>
          <strong>${number(totalQuantity)}</strong>
        </div>

        <div class="dashboard-card">
          <span>إجمالي المبيعات</span>
          <strong>${money(totalSales)}</strong>
        </div>

        <div class="dashboard-card">
          <span>إجمالي المشتريات</span>
          <strong>${money(totalPurchases)}</strong>
        </div>

        <div class="dashboard-card">
          <span>مديونية العملاء</span>
          <strong>${money(customerDebt)}</strong>
        </div>

        <div class="dashboard-card">
          <span>مديونية الموردين</span>
          <strong>${money(supplierDebt)}</strong>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// المنتجات
// ==========================================

function renderProducts() {
  content.innerHTML = `
    <div class="page-header">
      <h2>إدارة المنتجات</h2>
      <p>إضافة وعرض منتجات مصنع الرواد</p>
    </div>

    <form id="productForm" class="data-form">
      <div>
        <label>كود المنتج</label>
        <input id="productCode" required placeholder="P001">
      </div>

      <div>
        <label>اسم المنتج</label>
        <input id="productName" required>
      </div>

      <div>
        <label>وحدة القياس</label>
        <input id="productUnit" value="قطعة" required>
      </div>

      <div>
        <label>سعر الشراء</label>
        <input id="purchasePrice" type="number" min="0" step="0.01" value="0" required>
      </div>

      <div>
        <label>سعر البيع</label>
        <input id="salePrice" type="number" min="0" step="0.01" value="0" required>
      </div>

      <div>
        <label>الرصيد الافتتاحي</label>
        <input id="initialQuantity" type="number" min="0" step="0.01" value="0" required>
      </div>

      <button type="submit" id="saveProductButton">إضافة المنتج</button>
    </form>

    <h3>قائمة المنتجات (${products.length})</h3>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>الكود</th>
            <th>المنتج</th>
            <th>الوحدة</th>
            <th>الشراء</th>
            <th>البيع</th>
            <th>الرصيد</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(product => `
            <tr>
              <td>${escapeHTML(product.code)}</td>
              <td>${escapeHTML(product.name)}</td>
              <td>${escapeHTML(product.unit)}</td>
              <td>${money(product.purchase_price)}</td>
              <td>${money(product.sale_price)}</td>
              <td>${number(productStock(product.id))}</td>
            </tr>
          `).join("") || `
            <tr><td colspan="6">لا توجد منتجات</td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("productForm")
    .addEventListener("submit", saveProduct);
}

async function saveProduct(event) {
  event.preventDefault();

  if (!currentUser) return;

  const button = document.getElementById("saveProductButton");

  const product = {
    owner_id: currentUser.id,
    code: document.getElementById("productCode").value.trim(),
    name: document.getElementById("productName").value.trim(),
    unit: document.getElementById("productUnit").value.trim(),
    purchase_price: Number(document.getElementById("purchasePrice").value),
    sale_price: Number(document.getElementById("salePrice").value)
  };

  const initialQuantity = Number(
    document.getElementById("initialQuantity").value
  );

  if (!product.code || !product.name || !product.unit) {
    showMessage("أكمل بيانات المنتج", true);
    return;
  }

  if (
    !Number.isFinite(product.purchase_price) ||
    !Number.isFinite(product.sale_price) ||
    product.purchase_price < 0 ||
    product.sale_price < 0 ||
    !Number.isFinite(initialQuantity) ||
    initialQuantity < 0
  ) {
    showMessage("راجع الأسعار والكمية", true);
    return;
  }

  setLoading(button, true, "إضافة المنتج");

  try {
    const { data, error } = await authClient
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) throw error;

    const { error: warehouseError } = await authClient
      .from("warehouse")
      .insert({
        owner_id: currentUser.id,
        product_id: data.id,
        quantity: initialQuantity
      });

    if (warehouseError) {
      showMessage(
        "تم حفظ المنتج لكن تعذر إنشاء رصيده: " + warehouseError.message,
        true
      );
      await loadAllData();
      renderProducts();
      return;
    }

    if (initialQuantity > 0) {
      const { error: movementError } = await authClient
        .from("warehouse_movements")
        .insert({
          owner_id: currentUser.id,
          product_id: data.id,
          movement_type: "in",
          quantity: initialQuantity,
          note: "رصيد افتتاحي عند تسجيل المنتج"
        });

      if (movementError) {
        console.error(movementError);
        showMessage("تم إنشاء المنتج والرصيد لكن تعذر تسجيل الحركة", true);
      }
    }

    showMessage("تم إضافة المنتج بنجاح");
    await loadAllData();
    renderProducts();

  } catch (error) {
    showError("تعذر إضافة المنتج", error);
  } finally {
    setLoading(button, false, "إضافة المنتج");
  }
}

// ==========================================
// المخزن
// ==========================================

function renderWarehouse() {
  content.innerHTML = `
    <div class="page-header">
      <h2>إدارة المخزن</h2>
      <p>متابعة أرصدة المنتجات وحركة الوارد والمنصرف</p>
    </div>

    <form id="movementForm" class="data-form">
      <div>
        <label>المنتج</label>
        <select id="movementProduct" required>
          <option value="">اختر المنتج</option>
          ${products.map(product => `
            <option value="${escapeHTML(product.id)}">
              ${escapeHTML(product.name)} - ${escapeHTML(product.code)}
            </option>
          `).join("")}
        </select>
      </div>

      <div>
        <label>نوع الحركة</label>
        <select id="movementType" required>
          <option value="in">وارد</option>
          <option value="out">منصرف</option>
        </select>
      </div>

      <div>
        <label>الكمية</label>
        <input id="movementQuantity" type="number" min="0.01" step="0.01" required>
      </div>

      <div>
        <label>ملاحظات</label>
        <input id="movementNote">
      </div>

      <button type="submit" id="saveMovementButton">تسجيل الحركة</button>
    </form>

    <h3>أرصدة المخزن</h3>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>الكود</th><th>المنتج</th><th>الكمية</th><th>الوحدة</th></tr>
        </thead>
        <tbody>
          ${warehouseItems.map(item => {
            const product = products.find(p => p.id === item.product_id);
            return `
              <tr>
                <td>${escapeHTML(product?.code || "-")}</td>
                <td>${escapeHTML(product?.name || "غير معروف")}</td>
                <td>${number(item.quantity)}</td>
                <td>${escapeHTML(product?.unit || "-")}</td>
              </tr>
            `;
          }).join("") || `
            <tr><td colspan="4">لا توجد أصناف في المخزن</td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("movementForm")
    .addEventListener("submit", saveMovement);
}

async function saveMovement(event) {
  event.preventDefault();

  const button = document.getElementById("saveMovementButton");
  const productId = document.getElementById("movementProduct").value;
  const type = document.getElementById("movementType").value;
  const quantity = Number(
    document.getElementById("movementQuantity").value
  );
  const note = document.getElementById("movementNote").value.trim();

  const stock = warehouseItems.find(
    item => item.product_id === productId
  );

  if (!stock || !Number.isFinite(quantity) || quantity <= 0) {
    showMessage("اختر المنتج وأدخل كمية صحيحة", true);
    return;
  }

  const oldQuantity = Number(stock.quantity || 0);

  if (type === "out" && quantity > oldQuantity) {
    showMessage("الكمية المطلوبة أكبر من الرصيد", true);
    return;
  }

  const newQuantity = type === "in"
    ? oldQuantity + quantity
    : oldQuantity - quantity;

  setLoading(button, true, "تسجيل الحركة");

  try {
    const { error: updateError } = await authClient
      .from("warehouse")
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq("id", stock.id);

    if (updateError) throw updateError;

    const { error: movementError } = await authClient
      .from("warehouse_movements")
      .insert({
        owner_id: currentUser.id,
        product_id: productId,
        movement_type: type,
        quantity,
        note
      });

    if (movementError) {
      showMessage(
        "تم تحديث الرصيد لكن تعذر تسجيل الحركة: " + movementError.message,
        true
      );
    } else {
      showMessage("تم تسجيل حركة المخزن بنجاح");
    }

    await loadAllData();
    renderWarehouse();

  } catch (error) {
    showError("تعذر تسجيل حركة المخزن", error);
  } finally {
    setLoading(button, false, "تسجيل الحركة");
  }
}

// ==========================================
// العملاء والموردون
// ==========================================

function renderPeople(type) {
  const isCustomer = type === "customers";
  const title = isCustomer ? "العملاء" : "الموردون";
  const list = isCustomer ? customers : suppliers;
  const table = isCustomer ? "customers" : "suppliers";

  content.innerHTML = `
    <div class="page-header">
      <h2>إدارة ${title}</h2>
      <p>إضافة وعرض بيانات ${title}</p>
    </div>

    <form id="personForm" class="data-form">
      <div>
        <label>الاسم</label>
        <input id="personName" required>
      </div>

      <div>
        <label>رقم الهاتف</label>
        <input id="personPhone">
      </div>

      <div>
        <label>العنوان</label>
        <input id="personAddress">
      </div>

      <div>
        <label>ملاحظات</label>
        <input id="personNotes">
      </div>

      <button type="submit" id="savePersonButton">إضافة ${title}</button>
    </form>

    <h3>قائمة ${title} (${list.length})</h3>

    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th>ملاحظات</th></tr>
        </thead>
        <tbody>
          ${list.map(person => `
            <tr>
              <td>${escapeHTML(person.name)}</td>
              <td>${escapeHTML(person.phone || "-")}</td>
              <td>${escapeHTML(person.address || "-")}</td>
              <td>${escapeHTML(person.notes || "-")}</td>
            </tr>
          `).join("") || `
            <tr><td colspan="4">لا توجد بيانات حتى الآن</td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("personForm").addEventListener(
    "submit",
    event => savePerson(event, table, title)
  );
}

function renderCustomers() {
  renderPeople("customers");
}

function renderSuppliers() {
  renderPeople("suppliers");
}

async function savePerson(event, table, title) {
  event.preventDefault();

  const button = document.getElementById("savePersonButton");

  const record = {
    owner_id: currentUser.id,
    name: document.getElementById("personName").value.trim(),
    phone: document.getElementById("personPhone").value.trim(),
    address: document.getElementById("personAddress").value.trim(),
    notes: document.getElementById("personNotes").value.trim()
  };

  if (!record.name) {
    showMessage("الاسم مطلوب", true);
    return;
  }

  setLoading(button, true, "إضافة " + title);

  try {
    const { error } = await authClient
      .from(table)
      .insert(record);

    if (error) throw error;

    showMessage("تمت إضافة البيانات بنجاح");
    await loadAllData();

    if (table === "customers") renderCustomers();
    else renderSuppliers();

  } catch (error) {
    showError("تعذر حفظ البيانات", error);
  } finally {
    setLoading(button, false, "إضافة " + title);
  }
}

// ==========================================
// إنشاء الفواتير
// ==========================================

function invoiceProductOptions() {
  return products.map(product => `
    <option value="${escapeHTML(product.id)}">
      ${escapeHTML(product.name)} - ${escapeHTML(product.code)}
      (الرصيد: ${number(productStock(product.id))})
    </option>
  `).join("");
}

function addInvoiceRow() {
  const rows = document.getElementById("invoiceItems");

  if (!rows) return;

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <select class="invoice-product" required>
        <option value="">اختر المنتج</option>
        ${invoiceProductOptions()}
      </select>
    </td>
    <td>
      <input class="invoice-quantity" type="number" min="0.01" step="0.01" value="1" required>
    </td>
    <td>
      <input class="invoice-price" type="number" min="0" step="0.01" value="0" required>
    </td>
    <td class="invoice-line-total">0.00</td>
    <td>
      <button type="button" class="remove-invoice-row">حذف</button>
    </td>
  `;

  rows.appendChild(row);

  const productSelect = row.querySelector(".invoice-product");
  const quantityInput = row.querySelector(".invoice-quantity");
  const priceInput = row.querySelector(".invoice-price");

  productSelect.addEventListener("change", () => {
    const product = products.find(p => p.id === productSelect.value);
    if (product) {
      priceInput.value = currentPage === "sales"
        ? Number(product.sale_price || 0)
        : Number(product.purchase_price || 0);
    }
    calculateInvoice();
  });

  quantityInput.addEventListener("input", calculateInvoice);
  priceInput.addEventListener("input", calculateInvoice);

  row.querySelector(".remove-invoice-row").addEventListener("click", () => {
    row.remove();
    calculateInvoice();
  });

  calculateInvoice();
}

function calculateInvoice() {
  let total = 0;

  document.querySelectorAll("#invoiceItems tr").forEach(row => {
    const quantity = Number(
      row.querySelector(".invoice-quantity").value || 0
    );
    const price = Number(
      row.querySelector(".invoice-price").value || 0
    );

    const lineTotal = quantity * price;
    row.querySelector(".invoice-line-total").textContent =
      money(lineTotal);

    total += lineTotal;
  });

  const totalElement = document.getElementById("invoiceTotal");
  if (totalElement) totalElement.textContent = money(total);

  const paidInput = document.getElementById("invoicePaid");
  if (paidInput) {
    const paid = Number(paidInput.value || 0);
    const remainingElement = document.getElementById("invoiceRemaining");

    if (remainingElement) {
      remainingElement.textContent = money(Math.max(0, total - paid));
    }
  }
}

function renderInvoiceForm(type) {
  const isSale = type === "sales";
  const title = isSale ? "فاتورة بيع" : "فاتورة شراء";
  const people = isSale ? customers : suppliers;
  const personLabel = isSale ? "العميل" : "المورد";
  const personField = isSale ? "customer_id" : "supplier_id";

  content.innerHTML = `
    <div class="page-header">
      <h2>${title} جديدة</h2>
      <p>أدخل بيانات الفاتورة والأصناف</p>
    </div>

    <form id="invoiceForm">
      <div class="data-form">
        <div>
          <label>رقم الفاتورة</label>
          <input id="invoiceNumber" required>
        </div>

        <div>
          <label>التاريخ</label>
          <input id="invoiceDate" type="date" value="${today()}" required>
        </div>

        <div>
          <label>${personLabel}</label>
          <select id="invoicePerson">
            <option value="">بدون ${personLabel}</option>
            ${people.map(person => `
              <option value="${escapeHTML(person.id)}">
                ${escapeHTML(person.name)}
              </option>
            `).join("")}
          </select>
        </div>

        <div>
          <label>طريقة الدفع</label>
          <select id="invoicePaymentMethod">
            <option value="cash">نقدي بالكامل</option>
            <option value="credit">آجل بالكامل</option>
            <option value="partial">دفع جزئي</option>
          </select>
        </div>

        <div>
          <label>المبلغ المدفوع</label>
          <input id="invoicePaid" type="number" min="0" step="0.01" value="0" required>
        </div>

        <div>
          <label>ملاحظات</label>
          <input id="invoiceNotes">
        </div>
      </div>

      <h3>أصناف الفاتورة</h3>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
              <th>حذف</th>
            </tr>
          </thead>
          <tbody id="invoiceItems"></tbody>
        </table>
      </div>

      <button type="button" id="addInvoiceRow">إضافة صنف</button>

      <div class="page-header">
        <h3>الإجمالي: <span id="invoiceTotal">0.00</span></h3>
        <h3>المتبقي: <span id="invoiceRemaining">0.00</span></h3>
      </div>

      <button type="submit" id="saveInvoiceButton">حفظ ${title}</button>
      <button type="button" id="cancelInvoiceButton">إلغاء</button>
    </form>
  `;

  document.getElementById("addInvoiceRow")
    .addEventListener("click", addInvoiceRow);

  document.getElementById("invoicePaid")
    .addEventListener("input", calculateInvoice);

  document.getElementById("invoicePaymentMethod")
    .addEventListener("change", event => {
      const paid = document.getElementById("invoicePaid");

      if (event.target.value === "credit") {
        paid.value = "0";
      }

      if (event.target.value === "cash") {
        const total = getInvoiceTotal();
        paid.value = total.toFixed(2);
      }

      calculateInvoice();
    });

  document.getElementById("cancelInvoiceButton")
    .addEventListener("click", () => renderPage(type));

  document.getElementById("invoiceForm")
    .addEventListener("submit", event => saveInvoice(event, type, personField));

  addInvoiceRow();
}

function getInvoiceTotal() {
  let total = 0;

  document.querySelectorAll("#invoiceItems tr").forEach(row => {
    total +=
      Number(row.querySelector(".invoice-quantity").value || 0) *
      Number(row.querySelector(".invoice-price").value || 0);
  });

  return total;
}

// ==========================================
// حفظ فاتورة البيع أو الشراء
// ==========================================

async function saveInvoice(event, type, personField) {
  event.preventDefault();

  const isSale = type === "sales";
  const button = document.getElementById("saveInvoiceButton");

  const invoiceNumber = document.getElementById("invoiceNumber").value.trim();
  const invoiceDate = document.getElementById("invoiceDate").value;
  const personId = document.getElementById("invoicePerson").value || null;
  const paid = Number(document.getElementById("invoicePaid").value);
  const paymentMethod = document.getElementById("invoicePaymentMethod").value;
  const notes = document.getElementById("invoiceNotes").value.trim();

  const rows = [...document.querySelectorAll("#invoiceItems tr")];

  if (!invoiceNumber) {
    showMessage("رقم الفاتورة مطلوب", true);
    return;
  }

  if (!rows.length) {
    showMessage("أضف صنفاً واحداً على الأقل", true);
    return;
  }

  const items = [];

  for (const row of rows) {
    const productId = row.querySelector(".invoice-product").value;
    const quantity = Number(row.querySelector(".invoice-quantity").value);
    const price = Number(row.querySelector(".invoice-price").value);

    if (
      !productId ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      showMessage("راجع بيانات أصناف الفاتورة", true);
      return;
    }

    if (isSale && quantity > productStock(productId)) {
      showMessage(
        "الرصيد غير كافٍ للمنتج: " + productName(productId),
        true
      );
      return;
    }

    items.push({
      product_id: productId,
      quantity,
      price
    });
  }

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.price, 0
  );

  if (!Number.isFinite(paid) || paid < 0 || paid > total) {
    showMessage("قيمة المدفوع غير صحيحة", true);
    return;
  }

  if (paymentMethod === "cash" && paid !== total) {
    showMessage("الفاتورة النقدية يجب سدادها بالكامل", true);
    return;
  }

  if (paymentMethod === "credit" && paid !== 0) {
    showMessage("الفاتورة الآجلة لا يكون بها مبلغ مدفوع", true);
    return;
  }

  const rpcName = isSale
    ? "create_sales_invoice"
    : "create_purchase_invoice";

  const params = {
    p_invoice_number: invoiceNumber,
    p_customer_id: isSale ? personId : undefined,
    p_supplier_id: isSale ? undefined : personId,
    p_invoice_date: invoiceDate || today(),
    p_paid: paid,
    p_payment_method: paymentMethod,
    p_notes: notes || null,
    p_items: items
  };

  setLoading(button, true, "حفظ الفاتورة");

  try {
    const { data, error } = await authClient.rpc(rpcName, params);

    if (error) throw error;

    await loadAllData();

    showMessage(
      "تم حفظ الفاتورة بنجاح. رقم العملية: " + String(data).slice(0, 8)
    );

    renderPage(type);

  } catch (error) {
    showError("تعذر حفظ الفاتورة", error);
  } finally {
    setLoading(button, false, "حفظ الفاتورة");
  }
}

// ==========================================
// عرض فواتير البيع والشراء
// ==========================================

function renderInvoiceList(type) {
  const isSale = type === "sales";
  const title = isSale ? "فواتير البيع" : "فواتير الشراء";
  const invoices = isSale ? salesInvoices : purchaseInvoices;
  const people = isSale ? customers : suppliers;

  content.innerHTML = `
    <div class="page-header">
      <h2>${title}</h2>
      <p>متابعة الفواتير والمدفوع والمتبقي</p>
    </div>

    <button type="button" id="newInvoiceButton">إنشاء فاتورة جديدة</button>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>رقم الفاتورة</th>
            <th>التاريخ</th>
            <th>${isSale ? "العميل" : "المورد"}</th>
            <th>الإجمالي</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
            <th>طريقة الدفع</th>
          </tr>
        </thead>
        <tbody>
          ${invoices.map(invoice => {
            const person = people.find(p =>
              p.id === invoice[isSale ? "customer_id" : "supplier_id"]
            );

            return `
              <tr>
                <td>${escapeHTML(invoice.invoice_number)}</td>
                <td>${escapeHTML(invoice.invoice_date)}</td>
                <td>${escapeHTML(person?.name || "-")}</td>
                <td>${money(invoice.total)}</td>
                <td>${money(invoice.paid)}</td>
                <td>${money(invoice.remaining)}</td>
                <td>${paymentLabel(invoice.payment_method)}</td>
              </tr>
            `;
          }).join("") || `
            <tr><td colspan="7">لا توجد فواتير حتى الآن</td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("newInvoiceButton")
    .addEventListener("click", () => renderInvoiceForm(type));
}

function paymentLabel(method) {
  return {
    cash: "نقدي",
    credit: "آجل",
    partial: "جزئي"
  }[method] || "-";
}

function renderSales() {
  renderInvoiceList("sales");
}

function renderPurchases() {
  renderInvoiceList("purchases");
}

// ==========================================
// التقارير
// ==========================================

function renderReports() {
  const salesTotal = salesInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total || 0), 0
  );

  const salesPaid = salesInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.paid || 0), 0
  );

  const salesRemaining = salesInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.remaining || 0), 0
  );

  const purchasesTotal = purchaseInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total || 0), 0
  );

  const purchasesPaid = purchaseInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.paid || 0), 0
  );

  const purchasesRemaining = purchaseInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.remaining || 0), 0
  );

  content.innerHTML = `
    <div class="page-header">
      <h2>تقارير مصنع الرواد</h2>
      <p>ملخص المبيعات والمشتريات والمديونيات</p>
    </div>

    <div class="dashboard-cards">
      <div class="dashboard-card">
        <span>إجمالي المبيعات</span>
        <strong>${money(salesTotal)}</strong>
      </div>

      <div class="dashboard-card">
        <span>المبالغ المحصلة</span>
        <strong>${money(salesPaid)}</strong>
      </div>

      <div class="dashboard-card">
        <span>مديونية العملاء</span>
        <strong>${money(salesRemaining)}</strong>
      </div>

      <div class="dashboard-card">
        <span>إجمالي المشتريات</span>
        <strong>${money(purchasesTotal)}</strong>
      </div>

      <div class="dashboard-card">
        <span>المبالغ المدفوعة للموردين</span>
        <strong>${money(purchasesPaid)}</strong>
      </div>

      <div class="dashboard-card">
        <span>مديونية الموردين</span>
        <strong>${money(purchasesRemaining)}</strong>
      </div>
    </div>

    <div class="page-header">
      <h3>ملخص المخزن</h3>
      <p>عدد المنتجات: ${products.length}</p>
      <p>عدد الأصناف المسجلة بالمخزن: ${warehouseItems.length}</p>
      <p>إجمالي الكميات: ${number(
        warehouseItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      )}</p>
    </div>

    <p>
      ملاحظة: هذه التقارير تعرض إجماليات الفواتير والمديونيات،
      ولا تمثل صافي الربح المحاسبي.
    </p>
  `;
}

// ==========================================
// تشغيل النظام والتحقق من الجلسة
// ==========================================

async function startApp() {
  showLogin();

  const { data, error } = await authClient.auth.getSession();

  if (error) {
    console.error(error);
    showMessage("تعذر التحقق من تسجيل الدخول", true);
    return;
  }

  if (data.session?.user) {
    await showApp(data.session.user);
  }
}

startApp();
