
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { WorldObject, LogEntry, SimulationState, KnowledgeEntry, GroundingLink, ConstructionPlan, KnowledgeCategory, SettlementTier } from './types';
import { decideNextAction, AIActionResponse } from './services/aiLogic';

const GOAL_SEQUENCE = [
  "Synthesize Geothermal Energy Core",
  "Deploy Biospheric Life Support Mesh",
  "Construct Neural Uplink Spire",
  "Establish Multi-Sector Synthesis Citadel"
];

const getTerrainHeight = (x: number, z: number) => {
  return Math.sin(x * 0.2) * Math.cos(z * 0.2) * 1.2;
};

function App() {
  const [state, setState] = useState<SimulationState>({
    objects: [],
    logs: [{ id: '1', type: 'success', message: 'Architect-OS [Underworld_Link] Initialized.', timestamp: Date.now() }],
    knowledgeBase: [],
    currentGoal: GOAL_SEQUENCE[0],
    learningIteration: 0,
    networkStatus: 'uplink_active',
    activePlan: undefined,
    isScanning: false,
    progression: {
      complexityLevel: 1,
      structuresCompleted: 0,
      totalBlocks: 0,
      unlockedBlueprints: ['Core Protocol', 'Adaptive Clustering'],
      settlementTier: 'Outpost'
    },
    ui: { showStats: true, showKnowledge: true, showLogs: true, showPlanning: true }
  });

  const [avatarPos, setAvatarPos] = useState<[number, number, number]>([0, 0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuto, setIsAuto] = useState(true);
  const [currentTask, setCurrentTask] = useState<string>("Initializing Topology...");
  const [taskProgress, setTaskProgress] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'action') => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: Math.random().toString(), type, message, timestamp: Date.now() }]
    }));
  }, []);

  const purgeCache = useCallback(() => {
    setState(prev => ({
      ...prev,
      knowledgeBase: [],
      logs: [{ id: Date.now().toString(), type: 'success', message: 'Neural Cache Purged. System Resetting Logic Gates.', timestamp: Date.now() }],
      learningIteration: 0
    }));
    addLog("Manual Cache Purge Executed.", "error");
  }, [addLog]);

  const triggerScan = useCallback(() => {
    setState(prev => ({ ...prev, isScanning: true }));
    setTimeout(() => setState(prev => ({ ...prev, isScanning: false })), 3000);
  }, []);

  const runSimulationStep = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setState(prev => ({ ...prev, networkStatus: 'syncing', isScanning: true }));
    setTaskProgress(10);

    try {
      const decision: AIActionResponse = await decideNextAction(
        state.logs, 
        state.objects, 
        state.currentGoal, 
        state.knowledgeBase,
        getTerrainHeight,
        state.progression,
        state.activePlan
      );
      
      setTaskProgress(30);
      
      if (decision.reasoningSteps) {
        for (const step of decision.reasoningSteps) {
          addLog(`[REASONING]: ${step}`, 'thinking');
          await new Promise(r => setTimeout(r, 400));
        }
      }

      setCurrentTask(decision.taskLabel);
      setTaskProgress(60);

      if (decision.action === 'PLACE') {
        let nextPlan = decision.plan || state.activePlan;
        const targetType = decision.objectType || (nextPlan ? nextPlan.steps[nextPlan.currentStepIndex].type : 'modular_unit');
        let targetPos = decision.position || (nextPlan ? nextPlan.steps[nextPlan.currentStepIndex].position : [0,0,0]);

        targetPos = [targetPos[0], getTerrainHeight(targetPos[0], targetPos[2]), targetPos[2]];

        addLog(`Deploying ${targetType}...`, 'success');
        setAvatarPos(targetPos as [number, number, number]);
        
        await new Promise(r => setTimeout(r, 800));
        setTaskProgress(100);

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
            const steps = [...updatedPlan.steps];
            steps[updatedPlan.currentStepIndex].status = 'completed';
            const nextIdx = updatedPlan.currentStepIndex + (decision.plan ? 0 : 1);
            if (nextIdx < steps.length) {
              steps[nextIdx].status = 'active';
              updatedPlan = { ...updatedPlan, steps, currentStepIndex: nextIdx };
            } else {
              updatedPlan = undefined;
              addLog("Strategic Sequence Concluded.", "success");
            }
          }

          const newTotal = prev.objects.length + 1;
          let tier: SettlementTier = 'Outpost';
          if (newTotal > 15) tier = 'Citadel';
          else if (newTotal > 8) tier = 'Settlement';
          else if (newTotal > 4) tier = 'Colony';

          // Shift goals based on progress to avoid spirals
          let nextGoal = prev.currentGoal;
          if (newTotal > 12) nextGoal = GOAL_SEQUENCE[3];
          else if (newTotal > 7) nextGoal = GOAL_SEQUENCE[2];
          else if (newTotal > 3) nextGoal = GOAL_SEQUENCE[1];

          const newKnowledge = [...prev.knowledgeBase];
          const title = decision.learningNote.split(':')[0] || "Synthesis Logic";
          const snippet = decision.learningNote.substring(0, 30).toLowerCase();
          
          // Stricter Deduplication: check both title and content snippet
          const isDuplicate = newKnowledge.some(k => 
            k.title === title || k.description.toLowerCase().includes(snippet)
          );

          if (!isDuplicate) {
            newKnowledge.push({
              id: Math.random().toString(),
              title,
              description: decision.learningNote,
              category: decision.knowledgeCategory,
              iteration: prev.learningIteration,
              timestamp: Date.now(),
              links: decision.groundingLinks,
              isHighlight: true
            });
          } else {
            addLog("System Note: Redundant insight discarded.", "thinking");
          }

          return {
            ...prev,
            objects: [...prev.objects, newObj],
            currentGoal: nextGoal,
            learningIteration: prev.learningIteration + 1,
            activePlan: updatedPlan,
            knowledgeBase: newKnowledge.map(k => ({ ...k, isHighlight: k.title === title })),
            progression: {
              ...prev.progression,
              totalBlocks: newTotal,
              settlementTier: tier,
              complexityLevel: Math.floor(newTotal / 4) + 1
            }
          };
        });
      } else if (decision.action === 'MOVE') {
        const movePos = decision.position || [avatarPos[0] + (Math.random() - 0.5) * 10, 0, avatarPos[2] + (Math.random() - 0.5) * 10];
        setAvatarPos([movePos[0], getTerrainHeight(movePos[0], movePos[2]), movePos[2]]);
        addLog(`Relocating: Optimizing sector positioning.`, 'action');
      }
    } catch (e) {
      addLog("Neural link disruption. Re-routing...", "error");
    } finally {
      setIsProcessing(false);
      setTaskProgress(0);
      setState(prev => ({ ...prev, networkStatus: 'uplink_active', isScanning: false }));
      setCurrentTask(isAuto ? "Analyzing Sectors..." : "Standby");
    }
  }, [isProcessing, state, isAuto, addLog, avatarPos]);

  useEffect(() => {
    if (isAuto && !isProcessing) {
      const t = setTimeout(runSimulationStep, 5000);
      return () => clearTimeout(t);
    }
  }, [isAuto, isProcessing, runSimulationStep]);

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.logs]);

  return (
    <div className="relative w-full h-screen overflow-hidden text-slate-100 bg-[#010409] font-sans selection:bg-sky-500/30">
      {/* HUD CONTROLS */}
      <div className="absolute top-8 right-8 z-20 flex flex-col gap-4 items-end animate-in fade-in slide-in-from-right-10 duration-1000">
        <div className="flex bg-black/60 backdrop-blur-2xl p-2 rounded-3xl border border-white/5 shadow-2xl">
          {['Stats', 'Knowledge', 'Planning', 'Logs'].map((k) => (
            <button key={k} onClick={() => setState(p => ({ ...p, ui: { ...p.ui, [`show${k}`]: !p.ui[`show${k}` as keyof SimulationState['ui']] } }))}
              className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${state.ui[`show${k}` as keyof SimulationState['ui']] ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
              {k === 'Knowledge' ? 'Neural' : k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-xl shadow-inner">
          <div className={`w-2.5 h-2.5 rounded-full ${state.networkStatus === 'syncing' ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_12px_#34d399]'}`} />
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80">Link: {state.networkStatus === 'syncing' ? 'SYNTHESIZING' : 'ACTIVE'}</span>
        </div>
      </div>

      {/* PLANNING HUD */}
      {state.ui.showPlanning && state.activePlan && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 w-[480px] p-10 bg-black/70 backdrop-blur-[40px] border border-white/10 rounded-[50px] shadow-2xl animate-in zoom-in-95 duration-700">
          <div className="flex flex-col gap-2 mb-8 border-l-4 border-emerald-500 pl-6">
            <span className="text-[11px] font-black uppercase text-emerald-400/60 tracking-[0.5em]">Sequence Protocol</span>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{state.activePlan.objective}</h2>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {state.activePlan.steps.map((step, idx) => (
              <div key={idx} className={`relative flex items-center justify-between p-5 rounded-[25px] border transition-all duration-500 ${step.status === 'active' ? 'bg-emerald-500/15 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)] scale-105' : step.status === 'completed' ? 'bg-white/5 border-white/5 opacity-30' : 'bg-transparent border-white/5 opacity-15'}`}>
                <div className="flex items-center gap-5">
                  <div className={`w-3 h-3 rounded-full ${step.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                  <span className="text-sm font-bold tracking-tight uppercase">{step.label}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono text-emerald-300/40">TYPE_{step.type.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS PANEL */}
      {state.ui.showStats && (
        <div className="absolute top-8 left-8 z-10 w-[340px] p-10 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[45px] shadow-2xl animate-in slide-in-from-left-10 duration-1000">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-2 h-16 bg-sky-400 rounded-full shadow-[0_0_25px_#38bdf8]" />
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter text-white leading-none">ARCHITECT</h1>
              <div className="text-[11px] font-mono text-sky-400/60 tracking-[0.4em] mt-2 uppercase">{state.progression.settlementTier} Module</div>
            </div>
          </div>
          <div className="space-y-8">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 shadow-inner">
              <span className="text-[10px] font-black uppercase text-white/30 tracking-widest block mb-3">Neural Feedback</span>
              <p className="text-base font-bold text-sky-100 leading-snug">{currentTask}</p>
              {isProcessing && <div className="mt-5 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-sky-400 transition-all duration-1000 shadow-[0_0_8px_#38bdf8]" style={{ width: `${taskProgress}%` }} /></div>}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5"><div className="text-[9px] font-black text-white/20 uppercase mb-2">Synthesis</div><div className="text-3xl font-mono font-bold text-white leading-none">{state.progression.totalBlocks}</div></div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5"><div className="text-[9px] font-black text-white/20 uppercase mb-2">Complexity</div><div className="text-3xl font-mono font-bold text-white leading-none">T{state.progression.complexityLevel}</div></div>
            </div>
          </div>
          {/* Interaction Commands */}
          <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 gap-3">
            <button onClick={triggerScan} className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 hover:border-sky-500/50">Ping_Scan</button>
            <button onClick={purgeCache} className="px-4 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/20 text-rose-300">Purge_Cache</button>
          </div>
        </div>
      )}

      {/* NEURAL DB PANEL */}
      {state.ui.showKnowledge && (
        <div className="absolute top-24 right-8 z-10 w-[460px] max-h-[78vh] flex flex-col bg-black/70 backdrop-blur-[40px] border border-white/10 rounded-[50px] shadow-2xl overflow-hidden animate-in slide-in-from-right-10 duration-1000">
          <div className="p-10 bg-white/5 border-b border-white/10 flex justify-between items-center">
            <span className="text-sm font-black uppercase text-white tracking-[0.4em]">Neural Repository</span>
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_12px_#6366f1]" />
              <div className="w-2.5 h-2.5 bg-sky-500 rounded-full shadow-[0_0_12px_#0ea5e9] animate-pulse" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
            {state.knowledgeBase.length > 0 && <KnowledgeGraph entries={state.knowledgeBase} width={400} height={260} />}
            {state.knowledgeBase.length === 0 ? (
              <div className="py-32 text-center opacity-20 text-[11px] font-black uppercase tracking-[0.6em] animate-pulse">Establishing Archive Link...</div>
            ) : (
              state.knowledgeBase.slice().reverse().map((k) => (
                <div key={k.id} className={`p-8 rounded-[35px] border transition-all duration-500 ${k.isHighlight ? 'bg-indigo-500/10 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[11px] font-black text-sky-400 uppercase tracking-[0.2em]">{k.category}</span>
                    <span className="text-[9px] font-mono text-white/20 tracking-tighter">DATA_SYNTH_0{k.iteration}</span>
                  </div>
                  <h4 className="text-sm font-black text-white mb-3 uppercase italic tracking-tight">{k.title}</h4>
                  <p className="text-[12px] leading-relaxed text-white/60 font-medium">{k.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* LOGS PANEL */}
      {state.ui.showLogs && (
        <div className="absolute bottom-8 left-8 z-10 w-[520px] h-[350px] bg-black/80 backdrop-blur-[50px] border border-white/10 rounded-[45px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-1000 flex flex-col">
          <div className="px-10 py-6 border-b border-white/10 text-[11px] font-black uppercase text-white/40 tracking-[0.4em] flex items-center justify-between">
            <span>Direct Activity Link</span>
            <div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/><div className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full"/></div>
          </div>
          <div ref={logContainerRef} className="flex-1 overflow-y-auto p-10 space-y-4 font-mono text-[11px]">
            {state.logs.map(log => (
              <div key={log.id} className={`flex gap-5 p-5 rounded-[22px] border transition-all duration-500 group hover:bg-white/5 ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : log.type === 'error' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : log.type === 'thinking' ? 'bg-sky-500/5 text-sky-400/80 italic border-l-2 border-sky-400/40 ml-4' : 'bg-white/5 text-white/50 border-white/5'}`}>
                <span className="opacity-20 shrink-0 font-black">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="font-bold tracking-tight">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3D RENDERER */}
      <div className="w-full h-full">
        <SimulationCanvas objects={state.objects} avatarPos={avatarPos} avatarTarget={null} activePlan={state.activePlan} isScanning={state.isScanning} />
      </div>

      {/* FOOTER ACTION */}
      <div className="absolute bottom-10 right-10 z-10 flex gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <div className="bg-black/70 backdrop-blur-3xl p-2.5 rounded-[25px] border border-white/10 flex shadow-2xl shadow-black">
          <button onClick={() => setIsAuto(true)} className={`px-8 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${isAuto ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/30' : 'text-white/20 hover:text-white'}`}>Auto-Pilot</button>
          <button onClick={() => setIsAuto(false)} className={`px-8 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${!isAuto ? 'bg-white text-slate-950 shadow-xl' : 'text-white/20 hover:text-white'}`}>Manual</button>
        </div>
        <button onClick={runSimulationStep} disabled={isProcessing} className="group relative px-14 h-20 bg-white hover:bg-sky-50 text-slate-950 rounded-[30px] font-black uppercase italic tracking-tighter transition-all duration-500 shadow-2xl disabled:opacity-50 active:scale-95 flex items-center gap-4">
          <span className="relative z-10">Initiate Synthesis</span>
          <div className="w-2.5 h-2.5 bg-slate-950 rounded-full group-hover:animate-ping" />
          {isProcessing && <div className="absolute inset-0 bg-sky-500/20 animate-pulse rounded-[30px]" />}
        </button>
      </div>

      {/* VIGNETTE & FILM GRAIN */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(1,4,9,0.98)_100%)] opacity-95" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
}

export default App;
