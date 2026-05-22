(function () {
  'use strict';

  const socket = io();
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const state = {
    playerId: null,
    code: null,
    room: null,
    timerHandle: null,
    lastLetter: null
  };

  // ---------- Helpers ----------
  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.add('hidden'));
    $('#screen-' + id).classList.remove('hidden');
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._h);
    toast._h = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function setHostBody(isHost) {
    document.body.classList.toggle('is-host', !!isHost);
  }

  function saveSession() {
    try {
      localStorage.setItem('slf-session', JSON.stringify({
        code: state.code, name: $('#input-name').value
      }));
    } catch (e) {}
  }

  function loadSession() {
    try {
      const data = JSON.parse(localStorage.getItem('slf-session') || '{}');
      if (data.name) $('#input-name').value = data.name;
    } catch (e) {}
  }

  // ---------- Home-Bildschirm ----------
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      $('#tab-join').classList.toggle('hidden', which !== 'join');
      $('#tab-create').classList.toggle('hidden', which !== 'create');
    });
  });

  $('#btn-create').addEventListener('click', () => {
    const name = ($('#input-name').value || '').trim();
    if (!name) return toast('Bitte gib deinen Namen ein.');
    saveSession();
    socket.emit('create-room', { name });
  });

  $('#btn-join').addEventListener('click', () => {
    const name = ($('#input-name').value || '').trim();
    const code = ($('#input-code').value || '').trim().toUpperCase();
    if (!name) return toast('Bitte gib deinen Namen ein.');
    if (code.length < 3) return toast('Bitte gib den Session-Code ein.');
    saveSession();
    socket.emit('join-room', { code, name });
  });

  // ---------- Lobby ----------
  $('#btn-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.code);
      toast('Code kopiert: ' + state.code);
    } catch (e) {
      toast('Code: ' + state.code);
    }
  });

  $('#btn-start').addEventListener('click', () => {
    const cats = $('#setting-categories').value;
    const rounds = parseInt($('#setting-rounds').value) || 5;
    const duration = parseInt($('#setting-duration').value) || 90;
    const categories = cats.split(',').map(c => c.trim()).filter(Boolean);
    socket.emit('update-settings', { categories, totalRounds: rounds, roundDuration: duration });
    socket.emit('start-round');
  });

  $('#btn-leave').addEventListener('click', () => {
    socket.disconnect();
    setTimeout(() => location.reload(), 100);
  });

  // ---------- Spiel ----------
  $('#btn-stop').addEventListener('click', () => {
    if (!confirm('Stopp drücken? Damit endet die Runde sofort für alle!')) return;
    socket.emit('stop-round');
  });

  // ---------- Auswertung ----------
  $('#btn-finish-scoring').addEventListener('click', () => {
    socket.emit('finish-scoring');
  });

  // ---------- Ergebnisse ----------
  $('#btn-next-round').addEventListener('click', () => {
    socket.emit('start-round');
  });

  $('#btn-new-game').addEventListener('click', () => {
    socket.emit('new-game');
  });

  // ---------- Socket-Events ----------
  socket.on('connect', () => {
    loadSession();
  });

  socket.on('joined', ({ code, playerId }) => {
    state.code = code;
    state.playerId = playerId;
    saveSession();
  });

  socket.on('error-message', (msg) => {
    toast(msg || 'Fehler');
  });

  socket.on('room-update', (room) => {
    state.room = room;
    const isHost = room.hostId === state.playerId;
    setHostBody(isHost);
    render(room);
  });

  // ---------- Render ----------
  function render(room) {
    if (room.state === 'lobby') renderLobby(room);
    else if (room.state === 'playing') renderPlay(room);
    else if (room.state === 'scoring') renderScoring(room);
    else if (room.state === 'roundResults' || room.state === 'gameOver') renderResults(room);
  }

  function renderLobby(room) {
    showScreen('lobby');
    $('#lobby-code').textContent = room.code;
    $('#player-count').textContent = room.players.length;
    $('#setting-rounds').value = room.totalRounds;
    $('#setting-duration').value = room.roundDuration;
    if (document.activeElement !== $('#setting-categories')) {
      $('#setting-categories').value = room.categories.join(', ');
    }

    const list = $('#lobby-players');
    list.innerHTML = '';
    const isHost = room.hostId === state.playerId;
    for (const p of room.players) {
      const li = document.createElement('li');
      if (!p.connected) li.classList.add('offline');
      li.innerHTML = `
        <span class="status"></span>
        <span class="name"></span>
        ${p.isHost ? '<span class="role">SPIELLEITER</span>' : ''}
      `;
      li.querySelector('.name').textContent = p.name + (p.id === state.playerId ? ' (du)' : '');
      if (isHost && p.id !== state.playerId) {
        const kick = document.createElement('button');
        kick.className = 'kick';
        kick.textContent = '✕';
        kick.title = 'Entfernen';
        kick.onclick = () => {
          if (confirm(`${p.name} aus der Session entfernen?`)) {
            socket.emit('kick-player', { playerId: p.id });
          }
        };
        li.appendChild(kick);
      }
      list.appendChild(li);
    }
  }

  let lastRenderedLetter = null;
  function renderPlay(room) {
    showScreen('play');
    $('#play-round').textContent = room.currentRound;
    $('#play-total').textContent = room.totalRounds;
    $('#play-letter').textContent = room.letter;

    // Re-build Formular wenn neuer Buchstabe oder neue Kategorien
    const sig = room.letter + '|' + room.categories.join(',');
    if (sig !== lastRenderedLetter) {
      lastRenderedLetter = sig;
      const form = $('#play-form');
      form.innerHTML = '';
      const me = room.players.find(p => p.id === state.playerId);
      for (const cat of room.categories) {
        const wrap = document.createElement('div');
        wrap.className = 'cat-field';
        const id = 'cat-' + cat.replace(/\W+/g, '_');
        wrap.innerHTML = `<label for="${id}">${escapeHtml(cat)}</label>`;
        const input = document.createElement('input');
        input.id = id;
        input.type = 'text';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.dataset.cat = cat;
        input.placeholder = room.letter + '…';
        input.addEventListener('input', () => {
          input.classList.toggle('filled', input.value.trim().length > 0);
          socket.emit('update-answer', { category: cat, value: input.value });
        });
        wrap.appendChild(input);
        form.appendChild(wrap);
      }
      // Erstes Feld fokussieren
      setTimeout(() => form.querySelector('input')?.focus(), 60);
    }

    // Timer
    startTimer(room.endTime);

    // Fortschritt anderer Spieler
    const prog = $('#play-progress');
    prog.innerHTML = '';
    const total = room.categories.length;
    for (const p of room.players) {
      if (p.id === state.playerId) continue;
      const chip = document.createElement('div');
      chip.className = 'chip' + (p.answersFilled >= total ? ' done' : '');
      chip.textContent = p.name + ' ' + p.answersFilled + '/' + total;
      prog.appendChild(chip);
    }
  }

  function startTimer(endTime) {
    if (state.timerHandle) clearInterval(state.timerHandle);
    if (!endTime) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const el = $('#play-timer');
      el.textContent = m + ':' + s.toString().padStart(2, '0');
      el.classList.toggle('warn', remaining <= 10);
      if (remaining <= 0) clearInterval(state.timerHandle);
    };
    tick();
    state.timerHandle = setInterval(tick, 250);
  }

  function renderScoring(room) {
    showScreen('scoring');
    $('#score-round').textContent = room.currentRound;
    $('#score-letter').textContent = room.letter;

    const stopper = room.players.find(p => p.id === room.stopperId);
    $('#score-info').textContent = stopper
      ? `${stopper.name} hat gestoppt — überprüft jetzt die Antworten:`
      : 'Zeit abgelaufen — überprüft jetzt die Antworten:';

    const container = $('#scoring-list');
    container.innerHTML = '';

    for (const cat of room.categories) {
      const block = document.createElement('div');
      block.className = 'score-cat';
      const title = document.createElement('h4');
      title.textContent = cat;
      block.appendChild(title);

      const entries = (room.answers && room.answers[cat]) || [];
      for (const entry of entries) {
        const row = document.createElement('div');
        row.className = 'score-row' + (entry.valid ? '' : ' invalid');

        const nameEl = document.createElement('span');
        nameEl.className = 'name';
        nameEl.textContent = entry.name;

        const ansEl = document.createElement('span');
        ansEl.className = 'ans';
        if (!entry.answer) {
          ansEl.innerHTML = '<span class="empty">(leer)</span>';
        } else {
          ansEl.textContent = entry.answer;
        }

        row.appendChild(nameEl);
        row.appendChild(ansEl);

        if (entry.playerId !== state.playerId && entry.answer) {
          const cnt = document.createElement('span');
          cnt.className = 'vote-count';
          cnt.textContent = entry.downvotes > 0 ? '✕' + entry.downvotes : '';
          row.appendChild(cnt);

          const btn = document.createElement('button');
          btn.className = 'vote-btn' + (entry.myVote === false ? ' active invalid' : '');
          btn.textContent = entry.myVote === false ? '✕' : '?';
          btn.title = 'Antwort als ungültig markieren';
          btn.onclick = () => {
            socket.emit('vote', {
              category: cat,
              targetPlayerId: entry.playerId,
              valid: entry.myVote === false ? null : false
            });
          };
          row.appendChild(btn);
        }

        block.appendChild(row);
      }
      container.appendChild(block);
    }
  }

  function renderResults(room) {
    showScreen('results');
    const isFinal = room.state === 'gameOver';
    $('#results-title').textContent = isFinal
      ? '🏆 Endstand'
      : `Zwischenstand — Runde ${room.currentRound}/${room.totalRounds}`;

    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const top = sorted[0]?.score ?? 0;
    const board = $('#results-board');
    board.innerHTML = '';
    sorted.forEach((p, i) => {
      const li = document.createElement('li');
      if (isFinal && p.score === top && top > 0) li.classList.add('gold');
      li.innerHTML = `
        <span class="rank">#${i + 1}</span>
        <span class="name"></span>
        <span class="pts">${p.score} Pkt</span>
      `;
      li.querySelector('.name').textContent = p.name + (p.id === state.playerId ? ' (du)' : '');
      board.appendChild(li);
    });

    $('#btn-next-round').classList.toggle('hidden', isFinal);
    $('#btn-new-game').classList.toggle('hidden', !isFinal);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ---------- Init ----------
  loadSession();
})();
