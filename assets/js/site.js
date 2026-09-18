/* LAZT Studios — page interactions */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CONTACT_EMAIL = 'rodney@laztstudios.com';

  /* -------------------------------------------- nav + back-to-top state */
  const nav = $('.nav');
  const toTop = $('.totop');
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 12);
    toTop.classList.toggle('is-visible', y > 700);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --------------------------------------------------------- mobile menu */
  const toggle = $('.nav__toggle');
  const menu = $('#menu');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* --------------------------------------------------- reveal on scroll */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  /* ------------------------------------------------- active nav section */
  const links = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        links.forEach(a => a.classList.toggle('is-active', a.hash === '#' + en.target.id));
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const s = document.getElementById(a.hash.slice(1)); if (s) spy.observe(s); });
  }

  /* ---------------------------------------- demo: load the viewer on click */
  const frame = $('#demo-frame');
  const loadBtn = $('#demo-load');
  if (frame && loadBtn) {
    loadBtn.addEventListener('click', () => {
      if (frame.querySelector('iframe')) return;
      frame.classList.add('is-loading');
      $('.demo__label', loadBtn).textContent = 'Loading…';
      const iframe = document.createElement('iframe');
      iframe.src = frame.dataset.src;
      iframe.title = '3D campus courtyard demo';
      iframe.allow = 'fullscreen; xr-spatial-tracking';
      iframe.addEventListener('load', () => {
        frame.classList.remove('is-loading');
        frame.classList.add('is-loaded');
      }, { once: true });
      frame.appendChild(iframe);
    });
  }

  /* ------------------------------ buttons that preselect the form interest */
  $$('[data-interest]').forEach(el => el.addEventListener('click', () => {
    const radio = $$('input[name="interest"]').find(r => r.value === el.dataset.interest);
    if (radio) radio.checked = true;
  }));

  /* ------------------------------------ contact form → FormSubmit relay */
  const form = $('#contact-form');
  if (form) {
    const note = $('.form__note', form);
    const btn = $('button[type="submit"]', form);
    const btnText = $('.btn__text', btn);
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const setNote = (html, isError) => { note.innerHTML = html; note.classList.toggle('is-error', !!isError); };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = form.elements;
      const data = {
        interest: (form.querySelector('input[name="interest"]:checked') || {}).value || '',
        name: f.namedItem('name').value.trim(),
        email: f.namedItem('email').value.trim(),
        organization: f.namedItem('organization').value.trim(),
        role: f.namedItem('role').value.trim(),
        message: f.namedItem('message').value.trim(),
      };
      if (f.namedItem('_honey').value) return;       // bot

      const nameOk = data.name.length > 1;
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      f.namedItem('name').setAttribute('aria-invalid', String(!nameOk));
      f.namedItem('email').setAttribute('aria-invalid', String(!emailOk));
      if (!nameOk || !emailOk) {
        setNote(!nameOk ? 'Add your name so we know who to reply to.' : 'Enter a valid email so we can reply.', true);
        (!nameOk ? f.namedItem('name') : f.namedItem('email')).focus();
        return;
      }

      btn.disabled = true;
      btnText.textContent = 'Sending…';
      setNote('');
      try {
        const res = await fetch('https://formsubmit.co/ajax/' + CONTACT_EMAIL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            ...data,
            _subject: `LAZT site: ${data.interest}${data.organization ? ' · ' + data.organization : ''}`,
            _replyto: data.email,
            _template: 'table',
            _captcha: 'false',
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !(json.success === true || json.success === 'true')) throw new Error(json.message || 'send failed');
        form.innerHTML =
          '<div class="form__done" role="status">' +
          '<p class="kicker">Message sent</p>' +
          `<h3>Thanks, ${esc(data.name.split(/\s+/)[0])}.</h3>` +
          `<p>We'll get back to you at ${esc(data.email)}.</p>` +
          '</div>';
      } catch (err) {
        btn.disabled = false;
        btnText.textContent = 'Send';
        setNote(`Couldn't send right now. Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> instead.`, true);
      }
    });

    form.addEventListener('input', e => {
      if (e.target.getAttribute('aria-invalid') === 'true') e.target.removeAttribute('aria-invalid');
    });
  }

  /* ---------------------------------------------------------------- year */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
