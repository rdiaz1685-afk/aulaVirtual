import React, { useState, useEffect } from 'react';
import { UserPreferences, Course, TeacherProfile } from './types';
import { generateCourseSkeleton } from './geminiService';
import CourseForm from './components/CourseForm';
import CourseViewer from './components/CourseViewer';

function App() {
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loginInput, setLoginInput] = useState("");
  
  const [teacher, setTeacher] = useState<TeacherProfile | null>(() => {
    try {
      const session = localStorage.getItem('profesoria_teacher_session');
      return session ? JSON.parse(session) : null;
    } catch { return null; }
  });

  const [savedCourses, setSavedCourses] = useState<Course[]>(() => {
    try {
      const library = localStorage.getItem('profesoria_library');
      return library ? JSON.parse(library) : [];
    } catch { return []; }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    localStorage.setItem('profesoria_library', JSON.stringify(savedCourses));
  }, [savedCourses]);

  const handleLogin = (id: string) => {
    if (!id.trim()) {
      alert("ID requerido.");
      return;
    }
    const profile: TeacherProfile = { id, name: 'Docente', role: 'admin', joinedAt: Date.now() };
    setTeacher(profile);
    localStorage.setItem('profesoria_teacher_session', JSON.stringify(profile));
  };

  const handleGenerate = async (prefs: UserPreferences) => {
    setIsGenerating(true);
    setError(null);
    try {
      const skeleton = await generateCourseSkeleton(prefs);
      setSavedCourses(prev => [skeleton, ...prev]);
      setCurrentCourse(skeleton);
      setShowForm(false);
    } catch (err: any) { 
      setError(err.message);
    } finally { 
      setIsGenerating(false); 
    }
  };

  const handleUpdateCourse = (updated: Course) => {
    setSavedCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
    setCurrentCourse(updated);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans overflow-y-auto">
      
      {error && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center">
            <h2 className="text-xl font-bold text-white mb-4">Error</h2>
            <p className="text-slate-400 text-sm mb-6">{error}</p>
            <button onClick={() => setError(null)} className="px-6 py-2 bg-white text-black rounded-xl font-bold">Cerrar</button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 z-[8888] bg-slate-950 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-cyan-500 font-bold uppercase tracking-widest text-xs">Generando Aula Virtual...</p>
        </div>
      )}

      {!teacher ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
           <div className="bg-slate-900 p-10 rounded-[40px] border border-white/5 max-w-sm w-full shadow-2xl">
              <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center text-2xl font-black mb-6 text-slate-950 mx-auto">P</div>
              <h1 className="text-xl font-black text-center text-white uppercase tracking-tight mb-8">Profesor IA</h1>
              <input 
                className="w-full p-4 rounded-xl bg-black border border-white/10 mb-4 text-white outline-none focus:border-cyan-500" 
                placeholder="ID Mindbox o Docente" 
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
              />
              <button onClick={() => handleLogin(loginInput)} className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase text-xs">Entrar</button>
           </div>
        </div>
      ) : currentCourse ? (
        <CourseViewer course={currentCourse} onExit={() => setCurrentCourse(null)} onUpdateCourse={handleUpdateCourse} />
      ) : (
        <div className="max-w-6xl mx-auto w-full px-6 py-12 flex-1">
          <header className="flex justify-between items-center mb-12">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Mi Biblioteca</h1>
            <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-cyan-500 text-slate-950 rounded-xl font-bold uppercase text-[10px]">Nuevo Curso</button>
          </header>

          {showForm ? (
            <div className="animate-in fade-in duration-300 pb-20">
              <button onClick={() => setShowForm(false)} className="mb-6 text-slate-500 font-bold uppercase text-[10px] hover:text-white transition-colors">← Cancelar</button>
              <CourseForm onSubmit={handleGenerate} isLoading={isGenerating} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {savedCourses.length === 0 && (
                <p className="col-span-full text-center py-20 text-slate-600 font-bold uppercase text-xs tracking-widest">No hay cursos guardados.</p>
              )}
              {savedCourses.map(c => (
                <div key={c.id} onClick={() => setCurrentCourse(c)} className="bg-slate-900/50 p-8 rounded-[32px] border border-white/5 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02] shadow-lg">
                  <h3 className="font-bold text-white text-lg mb-4 line-clamp-2">{c.title}</h3>
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Click para abrir</div>
                    <span className="w-6 h-6 bg-white/5 rounded-full flex items-center justify-center text-xs">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;