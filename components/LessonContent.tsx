
import React, { useState, useEffect } from 'react';
import { Lesson, Grade } from '../types';

interface LessonContentProps {
  lesson: Lesson;
  unitTitle: string;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onGradeUpdate: (grade: Grade) => void;
}

const LessonContent: React.FC<LessonContentProps> = ({ 
  lesson, 
  unitTitle, 
  isCompleted, 
  onToggleComplete,
  onGradeUpdate
}) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showFeedback, setShowFeedback] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAnswers({}); 
    setShowFeedback({}); 
  }, [lesson.id]);

  const handleTestAnswer = (qIdx: number, bIdx: number, oIdx: number, correct: number) => {
    const key = `${bIdx}-${qIdx}`;
    if (showFeedback[key]) return;
    setAnswers(prev => ({ ...prev, [key]: oIdx }));
    setShowFeedback(prev => ({ ...prev, [key]: true }));
    
    // Si es la última pregunta del test, podríamos notificar una nota parcial
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-40 animate-in fade-in duration-700">
      <div className="mb-16">
        <span className="text-[10px] font-black text-cyan-400 bg-cyan-400/10 px-4 py-2 rounded-full uppercase tracking-widest border border-cyan-400/20 mb-6 inline-block">{unitTitle}</span>
        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter uppercase">{lesson.title}</h1>
      </div>

      <div className="space-y-12">
        {lesson.blocks.map((block, bIdx) => {
          const isTest = block.type === 'test';
          const title = (block.title || "").toLowerCase();
          const isActivity = block.type === 'activity' || title.includes('actividad') || title.includes('cuadro');

          return (
            <div key={bIdx} className={`rounded-[40px] overflow-hidden border transition-all duration-500 shadow-2xl ${
              isActivity ? 'border-cyan-500/40 bg-slate-900 shadow-cyan-500/5' : 'border-white/5 bg-slate-900/40'
            }`}>
              <div className={`px-10 py-5 border-b border-white/5 flex items-center justify-between ${isActivity ? 'bg-cyan-500/5' : 'bg-slate-950/50'}`}>
                <div className="flex items-center gap-4">
                  <span className="text-xl">{isActivity ? '🛠️' : isTest ? '⚡' : '📖'}</span>
                  <h3 className={`font-black uppercase tracking-widest text-[11px] ${isActivity ? 'text-cyan-400' : 'text-slate-400'}`}>
                    {block.title}
                  </h3>
                </div>
                {isActivity && (
                  <div className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                    Disponible en Portafolio
                  </div>
                )}
              </div>
              
              <div className="p-10 md:p-14">
                <div className="text-slate-300 leading-relaxed text-lg mb-10 whitespace-pre-line font-medium">
                  {block.content}
                </div>

                {isTest && block.testQuestions && (
                  <div className="space-y-16 mt-10 border-t border-white/5 pt-10">
                    {block.testQuestions.map((q, qIdx) => {
                      const key = `${bIdx}-${qIdx}`;
                      const answeredIdx = answers[key];
                      const isShowingFeedback = showFeedback[key];
                      const isCorrect = answeredIdx === q.correctAnswerIndex;

                      return (
                        <div key={qIdx} className="animate-in slide-in-from-right-4 duration-500">
                          <h4 className="text-xl font-black text-white tracking-tight leading-tight mb-8">{q.question}</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = answeredIdx === oIdx;
                              const isThisCorrect = oIdx === q.correctAnswerIndex;
                              let btnStyle = "bg-white/5 border-white/5 text-slate-400 hover:bg-cyan-500/5 hover:border-cyan-500/50";
                              if (isShowingFeedback) {
                                if (isThisCorrect) btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                                else if (isSelected) btnStyle = "bg-red-500/20 border-red-500 text-red-400";
                                else btnStyle = "bg-slate-900/50 border-white/5 opacity-30";
                              }
                              return (
                                <button key={oIdx} disabled={isShowingFeedback} onClick={() => handleTestAnswer(qIdx, bIdx, oIdx, q.correctAnswerIndex)} className={`text-left p-6 rounded-[24px] border-2 transition-all duration-300 font-bold flex items-center gap-4 text-xs ${btnStyle}`}>
                                  <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[10px] shrink-0">{isSelected ? '●' : ''}</span>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          {isShowingFeedback && (
                            <div className={`mt-6 p-6 rounded-3xl border flex gap-4 animate-in slide-in-from-top-2 duration-300 ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                               <p className="text-slate-300 text-[11px] italic font-medium">"{q.feedback}"</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-32 flex flex-col items-center">
        <button 
          onClick={onToggleComplete}
          className={`px-20 py-8 rounded-[40px] font-black transition-all active:scale-95 text-[11px] tracking-[0.4em] uppercase shadow-2xl ${
            isCompleted ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/40' : 'bg-white text-slate-950 hover:bg-cyan-400 shadow-cyan-400/20'
          }`}
        >
          {isCompleted ? '✓ Lección Finalizada' : 'Marcar como Completada'}
        </button>
      </div>
    </div>
  );
};

export default LessonContent;
