/**
 * ぷよの色の型定義
 */
export type PuyoColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple';

/**
 * ぷよの状態の型定義
 * color: ぷよの色 (nullは空を表す)
 */
export type PuyoState = {
  color: PuyoColor | null;
};

/**
 * フィールドの幅と高さの定数
 */
export const FIELD_WIDTH = 6;
export const FIELD_HEIGHT = 12;

/**
 * フィールドの状態の型定義 (2次元配列)
 */
export type FieldState = PuyoState[][];

/**
 * ゲーム全体の状態の型定義
 * field: 現在のフィールドの状態
 * score: 現在のスコア
 * isGameOver: ゲームが終了したかどうか
 * nextPuyos: 次に落ちてくるぷよのリスト
 * incomingNuisancePuyos: 相手から送られてくるおじゃまぷよの数
 */
export type GameState = {
  field: FieldState;
  score: number;
  isGameOver: boolean;
  nextPuyos: PlayerState[];
  incomingNuisancePuyos: number; // Number of nuisance puyos to drop
};

/**
 * プレイヤーが操作するぷよの型定義
 * x: X座標
 * y: Y座標
 * color: ぷよの色
 */
export type PlayerPuyo = {
  x: number;
  y: number;
  color: PuyoColor;
};

/**
 * プレイヤーが操作するぷよのペアの型定義
 * puyo1: 軸となるぷよ
 * puyo2: 子となるぷよ
 */
export type PlayerState = {
  puyo1: PlayerPuyo; // Axis puyo
  puyo2: PlayerPuyo; // Child puyo
};