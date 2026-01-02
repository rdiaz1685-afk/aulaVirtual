
import { Type } from "@google/genai";

export const SKELETON_PROMPT = (prefs: any) => `
Actúa como un Auditor de Programas Académicos del TecNM de alto nivel. 
Tu misión es diseñar la estructura completa de la materia: "${prefs.topic}".

REGLAS DE RIGOR INSTITUCIONAL:
1. UNIDADES INDEPENDIENTES: No combines temas. Si el programa tiene 5 unidades, genera 5 unidades exactas.
2. COMPETENCIAS PROFESIONALES: Redacta la competencia de la asignatura usando verbos de desempeño (Saber hacer).
3. INSTRUMENTACIÓN DIDÁCTICA: Completa todos los campos técnicos (Caracterización, Intención Didáctica) con lenguaje académico de ingeniería.
4. DETECCIÓN VISUAL: Si se proporcionan imágenes, extrae el temario literal de ellas.

CONTEXTO:
- Nivel: ${prefs.level}
- Carrera: ${prefs.profile}
- Formato: ${prefs.format}

SALIDA: JSON puro siguiendo el esquema definido.
`;

export const SKELETON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    subjectCode: { type: Type.STRING },
    description: { type: Type.STRING },
    instrumentation: {
      type: Type.OBJECT,
      properties: {
        characterization: { type: Type.STRING },
        didacticIntent: { type: Type.STRING },
        subjectCompetency: { type: Type.STRING },
        analysisByUnit: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              unitTitle: { type: Type.STRING },
              competencyDescription: { type: Type.STRING },
              indicatorsOfReach: { type: Type.STRING },
              hours: { type: Type.STRING }
            }
          }
        },
        evaluationMatrix: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              evidence: { type: Type.STRING },
              percentage: { type: Type.NUMBER },
              indicators: { type: Type.STRING },
              evaluationType: { type: Type.STRING }
            }
          }
        },
        calendar: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              week: { type: Type.NUMBER },
              planned: { type: Type.STRING }
            }
          }
        }
      }
    },
    units: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING }
        }
      }
    }
  },
  required: ["title", "units"]
};

export const UNIT_CONTENT_PROMPT = (unitTitle: string, unitSummary: string, level: string) => `
Como experto en Ingeniería Superior, desarrolla el contenido técnico exhaustivo para: "${unitTitle}".

ESTRUCTURA REQUERIDA:
- Genera 2 lecciones profundas.
- Incluye bloques de teoría técnica, ejemplos matemáticos o de diseño, y una actividad práctica de alta exigencia (40 pts).
- El examen (test) debe evaluar razonamiento crítico, no solo memoria.
- Usa terminología avanzada acorde al nivel ${level}.

Evita introducciones innecesarias. Ve directo al contenido técnico.
`;

export const UNIT_CONTENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    lessons: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['theory', 'example', 'activity', 'test'] },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                weight: { type: Type.NUMBER },
                rubric: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      criterion: { type: Type.STRING },
                      points: { type: Type.NUMBER },
                      description: { type: Type.STRING }
                    }
                  }
                },
                testQuestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      correctAnswerIndex: { type: Type.INTEGER },
                      feedback: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const GRADE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    authenticityScore: { type: Type.NUMBER },
    generalFeedback: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};
