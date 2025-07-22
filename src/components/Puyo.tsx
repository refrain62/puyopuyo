import React from 'react';
import { PuyoColor } from '../types';

/**
 * ぷよコンポーネントのプロパティ定義
 * color: ぷよの色 (nullの場合は透明)
 */
interface PuyoProps {
  color: PuyoColor | null;
}

/**
 * 単一のぷよを描画するコンポーネントです。
 * 指定された色で正方形のブロックを表示します。
 */
const Puyo: React.FC<PuyoProps> = ({ color }) => {
  // ぷよのスタイルを定義
  const style = {
    backgroundColor: color || 'transparent', // 色が指定されていなければ透明
    width: '30px',
    height: '30px',
    border: '1px solid #ccc', // ぷよの境界線
    boxSizing: 'border-box', // パディングとボーダーを幅と高さに含める
  } as React.CSSProperties; // ReactのCSSプロパティとして型アサーション

  return <div className="puyo" style={style}></div>;
};

export default Puyo;