import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Socket.IOサーバーのURL
const SOCKET_SERVER_URL = 'http://localhost:4000';

/**
 * Socket.IO接続を管理するカスタムフックです。
 * コンポーネントのマウント時にソケット接続を確立し、アンマウント時に切断します。
 * @returns Socket.IOクライアントのインスタンス
 */
export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // 新しいソケット接続を確立
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    // 接続成功時のログ出力
    newSocket.on('connect', () => {
      console.log('Connected to socket server with id:', newSocket.id);
    });

    // コンポーネントのアンマウント時にソケットを切断
    return () => {
      newSocket.disconnect();
    };
  }, []); // 空の依存配列により、マウント時とアンマウント時にのみ実行

  return socket;
};