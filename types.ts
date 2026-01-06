
export type WorldObjectType = 'wall' | 'roof' | 'door' | 'crop' | 'tree' | 'well' | 'fence' | 'modular_unit' | 'solar_panel' | 'water_collector' | 'data_spire' | 'life_support_hub';

export type KnowledgeCategory = 'Infrastructure' | 'Energy' | 'Environment' | 'Architecture' | 'Synthesis';

export type SettlementTier = 'Outpost' | 'Colony' | 'Settlement' | 'Citadel';

export interface PlanStep {
  label: string;
  type: WorldObjectType;
  position: [number, number, number];
  status: 'pending' | 'active' | 'completed';
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
  type: 'action' | 'learning' | 'error' | 'success' | 'thinking';
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
  category: KnowledgeCategory;
  iteration: number;
  timestamp: number;
  links?: GroundingLink[];
  isHighlight?: boolean;
}

export interface ConstructionPlan {
  steps: PlanStep[];
  currentStepIndex: number;
  sourceBlueprint?: string;
  planId: string;
  objective: string;
}

export interface ProgressionStats {
  complexityLevel: number;
  structuresCompleted: number;
  totalBlocks: number;
  unlockedBlueprints: string[];
  settlementTier: SettlementTier;
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
  isScanning: boolean;
  ui: {
    showStats: boolean;
    showKnowledge: boolean;
    showLogs: boolean;
    showPlanning: boolean;
  };
}
