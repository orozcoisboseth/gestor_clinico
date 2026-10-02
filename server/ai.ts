import { GoogleGenAI, Type } from '@google/genai';
import { getDb } from './db.js';

export interface AIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

let activeAIConfig: AIConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  baseUrl: process.env.GEMINI_BASE_URL || '',
};

export async function getActiveAIConfig(): Promise<AIConfig> {
  try {
    const db = getDb();
    const rows = await db.execute("SELECT key, value FROM system_settings WHERE key LIKE 'gemini_%'");
    const settings: Record<string, string> = {};
    for (const row of rows.rows) {
      settings[row.key as string] = row.value as string;
    }

    return {
      apiKey: settings['gemini_api_key'] || process.env.GEMINI_API_KEY || '',
      model: settings['gemini_model'] || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      baseUrl: settings['gemini_base_url'] || process.env.GEMINI_BASE_URL || '',
    };
  } catch {
    return activeAIConfig;
  }
}

export async function updateAIConfig(newConfig: Partial<AIConfig>): Promise<void> {
  const db = getDb();
  if (newConfig.apiKey !== undefined) {
    await db.execute({
      sql: `INSERT INTO system_settings (key, value, updated_at) VALUES ('gemini_api_key', ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      args: [newConfig.apiKey],
    });
  }
  if (newConfig.model !== undefined) {
    await db.execute({
      sql: `INSERT INTO system_settings (key, value, updated_at) VALUES ('gemini_model', ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      args: [newConfig.model],
    });
  }
  if (newConfig.baseUrl !== undefined) {
    await db.execute({
      sql: `INSERT INTO system_settings (key, value, updated_at) VALUES ('gemini_base_url', ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      args: [newConfig.baseUrl],
    });
  }
  activeAIConfig = await getActiveAIConfig();
}

export async function getAIClient(): Promise<{ client: GoogleGenAI; model: string }> {
  const config = await getActiveAIConfig();
  if (!config.apiKey) {
    throw new Error('La clave GEMINI_API_KEY no está configurada en las variables de entorno ni en Ajustes.');
  }

  const options: {
    apiKey: string;
    httpOptions: { headers: Record<string, string>; baseUrl?: string };
  } = {
    apiKey: config.apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  };

  if (config.baseUrl && config.baseUrl.trim().length > 0) {
    options.httpOptions.baseUrl = config.baseUrl.trim();
  }

  const client = new GoogleGenAI(options);
  return { client, model: config.model || 'gemini-2.5-flash' };
}

/**
 * 1. Estructura notas clínicas en formato SOAP profesional
 */
export async function processNotesSOAP(rawNotes: string, patientContext?: string): Promise<{
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  keyThemes: string[];
}> {
  const { client, model } = await getAIClient();

  const prompt = `Actúa como un psicólogo clínico senior y supervisor de casos clínicos.
Tu tarea es tomar las notas rápidas o narrativas de la sesión terapéutica y estructurarlas con rigor ético, lenguaje técnico preciso y confidencialidad en el formato SOAP estándar.

Contexto previo del paciente (si aplica):
${patientContext || 'No especificado.'}

Notas tomadas por el terapeuta en la sesión:
"""
${rawNotes}
"""

Responde estrictamente en formato JSON con la siguiente estructura:
{
  "subjective": "Lo manifestado explícita y subjetivamente por el paciente (motivo, vivencias, quejas, sintomatología autoreportada)",
  "objective": "Observaciones clínicas conductuales, estado mental visible, orientación, afecto, discurso y postura del terapeuta",
  "assessment": "Análisis clínico, conceptualización dinámica o cognitivo-conductual, hipótesis diagnóstica y nivel de progreso",
  "plan": "Acciones terapéuticas pactadas, técnicas aplicadas, tareas para casa y temas para la próxima sesión",
  "keyThemes": ["tema 1", "tema 2", "tema 3"]
}`;

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjective: { type: Type.STRING },
          objective: { type: Type.STRING },
          assessment: { type: Type.STRING },
          plan: { type: Type.STRING },
          keyThemes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['subjective', 'objective', 'assessment', 'plan'],
      },
      systemInstruction: 'Eres un asistente clínico de psicoterapia de élite. Usa terminología psicológica formal, respetuosa y objetiva en español.',
    },
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Error parsing SOAP JSON from Gemini:', err, text);
    throw new Error('No se pudo decodificar la estructura SOAP devuelta por la IA.');
  }
}

/**
 * 2. Analiza sesión para generar resumen, detección de factores de alerta y objetivos
 */
export async function analyzeSessionClinicalInsights(sessionContent: {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}): Promise<{
  summary: string;
  riskFactors: string;
  nextGoals: string;
  suggestedInterventions: string[];
}> {
  const { client, model } = await getAIClient();

  const contentText = `
SUBJETIVO: ${sessionContent.subjective}
OBJETIVO: ${sessionContent.objective}
EVALUACIÓN: ${sessionContent.assessment}
PLAN: ${sessionContent.plan}
`;

  const prompt = `Eres un auditor clínico y supervisor de psicoterapia. Analiza los componentes de la nota clínica siguiente:

${contentText}

Genera:
1. "summary": Resumen clínico conciso (máximo 3 oraciones) enfocado en el avance del tratamiento.
2. "riskFactors": Evaluación explícita de señales de alarma, ideación, impulsividad, aislamiento, o indica con claridad si el riesgo estimado es bajo o inexistente.
3. "nextGoals": 2 o 3 objetivos prioritarios para la siguiente sesión.
4. "suggestedInterventions": Lista de 2 a 4 técnicas terapéuticas basadas en evidencia recomendadas (ej: TCC, ACT, Mindfulness, Reestructuración, Activación Conductual).

Responde en formato JSON exacto.`;

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          riskFactors: { type: Type.STRING },
          nextGoals: { type: Type.STRING },
          suggestedInterventions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['summary', 'riskFactors', 'nextGoals', 'suggestedInterventions'],
      },
      systemInstruction: 'Eres un supervisor clínico para terapeutas. Brinda observaciones orientadas a la seguridad del paciente y la efectividad del tratamiento.',
    },
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Error parsing clinical insights JSON:', err, text);
    throw new Error('No se pudo decodificar el análisis clínico.');
  }
}

/**
 * 3. Pulido y redacción formal de nota clínica (confidencial y despersonalizada)
 */
export async function polishClinicalNote(draftText: string): Promise<string> {
  const { client, model } = await getAIClient();

  const prompt = `Transforma el siguiente borrador de nota clínica en un párrafo profesional, riguroso, ético y sin sesgos de juicio moral, apto para la historia clínica formal de un consultorio de psicología:

Borrador:
"""
${draftText}
"""

Entrega únicamente el texto pulido en español neutro profesional, sin introducciones ni comentarios.`;

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
      systemInstruction: 'Eres un redactor médico-psicológico profesional. Usa estilo clínico formal e impecable.',
    },
  });

  return (response.text || '').trim();
}
