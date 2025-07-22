import { canMove, applyGravity, checkConnections } from './gameLogic';
import { FieldState, PuyoState, PlayerPuyo, FIELD_WIDTH, FIELD_HEIGHT } from '../types';

// Helper to create an empty field
const createEmptyField = (width: number, height: number): FieldState => {
  return Array.from({ length: height }, () => Array(width).fill({ color: null }));
};

describe('canMove', () => {
  let field: FieldState;
  beforeEach(() => {
    field = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
  });

  test('should return true if puyos can move to the next position', () => {
    const puyo1: PlayerPuyo = { x: 0, y: 0, color: 'red' };
    const puyo2: PlayerPuyo = { x: 0, y: 1, color: 'red' };
    expect(canMove(field, puyo1, puyo2)).toBe(true);
  });

  test('should return false if puyos hit the bottom', () => {
    const puyo1: PlayerPuyo = { x: 0, y: FIELD_HEIGHT - 1, color: 'red' };
    const puyo2: PlayerPuyo = { x: 0, y: FIELD_HEIGHT, color: 'red' }; // y:12 is out of bounds
    expect(canMove(field, puyo1, puyo2)).toBe(false);
  });

  test('should return false if puyos hit the side walls', () => {
    const puyo1: PlayerPuyo = { x: -1, y: 0, color: 'red' }; // x:-1 is out of bounds
    const puyo2: PlayerPuyo = { x: 0, y: 0, color: 'red' };
    expect(canMove(field, puyo1, puyo2)).toBe(false);
  });

  test('should return false if puyos collide with existing puyos', () => {
    field[1][0] = { color: 'blue' };
    const puyo1: PlayerPuyo = { x: 0, y: 0, color: 'red' };
    const puyo2: PlayerPuyo = { x: 0, y: 1, color: 'red' };
    expect(canMove(field, puyo1, puyo2)).toBe(false);
  });
});

describe('applyGravity', () => {
  test('should apply gravity correctly with single puyos', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[FIELD_HEIGHT - 2][0] = { color: 'red' };
    initialField[FIELD_HEIGHT - 3][1] = { color: 'blue' };

    const expectedField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    expectedField[FIELD_HEIGHT - 1][0] = { color: 'red' };
    expectedField[FIELD_HEIGHT - 1][1] = { color: 'blue' };

    expect(applyGravity(initialField)).toEqual(expectedField);
  });

  test('should not change field if no puyos are floating', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[FIELD_HEIGHT - 1][0] = { color: 'red' };
    initialField[FIELD_HEIGHT - 1][1] = { color: 'blue' };

    expect(applyGravity(initialField)).toEqual(initialField);
  });

  test('should handle multiple puyos in a column', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[FIELD_HEIGHT - 4][0] = { color: 'red' };
    initialField[FIELD_HEIGHT - 2][0] = { color: 'blue' };

    const expectedField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    expectedField[FIELD_HEIGHT - 1][0] = { color: 'blue' };
    expectedField[FIELD_HEIGHT - 2][0] = { color: 'red' };

    expect(applyGravity(initialField)).toEqual(expectedField);
  });

  test('should handle empty columns', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[FIELD_HEIGHT - 1][0] = { color: 'red' };
    initialField[FIELD_HEIGHT - 1][2] = { color: 'blue' };

    const expectedField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    expectedField[FIELD_HEIGHT - 1][0] = { color: 'red' };
    expectedField[FIELD_HEIGHT - 1][2] = { color: 'blue' };

    expect(applyGravity(initialField)).toEqual(expectedField);
  });
});

