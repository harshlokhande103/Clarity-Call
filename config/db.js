const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use local MongoDB connection string
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clarity-call';
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.log('Make sure MongoDB is running on your local machine');
    process.exit(1);
  }
};

module.exports = connectDB;