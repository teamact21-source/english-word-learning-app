'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, GraduationCap, RotateCcw, Sparkles } from 'lucide-react';
import wordData from '@/data/words.json';

type Phase = 'learn' | 'answer' | 'result';
type Course = 'review' | 'exam';
type Word = { english: string; japanese: string; course: Course; level: string; pos: string };

const allWords = wordData as Word[];
const courses: { id: Course; name: string; shortName: string; description: string }[] = [
  { id: 'review', name: '中学総復習', shortName: '総復習', description: '基礎からしっかり 1,800語' },
  { id: 'exam', name: '高校入試頻出', shortName: '入試頻出', description: '差がつく重要語 500語' },
];
const posNames: Record<string, string> = { noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞', preposition: '前置詞', conjunction: '接続詞', pronoun: '代名詞', determiner: '限定詞', interjection: '間投詞', numeral: '数詞' };

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
  const [course, setCourse] = useState<Course>('review');
  const [phase, setPhase] = useState<Phase>('learn');
  const [index, setIndex] = useState(0);
  const [questionCount, setQuestionCount] = useState(1);
  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const remainingRef = useRef<number[]>([]);
  const words = useMemo(() => allWords.filter((word) => word.course === course), [course]);
  const word = words[index] ?? words[0];
  const isCorrect = answer.trim().toLowerCase() === word.english.toLowerCase();

  const drawRandomWord = (current: number | null = null, list = words) => {
    let choices = remainingRef.current.filter((item) => item !== current && item < list.length);
    if (!choices.length) choices = list.map((_, wordIndex) => wordIndex).filter((item) => item !== current);
    const selected = choices[Math.floor(Math.random() * choices.length)];
    remainingRef.current = choices.filter((item) => item !== selected);
    setIndex(selected);
  };

  useEffect(() => {
    drawRandomWord(null, words);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
  }, []);
  useEffect(() => { if (phase === 'answer') window.setTimeout(() => inputRef.current?.focus(), 120); }, [phase]);
  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: 'start_word_practice', title: '英単語の練習を始める',
      description: '中学総復習または高校入試頻出コースのランダム練習を開始します。',
      inputSchema: { type: 'object', properties: { course: { type: 'string', enum: ['review', 'exam'] } }, required: ['course'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const selected = (input as { course?: unknown }).course;
        if (selected !== 'review' && selected !== 'exam') throw new Error('course must be review or exam');
        setCourse(selected); setQuestionCount(1); setAnswer(''); setPhase('learn'); remainingRef.current = [];
        return { course: selected, phase: 'learn' };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const chooseCourse = (nextCourse: Course) => {
    if (nextCourse === course) return;
    const nextWords = allWords.filter((item) => item.course === nextCourse);
    remainingRef.current = [];
    setCourse(nextCourse); setQuestionCount(1); setAnswer(''); setPhase('learn');
    drawRandomWord(null, nextWords);
  };
  const nextWord = () => { drawRandomWord(index); setQuestionCount((count) => count + 1); setAnswer(''); setPhase('learn'); };
  const restart = () => { remainingRef.current = []; drawRandomWord(index); setQuestionCount(1); setAnswer(''); setPhase('learn'); };
  const activeCourse = courses.find((item) => item.id === course)!;

  return <main className="app-shell">
    <div className="orb orb-one" aria-hidden="true"/><div className="orb orb-two" aria-hidden="true"/>
    <section className="study-wrap" aria-live="polite">
      <header className="topbar"><a className="brand" href="/" aria-label="最初から学習する"><span className="brand-mark">W</span><span>Write &amp; Remember</span></a><span className="progress-label">🎲 RANDOM</span></header>
      <div className="course-picker" aria-label="学習コース">
        {courses.map((item) => <button key={item.id} className={course === item.id ? 'active' : ''} onClick={() => chooseCourse(item.id)}><span>{item.shortName}</span><small>{item.id === 'review' ? '1,800語' : '500語'}</small></button>)}
      </div>
      <div className="progress-track random-progress" aria-label={`${activeCourse.name} ランダム出題モード`}><span/></div>
      <div className={`study-card phase-${phase}`}><div className="card-number" aria-hidden="true">{String(questionCount).padStart(2, '0')}</div>
        {phase === 'learn' && <div className="panel" key={`learn-${course}-${index}`}><div className="eyebrow"><Sparkles size={16}/> {activeCourse.name}</div><h1>単語をおぼえよう💡</h1><p className="main-word">{word.english}</p><p className="word-meta">{word.level} ・ {posNames[word.pos] ?? word.pos}</p><p className="hint">声に出して、つづりを目で追ってみましょう。</p><button className="primary-button" onClick={() => setPhase('answer')}>次へ <ArrowRight size={21}/></button></div>}
        {phase === 'answer' && <form className="panel" key={`answer-${course}-${index}`} onSubmit={(event) => { event.preventDefault(); if (answer.trim()) setPhase('result'); }}><div className="eyebrow pencil"><GraduationCap size={17}/> {activeCourse.name}</div><h1>単語を書こう✏️</h1><p className={`question-word meaning ${word.japanese.length > 20 ? 'long' : ''}`}>{word.japanese}</p><p className="word-meta">{posNames[word.pos] ?? word.pos}</p><label className="answer-label" htmlFor="answer">英単語を入力</label><input ref={inputRef} id="answer" className="answer-input" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="ここに書いてね" autoComplete="off" autoCapitalize="none" spellCheck={false}/><button className="primary-button" type="submit" disabled={!answer.trim()}>answer <Check size={21}/></button></form>}
        {phase === 'result' && <div className="panel result-panel" key={`result-${course}-${index}`}><div className={`result-icon ${isCorrect ? 'correct' : 'incorrect'}`}>{isCorrect ? <Check size={34} strokeWidth={3}/> : '×'}</div><h1 className={isCorrect ? 'success-text' : 'error-text'}>{isCorrect ? '正解！' : 'おしい！'}</h1>{isCorrect ? <><p className="main-word result-word">{word.english}</p><p className="hint">ばっちりです。その調子！</p></> : <div className="correction"><div><span className="correction-label">あなたの答え</span><p className="typed-answer">{diffAnswer(answer, word.english).map((state, charIndex) => <span className={state === 'wrong' ? 'wrong-char' : undefined} key={`${charIndex}-${answer[charIndex]}`}>{answer[charIndex]}</span>)}</p></div><div className="answer-rule"/><div><span className="correction-label">正解</span><p className="correct-answer">{word.english}</p></div></div>}<button className="primary-button" onClick={nextWord}>次の単語へ <ArrowRight size={21}/></button></div>}
      </div>
      <div className="below-card"><button className="restart" onClick={restart}><RotateCcw size={15}/> シャッフルし直す</button><span>CEFR-J 1.6・EJDictを基に構成</span></div>
    </section>
  </main>;
}
