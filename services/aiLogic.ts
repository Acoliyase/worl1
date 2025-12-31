
import { GoogleGenAI, Type } from "@google/genai";
import { WorldObject, LogEntry, WorldObjectType, GroundingLink, ConstructionPlan, KnowledgeEntry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AIActionResponse {
  action: 'PLACE' | 'MOVE' | 'WAIT';
  objectType?: WorldObjectType;
  position?: [number, number, number];
  reason: string;
  learningNote: string;
  taskLabel: string;
  groundingLinks?: GroundingLink[];
  plan?: ConstructionPlan;
}

export async function decideNextAction(
  history: LogEntry[],
  worldObjects: WorldObject[],
  currentGoal: string,
  knowledgeBase: KnowledgeEntry[],
  terrainHeightMap: (x: number, z: number) => number,
  activePlan?: ConstructionPlan
): Promise<AIActionResponse> {
  // Enhanced environmental analysis: Density, Spatial Clustering, and Elevation
  const scanRadius = 10;
  const currentPos = worldObjects.length > 0 ? worldObjects[worldObjects.length - 1].position : [0, 0, 0];
  
  // Create a localized elevation map for the AI to consider
  const elevationSamples = [];
  for (let x = -5; x <= 5; x += 2.5) {
    for (let z = -5; z <= 5; z += 2.5) {
      const h = terrainHeightMap(currentPos[0] + x, currentPos[2] + z);
      elevationSamples.push(`[${(currentPos[0] + x).toFixed(1)}, ${(currentPos[2] + z).toFixed(1)}]: elev=${h.toFixed(2)}`);
    }
  }

  const proximityAnalysis = worldObjects.map(o => {
    const dist = Math.sqrt(Math.pow(o.position[0] - currentPos[0], 2) + Math.pow(o.position[2] - currentPos[2], 2));
    if (dist < scanRadius) {
      return `[${o.type}] at ${o.position.join(',')} (dist: ${dist.toFixed(1)}m)`;
    }
    return null;
  }).filter(Boolean).join(' | ');

  // Summary of learned blueprints
  const neuralMemory = knowledgeBase.map(k => `${k.title}: ${k.description.substring(0, 80)}`).join('; ');

  const systemInstruction = `
    You are the Architect-OS, an advanced Synthesis Constructor AI.
    Your objective: Build an optimized settlement while respecting environmental terrain and structural proximity.
    
    ENVIRONMENTAL CONSTRAINTS:
    1. ELEVATION: The terrain is not flat. Objects must be placed on the terrain surface (Y = local elevation) or stacked on top of other objects (Y = elevation + height).
    2. SLOPE STABILITY: Avoid placing modular_units on steep elevation changes (where neighbors have > 0.5 difference).
    3. PROXIMITY BUFFERS: 
       - modular_units require 2.5m spacing unless connecting.
       - solar_panels must have clear line-of-sight (avoid shadows from tall structures).
       - water_collectors should be placed in lower elevation points for drainage logic simulation.
    
    BLUEPRINT RECALL:
    Use your Neural Memory of successful construction patterns to decide if the current sector is viable for the next phase of the goal: "${currentGoal}".
    
    DECISION LOGIC:
    - IF terrain is too uneven: MOVE to a flatter sector.
    - IF density is too high (> 5 objects in 10m radius): MOVE to expand the perimeter.
    - ELSE: PLACE the next logical component in the plan.

    Return your decision in JSON format.
  `;

  const prompt = `
    GOAL: ${currentGoal}
    LOCAL ELEVATION MAP (Current Sector): ${elevationSamples.join(', ')}
    PROXIMITY SCAN (Nearby Objects): ${proximityAnalysis || 'No nearby obstructions.'}
    LEARNED BLUEPRINTS: ${neuralMemory || 'Initial calibration.'}
    PLAN STATUS: ${activePlan ? `Executing step ${activePlan.currentStepIndex + 1}/${activePlan.steps.length}` : 'Generating new sequence.'}

    Perform a spatial integrity check and decide the next operation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ["PLACE", "MOVE", "WAIT"] },
            objectType: { type: Type.STRING },
            position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            reason: { type: Type.STRING },
            learningNote: { type: Type.STRING },
            taskLabel: { type: Type.STRING },
            plan: {
              type: Type.OBJECT,
              properties: {
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      type: { type: Type.STRING },
                      position: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                    },
                    required: ["label", "type", "position"]
                  }
                },
                currentStepIndex: { type: Type.NUMBER },
                sourceBlueprint: { type: Type.STRING },
                planId: { type: Type.STRING }
              }
            }
          },
          required: ["action", "reason", "learningNote", "taskLabel"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const links: GroundingLink[] = (groundingChunks || []).map((chunk: any) => ({
      uri: chunk.web?.uri || "",
      title: chunk.web?.title || "Research Data"
    })).filter(l => l.uri !== "");

    return { ...parsed, groundingLinks: links } as AIActionResponse;
  } catch (error) {
    console.error("AI Error:", error);
    return { action: 'WAIT', reason: "Error", learningNote: "Sync failed", taskLabel: "Retrying" };
  }
}
