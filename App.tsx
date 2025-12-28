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
      setError("Sistema de IA no detectado. Verifique la configuración de API_KEY en el servidor.");
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
      setError("El Sínodo IA ha rechazado la solicitud: " + (err.message || "Fallo en la comunicación instruccional."));
    } finally { 
      setIsGenerating(false); 
    }
  };

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
      } catch { alert("El archivo de respaldo es inválido."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-['Inter']">
      
      {isApiKeyMissing && teacher && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-2 text-center animate-pulse">
          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
            ⚠️ Modo de Desarrollo: La generación de IA está desactivada (Falta API_KEY)
          </p>
        </div>
      )}

      {error && (
        <div className="fixed inset-0 z-[50000] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-red-500/30 p-10 rounded-[40px] max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">⚠️</div>
            <h2 className="text-xl font-black text-white mb-4 uppercase tracking-tighter">Error Académico</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">{error}</p>
            <button onClick={() => setError(null)} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] hover:bg-red-500 hover:text-white transition-all">Cerrar Notificación</button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 z-[40000] bg-slate-950/95 flex flex-col items-center justify-center text-center p-10 backdrop-blur-xl">
          <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(6,182,212,0.2)]"></div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Diseñando Aula Virtual...</h2>
          <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Analizando Competencias del TecNM</p>
        </div>
      )}

      {!teacher ? (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
           <div className="glass-card p-12 rounded-[50px] max-w-sm w-full text-center border-white/5 shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black mb-8 shadow-xl shadow-cyan-500/20 text-white">P</div>
              <h1 className="text-2xl font-black text-white uppercase mb-2 tracking-tighter">Profesor IA</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-8">Portal Docente TecNM</p>
              <input id="login-id" className="w-full p-5 rounded-2xl bg-black border border-white/10 mb-4 text-center text-white outline-none focus:border-cyan-500 transition-all font-bold placeholder:text-slate-700" placeholder="ID Mindbox o Docente" onKeyDown={e => e.key === 'Enter' && handleLogin((e.target as any).value)} />
              <button onClick={() => handleLogin((document.getElementById('login-id') as any).value)} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all">Ingresar al Aula</button>
           </div>
        </div>
      ) : currentCourse ? (
        <CourseViewer course={currentCourse} onExit={() => setCurrentCourse(null)} onUpdateCourse={handleUpdateCourse} />
      ) : (
        <div className="max-w-6xl mx-auto w-full px-6 py-16 animate-in fade-in duration-700">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b border-white/5 pb-10 gap-6">
            <div>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-widest mb-1">Catedrático TecNM</p>
              <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none">Mi Biblioteca</h1>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowForm(true)} className="px-8 py-4 bg-cyan-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all shadow-xl shadow-cyan-500/10">Nuevo Programa</button>
            </div>
          </header>

          {showForm ? (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <button onClick={() => setShowForm(false)} className="mb-8 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white flex items-center gap-2 transition-colors"><span>←</span> Cancelar Diseño</button>
              <CourseForm onSubmit={handleGenerate} isLoading={isGenerating} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedCourses.length === 0 && (
                <div className="col-span-full py-40 text-center border-2 border-dashed border-white/5 rounded-[50px] bg-white/5">
                  <div className="text-4xl mb-6 opacity-20">📚</div>
                  <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Sin cursos registrados en el nodo</p>
                </div>
              )}
              {savedCourses.map(c => (
                <div key={c.id} onClick={() => setCurrentCourse(c)} className="glass-card p-10 rounded-[40px] border border-white/5 hover:border-cyan-500/30 cursor-pointer transition-all group hover:scale-[1.02] hover:shadow-2xl">
                  <span className="text-[10px] font-black text-cyan-500 uppercase mb-4 block tracking-tighter">{c.subjectCode || 'TEC-IN'}</span>
                  <h3 className="font-black text-white text-2xl mb-6 leading-tight group-hover:text-cyan-400 transition-colors uppercase tracking-tighter">{c.title}</h3>
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                    <span className="text-[9px] font-bold text-slate-600 uppercase">{new Date(c.createdAt).toLocaleDateString()}</span>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs group-hover:bg-cyan-500 group-hover:text-black transition-all">→</div>
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