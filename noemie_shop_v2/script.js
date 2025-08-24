
// Utilities & storage
const YEAR_EL = document.getElementById('year');
if (YEAR_EL) YEAR_EL.textContent = new Date().getFullYear();

const CART_KEY = 'noemie_cart_v2';
const COUNT_EL = document.getElementById('cart-count');

function readCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch(e){ return []; }
}
function writeCart(items){
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartCount(items);
}
function updateCartCount(items = readCart()){
  const n = items.reduce((s,x)=>s + (x.qty||0), 0);
  if (COUNT_EL) COUNT_EL.textContent = n;
}
updateCartCount();

function addToCart(item){
  const items = readCart();
  const idx = items.findIndex(x => String(x.id) === String(item.id));
  if (idx >= 0){
    items[idx].qty += item.qty || 1;
  } else {
    items.push({id:item.id, name:item.name, price:item.price, qty:item.qty||1});
  }
  writeCart(items);
}

// Handle add-to-cart buttons globally
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.add-to-cart');
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.id;
  const name = btn.dataset.name;
  const price = parseFloat(btn.dataset.price || '0');
  addToCart({id, name, price, qty:1});
  btn.classList.add('bump');
  setTimeout(()=>btn.classList.remove('bump'), 300);
}, {passive:false});

// Money format
function money(n){
  return '₪' + (n||0).toLocaleString('he-IL', {maximumFractionDigits: 0});
}

