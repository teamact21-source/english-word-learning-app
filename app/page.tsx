'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';

type Phase = 'learn' | 'answer' | 'result';
const words = [
  { english: 'Dog', japanese: '犬' }, { english: 'Cat', japanese: '猫' },
  { english: 'Apple', japanese: 'りんご' }, { english: 'Book', japanese: '本' },
  { english: 'Flower', japanese: '花' }, { english: 'Morning', japanese: '朝' },
  { english: 'Window', japanese: '窓' }, { english: 'Beautiful', japanese: '美しい' },
  { english: 'Friend', japanese: '友達' }, { english: 'Tomorrow', japanese: '明日' },
  { english: 'Kitchen', japanese: '台所' }, { english: 'Mountain', japanese: '山' },
];

function diffAnswer(answer: string, correct: string) {
  const a = [...answer], b = [...correct];
  const costs = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) costs[i][0] = i;
  for (let j = 0; j <= b.length; j++) costs[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const same = a[i - 1].toLowerCase() === b[j - 1].toLowerCase();
    costs[i][j] = Math.min(costs[i - 1][j] + 1, costs[i][j - 1] + 1, costs[i - 1][j - 1] + (same ? 0 : 1));
  }
  const states = Array(a.length).fill('wrong'); let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1].toLowerCase() === b[j - 1].toLowerCase() && costs[i][j] === costs[i - 1][j - 1]) { states[i - 1] = 'right'; i--; j--; }
    else if (i > 0 && j > 0 && costs[i][j] === costs[i - 1][j - 1] + 1) { i--; j--; }
    else if (i > 0 && costs[i][j] === costs[i - 1][j] + 1) i--;
    else j--;
  }
  return states;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>('learn');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const word = words[index];
  const isCorrect = answer.trim().toLowerCase() === word.english.toLowerCase();
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js'); }, []);
  useEffect(() => { if (phase === 'answer') window.setTimeout(() => inputRef.current?.focus(), 120); }, [phase]);
  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: 'start_word_practice',
      title: '英単語の練習を始める',
      description: '指定した番号の英単語から、見る・書く練習を開始します。',
      inputSchema: { type: 'object', properties: { wordNumber: { type: 'integer', minimum: 1, maximum: words.length } }, required: ['wordNumber'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { wordNumber?: unknown };
        if (!Number.isInteger(value.wordNumber) || Number(value.wordNumber) < 1 || Number(value.wordNumber) > words.length) throw new Error(`wordNumber must be between 1 and ${words.length}`);
        const nextIndex = Number(value.wordNumber) - 1;
        setIndex(nextIndex); setAnswer(''); setPhase('learn');
        return { wordNumber: nextIndex + 1, phase: 'learn', english: words[nextIndex].english };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  const nextWord = () => { setIndex((current) => (current + 1) % words.length); setAnswer(''); setPhase('learn'); };
  return <main className="app-shell">
    <div className="orb orb-one" aria-hidden="true"/><div className="orb orb-two" aria-hidden="true"/>
    <section className="study-wrap" aria-live="polite">
      <header className="topbar"><a className="brand" href="/" aria-label="最初から学習する"><span className="brand-mark">W</span><span>Write &amp; Remember</span></a><span className="progress-label">{index + 1} / {words.length}</span></header>
      <div className="progress-track" aria-label={`${words.length}問中${index + 1}問目`}><span style={{ width: `${((index + 1) / words.length) * 100}%` }}/></div>
      <div className={`study-card phase-${phase}`}><div className="card-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
        {phase === 'learn' && <div className="panel" key={`learn-${index}`}><div className="eyebrow"><Sparkles size={16}/> INPUT</div><h1>単語をおぼえよう💡</h1><p className="main-word">{word.english}</p><p className="hint">声に出して、つづりを目で追ってみましょう。</p><button className="primary-button" onClick={() => setPhase('answer')}>次へ <ArrowRight size={21}/></button></div>}
        {phase === 'answer' && <form className="panel" key={`answer-${index}`} onSubmit={(event) => { event.preventDefault(); if (answer.trim()) setPhase('result'); }}><div className="eyebrow pencil">✎ OUTPUT</div><h1>単語を書こう✏️</h1><p className="question-word">{word.japanese}</p><label className="answer-label" htmlFor="answer">英単語を入力</label><input ref={inputRef} id="answer" className="answer-input" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="ここに書いてね" autoComplete="off" autoCapitalize="none" spellCheck={false}/><button className="primary-button" type="submit" disabled={!answer.trim()}>answer <Check size={21}/></button></form>}
        {phase === 'result' && <div className="panel result-panel" key={`result-${index}`}><div className={`result-icon ${isCorrect ? 'correct' : 'incorrect'}`}>{isCorrect ? <Check size={34} strokeWidth={3}/> : '×'}</div><h1 className={isCorrect ? 'success-text' : 'error-text'}>{isCorrect ? '正解！' : 'おしい！'}</h1>{isCorrect ? <><p className="main-word result-word">{word.english}</p><p className="hint">ばっちりです。その調子！</p></> : <div className="correction"><div><span className="correction-label">あなたの答え</span><p className="typed-answer">{diffAnswer(answer, word.english).map((state, charIndex) => <span className={state === 'wrong' ? 'wrong-char' : undefined} key={`${charIndex}-${answer[charIndex]}`}>{answer[charIndex]}</span>)}</p></div><div className="answer-rule"/><div><span className="correction-label">正解</span><p className="correct-answer">{word.english}</p></div></div>}<button className="primary-button" onClick={nextWord}>次の単語へ <ArrowRight size={21}/></button></div>}
      </div>
      <button className="restart" onClick={() => { setIndex(0); setAnswer(''); setPhase('learn'); }}><RotateCcw size={15}/> 最初から</button>
    </section>
  </main>;
}
