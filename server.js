const express = require('express');
const socketIO = require('socket.io');
const app = express();
const server = app.listen(30434);
const io = socketIO(server);

let contestants = [];
let buzzerLocked = true;
let buzzerAvailable = true;
let currentWinner = null;

app.use(express.static('public'));
console.log('Server running at http://localhost:30434/');
console.log('for admin access, go to http://localhost:30434/admin.html');
console.log('Press Ctrl+C to stop the server.');

io.on('connection', (socket) => {
  socket.emit('stateUpdate', { contestants, buzzerLocked, buzzerAvailable, currentWinner });

  socket.on('addContestant', (name) => {
    if (!contestants.some(c => c.name === name)) {
      contestants.push({ name, points: 0 });
    }
    io.emit('stateUpdate', { contestants, buzzerLocked, buzzerAvailable, currentWinner });
  });

  socket.on('buzz', (name) => {
    if (!contestants.some(c => c.name === name)) {
      socket.emit('invalidName');
      return;
    }

    if (buzzerAvailable && !buzzerLocked) {
      currentWinner = name;
      buzzerAvailable = false;
      buzzerLocked = true;
      io.emit('stateUpdate', { contestants, buzzerLocked, buzzerAvailable, currentWinner });
    }
  });

  socket.on('resetBuzzer', () => {
    buzzerAvailable = true;
    currentWinner = null;
    io.emit('stateUpdate', { contestants, buzzerLocked, buzzerAvailable, currentWinner });
  });

  socket.on('toggleLock', (locked) => {
    buzzerLocked = locked;
    io.emit('stateUpdate', { contestants, buzzerLocked, buzzerAvailable, currentWinner });
  });

  socket.on('adjustPoints', ({name, amount}) => {
    const contestant = contestants.find(c => c.name === name);
    if (contestant) contestant.points += amount;
    io.emit('stateUpdate', { contestants, buzzerLocked, buzzerAvailable, currentWinner });
  });
});