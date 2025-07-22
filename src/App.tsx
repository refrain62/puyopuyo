import React from 'react';
import Field from './components/Field';
import NextPuyoField from './components/NextPuyoField';
import { usePuyoGame } from './hooks/usePuyoGame';
import './App.css';

/**
 * Puyo Puyo Onlineアプリケーションのメインコンポーネントです。
 * usePuyoGameカスタムフックからゲームの状態と操作ロジックを取得し、UIをレンダリングします。
 */
function App() {
  // usePuyoGameカスタムフックから必要な状態と関数をデストラクチャリング
  const {
    gameState, // ゲーム全体の状態 (フィールド、スコア、ゲームオーバーなど)
    opponentState, // 対戦相手のフィールド状態
    joinedRoom, // ルームに参加済みかどうかのフラグ
    roomId, // 現在のルームID
    displayField, // 表示用のゲームフィールド (操作ぷよを含む)
    handleJoinRoom, // ルーム参加処理
    handleRestart, // ゲームリスタート処理
    setRoomId, // ルームID設定関数
  } = usePuyoGame();

  return (
    // キーボードイベントをグローバルで処理するため、tabIndex={0}を設定
    <div className="App" tabIndex={0}>
      <h1>Puyo Puyo Online</h1>

      {/* ルームに参加していない場合のUI */}
      {!joinedRoom ? (
        <div className="room-selection">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={handleJoinRoom}>Join Room</button>
        </div>
      ) : (
        // ルームに参加している場合のゲームUI
        <div className="game-container">
          {/* 自分のゲームフィールドとサイドパネル */}
          <div className="main-game">
            <Field field={displayField()} />
            <div className="side-panel">
                <NextPuyoField puyos={gameState.nextPuyos} />
                <div className="score">Score: {gameState.score}</div>
                <div className="incoming-nuisance">Incoming: {gameState.incomingNuisancePuyos}</div>
            </div>
          </div>
          {/* 対戦相手のゲームフィールド */}
          <div className="opponent-game">
            <h2>Opponent</h2>
            {opponentState ? <Field field={opponentState} /> : <p>Waiting for opponent...</p>}
          </div>
        </div>
      )}

      {/* ゲームオーバー時のUI */}
      {gameState.isGameOver && (
        <div className="game-over">
          <h2>Game Over</h2>
          <button onClick={handleRestart}>Restart</button>
        </div>
      )}
    </div>
  );
}

export default App;
