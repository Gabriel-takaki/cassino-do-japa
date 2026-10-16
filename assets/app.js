const pages = [
  ['index.html', 'Início'],
  ['checkin.html', 'Check-in'],
  ['jogos.html', 'Jogos'],
  ['fichas.html', 'Fichas'],
  ['cardapio.html', 'Cardápio'],
  ['ranking.html', 'Ranking'],
  ['qr.html', 'QR Codes'],
];

const current = document.body.dataset.page || 'index.html';
const header = document.querySelector('[data-header]');
const footer = document.querySelector('[data-footer]');

if (header) {
  header.innerHTML = `
    <header class="topbar">
      <div class="shell nav">
        <a class="brand" href="index.html" aria-label="Cassino do Japa — início">
          <span class="brand-mark">♦</span><span class="brand-name">Cassino do Japa</span>
        </a>
        <button class="menu-button" type="button" aria-label="Abrir menu" aria-expanded="false">Menu</button>
        <nav class="menu" aria-label="Navegação principal">
          ${pages.map(([href, label]) => `<a href="${href}" class="${current === href ? 'active' : ''}">${label}</a>`).join('')}
        </nav>
      </div>
    </header>`;

  const button = header.querySelector('.menu-button');
  const menu = header.querySelector('.menu');
  button.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
}

if (footer) {
  footer.innerHTML = `
    <footer class="footer">
      <div class="shell footer-inner">
        <div class="brand"><span class="brand-mark">♦</span><span class="brand-name">Cassino do Japa</span></div>
        <span>Fichas são pontos fictícios. Jogue, brinde e divirta-se.</span>
      </div>
    </footer>`;
}

const currency = value => new Intl.NumberFormat('pt-BR').format(value);

function initRanking() {
  const form = document.querySelector('[data-score-form]');
  const list = document.querySelector('[data-score-list]');
  if (!form || !list) return;

  const key = 'cassino-do-japa-ranking-v1';
  let players = JSON.parse(localStorage.getItem(key) || '[]');

  const save = () => localStorage.setItem(key, JSON.stringify(players));
  const render = () => {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    list.innerHTML = sorted.length ? sorted.map((player, index) => `
      <div class="score-row">
        <span class="place">${index + 1}</span>
        <strong>${player.name}</strong>
        <span class="score">$ ${currency(player.score)}</span>
        <button class="icon-button" data-remove="${player.id}" aria-label="Remover ${player.name}">✕</button>
      </div>`).join('') : '<div class="empty">Nenhum jogador no placar ainda.</div>';
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const score = Number(data.get('score'));
    if (!name || Number.isNaN(score)) return;
    const existing = players.find(player => player.name.toLowerCase() === name.toLowerCase());
    if (existing) existing.score = score;
    else players.push({ id: crypto.randomUUID(), name, score });
    save();
    render();
    form.reset();
    form.elements.name.focus();
  });

  list.addEventListener('click', event => {
    const id = event.target.dataset.remove;
    if (!id) return;
    players = players.filter(player => player.id !== id);
    save();
    render();
  });

  document.querySelector('[data-reset-ranking]')?.addEventListener('click', () => {
    if (!confirm('Zerar todo o ranking?')) return;
    players = [];
    save();
    render();
  });

  render();
}

function initQRCodes() {
  const grid = document.querySelector('[data-qr-grid]');
  if (!grid) return;
  const root = new URL('.', window.location.href);
  const targets = [
    ['Check-in', 'checkin.html'],
    ['Regras gerais', 'jogos.html'],
    ['Blackjack', 'blackjack.html'],
    ['Dados', 'dados.html'],
    ['Poker', 'poker.html'],
    ['Fichas & banco', 'fichas.html'],
    ['Cardápio', 'cardapio.html'],
    ['Ranking', 'ranking.html'],
  ];
  grid.innerHTML = targets.map(([label, path]) => {
    const url = new URL(path, root).href;
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(url)}`;
    return `<article class="qr-card"><img src="${src}" alt="QR Code para ${label}"><h3>${label}</h3><p>${url}</p></article>`;
  }).join('');
}

async function initCheckin() {
  const form = document.querySelector('[data-checkin-form]');
  if (!form) return;

  const status = document.querySelector('[data-checkin-status]');
  const count = document.querySelector('[data-checkin-count]');
  const button = form.querySelector('button[type="submit"]');
  const config = window.CASSINO_CONFIG || {};
  const baseUrl = String(config.supabaseUrl || '').replace(/\/$/, '');
  const key = String(config.supabaseAnonKey || '');

  const show = (message, type = '') => {
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
    status.hidden = false;
  };

  if (!baseUrl || !key) {
    show('O check-in está sendo configurado. Tente novamente em alguns minutos.', 'error');
    button.disabled = true;
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    const response = await fetch(`${baseUrl}/rest/v1/rpc/checkin_count`, {
      method: 'POST', headers, body: '{}'
    });
    if (response.ok) count.textContent = await response.json();
  } catch (_) {
    count.textContent = '—';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = String(new FormData(form).get('name') || '').trim();
    if (name.length < 2) {
      show('Digite seu nome ou apelido.', 'error');
      return;
    }

    button.disabled = true;
    button.textContent = 'Confirmando…';
    status.hidden = true;

    try {
      const response = await fetch(`${baseUrl}/rest/v1/checkins`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ name })
      });

      if (response.status === 409) {
        show('Esse nome já fez check-in. Pode entrar e aproveitar a noite! 🎰', 'success');
        form.reset();
        return;
      }
      if (!response.ok) throw new Error('checkin_failed');

      const rows = await response.json();
      const time = new Date(rows[0].checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      show(`Check-in confirmado às ${time}. Seu saldo inicial é $2.340. Boa sorte! 🎉`, 'success');
      form.reset();
      if (count.textContent !== '—') count.textContent = String(Number(count.textContent || 0) + 1);
    } catch (_) {
      show('Não foi possível confirmar agora. Verifique a conexão e tente novamente.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Confirmar check-in';
    }
  });
}

initRanking();
initQRCodes();
initCheckin();
