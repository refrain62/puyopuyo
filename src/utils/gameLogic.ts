import { FIELD_WIDTH, FIELD_HEIGHT, PuyoState, PlayerPuyo, FieldState, PuyoColor } from '../types';

export const canMove = (field: FieldState, puyo1: PlayerPuyo, puyo2: PlayerPuyo): boolean => {
  if (puyo1.y >= FIELD_HEIGHT || puyo2.y >= FIELD_HEIGHT) return false;
  if (puyo1.x < 0 || puyo1.x >= FIELD_WIDTH || puyo2.x < 0 || puyo2.x >= FIELD_WIDTH) return false;
  if (puyo1.y >= 0 && field[puyo1.y][puyo1.x].color) return false;
  if (puyo2.y >= 0 && field[puyo2.y][puyo2.x].color) return false;
  return true;
};

export const applyGravity = (field: FieldState): FieldState => {
  const newField = field.map(row => row.map(puyo => ({ ...puyo })));
  for (let x = 0; x < FIELD_WIDTH; x++) {
    let writeY = FIELD_HEIGHT - 1; // Points to the lowest empty spot
    for (let y = FIELD_HEIGHT - 1; y >= 0; y--) {
      if (newField[y][x].color) { // If there's a puyo
        if (y !== writeY) { // If it's not already at the lowest possible spot
          newField[writeY][x] = newField[y][x]; // Move puyo down
          newField[y][x] = { color: null }; // Clear old spot
        }
        writeY--; // Move empty spot pointer up
      }
    }
  }
  return newField;
};

export const checkConnections = (field: FieldState): { newField: FieldState, erased: boolean, erasedCount: number } => {
  const toErase: boolean[][] = Array.from({ length: FIELD_HEIGHT }, () => Array(FIELD_WIDTH).fill(false));
  let erased = false;
  let erasedCount = 0;

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
        erasedCount += connected.length;
        connected.forEach(([ey, ex]) => { toErase[ey][ex] = true; });
      }
    }
  }

  const newField = field.map((row, y) => row.map((puyo, x) => toErase[y][x] ? { color: null } : puyo));
  return { newField, erased, erasedCount };
};