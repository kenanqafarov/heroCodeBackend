import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import matchmakingRoutes from './routes/matchmaking.routes';
import adminRoutes from './routes/admin.routes';
import blogRoutes from './routes/blog.routes';
import { matchmakingSocket } from './sockets/matchmaking.socket';
import { protect } from './middleware/auth.middleware';
import jwt from 'jsonwebtoken';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://herocodeai.vercel.app',
      'https://herocode-h4m0mctc1-knanqafaros-projects.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://herocodeai.vercel.app',
  'https://herocode-h4m0mctc1-knanqafaros-projects.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', protect, userRoutes);
app.use('/api/matchmaking', protect, matchmakingRoutes);
app.use('/api/admin', protect, adminRoutes);
app.use('/api/blogs', blogRoutes);

// Socket.IO middleware (token yoxlama)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Token tələb olunur'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; isAdmin?: boolean };
    socket.handshake.auth.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Etibarsız token'));
  }
});

// Socket bağlantıları
matchmakingSocket(io);

// Server start
const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} üzərində işləyir`);
    console.log(`WebSocket ws://localhost:${PORT} hazırdır`);
  });
})();