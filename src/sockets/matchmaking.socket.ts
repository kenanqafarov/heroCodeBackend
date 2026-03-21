import { Server, Socket } from 'socket.io';
import Match from '../models/Match';
import User from '../models/User';
import jwt from 'jsonwebtoken';

interface PlayerQueue {
  userId: string;
  socketId: string;
}

const waitingPlayers: PlayerQueue[] = [];

export const matchmakingSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('Yeni bağlantı:', socket.id);

    // Token ilə autentifikasiya
    const token = socket.handshake.auth.token;
    let userId: string | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        userId = decoded.id;
      } catch (err) {
        socket.disconnect();
        return;
      }
    }

    if (!userId) {
      socket.disconnect();
      return;
    }

    // User-specific room for targeted realtime updates
    socket.join(userId);

    // ----------------------
    // Queue-yə qoşul
    // ----------------------
    socket.on('join-queue', async () => {
      if (waitingPlayers.some(p => p.userId === userId)) {
        socket.emit('queue-status', { message: 'Artıq növbədəsiniz' });
        return;
      }

      if (waitingPlayers.length > 0) {
        const opponent = waitingPlayers.shift()!;

        const match = new Match({
          player1Id: opponent.userId,
          player2Id: userId,
          status: 'Active',
          questions: ['q1', 'q2', 'q3', 'q4', 'q5'] // realda DB-dən çək
        });

        await match.save();

        // Hər iki tərəfə bildir
        io.to(opponent.socketId).emit('match-found', { matchId: match._id, opponentId: userId });
        socket.emit('match-found', { matchId: match._id, opponentId: opponent.userId });

        io.to(opponent.socketId).to(socket.id).emit('game-start', {
          matchId: match._id,
          player1Health: match.player1Health,
          player2Health: match.player2Health
        });
      } else {
        waitingPlayers.push({ userId, socketId: socket.id });
        socket.emit('queue-status', { message: 'Növbədə gözləyin...' });
      }
    });

    socket.on('leave-queue', () => {
      const idx = waitingPlayers.findIndex(p => p.userId === userId);
      if (idx !== -1) {
        waitingPlayers.splice(idx, 1);
      }
      socket.emit('queue-status', { message: 'Queue-dən çıxdınız' });
    });

    // ----------------------
    // Attack hadisəsi
    // ----------------------
    socket.on('attack', async ({ matchId, damage = 10 }) => {
      const match = await Match.findById(matchId);
      if (!match || match.status !== 'Active') return;

      if (match.player1Id.toString() === userId) {
        match.player2Health = Math.max(0, match.player2Health - damage);
      } else if (match.player2Id?.toString() === userId) {
        match.player1Health = Math.max(0, match.player1Health - damage);
      }

      if (match.player1Health <= 0 || match.player2Health <= 0) {
        match.status = 'Finished';
        match.winnerId = match.player1Health > 0 ? match.player1Id : match.player2Id;
        match.endedAt = new Date();

        if (match.winnerId) {
          await User.findByIdAndUpdate(match.winnerId, { $inc: { xp: 500 } });
        }
      }

      await match.save();

      const player1Room = match.player1Id.toString();
      const player2Room = match.player2Id?.toString();

      io.to(player1Room).emit('health-update', {
        matchId: match._id,
        player1Health: match.player1Health,
        player2Health: match.player2Health,
        status: match.status,
        winnerId: match.winnerId
      });

      if (player2Room) {
        io.to(player2Room).emit('health-update', {
          matchId: match._id,
          player1Health: match.player1Health,
          player2Health: match.player2Health,
          status: match.status,
          winnerId: match.winnerId
        });
      }
    });

    socket.on('disconnect', () => {
      const idx = waitingPlayers.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) waitingPlayers.splice(idx, 1);
      console.log('Bağlantı kəsildi:', socket.id);
    });
  });
};