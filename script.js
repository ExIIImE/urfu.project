const PRODUCTS = [
  { id: 1, name: 'Наушники Forma', category: 'audio', categoryName: 'Аудио', price: 8990, image: 'assets/headphones.webp', description: 'Беспроводные полноразмерные наушники с мягкими амбушюрами и светлым корпусом.' },
  { id: 2, name: 'Светильник Aura', category: 'home', categoryName: 'Дом', price: 4290, image: 'assets/lamp.webp', description: 'Настольный светильник с матовым корпусом и рассеянным светом.' },
  { id: 3, name: 'Часы Tempo', category: 'wearables', categoryName: 'Носимые', price: 11990, image: 'assets/watch.webp', description: 'Наручные электронные часы с круглым экраном и тканевым ремешком.' },
  { id: 5, name: 'Колонка Mono', category: 'audio', categoryName: 'Аудио', price: 6490, image: 'assets/speaker.webp', description: 'Компактная беспроводная колонка с тканевой отделкой.' },
  { id: 6, name: 'Наушники Buds', category: 'audio', categoryName: 'Аудио', price: 4990, image: 'assets/earbuds.webp', description: 'Беспроводные внутриканальные наушники с зарядным кейсом.' },
  { id: 4, name: 'Аккумулятор Flow', category: 'accessories', categoryName: 'Аксессуары', price: 3490, image: 'assets/powerbank.webp', description: 'Портативный аккумулятор с металлическим корпусом и кабелем USB-C.' }
];

const CATEGORIES = [
  { id: 'all', label: 'Всё' },
  { id: 'audio', label: 'Аудио' },
  { id: 'home', label: 'Дом' },
  { id: 'wearables', label: 'Носимые' },
  { id: 'accessories', label: 'Аксессуары' }
];

const CART_KEY = 'kubik-cart-v2';
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
const state = { category: 'all', query: '', sort: 'featured', cart: loadCart() };
let toastTimer;

function safeParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function loadCart() {
  let saved = null;
  try {
    saved = safeParse(localStorage.getItem(CART_KEY));
    if (!Array.isArray(saved)) {
      const legacy = safeParse(localStorage.getItem('cart'));
      if (Array.isArray(legacy)) saved = legacy.map(id => ({ id: Number(id), qty: 1 }));
    }
  } catch { /* Storage may be disabled; the in-memory cart still works. */ }

  if (!Array.isArray(saved)) return [];
  const quantities = new Map();
  saved.forEach(item => {
    const id = Number(typeof item === 'number' ? item : item && item.id);
    const qty = Number(typeof item === 'number' ? 1 : item && item.qty);
    if (!PRODUCTS.some(product => product.id === id) || !Number.isFinite(qty)) return;
    quantities.set(id, Math.min(99, (quantities.get(id) || 0) + Math.max(0, Math.floor(qty))));
  });
  return [...quantities].filter(([, qty]) => qty > 0).map(([id, qty]) => ({ id, qty }));
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); }
  catch { toast('Корзина работает до обновления страницы'); }
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

function itemWord(count) {
  const mod10 = count % 10, mod100 = count % 100;
  return mod10 === 1 && mod100 !== 11 ? 'товар' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'товара' : 'товаров';
}

function productCard(product) {
  return '<article class="product-card">' +
    '<button class="product-visual" type="button" data-open-product="' + product.id + '" aria-label="Подробнее: ' + product.name + '">' +
      '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy">' +
    '</button>' +
    '<div class="product-meta"><div>' +
      '<span class="product-category">' + product.categoryName + '</span>' +
      '<button class="product-name" type="button" data-open-product="' + product.id + '">' + product.name + '</button>' +
      '<span class="product-price">' + money(product.price) + '</span>' +
    '</div><button class="add-button" type="button" data-add="' + product.id + '" aria-label="Добавить ' + product.name + ' в корзину">+</button></div>' +
  '</article>';
}

function renderFeatured() {
  $('#featuredGrid').innerHTML = PRODUCTS.slice(0, 4).map(productCard).join('');
}

