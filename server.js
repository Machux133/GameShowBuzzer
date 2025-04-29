const express = require('express');
const socketIO = require('socket.io');
const app = express();
const server = app.listen(30434);
const io = socketIO(server);

let contestants = [];
let buzzerLocked = true;
let buzzerAvailable = true;
let currentWinner = null;

const ADMIN_PASSWORD = "puszka2025";

app.use(express.static('public'));

const path = require('path');

app.get('/admin.html', (req, res) => {
    if (req.query.password === ADMIN_PASSWORD) {
        res.sendFile(path.join(__dirname, 'admin.html')); // adjust path as needed
    } else {
        res.send(`
            <form method="GET" action="/admin.html">
                <h2>Admin Login</h2>
                <input type="password" name="password" placeholder="Enter password" required>
                <button type="submit">Login</button>
            </form>
        `);
    }
});


console.log('Server running at http://localhost:30434/');
console.log('for admin access, go to http://localhost:30434/admin.html?password=puszka2025');
console.log('Press Ctrl+C to stop the server.');

io.on('connection', (socket) => {
    socket.emit('stateUpdate', { contestants, buzzerLocked, buzzerAvailable, currentWinner });

    socket.on('addContestant', (name) => {
        name = name.trim();
        if (name && !contestants.some(c => c.name === name)) {
            contestants.push({ name, points: 0 });
            io.emit('stateUpdate', { contestants, buzzerLocked, buzzerAvailable, currentWinner });
        }
    });
    

    // Add remove contestant handler
    socket.on('removeContestant', (name) => {
        contestants = contestants.filter(c => c.name !== name);
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

    socket.on('adjustPoints', ({ name, amount }) => {
        const contestant = contestants.find(c => c.name === name);
        const parsedAmount = parseInt(amount);
        if (contestant && !isNaN(parsedAmount)) {
            contestant.points += parsedAmount;
            io.emit('stateUpdate', { contestants, buzzerLocked, buzzerAvailable, currentWinner });
        }
    });
    
});