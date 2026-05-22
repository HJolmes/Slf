const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { validateAnswer, normalizeLetter } = require('./lib/validate');
const pkg = require('./package.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/version', (_req, res) => {
  res.json({ version: pkg.version });
});

const rooms = new Map();

const DEFAULT_CATEGORIES = ['Stadt', 'Land', 'Fluss', 'Name', 'Tier', 'Beruf'];
const ALPHABET = 'ABCDEFGHIJKLMNOPRSTUVW'.split(''); // Q/X/Y/Z ausgelassen (zu schwer)
const COUNTDOWN_MS = 5000;
const DISCONNECT_GRACE_MS = 90_000; // 90s Karenz für Reload/Reconnect

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function buildEntry(room, cat, playerId, player, viewerId) {
  const rawAnswer = (player.answers[cat] || '').trim();
  const result = validateAnswer(cat, room.letter, rawAnswer);

  const voterMap = room.votes[cat]?.[playerId] || {};
  const voters = Object.values(voterMap);
  const truthy = voters.filter(v => v === true).length;
  const falsy = voters.filter(v => v === false).length;

  const autoValid = result.status === 'ok' || result.status === 'corrected' || result.status === 'unknown';
  let finalValid;
  if (voters.length === 0) finalValid = autoValid;
  else if (truthy > falsy) finalValid = true;
  else if (falsy > truthy) finalValid = false;
  else finalValid = autoValid;

  return {
    playerId,
    name: player.name,
    answer: rawAnswer,
    normalized: result.normalized,
    corrected: result.corrected,
    status: result.status,
    autoValid,
    valid: finalValid,
    upvotes: truthy,
    downvotes: falsy,
    myVote: viewerId ? (voterMap[viewerId] ?? null) : null
  };
}

function computeCategoryPoints(entries) {
  const valids = entries.filter(e => e.valid && e.answer);
  const counts = {};
  for (const e of valids) {
    const key = (e.normalized || e.answer).toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  }
  for (const e of entries) {
    if (!e.valid || !e.answer) {
      e.points = 0;
    } else {
      const key = (e.normalized || e.answer).toLowerCase();
      if (valids.length === 1) e.points = 20;
      else if (counts[key] === 1) e.points = 10;
      else e.points = 5;
    }
  }
  return entries;
}

function collectAnswers(room, viewerId) {
  const out = {};
  for (const cat of room.categories) {
    const entries = [];
    for (const [pid, p] of room.players.entries()) {
      entries.push(buildEntry(room, cat, pid, p, viewerId));
    }
    computeCategoryPoints(entries);
    out[cat] = entries;
  }
  return out;
}

function stopperBonusEligible(room) {
  if (!room.stopperId || !room.players.has(room.stopperId)) return false;
  const stopper = room.players.get(room.stopperId);
  return room.categories.every(cat => {
    const entry = buildEntry(room, cat, room.stopperId, stopper, null);
    return entry.valid && entry.answer;
  });
}

function publicState(room, viewerId = null) {
  const showAnswers = room.state === 'scoring' || room.state === 'roundResults' || room.state === 'gameOver';
  const viewer = viewerId ? room.players.get(viewerId) : null;
  return {
    code: room.code,
    hostId: room.hostId,
    state: room.state,
    letter: room.state === 'countdown' ? null : room.letter, // im Countdown noch geheim
    revealLetter: room.state === 'countdown' ? false : !!room.letter,
    categories: room.categories,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    roundDuration: room.roundDuration,
    usedLetters: room.usedLetters,
    countdownEnd: room.countdownEnd || null,
    endTime: room.endTime || null,
    stopperId: room.stopperId || null,
    stopperBonus: showAnswers ? stopperBonusEligible(room) : false,
    players: Array.from(room.players.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      score: p.score,
      isHost: id === room.hostId,
      connected: p.connected,
      answersFilled: Object.values(p.answers || {}).filter(a => (a || '').trim()).length
    })),
    answers: showAnswers ? collectAnswers(room, viewerId) : null,
    myAnswers: viewer && room.state === 'playing' ? { ...(viewer.answers || {}) } : null
  };
}

function broadcast(room) {
  for (const [pid, p] of room.players.entries()) {
    if (!p.socketId) continue;
    io.to(p.socketId).emit('room-update', publicState(room, pid));
  }
}

