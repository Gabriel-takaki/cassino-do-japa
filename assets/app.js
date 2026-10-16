const pages = [
  ['index.html', 'Início'],
  ['checkin.html', 'Check-in'],
  ['slot.html', 'Caça-níquel'],
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
    ['Caça-níquel', 'slot.html'],
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

function initSlotMachine() {
  const machine = document.querySelector('[data-slot-machine]');
  if (!machine) return;

  const reels = [...machine.querySelectorAll('[data-reel]')];
  const button = machine.querySelector('[data-spin]');
  const result = machine.querySelector('[data-slot-result]');
  const symbols = ['🍒', '🍋', '🔔', '⭐', '7️⃣', '💎'];
  const key = 'cassino-do-japa-slot-v1';
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  const randomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];
  const makeCode = () => {
    const bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    return `JAPA-${[...bytes].map(value => (value % 36).toString(36).toUpperCase()).join('')}`;
  };

  const playTone = (frequency, duration = .1) => {
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.05, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch (_) { /* O jogo continua normalmente sem áudio. */ }
  };

  const showResult = state => {
    reels.forEach((reel, index) => { reel.textContent = state.symbols[index]; });
    machine.classList.toggle('win', state.win);
    result.hidden = false;
    result.className = `slot-result ${state.win ? 'winner' : 'try-again'}`;
    result.innerHTML = state.win
      ? `<strong>JACKPOT! +$100 EM FICHAS</strong><span>Mostre esta tela ao banqueiro.</span><code>${state.claimCode}</code>`
      : '<strong>Não foi dessa vez!</strong><span>Seu giro foi utilizado. Continue a sorte nas mesas.</span>';
    button.disabled = true;
    button.textContent = 'Giro utilizado';
  };

  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved?.symbols?.length === 3) showResult(saved);
  } catch (_) { /* Se o armazenamento falhar, o jogo continua. */ }

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = 'Girando…';
    result.hidden = true;
    machine.classList.remove('win');
    reels.forEach(reel => reel.classList.add('spinning'));

    const win = Math.random() < .2;
    let finalSymbols;
    if (win) {
      const winningSymbol = randomSymbol();
      finalSymbols = [winningSymbol, winningSymbol, winningSymbol];
    } else {
      do finalSymbols = [randomSymbol(), randomSymbol(), randomSymbol()];
      while (finalSymbols.every(symbol => symbol === finalSymbols[0]));
    }

    const intervals = reels.map((reel, index) => setInterval(() => {
      reel.textContent = randomSymbol();
    }, 65 + index * 12));

    for (let index = 0; index < reels.length; index += 1) {
      await wait(850 + index * 280);
      clearInterval(intervals[index]);
      reels[index].textContent = finalSymbols[index];
      reels[index].classList.remove('spinning');
      playTone(260 + index * 120);
    }

    const state = {
      symbols: finalSymbols,
      win,
      claimCode: win ? makeCode() : null,
      playedAt: new Date().toISOString()
    };
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) { /* Sem persistência. */ }
    if (win) {
      playTone(880, .5);
      if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
    }
    showResult(state);
  });
}

function initCheckin() {
  const form = document.querySelector('[data-checkin-form]');
  if (!form) return;

  const status = document.querySelector('[data-checkin-status]');
  const button = form.querySelector('button[type="submit"]');
  const key = 'cassino-do-japa-checkins-v1';

  const show = (message, type = '') => {
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
    status.hidden = false;
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = String(new FormData(form).get('name') || '').trim();
    if (name.length < 2) {
      show('Digite seu nome ou apelido.', 'error');
      return;
    }

    const normalized = name.toLocaleLowerCase('pt-BR');
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    const existing = saved.find(entry => entry.normalized === normalized);
    const checkedInAt = existing?.checkedInAt || new Date().toISOString();

    if (!existing) {
      saved.push({ name, normalized, checkedInAt });
      localStorage.setItem(key, JSON.stringify(saved));
    }

    const time = new Date(checkedInAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const prefix = existing ? `${name}, seu check-in já estava confirmado` : `${name}, check-in confirmado`;
    show(`${prefix} às ${time}. Seu saldo inicial é $2.340. Boa sorte! 🎉`, 'success');
    form.reset();
  });
}

initRanking();
initQRCodes();
initCheckin();
initSlotMachine();
