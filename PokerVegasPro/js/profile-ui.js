/* PokerVegasPro — editor de perfil: galería de personajes, vestuario y foto propia. */
(function (root) {
  'use strict';

  const PVP = root.PVP;
  const A = PVP.Avatars;
  const U = PVP.util;
  const $ = (s, r) => (r || document).querySelector(s);

  let draft = null;
  let img = null;
  let tab = 'models';
  let store = null;
  let onSave = null;

  function open(st, cb) {
    store = st;
    onSave = cb;
    const prefs = store.profile.prefs;
    draft = Object.assign({ base: 'marco' }, prefs.look || {});
    img = prefs.avatarImg || null;
    tab = 'models';
    render();
    PVP.ui.open('modal-profile');
  }

  function swatches(list, key, cur) {
    return `<div class="pf-swatches">${list.map(([v, label]) =>
      `<button type="button" class="pf-sw${v === cur ? ' on' : ''}" data-set="${key}" data-v="${v}" title="${U.esc(label)}" style="--c:${v}"><span class="sr-only">${U.esc(label)}</span></button>`).join('')}</div>`;
  }

  function chips(list, key, cur) {
    return `<div class="pf-chips">${list.map(([v, label]) =>
      `<button type="button" class="pf-chip${v === cur ? ' on' : ''}" data-set="${key}" data-v="${v}">${U.esc(label)}</button>`).join('')}</div>`;
  }

  function render() {
    const L = A.resolve(draft);
    const b = A.base(L.base);
    $('#pf-big').innerHTML = A.avatarHTML(draft, img, 'big');
    $('#pf-name').textContent = store.profile.name;
    $('#pf-model').textContent = `${b.name} · ${b.origin}${img ? ' · foto propia' : ''}`;
    $('#pf-remove-img').style.display = img ? '' : 'none';
    document.querySelectorAll('#pf-tabs button').forEach((x) => x.classList.toggle('on', x.dataset.v === tab));

    if (tab === 'models') {
      $('#pf-body').innerHTML = `<div class="pf-gallery">${A.ROSTER.map((r) => `
        <button type="button" class="pf-model${r.id === L.base ? ' on' : ''}" data-base="${r.id}">
          ${A.portraitSVG({ base: r.id })}<b>${U.esc(r.name)}</b><small>${U.esc(r.origin)}</small></button>`).join('')}</div>
        <p class="pf-note">Tu personaje te representa en las mesas y en las salas con amigos. Si subes una foto, se usa como avatar.</p>`;
      return;
    }
    const sex = L.sex;
    $('#pf-body').innerHTML = `
      <h4>Color del traje</h4>${swatches(A.SUIT_COLORS, 'suit', L.suit)}
      <h4>Peinado</h4>${chips(A.HAIR_STYLES[sex], 'hair', L.hair)}
      <h4>Color de pelo</h4>${swatches(A.HAIR_COLORS, 'hairColor', L.hairColor)}
      <h4>Accesorio</h4>${chips(A.ACCESSORIES[sex], 'acc', L.acc)}
      ${sex === 'm' ? `<h4>Barba</h4>${chips([['no', 'Sin barba'], ['yes', 'Con barba']], 'beard', L.beard ? 'yes' : 'no')}` : ''}
      <button type="button" class="adm-link" id="pf-reset">Restablecer el estilo del personaje</button>`;
  }

  document.addEventListener('click', (e) => {
    if (!draft || !e.target.closest('#modal-profile')) return;
    const m = e.target.closest('[data-base]');
    if (m) {
      // Al cambiar de modelo se parte de su estilo original.
      draft = { base: m.dataset.base };
      return render();
    }
    const t = e.target.closest('#pf-tabs button');
    if (t) { tab = t.dataset.v; return render(); }
    const s = e.target.closest('[data-set]');
    if (s) {
      const k = s.dataset.set;
      draft[k] = k === 'beard' ? s.dataset.v === 'yes' : s.dataset.v;
      return render();
    }
    if (e.target.closest('#pf-reset')) { draft = { base: draft.base }; return render(); }
    if (e.target.closest('#pf-remove-img')) { img = null; return render(); }
    if (e.target.closest('#pf-save')) {
      store.setPref('look', draft);
      store.setPref('avatarImg', img);
      PVP.ui.close('modal-profile');
      PVP.ui.toast('Perfil actualizado');
      if (onSave) onSave();
    }
    if (e.target.closest('#pf-cancel')) PVP.ui.close('modal-profile');
  });

  document.addEventListener('change', async (e) => {
    if (e.target.id !== 'pf-file') return;
    try {
      img = await A.processUpload(e.target.files[0]);
      render();
    } catch (err) {
      PVP.ui.toast('⚠️ ' + U.esc(err.message));
    }
    e.target.value = '';
  });

  PVP.ProfileUI = { open };
})(window);