function pickLetter(room) {
  const remaining = ALPHABET.filter(l => !room.usedLetters.includes(l));
  const pool = remaining.length ? remaining : ALPHABET;
  return pool[Math.floor(Math.random() * pool.length)];
}

function stopRound(room, stopperId) {
  room.state = 'scoring';
  room.stopperId = stopperId;
  room.endTime = null;
  room.countdownEnd = null;
  broadcast(room);
}

function computeScores(room) {
  for (const cat of room.categories) {
    const entries = [];
    for (const [pid, p] of room.players.entries()) {
      entries.push(buildEntry(room, cat, pid, p, null));
    }
    computeCategoryPoints(entries);
    for (const e of entries) {
      const p = room.players.get(e.playerId);
      if (p) p.score += e.points;
    }
  }
  if (stopperBonusEligible(room)) {
    room.players.get(room.stopperId).score += 5;
  }
}

function beginCountdown(room) {
  room.letter = pickLetter(room);
  room.usedLetters.push(room.letter);
  room.currentRound++;
  room.state = 'countdown';
  room.countdownEnd = Date.now() + COUNTDOWN_MS;
  room.endTime = room.countdownEnd + room.roundDuration * 1000;
  room.stopperId = null;
  room.votes = {};
  for (const p of room.players.values()) { p.answers = {}; }
  broadcast(room);
}

// Globaler Tick: prüft alle Räume regelmäßig auf Phasenwechsel.
// Robuster als per-Raum setTimeout (das auf Hosting-Plattformen mit
// Suspend/GC-Pausen unzuverlässig sein kann).
const TICK_MS = 500;
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.state === 'countdown' && room.countdownEnd && now >= room.countdownEnd) {
      room.state = 'playing';
      broadcast(room);
    } else if (room.state === 'playing' && room.endTime && now >= room.endTime) {
      stopRound(room, null);
    }
  }
}, TICK_MS);

