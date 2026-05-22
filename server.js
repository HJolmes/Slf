const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

const DEFAULT_CATEGORIES = ['Stadt', 'Land', 'Fluss', 'Name', 'Tier', 'Beruf'];
const ALPHABET = 'ABCDEFGHIJKLMNOPRSTUVW'.split(''); // X, Y, Z, Q ausgelassen (zu schwer)

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function collectAnswers(room) {
  const result = {};
  for (const cat of room.categories) {
    result[cat] = [];
    for (const [pid, p] of room.players.entries()) {
      const ans = (p.answers[cat] || '').trim();
      const votes = room.votes[cat]?.[pid] || {};
      const downvotes = Object.values(votes).filter(v => v === false).length;
      const totalVoters = Math.max(1, room.players.size - 1);
      const invalid = downvotes > totalVoters / 2;
      result[cat].push({
        playerId: pid,
        name: p.name,
        answer: ans,
        valid: !invalid,
        downvotes,
        myVote: null
      });
    }
  }
  return result;
}

function publicState(room, viewerId = null) {
  const answers = (room.state === 'scoring' || room.state === 'roundResults' || room.state === 'gameOver')
    ? collectAnswers(room) : null;
  if (answers && viewerId) {
    for (const cat of Object.keys(answers)) {
      for (const entry of answers[cat]) {
        entry.myVote = room.votes[cat]?.[entry.playerId]?.[viewerId] ?? null;
      }
    }
  }
  return {
    code: room.code,
    hostId: room.hostId,
    state: room.state,
    letter: room.letter,
    categories: room.categories,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    roundDuration: room.roundDuration,
    usedLetters: room.usedLetters,
    endTime: room.endTime || null,
    stopperId: room.stopperId || null,
    players: Array.from(room.players.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      score: p.score,
      isHost: id === room.hostId,
      connected: p.connected,
      done: !!p.done,
      answersFilled: Object.values(p.answers || {}).filter(a => (a || '').trim()).length
    })),
    answers
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
  if (room.timer) { clearTimeout(room.timer); room.timer = null; }
  room.state = 'scoring';
  room.stopperId = stopperId;
  room.endTime = null;
  broadcast(room);
}

function computeScores(room) {
  for (const cat of room.categories) {
    const valids = [];
    for (const [pid, p] of room.players.entries()) {
      const ans = (p.answers[cat] || '').trim();
      const votes = room.votes[cat]?.[pid] || {};
      const downvotes = Object.values(votes).filter(v => v === false).length;
      const totalVoters = Math.max(1, room.players.size - 1);
      const invalid = downvotes > totalVoters / 2;
      const startsRight = ans && ans.charAt(0).toUpperCase() === room.letter;
      if (ans && !invalid && startsRight) valids.push({ pid, key: ans.toLowerCase() });
    }
    const counts = {};
    for (const v of valids) counts[v.key] = (counts[v.key] || 0) + 1;
    for (const v of valids) {
      const p = room.players.get(v.pid);
      if (valids.length === 1) p.score += 20;
      else if (counts[v.key] === 1) p.score += 10;
      else p.score += 5;
    }
  }
  // Bonus für den Stopper, wenn alle Antworten gültig
  if (room.stopperId && room.players.has(room.stopperId)) {
    const stopper = room.players.get(room.stopperId);
    const allFilled = room.categories.every(c => {
      const ans = (stopper.answers[c] || '').trim();
      return ans && ans.charAt(0).toUpperCase() === room.letter;
    });
    if (allFilled) stopper.score += 5;
  }
}

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
      timer: null
    };
    if (!room.categories.length) room.categories = DEFAULT_CATEGORIES.slice();
    room.players.set(socket.id, {
      socketId: socket.id, name: (name || 'Spielleiter').slice(0, 24), score: 0, answers: {}, connected: true, done: false
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

    // Reconnect: gleicher Name => alten Slot übernehmen
    let playerId = null;
    for (const [pid, p] of room.players.entries()) {
      if (!p.connected && p.name.toLowerCase() === cleanName.toLowerCase()) {
        playerId = pid;
        p.connected = true;
        p.socketId = socket.id;
        // Re-key map with new socket id
        room.players.delete(pid);
        room.players.set(socket.id, p);
        if (room.hostId === pid) room.hostId = socket.id;
        playerId = socket.id;
        break;
      }
    }
    if (!playerId) {
      if (room.state !== 'lobby') {
        // Erlaubt Beitritt mitten im Spiel als Zuschauer
      }
      playerId = socket.id;
      room.players.set(socket.id, {
        socketId: socket.id, name: cleanName, score: 0, answers: {}, connected: true, done: false
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
    room.letter = pickLetter(room);
    room.usedLetters.push(room.letter);
    room.currentRound++;
    room.state = 'playing';
    room.endTime = Date.now() + room.roundDuration * 1000;
    room.stopperId = null;
    room.votes = {};
    for (const p of room.players.values()) { p.answers = {}; p.done = false; }
    broadcast(room);
    room.timer = setTimeout(() => {
      if (room.state === 'playing') stopRound(room, null);
    }, room.roundDuration * 1000);
  });

  socket.on('update-answer', ({ category, value }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state !== 'playing') return;
    const player = room.players.get(socket.id);
    if (!player) return;
    player.answers[category] = (value || '').slice(0, 60);
  });

  socket.on('stop-round', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state !== 'playing' || !room.players.has(socket.id)) return;
    stopRound(room, socket.id);
  });

  socket.on('vote', ({ category, targetPlayerId, valid }) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.state !== 'scoring') return;
    if (!room.players.has(socket.id)) return;
    if (socket.id === targetPlayerId) return; // nicht für sich selbst
    if (!room.categories.includes(category)) return;
    if (!room.votes[category]) room.votes[category] = {};
    if (!room.votes[category][targetPlayerId]) room.votes[category][targetPlayerId] = {};
    if (valid === null) delete room.votes[category][targetPlayerId][socket.id];
    else room.votes[category][targetPlayerId][socket.id] = !!valid;
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
    for (const p of room.players.values()) { p.score = 0; p.answers = {}; p.done = false; }
    broadcast(room);
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
    if (player) player.connected = false;

    if (socket.id === room.hostId) {
      const next = Array.from(room.players.entries()).find(([id, p]) => id !== socket.id && p.connected);
      if (next) room.hostId = next[0];
    }

    if (room.state === 'lobby') room.players.delete(socket.id);

    const anyConnected = Array.from(room.players.values()).some(p => p.connected);
    if (!anyConnected) {
      if (room.timer) clearTimeout(room.timer);
      rooms.delete(code);
      return;
    }
    broadcast(room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Stadt-Land-Fluss läuft auf http://localhost:${PORT}`);
});
