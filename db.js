const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://sananjafarovv:noRQiwnxX562fUXS@cluster0.kyoo4ly.mongodb.net/?tls=true';
const client = new MongoClient(uri, { tls: true });
const db = client.db('timer_db');
const usersCollection = db.collection('users');

module.exports = {
    async getAll() {
        await client.connect();
        return await usersCollection.find().toArray();
    },

    async add(user) {
        await client.connect();
        await usersCollection.insertOne(user);
    },

    async update(user) {
        await client.connect();
        await usersCollection.updateOne(
            { id: user.id },
            { $set: user }
        );
    },

    async remove(id) {
        await client.connect();
        await usersCollection.deleteOne({ id });
    }
};
