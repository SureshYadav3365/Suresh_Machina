const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dona_machine_monitoring';
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    console.error('Please ensure MongoDB is running locally or verify the MONGODB_URI in backend/.env');
    // Allow server to stay alive with status flag if needed
  }
};

module.exports = connectDB;
