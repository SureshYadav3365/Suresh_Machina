const mongoose = require('mongoose');

async function cleanAll() {
  await mongoose.connect('mongodb://127.0.0.1:27017/dona_machine_monitoring');
  await mongoose.connection.collection('expenses').deleteMany({});
  await mongoose.connection.collection('dailysales').deleteMany({});
  console.log('[MongoDB] Expenses and Sales collections cleaned successfully for user.');
  await mongoose.disconnect();
}

cleanAll();