describe('checkConnections', () => {
  test('should erase 4 connected puyos of the same color (horizontal)', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[0][0] = { color: 'red' };
    initialField[0][1] = { color: 'red' };
    initialField[0][2] = { color: 'red' };
    initialField[0][3] = { color: 'red' };

    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(true);
    expect(erasedCount).toBe(4);
    expect(newField[0][0].color).toBe(null);
    expect(newField[0][1].color).toBe(null);
    expect(newField[0][2].color).toBe(null);
    expect(newField[0][3].color).toBe(null);
  });

  test('should erase 4 connected puyos of the same color (vertical)', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[0][0] = { color: 'red' };
    initialField[1][0] = { color: 'red' };
    initialField[2][0] = { color: 'red' };
    initialField[3][0] = { color: 'red' };

    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(true);
    expect(erasedCount).toBe(4);
    expect(newField[0][0].color).toBe(null);
    expect(newField[1][0].color).toBe(null);
    expect(newField[2][0].color).toBe(null);
    expect(newField[3][0].color).toBe(null);
  });

  test('should erase 4 connected puyos of the same color (L-shape)', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[0][0] = { color: 'red' };
    initialField[1][0] = { color: 'red' };
    initialField[2][0] = { color: 'red' };
    initialField[2][1] = { color: 'red' };

    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(true);
    expect(erasedCount).toBe(4);
    expect(newField[0][0].color).toBe(null);
    expect(newField[1][0].color).toBe(null);
    expect(newField[2][0].color).toBe(null);
    expect(newField[2][1].color).toBe(null);
  });

  test('should erase 4 connected puyos of the same color (T-shape)', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[1][0] = { color: 'red' };
    initialField[1][1] = { color: 'red' };
    initialField[1][2] = { color: 'red' };
    initialField[0][1] = { color: 'red' };

    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(true);
    expect(erasedCount).toBe(4);
    expect(newField[1][0].color).toBe(null);
    expect(newField[1][1].color).toBe(null);
    expect(newField[1][2].color).toBe(null);
    expect(newField[0][1].color).toBe(null);
  });

  test('should not erase less than 4 connected puyos', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[0][0] = { color: 'red' };
    initialField[0][1] = { color: 'red' };
    initialField[0][2] = { color: 'red' };

    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(false);
    expect(erasedCount).toBe(0);
    expect(newField).toEqual(initialField);
  });

  test('should erase multiple groups', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[0][0] = { color: 'red' };
    initialField[0][1] = { color: 'red' };
    initialField[1][0] = { color: 'red' };
    initialField[1][1] = { color: 'red' };

    initialField[0][3] = { color: 'blue' };
    initialField[0][4] = { color: 'blue' };
    initialField[1][3] = { color: 'blue' };
    initialField[1][4] = { color: 'blue' };

    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(true);
    expect(erasedCount).toBe(8);
    expect(newField[0][0].color).toBe(null);
    expect(newField[0][1].color).toBe(null);
    expect(newField[1][0].color).toBe(null);
    expect(newField[1][1].color).toBe(null);
    expect(newField[0][3].color).toBe(null);
    expect(newField[0][4].color).toBe(null);
    expect(newField[1][3].color).toBe(null);
    expect(newField[1][4].color).toBe(null);
  });

  test('should not erase diagonally connected puyos', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[0][0] = { color: 'red' };
    initialField[1][1] = { color: 'red' };
    initialField[2][2] = { color: 'red' };
    initialField[3][3] = { color: 'red' };

    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(false);
    expect(erasedCount).toBe(0);
    expect(newField).toEqual(initialField);
  });

  test('should handle a large connected group', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    // Create a 3x3 block of red puyos
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        initialField[y][x] = { color: 'red' };
      }
    }

    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(true);
    expect(erasedCount).toBe(9);
    // All 9 puyos should be erased
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        expect(newField[y][x].color).toBe(null);
      }
    }
  });

  test('should handle no connections', () => {
    const initialField: FieldState = createEmptyField(FIELD_WIDTH, FIELD_HEIGHT);
    initialField[0][0] = { color: 'red' };
    initialField[1][1] = { color: 'blue' };
    initialField[2][2] = { color: 'green' };

    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(false);
    expect(erasedCount).toBe(0);
    expect(newField).toEqual(initialField);
  });
});
