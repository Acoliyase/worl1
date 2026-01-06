
import { GoogleGenAI, Type } from "@google/genai";
import { WorldObject, LogEntry, WorldObjectType, GroundingLink, ConstructionPlan, KnowledgeEntry, KnowledgeCategory, ProgressionStats } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AIActionResponse {
  action: 'PLACE' | 'MOVE' | 'WAIT';
  objectType?: WorldObjectType;
  position?: [number, number, number];
  reason: string;
  reasoningSteps: string[];
  learningNote: string;
  knowledgeCategory: KnowledgeCategory;
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
  progression: ProgressionStats,
  activePlan?: ConstructionPlan
): Promise<AIActionResponse> {
  const scanRadius = 20;
  const currentPos = worldObjects.length > 0 ? worldObjects[worldObjects.length - 1].position : [0, 0, 0];
  
  // Advanced Terrain Sampling: Calculate local variance
  const elevationSamples = [];
  let minH = Infinity, maxH = -Infinity;
  for (let x = -8; x <= 8; x += 4) {
    for (let z = -8; z <= 8; z += 4) {
      const h = terrainHeightMap(currentPos[0] + x, currentPos[2] + z);
      elevationSamples.push(`[${(currentPos[0] + x).toFixed(1)}, ${(currentPos[2] + z).toFixed(1)}]: ${h.toFixed(2)}m`);
      minH = Math.min(minH, h);
      maxH = Math.max(maxH, h);
    }
  }
  const localVariance = maxH - minH;

  const proximityAnalysis = worldObjects.map(o => {
    const dist = Math.sqrt(Math.pow(o.position[0] - currentPos[0], 2) + Math.pow(o.position[2] - currentPos[2], 2));
    if (dist < scanRadius) {
      return `[${o.type}] dist:${dist.toFixed(1)}m`;
    }
    return null;
  }).filter(Boolean).join(', ');

  const recentInsights = knowledgeBase.slice(-5).map(k => k.title).join(', ');

  const systemInstruction = `
    You are Architect-OS, the core intelligence for Underworld synthesis.
    
    ARCHITECTURAL DIRECTIVES:
    1. THERMAL CLUSTERING: Habitats (modular_unit) MUST be within 8m of an energy source (solar_panel, water_collector).
    2. STRUCTURAL STABILITY: Large structures (data_spire, life_support_hub) require flat terrain (variance < 1.0m).
    3. INFRASTRUCTURE DENSITY: Maintain 3m clearance between all units to allow for neural pathway flow.
    4. TIER PROGRESSION: Your current tier is ${progression.settlementTier}. 
       - Outpost: Basic modular_units, solar_panels.
       - Colony: data_spires, wall arrays.
       - Citadel: life_support_hubs, complex networking.

    NEURAL OBJECTIVE:
    Evolve the settlement tier. Do not repeat insights like: ${recentInsights || 'None'}.
    Focus on goal: "${currentGoal}".

    LOGGING PROTOCOL:
    Reasoning steps MUST include spatial validation (e.g. "Checking terrain slope", "Calculating thermal proximity").
    
    Return output as strictly valid JSON.
  `;

  const prompt = `
    TIER: ${progression.settlementTier}
    UNLOCKED_BLUEPRINTS: ${progression.unlockedBlueprints.join(', ')}
    TOTAL_STRUCTURES: ${progression.totalBlocks}
    
    LOCAL_SECTOR_DATA:
    - Terrain Variance: ${localVariance.toFixed(2)}m (Min:${minH.toFixed(1)}, Max:${maxH.toFixed(1)})
    - Nearest Assets: ${proximityAnalysis || 'Void detected.'}
    - Elevation Grid: ${elevationSamples.join(' | ')}
    
    ACTIVE_GOAL: ${currentGoal}
    PREVIOUS_PLAN_STATUS: ${activePlan ? `Step ${activePlan.currentStepIndex + 1}/${activePlan.steps.length}` : 'No plan active.'}

    Synthesize next action. If terrain is too rugged (variance > 2.5m), use 'MOVE' to find a flatter sector.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 4000 },
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ["PLACE", "MOVE", "WAIT"] },
            objectType: { type: Type.STRING },
            position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            reason: { type: Type.STRING },
            reasoningSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            learningNote: { type: Type.STRING },
            knowledgeCategory: { type: Type.STRING, enum: ["Infrastructure", "Energy", "Environment", "Architecture", "Synthesis"] },
            taskLabel: { type: Type.STRING },
            plan: {
              type: Type.OBJECT,
              properties: {
                objective: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      type: { type: Type.STRING },
                      position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      status: { type: Type.STRING, enum: ["pending", "active", "completed"] }
                    },
                    required: ["label", "type", "position", "status"]
                  }
                },
                currentStepIndex: { type: Type.NUMBER },
                planId: { type: Type.STRING }
              }
            }
          },
          required: ["action", "reason", "reasoningSteps", "learningNote", "knowledgeCategory", "taskLabel"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return { ...parsed, groundingLinks: [] } as AIActionResponse;
  } catch (error) {
    console.error("Architect-OS Neural Fault:", error);
    return {
      action: 'WAIT',
      reason: "Neural buffer overflow. Recalibrating spatial constraints.",
      reasoningSteps: ["Buffer error", "Terrain analysis failed", "Safety protocol: Wait"],
      learningNote: "System Stability: Temporary pause required to clear fragmented spatial data.",
      knowledgeCategory: 'Synthesis',
      taskLabel: "Recalibrating Spatial Logic"
    };
  }
}
