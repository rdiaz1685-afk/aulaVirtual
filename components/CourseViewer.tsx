
import React, { useState, useMemo } from 'react';
import { Course, Grade, LessonBlock } from '../types';
import { generateUnitContent } from '../geminiService';
import LessonContent from './LessonContent';
import UnitPortfolio from './UnitPortfolio';

interface CourseViewerProps {
  course: Course;
  onExit: () => void;
  onUpdateCourse: (updated: Course) => void;
}

const CourseViewer: React.FC<CourseViewerProps> = ({ course, onExit, onUpdateCourse }) => {
  const [activeUnitIdx, setActiveUnitIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'study' | 'portfolio'>('study');
  const [isBuildingUnit, setIsBuildingUnit] = useState(false);
  const [buildStatus, setBuildStatus] = useState("");
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  const units = course.units || [];
  const currentUnit = units[activeUnitIdx] || units[0];
  const lessons = currentUnit?.lessons || [];
  const currentLesson = lessons[activeLessonIdx];

  const unitActivities = useMemo(() => {
    const activities: {lessonTitle: string, block: LessonBlock, blockIdx: number}[] = [];
    if (!currentUnit?.lessons) return [];
    
    currentUnit.lessons.forEach((lesson) => {
      lesson.blocks.forEach((block, bIdx) => {
        const type = (block.type || '').toLowerCase();
        const title = (block.title || "").toLowerCase();
        if (type === 'activity' || title.includes('actividad') || title.includes('cuadro')) {
          activities.push({ lessonTitle: lesson.title, block, blockIdx: bIdx });
        }
      });
    });
    return activities;
  }, [currentUnit]);

  const handleBuildUnit = async (idx: number) => {
    const unitToBuild = units[idx];
    if (!unitToBuild || isBuildingUnit) return;
    
    setIsBuildingUnit(true);
    setBuildStatus(`Diseñando Estructura: ${unitToBuild.title}...`);
    
    try {
      const generatedLessons = await generateUnitContent(unitToBuild, "Ingeniería Superior");
      const updatedUnits = [...units];
      updatedUnits[idx] = { ...unitToBuild, lessons: generatedLessons };
      onUpdateCourse({ ...course, units: updatedUnits });
      setActiveLessonIdx(0);
      setViewMode('study');
    } catch (e: any) {
      alert(`Error de Conexión: ${e.message}`);
    } finally {
      setIsBuildingUnit(false);
    }
  };

  const handleExportHTML = () => {
    const courseData = JSON.stringify(course);
    
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aula Virtual Alumno - ${course.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { background-color: #020617; color: white; font-family: 'Inter', sans-serif; overflow-x: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .fade-entry { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .timer-blink { animation: blink 1s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    </style>
</head>
<body class="h-screen overflow-hidden">
    <div id="player-root" class="h-full w-full"></div>

    <script type="module">
        import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@18.2.0';
        import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';

        const COURSE_DATA = ${courseData};

        function StudentApp() {
            const [uIdx, setUIdx] = useState(0);
            const [lIdx, setLIdx] = useState(0);
            const [completed, setCompleted] = useState(new Set());
            const [responses, setResponses] = useState({});
            
            // Estado para Tests (Quizzes)
            const [testScores, setTestScores] = useState({}); 
            
            const [showDefense, setShowDefense] = useState(false);
            const [defenseData, setDefenseData] = useState({ lessonTitle: '', blockTitle: '', text: '' });
            const [reflection, setReflection] = useState('');
            const [timeLeft, setTimeLeft] = useState(180);
            const [controlNum, setControlNum] = useState('');
            const [studentName, setStudentName] = useState('');

            const unit = COURSE_DATA.units[uIdx];
            const lesson = unit?.lessons[lIdx];

            // 1. Calcular total de actividades en la unidad actual
            const unitActivityStats = useMemo(() => {
                if (!unit) return { count: 0, pointsPerActivity: 0 };
                let count = 0;
                unit.lessons.forEach(l => {
                    l.blocks.forEach(b => {
                        const type = (b.type || '').toLowerCase();
                        const title = (b.title || '').toLowerCase();
                        if (type === 'activity' || title.includes('actividad') || title.includes('cuadro')) {
                            count++;
                        }
                    });
                });
                // Dividir 90 puntos entre el número de actividades
                const pointsPerActivity = count > 0 ? (90 / count).toFixed(1) : 0;
                return { count, pointsPerActivity };
            }, [unit]);


            // Cálculo de Calificación en Tiempo Real
            const currentGrade = useMemo(() => {
                if (!unit) return 0;
                let totalTests = 0;
                let totalTestScore = 0;
                
                unit.lessons.forEach(l => {
                    l.blocks.forEach((b, bIdx) => {
                        if (b.type === 'test') {
                            totalTests++;
                            const key = l.id + '-' + bIdx;
                            if (testScores[key] !== undefined) {
                                totalTestScore += testScores[key];
                            }
                        }
                    });
                });

                const avgTest = totalTests > 0 ? (totalTestScore / totalTests) : 100;
                const pointsFromTests = (avgTest / 100) * 10;
                
                return pointsFromTests.toFixed(1);
            }, [unit, testScores]);

            useEffect(() => {
                let timer;
                if (showDefense && timeLeft > 0) {
                    timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
                } else if (timeLeft === 0) {
                    alert("¡Tiempo agotado! Debes ser más rápido para asegurar la autenticidad. Inténtalo de nuevo.");
                    setShowDefense(false);
                    setTimeLeft(180);
                }
                return () => clearInterval(timer);
            }, [showDefense, timeLeft]);

            const startDefense = (lessonTitle, blockTitle, text) => {
                const c = prompt("Número de Control:");
                if (!c) return;
                const n = prompt("Nombre Completo:");
                if (!n) return;
                setControlNum(c);
                setStudentName(n);
                setDefenseData({ lessonTitle, blockTitle, text });
                setShowDefense(true);
                setTimeLeft(180);
            };

            const finalizeTask = () => {
                if (reflection.length < 50) {
                    alert("Tu reflexión es muy corta. Explica mejor tu proceso para validar tu aprendizaje.");
                    return;
                }

                const data = { 
                    studentName, 
                    studentControlNumber: controlNum,
                    lessonTitle: defenseData.lessonTitle, 
                    activityTitle: defenseData.blockTitle, 
                    content: defenseData.text,
                    reflection: reflection,
                    timestamp: Date.now(),
                    aiScore: 0,
                    authenticityScore: 0 
                };

                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'Entrega_' + controlNum + '.json';
                a.click();
                setShowDefense(false);
                setReflection('');
                alert("¡Entrega validada y descargada!");
            };

            const updateBlockScore = (lessonId, blockIdx, score) => {
                setTestScores(prev => ({
                    ...prev,
                    [lessonId + '-' + blockIdx]: score
                }));
            };

            return React.createElement('div', { className: 'flex h-screen bg-[#020617]' }, [
                
                // Modal Defensa
                showDefense && React.createElement('div', { className: 'fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6' }, [
                    React.createElement('div', { className: 'bg-slate-900 border border-white/10 p-12 rounded-[50px] max-w-2xl w-full shadow-2xl animate-in zoom-in-95' }, [
                         React.createElement('div', { className: 'flex justify-between items-center mb-8' }, [
                            React.createElement('h2', { className: 'text-2xl font-black text-white uppercase' }, 'Validación'),
                            React.createElement('p', { className: 'text-3xl font-black text-white' }, Math.floor(timeLeft / 60) + ':' + (timeLeft % 60).toString().padStart(2, '0'))
                        ]),
                        React.createElement('textarea', { 
                            value: reflection,
                            onChange: (e) => setReflection(e.target.value),
                            placeholder: 'Defensa...',
                            className: 'w-full h-48 bg-black/40 border border-white/10 rounded-3xl p-8 text-white mb-6'
                        }),
                        React.createElement('button', { onClick: finalizeTask, className: 'w-full py-5 bg-cyan-500 text-slate-950 rounded-2xl font-black uppercase' }, 'Enviar')
                    ])
                ]),

                // Sidebar
                React.createElement('aside', { className: 'w-80 bg-slate-950 border-r border-white/5 flex flex-col shrink-0' }, [
                    React.createElement('div', { className: 'p-8 border-b border-white/5 bg-slate-900/40' }, [
                        React.createElement('p', { className: 'text-[9px] font-black text-cyan-500 uppercase tracking-widest' }, 'Plataforma Alumno'),
                        React.createElement('h1', { className: 'text-md font-black uppercase tracking-tighter mt-2' }, COURSE_DATA.title)
                    ]),
                    
                    // WIDGET DE CALIFICACIÓN
                    React.createElement('div', { className: 'mx-6 mt-6 p-6 bg-slate-900 rounded-3xl border border-white/5' }, [
                         React.createElement('p', { className: 'text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2' }, 'Tu Desempeño (Unidad Actual)'),
                         React.createElement('div', { className: 'flex items-end gap-2' }, [
                            React.createElement('span', { className: 'text-4xl font-black text-white' }, currentGrade),
                            React.createElement('span', { className: 'text-xs font-bold text-slate-500 mb-2' }, '/ 10 pts (Tests)')
                         ]),
                         React.createElement('div', { className: 'w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden' }, 
                            React.createElement('div', { className: 'h-full bg-amber-500 transition-all duration-500', style: { width: (currentGrade * 10) + '%' } })
                         ),
                         React.createElement('p', { className: 'text-[8px] text-amber-500 mt-2 font-bold' }, '* Las Prácticas suman los otros 90 pts.')
                    ]),

                    React.createElement('div', { className: 'flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar' }, 
                        COURSE_DATA.units.map((u, ui) => React.createElement('div', { key: ui }, [
                            React.createElement('button', { 
                                onClick: () => { setUIdx(ui); setLIdx(0); },
                                className: 'w-full text-left p-4 rounded-2xl transition-all ' + (uIdx === ui ? 'bg-white/5 border border-white/10' : 'opacity-40 hover:opacity-100')
                            }, React.createElement('p', { className: 'text-xs font-bold text-white' }, u.title)),
                            uIdx === ui && u.lessons.map((l, li) => React.createElement('button', {
                                key: li,
                                onClick: () => setLIdx(li),
                                className: 'w-full text-left p-3 ml-4 mt-1 rounded-xl text-[10px] font-black uppercase transition-all ' + (lIdx === li ? 'bg-cyan-500 text-slate-950' : 'text-slate-500 hover:text-white')
                            }, l.title))
                        ]))
                    )
                ]),

                // Main Content
                React.createElement('main', { className: 'flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-24' }, [
                    lesson ? React.createElement('div', { key: lesson.id, className: 'max-w-4xl mx-auto fade-entry' }, [
                        React.createElement('h2', { className: 'text-5xl font-black mb-16 uppercase tracking-tighter' }, lesson.title),
                        lesson.blocks.map((block, bi) => {
                            const titleLower = (block.title || '').toLowerCase();
                            const isActivity = block.type === 'activity' || titleLower.includes('actividad') || titleLower.includes('cuadro');
                            const isTest = block.type === 'test';

                            // Texto del Badge
                            let badgeText = '';
                            if (isTest) badgeText = 'Valor: 10% (Global Quiz)';
                            else if (isActivity) badgeText = 'Valor: ' + unitActivityStats.pointsPerActivity + ' Pts';

                            return React.createElement('div', { key: bi, className: 'rounded-[40px] border border-white/5 bg-slate-900/20 mb-12 overflow-hidden relative' }, [
                                // Badge
                                (isActivity || isTest) && React.createElement('div', { className: 'absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-black text-[9px] uppercase tracking-widest border-l border-b ' + (isTest ? 'bg-amber-500 text-slate-950 border-amber-600' : 'bg-cyan-500 text-slate-950 border-cyan-600') }, 
                                    badgeText
                                ),

                                React.createElement('div', { className: 'px-10 py-5 bg-slate-950/50 border-b border-white/5 font-black uppercase text-[10px] text-slate-500 tracking-widest' }, block.title),
                                React.createElement('div', { className: 'p-10 md:p-14' }, [
                                    React.createElement('p', { className: 'text-lg text-slate-300 leading-relaxed mb-8' }, block.content),
                                    
                                    // Renderizador de TEST
                                    isTest && block.testQuestions && React.createElement(TestComponent, { 
                                        questions: block.testQuestions,
                                        onScore: (score) => updateBlockScore(lesson.id, bi, score)
                                    }),

                                    // Renderizador de ACTIVIDAD
                                    isActivity && React.createElement('div', { className: 'mt-8 space-y-4' }, [
                                        React.createElement('textarea', { 
                                            placeholder: 'Tu respuesta...',
                                            className: 'w-full h-40 bg-black/40 border border-white/5 rounded-3xl p-8 text-white outline-none focus:border-cyan-500',
                                            onChange: (e) => setResponses({...responses, [lesson.id + '-' + bi]: e.target.value})
                                        }),
                                        React.createElement('button', {
                                            onClick: () => startDefense(lesson.title, block.title, responses[lesson.id + '-' + bi]),
                                            className: 'px-8 py-4 bg-cyan-500 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all'
                                        }, 'Entregar Actividad (Requiere Validación)')
                                    ])
                                ])
                            ]);
                        })
                    ]) : React.createElement('div', { className: 'text-center py-40 opacity-20' }, 'Selecciona una lección.')
                ])
            ]);
        }

        // Componente interno para Tests
        function TestComponent({ questions, onScore }) {
            const [answers, setAnswers] = useState({});
            const [feedback, setFeedback] = useState({});

            const handleAnswer = (qIdx, oIdx) => {
                if (feedback[qIdx]) return;
                const isCorrect = oIdx === questions[qIdx].correctAnswerIndex;
                
                const newAnswers = { ...answers, [qIdx]: oIdx };
                setAnswers(newAnswers);
                setFeedback({ ...feedback, [qIdx]: true });

                let correctCount = 0;
                questions.forEach((q, i) => {
                    if (i === qIdx) {
                        if (isCorrect) correctCount++;
                    } else if (answers[i] !== undefined) {
                        if (answers[i] === questions[i].correctAnswerIndex) correctCount++;
                    }
                });
                
                const blockScore = (correctCount / questions.length) * 100;
                onScore(blockScore);
            };

            return React.createElement('div', { className: 'space-y-12 mt-8' }, 
                questions.map((q, qIdx) => {
                    const answeredIdx = answers[qIdx];
                    const show = feedback[qIdx];
                    const isCorrect = answeredIdx === q.correctAnswerIndex;

                    return React.createElement('div', { key: qIdx, className: 'space-y-4' }, [
                        React.createElement('h4', { className: 'text-xl font-bold text-white' }, q.question),
                        React.createElement('div', { className: 'grid gap-3' }, 
                            q.options.map((opt, oIdx) => {
                                let style = 'p-4 rounded-xl border border-white/10 text-left hover:bg-white/5 text-sm';
                                if (show) {
                                    if (oIdx === q.correctAnswerIndex) style = 'p-4 rounded-xl border border-emerald-500 bg-emerald-500/10 text-emerald-400 text-sm';
                                    else if (answeredIdx === oIdx) style = 'p-4 rounded-xl border border-red-500 bg-red-500/10 text-red-400 text-sm';
                                    else style = 'p-4 rounded-xl border border-white/5 opacity-30 text-sm';
                                }
                                return React.createElement('button', {
                                    key: oIdx,
                                    disabled: show,
                                    onClick: () => handleAnswer(qIdx, oIdx),
                                    className: style
                                }, opt);
                            })
                        ),
                        show && React.createElement('div', { className: 'text-xs text-slate-400 italic' }, isCorrect ? '¡Correcto!' : 'Retroalimentación: ' + q.feedback)
                    ]);
                })
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('player-root'));
        root.render(React.createElement(StudentApp));
    <\/script>
</body>
</html>
    `;

    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `Aula_${course.title.replace(/\s+/g, '_')}.html`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      <aside className="w-80 bg-slate-950 border-r border-white/5 flex flex-col h-full z-30 shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-slate-900/40">
          <button onClick={onExit} className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-4 hover:text-white transition-colors">← Volver a Biblioteca</button>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight line-clamp-2">{course.title}</h2>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {lessons.length > 0 && (
            <button 
              onClick={() => setViewMode('portfolio')}
              className={`w-full p-5 rounded-[25px] border-2 flex items-center gap-4 transition-all ${
                viewMode === 'portfolio' ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10' : 'border-white/5 bg-slate-900'
              }`}
            >
              <span className="text-2xl">📥</span>
              <div className="text-left">
                <p className="text-[9px] font-black uppercase text-cyan-500 mb-1">Evidencias</p>
                <p className="text-xs font-black text-white uppercase">Revisión de Alumnos</p>
              </div>
            </button>
          )}

          <div className="space-y-4 pt-4">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Unidades</p>
            {units.map((unit, uIdx) => (
              <div key={uIdx} className="space-y-1">
                <button 
                  onClick={() => { setActiveUnitIdx(uIdx); setViewMode('study'); }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    activeUnitIdx === uIdx && viewMode === 'study' ? 'bg-white/5 border-white/20' : 'border-transparent opacity-40 hover:opacity-100'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-200">{unit.title}</p>
                </button>
                
                {activeUnitIdx === uIdx && viewMode === 'study' && unit.lessons.length > 0 && (
                  <div className="ml-4 space-y-1 border-l border-white/10 pl-4 py-1">
                    {unit.lessons.map((l, lIdx) => (
                      <button 
                        key={lIdx} 
                        onClick={() => setActiveLessonIdx(lIdx)} 
                        className={`w-full text-left p-3 rounded-xl text-[10px] font-black uppercase transition-all flex justify-between items-center ${
                          activeLessonIdx === lIdx ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{l.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="p-6 bg-slate-950 border-t border-white/10 space-y-2">
          <button 
            onClick={() => handleBuildUnit(activeUnitIdx)} 
            disabled={isBuildingUnit} 
            className="w-full py-5 bg-cyan-500 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 disabled:opacity-50"
          >
            {isBuildingUnit ? '🔨 SINCRONIZANDO...' : '🔨 CONSTRUIR UNIDAD'}
          </button>
          <button onClick={handleExportHTML} className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-200 transition-all shadow-xl">EXPORTAR AULA (HTML)</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-950 custom-scrollbar">
        <div className="p-10 lg:p-20">
          {isBuildingUnit ? (
            <div className="max-w-xl mx-auto py-40 text-center animate-pulse">
               <div className="spinner mb-10"></div>
               <h2 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Conectando con Nodo IA</h2>
               <p className="text-cyan-500 uppercase text-[10px] font-black tracking-[0.3em]">{buildStatus}</p>
            </div>
          ) : viewMode === 'portfolio' ? (
            <UnitPortfolio 
              unitTitle={currentUnit.title} 
              activities={unitActivities} 
              onGradeUpdate={(g) => onUpdateCourse(course)}
              grades={[]}
            />
          ) : currentLesson ? (
            <LessonContent 
              lesson={currentLesson}
              unitTitle={currentUnit.title}
              totalActivitiesInUnit={unitActivities.length}
              isCompleted={completedLessons.has(currentLesson.id)}
              onToggleComplete={() => {
                const newC = new Set(completedLessons);
                newC.has(currentLesson.id) ? newC.delete(currentLesson.id) : newC.add(currentLesson.id);
                setCompletedLessons(newC);
              }}
              onGradeUpdate={(g) => {}}
            />
          ) : (
            <div className="max-w-xl mx-auto py-40 text-center bg-slate-900/20 rounded-[50px] border border-white/5">
               <div className="text-5xl mb-10">🏗️</div>
               <h2 className="text-2xl font-black text-white uppercase mb-4">Unidad Vacía</h2>
               <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Utiliza el botón para generar el contenido académico.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CourseViewer;
