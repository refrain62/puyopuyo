import React from 'react';
import { FieldState, FIELD_WIDTH, FIELD_HEIGHT } from '../types';
import Puyo from './Puyo';
import './Field.css';

interface FieldProps {
  field: FieldState;
}

const Field: React.FC<FieldProps> = ({ field }) => {
  const style = {
    '--field-width': FIELD_WIDTH,
    '--field-height': FIELD_HEIGHT,
  } as React.CSSProperties;

  return (
    <div className="field" style={style}>
      {field.map((row, y) =>
        row.map((puyo, x) => <Puyo key={`${y}-${x}`} color={puyo.color} />)
      )}
    </div>
  );
};

export default Field;