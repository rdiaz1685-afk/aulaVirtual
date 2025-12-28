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

  // Validación de API Key según estándares de seguridad
  const isApiKeyMissing = !process.env.API_KEY || process.env.API_KEY === '';

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
      setError("Falta la configuración de la API_KEY. Por favor, asegúrate de añadirla en las variables de entorno de Vercel.");
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
      setError("Error de IA: " + (err.message || "No se pudo conectar con el motor de diseño instruccional."));
    } finally { 
      setIsGenerating(false); 
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content) as Course;
        const newCourse = { ...imported, id: `imported_${Date.now()}` };
        setSavedCourses(prev => [newCourse, ...prev]);
        setCurrentCourse(newCourse);
        e.target.value = "";
      } catch (err) {
        alert("Error: El archivo JSON no es un respaldo válido.");
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateCourse = (updated: Course) => {
    setCurrentCourse(updated);
    setSavedCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-['Inter']">
      
      {/* Modal de Error/Estado */}
      {error && (
        <div className="fixed inset-0 z-[30000] bg-slate-950/90 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-10 rounded-[40px] text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">⚠️</div>
            <h2 className="text-xl font-black text-white mb-4 uppercase">Estado del Sistema</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">{error}</p>
            <button onClick={() => setError(null)} className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-all">Cerrar</button>
          </div>
        </div>
      )}

      {/* Loader de IA */}
      {isGenerating && (
        <div className="fixed inset-0 z-[20000] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-10 text-center">
          <div className="w-24 h-24 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-8"></div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Diseñando Aula Virtual...</h2>
          <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Ingeniería Instruccional en Proceso</p>
        </div>
      )}

      {!teacher ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
           <div className="glass-card p-12 rounded-[50px] max-w-sm w-full text-center border-white/5">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black mb-8 shadow-xl shadow-cyan-500/20 text-white">P</div>
              <h1 className="text-2xl font-black text-white uppercase mb-2">Profesor IA</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-8">TecNM Nodo Virtual</p>
              <input 
                id="login-id" 
                className="w-full p-5 rounded-2xl bg-slate-950 border border-white/5 mb-4 text-center text-white outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700" 
                placeholder="ID Mindbox / Docente" 
                onKeyDown={(e) => e.key === 'Enter' && handleLogin((e.target as HTMLInputElement).value)}
              />
              <button 
                onClick={() => handleLogin((document.getElementById('login-id') as HTMLInputElement).value)} 
                className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-cyan-500 hover:scale-105 transition-all"
              >
                Acceder al Aula
              </button>
           </div>
        </div>
      ) : currentCourse ? (
        <CourseViewer course={currentCourse} onExit={() => setCurrentCourse(null)} onUpdateCourse={handleUpdateCourse} />
      ) : (
        <div className="max-w-7xl mx-auto w-full px-8 py-20">
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 border-b border-white/5 pb-10 gap-6">
            <div>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-widest mb-1">Docente: {teacher.name}</p>
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter uppercase">Biblioteca</h1>
            </div>
            <div className="flex flex-wrap gap-4">
              {isApiKeyMissing && (
                <div className="bg-amber-500/10 border border-amber-500/30 px-6 py-4 rounded-2xl flex items-center gap-3">
                  <span className="animate-bounce">⚠️</span>
                  <p className="text-[9px] font-black text-amber-500 uppercase leading-tight">API Key no detectada<br/><span className="text-slate-500">Funciones de IA desactivadas</span></p>
                </div>
              )}
              <input type="file" id="import-json" className="hidden" accept=".json" onChange={handleImportJson} />
              <label htmlFor="import-json" className="cursor-pointer px-8 py-5 bg-slate-900 border border-white/10 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                <span>📁</span> Cargar Respaldo
              </label>
              <button 
                onClick={() => setShowForm(true)} 
                className="px-8 py-5 bg-white text-slate-950 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-xl"
              >
                Nuevo Programa
              </button>
            </div>
          </header>

          {showForm ? (
            <div className="animate-in fade-in duration-500">
              <button onClick={() => setShowForm(false)} className="mb-10 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors">
                <span>←</span> Cancelar y Volver
              </button>
              <CourseForm onSubmit={handleGenerate} isLoading={isGenerating} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {savedCourses.length === 0 && (
                <div className="col-span-full text-center py-32 bg-slate-900/40 rounded-[60px] border border-dashed border-white/5">
                  <div className="text-4xl mb-4 opacity-20">📚</div>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">No hay cursos registrados</p>
                  <p className="text-slate-600 text-xs mt-2">Usa el botón "Nuevo Programa" para comenzar con la IA.</p>
                </div>
              )}
              {savedCourses.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => setCurrentCourse(c)} 
                  className="glass-card p-10 rounded-[40px] border border-white/5 hover:border-cyan-500/50 cursor-pointer transition-all group hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyan-500/5"
                >
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[9px] font-black text-cyan-500 bg-cyan-500/10 px-3 py-1 rounded-full uppercase">{c.subjectCode || 'TEC-X'}</span>
                    <span className="text-[9px] font-bold text-slate-600 uppercase">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-black text-white text-2xl mb-4 line-clamp-2 group-hover:text-cyan-400 transition-colors leading-tight">{c.title}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                      <span>Diseño Instruccional</span>
                      <span className="text-cyan-400">{Math.round((c.units.filter(u => u.lessons.length > 0).length / c.units.length) * 100)}%</span>
                    </div>
                    <div className="flex gap-1.5 h-1.5">
                      {c.units.map((u, i) => (
                        <div 
                          key={i} 
                          className={`flex-1 rounded-full transition-all duration-700 ${u.lessons.length > 0 ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'bg-slate-800'}`}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <footer className="mt-auto py-10 border-t border-white/5 text-center">
        <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.5em]">ProfesorIA © 2025 - Nodo Educativo TecNM</p>
      </footer>
    </div>
  );
}

export default App;