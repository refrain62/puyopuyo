import React from 'react';
import Field from './components/Field';
import NextPuyoField from './components/NextPuyoField';
import { usePuyoGame } from './hooks/usePuyoGame';
import './App.css';

function App() {
  const {
    gameState,
    opponentState,
    joinedRoom,
    roomId,
    displayField,
    handleJoinRoom,
    handleRestart,
    setRoomId,
  } = usePuyoGame();

  return (
    <div className="App" tabIndex={0}>
      <h1>Puyo Puyo Online</h1>
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
        <div className="game-container">
          <div className="main-game">
            <Field field={displayField()} />
            <div className="side-panel">
                <NextPuyoField puyos={gameState.nextPuyos} />
                <div className="score">Score: {gameState.score}</div>
                <div className="incoming-nuisance">Incoming: {gameState.incomingNuisancePuyos}</div>
            </div>
          </div>
          <div className="opponent-game">
            <h2>Opponent</h2>
            {opponentState ? <Field field={opponentState} /> : <p>Waiting for opponent...</p>}
          </div>
        </div>
      )}
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