function renderFilters() {
  $('#categoryFilters').innerHTML = CATEGORIES.map(category =>
    '<button class="filter-button' + (category.id === state.category ? ' active' : '') +
    '" type="button" data-filter="' + category.id + '" aria-pressed="' + (category.id === state.category) + '">' +
    category.label + '</button>'
  ).join('');
}

function renderCatalog() {
  let products = PRODUCTS.filter(product =>
    (state.category === 'all' || product.category === state.category) &&
    product.name.toLocaleLowerCase('ru-RU').includes(state.query)
  );
  if (state.sort === 'price-asc') products.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') products.sort((a, b) => b.price - a.price);
  if (state.sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));
  $('#catalogGrid').innerHTML = products.map(productCard).join('');
  $('#resultCount').textContent = products.length + ' ' + itemWord(products.length);
  $('#noResults').hidden = products.length > 0;
  renderFilters();
}

function renderCart() {
  const count = cartCount();
  $('#cartCount').textContent = count;
  $('#cartTitleCount').textContent = count;

  if (!count) {
    $('#cartBody').innerHTML =
      '<div class="cart-empty"><div class="cart-empty-icon">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 8h16l-1.4 12H5.4L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>' +
      '</div><h3>Пока пусто</h3><p>Добавьте вещь, которая вам понравилась. Она останется здесь.</p>' +
      '<button class="button button-dark" type="button" data-continue>Смотреть каталог <span aria-hidden="true">↗</span></button></div>';
    $('#cartFoot').hidden = true;
    return;
  }

  $('#cartBody').innerHTML = state.cart.map(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return '';
    return '<article class="cart-item">' +
      '<img src="' + product.image + '" alt="" loading="lazy">' +
      '<div><div class="cart-item-top"><span class="cart-item-name">' + product.name + '</span>' +
      '<button class="cart-remove" type="button" data-remove="' + product.id + '" aria-label="Удалить ' + product.name + ' из корзины">×</button></div>' +
      '<span class="cart-item-category">' + product.categoryName + '</span>' +
      '<div class="cart-item-bottom"><div class="quantity">' +
      '<button type="button" data-decrease="' + product.id + '" aria-label="Уменьшить количество ' + product.name + '">−</button>' +
      '<span>' + item.qty + '</span>' +
      '<button type="button" data-increase="' + product.id + '" aria-label="Увеличить количество ' + product.name + '">+</button>' +
      '</div><span class="cart-item-price">' + money(product.price * item.qty) + '</span></div></div></article>';
  }).join('');

  $('#cartFoot').hidden = false;
  $('#cartFoot').innerHTML =
    '<div class="cart-total"><span>Итого · ' + count + ' ' + itemWord(count) + '</span><strong>' + money(cartTotal()) + '</strong></div>' +
    '<p class="cart-note">Это демонстрационная корзина. Оформление и оплата заказа на сайте не предусмотрены.</p>' +
    '<button class="button button-dark cart-continue" type="button" data-continue>Продолжить выбор <span aria-hidden="true">↗</span></button>' +
    '<button class="cart-clear" type="button" data-clear-cart>Очистить корзину</button>';
}

function addToCart(id) {
  const product = PRODUCTS.find(item => item.id === id);
  if (!product) return;
  const line = state.cart.find(item => item.id === id);
  if (line) line.qty = Math.min(99, line.qty + 1);
  else state.cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  toast(product.name + ' — в корзине');
}

