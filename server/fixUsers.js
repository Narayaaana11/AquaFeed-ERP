const { MongoClient, ObjectId } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb+srv://aquafeederp:aquafeederp@aquafeederp1.058dwtk.mongodb.net/');
  await client.connect();
  const db = client.db('test');
  
  const targetCompanyId = new ObjectId('6a44d8e6e99413ab682827f8');
  
  const result = await db.collection('users').updateMany(
    {}, // update all users
    { $set: { company: targetCompanyId } }
  );
  
  console.log(`Updated ${result.modifiedCount} users to the correct synced company ID.`);
  await client.close();
}
run();
