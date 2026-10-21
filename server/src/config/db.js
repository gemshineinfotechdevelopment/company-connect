const mongoose = require("mongoose");

async function connectDB(uri) {
  if (!uri) throw new Error("MONGO_URI is required");
  return mongoose.connect(uri);
}

module.exports = connectDB;