// CART PAGE
function renderCartPage(){
  const items = readCart();
  const emptyEl = document.getElementById('cart-empty');
  const wrap = document.getElementById('cart-table-wrap');
  const tbody = document.getElementById('cart-rows');
  const subtotalEl = document.getElementById('subtotal');
  const shippingEl = document.getElementById('shipping');
  const grandEl = document.getElementById('grand');

  if (!tbody) return;

  if (!items.length){
    if (emptyEl) emptyEl.hidden = false;
    if (wrap) wrap.hidden = true;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  if (wrap) wrap.hidden = false;

  tbody.innerHTML = '';
  items.forEach((it, i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${it.name}</strong></td>
      <td>${money(it.price)}</td>
      <td>
        <div class="qty" data-index="${i}">
          <button class="qminus" aria-label="הפחת כמות">−</button>
          <input class="qval" type="number" min="1" value="${it.qty}">
          <button class="qplus" aria-label="הוסף כמות">+</button>
        </div>
      </td>
      <td class="row-total">${money(it.price * it.qty)}</td>
      <td><button class="btn remove" data-index="${i}">הסר</button></td>
    `;
    tbody.appendChild(tr);
  });

  function recalc(){
    const items = readCart();
    const subtotal = items.reduce((s,x)=>s + x.price * x.qty, 0);
    const shipping = subtotal > 300 ? 0 : (items.length ? 25 : 0);
    const grand = subtotal + shipping;
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (shippingEl) shippingEl.textContent = money(shipping);
    if (grandEl) grandEl.textContent = money(grand);
    // Store totals for checkout
    localStorage.setItem('noemie_totals', JSON.stringify({subtotal, shipping, grand}));
  }
  recalc();

  // quantity handlers
  tbody.addEventListener('click', (e)=>{
    const minus = e.target.closest('.qminus');
    const plus = e.target.closest('.qplus');
    const remove = e.target.closest('.remove');
    if (minus || plus){
      const q = e.target.closest('.qty');
      const idx = parseInt(q.dataset.index, 10);
      const items = readCart();
      if (plus) items[idx].qty += 1;
      if (minus) items[idx].qty = Math.max(1, (items[idx].qty||1) - 1);
      writeCart(items);
      renderCartPage(); // re-render
    }
    if (remove){
      const idx = parseInt(remove.dataset.index, 10);
      const items = readCart();
      items.splice(idx,1);
      writeCart(items);
      renderCartPage();
    }
  });
  tbody.addEventListener('change', (e)=>{
    const inp = e.target.closest('.qval');
    if (!inp) return;
    const qWrap = e.target.closest('.qty');
    const idx = parseInt(qWrap.dataset.index, 10);
    const n = Math.max(1, parseInt(inp.value||'1', 10));
    const items = readCart();
    items[idx].qty = n;
    writeCart(items);
    renderCartPage();
  });
}

// CHECKOUT page
function renderCheckoutPage(){
  const items = readCart();
  const ul = document.getElementById('checkout-items');
  const totalEl = document.getElementById('checkout-total');
  if (!ul) return;
  if (!items.length){
    ul.innerHTML = '<li>הסל ריק. <a href="products.html">להמשך קניות</a></li>';
    totalEl.textContent = money(0);
    return;
  }
  ul.innerHTML = '';
  let subtotal = 0;
  items.forEach(it=>{
    subtotal += it.price * it.qty;
    const li = document.createElement('li');
    li.textContent = `${it.name} × ${it.qty} — ${money(it.price * it.qty)}`;
    ul.appendChild(li);
  });
  const shipping = subtotal > 300 ? 0 : 25;
  const grand = subtotal + shipping;
  totalEl.textContent = money(grand);
  localStorage.setItem('noemie_totals', JSON.stringify({subtotal, shipping, grand}));
}

// CUSTOMER page
function initCustomerForm(){
  const form = document.getElementById('customer-form');
  if (!form) return;
  // load existing
  const saved = JSON.parse(localStorage.getItem('noemie_customer') || '{}');
  [...form.elements].forEach(el => {
    if (el.name && saved[el.name]) el.value = saved[el.name];
  });
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const data = {};
    [...form.elements].forEach(el => { if (el.name) data[el.name] = el.value.trim(); });
    localStorage.setItem('noemie_customer', JSON.stringify(data));
    window.location.href = 'payment.html';
  });
}

// PAYMENT page (simulation only)
function initPaymentForm(){
  const form = document.getElementById('payment-form');
  if (!form) return;
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    // simple validation
    const fd = new FormData(form);
    const card = (fd.get('cardNumber')||'').replace(/\s+/g,'');
    const exp = (fd.get('exp')||'').trim();
    const cvv = (fd.get('cvv')||'').trim();
    if (card.length < 12 || !/^\d+$/.test(card)) { alert('מספר כרטיס שגוי'); return; }
    if (!/^\d{2}\/\d{2}$/.test(exp)) { alert('תוקף לא תקין'); return; }
    if (!/^\d{3,4}$/.test(cvv)) { alert('CVV לא תקין'); return; }

    // Create order
    const items = readCart();
    const totals = JSON.parse(localStorage.getItem('noemie_totals') || '{"subtotal":0,"shipping":0,"grand":0}');
    const customer = JSON.parse(localStorage.getItem('noemie_customer') || '{}');
    const orderId = 'N' + Date.now().toString().slice(-8);
    const order = {id:orderId, items, totals, customer, ts:Date.now()};
    localStorage.setItem('noemie_order', JSON.stringify(order));
    // clear cart
    writeCart([]);
    window.location.href = 'confirmation.html';
  });
}

// CONFIRMATION page
function renderConfirmationPage(){
  const data = JSON.parse(localStorage.getItem('noemie_order') || 'null');
  if (!data) return;
  const idEl = document.getElementById('order-id');
  const itemsEl = document.getElementById('order-items');
  const totalEl = document.getElementById('order-total');
  const custEl = document.getElementById('order-customer');
  if (idEl) idEl.textContent = data.id;
  if (itemsEl){
    itemsEl.innerHTML = '';
    data.items.forEach(it=>{
      const li = document.createElement('li');
      li.textContent = `${it.name} × ${it.qty} — ${money(it.price * it.qty)}`;
      itemsEl.appendChild(li);
    });
  }
  if (totalEl) totalEl.textContent = money(data.totals.grand);
  if (custEl){
    const c = data.customer || {};
    custEl.textContent = `לשם: ${c.firstName||''} ${c.lastName||''} — טלפון: ${c.phone||''} — כתובת: ${c.street||''}, ${c.city||''} ${c.zip||''} — אימייל: ${c.email||''}`;
  }
}
