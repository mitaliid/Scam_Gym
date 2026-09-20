import { useState } from 'react';
import Debrief from './Debrief.jsx';

import mixed from '../../eval/real_score_01.json';
import compliant from '../../eval/sample_score.json';
import resistant from '../../eval/sample_score_resistant.json';

const FIXTURES = {
  'mixed (real call)': mixed,
  'all red (complied)': compliant,
  'all green (resisted)': resistant,
};

export default function Preview() {
  const [which, setWhich] = useState('mixed (real call)');

  return (
    <div>
      <div style={{ padding: 12, background: '#111', display: 'flex', gap: 8 }}>
        {Object.keys(FIXTURES).map((name) => (
          <button
            key={name}
            onClick={() => setWhich(name)}
            style={{
              padding: '6px 12px',
              background: which === name ? '#fff' : '#333',
              color: which === name ? '#000' : '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <Debrief
        score={FIXTURES[which]}
        round={1}
        comparison={null}
        onTrainGap={() => alert('train this gap clicked')}
        training={false}
        trainingError={null}
      />
    </div>
  );
}
