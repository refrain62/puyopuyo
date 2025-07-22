import React, { useState, useEffect, useCallback } from 'react';
import Field from './components/Field';
import NextPuyoField from './components/NextPuyoField';
import { GameState, FIELD_WIDTH, FIELD_HEIGHT, PuyoState, PlayerState, PlayerPuyo, PuyoColor, FieldState } from './types';
import { useSocket } from './hooks/useSocket';
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
    };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function App() {
  const socket = useSocket();
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [opponentState, setOpponentState] = useState<FieldState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(createNewPuyoPair());
  const [isProcessing, setIsProcessing] = useState(false);

  // ... (rest of the logic: canMove, applyGravity, checkConnections, etc.)
  // This will be updated in the next steps to emit and listen to socket events

  const canMove = useCallback((field: FieldState, puyo1: PlayerPuyo, puyo2: PlayerPuyo): boolean => {
    if (puyo1.y >= FIELD_HEIGHT || puyo2.y >= FIELD_HEIGHT) return false;
    if (puyo1.x < 0 || puyo1.x >= FIELD_WIDTH || puyo2.x < 0 || puyo2.x >= FIELD_WIDTH) return false;
    if (puyo1.y >= 0 && field[puyo1.y][puyo1.x].color) return false;
    if (puyo2.y >= 0 && field[puyo2.y][puyo2.x].color) return false;
    return true;
  }, []);

  const applyGravity = useCallback((field: FieldState): FieldState => {
    const newField = field.map(row => row.map(puyo => ({ ...puyo })));
    for (let x = 0; x < FIELD_WIDTH; x++) {
        let emptyRow = FIELD_HEIGHT - 1;
        for (let y = FIELD_HEIGHT - 1; y >= 0; y--) {
            if (newField[y][x].color) {
                [newField[emptyRow][x], newField[y][x]] = [newField[y][x], newField[emptyRow][x]];
                emptyRow--;
            }
        }
    }
    return newField;
  }, []);

  const checkConnections = useCallback((field: FieldState): { newField: FieldState, erased: boolean } => {
    const toErase: boolean[][] = Array.from({ length: FIELD_HEIGHT }, () => Array(FIELD_WIDTH).fill(false));
    let erased = false;

    for (let y = 0; y < FIELD_HEIGHT; y++) {
      for (let x = 0; x < FIELD_WIDTH; x++) {
        const puyo = field[y][x];
        if (!puyo.color || toErase[y][x]) continue;

        const q: [number, number][] = [[y, x]];
        const visited: boolean[][] = Array.from({ length: FIELD_HEIGHT }, () => Array(FIELD_WIDTH).fill(false));
        visited[y][x] = true;
        const connected: [number, number][] = [[y, x]];

        while (q.length > 0) {
          const [curY, curX] = q.shift()!;
          [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dy, dx]) => {
            const ny = curY + dy;
            const nx = curX + dx;
            if (ny >= 0 && ny < FIELD_HEIGHT && nx >= 0 && nx < FIELD_WIDTH &&
                !visited[ny][nx] && field[ny][nx].color === puyo.color) {
              visited[ny][nx] = true;
              q.push([ny, nx]);
              connected.push([ny, nx]);
            }
          });
        }

        if (connected.length >= 4) {
          erased = true;
          connected.forEach(([ey, ex]) => { toErase[ey][ex] = true; });
        }
      }
    }

    const newField = field.map((row, y) => row.map((puyo, x) => toErase[y][x] ? { color: null } : puyo));
    return { newField, erased };
  }, []);

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
    while (true) {
        const { newField, erased } = checkConnections(currentField);
        if (!erased) break;

        chain++;
        setGameState(prev => ({ ...prev, field: newField, score: prev.score + 100 * chain }));
        await sleep(300);

        const afterGravityField = applyGravity(newField);
        setGameState(prev => ({ ...prev, field: afterGravityField }));
        await sleep(300);

        currentField = afterGravityField;
    }

    const newNextPuyos = [...gameState.nextPuyos];
    const nextPlayerPuyo = newNextPuyos.shift()!;
    newNextPuyos.push(createNewPuyoPair());

    setPlayerState(nextPlayerPuyo);
    setGameState(prev => ({ ...prev, nextPuyos: newNextPuyos }));
    setIsProcessing(false);
  }, [playerState, gameState, checkConnections, applyGravity, isProcessing]);

  const dropPuyo = useCallback(() => {
    if (isProcessing || gameState.isGameOver) return;
    const { puyo1, puyo2 } = playerState;
    const nextPuyo1 = { ...puyo1, y: puyo1.y + 1 };
    const nextPuyo2 = { ...puyo2, y: puyo2.y + 1 };

    if (canMove(gameState.field, nextPuyo1, nextPuyo2)) {
        setPlayerState({ puyo1: nextPuyo1, puyo2: nextPuyo2 });
    } else {
        fixPuyo();
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

  const handleRestart = () => {
    const initialGameState = createInitialGameState();
    setPlayerState(initialGameState.nextPuyos.shift()!)
    setGameState(initialGameState);
  };

  return (
    <div className="App">
      <h1>Puyo Puyo</h1>
      <div className="game-container">
        <div className="main-game">
          <Field field={displayField()} />
          <div className="side-panel">
              <NextPuyoField puyos={gameState.nextPuyos} />
              <div className="score">Score: {gameState.score}</div>
          </div>
        </div>
        <div className="opponent-game">
          <h2>Opponent</h2>
          {opponentState ? <Field field={opponentState} /> : <p>Waiting for opponent...</p>}
        </div>
      </div>
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