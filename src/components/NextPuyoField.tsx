import React from 'react';
import { PlayerState } from '../types';
import Puyo from './Puyo';
import './NextPuyoField.css';

/**
 * 次に落ちてくるぷよ（ネクストぷよ）を表示するコンポーネントのプロパティ定義
 * puyos: 表示するネクストぷよのペアの配列
 */
interface NextPuyoFieldProps {
  puyos: PlayerState[];
}

/**
 * ネクストぷよを表示するコンポーネントです。
 * 複数のネクストぷよペアを縦に並べて表示します。
 */
const NextPuyoField: React.FC<NextPuyoFieldProps> = ({ puyos }) => {
  return (
    <div className="next-puyo-container">
      <h3>Next</h3>
      <div className="next-puyo-field">
        {puyos.map((puyoPair, i) => (
          <div key={i} className="next-puyo-pair">
            {/* 軸ぷよ */}
            <Puyo color={puyoPair.puyo1.color} />
            {/* 子ぷよ */}
            <Puyo color={puyoPair.puyo2.color} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextPuyoField;