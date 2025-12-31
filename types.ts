
export type WorldObjectType = 'wall' | 'roof' | 'door' | 'crop' | 'tree' | 'well' | 'fence' | 'modular_unit' | 'solar_panel' | 'water_collector';

export interface PlanStep {
  label: string;
  type: WorldObjectType;
  position: [number, number, number];
}

export interface WorldObject {
  id: string;
  type: WorldObjectType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  timestamp: number;
}

export interface LogEntry {
  id: string;
  type: 'action' | 'learning' | 'error' | 'success';
  message: string;
  timestamp: number;
}

export interface GroundingLink {
  uri: string;
  title: string;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  description: string;
  iteration: number;
  timestamp: number;
  links?: GroundingLink[];
}

export interface ConstructionPlan {
  steps: PlanStep[];
  currentStepIndex: number;
  sourceBlueprint?: string;
  planId: string;
}

export interface ProgressionStats {
  complexityLevel: number;
  structuresCompleted: number;
  totalBlocks: number;
  unlockedBlueprints: string[];
}

export interface SimulationState {
  objects: WorldObject[];
  logs: LogEntry[];
  knowledgeBase: KnowledgeEntry[];
  currentGoal: string;
  learningIteration: number;
  progression: ProgressionStats;
  networkStatus: 'offline' | 'uplink_active' | 'syncing';
  activePlan?: ConstructionPlan;
  ui: {
    showStats: boolean;
    showKnowledge: boolean;
    showLogs: boolean;
    showPlanning: boolean;
  };
}
