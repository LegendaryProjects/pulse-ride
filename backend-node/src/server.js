require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const routes = require('./routes');
const { initCronJobs } = require('./services/cron.service');
const { startRepositionLoop } = require('./controllers/reposition.service');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Initialize WebSockets
const io = new Server(server, {
  cors: { origin: '*' }
});

// Make io accessible inside your controllers
app.set('socketio', io);

io.on('connection', (socket) => {
  console.log('⚡ Frontend Client Connected:', socket.id);
  
  socket.on('join_vehicle_room', (vehicleId) => {
    socket.join(`vehicle_${vehicleId}`);
  });

  socket.on('driver_location_update', (data) => {
    io.emit(`tracking_rider_${data.riderId}`, data.location);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client Disconnected');
  });
});

// Mount Routes centrally
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  
  // Start background processes
  if (typeof startRepositionLoop === 'function') startRepositionLoop(io);
  if (typeof initCronJobs === 'function') initCronJobs();
});