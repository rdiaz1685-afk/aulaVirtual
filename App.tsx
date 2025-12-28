import React, { useState, useEffect } from 'react';
import { UserPreferences, Course, TeacherProfile } from './types';
import { generateCourseSkeleton } from './geminiService';
import CourseForm from './components/CourseForm';
import CourseViewer from './components/CourseViewer';

function App() {
  const [error, setError] = useState<string | null>(null);
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

  // Validación de API Key
  const isApiKeyMissing = !process.env.API_KEY || process.env.API_KEY.length < 5;

  const handleLogin = (id: string) => {
    if (!id.trim()) {
      alert("Por favor ingresa tu ID de Mindbox o Docente.");
      return;
    }
    const profile: TeacherProfile = { id, name: 'Docente TecNM', role: 'admin', joinedAt: Date.now() };
    setTeacher(profile);
    localStorage.setItem('profesoria_teacher_session', JSON.stringify(profile));
  };

  const handleGenerate = async (prefs: UserPreferences) => {
    if (isApiKeyMissing) {
      setError("Falta la API_KEY en Vercel. Ve a Settings > Environment Variables y añade API_KEY.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const skeleton = await generateCourseSkeleton(prefs);
      setSavedCourses(prev => [skeleton, ...prev]);
      setCurrentCourse(skeleton);
      setShowForm(false);
    } catch (err: any) { 
      setError("Error de Sínodo IA: " + (err.message || "Fallo de conexión."));
    } finally { 
      setIsGenerating(false); 
    }
  };

  // Missing function added to update course state and library
  const handleUpdateCourse = (updated: Course) => {
    setSavedCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
    setCurrentCourse(updated);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content) as Course;
        setSavedCourses(prev => [{ ...imported, id: `imp_${Date.now()}` }, ...prev]);
        e.target.value = "";
      } catch { alert("JSON inválido."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-['Inter']">
      
      {/* Diagnóstico de API KEY */}
      {isApiKeyMissing && teacher && (
        <div className="bg-red-500/10 border-b border-red-500/20 p-2 text-center">
          <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.3em]">
            ⚠️ SISTEMA SIN MOTOR IA: FALTA API_KEY EN VERCEL
          </p>
        </div>
      )}

      {error && (
        <div className="fixed inset-0 z-[50000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 p-8 rounded-[32px] max-w-sm w-full text-center">
            <h2 className="text-white font-black uppercase mb-4">Error Crítico</h2>
            <p className="text-slate-400 text-xs mb-6">{error}</p>
            <button onClick={() => setError(null)} className="w-full py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase">Cerrar</button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 z-[40000] bg-slate-950 flex flex-col items-center justify-center text-center p-10">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-6"></div>
          <h2 className="text-white font-black uppercase tracking-widest">Generando Aula...</h2>
        </div>
      )}

      {!teacher ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
           <div className="glass-card p-12 rounded-[50px] max-w-sm w-full text-center border-white/5">
              <div className="w-16 h-16 bg-cyan-500 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black mb-6 text-white shadow-xl shadow-cyan-500/20">P</div>
              <h1 className="text-xl font-black text-white uppercase mb-6">Profesor IA</h1>
              <input id="login-id" className="w-full p-4 rounded-xl bg-black border border-white/10 mb-4 text-center text-white outline-none focus:border-cyan-500" placeholder="ID Docente" onKeyDown={e => e.key === 'Enter' && handleLogin((e.target as any).value)} />
              <button onClick={() => handleLogin((document.getElementById('login-id') as any).value)} className="w-full py-4 bg-white text-black rounded-xl font-black uppercase text-[10px]">Acceder</button>
           </div>
        </div>
      ) : currentCourse ? (
        <CourseViewer course={currentCourse} onExit={() => setCurrentCourse(null)} onUpdateCourse={handleUpdateCourse} />
      ) : (
        <div className="max-w-6xl mx-auto w-full px-6 py-12">
          <header className="flex justify-between items-end mb-12 border-b border-white/5 pb-8">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Biblioteca</h1>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-cyan-500 text-black rounded-xl font-black uppercase text-[10px]">Nuevo Programa</button>
            </div>
          </header>

          {showForm ? (
            <CourseForm onSubmit={handleGenerate} isLoading={isGenerating} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCourses.map(c => (
                <div key={c.id} onClick={() => setCurrentCourse(c)} className="glass-card p-8 rounded-[32px] border border-white/5 hover:border-cyan-500/30 cursor-pointer transition-all">
                  <span className="text-[9px] font-black text-cyan-500 uppercase mb-2 block">{c.subjectCode}</span>
                  <h3 className="font-black text-white text-lg mb-4 leading-tight">{c.title}</h3>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{width: '20%'}}></div>
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