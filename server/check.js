const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb+srv://aquafeederp:aquafeederp@aquafeederp1.058dwtk.mongodb.net/');
  await client.connect();
  const db = client.db('test');
  const agg = await db.collection('products').aggregate([{ $group: { _id: '$company', count: { $sum: 1 } } }]).toArray();
  console.log('Products:', agg);
  const invoices = await db.collection('invoices').aggregate([{ $group: { _id: '$company', count: { $sum: 1 } } }]).toArray();
  console.log('Invoices:', invoices);
  await client.close();
}
run();
