const mongoose = require('mongoose');

/**
 * Connects to MongoDB Atlas using the URI from the MONGODB_URI
 * environment variable. The URI is never hard-coded.
 */
async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set.');
  }

  mongoose.connection.on('disconnected', () =>
    console.warn('MongoDB disconnected. Mongoose will try to reconnect.')
  );
  mongoose.connection.on('error', (err) =>
    console.error('MongoDB connection error:', err.message)
  );

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB Atlas connected (database: ${mongoose.connection.name})`);
}

module.exports = connectDatabase;
