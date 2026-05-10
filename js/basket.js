// Jehan Basket — slide-in drawer with localStorage persistence
(function () {

  var basket = JSON.parse(localStorage.getItem('jehanBasket') || '[]');

  function save() { localStorage.setItem('jehanBasket', JSON.stringify(basket)); }

  function totalQty() { return basket.reduce(function (s, i) { return s + i.qty; }, 0); }

  function updateBadge() {
    var n = totalQty();
    document.querySelectorAll('.count').forEach(function (el) { el.textContent = n; });
  }

  function render() {
    var listEl   = document.getElementById('basket-items');
    var emptyEl  = document.getElementById('basket-empty');
    var footerEl = document.getElementById('basket-footer');
    if (!listEl) return;

    if (basket.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'flex';
      footerEl.style.display = 'none';
      return;
    }

    emptyEl.style.display = 'none';
    footerEl.style.display = 'block';

    listEl.innerHTML = basket.map(function (item, i) {
      return '<div class="bsk-item">' +
        '<div class="bsk-item__avatar">' + item.initials + '</div>' +
        '<div class="bsk-item__body">' +
          '<p class="bsk-item__name">' + item.name + '</p>' +
          '<p class="bsk-item__meta">' + item.mix + '</p>' +
        '</div>' +
        '<div class="bsk-item__qty">' +
          '<button class="bsk-qty-btn" onclick="basketQty(' + i + ',-1)">−</button>' +
          '<span>' + item.qty + ' m³</span>' +
          '<button class="bsk-qty-btn" onclick="basketQty(' + i + ',1)">+</button>' +
        '</div>' +
        '<button class="bsk-item__del" onclick="basketRemove(' + i + ')" title="Remove">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>';
    }).join('');

    document.getElementById('basket-subtotal').textContent = totalQty() + ' m³';
  }

  function open() {
    render();
    document.getElementById('basket-drawer').classList.add('bsk-open');
    document.getElementById('basket-overlay').classList.add('bsk-visible');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.getElementById('basket-drawer').classList.remove('bsk-open');
    document.getElementById('basket-overlay').classList.remove('bsk-visible');
    document.body.style.overflow = '';
  }

  window.toggleBasket = function () {
    document.getElementById('basket-drawer').classList.contains('bsk-open') ? close() : open();
  };
  window.closeBasket = close;

  window.basketAdd = function (name, mix, qty, initials) {
    qty = parseInt(qty) || 1;
    var existing = basket.find(function (i) { return i.name === name && i.mix === mix; });
    if (existing) { existing.qty += qty; } else { basket.push({ name: name, mix: mix, qty: qty, initials: initials || name.substring(0, 2).toUpperCase() }); }
    save();
    updateBadge();
    open();
  };

  window.basketQty = function (idx, delta) {
    basket[idx].qty += delta;
    if (basket[idx].qty < 1) basket.splice(idx, 1);
    save(); updateBadge(); render();
  };

  window.basketRemove = function (idx) {
    basket.splice(idx, 1);
    save(); updateBadge(); render();
  };

  window.basketClear = function () {
    basket = []; save(); updateBadge(); render();
  };

  document.addEventListener('DOMContentLoaded', function () {
    updateBadge();
    document.querySelectorAll('.basket-badge').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); toggleBasket(); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });

}());
