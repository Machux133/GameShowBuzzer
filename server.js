const express = require('express');
const socketIO = require('socket.io');
const app = express();
const server = app.listen(30434);
const io = socketIO(server);

let contestants = [];
let buzzerLocked = true;
let buzzerAvailable = true;
let currentWinner = null;
let timerDuration = 0;
let timerEndTime = null;

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
    const currentTime = Date.now();
    const remainingTime = timerEndTime && timerEndTime > currentTime ? Math.ceil((timerEndTime - currentTime) / 1000) : 0;
    socket.emit('stateUpdate', { 
        contestants, 
        buzzerLocked, 
        buzzerAvailable, 
        currentWinner,
        timerDuration,
        remainingTime
    });

    socket.on('addContestant', (name) => {
        name = name.trim();
        if (name && !contestants.some(c => c.name === name)) {
            contestants.push({ name, points: 0 });
            const currentTime = Date.now();
            const remainingTime = timerEndTime && timerEndTime > currentTime ? Math.ceil((timerEndTime - currentTime) / 1000) : 0;
            io.emit('stateUpdate', { 
                contestants, 
                buzzerLocked, 
                buzzerAvailable, 
                currentWinner,
                timerDuration,
                remainingTime
            });
        }
    });


    // Add remove contestant handler
    socket.on('removeContestant', (name) => {
        contestants = contestants.filter(c => c.name !== name);
        const currentTime = Date.now();
        const remainingTime = timerEndTime && timerEndTime > currentTime ? Math.ceil((timerEndTime - currentTime) / 1000) : 0;
        io.emit('stateUpdate', { 
            contestants, 
            buzzerLocked, 
            buzzerAvailable, 
            currentWinner,
            timerDuration,
            remainingTime
        });
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
            timerEndTime = null; // Clear timer when someone buzzes

            const currentTime = Date.now();
            const remainingTime = timerEndTime && timerEndTime > currentTime ? Math.ceil((timerEndTime - currentTime) / 1000) : 0;
            io.emit('stateUpdate', { 
                contestants, 
                buzzerLocked, 
                buzzerAvailable, 
                currentWinner,
                timerDuration,
                remainingTime
            });
        }
    });

    socket.on('resetBuzzer', () => {
        buzzerAvailable = true;
        currentWinner = null;

        const currentTime = Date.now();
        const remainingTime = timerEndTime && timerEndTime > currentTime ? Math.ceil((timerEndTime - currentTime) / 1000) : 0;
        io.emit('stateUpdate', { 
            contestants, 
            buzzerLocked, 
            buzzerAvailable, 
            currentWinner,
            timerDuration,
            remainingTime
        });
    });

    socket.on('toggleLock', (locked) => {
        buzzerLocked = locked;

        // If unlocking the buzzer and a timer duration is set, start the timer
        if (!locked && timerDuration > 0) {
            timerEndTime = Date.now() + (timerDuration * 1000);

            // Set up an interval to send updates every second for the countdown
            const timerInterval = setInterval(() => {
                const currentTime = Date.now();
                if (timerEndTime <= currentTime) {
                    // Timer expired, lock the buzzer
                    buzzerLocked = true;
                    timerEndTime = null;
                    clearInterval(timerInterval);
                }

                const remainingTime = timerEndTime && timerEndTime > currentTime ? Math.ceil((timerEndTime - currentTime) / 1000) : 0;
                io.emit('stateUpdate', { 
                    contestants, 
                    buzzerLocked, 
                    buzzerAvailable, 
                    currentWinner,
                    timerDuration,
                    remainingTime
                });

                // If timer has expired, clear the interval
                if (remainingTime <= 0) {
                    clearInterval(timerInterval);
                }
            }, 1000);
        } else {
            // If locking the buzzer, clear the timer
            timerEndTime = null;
        }

        const currentTime = Date.now();
        const remainingTime = timerEndTime && timerEndTime > currentTime ? Math.ceil((timerEndTime - currentTime) / 1000) : 0;
        io.emit('stateUpdate', { 
            contestants, 
            buzzerLocked, 
            buzzerAvailable, 
            currentWinner,
            timerDuration,
            remainingTime
        });
    });

    socket.on('adjustPoints', ({ name, amount }) => {
        const contestant = contestants.find(c => c.name === name);
        const parsedAmount = parseInt(amount);
        if (contestant && !isNaN(parsedAmount)) {
            contestant.points += parsedAmount;

            const currentTime = Date.now();
            const remainingTime = timerEndTime && timerEndTime > currentTime ? Math.ceil((timerEndTime - currentTime) / 1000) : 0;
            io.emit('stateUpdate', { 
                contestants, 
                buzzerLocked, 
                buzzerAvailable, 
                currentWinner,
                timerDuration,
                remainingTime
            });
        }
    });

    // Add handler for setting timer duration
    socket.on('setTimerDuration', (duration) => {
        // Accept any positive numeric duration
        const parsedDuration = parseInt(duration);
        if (!isNaN(parsedDuration) && parsedDuration > 0) {
            timerDuration = parsedDuration;

            const currentTime = Date.now();
            const remainingTime = timerEndTime && timerEndTime > currentTime ? Math.ceil((timerEndTime - currentTime) / 1000) : 0;
            io.emit('stateUpdate', { 
                contestants, 
                buzzerLocked, 
                buzzerAvailable, 
                currentWinner,
                timerDuration,
                remainingTime
            });
        }
    });

});
