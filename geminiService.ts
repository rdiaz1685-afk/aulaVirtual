
import { GoogleGenAI } from "@google/genai";
import { UserPreferences, Course, AuthorizedStudent, Lesson, Unit } from "./types";
import { SKELETON_PROMPT, SKELETON_SCHEMA, UNIT_CONTENT_PROMPT, UNIT_CONTENT_SCHEMA } from "./constants";

const getApiKey = () => {
  // Intenta obtener la API_KEY de las variables de entorno de Vercel/Vite
  const key = process.env.API_KEY;
  if (!key) {
    console.warn("⚠️ API_KEY no detectada. Asegúrate de configurarla en Settings > Environment Variables en Vercel.");
  }
  return key || '';
};

function cleanAndParseJson(text: string): any {
  try {
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const startBrace = cleanText.indexOf('{');
    const startBracket = cleanText.indexOf('[');
    let start = -1;
    if (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) start = startBrace;
    else if (startBracket !== -1) start = startBracket;

    if (start === -1) throw new Error("No JSON found");
    
    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    const jsonString = cleanText.substring(start, end + 1);
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn("Error parseando respuesta, usando fallback:", e);
    return null;
  }
}

function generateRandomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function parseStudentList(raw: string): AuthorizedStudent[] {
  if (!raw) return [];
  return raw.split('\n')
    .map(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        return { id: parts[0], name: parts.slice(1).join(" "), pin: generateRandomPin() };
      }
      return null;
    })
    .filter((s): s is AuthorizedStudent => s !== null);
}

export async function generateCourseSkeleton(prefs: UserPreferences): Promise<Course> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Error de Configuración: Falta la API_KEY en Vercel. Por favor, agrégala en los ajustes del proyecto.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: SKELETON_PROMPT(prefs) }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: SKELETON_SCHEMA,
      },
    });

    const raw = cleanAndParseJson(response.text || "{}");
    if (!raw || !raw.units) throw new Error("Datos insuficientes de la IA");

    return {
      id: `course_${Date.now()}`,
      createdAt: Date.now(),
      title: raw.title || prefs.topic,
      duration: "64 horas",
      subjectCode: raw.subjectCode || "TEC-001",
      description: raw.description || "",
      units: (raw.units || []).map((u: any, i: number) => ({
        id: `u${i}`,
        title: u.title || `Unidad ${i+1}`,
        summary: u.summary || "Contenido pendiente de desarrollo.",
        lessons: []
      })),
      finalProjects: [],
      studentList: parseStudentList(prefs.studentListRaw || "")
    };
  } catch (err) {
    console.error("Fallo en IA:", err);
    return {
      id: `course_fb_${Date.now()}`,
      createdAt: Date.now(),
      title: prefs.topic || "Nueva Materia (Modo Seguro)",
      duration: "64 horas",
      subjectCode: "TEC-ERROR",
      description: "Hubo un problema con la IA, pero hemos generado este temario de emergencia para que puedas continuar.",
      units: [
        { id: 'u0', title: 'Unidad 1: Introducción General', summary: 'Conceptos iniciales de la materia.', lessons: [] }
      ],
      finalProjects: [],
      studentList: parseStudentList(prefs.studentListRaw || "")
    };
  }
}

export async function generateUnitContent(unit: Unit, level: string): Promise<Lesson[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY no configurada.");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: UNIT_CONTENT_PROMPT(unit.title, unit.summary, level) }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: UNIT_CONTENT_SCHEMA,
    },
  });

  const rawData = cleanAndParseJson(response.text || "{}") || { lessons: [] };
  const lessons = rawData.lessons || [];

  return lessons.map((l: any, i: number) => ({
    id: `l_${Date.now()}_${i}`,
    title: l.title || `Lección ${i + 1}`,
    blocks: (l.blocks || []).map((b: any) => ({
      type: b.type || 'theory',
      title: b.title || 'Contenido Académico',
      content: b.content || 'Sin contenido detallado disponible.',
      competency: b.competency || 'Competencia técnica profesional.',
      weight: b.weight || 0,
      rubric: b.rubric || []
    }))
  }));
}

export async function gradeSubmission(s: string, r: any[], t: string, c: string) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY no configurada.");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Actúa como un profesor del TecNM. Califica esta tarea de ${t}. Rúbrica: ${JSON.stringify(r)}. Entrega del alumno: ${s}`,
    config: { responseMimeType: "application/json" }
  });
  return cleanAndParseJson(response.text || "{}") || { score: 0, feedback: "El sínodo no pudo evaluar la entrega en este momento." };
}
