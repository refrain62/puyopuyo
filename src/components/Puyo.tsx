import React from 'react';
import { PuyoColor } from '../types';

interface PuyoProps {
  color: PuyoColor | null;
}

const Puyo: React.FC<PuyoProps> = ({ color }) => {
  const style = {
    backgroundColor: color || 'transparent',
    width: '30px',
    height: '30px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  } as React.CSSProperties;

  return <div className="puyo" style={style}></div>;
};

export default Puyo;
