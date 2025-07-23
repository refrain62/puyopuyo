import { useState, useEffect, useCallback } from 'react';
import { GameState, FIELD_WIDTH, FIELD_HEIGHT, PuyoState, PlayerState, PlayerPuyo, PuyoColor, FieldState } from '../types';
import { useSocket } from './useSocket';
import { canMove, applyGravity, checkConnections } from '../utils/gameLogic';

// ぷよの色定義
const PUYO_COLORS: PuyoColor[] = ['red', 'green', 'blue', 'yellow', 'purple'];
// ネクストぷよの表示数
const NEXT_PUYO_COUNT = 2;

/**
 * 新しい操作ぷよのペアを生成します。
 * @returns 新しい操作ぷよのペア
 */
const createNewPuyoPair = (): PlayerState => ({
    puyo1: { x: 2, y: -1, color: PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)] },
    puyo2: { x: 2, y: 0, color: PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)] },
});

/**
 * ゲームの初期状態を生成します。
 * @returns ゲームの初期状態
 */
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

/**
 * 指定されたミリ秒だけ処理を一時停止します。
 * @param ms 停止するミリ秒数
 * @returns Promise<void>
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * ぷよぷよゲームのロジックと状態管理を提供するカスタムフックです。
 * ゲームの状態、プレイヤーの操作、ソケット通信などを管理します。
 */
