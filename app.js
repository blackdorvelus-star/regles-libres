/* ================================================================
   RÈGLES LIBRES — Application JavaScript
   Panier, Contribution Volontaire, Stripe Checkout
   ================================================================ */

'use strict';

// ── Données produits ──────────────────────────────────────────────
const PRODUCTS = {
  serviettes: {
    id: 'serviettes',
    name: 'Serviettes hygiéniques',
    description: 'Coton biologique, ultra-douces',
    price: 4.99,
    image: 'images/serviettes.png',
    unit: 'paquet',
  },
  tampons: {
    id: 'tampons',
    name: 'Tampons',
    description: 'Coton bio, sans applicateur plastique',
    price: 5.99,
    image: 'images/tampons.png',
    unit: 'boîte',
  },
  pack: {
    id: 'pack',
    name: 'Pack Solidaire Complet',
    description: 'Serviettes + Tampons Regular',
    price: 9.99,
    image: null,
    imageEmoji: '🎀',
    unit: 'pack',
  },
};

// ── État de l'application ─────────────────────────────────────────
const state = {
  cart: [],
  contribution: 5,
  quantities: { serviettes: 1, tampons: 1, pack: 1 },
  selectedVariants: { serviettes: 'Regular', tampons: 'Regular', pack: 'Essentiel' },
  stripePublishableKey: null,
  stripe: null,
};

// ── Compteur animé ────────────────────────────────────────────────
function animateCounter(el, target, suffix = '', duration = 1800) {
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(ease * target);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function startCounters() {
  animateCounter(document.getElementById('counterCommandes'), 312);
  animateCounter(document.getElementById('counterDons'), 1847, '$');
  animateCounter(document.getElementById('counterVilles'), 14);
}

// ── Scroll reveal ─────────────────────────────────────────────────
function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Start counters when hero stats are visible
          if (entry.target.classList.contains('hero-stats')) {
            startCounters();
          }
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  // Also observe hero-stats
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) observer.observe(heroStats);
}

// ── Navbar scroll ─────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ── Toast notifications ──────────────────────────────────────────
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: '🌸' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

// ── Variant buttons ───────────────────────────────────────────────
function initVariantButtons() {
  document.querySelectorAll('.product-card').forEach(card => {
    const productId = card.dataset.productId;
    const variantBtns = card.querySelectorAll('.variant-btn');
    variantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        variantBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        state.selectedVariants[productId] = capitalize(btn.dataset.variant.replace('-', '+'));
      });
    });
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Quantity controls ─────────────────────────────────────────────
function initQtyControls() {
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.product;
      const action = btn.dataset.action;
      if (action === 'increase') {
        state.quantities[productId] = Math.min(state.quantities[productId] + 1, 99);
      } else {
        state.quantities[productId] = Math.max(state.quantities[productId] - 1, 1);
      }
      const el = document.getElementById(`qty-${productId}`);
      if (el) el.textContent = state.quantities[productId];
    });
  });
}

// ── Add to Cart ───────────────────────────────────────────────────
function addToCart(productId) {
  const product = PRODUCTS[productId];
  if (!product) return;

  const variant = state.selectedVariants[productId];
  const quantity = state.quantities[productId];
  const cartItemId = `${productId}-${variant.toLowerCase()}`;

  const existing = state.cart.find(item => item.cartItemId === cartItemId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, 99);
  } else {
    state.cart.push({
      cartItemId,
      productId,
      name: product.name,
      description: product.description,
      variant,
      price: product.price,
      image: product.image,
      imageEmoji: product.imageEmoji || null,
      quantity,
      unit: product.unit,
    });
  }

  renderCart();
  updateCartBadge();
  showToast(`${product.name} (${variant}) ajouté au panier 🛒`, 'success');
  openCart();
}

// ── Cart rendering ────────────────────────────────────────────────
function renderCart() {
  const cartItemsEl = document.getElementById('cartItems');
  const cartEmptyEl = document.getElementById('cartEmpty');
  const cartContribRow = document.getElementById('cartContributionRow');

  if (state.cart.length === 0) {
    cartItemsEl.innerHTML = '';
    cartItemsEl.appendChild(cartEmptyEl);
    cartEmptyEl.style.display = 'flex';
    cartContribRow.style.display = 'none';
    document.getElementById('checkoutBtn').disabled = true;
    updateCartTotal();
    return;
  }

  cartEmptyEl.style.display = 'none';
  cartContribRow.style.display = 'flex';

  const items = state.cart.map(item => `
    <div class="cart-item" data-id="${item.cartItemId}">
      ${item.image
        ? `<img class="cart-item-img" src="${item.image}" alt="${item.name}" loading="lazy" />`
        : `<div class="cart-item-img" style="background:linear-gradient(135deg,#1A0D18,#2A0E1A);display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0;">${item.imageEmoji}</div>`
      }
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-variant">${item.variant} — ${formatPrice(item.price)} / ${item.unit}</div>
        <div class="cart-item-qty">
          <button aria-label="Diminuer" onclick="changeCartQty('${item.cartItemId}', -1)">−</button>
          <span>${item.quantity}</span>
          <button aria-label="Augmenter" onclick="changeCartQty('${item.cartItemId}', 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.cartItemId}')" aria-label="Retirer ${item.name} du panier">🗑️</button>
    </div>
  `).join('');

  // Replace content while preserving cartEmpty element
  cartItemsEl.innerHTML = items;
  document.getElementById('checkoutBtn').disabled = false;
  updateCartTotal();
}

