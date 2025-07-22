import React from 'react';
import { FieldState, FIELD_WIDTH, FIELD_HEIGHT } from '../types';
import Puyo from './Puyo';
import './Field.css';

/**
 * ゲームフィールドコンポーネントのプロパティ定義
 * field: 表示するフィールドの状態 (2次元配列)
 */
interface FieldProps {
  field: FieldState;
}

/**
 * ゲームの盤面（フィールド）を描画するコンポーネントです。
 * FieldStateに基づいて各マスにぷよを描画します。
 */
const Field: React.FC<FieldProps> = ({ field }) => {
  // CSSカスタムプロパティを使用してフィールドの幅と高さをCSSに渡す
  const style = {
    '--field-width': FIELD_WIDTH,
    '--field-height': FIELD_HEIGHT,
  } as React.CSSProperties;

  return (
    <div className="field" style={style}>
      {/* フィールドの各行と列をマッピングしてPuyoコンポーネントを描画 */}
      {field.map((row, y) =>
        row.map((puyo, x) => <Puyo key={`${y}-${x}`} color={puyo.color} />)
      )}
    </div>
  );
};

export default Field;
