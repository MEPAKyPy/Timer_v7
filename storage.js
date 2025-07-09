const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'users.json');

function readUsers() {
    try {
        const data = fs.readFileSync(FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function writeUsers(users) {
    fs.writeFileSync(FILE, JSON.stringify(users, null, 2));
}

module.exports = { readUsers, writeUsers };
