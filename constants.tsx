
import { Type } from "@google/genai";

export const SKELETON_PROMPT = (prefs: any) => `
Actúa como un Diseñador Instruccional Senior del TecNM.
Diseña el TEMARIO (esqueleto) de un curso de nivel ${prefs.level} sobre: ${prefs.topic}.

REGLAS:
- Genera de 3 a 5 unidades.
- Asegura que la Unidad 1 sea de FUNDAMENTOS y CONCEPTOS BÁSICOS (ej. Aleatorio vs Pseudoaleatorio).
- Proporciona títulos técnicos y resúmenes de 2 frases.
- Idioma: Español.
`;

export const SKELETON_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    subjectCode: { type: Type.STRING },
    description: { type: Type.STRING },
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
Eres un experto en Pedagogía para Ingenierías del TecNM. 
Desarrolla el contenido de la unidad: "${unitTitle}".
Resumen: ${unitSummary}.
Nivel: ${level}.

ESTRATEGIA PEDAGÓGICA:
1. Lección 1: "Conceptos y Fundamentos" (Básico).
2. Lección 2: "Aplicación y Análisis".

REQUISITOS POR LECCIÓN:
- Define una 'competency' clara.
- La actividad debe tener un 'weight' (valor numérico).
- IMPORTANTE: La suma de los 'weight' de todas las actividades de esta UNIDAD debe ser 100.
- Cada actividad debe incluir una 'rubric' con criterios y puntos.
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
                type: { type: Type.STRING, enum: ['theory', 'example', 'activity'] },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                competency: { type: Type.STRING },
                weight: { type: Type.NUMBER, description: "Valor porcentual en la unidad" },
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
                }
              },
              required: ["type", "title", "content"]
            }
          }
        },
        required: ["title", "blocks"]
      }
    }
  },
  required: ["lessons"]
};
