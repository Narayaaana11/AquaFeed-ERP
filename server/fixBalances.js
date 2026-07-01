const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb+srv://aquafeederp:aquafeederp@aquafeederp1.058dwtk.mongodb.net/');
  await client.connect();
  const db = client.db('test');
  
  // Negate all customer balances
  const customers = await db.collection('customers').find({}).toArray();
  for (const c of customers) {
    if (c.outstandingBalance !== 0) {
      await db.collection('customers').updateOne({ _id: c._id }, { $set: { outstandingBalance: -c.outstandingBalance } });
    }
  }
  
  console.log(`Updated ${customers.length} customer balances to correct sign.`);
  await client.close();
}
run();
