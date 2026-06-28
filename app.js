'use strict';

// ── Catalogue ─────────────────────────────────────────────────────
const PRODUCTS = {
  serviettes: { id:'serviettes', name:'Serviettes hygiéniques', desc:'Coton biologique, ultra-douces', price:4.99, image:'images/serviettes.png', unit:'paquet' },
  tampons:    { id:'tampons',    name:'Tampons',                desc:'Coton bio, sans applicateur plastique', price:5.99, image:'images/tampons.png',    unit:'boîte'  },
  pack:       { id:'pack',       name:'Pack Solidaire',         desc:'Serviettes + Tampons Regular', price:9.99, image:null, emoji:'🎀', unit:'pack'   },
  cup:        { id:'cup',        name:'Coupe Menstruelle',      desc:'Silicone médical, réutilisable', price:19.99, image:null, emoji:'💧', unit:'unité' },
  pads:       { id:'pads',       name:'Serviettes Lavables',    desc:'Bambou et coton bio', price:24.99, image:null, emoji:'🍃', unit:'lot de 3' },
  panties:    { id:'panties',    name:'Culotte Menstruelle',    desc:'Protection invisible lavable', price:29.99, image:null, emoji:'👙', unit:'unité' }
};

// ── State ─────────────────────────────────────────────────────────
const S = {
  cart:         [],
  contribution: 5,
  qty:          { serviettes:1, tampons:1, pack:1, cup:1, pads:1, panties:1 },
  variant:      { serviettes:'Regular', tampons:'Regular', pack:'Essentiel', cup:'Taille 1', pads:'Jour', panties:'S' },
  stripe:       null,
};

// ── Counter animation ──────────────────────────────────────────────
function animCount(el, target, sfx='', ms=1800) {
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / ms, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(ease * target) + sfx;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Scroll reveal ─────────────────────────────────────────────────
function initReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('vis');
      if (e.target.id === 'heroProof') startCounters();
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Hero proof counters
  const proof = document.querySelector('.hero-proof');
  if (proof) { proof.id = 'heroProof'; io.observe(proof); }
}

function startCounters() {
  animCount(document.getElementById('ctr1'), 312, '');
  animCount(document.getElementById('ctr2'), 1847, '$');
  animCount(document.getElementById('ctr3'), 14, '');
}

// ── Navbar scroll ─────────────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 10), { passive:true });
  nav.classList.toggle('solid', scrollY > 10);
}

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg, type='inf') {
  const icons = { ok:'✅', err:'❌', inf:'🌸' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.setAttribute('role','alert');
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

// ── Variant selection ─────────────────────────────────────────────
function initVariants() {
  document.querySelectorAll('[data-product-id]').forEach(card => {
    const pid = card.dataset.productId;
    const btns = card.querySelectorAll('.var-btn');
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed','false'); });
      b.classList.add('on');
      b.setAttribute('aria-pressed','true');
      S.variant[pid] = b.dataset.variant;
    }));
  });
}

// ── Qty controls ──────────────────────────────────────────────────
function initQty() {
  document.querySelectorAll('.qty-b').forEach(b => {
    b.addEventListener('click', () => {
      const pid = b.dataset.pid;
      S.qty[pid] = b.dataset.action === 'inc'
        ? Math.min(S.qty[pid] + 1, 99)
        : Math.max(S.qty[pid] - 1, 1);
      document.getElementById(`qty-${pid}`).textContent = S.qty[pid];
    });
  });
}

// ── Cart ──────────────────────────────────────────────────────────
function addToCart(pid) {
  const p = PRODUCTS[pid];
  const variant = S.variant[pid];
  const id = `${pid}-${variant.toLowerCase()}`;
  const ex = S.cart.find(i => i.id === id);
  if (ex) {
    ex.qty = Math.min(ex.qty + S.qty[pid], 99);
  } else {
    S.cart.push({ id, pid, name:p.name, desc:p.desc, variant, price:p.price, image:p.image, emoji:p.emoji||null, unit:p.unit, qty:S.qty[pid] });
  }
  renderCart();
  updateBadge();
  toast(`${p.name} (${variant}) ajouté !`, 'ok');
  openDrawer();
}

function changeQty(id, delta) {
  const item = S.cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, Math.min(99, item.qty + delta));
  renderCart();
}

function removeItem(id) {
  S.cart = S.cart.filter(i => i.id !== id);
  renderCart();
  updateBadge();
}

function renderCart() {
  const box = document.getElementById('drawerItems');
  const empty = document.getElementById('emptyState');
  const cRow = document.getElementById('contribRow');

  if (!S.cart.length) {
    box.innerHTML = '';
    box.appendChild(empty);
    empty.style.display = '';
    cRow.style.display = 'none';
    document.getElementById('payBtn').disabled = true;
    calcTotal();
    return;
  }

  empty.style.display = 'none';
  cRow.style.display = 'flex';

  box.innerHTML = S.cart.map(item => `
    <div class="cart-line">
      ${item.image
        ? `<img class="cart-line-img" src="${item.image}" alt="${item.name}" loading="lazy"/>`
        : `<div class="cart-line-img-ph">${item.emoji}</div>`}
      <div class="cart-line-info">
        <div class="cli-name">${item.name}</div>
        <div class="cli-var">${item.variant} — ${fmt(item.price)} / ${item.unit}</div>
        <div class="cli-qty">
          <button onclick="changeQty('${item.id}',-1)" aria-label="Moins">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty('${item.id}',1)" aria-label="Plus">+</button>
        </div>
      </div>
      <button class="cli-del" onclick="removeItem('${item.id}')" aria-label="Retirer">🗑</button>
    </div>
  `).join('');

  document.getElementById('payBtn').disabled = false;
  calcTotal();
}

