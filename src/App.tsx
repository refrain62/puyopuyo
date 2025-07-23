import React, { useState } from 'react';
import Field from './components/Field';
import NextPuyoField from './components/NextPuyoField';
import { usePuyoGame } from './hooks/usePuyoGame';
import { useAIGame } from './hooks/useAIGame';
import './App.css';

/**
 * Puyo Puyo Onlineアプリケーションのメインコンポーネントです。
 * usePuyoGameカスタムフックからゲームの状態と操作ロジックを取得し、UIをレンダリングします。
 */
function App() {
  const [gameMode, setGameMode] = useState<'online' | 'ai' | null>(null);

  // オンライン対戦モードのフック
  const onlineGame = usePuyoGame();
  // AI対戦モードのフック
  const aiGame = useAIGame();

  const renderGameUI = () => {
    if (gameMode === 'online') {
      return (
        <>
          {/* ルームに参加していない場合のUI */}
          {!onlineGame.joinedRoom ? (
            <div className="room-selection">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={onlineGame.roomId}
                onChange={(e) => onlineGame.setRoomId(e.target.value)}
              />
              <button onClick={() => onlineGame.handleJoinRoom(onlineGame.roomId)}>Join Room</button>
            </div>
          ) : (
            // ルームに参加している場合のゲームUI
            <div className="game-container">
              {/* 自分のゲームフィールドとサイドパネル */}
              <div className="main-game">
                <Field field={onlineGame.displayField()} />
                <div className="side-panel">
                    <NextPuyoField puyos={onlineGame.gameState.nextPuyos} />
                    <div className="score">Score: {onlineGame.gameState.score}</div>
                    <div className="incoming-nuisance">Incoming: {onlineGame.gameState.incomingNuisancePuyos}</div>
                </div>
              </div>
              {/* 対戦相手のゲームフィールド */}
              <div className="opponent-game">
                <h2>Opponent</h2>
                {onlineGame.opponentState ? <Field field={onlineGame.opponentState} /> : <p>Waiting for opponent...</p>}
              </div>
            </div>
          )}

          {/* ゲームオーバー時のUI */}
          {onlineGame.gameState.isGameOver && (
            <div className="game-over">
              <h2>Game Over</h2>
              <button onClick={onlineGame.handleRestart}>Restart</button>
            </div>
          )}
        </>
      );
    } else if (gameMode === 'ai') {
      // AI対戦モードのUI
      return (
        <div className="game-container">
          {/* 自分のゲームフィールドとサイドパネル */}
          <div className="main-game">
            <Field field={aiGame.displayPlayerField()} />
            <div className="side-panel">
                <NextPuyoField puyos={aiGame.gameState.nextPuyos} />
                <div className="score">Score: {aiGame.gameState.score}</div>
                <div className="incoming-nuisance">Incoming: {aiGame.gameState.incomingNuisancePuyos}</div>
            </div>
          </div>
          {/* AIのゲームフィールド */}
          <div className="opponent-game">
            <h2>AI Opponent</h2>
            <Field field={aiGame.displayAIField()} />
          </div>

          {/* ゲームオーバー時のUI */}
          {(aiGame.gameState.isGameOver || aiGame.isAIGameOver) && (
            <div className="game-over">
              <h2>Game Over</h2>
              <button onClick={() => { aiGame.handleRestart(); setGameMode(null); }}>Restart</button>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    // キーボードイベントをグローバルで処理するため、tabIndex={0}を設定
    <div className="App" tabIndex={0}>
      <h1>Puyo Puyo Online</h1>

      {!gameMode ? (
        <div className="mode-selection">
          <button onClick={() => setGameMode('online')}>Online Battle</button>
          <button onClick={() => setGameMode('ai')}>AI Battle</button>
        </div>
      ) : (
        renderGameUI()
      )}
    </div>
  );
}

export default App;
