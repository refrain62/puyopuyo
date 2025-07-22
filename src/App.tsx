import React, { useState, useEffect, useCallback } from 'react';
import Field from './components/Field';
import { GameState, FIELD_WIDTH, FIELD_HEIGHT, PuyoState, PlayerState, PlayerPuyo, PuyoColor, FieldState } from './types';

const createInitialGameState = (): GameState => ({
  field: Array.from({ length: FIELD_HEIGHT }, () =>
    Array(FIELD_WIDTH).fill({ color: null })
  ),
  score: 0,
});

const createNewPlayerPuyo = (): PlayerState => {
    const puyoColors: PuyoColor[] = ['red', 'green', 'blue', 'yellow', 'purple'];
    return {
        puyo1: { x: 2, y: -1, color: puyoColors[Math.floor(Math.random() * puyoColors.length)] },
        puyo2: { x: 2, y: 0, color: puyoColors[Math.floor(Math.random() * puyoColors.length)] },
    };
};

function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [playerState, setPlayerState] = useState<PlayerState>(createNewPlayerPuyo());

  const canMove = useCallback((field: FieldState, puyo1: PlayerPuyo, puyo2: PlayerPuyo): boolean => {
    if (puyo1.y >= FIELD_HEIGHT || puyo2.y >= FIELD_HEIGHT) return false;
    if (puyo1.x < 0 || puyo1.x >= FIELD_WIDTH || puyo2.x < 0 || puyo2.x >= FIELD_WIDTH) return false;
    if (puyo1.y >= 0 && field[puyo1.y][puyo1.x].color) return false;
    if (puyo2.y >= 0 && field[puyo2.y][puyo2.x].color) return false;
    return true;
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

  const fixPuyo = useCallback(() => {
    setGameState(prev => {
        const newField = prev.field.map(row => row.map(puyo => ({ ...puyo })));
        const { puyo1, puyo2 } = playerState;
        if (puyo1.y >= 0) newField[puyo1.y][puyo1.x] = { color: puyo1.color };
        if (puyo2.y >= 0) newField[puyo2.y][puyo2.x] = { color: puyo2.color };
        
        const { newField: afterErasedField, erased } = checkConnections(newField);

        return { ...prev, field: afterErasedField };
    });
    setPlayerState(createNewPlayerPuyo());
  }, [playerState, checkConnections]);

  const dropPuyo = useCallback(() => {
    const { puyo1, puyo2 } = playerState;
    const nextPuyo1 = { ...puyo1, y: puyo1.y + 1 };
    const nextPuyo2 = { ...puyo2, y: puyo2.y + 1 };

    if (canMove(gameState.field, nextPuyo1, nextPuyo2)) {
        setPlayerState({ puyo1: nextPuyo1, puyo2: nextPuyo2 });
    } else {
        fixPuyo();
    }
  }, [gameState.field, playerState, canMove, fixPuyo]);

  useEffect(() => {
    const gameLoop = setInterval(dropPuyo, 1000);
    return () => clearInterval(gameLoop);
  }, [dropPuyo]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
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
  }, [gameState.field, canMove, dropPuyo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const displayField = (): PuyoState[][] => {
    const newField = gameState.field.map(row => row.map(puyo => ({ ...puyo })));
    const { puyo1, puyo2 } = playerState;

    if (puyo1.y >= 0) newField[puyo1.y][puyo1.x] = { color: puyo1.color };
    if (puyo2.y >= 0) newField[puyo2.y][puyo2.x] = { color: puyo2.color };

    return newField;
  };

  return (
    <div className="App">
      <h1>Puyo Puyo</h1>
      <Field field={displayField()} />
    </div>
  );
}

export default App;