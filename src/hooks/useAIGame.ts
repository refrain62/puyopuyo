import { useState, useEffect, useCallback } from 'react';
import { GameState, FIELD_WIDTH, FIELD_HEIGHT, PuyoState, PlayerState, PlayerPuyo, PuyoColor, FieldState } from '../types';
import { canMove, applyGravity, checkConnections } from '../utils/gameLogic';

const PUYO_COLORS: PuyoColor[] = ['red', 'green', 'blue', 'yellow', 'purple'];
const NEXT_PUYO_COUNT = 2;

const createNewPuyoPair = (): PlayerState => ({
    puyo1: { x: 2, y: -1, color: PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)] },
    puyo2: { x: 2, y: 0, color: PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)] },
});

const createInitialGameState = (): GameState => ({
  field: Array.from({ length: FIELD_HEIGHT }, () =>
    Array(FIELD_WIDTH).fill({ color: null })
  ),
  score: 0,
  isGameOver: false,
  nextPuyos: Array.from({ length: NEXT_PUYO_COUNT }, () => createNewPuyoPair()),
  incomingNuisancePuyos: 0,
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useAIGame = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [playerState, setPlayerState] = useState<PlayerState>(createNewPuyoPair());
  const [isProcessing, setIsProcessing] = useState(false);

  // AIのフィールド状態
  const [aiGameState, setAIGameState] = useState<GameState>(createInitialGameState());
  const [aiPlayerState, setAIPlayerState] = useState<PlayerState>(createNewPuyoPair());
  const [isAIGameOver, setIsAIGameOver] = useState(false);

  /**
   * AIが最適な手を決定するための関数。
   * 現在は、最も多くのぷよが消える位置を探すシンプルなロジック。
   * @param currentField AIの現在のフィールド
   * @param currentPuyo AIの操作ぷよ
   * @returns 最適な移動後のぷよの状態
   */
  const findBestAIMove = useCallback((currentField: FieldState, currentPuyo: PlayerState): PlayerState => {
    let bestMove: PlayerState = { ...currentPuyo };
    let maxEvaluation = -1; // 評価値

    // 可能なすべてのX座標と回転を試す
    for (let x = 0; x < FIELD_WIDTH; x++) {
      for (let rotation = 0; rotation < 4; rotation++) { // 4方向の回転をシミュレート
        let simulatedPuyo: PlayerState = { ...currentPuyo };
        // 回転を適用
        if (rotation > 0) {
          const { puyo1, puyo2 } = simulatedPuyo;
          const dx = puyo2.x - puyo1.x;
          const dy = puyo2.y - puyo1.y;
          simulatedPuyo.puyo2 = { ...puyo2, x: puyo1.x - dy, y: puyo1.y + dx };
        }

        // X座標を調整
        simulatedPuyo.puyo1.x = x;
        simulatedPuyo.puyo2.x = x + (simulatedPuyo.puyo2.x - currentPuyo.puyo1.x); // 相対位置を維持

        // ぷよを一番下まで落とすシミュレーション
        let tempPuyo: PlayerState = { ...simulatedPuyo };
        while (canMove(currentField, { ...tempPuyo.puyo1, y: tempPuyo.puyo1.y + 1 }, { ...tempPuyo.puyo2, y: tempPuyo.puyo2.y + 1 })) {
          tempPuyo.puyo1.y++;
          tempPuyo.puyo2.y++;
        }

        // シミュレーション後のフィールドを作成
        const simulatedField = currentField.map(row => row.map(puyo => ({ ...puyo })));
        // ぷよがフィールドの有効な範囲内にあるか確認してからアクセス
        if (tempPuyo.puyo1.y >= 0 && tempPuyo.puyo1.y < FIELD_HEIGHT && tempPuyo.puyo1.x >= 0 && tempPuyo.puyo1.x < FIELD_WIDTH) {
            simulatedField[tempPuyo.puyo1.y][tempPuyo.puyo1.x] = { color: tempPuyo.puyo1.color };
        }
        if (tempPuyo.puyo2.y >= 0 && tempPuyo.puyo2.y < FIELD_HEIGHT && tempPuyo.puyo2.x >= 0 && tempPuyo.puyo2.x < FIELD_WIDTH) {
            simulatedField[tempPuyo.puyo2.y][tempPuyo.puyo2.x] = { color: tempPuyo.puyo2.color };
        }

        // 接続をチェックし、消去されるぷよの数と連鎖数を評価
        let evaluation = 0;
        let simulatedChain = 0;
        let tempSimulatedField = simulatedField;
        while (true) {
            const { newField, erased, erasedCount } = checkConnections(tempSimulatedField);
            if (!erased) break;
            simulatedChain++;
            evaluation += erasedCount * 10 + simulatedChain * 100; // 消去数と連鎖数で評価
            tempSimulatedField = applyGravity(newField);
        }

        if (evaluation > maxEvaluation) {
          maxEvaluation = evaluation;
          bestMove = tempPuyo;
        }
      }
    }
    return bestMove;
  }, [canMove, checkConnections, applyGravity]);

  const fixPuyo = useCallback(async (isAI: boolean) => {
    const currentPuyoState = isAI ? aiPlayerState : playerState;
    const setCurrentGameState = isAI ? setAIGameState : setGameState;
    const setPlayerPuyoState = isAI ? setAIPlayerState : setPlayerState;

    if (isProcessing) return;
    setIsProcessing(true);

    let currentField = (isAI ? aiGameState.field : gameState.field).map(row => row.map(puyo => ({ ...puyo })));
    const { puyo1, puyo2 } = currentPuyoState;
    // ぷよがフィールドの有効な範囲内にあるか確認してからアクセス
    if (puyo1.y >= 0 && puyo1.y < FIELD_HEIGHT && puyo1.x >= 0 && puyo1.x < FIELD_WIDTH) {
        currentField[puyo1.y][puyo1.x] = { color: puyo1.color };
    }
    if (puyo2.y >= 0 && puyo2.y < FIELD_HEIGHT && puyo2.x >= 0 && puyo2.x < FIELD_WIDTH) {
        currentField[puyo2.y][puyo2.x] = { color: puyo2.color };
    }
    
    if (currentField[0][2].color) {
        setCurrentGameState(prev => ({ ...prev, isGameOver: true }));
        setIsProcessing(false);
        if (isAI) setIsAIGameOver(true);
        return;
    }

    setCurrentGameState(prev => ({ ...prev, field: currentField }));
    await sleep(50);

    let chain = 0;
    let totalErasedPuyos = 0;
    const chainPower = [0, 8, 16, 32, 64, 96, 128, 160];

    while (true) {
        const { newField, erased, erasedCount } = checkConnections(currentField);
        if (!erased) break;

        chain++;
        totalErasedPuyos += erasedCount;
        setCurrentGameState(prev => ({ ...prev, field: newField, score: prev.score + 100 * chain }));
        await sleep(300);

        const afterGravityField = applyGravity(newField);
        setCurrentGameState(prev => ({ ...prev, field: afterGravityField }));
        await sleep(300);

        currentField = afterGravityField;
    }

    let nuisancePuyosToSend = 0;
    if (chain > 0) {
        const baseNuisance = Math.floor(totalErasedPuyos / 4);
        const chainBonus = chainPower[Math.min(chain, chainPower.length - 1)];
        nuisancePuyosToSend = Math.floor((baseNuisance + chainBonus) / 70);
    }

    const isAllClear = currentField.flat().every(puyo => puyo.color === null);
    if (isAllClear) {
        nuisancePuyosToSend += 30;
        console.log('All Clear!');
    }

    // AI対戦では、おじゃまぷよは直接相手のincomingNuisancePuyosに加算
    if (isAI) {
        setGameState(prev => ({ ...prev, incomingNuisancePuyos: prev.incomingNuisancePuyos + nuisancePuyosToSend }));
    } else {
        setAIGameState(prev => ({ ...prev, incomingNuisancePuyos: prev.incomingNuisancePuyos + nuisancePuyosToSend }));
    }

    setCurrentGameState(prev => {
        let remainingNuisance = prev.incomingNuisancePuyos;
        // AI対戦では相殺は行わない（シンプル化のため）
        return { ...prev, incomingNuisancePuyos: remainingNuisance };
    });

    const newNextPuyos = [...(isAI ? aiGameState.nextPuyos : gameState.nextPuyos)];
    const nextPuyo = newNextPuyos.shift()!;
    newNextPuyos.push(createNewPuyoPair());

    setPlayerPuyoState(nextPuyo);
    setCurrentGameState(prev => ({ ...prev, nextPuyos: newNextPuyos }));
    setIsProcessing(false);
  }, [playerState, gameState, aiPlayerState, aiGameState, isProcessing, checkConnections, applyGravity]);

  const dropPuyo = useCallback((isAI: boolean) => {
    const currentPuyoState = isAI ? aiPlayerState : playerState;
    const currentGameState = isAI ? aiGameState : gameState;
    const setPlayerPuyoState = isAI ? setAIPlayerState : setPlayerState;
    const setCurrentGameState = isAI ? setAIGameState : setGameState;

    if (isProcessing || currentGameState.isGameOver) return;

    const { puyo1, puyo2 } = currentPuyoState;
    const nextPuyo1 = { ...puyo1, y: puyo1.y + 1 };
    const nextPuyo2 = { ...puyo2, y: puyo2.y + 1 };

    if (canMove(currentGameState.field, nextPuyo1, nextPuyo2)) {
        setPlayerPuyoState({ puyo1: nextPuyo1, puyo2: nextPuyo2 });
    } else {
        fixPuyo(isAI);
        if (currentGameState.incomingNuisancePuyos > 0) {
            setCurrentGameState(prev => {
                const newField = prev.field.map(row => row.map(puyo => ({ ...puyo })));
                let nuisanceCount = prev.incomingNuisancePuyos;
                for (let i = 0; i < nuisanceCount; i++) {
                    const x = Math.floor(Math.random() * FIELD_WIDTH);
                    for (let y = 0; y < FIELD_HEIGHT; y++) {
                        if (!newField[y][x].color) {
                            newField[y][x] = { color: 'purple' };
                            break;
                        }
                    }
                }
                return { ...prev, field: newField, incomingNuisancePuyos: 0 };
            });
        }
    }
  }, [isProcessing, gameState, aiGameState, playerState, aiPlayerState, canMove, fixPuyo]);

  // Player game loop
  useEffect(() => {
    if (gameState.isGameOver) return;
    const gameLoop = setInterval(() => dropPuyo(false), 1000);
    return () => clearInterval(gameLoop);
  }, [dropPuyo, gameState.isGameOver]);

  // AI game loop (simple: just drops puyo)
  useEffect(() => {
    if (aiGameState.isGameOver || isProcessing) return; // 処理中はAIを停止
    const aiGameLoop = setInterval(() => {
      // AIの思考と操作
      const bestMove = findBestAIMove(aiGameState.field, aiPlayerState);
      setAIPlayerState(bestMove);
      dropPuyo(true); // ぷよを落下させる
    }, 1000);
    return () => clearInterval(aiGameLoop);
  }, [dropPuyo, aiGameState.isGameOver, aiGameState.field, aiPlayerState, findBestAIMove, isProcessing]);

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
        dropPuyo(false);
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

  const displayPlayerField = (): FieldState => {
    if (isProcessing && !gameState.isGameOver) return gameState.field;
    const newField = gameState.field.map(row => row.map(puyo => ({ ...puyo })));
    const { puyo1, puyo2 } = playerState;
    // ぷよがフィールドの有効な範囲内にあるか確認してからアクセス
    if (puyo1.y >= 0 && puyo1.y < FIELD_HEIGHT && puyo1.x >= 0 && puyo1.x < FIELD_WIDTH) {
        newField[puyo1.y][puyo1.x] = { color: puyo1.color };
    }
    if (puyo2.y >= 0 && puyo2.y < FIELD_HEIGHT && puyo2.x >= 0 && puyo2.x < FIELD_WIDTH) {
        newField[puyo2.y][puyo2.x] = { color: puyo2.color };
    }
    return newField;
  };

  const displayAIField = (): FieldState => {
    if (isProcessing && !aiGameState.isGameOver) return aiGameState.field;
    const newField = aiGameState.field.map(row => row.map(puyo => ({ ...puyo })));
    const { puyo1, puyo2 } = aiPlayerState;
    // ぷよがフィールドの有効な範囲内にあるか確認してからアクセス
    if (puyo1.y >= 0 && puyo1.y < FIELD_HEIGHT && puyo1.x >= 0 && puyo1.x < FIELD_WIDTH) {
        newField[puyo1.y][puyo1.x] = { color: puyo1.color };
    }
    if (puyo2.y >= 0 && puyo2.y < FIELD_HEIGHT && puyo2.x >= 0 && puyo2.x < FIELD_WIDTH) {
        newField[puyo2.y][puyo2.x] = { color: puyo2.color };
    }
    return newField;
  };

  const handleRestart = () => {
    setGameState(createInitialGameState());
    setPlayerState(createNewPuyoPair());
    setAIGameState(createInitialGameState());
    setAIPlayerState(createNewPuyoPair());
    setIsAIGameOver(false);
  };

  return {
    gameState,
    aiGameState,
    playerState,
    aiPlayerState,
    isAIGameOver,
    displayPlayerField,
    displayAIField,
    handleRestart,
    handleKeyPress,
  };
};