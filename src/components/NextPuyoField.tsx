import React from 'react';
import { PlayerState } from '../types';
import Puyo from './Puyo';
import './NextPuyoField.css';

interface NextPuyoFieldProps {
  puyos: PlayerState[];
}

const NextPuyoField: React.FC<NextPuyoFieldProps> = ({ puyos }) => {
  return (
    <div className="next-puyo-container">
      <h3>Next</h3>
      <div className="next-puyo-field">
        {puyos.map((puyoPair, i) => (
          <div key={i} className="next-puyo-pair">
            <Puyo color={puyoPair.puyo1.color} />
            <Puyo color={puyoPair.puyo2.color} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextPuyoField;
