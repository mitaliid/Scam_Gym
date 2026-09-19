import { useState } from 'react';

import quizData from '../../scenarios/quiz.json';
const QUESTIONS = quizData.questions;

export default function Quiz({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const question = QUESTIONS[index];

  const selectOption = async (optionId) => {
    if (submitting) return;
    const nextAnswers = { ...answers, [question.id]: optionId };
    setAnswers(nextAnswers);
    if (index < QUESTIONS.length - 1) {
      setIndex(index + 1);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onComplete(nextAnswers);
    } catch (e) {
      console.error('quiz submission failed:', e);
      setError('Could not save your answers. Select an option to try again.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 800 }}>
      <h2>What would you do?</h2>
      <p>Your call is scored. Before we show you — five quick questions, 30 seconds.</p>
      <p>{index + 1} of {QUESTIONS.length}</p>
      <h3>{question.prompt}</h3>
      {question.options.map((option) => (
        <button key={option.id} onClick={() => selectOption(option.id)} disabled={submitting}
          style={{ display: 'block', padding: 8, marginBottom: 8 }}>
          {option.text}
        </button>
      ))}
      {submitting && <p role="status">Saving your answers…</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
