const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      // Allow unauthenticated connections but mark them
      socket.userId = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      socket.userId = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} | User: ${socket.userId || 'anonymous'}`);

    // Join user-specific room for targeted notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      console.log(`   → Joined room: user:${socket.userId}`);
    }

    // Provider location updates
    socket.on('provider:location_update', (data) => {
      if (socket.userRole === 'provider' && data.bookingId) {
        io.to(`booking:${data.bookingId}`).emit('provider:location', {
          lat: data.lat,
          lng: data.lng,
          timestamp: new Date(),
        });
      }
    });

    // Join a booking room (for tracking)
    socket.on('booking:join', (bookingId) => {
      socket.join(`booking:${bookingId}`);
    });

    socket.on('booking:leave', (bookingId) => {
      socket.leave(`booking:${bookingId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket first.');
  }
  return io;
};

module.exports = { initSocket, getIO };
