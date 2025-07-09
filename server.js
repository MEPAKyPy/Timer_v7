const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cron = require('node-cron');
const fs = require('fs');
const { readUsers, writeUsers } = require('./storage');
const { backupToMongoDB, restoreFromMongoDB } = require('./backup');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

let users = [];
const timers = new Map();

function readLogs() {
    if (!fs.existsSync('./logs.json')) return [];
    try {
        const content = fs.readFileSync('./logs.json', 'utf-8').trim();
        return content ? JSON.parse(content) : [];
    } catch {
        return [];
    }
}

function writeLogs(logs) {
    fs.writeFileSync('./logs.json', JSON.stringify(logs, null, 2));
}

function addLog(user, action) {
    const logs = readLogs();
    logs.push({
        u: user.name,
        a: action,
        t: user.timeLeft,
        d: new Date().toISOString()
    });
    writeLogs(logs);
}

async function initialize() {
    let needRestore = false;

    if (!fs.existsSync('./users.json')) {
        needRestore = true;
    } else {
        const content = fs.readFileSync('./users.json', 'utf-8').trim();
        if (content === '' || content === '[]') {
            needRestore = true;
        }
    }

    if (needRestore) {
        console.log('[Startup] Restoring data from MongoDB...');
        await restoreFromMongoDB();
    } else {
        console.log('[Startup] Local data found, skipping restore.');
    }

    users = readUsers();
}

function resetAllTimers() {
    users.forEach(u => {
        u.timeLeft = 90 * 60;
        u.isRunning = false;
        u.isExpired = false;
    });
    writeUsers(users);
    io.emit('update', users);
}

cron.schedule('0 0 * * *', resetAllTimers);
cron.schedule('0 * * * *', backupToMongoDB);

function saveAndUpdate() {
    writeUsers(users);
    io.emit('update', users);
}

io.on('connection', socket => {
    socket.emit('init', users);

    socket.on('addUser', user => {
        users.push(user);
        saveAndUpdate();
    });

    socket.on('deleteUser', id => {
        const u = users.find(u => u.id === id);
        if (u && timers.has(id)) {
            clearInterval(timers.get(id));
            timers.delete(id);
        }
        users = users.filter(u => u.id !== id);
        saveAndUpdate();
    });

    socket.on('toggleTimer', id => {
        const user = users.find(u => u.id === id);
        if (!user || user.isExpired) return;

        if (user.isRunning) {
            clearInterval(timers.get(id));
            timers.delete(id);
            user.isRunning = false;
            addLog(user, 'Pause');
        } else {
            user.isRunning = true;
            addLog(user, 'Start');
            const interval = setInterval(() => {
                user.timeLeft--;
                if (user.timeLeft <= 0) {
                    user.timeLeft = 0;
                    user.isRunning = false;
                    user.isExpired = true;
                    clearInterval(interval);
                    timers.delete(id);
                }
                io.emit('update', users);
            }, 1000);
            timers.set(id, interval);
        }

        saveAndUpdate();
    });

    socket.on('manualBackup', () => {
        backupToMongoDB();
    });
});

initialize().then(() => {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
