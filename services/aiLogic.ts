
import { Mistral } from "@mistralai/mistralai";
import { WorldObject, LogEntry, WorldObjectType, GroundingLink, ConstructionPlan, KnowledgeEntry } from "../types";

const client = new Mistral({ apiKey: process.env.r0hmjZVIlfYOI32bsjb5ncbifdKxEHYI });

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
    const response = await client.chat({
      model: "mistral-large-latest",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      responseFormat: { type: "json_object" }
    });

    console.log("Mistral API Response:", response); // Add logging

    if (!response.choices[0].message.content) {
      throw new Error("Empty response from Mistral API");
    }

    const parsed = JSON.parse(response.choices[0].message.content);
    // Mistral doesn't have grounding like Google, so return empty array
    return { ...parsed, groundingLinks: [] } as AIActionResponse;
  } catch (error) {
    console.error("AI Error:", error);
    // Fallback to mock response for testing
    const x = Math.random() * 20 - 10;
    const z = Math.random() * 20 - 10;
    const y = terrainHeightMap(x, z);
    const mockResponses: AIActionResponse[] = [
      {
        action: 'PLACE',
        objectType: 'modular_unit',
        position: [x, y, z],
        reason: 'Mock placement for testing',
        learningNote: 'Simulated construction',
        taskLabel: 'Placing Module'
      },
      {
        action: 'MOVE',
        position: [x, y, z],
        reason: 'Mock movement',
        learningNote: 'Exploring terrain',
        taskLabel: 'Repositioning'
      },
      {
        action: 'WAIT',
        reason: 'Mock standby',
        learningNote: 'Waiting for conditions',
        taskLabel: 'Standby'
      }
    ];
    const index = Math.floor(Math.random() * mockResponses.length);
    return mockResponses[index];
  }
}
