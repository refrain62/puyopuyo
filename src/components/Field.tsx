import React from 'react';
import { FieldState } from '../types';
import Puyo from './Puyo';

interface FieldProps {
  field: FieldState;
}

const Field: React.FC<FieldProps> = ({ field }) => {
  return (
    <div className="field">
      {field.map((row, y) =>
        row.map((puyo, x) => <Puyo key={`${y}-${x}`} color={puyo.color} />)
      )}
    </div>
  );
};

export default Field;