function calcTotal() {
  const sub = S.cart.reduce((s,i) => s + i.price * i.qty, 0);
  const total = sub + S.contribution;
  document.getElementById('totalVal').textContent = fmt(total);
  document.getElementById('contribAmt').textContent = fmt(S.contribution);
}

function updateBadge() {
  const n = S.cart.reduce((s,i) => s + i.qty, 0);
  const b = document.getElementById('cartBadge');
  b.textContent = n;
  b.classList.toggle('on', n > 0);
}

function fmt(n) {
  return n.toLocaleString('fr-CA', { style:'currency', currency:'CAD', minimumFractionDigits:2 });
}

// ── Drawer open/close ─────────────────────────────────────────────
function openDrawer() {
  document.getElementById('drawer').classList.add('on');
  document.getElementById('overlay').classList.add('on');
  document.getElementById('cartBtn').setAttribute('aria-expanded','true');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('on');
  document.getElementById('overlay').classList.remove('on');
  document.getElementById('cartBtn').setAttribute('aria-expanded','false');
  document.body.style.overflow = '';
}

// ── Contribution ──────────────────────────────────────────────────
function initContrib() {
  const btns = document.querySelectorAll('.amt-btn');
  const inp  = document.getElementById('customAmt');
  const fill = document.getElementById('impactFill');
  const impN = document.getElementById('impactN');

  function setAmt(n) {
    S.contribution = n;
    btns.forEach(b => {
      const on = parseFloat(b.dataset.amount) === n;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const ppl = n === 0 ? 1 : Math.max(1, Math.floor(n / 5) + 1);
    impN.textContent = `${ppl} personne${ppl > 1 ? 's' : ''}`;
    fill.style.width = Math.min((n / 20) * 100, 100) + '%';
    calcTotal();
  }

  btns.forEach(b => b.addEventListener('click', () => {
    inp.value = '';
    setAmt(parseFloat(b.dataset.amount));
  }));
  inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    if (!isNaN(v) && v >= 0) {
      btns.forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed','false'); });
      setAmt(v);
    }
  });

  setAmt(5);
}

// ── Stripe ────────────────────────────────────────────────────────
async function initStripe() {
  try {
    const r = await fetch('/api/config');
    if (!r.ok) throw new Error();
    const { publishableKey } = await r.json();
    S.stripe = Stripe(publishableKey);
  } catch {
    console.warn('Stripe: mode démo (serveur non configuré)');
  }
}

async function handlePay() {
  if (!S.cart.length) { toast('Ajoutez des produits d\'abord.','err'); return; }
  const btn = document.getElementById('payBtn');
  const txt = document.getElementById('payBtnTxt');
  btn.disabled = true;
  btn.classList.add('loading');
  txt.textContent = 'Redirection...';

  try {
    const cartData = S.cart.map(i => ({
      name: `${i.name} — ${i.variant}`,
      description: i.desc,
      price: i.price,
      quantity: i.qty,
      image: i.image,
      imageUrl: i.image ? `${location.origin}/${i.image}` : null,
    }));

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cartData, contribution: S.contribution, customer: {} }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    const { url } = await res.json();
    location.href = url;
  } catch (err) {
    toast('Erreur de paiement : ' + err.message, 'err');
    btn.disabled = false;
    btn.classList.remove('loading');
    txt.textContent = '🔒 Payer maintenant';
  }
}

// ── Events ────────────────────────────────────────────────────────
function initEvents() {
  document.getElementById('cartBtn').addEventListener('click', openDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('overlay').addEventListener('click', closeDrawer);
  document.getElementById('payBtn').addEventListener('click', handlePay);

  document.getElementById('add-serviettes').addEventListener('click', () => addToCart('serviettes'));
  document.getElementById('add-tampons').addEventListener('click', () => addToCart('tampons'));
  document.getElementById('add-pack').addEventListener('click', () => addToCart('pack'));
  document.getElementById('add-cup').addEventListener('click', () => addToCart('cup'));
  document.getElementById('add-pads').addEventListener('click', () => addToCart('pads'));
  document.getElementById('add-panties').addEventListener('click', () => addToCart('panties'));

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); closeDrawer(); t.scrollIntoView({ behavior:'smooth', block:'start' }); }
    });
  });
}

// ── Boot ──────────────────────────────────────────────────────────
async function boot() {
  initNav();
  initReveal();
  initVariants();
  initQty();
  initContrib();
  initEvents();
  await initStripe();
  renderCart();
  updateBadge();
}

document.addEventListener('DOMContentLoaded', boot);