function changeCartQty(cartItemId, delta) {
  const item = state.cart.find(i => i.cartItemId === cartItemId);
  if (!item) return;
  item.quantity = Math.max(1, Math.min(99, item.quantity + delta));
  renderCart();
}

function removeFromCart(cartItemId) {
  state.cart = state.cart.filter(i => i.cartItemId !== cartItemId);
  renderCart();
  updateCartBadge();
  if (state.cart.length === 0) {
    showToast('Panier vidé', 'info');
  }
}

function updateCartBadge() {
  const total = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = total;
  badge.classList.toggle('visible', total > 0);
}

function updateCartTotal() {
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const contribution = state.contribution;
  const total = subtotal + contribution;
  document.getElementById('cartTotal').textContent = formatPrice(total);
  document.getElementById('cartContributionAmt').textContent = formatPrice(contribution);
}

function formatPrice(amount) {
  return amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 });
}

// ── Cart open/close ───────────────────────────────────────────────
function openCart() {
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartToggle').setAttribute('aria-expanded', 'true');
  document.getElementById('cartOverlay').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartToggle').setAttribute('aria-expanded', 'false');
  document.getElementById('cartOverlay').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ── Contribution buttons ──────────────────────────────────────────
function initContribution() {
  const amountBtns = document.querySelectorAll('.amount-btn');
  const customInput = document.getElementById('customAmount');
  const impactText = document.getElementById('impactText');
  const impactCount = document.getElementById('impactCount');
  const meterFill = document.getElementById('meterFill');

  function setContribution(amount) {
    state.contribution = amount;

    // Update buttons
    amountBtns.forEach(btn => {
      const active = parseFloat(btn.dataset.amount) === amount;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // Update impact text
    const people = amount === 0 ? 1 : Math.max(1, Math.floor(amount / 5) + 1);
    impactCount.textContent = `${people} personne${people > 1 ? 's' : ''}`;

    // Update meter
    const percent = Math.min((amount / 20) * 100, 100);
    meterFill.style.width = `${percent}%`;
    const meter = document.querySelector('.meter-bar');
    if (meter) meter.setAttribute('aria-valuenow', Math.round(percent));

    // Update cart total
    updateCartTotal();
  }

  amountBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseFloat(btn.dataset.amount);
      customInput.value = '';
      setContribution(amount);
    });
  });

  customInput.addEventListener('input', () => {
    const value = parseFloat(customInput.value);
    if (!isNaN(value) && value >= 0) {
      amountBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      setContribution(value);
    }
  });

  // Initialize with default 5$
  setContribution(5);
}

// ── Stripe Init ──────────────────────────────────────────────────
async function initStripe() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Serveur non disponible');
    const { publishableKey } = await res.json();
    state.stripePublishableKey = publishableKey;
    state.stripe = Stripe(publishableKey);
  } catch (err) {
    console.warn('Stripe non configuré (mode démo):', err.message);
  }
}

// ── Checkout ─────────────────────────────────────────────────────
async function handleCheckout() {
  if (state.cart.length === 0) {
    showToast('Ajoutez des produits pour commander.', 'error');
    return;
  }

  const btn = document.getElementById('checkoutBtn');
  const btnText = document.getElementById('checkoutBtnText');
  btn.disabled = true;
  btn.classList.add('loading');
  btnText.textContent = 'Redirection...';

  try {
    const cartData = state.cart.map(item => ({
      name: `${item.name} — ${item.variant}`,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      imageUrl: item.image ? `${window.location.origin}/${item.image}` : null,
    }));

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cart: cartData,
        contribution: state.contribution,
        customer: {},
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erreur serveur');
    }

    const { url } = await res.json();
    window.location.href = url;

  } catch (err) {
    console.error('Erreur checkout:', err);
    showToast('Erreur de paiement. Vérifiez la configuration Stripe.', 'error');
    btn.disabled = false;
    btn.classList.remove('loading');
    btnText.textContent = '🔒 Payer maintenant';
  }
}

// ── Event listeners ───────────────────────────────────────────────
function initEvents() {
  // Cart toggle
  document.getElementById('cartToggle').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  // Add to cart buttons
  document.getElementById('addServiettes').addEventListener('click', () => addToCart('serviettes'));
  document.getElementById('addTampons').addEventListener('click', () => addToCart('tampons'));
  document.getElementById('addPack').addEventListener('click', () => addToCart('pack'));

  // Checkout
  document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);

  // Keyboard: close cart on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });

  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        closeCart();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  initNavbar();
  initReveal();
  initVariantButtons();
  initQtyControls();
  initContribution();
  initEvents();
  await initStripe();

  // Initial cart render
  renderCart();
  updateCartBadge();

  console.log('%c🌸 Règles Libres %c— Boutique solidaire', 
    'color:#C44569;font-size:1.2rem;font-weight:bold;',
    'color:#7A5C66;font-size:1rem;'
  );
}

document.addEventListener('DOMContentLoaded', init);
