export type PuyoColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple';

export type PuyoState = {
  color: PuyoColor | null;
};

export const FIELD_WIDTH = 6;
export const FIELD_HEIGHT = 12;

export type FieldState = PuyoState[][];

export type GameState = {
  field: FieldState;
  score: number;
};
