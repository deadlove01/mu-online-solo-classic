(function () {
  'use strict';

  var ERRORS = {
    1: 'Enter the game with a character first.',
    2: 'Unknown shop item.',
    3: 'Invalid quantity.',
    4: 'Invalid options for this item.',
    5: 'Not enough Reset Points.',
    6: 'Not enough free inventory space.',
    7: 'Could not save your points. Try again.'
  };

  var EXC_NAMES = {
    Armor: ['Max HP +4%', 'Max Mana +4%', 'Damage decrease +4%', 'Reflect damage +5%', 'Defense success rate +10%', 'Zen drop +30%'],
    Weapons: ['Excellent damage rate +10%', 'Damage +level/20', 'Damage +2%', 'Attack speed +7', 'Life after hunt +life/8', 'Mana after hunt +mana/8'],
    Wings: ['Max HP +', 'Max Mana +', 'Ignore enemy defense 3%', 'Max AG +50', 'Attack speed +5'],
    Misc: ['Absorb 5% damage', 'Max AG +50', 'Attack speed +5']
  };

  function excName(it, i) {
    var list = EXC_NAMES[it.cat] || [];
    return list[i] || ('Excellent ' + (i + 1));
  }

  var state = null;
  var category = 'All';
  var selected = null;
  var pollTimer = null;

  function $(id) { return document.getElementById(id); }
  function toast(msg) { if (window.muShowToast) window.muShowToast(msg); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function fillSelect(sel, count, label) {
    sel.textContent = '';
    for (var i = 0; i <= count; i++) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = label(i);
      sel.appendChild(o);
    }
  }

  function excMask() {
    var mask = 0;
    $('muShopExc').querySelectorAll('input').forEach(function (cb, i) {
      if (cb.checked) mask |= (1 << i);
    });
    return mask;
  }

  function currentOptions() {
    return {
      level: parseInt($('muShopLevel').value, 10) || 0,
      add: parseInt($('muShopAdd').value, 10) || 0,
      skill: $('muShopSkill').checked ? 1 : 0,
      luck: $('muShopLuck').checked ? 1 : 0,
      exc: excMask()
    };
  }

  function bitCount(n) {
    var c = 0;
    while (n) { c += n & 1; n >>= 1; }
    return c;
  }

  // Mirrors the server pricing (the server re-validates and charges its own price)
  function unitPrice(it, o) {
    return it.base + state.levelCost[o.level] + o.skill * state.skillCost + o.luck * state.luckCost +
      o.add * state.addCost + bitCount(o.exc) * state.excCost;
  }

  function maxPrice(it) {
    return unitPrice(it, {
      level: it.maxLevel, add: it.maxAdd, skill: it.skill, luck: it.luck, exc: (1 << it.excBits) - 1
    });
  }

  function quantity() {
    return Math.max(1, Math.min(state.maxQty, parseInt($('muShopQty').value, 10) || 1));
  }

  function itemImg(it, cls) {
    var img = el('img', cls || 'mu-shop-img');
    img.alt = it.name;
    img.loading = 'lazy';
    img.src = 'shop_icons/' + it.sec + '_' + it.idx + '.png?v=' + (window.BUILD_VERSION || '');
    img.addEventListener('error', function () { img.style.visibility = 'hidden'; });
    return img;
  }

  function noteSection(title, lines) {
    var box = el('div', 'mu-shop-note');
    box.appendChild(el('h4', null, title));
    var ul = el('ul');
    lines.forEach(function (l) { ul.appendChild(el('li', null, l)); });
    box.appendChild(ul);
    return box;
  }

  function renderNotes() {
    var box = $('muShopNotes');
    box.textContent = '';
    var s = state;
    var excCost = s ? s.excCost : 60;

    box.appendChild(noteSection('How points work', [
      'Every /reset gives ' + (s ? s.perReset : 30) + ' Reset Points (RP); every ' + (s ? s.milestoneStep : 10) + 'th reset gives +' + (s ? s.milestoneBonus : 60) + ' RP extra.',
      'Every /grandreset gives ' + (s ? s.perGrandReset : 1500) + ' RP. Points are saved per character.',
      'Price = base price + options you choose. Pick fewer options to afford a better item.'
    ]));
    box.appendChild(noteSection('Options', [
      'Level (+0 to +15): cost grows with the level; +9 costs ' + (s ? s.levelCost[9] : 62) + ' RP, +13 costs ' + (s ? s.levelCost[13] : 190) + ' RP.',
      'Skill: adds the weapon skill (weapons and Dinorant). Luck: +5% critical damage rate.',
      'Option (+4 to +28): additional damage on weapons, additional defense on armor. Each step costs ' + (s ? s.addCost : 15) + ' RP.',
      'Excellent: each option you tick costs ' + excCost + ' RP. Details per item type are below.'
    ]));

    Object.keys(EXC_NAMES).forEach(function (cat) {
      var title = { Armor: 'Excellent options: armor (helm, armor, pants, gloves, boots)', Weapons: 'Excellent options: weapons (swords, bows)', Wings: 'Excellent options: 2nd wings (1st wings have none)', Misc: 'Excellent options: Dinorant' }[cat];
      box.appendChild(noteSection(title, EXC_NAMES[cat].map(function (n, i) { return 'Excellent ' + (i + 1) + ': ' + n; })));
    });
    box.appendChild(noteSection('Good to know', [
      'Wings have their own option: +4 steps of extra damage, wizardry or HP recovery depending on the wings.',
      'If your inventory fills up during a purchase you are only charged for the items delivered.'
    ]));
  }

  function showTab(name) {
    var notes = name === 'notes';
    $('muShopTabShop').classList.toggle('active', !notes);
    $('muShopTabNotes').classList.toggle('active', notes);
    $('muShopNotes').hidden = !notes;
    $('muShopList').hidden = notes;
    $('muShopCats').hidden = notes;
    if (notes) { $('muShopConfirm').hidden = true; renderNotes(); }
  }

  function renderCats() {
    var box = $('muShopCats');
    box.textContent = '';
    var cats = ['All'];
    (state ? state.items : []).forEach(function (it) {
      if (cats.indexOf(it.cat) < 0) cats.push(it.cat);
    });
    cats.forEach(function (c) {
      var b = el('button', 'mu-tab-btn' + (c === category ? ' active' : ''), c);
      b.type = 'button';
      b.addEventListener('click', function () { category = c; render(); });
      box.appendChild(b);
    });
  }

  function renderList() {
    var list = $('muShopList');
    list.textContent = '';

    if (!state || !state.inGame) {
      list.appendChild(el('div', 'mu-shop-empty', 'Log in with a character to use the shop.'));
      return;
    }

    var items = state.items.filter(function (it) {
      return category === 'All' || it.cat === category;
    });

    items.forEach(function (it) {
      var customizable = it.maxLevel > 0 || it.maxAdd > 0 || it.skill || it.luck || it.excBits > 0;
      var row = el('div', 'mu-shop-row' + (state.points < it.base ? ' disabled' : ''));
      row.appendChild(itemImg(it));
      var info = el('div', 'mu-shop-info');
      info.appendChild(el('div', 'mu-shop-name', it.name));
      info.appendChild(el('div', 'mu-shop-sub', customizable ? 'Customizable \u2022 up to ' + maxPrice(it) + ' RP fully loaded' : 'Fixed item'));
      row.appendChild(info);
      row.appendChild(el('div', 'mu-shop-cost', (customizable ? 'from ' : '') + it.base + ' RP'));

      var btn = el('button', 'mu-top-btn', customizable ? 'Customize' : 'Buy');
      btn.type = 'button';
      btn.addEventListener('click', function () { select(it); });
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  function select(it) {
    selected = it;
    $('muShopConfirmName').textContent = it.name;
    $('muShopConfirmImg').style.visibility = 'visible';
    $('muShopConfirmImg').src = 'shop_icons/' + it.sec + '_' + it.idx + '.png?v=' + (window.BUILD_VERSION || '');
    fillSelect($('muShopLevel'), it.maxLevel, function (i) { return '+' + i + (i ? ' (+' + state.levelCost[i] + ' RP)' : ''); });
    fillSelect($('muShopAdd'), it.maxAdd, function (i) { return i ? '+' + (i * 4) + ' (+' + (i * state.addCost) + ' RP)' : 'None'; });
    $('muShopLevel').parentNode.hidden = it.maxLevel === 0;
    $('muShopAdd').parentNode.hidden = it.maxAdd === 0;

    $('muShopSkill').checked = false;
    $('muShopLuck').checked = false;
    $('muShopSkillWrap').hidden = !it.skill;
    $('muShopLuckWrap').hidden = !it.luck;
    $('muShopSkillWrap').lastChild.textContent = ' Skill (+' + state.skillCost + ' RP)';
    $('muShopLuckWrap').lastChild.textContent = ' Luck (+' + state.luckCost + ' RP)';

    var exc = $('muShopExc');
    exc.textContent = '';
    for (var i = 0; i < it.excBits; i++) {
      var lab = el('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.addEventListener('change', updateConfirm);
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + excName(it, i) + ' (+' + state.excCost + ')'));
      exc.appendChild(lab);
    }
    exc.hidden = it.excBits === 0;

    $('muShopQty').max = state.maxQty;
    $('muShopQty').value = 1;
    $('muShopConfirm').hidden = false;
    updateConfirm();
  }

  function updateConfirm() {
    if (!selected) return;
    var q = quantity();
    var total = unitPrice(selected, currentOptions()) * q;
    var affordable = total <= state.points;
    $('muShopConfirmText').textContent = 'Total: ' + total + ' RP' + (q > 1 ? ' (' + q + '\u00D7)' : '') +
      (affordable ? '' : ' \u2014 need ' + (total - state.points) + ' more');
    $('muShopConfirmText').classList.toggle('bad', !affordable);
    $('muShopBuyBtn').disabled = !affordable;
  }

  function render() {
    if (!state) return;
    $('muShopPoints').textContent = state.points;
    $('muShopSub').textContent = state.inGame
      ? 'Resets: ' + state.reset + ' \u2022 Grand Resets: ' + state.grandReset + ' \u2022 +' + state.perReset + ' RP per reset \u2022 Lifetime: ' + state.total + ' RP'
      : 'Earn Reset Points (RP) with every /reset';
    renderCats();
    renderList();
    if (selected) updateConfirm();
  }

  window.muShopOnState = function (s) {
    if (!s) return;
    state = s;
    render();
  };

  window.muShopOnResult = function (msg) {
    if (msg.state) { state = msg.state; render(); }
    var it = state && state.items.filter(function (i) { return i.id === msg.id; })[0];
    var name = it ? it.name : 'item';
    if (msg.result === 0) {
      toast('Purchased ' + name + ' \u00D7' + msg.delivered);
    } else if (msg.delivered > 0) {
      toast('Only ' + msg.delivered + ' delivered (inventory full). Charged for delivered items only.');
    } else {
      toast(ERRORS[msg.result] || 'Purchase failed.');
    }
  };

  function refresh() {
    if (window.soloBridge && window.soloBridge.shopState) window.soloBridge.shopState();
  }

  function open() {
    var modal = $('muShopModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    $('muShopConfirm').hidden = true;
    selected = null;
    showTab('shop');
    refresh();
    // Points can change while open (e.g. /reset auto), so keep the balance fresh
    pollTimer = setInterval(refresh, 3000);
  }

  function close() {
    var modal = $('muShopModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function init() {
    var btn = $('muBtnShop');
    if (!btn || btn._muShopBound) return;
    btn._muShopBound = true;
    btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
    $('muShopClose').addEventListener('click', close);
    $('muShopTabShop').addEventListener('click', function () { showTab('shop'); });
    $('muShopTabNotes').addEventListener('click', function () { showTab('notes'); });
    $('muShopConfirmImg').addEventListener('error', function () { this.style.visibility = 'hidden'; });
    $('muShopBackdrop').addEventListener('click', close);
    ['muShopLevel', 'muShopAdd', 'muShopSkill', 'muShopLuck'].forEach(function (id) {
      $(id).addEventListener('change', updateConfirm);
    });
    $('muShopQty').addEventListener('input', updateConfirm);
    $('muShopCancelBtn').addEventListener('click', function () { selected = null; $('muShopConfirm').hidden = true; });
    $('muShopBuyBtn').addEventListener('click', function () {
      if (!selected) return;
      window.soloBridge.shopBuy(selected.id, quantity(), currentOptions());
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('muShopModal').classList.contains('open')) close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
