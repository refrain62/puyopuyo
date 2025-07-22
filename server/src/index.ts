import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);

// Socket.IOサーバーの初期化
// CORS設定により、React開発サーバーからの接続を許可
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React開発サーバーのURL
    methods: ["GET", "POST"]
  }
});

// ルームのインターフェース定義
interface Room {
  id: string;
  players: string[]; // ルームに参加しているソケットIDのリスト
}

// 現在アクティブなルームのリスト
const rooms: Room[] = [];

// ルートエンドポイントの定義
app.get('/', (req, res) => {
  res.send('<h1>Puyo Puyo Server</h1>');
});

// Socket.IO接続イベントハンドラ
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  /**
   * クライアントがルームに参加するイベントハンドラ
   * @param roomId 参加するルームのID
   */
  socket.on('joinRoom', (roomId: string) => {
    let room = rooms.find(r => r.id === roomId);

    // ルームが存在しない場合は新しく作成
    if (!room) {
      room = { id: roomId, players: [] };
      rooms.push(room);
    }

    // ルームにプレイヤーを追加
    if (room.players.length < 2) {
      room.players.push(socket.id);
      socket.join(roomId); // Socket.IOのルーム機能に参加
      console.log(`User ${socket.id} joined room ${roomId}. Players in room: ${room.players.length}`);

      // プレイヤーが2人揃ったらゲーム開始イベントを送信
      if (room.players.length === 2) {
        io.to(roomId).emit('startGame');
        console.log(`Game started in room ${roomId}`);
      }
    } else {
      // ルームが満員の場合はクライアントに通知
      socket.emit('roomFull', roomId);
      console.log(`Room ${roomId} is full. User ${socket.id} cannot join.`);
    }
  });

  /**
   * クライアントのフィールド更新イベントハンドラ
   * 自分のフィールドの状態を相手に転送します。
   * @param field 更新されたフィールドの状態
   */
  socket.on('updateField', (field: any) => {
    const room = rooms.find(r => r.players.includes(socket.id));
    if (room) {
      // 相手のソケットIDを特定
      const opponentId = room.players.find(id => id !== socket.id);
      if (opponentId) {
        // 相手にフィールド更新イベントを送信
        io.to(opponentId).emit('opponentFieldUpdate', field);
      }
    }
  });

  /**
   * おじゃまぷよ送信イベントハンドラ
   * 連鎖によって発生したおじゃまぷよの数を相手に転送します。
   * @param nuisancePuyos 送信するおじゃまぷよの数
   */
  socket.on('sendNuisancePuyos', (nuisancePuyos: number) => {
    const room = rooms.find(r => r.players.includes(socket.id));
    if (room) {
      const opponentId = room.players.find(id => id !== socket.id);
      if (opponentId) {
        // 相手におじゃまぷよ受信イベントを送信
        io.to(opponentId).emit('receiveNuisancePuyos', nuisancePuyos);
        console.log(`User ${socket.id} sent ${nuisancePuyos} nuisance puyos to ${opponentId}`);
      }
    }
  });

  /**
   * クライアント切断イベントハンドラ
   * ルームからプレイヤーを削除し、必要に応じてルームも削除します。
   */
  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    rooms.forEach(room => {
      const index = room.players.indexOf(socket.id);
      if (index > -1) {
        room.players.splice(index, 1); // ルームからプレイヤーを削除
        console.log(`User ${socket.id} left room ${room.id}. Players remaining: ${room.players.length}`);
        if (room.players.length === 0) {
          // ルームに誰もいなくなったらルームを削除
          const roomIndex = rooms.indexOf(room);
          rooms.splice(roomIndex, 1);
          console.log(`Room ${room.id} is empty and removed.`);
        } else if (room.players.length === 1) {
          // 相手が切断されたことを残りのプレイヤーに通知
          io.to(room.players[0]).emit('opponentDisconnected');
          console.log(`Opponent disconnected in room ${room.id}. Notifying remaining player.`);
        }
      }
    });
  });
});

// サーバーのポート設定
const PORT = process.env.PORT || 4000;
// サーバーの起動
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});