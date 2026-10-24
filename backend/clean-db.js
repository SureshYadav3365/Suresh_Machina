const mongoose = require('mongoose');

async function cleanIndexes() {
  await mongoose.connect('mongodb://127.0.0.1:27017/dona_machine_monitoring');
  try {
    await mongoose.connection.collection('productions').dropIndexes();
    console.log('[MongoDB] All old indexes dropped successfully.');
  } catch (err) {
    console.log('[MongoDB] Note:', err.message);
  }
  // Delete all existing documents so collection is clean
  await mongoose.connection.collection('productions').deleteMany({});
  console.log('[MongoDB] Productions collection initialized clean.');
  await mongoose.disconnect();
}

cleanIndexes();
