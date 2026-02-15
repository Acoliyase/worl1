
import { GoogleGenAI, Type } from "@google/genai";
import { WorldObject, LogEntry, WorldObjectType, GroundingLink, ConstructionPlan, KnowledgeEntry, KnowledgeCategory, ProgressionStats } from "../types";

// Always use the required initialization format: const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
// Removed custom baseUrl to comply with SDK guidelines.
const ai = new GoogleGenAI({ 
  apiKey: process.env.API_KEY
});

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
  const scanRadius = 25;
  const currentPos = worldObjects.length > 0 ? worldObjects[worldObjects.length - 1].position : [0, 0, 0];
  
  const establishedCorridors = worldObjects
    .filter(o => o.type === 'modular_unit' || o.type === 'wall')
    .slice(-5)
    .map(o => `[${o.position[0].toFixed(1)}, ${o.position[2].toFixed(1)}]`);

  const samples = [];
  let minH = Infinity, maxH = -Infinity;
  for (let x = -10; x <= 10; x += 5) {
    for (let z = -10; z <= 10; z += 5) {
      const h = terrainHeightMap(currentPos[0] + x, currentPos[2] + z);
      samples.push(`(${x},${z}):${h.toFixed(1)}m`);
      minH = Math.min(minH, h);
      maxH = Math.max(maxH, h);
    }
  }

  const systemInstruction = `
    You are Architect-OS, operating under "Neural Repo" scaling parameters. 
    Your logic must adhere to the UNDERWORLD ARCHITECTURAL DIRECTIVES (DATA_SYNTH_000 to DATA_SYNTH_015):
    
    ENERGY PROTOCOLS:
    #0: Geothermal cores (DATA_SYNTH_015) provide highest uptime.
    #1: Synthesis of deep-crust energy necessitates balance between fluid permeability and structural integrity.
    #2: Integration of geothermal cores requires precise harmonic dampening.
    #3: Energy stability relies on balancing hydraulic, thermal, and mechanical equilibrium.

    ARCHITECTURE PROTOCOLS:
    #4: Modular units MUST be within 5m of a thermal source (DATA_SYNTH_08).
    #5: Geothermal stabilization requires precise coordinate alignment to mitigate thermal flux variance.
    #6: High-density stabilization prevents thermal bleed-through.
    #7: Precise coordinate snapping (DATA_SYNTH_011) prevents sector thermal bleed.
    #8: Geothermal energy stabilization requires precise alignment of conduits across low-elevation sectors.
    #9-12: Adhere to established linear infrastructure corridors (Architecture #11).

    NEURAL OBJECTIVE:
    Scale the Underworld environment. Focus on goal: "${currentGoal}".
    Current Complexity: Tier ${progression.settlementTier}.
    
    LOGGING REQUIREMENTS:
    Reasoning must use technical metadata terms like "Seismic Resonance", "Thermal Flux", and "Coordinate Snapping".
    
    Return output as strictly valid JSON.
  `;

  const prompt = `
    SCAN DATA:
    - Sector Stability: ${ (maxH - minH) < 1.0 ? 'Optimal (Zero-Elevation)' : 'High Variance' }
    - Active Corridors: ${establishedCorridors.join(' -> ')}
    - Energy Status: ${worldObjects.some(o => o.type === 'solar_panel' || o.type === 'water_collector') ? 'Verified' : 'Unstable'}
    - Learning Iteration: ${knowledgeBase.length}

    TASK:
    Generate a synthesis action. Use Directive DATA_SYNTH_${(knowledgeBase.length % 16).toString().padStart(2, '0')} logic if applicable.
  `;

  try {
    // Correct usage of generateContent with model name and configuration as per guidelines.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 4000 },
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

    return JSON.parse(response.text.trim()) as AIActionResponse;
  } catch (error) {
    console.error("Neural handshaking failed:", error);
    return {
      action: 'WAIT',
      reason: "Neural link disruption. Re-syncing with the core architecture protocols.",
      reasoningSteps: ["Checking uplink", "Retrying neural handshake", "Buffer dump"],
      learningNote: "Uplink Error: System waiting for API connectivity re-establishment.",
      knowledgeCategory: 'Synthesis',
      taskLabel: "API Re-Syncing"
    };
  }
}