function changeQuantity(id, delta) {
  const line = state.cart.find(item => item.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.cart = state.cart.filter(item => item.id !== id);
  else line.qty = Math.min(99, line.qty);
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
}

function openCart() {
  renderCart();
  if (!$('#cartDialog').open) $('#cartDialog').showModal();
}

function openProduct(id) {
  const product = PRODUCTS.find(item => item.id === id);
  if (!product) return;
  $('#productDialogContent').innerHTML =
    '<div class="product-detail"><img src="' + product.image + '" alt="' + product.name + '">' +
    '<div class="product-detail-copy"><p class="eyebrow">' + product.categoryName + ' / КУБИК</p>' +
    '<h2 id="productDialogTitle">' + product.name + '</h2><p>' + product.description + '</p>' +
    '<strong>' + money(product.price) + '</strong>' +
    '<button class="button button-dark" type="button" data-add="' + product.id + '">Добавить в корзину <span aria-hidden="true">+</span></button>' +
    '</div></div>';
  $('#productDialog').showModal();
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 2500);
}

function closeMenu() {
  $('#mainNav').classList.remove('open');
  $('#menuToggle').setAttribute('aria-expanded', 'false');
  $('#menuToggle').setAttribute('aria-label', 'Открыть меню');
}

function route() {
  const path = (location.hash.replace(/^#\/?/, '').split('?')[0] || 'home');
  const page = path === 'catalog' ? path : 'home';
  document.querySelectorAll('[data-page]').forEach(section => {
    section.hidden = section.dataset.page !== page;
  });
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const titles = { home: 'Магазин гаджетов', catalog: 'Каталог' };
  document.title = 'Кубик — ' + titles[page];
  closeMenu();
  if (page === 'catalog') renderCatalog();
  window.scrollTo(0, 0);
}

document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    $('#main').focus();
    return;
  }

  const categoryLink = event.target.closest('[data-category-link]');
  if (categoryLink) {
    state.category = categoryLink.dataset.categoryLink;
    state.query = '';
    $('#searchInput').value = '';
    renderCatalog();
  }

  const filter = event.target.closest('[data-filter]');
  if (filter) {
    state.category = filter.dataset.filter;
    renderCatalog();
  }

  const add = event.target.closest('[data-add]');
  if (add) addToCart(Number(add.dataset.add));

  const open = event.target.closest('[data-open-product]');
  if (open) openProduct(Number(open.dataset.openProduct));

  if (event.target.closest('[data-open-cart]')) openCart();
  if (event.target.closest('[data-close-cart]')) $('#cartDialog').close();
  if (event.target.closest('[data-close-product]')) $('#productDialog').close();

  const increase = event.target.closest('[data-increase]');
  if (increase) changeQuantity(Number(increase.dataset.increase), 1);
  const decrease = event.target.closest('[data-decrease]');
  if (decrease) changeQuantity(Number(decrease.dataset.decrease), -1);
  const remove = event.target.closest('[data-remove]');
  if (remove) removeFromCart(Number(remove.dataset.remove));

  if (event.target.closest('[data-clear-cart]')) {
    state.cart = [];
    saveCart();
    renderCart();
  }
  if (event.target.closest('[data-continue]')) {
    $('#cartDialog').close();
    location.hash = '#/catalog';
  }
});

$('#searchInput').addEventListener('input', event => {
  state.query = event.target.value.trim().toLocaleLowerCase('ru-RU');
  renderCatalog();
});
$('#sortSelect').addEventListener('change', event => {
  state.sort = event.target.value;
  renderCatalog();
});
$('#resetFilters').addEventListener('click', () => {
  state.category = 'all';
  state.query = '';
  state.sort = 'featured';
  $('#searchInput').value = '';
  $('#sortSelect').value = 'featured';
  renderCatalog();
});
$('#menuToggle').addEventListener('click', () => {
  const open = $('#mainNav').classList.toggle('open');
  $('#menuToggle').setAttribute('aria-expanded', String(open));
  $('#menuToggle').setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});
$('#cartDialog').addEventListener('click', event => {
  if (event.target === $('#cartDialog')) $('#cartDialog').close();
});
$('#productDialog').addEventListener('click', event => {
  if (event.target === $('#productDialog')) $('#productDialog').close();
});
window.addEventListener('hashchange', route);
window.addEventListener('storage', event => {
  if (event.key === CART_KEY) {
    state.cart = loadCart();
    renderCart();
  }
});

renderFeatured();
renderCatalog();
renderCart();
route();
