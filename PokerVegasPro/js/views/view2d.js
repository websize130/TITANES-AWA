/* PokerVegasPro — vista de mesa 2D clásica (DOM + CSS + Web Animations).
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const U = PVP.util;
  const Art = () => PVP.Art;

  const GAP = 64; // grados libres en la parte superior para el crupier (más en vertical: la mesa es estrecha)

  /** Ángulos (0 = arriba, sentido horario) de cada asiento; el asiento 0 (héroe) siempre abajo en el centro. */
  /**
   * Ángulos (0 = arriba, sentido horario) de cada asiento; el asiento 0 (héroe) siempre abajo en el centro.
   * gapTop deja sitio al crupier y heroGap separa a los vecinos de las cartas grandes del héroe.
   */
  function seatAngles(n, gapTop, heroGap) {
    gapTop = gapTop || GAP;
    if (n <= 1) return [180];
    const even = (360 - gapTop) / n;
    const gb = Math.max(even, heroGap || 0);
    const arc = 360 - gapTop - gb;
    const start = 180 + gb / 2;
    const leftLen = 360 - gapTop / 2 - start;
    const out = [180];
    for (let k = 1; k < n; k++) {
      const u = ((k - 0.5) * arc) / (n - 1);
      out.push(u <= leftLen + 0.01 ? start + u : gapTop / 2 + (u - leftLen));
    }
    return out.map((x) => x % 360);
  }

  function polar(angle, rx, ry) {
    const r = (angle * Math.PI) / 180;
    return { x: 50 + Math.sin(r) * rx, y: 50 - Math.cos(r) * ry };
  }

  PVP.Layout = { seatAngles, polar };

  /** Decorado de fondo de cada mesa (formas CSS; solo se animan transform/opacity). */
  const SCENES = {
    space: '<i class="planet"></i><i class="ring"></i><i class="moon"></i>',
    underwater: '<i class="ray"></i><i class="ray"></i><i class="ray"></i><i class="weed w1"></i><i class="weed w2"></i><i class="weed w3"></i><i class="weed w4"></i>',
    balloon: '<i class="bal b1"></i><i class="bal b2"></i><i class="bal b3"></i>',
    cyberpunk: '<i class="city"></i>',
    royale: '<i class="spot s1"></i><i class="spot s2"></i><i class="curtain l"></i><i class="curtain r"></i>',
  };

  const ACTION_LABEL = {
    fold: 'Fold', check: 'Check', call: 'Call', bet: 'Apuesta', raise: 'Sube', allin: 'All-In', SB: 'SB', BB: 'BB',
  };

  class TableView {
    constructor(host, opts) {
      this.host = host;
      this.opts = Object.assign({ heroSeat: 0, deck: 'classic', table: PVP.Catalog.TABLES[0], orientation: 'h', isPrivate: false }, opts);
      this.peek = false;
      this.seatState = [];
      this.boardIds = [];
      this.snap = null;
      this.root = document.createElement('div');
      this.root.className = 't2d';
      this.root.innerHTML = `
        <div class="t2d-scene"></div>
        <div class="t2d-stage">
          <div class="t2d-table"><div class="t2d-rim"></div><div class="t2d-felt"><div class="felt-line"></div><div class="felt-emblem"></div><div class="felt-logo">PokerVegas<b>Pro</b></div></div></div>
          <div class="t2d-fx"></div>
          <div class="t2d-dealer">${Art().dealerSVG()}</div>
          <div class="t2d-center"><div class="t2d-pot"><span class="pot-label">Bote</span><span class="pot-amt">0</span></div><div class="t2d-board"></div><div class="t2d-banner"></div></div>
          <div class="t2d-bets"></div>
          <div class="t2d-dbtn">D</div>
          <div class="t2d-seats"></div>
          <div class="t2d-float"></div>
        </div>`;
      host.appendChild(this.root);
      this.stage = this.root.querySelector('.t2d-stage');
      this.$ = (sel) => this.root.querySelector(sel);
      this.dealerEl = this.$('.t2d-dealer');
      this.boardEl = this.$('.t2d-board');
      this.potEl = this.$('.t2d-pot');
      this.potAmt = this.$('.pot-amt');
      this.bannerEl = this.$('.t2d-banner');
      this.dbtn = this.$('.t2d-dbtn');
      this.floatEl = this.$('.t2d-float');

      this.root.addEventListener('click', (e) => {
        const kick = e.target.closest('.seat-kick');
        if (kick && this.opts.onKick) { e.stopPropagation(); this.opts.onKick(+kick.closest('.seat').dataset.seat); return; }
        const empty = e.target.closest('.seat.empty');
        if (empty && this.opts.onSeatClick) this.opts.onSeatClick(+empty.dataset.seat);
      });

      this.u = 1;
      this._onResize = () => { this.fit(); this.layout(); };
      if (root.ResizeObserver) { this._ro = new ResizeObserver(this._onResize); this._ro.observe(this.root); }
      else root.addEventListener('resize', this._onResize);

      this.setTable(this.opts.table);
      this.setOrientation(this.opts.orientation);
    }

    /* ---------- construcción y layout ---------- */

    build(nSeats) {
      this.n = nSeats;
      this.angles = seatAngles(nSeats, this.orientation === 'v' ? 96 : GAP, this.orientation === 'v' ? 92 : 0);
      const seats = this.$('.t2d-seats');
      const bets = this.$('.t2d-bets');
      seats.innerHTML = '';
      bets.innerHTML = '';
      this.seatEls = [];
      this.betEls = [];
      this.seatState = [];
      for (let i = 0; i < nSeats; i++) {
        const el = document.createElement('div');
        el.className = 'seat empty' + (i === this.opts.heroSeat ? ' hero' : '');
        el.dataset.seat = i;
        el.innerHTML = `
          <div class="seat-cards"></div>
          <div class="seat-plate">
            <div class="seat-avatar"></div>
            <svg class="seat-timer" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20"/></svg>
            <div class="seat-info"><div class="seat-name"></div><div class="seat-stack"></div></div>
            <span class="seat-tag"></span>
          </div>
          <div class="seat-badge"></div>
          <div class="seat-bubble"></div>
          <div class="seat-empty">Libre<b>+</b></div>
          <button class="seat-kick" title="Quitar de la mesa">×</button>`;
        seats.appendChild(el);
        this.seatEls.push(el);
        const b = document.createElement('div');
        b.className = 'bet';
        bets.appendChild(b);
        this.betEls.push(b);
        this.seatState.push({ ids: '', up: null, pid: null, cards: el.querySelector('.seat-cards') });
      }
      this.layout();
    }

    layout() {
      if (!this.seatEls) return;
      const v = this.orientation === 'v';
      this.angles = seatAngles(this.n, v ? 96 : GAP, v ? 92 : 0);
      const sw = Math.max(1, this.stage.clientWidth), sh = Math.max(1, this.stage.clientHeight);
      for (let i = 0; i < this.n; i++) {
        const a = this.angles[this._slot(i)];
        const hero = i === this.opts.heroSeat;
        const p = polar(a, v ? 40 : 45, v ? 41 : 42);
        const b = polar(a, v ? 25 : 30, v ? 26 : 25);
        // Mantener placa y cartas dentro del escenario: nada se corta ni se monta sobre los bordes.
        // Caja real del asiento (o una estimación si aún no se ha pintado): nada se sale del escenario.
        const el = this.seatEls[i];
        const sideHero = hero && !v;
        const estW = this.u * (sideHero ? 150 : 72), estH = this.u * (sideHero ? 48 : hero ? 74 : 52);
        const halfW = (Math.max(estW, el.offsetWidth / 2) * 100) / sw;
        const halfH = (Math.max(estH, el.offsetHeight / 2) * 100) / sh;
        p.x = U.clamp(p.x, halfW, 100 - halfW);
        p.y = U.clamp(p.y, halfH, 100 - halfH);
        this._place(this.seatEls[i], p.x, p.y, '%');
        this._place(this.betEls[i], b.x, b.y, '%');
        (this._seatPos || (this._seatPos = []))[i] = p;
        this.seatEls[i].classList.toggle('upper', p.y < 45);
        this.seatEls[i].classList.toggle('left', p.x < 35);
        this.seatEls[i].classList.toggle('right', p.x > 65);
      }
      this._placeBets();
      this._placeDealerButton();
    }

    /**
     * Coloca cada apuesta justo fuera de la caja real del asiento (cartas + placa), en la dirección del centro
     * de la mesa: las fichas nunca quedan debajo de las cartas.
     */
    _placeBets() {
      if (!this.seatEls) return;
      const W = this.stage.clientWidth, H = this.stage.clientHeight;
      if (!W || !this._seatPos) return;
      const cx = W / 2, cy = H / 2;
      const gap = 10 + 22 * this.u;
      for (let i = 0; i < this.n; i++) {
        // Centro desde la posición asignada (no la medida: puede estar en plena transición) y tamaño real.
        const el = this.seatEls[i], p = this._seatPos[i];
        const r = { width: el.offsetWidth, height: el.offsetHeight };
        if (!r.width || !p) continue;
        const sx = (p.x / 100) * W, sy = (p.y / 100) * H;
        let ux = cx - sx, uy = cy - sy;
        const len = Math.hypot(ux, uy) || 1;
        ux /= len; uy /= len;
        const t = Math.min(Math.abs(ux) > 1e-3 ? r.width / 2 / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-3 ? r.height / 2 / Math.abs(uy) : Infinity);
        const d = Math.min(t + gap, len * 0.72);
        this._place(this.betEls[i], ((sx + ux * d) / W) * 100, ((sy + uy * d) / H) * 100, '%');
      }
    }

    /** Posición (px dentro del escenario) del borde superior central de un asiento. */
    _seatAnchor(seat) {
      const el = this.seatEls && this.seatEls[seat];
      if (!el) return null;
      const sr = this.stage.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: r.left - sr.left + r.width / 2, top: r.top - sr.top, cy: r.top - sr.top + r.height / 2, h: r.height };
    }

    _place(el, x, y, unit) {
      el.style.left = x + unit;
      el.style.top = y + unit;
    }

    _placeDealerButton() {
      const s = this.snap;
      if (!s || s.dealer < 0 || !this.angles) { this.dbtn.style.opacity = 0; return; }
      this.dbtn.style.opacity = 1;
      const v = this.orientation === 'v';
      const p = polar(this.angles[this._slot(s.dealer)] + 14, v ? 33 : 37, v ? 33 : 31);
      this._place(this.dbtn, p.x, p.y, '%');
    }

    /** Posición visual de un asiento: el jugador propio siempre abajo en el centro (las salas online giran la mesa). */
    _slot(i) {
      const h = this.opts.heroSeat;
      return h >= 0 ? (i - h + this.n) % this.n : i;
    }

    setHeroSeat(h) {
      this.opts.heroSeat = h;
      if (!this.seatEls) return;
      this.seatEls.forEach((el, i) => el.classList.toggle('hero', i === h));
      for (const st of this.seatState) { st.pid = null; st.ids = ''; }
      this.layout();
      if (this.snap) this.render(this.snap);
    }

    setOrientation(o) {
      this.orientation = o === 'v' ? 'v' : 'h';
      this.root.classList.toggle('orient-v', this.orientation === 'v');
      this.root.classList.toggle('orient-h', this.orientation === 'h');
      this.fit();
      this.layout();
    }

    /** Ajusta el escenario a la relación de aspecto de la orientación elegida. */
    fit() {
      const w = this.root.clientWidth, h = this.root.clientHeight;
      if (!w || !h) return;
      // La mesa ocupa todo el espacio disponible (con proporciones razonables para que no se deforme).
      const [lo, hi] = this.orientation === 'v' ? [0.56, 0.86] : [1.35, 2.1];
      const ratio = U.clamp(w / h, lo, hi);
      let sw = w, sh = w / ratio;
      if (sh > h) { sh = h; sw = h * ratio; }
      this.stage.style.width = sw + 'px';
      this.stage.style.height = sh + 'px';
      this._scale(sw, sh);
      // Crupier: siempre entero (la cabeza nunca queda bajo la barra superior).
      const above = (h - sh) / 2 + sh * (this.orientation === 'v' ? 0.09 : 0.11);
      const dw = U.clamp(above / (0.74 * 0.864), 64, 150 * this.u);
      this.dealerEl.style.width = dw.toFixed(1) + 'px';
    }

    _scale(sw, sh) {
      // Escala de los elementos según el tamaño real de la mesa (cartas, placas).
      const base = this.orientation === 'v' ? Math.min(sw / 400, sh / 640) : Math.min(sh / 440, sw / 860);
      this.u = U.clamp(base, 0.66, 1.35);
      this.root.style.setProperty('--u', this.u.toFixed(3));
    }

    setTable(t) {
      this.table = t;
      const st = this.root.style;
      st.setProperty('--felt1', t.felt[0]); st.setProperty('--felt2', t.felt[1]);
      st.setProperty('--rim1', t.rim[0]); st.setProperty('--rim2', t.rim[1]);
      st.setProperty('--accent', t.accent);
      st.setProperty('--bg1', t.bg[0]); st.setProperty('--bg2', t.bg[1]);
      this.root.dataset.table = t.id;
      this.root.classList.toggle('neon', !!t.neon);
      this.$('.felt-emblem').innerHTML = Art().tableEmblem(t.id);
      this.$('.t2d-scene').innerHTML = SCENES[t.id] || '';
      this._buildFx(t.fx);
    }

    _buildFx(fx) {
      const el = this.$('.t2d-fx');
      let html = '';
      const n = { stars: 70, bubbles: 22, fireflies: 18, clouds: 6, marquee: 36 }[fx] || 0;
      for (let i = 0; i < n; i++) {
        const style = `--x:${U.rand(0, 100).toFixed(1)}%;--y:${U.rand(0, 100).toFixed(1)}%;--d:${U.rand(3, 12).toFixed(1)}s;--dl:${U.rand(-10, 0).toFixed(1)}s;--s:${U.rand(0.4, 1.4).toFixed(2)}`;
        if (fx === 'marquee') {
          const a = (i / n) * 360;
          const p = polar(a, 49, 47);
          html += `<i class="bulb" style="--x:${p.x}%;--y:${p.y}%;--dl:${(i % 3) * 0.3}s"></i>`;
        } else html += `<i class="fx-${fx}" style="${style}"></i>`;
      }
      if (fx === 'waves') html = '<i class="fx-sun"></i><i class="fx-wave"></i><i class="fx-wave w2"></i>';
      if (fx === 'grid') html = '<i class="fx-grid"></i><i class="fx-scan"></i>';
      el.innerHTML = html;
      el.dataset.fx = fx;
    }

    setDeck(id) {
      this.opts.deck = id;
      for (const s of this.seatState) s.ids = '';
      this.boardIds = [];
      this.boardEl.innerHTML = '';
      if (this.snap) this.render(this.snap);
    }

    setPeek(on) {
      this.peek = on;
      if (this.snap) this.render(this.snap);
    }

    /* ---------- render ---------- */

    render(snap) {
      this.snap = snap;
      if (!this.seatEls) return;
      const hero = this.opts.heroSeat;
      let seatsChanged = false;
      for (let i = 0; i < this.n; i++) {
        const p = snap.seats[i];
        const el = this.seatEls[i];
        const st = this.seatState[i];
        if (el.classList.contains('empty') !== !p) seatsChanged = true;
        el.classList.toggle('empty', !p);
        if (!p) { this._setCards(i, [], false); this.betEls[i].innerHTML = ''; st.pid = null; continue; }

        if (st.pid !== p.id) {
          st.pid = p.id;
          el.querySelector('.seat-avatar').innerHTML = Art().avatarHTML(p, i === hero);
          el.querySelector('.seat-name').textContent = p.name;
          el.querySelector('.seat-tag').textContent = '';
          el.classList.toggle('kickable', !!(this.opts.isPrivate && p.isBot));
        }
        el.querySelector('.seat-stack').textContent = p.stack > 0 || p.inHand ? U.fmt(p.stack) : 'Sin fichas';
        el.classList.toggle('folded', p.inHand && p.folded && snap.phase !== 'idle');
        el.classList.toggle('out', !p.inHand);
        el.classList.toggle('allin', p.inHand && p.allIn && !p.folded);
        el.classList.toggle('acting', snap.toAct === i);
        el.classList.toggle('sitting-out', !!p.sittingOut);
        el.dataset.bounty = p.bounty ? '🎯 ' + U.short(p.bounty) : '';

        const badge = el.querySelector('.seat-badge');
        const a = p.lastAction;
        if (a && p.inHand) {
          const amt = a.amount && a.type !== 'fold' && a.type !== 'check' ? ' ' + U.short(a.amount) : '';
          badge.textContent = (ACTION_LABEL[a.type] || a.type) + amt;
          badge.dataset.type = a.type;
          badge.classList.add('show');
        } else badge.classList.remove('show');

        const isHero = i === hero;
        const visible = isHero || p.revealed;
        const ids = p.inHand ? p.cards.map((c) => (visible ? c : -1)) : [];
        const up = isHero ? (this.peek || p.revealed || (snap.phase === 'ended' && !p.folded)) : p.revealed;
        this._setCards(i, ids, up);

        const betEl = this.betEls[i];
        const betKey = p.bet ? String(p.bet) : '';
        if (betEl.dataset.k !== betKey) {
          betEl.dataset.k = betKey;
          betEl.innerHTML = Art().chipStackHTML(p.bet);
        }
      }
      // Recolocar siempre: al aparecer las cartas el asiento crece y las fichas nunca deben taparlas.
      this._placeBets();
      this._renderBoard(snap.board);
      this.potAmt.textContent = U.fmt(snap.potTotal);
      this.potEl.classList.toggle('show', snap.potTotal > 0);
      this._placeDealerButton();
    }

    _setCards(i, ids, up) {
      const st = this.seatState[i];
      const key = ids.join(',');
      const cont = st.cards;
      if (key !== st.ids) {
        const prevCount = st.ids ? st.ids.split(',').length : 0;
        const fresh = prevCount === 0 && ids.length > 0;
        const reveal = !fresh && ids.length > 0;
        cont.innerHTML = ids.map((c) => Art().cardHTML(c, this.opts.deck, reveal ? false : up)).join('');
        st.ids = key;
        st.up = reveal ? false : up;
        if (fresh) st.needsDeal = true;
        if (reveal && up) this._flipLater(cont, i);
        return;
      }
      if (st.up !== up) {
        st.up = up;
        cont.querySelectorAll('.pcard').forEach((c) => c.classList.toggle('up', up && c.dataset.c !== ''));
      }
    }

    _flipLater(cont, i) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.seatState[i].up = true;
        cont.querySelectorAll('.pcard').forEach((c) => c.classList.add('up'));
      }));
    }

    _renderBoard(board) {
      if (board.length < this.boardIds.length) {
        this.boardEl.innerHTML = '';
        this.boardIds = [];
      }
      const added = [];
      for (let k = this.boardIds.length; k < board.length; k++) {
        const wrap = document.createElement('div');
        wrap.innerHTML = Art().cardHTML(board[k], this.opts.deck, false);
        const card = wrap.firstElementChild;
        this.boardEl.appendChild(card);
        this.boardIds.push(board[k]);
        added.push(card);
      }
      added.forEach((card, idx) => {
        this._flyFromDealer(card, idx * 140, 420);
        setTimeout(() => { card.classList.add('up'); if (PVP.Sound && PVP.Sound.flip) PVP.Sound.flip(); }, 360 + idx * 140);
        if (PVP.Sound) PVP.Sound.card(idx * 0.14);
      });
    }

    /* ---------- animaciones ---------- */

    _dealerPoint() {
      const r = this.dealerEl.getBoundingClientRect();
      return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.9 };
    }

    _flyFromDealer(el, delay, dur) {
      if (!el.animate) return;
      const from = this._dealerPoint();
      const r = el.getBoundingClientRect();
      const dx = from.x - (r.left + r.width / 2), dy = from.y - (r.top + r.height / 2);
      // Deslizamiento en arco con un pequeño rebote al asentarse (solo transform/opacity: va por GPU).
      el.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(-160deg) scale(.45)`, opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { transform: `translate3d(${dx * 0.12}px, ${dy * 0.12 - 10}px, 0) rotate(-8deg) scale(1.04)`, opacity: 1, offset: 0.82 },
          { transform: 'translate3d(0,0,0) rotate(0) scale(1)', opacity: 1 },
        ],
        { duration: dur * 1.15, delay, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'backwards' }
      );
    }

    dealerGesture(ms) {
      this.dealerEl.classList.add('dealing');
      clearTimeout(this._dealT);
      this._dealT = setTimeout(() => this.dealerEl.classList.remove('dealing'), ms || 900);
    }

    animateDeal(order) {
      let k = 0;
      const total = order.length * 2;
      for (let r = 0; r < 2; r++) {
        for (const seat of order) {
          const st = this.seatState[seat];
          const card = st.cards.children[r];
          if (card) this._flyFromDealer(card, k * 110, 380);
          if (PVP.Sound) PVP.Sound.card(k * 0.11);
          st.needsDeal = false;
          k++;
        }
      }
      this.dealerGesture(total * 110 + 300);
    }

    animateCollect() {
      const pot = this.potEl.getBoundingClientRect();
      for (const b of this.betEls) {
        if (!b.innerHTML || !b.animate) continue;
        const r = b.getBoundingClientRect();
        const clone = b.cloneNode(true);
        clone.classList.add('flying');
        clone.style.left = r.left + r.width / 2 + 'px';
        clone.style.top = r.top + r.height / 2 + 'px';
        document.body.appendChild(clone);
        const dx = pot.left + pot.width / 2 - (r.left + r.width / 2);
        const dy = pot.top + pot.height / 2 - (r.top + r.height / 2);
        clone.animate([
          { transform: 'translate3d(-50%,-50%,0)' },
          { transform: `translate3d(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.55 - 18}px), 0)`, offset: 0.55 },
          { transform: `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0) scale(.7)`, opacity: 0.15 },
        ], { duration: 480, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => clone.remove();
      }
      if (PVP.Sound) PVP.Sound.chip();
    }

    animatePotTo(seats) {
      const pot = this.potEl.getBoundingClientRect();
      seats.forEach((s, i) => {
        const seat = this.seatEls[s];
        if (!seat) return;
        const r = seat.querySelector('.seat-plate').getBoundingClientRect();
        const chip = document.createElement('div');
        chip.className = 'bet flying';
        chip.innerHTML = Art().chipStackHTML(this.snap ? Math.max(1, this.snap.bb * 4) : 100).replace(/<span class="chip-amt">.*<\/span>/, '');
        chip.style.left = pot.left + pot.width / 2 + 'px';
        chip.style.top = pot.top + pot.height / 2 + 'px';
        document.body.appendChild(chip);
        const dx = r.left + r.width / 2 - (pot.left + pot.width / 2);
        const dy = r.top + r.height / 2 - (pot.top + pot.height / 2);
        if (!chip.animate) { chip.remove(); return; }
        // Las fichas viajan en arco hacia el ganador.
        chip.animate([
          { transform: 'translate3d(-50%,-50%,0) scale(1.1)' },
          { transform: `translate3d(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 40}px), 0) scale(1.15)`, offset: 0.5 },
          { transform: `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0) scale(.8)`, opacity: 0.2 },
        ], { duration: 760, delay: i * 120, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'backwards' }).onfinish = () => chip.remove();
      });
    }

    highlight(result) {
      this.clearHighlight();
      if (!result || result.uncontested) {
        if (result) for (const s of result.pots[0].winners) this.seatEls[s].classList.add('winner');
        return;
      }
      const main = result.pots[0];
      const best = main && result.hands[main.winners[0]] ? result.hands[main.winners[0]].best : [];
      for (const pot of result.pots) for (const s of pot.winners) this.seatEls[s].classList.add('winner');
      this.root.classList.add('showdown');
      this.root.querySelectorAll('.pcard').forEach((c) => {
        if (c.dataset.c === '') return;
        c.classList.toggle('best', best.includes(+c.dataset.c));
      });
    }

    clearHighlight() {
      this.root.classList.remove('showdown');
      this.root.querySelectorAll('.seat.winner').forEach((s) => s.classList.remove('winner'));
      this.root.querySelectorAll('.pcard.best').forEach((c) => c.classList.remove('best'));
    }

    banner(html, ms) {
      this.bannerEl.innerHTML = html;
      this.bannerEl.classList.add('show');
      clearTimeout(this._bannerT);
      this._bannerT = setTimeout(() => this.bannerEl.classList.remove('show'), ms || 2600);
    }

    startTimer(seat, ms) {
      this.stopTimer();
      const el = this.seatEls && this.seatEls[seat];
      if (!el) return;
      const t = el.querySelector('.seat-timer');
      t.style.setProperty('--dur', ms + 'ms');
      t.classList.remove('run');
      void t.getBoundingClientRect();
      t.classList.add('run');
      this._timerSeat = seat;
    }

    stopTimer() {
      if (this._timerSeat == null || !this.seatEls[this._timerSeat]) return;
      this.seatEls[this._timerSeat].querySelector('.seat-timer').classList.remove('run');
      this._timerSeat = null;
    }

    /* Emotes y mensajes van en la capa flotante superior: ninguna carta ni ficha puede taparlos. */
    emote(seat, emoji) {
      const a = this._seatAnchor(seat);
      if (!a) return;
      const f = document.createElement('span');
      f.className = 'emote-float';
      f.textContent = emoji;
      f.style.left = a.x + 'px';
      f.style.top = a.cy + 'px';
      this.floatEl.appendChild(f);
      setTimeout(() => f.remove(), 2400);
    }

    bubble(seat, text) {
      const a = this._seatAnchor(seat);
      if (!a) return;
      this.bubbles = this.bubbles || {};
      let b = this.bubbles[seat];
      if (!b) {
        b = this.bubbles[seat] = document.createElement('div');
        b.className = 'seat-bubble float';
        this.floatEl.appendChild(b);
      }
      b.textContent = text;
      // Encima del asiento; si no cabe arriba, debajo.
      const below = a.top < 46;
      b.classList.toggle('below', below);
      b.style.left = U.clamp(a.x, 70, this.stage.clientWidth - 70) + 'px';
      b.style.top = (below ? a.top + a.h + 6 : a.top - 6) + 'px';
      b.classList.add('show');
      clearTimeout(b._t);
      b._t = setTimeout(() => b.classList.remove('show'), 3400);
    }

    shark() {
      const s = document.createElement('div');
      s.className = 'shark';
      s.innerHTML = Art().sharkSVG();
      this.floatEl.appendChild(s);
      setTimeout(() => s.remove(), 4200);
    }

    /** Punto de entrada de eventos del motor. */
    onEvent(type, payload, snap) {
      if (type === 'handStart') { this.clearHighlight(); this.bannerEl.classList.remove('show'); if (PVP.Sound && PVP.Sound.shuffle) PVP.Sound.shuffle(); }
      if (type === 'collect') { this.animateCollect(); if (PVP.Sound && PVP.Sound.collect) PVP.Sound.collect(); }
      this.render(snap);
      if (type === 'deal') this.animateDeal(payload.order);
      if (type === 'street') this.dealerGesture(700);
      if (type === 'action' && payload.action.type === 'fold' && PVP.Sound) PVP.Sound.fold();
      if (type === 'action' && /call|bet|raise|allin/.test(payload.action.type) && PVP.Sound) PVP.Sound.chip();
    }

    destroy() {
      if (this._ro) this._ro.disconnect();
      else root.removeEventListener('resize', this._onResize);
      this.root.remove();
    }
  }

  PVP.TableView = TableView;
})(typeof window !== 'undefined' ? window : globalThis);
