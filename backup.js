const fs = require('fs');
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://sananjafarovv:noRQiwnxX562fUXS@cluster0.kyoo4ly.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri, { tls: true });

async function backupToMongoDB() {
    try {
        await client.connect();
        const db = client.db('timer_backup');
        const users = JSON.parse(fs.readFileSync('./users.json', 'utf-8'));

        let logs = [];
        if (fs.existsSync('./logs.json')) {
            try {
                const content = fs.readFileSync('./logs.json', 'utf-8');
                logs = content ? JSON.parse(content) : [];
            } catch (err) {
                console.error('[Backup] Failed to parse logs.json:', err);
                logs = [];
            }
        }

        await db.collection('backups').updateOne(
            { _id: 'latest' },
            { $set: { users, logs, updatedAt: new Date() } },
            { upsert: true }
        );

        console.log('[Backup] Data successfully backed up to MongoDB.');
    } catch (err) {
        console.error('[Backup] Backup failed:', err);
    } finally {
        await client.close();
    }
}

async function restoreFromMongoDB() {
    try {
        await client.connect();
        const db = client.db('timer_backup');
        const doc = await db.collection('backups').findOne({ _id: 'latest' });

        if (doc) {
            fs.writeFileSync('./users.json', JSON.stringify(doc.users, null, 2));
            fs.writeFileSync('./logs.json', JSON.stringify(doc.logs, null, 2));
            console.log('[Backup] Data restored from MongoDB.');
        } else {
            console.log('[Backup] No backup found in MongoDB.');
        }
    } catch (err) {
        console.error('[Backup] Restore failed:', err);
    } finally {
        await client.close();
    }
}

module.exports = { backupToMongoDB, restoreFromMongoDB };
