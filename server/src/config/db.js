const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Drop legacy company_1_tallyGuid_1 indexes to allow rebuild with partialFilterExpression
    try {
      const db = conn.connection.db;
      const collections = ['warehouses', 'customers', 'suppliers', 'products', 'invoices', 'purchaseorders', 'creditnotes', 'quotations'];
      for (const colName of collections) {
        try {
          await db.collection(colName).dropIndex('company_1_tallyGuid_1');
          console.log(`Successfully dropped index company_1_tallyGuid_1 from ${colName}`);
        } catch (e) {
          // Index might not exist or already dropped, ignore
        }
      }
    } catch (indexError) {
      console.error('Error dropping old indexes:', indexError.message);
    }
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