io.on('connection', (socket) => {

  socket.on('create-room', ({ name, categories, totalRounds, roundDuration }) => {
    const code = generateRoomCode();
    const room = {
      code,
      hostId: socket.id,
      players: new Map(),
      state: 'lobby',
      letter: null,
      categories: (categories && categories.length ? categories : DEFAULT_CATEGORIES)
        .map(c => (c || '').trim()).filter(Boolean),
      usedLetters: [],
      currentRound: 0,
      totalRounds: Math.max(1, Math.min(20, parseInt(totalRounds) || 5)),
      roundDuration: Math.max(15, Math.min(300, parseInt(roundDuration) || 90)),
      votes: {},
      timer: null,
      countdownTimer: null
    };
    if (!room.categories.length) room.categories = DEFAULT_CATEGORIES.slice();
    room.players.set(socket.id, {
      socketId: socket.id, name: (name || 'Spielleiter').slice(0, 24), score: 0, answers: {}, connected: true
    });
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerId = socket.id;
    socket.emit('joined', { code, playerId: socket.id });
    broadcast(room);
  });

  socket.on('join-room', ({ code, name }) => {
    code = (code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return socket.emit('error-message', 'Session nicht gefunden.');
    const cleanName = (name || 'Spieler').slice(0, 24);

    let playerId = null;
    for (const [pid, p] of room.players.entries()) {
      if (!p.connected && p.name.toLowerCase() === cleanName.toLowerCase()) {
        if (p.removeTimer) { clearTimeout(p.removeTimer); p.removeTimer = null; }
        p.connected = true;
        p.socketId = socket.id;
        room.players.delete(pid);
        room.players.set(socket.id, p);
        if (room.hostId === pid) room.hostId = socket.id;
        playerId = socket.id;
        break;
      }
    }
    if (!playerId) {
      playerId = socket.id;
      room.players.set(socket.id, {
        socketId: socket.id, name: cleanName, score: 0, answers: {}, connected: true
      });
    }
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerId = playerId;
    socket.emit('joined', { code, playerId });
    broadcast(room);
  });

  socket.on('update-settings', ({ categories, totalRounds, roundDuration }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'lobby') return;
    if (Array.isArray(categories)) {
      const cleaned = categories.map(c => (c || '').trim()).filter(Boolean).slice(0, 12);
      if (cleaned.length) room.categories = cleaned;
    }
    if (totalRounds !== undefined) room.totalRounds = Math.max(1, Math.min(20, parseInt(totalRounds) || 5));
    if (roundDuration !== undefined) room.roundDuration = Math.max(15, Math.min(300, parseInt(roundDuration) || 90));
    broadcast(room);
  });

  socket.on('start-round', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'lobby' && room.state !== 'roundResults') return;
    beginCountdown(room);
  });

  socket.on('update-answer', ({ category, value }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state !== 'playing') return;
    const player = room.players.get(socket.id);
    if (!player) return;
    player.answers[category] = (value || '').slice(0, 60);
  });

  socket.on('force-stop-round', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'playing' && room.state !== 'countdown') return;
    stopRound(room, null);
  });

  socket.on('stop-round', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state !== 'playing' || !room.players.has(socket.id)) return;
    // Server-Sicherheit: nur erlauben, wenn der Stopper alle Kategorien ausgefüllt hat
    const player = room.players.get(socket.id);
    const allFilled = room.categories.every(cat => {
      const v = (player.answers[cat] || '').trim();
      return v.length > 0;
    });
    if (!allFilled) {
      socket.emit('error-message', 'Du musst zuerst alle Kategorien ausfüllen.');
      return;
    }
    stopRound(room, socket.id);
  });

  socket.on('vote', ({ category, targetPlayerId, valid }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state !== 'scoring') return;
    if (!room.players.has(socket.id)) return;
    if (socket.id === targetPlayerId) return;
    if (!room.categories.includes(category)) return;
    if (!room.votes[category]) room.votes[category] = {};
    if (!room.votes[category][targetPlayerId]) room.votes[category][targetPlayerId] = {};
    if (valid === null || valid === undefined) {
      delete room.votes[category][targetPlayerId][socket.id];
    } else {
      room.votes[category][targetPlayerId][socket.id] = !!valid;
    }
    broadcast(room);
  });

  socket.on('finish-scoring', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id || room.state !== 'scoring') return;
    computeScores(room);
    room.state = (room.currentRound >= room.totalRounds) ? 'gameOver' : 'roundResults';
    broadcast(room);
  });

  socket.on('new-game', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.state = 'lobby';
    room.currentRound = 0;
    room.usedLetters = [];
    room.letter = null;
    room.votes = {};
    room.stopperId = null;
    for (const p of room.players.values()) { p.score = 0; p.answers = {}; }
    broadcast(room);
  });

  socket.on('leave-room', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (player) {
      if (player.removeTimer) clearTimeout(player.removeTimer);
      room.players.delete(socket.id);
      socket.leave(room.code);
      socket.data.roomCode = null;
      if (room.players.size === 0) {
        rooms.delete(room.code);
      } else {
        if (socket.id === room.hostId) {
          const next = Array.from(room.players.entries()).find(([, p]) => p.connected);
          if (next) room.hostId = next[0];
        }
        broadcast(room);
      }
    }
  });

  socket.on('kick-player', ({ playerId }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.hostId !== socket.id) return;
    const player = room.players.get(playerId);
    if (!player) return;
    const targetSocket = io.sockets.sockets.get(player.socketId);
    if (targetSocket) {
      targetSocket.emit('error-message', 'Du wurdest aus der Session entfernt.');
      targetSocket.leave(room.code);
    }
    room.players.delete(playerId);
    if (room.players.size === 0) rooms.delete(room.code);
    else broadcast(room);
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    player.connected = false;

    if (socket.id === room.hostId) {
      const next = Array.from(room.players.entries()).find(([id, p]) => id !== socket.id && p.connected);
      if (next) room.hostId = next[0];
    }

    // Karenzzeit: erst nach DISCONNECT_GRACE_MS endgültig entfernen
    if (player.removeTimer) clearTimeout(player.removeTimer);
    player.removeTimer = setTimeout(() => {
      if (player.connected) return;
      for (const [pid, p] of room.players.entries()) {
        if (p === player) {
          room.players.delete(pid);
          break;
        }
      }
      if (room.players.size === 0) {
        rooms.delete(code);
      } else {
        // Falls Host weg ist und ein anderer übernimmt
        const stillHost = Array.from(room.players.entries()).find(([id]) => id === room.hostId);
        if (!stillHost) {
          const next = Array.from(room.players.entries()).find(([, p]) => p.connected) || Array.from(room.players.entries())[0];
          if (next) room.hostId = next[0];
        }
        broadcast(room);
      }
    }, DISCONNECT_GRACE_MS);

    broadcast(room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Stadt-Land-Fluss läuft auf http://localhost:${PORT}`);
});
