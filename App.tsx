
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import { WorldObject, LogEntry, SimulationState, KnowledgeEntry, GroundingLink, ConstructionPlan } from './types';
import { decideNextAction, AIActionResponse } from './services/aiLogic';

const INITIAL_GOAL = "Synthesize Sustainable Modular Settlement";

// Basic terrain height function for simulation context
const getTerrainHeight = (x: number, z: number) => {
  // Create a gentle rolling terrain
  return Math.sin(x * 0.2) * Math.cos(z * 0.2) * 1.2;
};

function App() {
  const [state, setState] = useState<SimulationState>({
    objects: [],
    logs: [{ id: '1', type: 'success', message: 'Uplink Established. Terrain Analysis Online.', timestamp: Date.now() }],
    knowledgeBase: [],
    currentGoal: INITIAL_GOAL,
    learningIteration: 0,
    networkStatus: 'uplink_active',
    activePlan: undefined,
    progression: {
      complexityLevel: 1,
      structuresCompleted: 0,
      totalBlocks: 0,
      unlockedBlueprints: ['Base Wall', 'Modular Synthesis', 'Terrain Adaption']
    },
    ui: {
      showStats: true,
      showKnowledge: true,
      showLogs: true,
      showPlanning: true
    }
  });

  const [avatarPos, setAvatarPos] = useState<[number, number, number]>([0, 0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuto, setIsAuto] = useState(true);
  const [currentTask, setCurrentTask] = useState<string>("Scanning Elevation...");
  const [taskProgress, setTaskProgress] = useState(0);
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'action') => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: Math.random().toString(), type, message, timestamp: Date.now() }]
    }));
  }, []);

  const toggleUI = (key: keyof SimulationState['ui']) => {
    setState(prev => ({
      ...prev,
      ui: { ...prev.ui, [key]: !prev.ui[key] }
    }));
  };

  const runSimulationStep = useCallback(async () => {
    console.log("runSimulationStep called"); // Debug log
    if (isProcessing) return;
    setIsProcessing(true);
    setState(prev => ({ ...prev, networkStatus: 'syncing' }));
    setTaskProgress(20);

    try {
      const decision: AIActionResponse = await decideNextAction(
        state.logs, 
        state.objects, 
        state.currentGoal, 
        state.knowledgeBase,
        getTerrainHeight,
        state.activePlan
      );
      
      setCurrentTask(decision.taskLabel);
      setTaskProgress(50);

      if (decision.action === 'PLACE') {
        let nextPlan = decision.plan || state.activePlan;
        const targetType = decision.objectType || (nextPlan ? nextPlan.steps[nextPlan.currentStepIndex].type : 'modular_unit');
        let targetPos = decision.position || (nextPlan ? nextPlan.steps[nextPlan.currentStepIndex].position : [0,0,0]);

        // Snap target position to terrain height if AI didn't calculate it perfectly
        const terrainY = getTerrainHeight(targetPos[0], targetPos[2]);
        if (targetPos[1] < terrainY) {
          targetPos = [targetPos[0], terrainY, targetPos[2]];
        }

        addLog(`Construction: Placing ${targetType} at elev=${targetPos[1].toFixed(2)}m`, 'action');
        
        setAvatarPos(targetPos as [number, number, number]);
        setTaskProgress(80);
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setTaskProgress(100);
        await new Promise(resolve => setTimeout(resolve, 200));

        const newObj: WorldObject = {
          id: Math.random().toString(),
          type: targetType as any,
          position: targetPos as [number, number, number],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          timestamp: Date.now()
        };

        setState(prev => {
          let updatedPlan = decision.plan || prev.activePlan;
          if (updatedPlan) {
            const nextIdx = updatedPlan.currentStepIndex + (decision.plan ? 0 : 1);
            if (nextIdx < updatedPlan.steps.length) {
              updatedPlan = { ...updatedPlan, currentStepIndex: nextIdx };
            } else {
              updatedPlan = undefined;
              addLog("Plan sequence concluded. Performance within parameters.", "success");
            }
          }

          const newTotal = prev.progression.totalBlocks + 1;
          const newKnowledge = [...prev.knowledgeBase];
          const kTitle = decision.learningNote.split(':')[0] || "Architecture Insight";
          
          if (!newKnowledge.find(k => k.title === kTitle)) {
            newKnowledge.push({
              id: Math.random().toString(),
              title: kTitle,
              description: decision.learningNote,
              iteration: prev.learningIteration,
              timestamp: Date.now(),
              links: decision.groundingLinks
            });
          }

          return {
            ...prev,
            objects: [...prev.objects, newObj],
            learningIteration: prev.learningIteration + 1,
            activePlan: updatedPlan,
            knowledgeBase: newKnowledge,
            progression: {
              ...prev.progression,
              totalBlocks: newTotal,
              complexityLevel: Math.floor(newTotal / 10) + 1,
              structuresCompleted: prev.progression.structuresCompleted + (targetType === 'modular_unit' ? 1 : 0),
              unlockedBlueprints: prev.progression.unlockedBlueprints
            }
          };
        });
      } else if (decision.action === 'MOVE' && decision.position) {
        const movePos: [number, number, number] = [
          decision.position[0], 
          getTerrainHeight(decision.position[0], decision.position[2]), 
          decision.position[2]
        ];
        setAvatarPos(movePos);
        addLog(`Repositioning: ${decision.reason}`, 'action');
      } else {
        addLog(`Sector Standby: ${decision.reason}`, 'action');
      }
    } catch (e) {
      addLog("Uplink Interference: Re-syncing sector data.", "error");
    } finally {
      setIsProcessing(false);
      setTaskProgress(0);
      setState(prev => ({ ...prev, networkStatus: 'uplink_active' }));
      setCurrentTask(isAuto ? "Scanning Elevation..." : "Standby");
    }
  }, [isProcessing, state.logs, state.objects, state.currentGoal, state.activePlan, state.knowledgeBase, isAuto, addLog]);

  useEffect(() => {
    let timer: number;
    if (isAuto && !isProcessing) {
      timer = window.setTimeout(() => {
        runSimulationStep();
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isAuto, isProcessing, runSimulationStep]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [state.logs]);

  return (
    <div className="relative w-full h-screen overflow-hidden text-slate-200 bg-slate-950 font-sans italic-font">
      {/* HUD CONTROLS */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 items-end">
        <div className="flex gap-2">
          <button onClick={() => toggleUI('showStats')} className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase border transition-all ${state.ui.showStats ? 'bg-sky-500 text-white' : 'bg-slate-900/50 text-slate-400 border-slate-700'}`}>Stats</button>
          <button onClick={() => toggleUI('showKnowledge')} className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase border transition-all ${state.ui.showKnowledge ? 'bg-indigo-500 text-white' : 'bg-slate-900/50 text-slate-400 border-slate-700'}`}>DB</button>
          <button onClick={() => toggleUI('showPlanning')} className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase border transition-all ${state.ui.showPlanning ? 'bg-emerald-500 text-white' : 'bg-slate-900/50 text-slate-400 border-slate-700'}`}>Plan</button>
          <button onClick={() => toggleUI('showLogs')} className={`px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase border transition-all ${state.ui.showLogs ? 'bg-slate-600 text-white' : 'bg-slate-900/50 text-slate-400 border-slate-700'}`}>Logs</button>
        </div>
        <div className="mt-2 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur">
          <div className={`w-2 h-2 rounded-full ${state.networkStatus === 'syncing' ? 'bg-sky-400 animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{state.networkStatus === 'syncing' ? 'Analyzing Environment...' : 'Link Active'}</span>
        </div>
      </div>

      {/* PLANNING UI */}
      {state.ui.showPlanning && state.activePlan && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-96 p-5 bg-emerald-950/90 backdrop-blur-xl border border-emerald-500/40 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-4 border-b border-emerald-500/20 pb-2">
            <span className="text-xs font-black uppercase text-emerald-300">Synthesis Plan</span>
            <span className="text-[10px] font-mono text-emerald-400/60">{state.activePlan.currentStepIndex + 1}/{state.activePlan.steps.length}</span>
          </div>
          <div className="space-y-2">
            {state.activePlan.steps.map((step, idx) => (
              <div key={idx} className={`p-2 rounded-lg border flex justify-between items-center ${idx === state.activePlan!.currentStepIndex ? 'bg-emerald-500/20 border-emerald-500' : 'bg-slate-950/20 border-slate-800 opacity-40'}`}>
                <span className="text-[10px] font-bold">{step.label}</span>
                <span className="text-[8px] font-mono opacity-50">Y:{step.position[1].toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HUD PANELS */}
      {state.ui.showStats && (
        <div className="absolute top-6 left-6 z-10 w-80 p-6 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-10 bg-sky-500 rounded-full" />
            <div><h1 className="text-xl font-black text-white italic uppercase">Architect-OS</h1><div className="text-[9px] text-sky-400 font-mono tracking-widest">Terrain Aware Node</div></div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-black/40 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Directive</div>
              <div className="text-sm font-semibold text-sky-100">{currentTask}</div>
              {isProcessing && <div className="mt-3 w-full h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${taskProgress}%` }} /></div>}
            </div>
          </div>
        </div>
      )}

      {/* RENDERER */}
      <div className="w-full h-full">
        <SimulationCanvas 
          objects={state.objects} 
          avatarPos={avatarPos} 
          avatarTarget={null} 
          activePlan={state.activePlan} 
        />
      </div>

      <div className="absolute bottom-6 right-6 z-10 flex gap-3">
        <div className="flex bg-slate-900/90 backdrop-blur border border-slate-700/50 rounded-2xl p-1.5">
          <button onClick={() => setIsAuto(true)} className={`px-5 py-2 rounded-lg text-[10px] font-bold transition-all ${isAuto ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-500'}`}>AUTO</button>
          <button onClick={() => setIsAuto(false)} className={`px-5 py-2 rounded-lg text-[10px] font-bold transition-all ${!isAuto ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>MANUAL</button>
        </div>
        <button onClick={() => { console.log('Initiate Synthesis clicked'); runSimulationStep(); }} disabled={isProcessing} className="px-10 h-16 bg-red-500 text-white rounded-2xl font-black uppercase tracking-tighter transition-all shadow-xl disabled:opacity-50">Initiate Synthesis</button>
      </div>

    </div>
  );
}

export default App;
