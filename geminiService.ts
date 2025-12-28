import { GoogleGenAI } from "@google/genai";
import { UserPreferences, Course, AuthorizedStudent, Lesson, Unit } from "./types";
import { SKELETON_PROMPT, SKELETON_SCHEMA, UNIT_CONTENT_PROMPT, UNIT_CONTENT_SCHEMA } from "./constants";

function cleanAndParseJson(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    try {
      let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const start = cleanText.indexOf('{');
      const end = cleanText.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        return JSON.parse(cleanText.substring(start, end + 1));
      }
      return null;
    } catch (err) {
      console.error("Fallo crítico parseando JSON de la IA:", text);
      return null;
    }
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
  // Verificamos múltiples fuentes posibles de la API Key
  const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
  
  if (!apiKey || apiKey === 'undefined' || apiKey === '') {
    throw new Error("Falta la API_KEY. Asegúrate de configurarla en las variables de entorno de tu servidor (Vercel/Netlify).");
  }
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

    const raw = cleanAndParseJson(response.text || "");
    if (!raw || !raw.units) {
      throw new Error("La IA no pudo estructurar el temario. Reintenta.");
    }

    return {
      id: `course_${Date.now()}`,
      createdAt: Date.now(),
      title: raw.title || prefs.topic,
      duration: "64 horas",
      subjectCode: raw.subjectCode || "TEC-GEN",
      description: raw.description || "",
      units: (raw.units || []).map((u: any, i: number) => ({
        id: `u${i}`,
        title: u.title || `Unidad ${i+1}`,
        summary: u.summary || "Contenido pendiente de generación.",
        lessons: []
      })),
      finalProjects: [],
      studentList: parseStudentList(prefs.studentListRaw || "")
    };
  } catch (err: any) {
    console.error("Error en generateCourseSkeleton:", err);
    throw new Error(err.message || "Fallo en la comunicación con la IA.");
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

    const rawData = cleanAndParseJson(response.text || "");
    if (!rawData || !rawData.lessons || !Array.isArray(rawData.lessons)) {
      throw new Error("Error estructurando lecciones.");
    }

    return rawData.lessons.map((l: any, i: number) => ({
      id: `l_${Date.now()}_${i}`,
      title: l.title || `Lección ${i + 1}`,
      blocks: (l.blocks || []).map((b: any) => ({
        type: b.type || 'theory',
        title: b.title || 'Tema Técnico',
        content: b.content || 'Cargando contenido...',
        competency: b.competency || 'Competencia técnica.',
        weight: b.weight || 0,
        rubric: b.rubric || []
      }))
    }));
  } catch (err: any) {
    throw new Error(err.message || "Fallo al generar contenido de unidad.");
  }
}

export async function gradeSubmission(submission: string, rubric: any[], lessonTitle: string, context: string) {
  const ai = getAiClient();
  const prompt = `Evalúa como Sínodo del TecNM la siguiente entrega de la lección "${lessonTitle}". 
  Contenido contexto: ${context}. 
  Entrega del alumno: ${submission}. 
  Rúbrica: ${JSON.stringify(rubric)}. 
  Responde ÚNICAMENTE un JSON con: { "score": número (0-100), "feedback": "texto corto", "aiLikelihood": "observación de originalidad" }.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJson(response.text || "") || { score: 0, feedback: "Error en evaluación." };
  } catch {
    return { score: 0, feedback: "Fallo de conexión sínodo." };
  }
}