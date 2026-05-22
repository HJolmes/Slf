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
    countdownHandle: null,
    lastFormSig: null
  };

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

  // ---------- Home ----------
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
    if ($('#btn-stop').disabled) return;
    socket.emit('stop-round');
  });

  // ---------- Auswertung ----------
  $('#btn-finish-scoring').addEventListener('click', () => {
    socket.emit('finish-scoring');
  });

  // ---------- Ergebnisse ----------
  $('#btn-next-round').addEventListener('click', () => socket.emit('start-round'));
  $('#btn-new-game').addEventListener('click', () => socket.emit('new-game'));

  // ---------- Socket-Events ----------
  socket.on('connect', () => { loadSession(); });

  socket.on('joined', ({ code, playerId }) => {
    state.code = code;
    state.playerId = playerId;
    saveSession();
  });

  socket.on('error-message', (msg) => { toast(msg || 'Fehler'); });

  socket.on('room-update', (room) => {
    state.room = room;
    setHostBody(room.hostId === state.playerId);
    render(room);
  });

  // ---------- Render ----------
  function render(room) {
    if (room.state === 'lobby') renderLobby(room);
    else if (room.state === 'countdown') renderCountdown(room);
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

  function renderCountdown(room) {
    showScreen('countdown');
    $('#cd-round').textContent = room.currentRound;
    $('#cd-total').textContent = room.totalRounds;
    state.lastFormSig = null; // Spiel-Form muss neu aufgebaut werden
    if (state.countdownHandle) clearInterval(state.countdownHandle);
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((room.countdownEnd - Date.now()) / 1000));
      $('#countdown-num').textContent = remaining > 0 ? remaining : 'LOS!';
      if (remaining <= 0) clearInterval(state.countdownHandle);
    };
    tick();
    state.countdownHandle = setInterval(tick, 100);
  }

  function renderPlay(room) {
    showScreen('play');
    if (state.countdownHandle) { clearInterval(state.countdownHandle); state.countdownHandle = null; }
    $('#play-round').textContent = room.currentRound;
    $('#play-total').textContent = room.totalRounds;
    $('#play-letter').textContent = room.letter;

    const sig = room.letter + '|' + room.categories.join(',') + '|' + room.currentRound;
    if (sig !== state.lastFormSig) {
      state.lastFormSig = sig;
      const form = $('#play-form');
      form.innerHTML = '';
      for (const cat of room.categories) {
        const wrap = document.createElement('div');
        wrap.className = 'cat-field';
        const id = 'cat-' + cat.replace(/\W+/g, '_');
        wrap.innerHTML = `<label for="${id}"></label>`;
        wrap.querySelector('label').textContent = cat;
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
          updateStopButton();
        });
        wrap.appendChild(input);
        form.appendChild(wrap);
      }
      setTimeout(() => form.querySelector('input')?.focus(), 60);
    }

    startTimer(room.endTime);
    updateStopButton();

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

  function updateStopButton() {
    const inputs = $$('#play-form input');
    if (!inputs.length) return;
    const allFilled = inputs.every(i => i.value.trim().length > 0);
    const btn = $('#btn-stop');
    btn.disabled = !allFilled;
    $('#stop-hint').textContent = allFilled
      ? 'Du kannst jetzt stoppen — die Runde endet sofort für alle.'
      : 'Fülle erst alle Kategorien aus — dann kannst du stoppen.';
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
    const info = $('#score-info');
    info.innerHTML = '';
    const base = document.createElement('span');
    base.textContent = stopper
      ? `${stopper.name} hat gestoppt — Schreibfehler sind automatisch korrigiert.`
      : 'Zeit abgelaufen — Schreibfehler sind automatisch korrigiert.';
    info.appendChild(base);
    if (stopper && room.stopperBonus) {
      const bonus = document.createElement('span');
      bonus.className = 'stopper-bonus';
      bonus.textContent = `+5 Stopp-Bonus für ${stopper.name}`;
      info.appendChild(bonus);
    }

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
        block.appendChild(renderScoreRow(cat, entry));
      }
      container.appendChild(block);
    }
  }

  function renderScoreRow(cat, entry) {
    const row = document.createElement('div');
    row.className = 'score-row' + (entry.valid ? ' is-valid' : ' is-invalid');

    const nameEl = document.createElement('span');
    nameEl.className = 'name';
    nameEl.textContent = entry.name;
    row.appendChild(nameEl);

    const ansWrap = document.createElement('div');
    ansWrap.className = 'ans-wrap';
    if (!entry.answer) {
      ansWrap.innerHTML = '<span class="empty">(leer)</span>';
    } else if (entry.corrected) {
      const orig = document.createElement('span');
      orig.className = 'ans original';
      orig.textContent = entry.answer;
      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '→';
      const corr = document.createElement('span');
      corr.className = 'ans corrected';
      corr.textContent = entry.normalized;
      ansWrap.appendChild(orig);
      ansWrap.appendChild(arrow);
      ansWrap.appendChild(corr);
    } else {
      const ans = document.createElement('span');
      ans.className = 'ans';
      ans.textContent = entry.answer;
      ansWrap.appendChild(ans);
    }
    row.appendChild(ansWrap);

    const verdict = document.createElement('span');
    verdict.className = 'verdict ' + (entry.valid ? 'ok' : 'bad');
    verdict.textContent = entry.valid ? '✓' : '✗';
    verdict.title = verdictReason(entry);
    row.appendChild(verdict);

    const pts = document.createElement('span');
    pts.className = 'points-pill p' + (entry.points || 0);
    pts.textContent = (entry.points > 0 ? '+' : '') + (entry.points || 0);
    row.appendChild(pts);

    if (entry.playerId !== state.playerId && entry.answer) {
      const overrideBtn = document.createElement('button');
      overrideBtn.className = 'override-btn';
      const desired = !entry.valid;
      overrideBtn.textContent = entry.myVote === null ? 'anfechten' : (entry.myVote === desired ? '↺' : '✓');
      // Wir senden eine Stimme entgegen der aktuellen Bewertung
      overrideBtn.title = entry.valid ? 'Als ungültig markieren' : 'Als gültig markieren';
      overrideBtn.onclick = () => {
        const newVote = entry.myVote === null ? !entry.autoValid : (entry.myVote === !entry.autoValid ? null : !entry.autoValid);
        socket.emit('vote', { category: cat, targetPlayerId: entry.playerId, valid: newVote });
      };
      row.appendChild(overrideBtn);
    }

    return row;
  }

  function verdictReason(entry) {
    if (!entry.answer) return 'Keine Antwort';
    if (entry.status === 'wrong-letter') return 'Beginnt nicht mit dem Buchstaben';
    if (entry.status === 'unknown') return 'Nicht im Wörterbuch — per Mehrheit gültig/ungültig';
    if (entry.status === 'corrected') return 'Schreibfehler erkannt und korrigiert';
    if (entry.status === 'ok') return 'Im Wörterbuch erkannt';
    return '';
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

  loadSession();
})();
