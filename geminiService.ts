
import { GoogleGenAI } from "@google/genai";
import { UserPreferences, Course, AuthorizedStudent, Lesson, Unit } from "./types";
import { SKELETON_PROMPT, SKELETON_SCHEMA, UNIT_CONTENT_PROMPT, UNIT_CONTENT_SCHEMA } from "./constants";

function cleanAndParseJson(text: string): any {
  try {
    // Intentar extraer JSON puro si viene con markdown
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
    
    if (!raw || !raw.units) throw new Error("Datos insuficientes");

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
    console.error("Fallo en IA, generando estructura de emergencia...");
    // ESTRUCTURA DE RESPALDO (FALLBACK)
    return {
      id: `course_fb_${Date.now()}`,
      createdAt: Date.now(),
      title: prefs.topic || "Nueva Materia",
      duration: "64 horas",
      subjectCode: "TEC-TEMP",
      description: "Estructura generada por error de conexión. Puedes construir las unidades manualmente.",
      units: [
        { id: 'u0', title: 'Unidad 1: Fundamentos Generales', summary: 'Introducción y conceptos básicos.', lessons: [] },
        { id: 'u1', title: 'Unidad 2: Desarrollo y Aplicación', summary: 'Casos prácticos y herramientas.', lessons: [] },
        { id: 'u2', title: 'Unidad 3: Evaluación y Resultados', summary: 'Cierre de curso y proyectos.', lessons: [] }
      ],
      finalProjects: [],
      studentList: parseStudentList(prefs.studentListRaw || "")
    };
  }
}

export async function generateUnitContent(unit: Unit, level: string): Promise<Lesson[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      title: b.title || 'Contenido',
      content: b.content || 'Sin contenido generado.',
      competency: b.competency || 'Competencia técnica.',
      weight: b.weight || 0,
      rubric: b.rubric || []
    }))
  }));
}

export async function gradeSubmission(s: string, r: any[], t: string, c: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Califica esta tarea de ${t}. Rúbrica: ${JSON.stringify(r)}. Entrega: ${s}`,
    config: { responseMimeType: "application/json" }
  });
  return cleanAndParseJson(response.text || "{}") || { score: 0, feedback: "Error al calificar." };
}
