import { FIELD_WIDTH, FIELD_HEIGHT, PuyoState, PlayerPuyo, FieldState, PuyoColor } from '../types';

/**
 * 指定されたぷよが次の位置に移動可能かどうかを判定します。
 * フィールドの境界外に出るか、既存のぷよと衝突する場合は移動できません。
 * @param field 現在のゲームフィールドの状態
 * @param puyo1 移動後の軸ぷよの位置と色
 * @param puyo2 移動後の子ぷよの位置と色
 * @returns 移動可能であればtrue、そうでなければfalse
 */
export const canMove = (field: FieldState, puyo1: PlayerPuyo, puyo2: PlayerPuyo): boolean => {
  // フィールドの下端を超えていないかチェック
  if (puyo1.y >= FIELD_HEIGHT || puyo2.y >= FIELD_HEIGHT) return false;
  // フィールドの左右端を超えていないかチェック
  if (puyo1.x < 0 || puyo1.x >= FIELD_WIDTH || puyo2.x < 0 || puyo2.x >= FIELD_WIDTH) return false;
  // 既存のぷよと衝突していないかチェック
  // y座標が0未満の場合はフィールド外なので衝突判定は不要
  if (puyo1.y >= 0 && field[puyo1.y][puyo1.x].color) return false;
  if (puyo2.y >= 0 && field[puyo2.y][puyo2.x].color) return false;
  return true;
};

/**
 * フィールドに重力を適用し、宙に浮いているぷよを落下させます。
 * 各列ごとに下から上にスキャンし、空きスペースを埋めるようにぷよを移動させます。
 * @param field 現在のゲームフィールドの状態
 * @returns 重力適用後の新しいゲームフィールドの状態
 */
export const applyGravity = (field: FieldState): FieldState => {
  // フィールドのコピーを作成し、元のフィールドを変更しないようにする
  const newField = field.map(row => row.map(puyo => ({ ...puyo })));
  for (let x = 0; x < FIELD_WIDTH; x++) {
    let writeY = FIELD_HEIGHT - 1; // ぷよを書き込むべき最も低いY座標
    // 列の最下部から上に向かってスキャン
    for (let y = FIELD_HEIGHT - 1; y >= 0; y--) {
      if (newField[y][x].color) { // ぷよが存在する場合
        if (y !== writeY) { // ぷよが既に正しい位置にない場合
          newField[writeY][x] = newField[y][x]; // ぷよを新しい位置に移動
          newField[y][x] = { color: null }; // 元の位置を空にする
        }
        writeY--; // 次のぷよを書き込む位置を上に移動
      }
    }
  }
  return newField;
};

/**
 * フィールド内の接続されたぷよのグループをチェックし、4つ以上つながっているぷよを消去します。
 * 幅優先探索 (BFS) を使用して接続されたぷよを特定します。
 * @param field 現在のゲームフィールドの状態
 * @returns 消去処理後の新しいフィールド、消去が行われたかどうかのフラグ、消去されたぷよの総数
 */
export const checkConnections = (field: FieldState): { newField: FieldState, erased: boolean, erasedCount: number } => {
  // 消去対象のぷよをマークするための2次元配列
  const toErase: boolean[][] = Array.from({ length: FIELD_HEIGHT }, () => Array(FIELD_WIDTH).fill(false));
  let erased = false; // ぷよが消去されたかどうかのフラグ
  let erasedCount = 0; // 消去されたぷよの総数

  // フィールド全体を走査
  for (let y = 0; y < FIELD_HEIGHT; y++) {
    for (let x = 0; x < FIELD_WIDTH; x++) {
      const puyo = field[y][x];
      // ぷよが存在しない、または既に消去対象としてマークされている場合はスキップ
      if (!puyo.color || toErase[y][x]) continue;

      // BFSのためのキューと訪問済みフラグ、接続されたぷよのリスト
      const q: [number, number][] = [[y, x]];
      const visited: boolean[][] = Array.from({ length: FIELD_HEIGHT }, () => Array(FIELD_WIDTH).fill(false));
      visited[y][x] = true;
      const connected: [number, number][] = [[y, x]];

      // BFSの実行
      while (q.length > 0) {
        const [curY, curX] = q.shift()!;
        // 上下左右の隣接セルをチェック
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dy, dx]) => {
          const ny = curY + dy;
          const nx = curX + dx;
          // フィールド内であり、未訪問で、同じ色のぷよであれば追加
          if (ny >= 0 && ny < FIELD_HEIGHT && nx >= 0 && nx < FIELD_WIDTH &&
              !visited[ny][nx] && field[ny][nx].color === puyo.color) {
            visited[ny][nx] = true;
            q.push([ny, nx]);
            connected.push([ny, nx]);
          }
        });
      }

      // 4つ以上つながっていれば消去対象としてマーク
      if (connected.length >= 4) {
        erased = true;
        erasedCount += connected.length;
        connected.forEach(([ey, ex]) => { toErase[ey][ex] = true; });
      }
    }
  }

  // 消去対象としてマークされたぷよをnullに設定した新しいフィールドを作成
  const newField = field.map((row, y) => row.map((puyo, x) => toErase[y][x] ? { color: null } : puyo));
  return { newField, erased, erasedCount };
};
