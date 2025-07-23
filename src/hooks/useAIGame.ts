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
    let bestMove: PlayerState = { ...currentPuyo }; // デフォルトムーブ
    let maxEvaluation = -Infinity;

    // 4方向の回転を試す
    for (let rotation = 0; rotation < 4; rotation++) {
        let puyo1 = { ...currentPuyo.puyo1, x: 0, y: 0 }; // (0,0)を基点
        let puyo2 = { ...currentPuyo.puyo2, x: currentPuyo.puyo2.x - currentPuyo.puyo1.x, y: currentPuyo.puyo2.y - currentPuyo.puyo1.y }; // puyo1からの相対位置

        // 回転を適用
        for (let i = 0; i < rotation; i++) {
            const dx = puyo2.x;
            const dy = puyo2.y;
            puyo2.x = -dy;
            puyo2.y = dx;
        }

        // 可能なすべての列に配置してみる
        for (let x = 0; x < FIELD_WIDTH; x++) {
            const initialPuyo: PlayerState = {
                puyo1: { ...puyo1, x: x, y: 0, color: currentPuyo.puyo1.color }, // yを0に初期化
                puyo2: { ...puyo2, x: x + puyo2.x, y: 0 + puyo2.y, color: currentPuyo.puyo2.color } // yを0に初期化
            };

            // 移動先が有効かチェック (壁や他のぷよと衝突しないか)
            if (!canMove(currentField, initialPuyo.puyo1, initialPuyo.puyo2)) {
                continue;
            }

            // ぷよを一番下まで落とすシミュレーション
            let tempPuyo = { ...initialPuyo };
            while (canMove(currentField, { ...tempPuyo.puyo1, y: tempPuyo.puyo1.y + 1 }, { ...tempPuyo.puyo2, y: tempPuyo.puyo2.y + 1 })) {
                tempPuyo.puyo1.y++;
                tempPuyo.puyo2.y++;
            }

            // ぷよがフィールド外ならスキップ
            if (tempPuyo.puyo1.y < 0 || tempPuyo.puyo2.y < 0) continue;

            // シミュレーション後のフィールドを作成
            const simulatedField = currentField.map(row => row.map(puyo => ({ ...puyo })));
            if (simulatedField[tempPuyo.puyo1.y]?.[tempPuyo.puyo1.x] !== undefined) {
                simulatedField[tempPuyo.puyo1.y][tempPuyo.puyo1.x] = { color: tempPuyo.puyo1.color };
            }
            if (simulatedField[tempPuyo.puyo2.y]?.[tempPuyo.puyo2.x] !== undefined) {
                simulatedField[tempPuyo.puyo2.y][tempPuyo.puyo2.x] = { color: tempPuyo.puyo2.color };
            }

            // 評価
            let evaluation = 0;
            let simulatedChain = 0;
            let totalErasedCount = 0;
            let tempSimulatedField = simulatedField;
            let fieldAfterChain = simulatedField;

            while (true) {
                const { newField, erased, erasedCount } = checkConnections(tempSimulatedField);
                if (!erased) {
                    fieldAfterChain = tempSimulatedField;
                    break;
                }
                simulatedChain++;
                totalErasedCount += erasedCount;
                tempSimulatedField = applyGravity(newField);
            }
            
            // 評価関数
            // 1. 大連鎖は高評価
            evaluation += (simulatedChain ** 2) * 100;
            // 2. 消去数も評価
            evaluation += totalErasedCount * 10;
            // 3. フィールドは低い方が良い
            const fieldHeight = fieldAfterChain.reduce((max, row, y) => row.some(p => p.color) ? FIELD_HEIGHT - y : max, 0);
            evaluation -= fieldHeight * 5;
            // 4. 同じ色がまとまっていると良い
            let adjacentBonus = 0;
            for (let y = 0; y < FIELD_HEIGHT; y++) {
                for (let x = 0; x < FIELD_WIDTH; x++) {
                    const color = fieldAfterChain[y][x].color;
                    if (color) {
                        if (x + 1 < FIELD_WIDTH && fieldAfterChain[y][x+1].color === color) adjacentBonus++;
                        if (y + 1 < FIELD_HEIGHT && fieldAfterChain[y+1][x].color === color) adjacentBonus++;
                    }
                }
            }
            evaluation += adjacentBonus;

            if (evaluation > maxEvaluation) {
                maxEvaluation = evaluation;
                bestMove = initialPuyo;
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

  // AI game loop
  useEffect(() => {
    if (aiGameState.isGameOver || isProcessing) return;

    const aiTurn = async () => {
        setIsProcessing(true); // AIのターン開始
        await sleep(500); // プレイヤーが視認するための短い待機

        // 1. 最適な手を計算する
        const bestMove = findBestAIMove(aiGameState.field, aiPlayerState);

        // 2. 計算した手にぷよを移動させる (状態を直接更新)
        let movedPuyo = { ...bestMove };

        // 3. ぷよを一番下まで落下させる
        while (canMove(aiGameState.field, { ...movedPuyo.puyo1, y: movedPuyo.puyo1.y + 1 }, { ...movedPuyo.puyo2, y: movedPuyo.puyo2.y + 1 })) {
            movedPuyo.puyo1.y++;
            movedPuyo.puyo2.y++;
        }
        setAIPlayerState(movedPuyo);
        await sleep(100); // 落下を視覚的に見せるための待機

        // 4. ぷよを固定し、連鎖処理などを行う
        await fixPuyo(true);
        setIsProcessing(false); // AIのターン終了
    };

    const timeoutId = setTimeout(aiTurn, 1000); // 次のAIのターンを予約

    return () => clearTimeout(timeoutId);
  }, [aiGameState.isGameOver, aiGameState.field, aiPlayerState, isProcessing, findBestAIMove, fixPuyo, canMove]);

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