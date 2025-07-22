import React, { useState, useEffect, useCallback } from 'react';
import Field from './components/Field';
import NextPuyoField from './components/NextPuyoField';
import { GameState, FIELD_WIDTH, FIELD_HEIGHT, PuyoState, PlayerState, PlayerPuyo, PuyoColor, FieldState } from './types';
import { useSocket } from './hooks/useSocket';
import { canMove, applyGravity, checkConnections } from './utils/gameLogic';
import './App.css';

const PUYO_COLORS: PuyoColor[] = ['red', 'green', 'blue', 'yellow', 'purple'];
const NEXT_PUYO_COUNT = 2;

const createNewPuyoPair = (): PlayerState => ({
    puyo1: { x: 2, y: -1, color: PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)] },
    puyo2: { x: 2, y: 0, color: PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)] },
});

const createInitialGameState = (): GameState => {
    const nextPuyos = [];
    for (let i = 0; i < NEXT_PUYO_COUNT; i++) {
        nextPuyos.push(createNewPuyoPair());
    }
    return {
        field: Array.from({ length: FIELD_HEIGHT }, () =>
            Array(FIELD_WIDTH).fill({ color: null })
        ),
        score: 0,
        isGameOver: false,
        nextPuyos,
        incomingNuisancePuyos: 0,
    };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function App() {
  const socket = useSocket();
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [opponentState, setOpponentState] = useState<FieldState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(createNewPuyoPair());
  const [isProcessing, setIsProcessing] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(false);

  const fixPuyo = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    let currentField = gameState.field.map(row => row.map(puyo => ({ ...puyo })));
    const { puyo1, puyo2 } = playerState;
    if (puyo1.y >= 0) currentField[puyo1.y][puyo1.x] = { color: puyo1.color };
    if (puyo2.y >= 0) currentField[puyo2.y][puyo2.x] = { color: puyo2.color };
    
    if (currentField[0][2].color) {
        setGameState(prev => ({ ...prev, isGameOver: true }));
        setIsProcessing(false);
        return;
    }

    setGameState(prev => ({ ...prev, field: currentField }));
    await sleep(50);

    let chain = 0;
    let totalErasedPuyos = 0;
    const chainPower = [0, 8, 16, 32, 64, 96, 128, 160]; // Simplified chain power

    while (true) {
        const { newField, erased, erasedCount } = checkConnections(currentField);
        if (!erased) break;

        chain++;
        totalErasedPuyos += erasedCount;
        setGameState(prev => ({ ...prev, field: newField, score: prev.score + 100 * chain }));
        await sleep(300);

        const afterGravityField = applyGravity(newField);
        setGameState(prev => ({ ...prev, field: afterGravityField }));
        await sleep(300);

        currentField = afterGravityField;
    }

    // Calculate nuisance puyos to send
    let nuisancePuyosToSend = 0;
    if (chain > 0) {
        const baseNuisance = Math.floor(totalErasedPuyos / 4);
        const chainBonus = chainPower[Math.min(chain, chainPower.length - 1)];
        nuisancePuyosToSend = Math.floor((baseNuisance + chainBonus) / 70); // Simplified calculation
    }

    // All Clear Bonus
    const isAllClear = currentField.flat().every(puyo => puyo.color === null);
    if (isAllClear) {
        nuisancePuyosToSend += 30; // All clear sends 30 nuisance puyos
        console.log('All Clear!');
    }

    // Handle incoming nuisance puyos and send outgoing ones
    setGameState(prev => {
        let remainingNuisance = prev.incomingNuisancePuyos - nuisancePuyosToSend;
        if (remainingNuisance < 0) {
            if (socket && joinedRoom) {
                socket.emit('sendNuisancePuyos', Math.abs(remainingNuisance));
            }
            remainingNuisance = 0;
        }
        return { ...prev, incomingNuisancePuyos: remainingNuisance };
    });

    const newNextPuyos = [...gameState.nextPuyos];
    const nextPlayerPuyo = newNextPuyos.shift()!;
    newNextPuyos.push(createNewPuyoPair());

    setPlayerState(nextPlayerPuyo);
    setGameState(prev => ({ ...prev, nextPuyos: newNextPuyos }));
    setIsProcessing(false);
  }, [playerState, gameState, checkConnections, applyGravity, isProcessing, socket, joinedRoom]);

  const dropPuyo = useCallback(() => {
    if (isProcessing || gameState.isGameOver) return;
    const { puyo1, puyo2 } = playerState;
    const nextPuyo1 = { ...puyo1, y: puyo1.y + 1 };
    const nextPuyo2 = { ...puyo2, y: puyo2.y + 1 };

    if (canMove(gameState.field, nextPuyo1, nextPuyo2)) {
        setPlayerState({ puyo1: nextPuyo1, puyo2: nextPuyo2 });
    } else {
        // If puyo cannot move down, fix it and then check for incoming nuisance puyos
        fixPuyo();
        if (gameState.incomingNuisancePuyos > 0) {
            setGameState(prev => {
                const newField = prev.field.map(row => row.map(puyo => ({ ...puyo })));
                let nuisanceCount = prev.incomingNuisancePuyos;
                for (let i = 0; i < nuisanceCount; i++) {
                    const x = Math.floor(Math.random() * FIELD_WIDTH);
                    for (let y = 0; y < FIELD_HEIGHT; y++) {
                        if (!newField[y][x].color) {
                            newField[y][x] = { color: 'purple' }; // Nuisance puyos are purple
                            break;
                        }
                    }
                }
                return { ...prev, field: newField, incomingNuisancePuyos: 0 };
            });
        }
    }
  }, [gameState, playerState, canMove, fixPuyo, isProcessing]);

  useEffect(() => {
    if (gameState.isGameOver) return;
    const gameLoop = setInterval(dropPuyo, 1000);
    return () => clearInterval(gameLoop);
  }, [dropPuyo, gameState.isGameOver]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (isProcessing || gameState.isGameOver) return;
    switch (e.key) {
      case 'ArrowLeft':
        setPlayerState((prev) => {
            const nextPuyo1 = { ...prev.puyo1, x: prev.puyo1.x - 1 };
            const nextPuyo2 = { ...prev.puyo2, x: prev.puyo2.x - 1 };
            if (canMove(gameState.field, nextPuyo1, nextPuyo2)) {
                return { puyo1: nextPuyo1, puyo2: nextPuyo2 };
            }
            return prev;
        });
        break;
      case 'ArrowRight':
        setPlayerState((prev) => {
            const nextPuyo1 = { ...prev.puyo1, x: prev.puyo1.x + 1 };
            const nextPuyo2 = { ...prev.puyo2, x: prev.puyo2.x + 1 };
            if (canMove(gameState.field, nextPuyo1, nextPuyo2)) {
                return { puyo1: nextPuyo1, puyo2: nextPuyo2 };
            }
            return prev;
        });
        break;
      case 'ArrowDown':
        dropPuyo();
        break;
      case 'ArrowUp':
        setPlayerState((prev) => {
            const { puyo1, puyo2 } = prev;
            const dx = puyo2.x - puyo1.x;
            const dy = puyo2.y - puyo1.y;
            const nextPuyo2 = { ...puyo2, x: puyo1.x - dy, y: puyo1.y + dx };
            if (canMove(gameState.field, puyo1, nextPuyo2)) {
                return { puyo1, puyo2: nextPuyo2 };
            }
            return prev;
        });
        break;
    }
  }, [gameState, canMove, dropPuyo, isProcessing]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Socket.IO related effects
  useEffect(() => {
    if (!socket) return;

    socket.on('startGame', () => {
      console.log('Game started!');
      setJoinedRoom(true);
      // Reset game state for new game
      setGameState(createInitialGameState());
      setPlayerState(createNewPuyoPair());
      setOpponentState(null);
    });

    socket.on('opponentFieldUpdate', (field: FieldState) => {
      setOpponentState(field);
    });

    socket.on('receiveNuisancePuyos', (nuisancePuyos: number) => {
        setGameState(prev => ({ ...prev, incomingNuisancePuyos: prev.incomingNuisancePuyos + nuisancePuyos }));
    });

    socket.on('roomFull', (roomId: string) => {
      alert(`Room ${roomId} is full. Please try another room.`);
    });

    socket.on('opponentDisconnected', () => {
      alert('Your opponent has disconnected. Game over.');
      setGameState(prev => ({ ...prev, isGameOver: true }));
    });

    return () => {
      socket.off('startGame');
      socket.off('opponentFieldUpdate');
      socket.off('receiveNuisancePuyos');
      socket.off('roomFull');
      socket.off('opponentDisconnected');
    };
  }, [socket]);

  // Emit field updates to opponent
  useEffect(() => {
    if (socket && joinedRoom) {
      socket.emit('updateField', displayField());
    }
  }, [socket, joinedRoom, gameState.field, playerState]); // Re-emit when field or playerState changes

  const displayField = (): PuyoState[][] => {
    if (isProcessing && !gameState.isGameOver) return gameState.field;

    const newField = gameState.field.map(row => row.map(puyo => ({ ...puyo })));
    const { puyo1, puyo2 } = playerState;

    if (!gameState.isGameOver) {
        if (puyo1.y >= 0) newField[puyo1.y][puyo1.x] = { color: puyo1.color };
        if (puyo2.y >= 0) newField[puyo2.y][puyo2.x] = { color: puyo2.color };
    }

    return newField;
  };

  const handleJoinRoom = () => {
    if (socket && roomId) {
      socket.emit('joinRoom', roomId);
    }
  };

  const handleRestart = () => {
    const initialGameState = createInitialGameState();
    setPlayerState(initialGameState.nextPuyos.shift()!)
    setGameState(initialGameState);
    setOpponentState(null);
    setJoinedRoom(false);
    setRoomId('');
  };

  return (
    <div className="App">
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