export const usePuyoGame = () => {
  const socket = useSocket(); // Socket.IOクライアントのインスタンス
  const [gameState, setGameState] = useState<GameState>(createInitialGameState()); // ゲーム全体の状態
  const [opponentState, setOpponentState] = useState<FieldState | null>(null); // 対戦相手のフィールド状態
  const [playerState, setPlayerState] = useState<PlayerState>(createNewPuyoPair()); // 現在操作中のぷよの状態
  const [isProcessing, setIsProcessing] = useState(false); // 連鎖処理中などの状態フラグ
  const [roomId, setRoomId] = useState(''); // 現在参加しているルームID
  const [joinedRoom, setJoinedRoom] = useState(false); // ルームに参加済みかどうかのフラグ

  /**
   * ぷよをフィールドに固定し、連鎖処理、おじゃまぷよの送受信、新しいぷよの生成を行います。
   */
  const fixPuyo = useCallback(async () => {
    if (isProcessing) return; // 処理中の場合はスキップ
    setIsProcessing(true); // 処理中フラグを立てる

    // 現在のフィールドのコピーを作成し、操作中のぷよを配置
    let currentField = gameState.field.map(row => row.map(puyo => ({ ...puyo })));
    const { puyo1, puyo2 } = playerState;
    if (puyo1.y >= 0) currentField[puyo1.y][puyo1.x] = { color: puyo1.color };
    if (puyo2.y >= 0) currentField[puyo2.y][puyo2.x] = { color: puyo2.color };
    
    // ゲームオーバー判定 (フィールドの特定の位置にぷよがあるか)
    if (currentField[0][2].color) {
        setGameState(prev => ({ ...prev, isGameOver: true }));
        setIsProcessing(false);
        return;
    }

    setGameState(prev => ({ ...prev, field: currentField }));
    await sleep(50); // 短い遅延

    let chain = 0; // 連鎖数
    let totalErasedPuyos = 0; // 消去されたぷよの総数
    // 連鎖ボーナス計算用の配列 (簡略化された値)
    const chainPower = [0, 8, 16, 32, 64, 96, 128, 160]; 

    // 連鎖ループ
    while (true) {
        const { newField, erased, erasedCount } = checkConnections(currentField); // 接続チェックと消去
        if (!erased) break; // 消去がなければ連鎖終了

        chain++; // 連鎖数をインクリメント
        totalErasedPuyos += erasedCount; // 消去されたぷよの数を加算
        // スコア更新とフィールドの更新
        setGameState(prev => ({ ...prev, field: newField, score: prev.score + 100 * chain }));
        await sleep(300); // 消去アニメーションのための遅延

        const afterGravityField = applyGravity(newField); // 重力適用
        setGameState(prev => ({ ...prev, field: afterGravityField }));
        await sleep(300); // 落下アニメーションのための遅延

        currentField = afterGravityField; // 次の連鎖のためにフィールドを更新
    }

    // おじゃまぷよの計算と送信
    let nuisancePuyosToSend = 0;
    if (chain > 0) {
        const baseNuisance = Math.floor(totalErasedPuyos / 4); // 基本のおじゃまぷよ数
        const chainBonus = chainPower[Math.min(chain, chainPower.length - 1)]; // 連鎖ボーナス
        nuisancePuyosToSend = Math.floor((baseNuisance + chainBonus) / 70); // 簡略化された計算式
    }

    // 全消しボーナス
    const isAllClear = currentField.flat().every(puyo => puyo.color === null);
    if (isAllClear) {
        nuisancePuyosToSend += 30; // 全消しで30個のおじゃまぷよ
        console.log('All Clear!');
    }

    // 相手からのおじゃまぷよと相殺処理
    setGameState(prev => {
        let remainingNuisance = prev.incomingNuisancePuyos - nuisancePuyosToSend;
        if (remainingNuisance < 0) {
            // 送るおじゃまぷよが残った場合、相手に送信
            if (socket && joinedRoom) {
                socket.emit('sendNuisancePuyos', Math.abs(remainingNuisance));
            }
            remainingNuisance = 0;
        }
        return { ...prev, incomingNuisancePuyos: remainingNuisance };
    });

    // 次の操作ぷよをネクストぷよから取得し、新しいネクストぷよを生成
    const newNextPuyos = [...gameState.nextPuyos];
    const nextPlayerPuyo = newNextPuyos.shift()!;
    newNextPuyos.push(createNewPuyoPair());

    setPlayerState(nextPlayerPuyo);
    setGameState(prev => ({ ...prev, nextPuyos: newNextPuyos }));
    setIsProcessing(false); // 処理中フラグを解除
  }, [playerState, gameState, checkConnections, applyGravity, isProcessing, socket, joinedRoom]);

  /**
   * 操作中のぷよを1マス落下させます。
   * 接地した場合はfixPuyoを呼び出します。
   */
  const dropPuyo = useCallback(() => {
    if (isProcessing || gameState.isGameOver) return; // 処理中またはゲームオーバーの場合はスキップ
    const { puyo1, puyo2 } = playerState;
    const nextPuyo1 = { ...puyo1, y: puyo1.y + 1 };
    const nextPuyo2 = { ...puyo2, y: puyo2.y + 1 };

    if (canMove(gameState.field, nextPuyo1, nextPuyo2)) {
        setPlayerState({ puyo1: nextPuyo1, puyo2: nextPuyo2 }); // 移動可能なら落下
    } else {
        // 接地した場合、ぷよを固定し、おじゃまぷよを処理
        fixPuyo();
        if (gameState.incomingNuisancePuyos > 0) {
            setGameState(prev => {
                const newField = prev.field.map(row => row.map(puyo => ({ ...puyo })));
                let nuisanceCount = prev.incomingNuisancePuyos;
                // おじゃまぷよをフィールド上部にランダムに配置
                for (let i = 0; i < nuisanceCount; i++) {
                    const x = Math.floor(Math.random() * FIELD_WIDTH);
                    for (let y = 0; y < FIELD_HEIGHT; y++) {
                        if (!newField[y][x].color) {
                            newField[y][x] = { color: 'purple' }; // おじゃまぷよは紫
                            break;
                        }
                    }
                }
                return { ...prev, field: newField, incomingNuisancePuyos: 0 };
            });
        }
    }
  }, [gameState, playerState, canMove, fixPuyo, isProcessing]);

  /**
   * ゲームループを設定します。
   * ゲームオーバーでない限り、定期的にdropPuyoを呼び出します。
   */
  useEffect(() => {
    if (gameState.isGameOver) return;
    const gameLoop = setInterval(dropPuyo, 1000);
    return () => clearInterval(gameLoop);
  }, [dropPuyo, gameState.isGameOver]);

  /**
   * キーボードイベントを処理します。
   * ぷよの移動、回転、高速落下を行います。
   */
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (isProcessing || gameState.isGameOver) return; // 処理中またはゲームオーバーの場合はスキップ
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
        dropPuyo(); // 高速落下
        break;
      case 'ArrowUp':
        setPlayerState((prev) => {
            const { puyo1, puyo2 } = prev;
            // 軸ぷよを中心に子ぷよを90度回転
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

  /**
   * キーボードイベントリスナーを登録・解除します。
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  /**
   * Socket.IO関連のイベントリスナーを設定します。
   */
  useEffect(() => {
    if (!socket) return;

    // ゲーム開始イベント
    socket.on('startGame', () => {
      console.log('Game started!');
      setJoinedRoom(true);
      // ゲーム状態をリセット
      setGameState(createInitialGameState());
      setPlayerState(createNewPuyoPair());
      setOpponentState(null);
    });

    // 相手のフィールド更新イベント
    socket.on('opponentFieldUpdate', (field: FieldState) => {
      setOpponentState(field);
    });

    // おじゃまぷよ受信イベント
    socket.on('receiveNuisancePuyos', (nuisancePuyos: number) => {
        setGameState(prev => ({ ...prev, incomingNuisancePuyos: prev.incomingNuisancePuyos + nuisancePuyos }));
    });

    // ルーム満員イベント
    socket.on('roomFull', (roomId: string) => {
      alert(`Room ${roomId} is full. Please try another room.`);
    });

    // 相手切断イベント
    socket.on('opponentDisconnected', () => {
      alert('Your opponent has disconnected. Game over.');
      setGameState(prev => ({ ...prev, isGameOver: true }));
    });

    // クリーンアップ関数
    return () => {
      socket.off('startGame');
      socket.off('opponentFieldUpdate');
      socket.off('receiveNuisancePuyos');
      socket.off('roomFull');
      socket.off('opponentDisconnected');
    };
  }, [socket]);

  /**
   * 自分のフィールドの状態を相手に送信します。
   * フィールドまたは操作ぷよが変更されるたびに送信されます。
   */
  useEffect(() => {
    if (socket && joinedRoom) {
      socket.emit('updateField', displayField());
    }
  }, [socket, joinedRoom, gameState.field, playerState]); // Re-emit when field or playerState changes

  /**
   * 現在のゲームフィールドと操作中のぷよを結合して表示用のフィールドを生成します。
   * @returns 表示用のゲームフィールド
   */
  const displayField = (): PuyoState[][] => {
    // 処理中かつゲームオーバーでない場合は、現在のフィールドをそのまま返す（操作ぷよは表示しない）
    if (isProcessing && !gameState.isGameOver) return gameState.field;

    // フィールドのコピーを作成
    const newField = gameState.field.map(row => row.map(puyo => ({ ...puyo })));
    const { puyo1, puyo2 } = playerState;

    // ゲームオーバーでない場合のみ操作ぷよをフィールドに描画
    if (!gameState.isGameOver) {
        if (puyo1.y >= 0) newField[puyo1.y][puyo1.x] = { color: puyo1.color };
        if (puyo2.y >= 0) newField[puyo2.y][puyo2.x] = { color: puyo2.color };
    }

    return newField;
  };

  /**
   * ルームに参加します。
   */
  const handleJoinRoom = (roomIdToJoin: string) => {
    if (socket && roomIdToJoin) {
      setRoomId(roomIdToJoin);
      socket.emit('joinRoom', roomIdToJoin);
    }
  };

  /**
   * ゲームをリスタートします。
   * ゲームの状態を初期化し、ルーム参加状態をリセットします。
   */
  const handleRestart = () => {
    const initialGameState = createInitialGameState();
    setPlayerState(initialGameState.nextPuyos.shift()!)
    setGameState(initialGameState);
    setOpponentState(null);
    setJoinedRoom(false);
    setRoomId('');
  };

  return {
    gameState,
    opponentState,
    playerState,
    isProcessing,
    roomId,
    joinedRoom,
    displayField,
    handleJoinRoom,
    handleRestart,
    setRoomId,
  };
};