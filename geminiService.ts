import { GoogleGenAI } from "@google/genai";
import { UserPreferences, Course, AuthorizedStudent, Lesson, Unit } from "./types";
import { SKELETON_PROMPT, SKELETON_SCHEMA, UNIT_CONTENT_PROMPT, UNIT_CONTENT_SCHEMA } from "./constants";

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
    console.warn("Error parseando respuesta IA:", e);
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

const getAiClient = () => {
  const apiKey = process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

export async function generateCourseSkeleton(prefs: UserPreferences): Promise<Course> {
  const ai = getAiClient();
  
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
    if (!raw || !raw.units) throw new Error("La IA no devolvió la estructura esperada.");

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
        summary: u.summary || "Contenido en desarrollo.",
        lessons: []
      })),
      finalProjects: [],
      studentList: parseStudentList(prefs.studentListRaw || "")
    };
  } catch (err) {
    console.error("Error en generateCourseSkeleton:", err);
    throw err;
  }
}

export async function generateUnitContent(unit: Unit, level: string): Promise<Lesson[]> {
  const ai = getAiClient();
  try {
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
        title: b.title || 'Contenido Técnico',
        content: b.content || 'Sin contenido.',
        competency: b.competency || 'Competencia transversal.',
        weight: b.weight || 0,
        rubric: b.rubric || []
      }))
    }));
  } catch (err) {
    console.error("Error en generateUnitContent:", err);
    throw err;
  }
}

export async function gradeSubmission(submission: string, rubric: any[], lessonTitle: string, context: string) {
  const ai = getAiClient();
  const prompt = `Actúa como un Sínodo Evaluador del TecNM.
  Evalúa la siguiente entrega del alumno para la lección "${lessonTitle}".
  
  CONTEXTO DE LA LECCIÓN:
  ${context}

  ENTREGA DEL ALUMNO:
  ${submission}

  RÚBRICA A APLICAR:
  ${JSON.stringify(rubric)}

  Devuelve un JSON con:
  - score: número (suma de puntos según rúbrica)
  - feedback: string constructivo y profesional en español.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" }
  });
  
  return cleanAndParseJson(response.text || "{}") || { score: 0, feedback: "Error en la evaluación automática." };
}