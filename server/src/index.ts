import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React dev server
    methods: ["GET", "POST"]
  }
});

interface Room {
  id: string;
  players: string[]; // socket.id
}

const rooms: Room[] = [];

app.get('/', (req, res) => {
  res.send('<h1>Puyo Puyo Server</h1>');
});

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  // Join a room
  socket.on('joinRoom', (roomId: string) => {
    let room = rooms.find(r => r.id === roomId);

    if (!room) {
      room = { id: roomId, players: [] };
      rooms.push(room);
    }

    if (room.players.length < 2) {
      room.players.push(socket.id);
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}. Players in room: ${room.players.length}`);

      if (room.players.length === 2) {
        io.to(roomId).emit('startGame');
        console.log(`Game started in room ${roomId}`);
      }
    } else {
      socket.emit('roomFull', roomId);
      console.log(`Room ${roomId} is full. User ${socket.id} cannot join.`);
    }
  });

  // Update game state (field) for opponent
  socket.on('updateField', (field: any) => {
    const room = rooms.find(r => r.players.includes(socket.id));
    if (room) {
      const opponentId = room.players.find(id => id !== socket.id);
      if (opponentId) {
        io.to(opponentId).emit('opponentFieldUpdate', field);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    // Remove player from room
    rooms.forEach(room => {
      const index = room.players.indexOf(socket.id);
      if (index > -1) {
        room.players.splice(index, 1);
        console.log(`User ${socket.id} left room ${room.id}. Players remaining: ${room.players.length}`);
        if (room.players.length === 0) {
          const roomIndex = rooms.indexOf(room);
          rooms.splice(roomIndex, 1);
          console.log(`Room ${room.id} is empty and removed.`);
        } else if (room.players.length === 1) {
          io.to(room.players[0]).emit('opponentDisconnected');
          console.log(`Opponent disconnected in room ${room.id}. Notifying remaining player.`);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});