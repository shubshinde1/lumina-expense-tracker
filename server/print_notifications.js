const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect("mongodb+srv://main:tomshet@cluster0.ebpi7xs.mongodb.net/?appName=Cluster0");
    console.log("Connected to MongoDB!");
    
    const Schema = mongoose.Schema;
    const NotificationSchema = new Schema({}, { strict: false });
    const Notification = mongoose.model('Notification', NotificationSchema, 'notifications');
    
    const notifications = await Notification.find({});
    console.log("Found Notifications:");
    notifications.forEach(n => {
      console.log(`- ID: ${n._id}, User: ${n.user}, Title: ${n.title}, Message: ${n.message}, CreatedAt: ${n.createdAt}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
