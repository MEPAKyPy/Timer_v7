
const Database = require('better-sqlite3');
const db = new Database('users.db');

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    timeLeft INTEGER NOT NULL,
    isRunning INTEGER NOT NULL,
    startedAt INTEGER,
    lastResetDate TEXT
)
`).run();

module.exports = {
    getAll() {
        return db.prepare('SELECT * FROM users').all();
    },
    add(user) {
        db.prepare(`INSERT INTO users (id, name, timeLeft, isRunning, startedAt, lastResetDate)
                    VALUES (?, ?, ?, ?, ?, ?)`)
          .run(user.id, user.name, user.timeLeft, user.isRunning ? 1 : 0, user.startedAt, user.lastResetDate);
    },
    update(user) {
        db.prepare(`UPDATE users SET timeLeft = ?, isRunning = ?, startedAt = ?, lastResetDate = ? WHERE id = ?`)
          .run(user.timeLeft, user.isRunning ? 1 : 0, user.startedAt, user.lastResetDate, user.id);
    },
    remove(id) {
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
};
