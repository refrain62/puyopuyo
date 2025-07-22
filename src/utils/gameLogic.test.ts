import { canMove, applyGravity, checkConnections } from './gameLogic';
import { FieldState, PuyoState, PlayerPuyo } from '../types';

// Helper to create an empty field
const createEmptyField = (width: number, height: number): FieldState => {
  return Array.from({ length: height }, () => Array(width).fill({ color: null }));
};

describe('canMove', () => {
  let field: FieldState;
  beforeEach(() => {
    field = createEmptyField(6, 12);
  });

  test('should return true if puyos can move to the next position', () => {
    const puyo1: PlayerPuyo = { x: 0, y: 0, color: 'red' };
    const puyo2: PlayerPuyo = { x: 0, y: 1, color: 'red' };
    expect(canMove(field, puyo1, puyo2)).toBe(true);
  });

  test('should return false if puyos hit the bottom', () => {
    const puyo1: PlayerPuyo = { x: 0, y: 11, color: 'red' };
    const puyo2: PlayerPuyo = { x: 0, y: 12, color: 'red' }; // y:12 is out of bounds
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
  test('should apply gravity correctly', () => {
    const initialField: FieldState = [
      [{ color: null }, { color: null }],
      [{ color: 'red' }, { color: null }],
      [{ color: null }, { color: 'blue' }],
    ];
    const expectedField: FieldState = [
      [{ color: null }, { color: null }],
      [{ color: null }, { color: null }],
      [{ color: 'red' }, { color: 'blue' }],
    ];
    expect(applyGravity(initialField)).toEqual(expectedField);
  });

  test('should not change field if no puyos are floating', () => {
    const initialField: FieldState = [
      [{ color: null }, { color: null }],
      [{ color: 'red' }, { color: 'blue' }],
      [{ color: 'yellow' }, { color: 'green' }],
    ];
    expect(applyGravity(initialField)).toEqual(initialField);
  });
});

describe('checkConnections', () => {
  test('should erase 4 connected puyos of the same color', () => {
    const initialField: FieldState = [
      [{ color: null }, { color: null }, { color: null }, { color: null }],
      [{ color: 'red' }, { color: 'red' }, { color: 'red' }, { color: 'red' }],
      [{ color: null }, { color: null }, { color: null }, { color: null }],
    ];
    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(true);
    expect(erasedCount).toBe(4);
    expect(newField[1][0].color).toBe(null);
    expect(newField[1][1].color).toBe(null);
    expect(newField[1][2].color).toBe(null);
    expect(newField[1][3].color).toBe(null);
  });

  test('should not erase less than 4 connected puyos', () => {
    const initialField: FieldState = [
      [{ color: null }, { color: null }, { color: null }],
      [{ color: 'red' }, { color: 'red' }, { color: 'red' }],
      [{ color: null }, { color: null }, { color: null }],
    ];
    const { newField, erased, erasedCount } = checkConnections(initialField);
    expect(erased).toBe(false);
    expect(erasedCount).toBe(0);
    expect(newField).toEqual(initialField);
  });

  test('should erase multiple groups', () => {
    const initialField: FieldState = [
      [{ color: 'red' }, { color: 'red' }, { color: null }, { color: 'blue' }, { color: 'blue' }],
      [{ color: 'red' }, { color: 'red' }, { color: null }, { color: 'blue' }, { color: 'blue' }],
    ];
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
});
