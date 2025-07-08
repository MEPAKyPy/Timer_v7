
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let users = db.getAll();

function logAction(file, action, details) {
    const timestamp = new Date().toISOString();
    const log = `[${timestamp}] ${action} - ${JSON.stringify(details)}\n`;
    fs.appendFileSync(file, log);
}

function cleanLogs(file) {
    if (!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
    const now = new Date();
    const recentLines = lines.filter(line => {
        const dateMatch = line.match(/\[(.*?)\]/);
        if (!dateMatch) return false;
        const logDate = new Date(dateMatch[1]);
        const diff = (now - logDate) / (1000 * 60 * 60 * 24);
        return diff <= 7;
    });
    fs.writeFileSync(file, recentLines.join('\n') + '\n');
}

function resetTimersIfNeeded() {
    const today = new Date().toISOString().split('T')[0];
    users.forEach(user => {
        if (user.lastResetDate !== today) {
            logAction('system_actions.log', 'DailyReset', { id: user.id, name: user.name });
            user.timeLeft = 90 * 60;
            user.isRunning = 0;
            user.startedAt = null;
            user.lastResetDate = today;
            db.update(user);
        }
    });
}

io.on('connection', (socket) => {
    resetTimersIfNeeded();
    cleanLogs('system_actions.log');
    cleanLogs('timer_actions.log');
    socket.emit('init', users);

    socket.on('addUser', (user) => {
        user.lastResetDate = new Date().toISOString().split('T')[0];
        users.push(user);
        db.add(user);
        logAction('system_actions.log', 'AddUser', { id: user.id, name: user.name });
        io.emit('update', users);
    });

    socket.on('deleteUser', (id) => {
        const user = users.find(u => u.id === id);
        if (user) {
            logAction('system_actions.log', 'DeleteUser', { id: user.id, name: user.name });
        }
        users = users.filter(u => u.id !== id);
        db.remove(id);
        io.emit('update', users);
    });

    socket.on('updateUser', (user) => {
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
            if (users[index].isRunning !== user.isRunning) {
                logAction('timer_actions.log', user.isRunning ? 'Start' : 'Pause', { id: user.id, name: user.name });
            }
            users[index] = user;
            db.update(user);
            io.emit('update', users);
        }
    });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
