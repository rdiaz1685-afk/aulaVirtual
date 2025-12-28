
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

  const handleLogin = (id: string) => {
    const profile: TeacherProfile = { id, name: 'Docente TecNM', role: 'admin', joinedAt: Date.now() };
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
      setError("Fallo al diseñar el programa. Intenta con un título más descriptivo.");
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

        // Validación de estructura mínima
        if (!imported.title || !Array.isArray(imported.units)) {
          throw new Error("El archivo no tiene el formato de curso válido.");
        }

        // Generar un nuevo ID si ya existe uno igual para evitar conflictos
        const newCourse = {
          ...imported,
          id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };

        setSavedCourses(prev => [newCourse, ...prev]);
        setCurrentCourse(newCourse); // Abrir directamente el curso importado
        
        // Limpiar el input para permitir cargar el mismo archivo después si es necesario
        e.target.value = "";
        
        console.log("Materia importada con éxito:", newCourse.title);
      } catch (err) {
        console.error("Error al importar JSON:", err);
        alert("Error: El archivo JSON no es un respaldo válido de ProfesorIA o está dañado.");
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
      
      {error && (
        <div className="fixed inset-0 z-[30000] bg-slate-950/90 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-10 rounded-[40px] text-center shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-4 uppercase">Error de Sistema</h2>
            <p className="text-slate-400 text-sm mb-8">{error}</p>
            <button onClick={() => setError(null)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs">Reintentar</button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 z-[20000] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-10 text-center">
          <div className="w-24 h-24 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-8"></div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Diseñando Temario...</h2>
          <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Estructurando Unidades para Sincronía</p>
        </div>
      )}

      {!teacher ? (
        <div className="min-h-screen flex items-center justify-center p-6">
           <div className="glass-card p-12 rounded-[50px] max-w-sm w-full text-center">
              <div className="w-20 h-20 bg-cyan-500 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black mb-8">P</div>
              <h1 className="text-xl font-black text-white uppercase mb-8">Profesor IA</h1>
              <input id="login-id" className="w-full p-5 rounded-2xl bg-slate-950 border border-white/5 mb-4 text-center" placeholder="ID Mindbox" />
              <button onClick={() => handleLogin((document.getElementById('login-id') as HTMLInputElement).value)} className="w-full py-5 bg-cyan-500 text-slate-950 rounded-2xl font-black uppercase text-xs">Entrar</button>
           </div>
        </div>
      ) : currentCourse ? (
        <CourseViewer course={currentCourse} onExit={() => setCurrentCourse(null)} onUpdateCourse={handleUpdateCourse} />
      ) : (
        <div className="max-w-7xl mx-auto w-full px-8 py-20">
          <div className="flex justify-between items-end mb-16 border-b border-white/5 pb-10">
            <div>
              <p className="text-cyan-500 text-[10px] font-black uppercase tracking-widest mb-1">TecNM Gestión</p>
              <h1 className="text-6xl font-black text-white tracking-tighter uppercase">Biblioteca</h1>
            </div>
            <div className="flex gap-4">
              <input type="file" id="import-json" className="hidden" accept=".json" onChange={handleImportJson} />
              <label htmlFor="import-json" className="cursor-pointer px-10 py-5 bg-slate-900 border border-white/10 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
                <span>📁</span> Cargar .JSON
              </label>
              <button onClick={() => setShowForm(true)} className="px-10 py-5 bg-white text-slate-950 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 transition-all">Nuevo Programa</button>
            </div>
          </div>

          {showForm ? (
            <div>
              <button onClick={() => setShowForm(false)} className="mb-10 text-[10px] font-black text-slate-500 uppercase tracking-widest">← Cancelar Registro</button>
              <CourseForm onSubmit={handleGenerate} isLoading={isGenerating} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {savedCourses.length === 0 && (
                <div className="col-span-3 text-center py-20 bg-slate-900/40 rounded-[60px] border border-white/5">
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No hay materias registradas. Diseña una o carga un JSON.</p>
                </div>
              )}
              {savedCourses.map(c => (
                <div key={c.id} onClick={() => setCurrentCourse(c)} className="glass-card p-10 rounded-[40px] border border-white/5 hover:border-cyan-500/50 cursor-pointer transition-all group">
                  <h3 className="font-black text-white text-xl mb-2 line-clamp-1 group-hover:text-cyan-400">{c.title}</h3>
                  <p className="text-[10px] text-cyan-500 font-black uppercase mb-6">{c.subjectCode}</p>
                  <p className="text-xs text-slate-500 mb-4">{c.units.length} Unidades Proyectadas</p>
                  <div className="flex gap-1">
                    {c.units.map((u, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${u.lessons.length > 0 ? 'bg-cyan-500' : 'bg-slate-800'}`}></div>
                    ))}
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
