const { Server } = require('socket.io');
const { Pool } = require('pg');
require('dotenv').config();

const PORT = process.env.PORT || 4000;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Socket.io server
const io = new Server(PORT, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

console.log(`WebSocket server running on port ${PORT}`);

// Connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join incident room
  socket.on('join-incident', (incidentId) => {
    socket.join(`incident-${incidentId}`);
    console.log(`Client ${socket.id} joined incident-${incidentId}`);
  });

  // Leave incident room
  socket.on('leave-incident', (incidentId) => {
    socket.leave(`incident-${incidentId}`);
    console.log(`Client ${socket.id} left incident-${incidentId}`);
  });

  // Timeline event added
  socket.on('timeline-event', async (data) => {
    const { incidentId, event } = data;
    
    // Broadcast to all clients in the incident room
    io.to(`incident-${incidentId}`).emit('timeline-update', event);
    console.log(`Timeline event broadcast to incident-${incidentId}`);
  });

  // Status change
  socket.on('status-change', async (data) => {
    const { incidentId, status } = data;
    
    // Broadcast status change
    io.to(`incident-${incidentId}`).emit('status-updated', { status });
    console.log(`Status change broadcast to incident-${incidentId}: ${status}`);
  });

  // Incident update
  socket.on('incident-update', async (data) => {
    const { incidentId, update } = data;
    
    // Broadcast incident update
    io.to(`incident-${incidentId}`).emit('incident-updated', update);
    console.log(`Incident update broadcast to incident-${incidentId}`);
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Health check endpoint (for Docker healthcheck)
const http = require('http');
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(4001, () => {
  console.log('Health check server running on port 4001');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  io.close(() => {
    console.log('Socket.io server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});
