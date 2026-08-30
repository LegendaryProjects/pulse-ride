require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const routes = require('./routes');
const batchManager = require('./services/batchManager.service');
const { getCampusHotspots } = require('./services/ml.service');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize WebSockets
const io = new Server(server, {
  cors: { origin: '*' }
});

// Attach socketio to app and batchManager
app.set('socketio', io);
batchManager.setSocketIO(io);

io.on('connection', (socket) => {
  console.log('⚡ Client Connected to Socket.IO:', socket.id);

  // Driver joins their vehicle room
  socket.on('join_vehicle_room', (vehicleId) => {
    socket.join(`vehicle_${vehicleId}`);
    console.log(`Driver socket ${socket.id} joined vehicle_${vehicleId}`);
  });

  // Student joins their personal student channel
  socket.on('join_student_room', (studentId) => {
    socket.join(`student_${studentId}`);
  });

  // Driver updates live GPS / stop progression
  socket.on('driver_location_update', (data) => {
    io.emit('vehicle_location_updated', data);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client Disconnected:', socket.id);
  });
});

// Periodic ML Hotspot Scanner (every 10 minutes, checks for demand surges and broadcasts proactive notifications)
const startMLHotspotScanner = () => {
  setInterval(async () => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const hotspotsData = await getCampusHotspots(now.toISOString().split('T')[0], hour);
      if (hotspotsData && hotspotsData.hotspots && hotspotsData.hotspots.length > 0) {
        const topSpot = hotspotsData.hotspots[0];
        if (topSpot.predicted_students > 20) {
          io.emit('ml_demand_alert', {
            title: 'High Crowd Alert Predicted',
            location: topSpot.place,
            predictedStudents: topSpot.predicted_students,
            recommendedVehicle: topSpot.recommended_vehicle,
            message: `ML Forecast: High crowd (${topSpot.predicted_students} students) expected near ${topSpot.place}. ${topSpot.recommended_vehicle} dispatched/suggested.`
          });
        }
      }
    } catch (err) {
      console.warn('ML background hotspot scan skipped:', err.message);
    }
  }, 10 * 60 * 1000);
};

// Mount API Routes
app.use('/api', routes);

// Serve Frontend build in production (e.g. Render single service deployment)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Pulse Ride Backend running on port ${PORT} (0.0.0.0)`);
  startMLHotspotScanner();
});