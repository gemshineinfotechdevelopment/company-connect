const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initCronJobs = require('./utils/cron');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  try {
    await connectDB(MONGO_URI);
    console.log('Connected to MongoDB');

    // Initialize cron jobs
    initCronJobs();

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
