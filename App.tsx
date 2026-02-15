
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { WorldObject, LogEntry, SimulationState, KnowledgeEntry, GroundingLink, ConstructionPlan, KnowledgeCategory, SettlementTier } from './types';
import { decideNextAction, AIActionResponse } from './services/aiLogic';

const PROXY_URL = "apiland.yusufsamodin67.workers.dev";
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
    logs: [{ id: '1', type: 'success', message: `Uplink established via ${PROXY_URL}`, timestamp: Date.now() }],
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
      unlockedBlueprints: ['Geothermal Core', 'Neural Scaling'],
      settlementTier: 'Outpost'
    },
    ui: { showStats: true, showKnowledge: true, showLogs: true, showPlanning: true }
  });

  const [avatarPos, setAvatarPos] = useState<[number, number, number]>([0, 0, 0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuto, setIsAuto] = useState(true);
  const [currentTask, setCurrentTask] = useState<string>("Standby for Neural Input...");
  const [taskProgress, setTaskProgress] = useState(0);
  const [latency, setLatency] = useState(0);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'action') => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: Math.random().toString(), type, message, timestamp: Date.now() }]
    }));
  }, []);

  const runSimulationStep = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const startTime = Date.now();
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
      
      setLatency(Date.now() - startTime);
      setTaskProgress(30);
      
      if (decision.reasoningSteps) {
        for (const step of decision.reasoningSteps) {
          addLog(`[SYNAPSE]: ${step}`, 'thinking');
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

        addLog(`DATA_SYNTH_DEPLOY: ${targetType} via Proxy Node`, 'success');
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
            }
          }

          const newTotal = prev.objects.length + 1;
          let tier: SettlementTier = 'Outpost';
          if (newTotal > 15) tier = 'Citadel';
          else if (newTotal > 8) tier = 'Settlement';
          else if (newTotal > 4) tier = 'Colony';

          let nextGoal = prev.currentGoal;
          if (newTotal > 12) nextGoal = GOAL_SEQUENCE[3];
          else if (newTotal > 7) nextGoal = GOAL_SEQUENCE[2];
          else if (newTotal > 3) nextGoal = GOAL_SEQUENCE[1];

          const newKnowledge = [...prev.knowledgeBase];
          const title = decision.learningNote.split(':')[0] || "Neural Synthesis";
          
          if (!newKnowledge.some(k => k.title === title)) {
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
          }

          return {
            ...prev,
            objects: [...prev.objects, newObj],
            currentGoal: nextGoal,
            learningIteration: prev.learningIteration + 1,
            activePlan: updatedPlan,
            knowledgeBase: newKnowledge,
            progression: {
              ...prev.progression,
              totalBlocks: newTotal,
              settlementTier: tier,
              complexityLevel: Math.floor(newTotal / 4) + 1
            }
          };
        });
      } else if (decision.action === 'MOVE') {
        const movePos = decision.position || [avatarPos[0] + (Math.random() - 0.5) * 15, 0, avatarPos[2] + (Math.random() - 0.5) * 15];
        setAvatarPos([movePos[0], getTerrainHeight(movePos[0], movePos[2]), movePos[2]]);
        addLog(`RECALIBRATING_SECTOR: Querying for new coordinates.`, 'action');
      }
    } catch (e) {
      addLog("Neural link timeout. Retrying connectivity...", "error");
    } finally {
      setIsProcessing(false);
      setTaskProgress(0);
      setState(prev => ({ ...prev, networkStatus: 'uplink_active', isScanning: false }));
      setCurrentTask(isAuto ? "Streaming Neural Data..." : "Manual Standby");
    }
  }, [isProcessing, state, isAuto, addLog, avatarPos]);

  // Fix: Implemented triggerScan to manually invoke the simulation step from the UI.
  const triggerScan = useCallback(() => {
    if (!isProcessing) {
      runSimulationStep();
    }
  }, [isProcessing, runSimulationStep]);

  useEffect(() => {
    if (isAuto && !isProcessing) {
      const t = setTimeout(runSimulationStep, 4500);
      return () => clearTimeout(t);
    }
  }, [isAuto, isProcessing, runSimulationStep]);

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.logs]);

  return (
    <div className="relative w-full h-screen overflow-hidden text-slate-100 bg-[#010409] font-sans selection:bg-sky-500/30">
      {/* API BRIDGE VISUALIZER */}
      <div className="absolute top-24 left-8 z-20 flex flex-col gap-3 group">
        <div className="flex items-center gap-4 bg-black/60 backdrop-blur-2xl px-6 py-4 rounded-[30px] border border-white/10 shadow-2xl transition-all hover:border-sky-500/50">
          <div className="relative">
             <div className="w-10 h-10 bg-sky-500/20 rounded-2xl flex items-center justify-center border border-sky-500/30">
                <svg className="w-6 h-6 text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.649.5.5 5.649.5 12s5.149 11.5 11.5 11.5 11.5-5.149 11.5-11.5S18.351.5 12 .5zm6.812 11.968c-.144.156-.3.3-.45.425a7.8 7.8 0 01-.482.4c-.112.081-.231.15-.35.225-.262.163-.538.288-.825.4a4.341 4.341 0 01-.65.175c-.175.031-.35.05-.538.069a5.352 5.352 0 01-.581.019c-.319-.012-.619-.056-.913-.131a4.238 4.238 0 01-.844-.319c-.119-.063-.238-.131-.35-.206a4.417 4.417 0 01-.65-.55c-.156-.169-.3-.356-.425-.55-.062-.094-.125-.194-.181-.294a4.12 4.12 0 01-.269-.6c-.037-.125-.069-.25-.094-.375a3.634 3.634 0 01-.037-.419c-.006-.112 0-.219.012-.331a3.614 3.614 0 01.119-.7c.05-.169.112-.338.194-.5a4.316 4.316 0 01.487-.738c.113-.138.238-.263.369-.381.181-.163.381-.306.6-.431.069-.038.144-.069.219-.1.256-.119.525-.213.806-.275.144-.031.288-.056.431-.069a3.81 3.81 0 01.4-.019c.306.012.606.063.894.15a4.675 4.675 0 01.831.363c.125.075.244.15.356.238.106.081.213.169.313.262l-1.013.944a2.955 2.955 0 00-.731-.5c-.219-.1-.45-.169-.7-.188-.119-.012-.244-.012-.363 0a1.868 1.868 0 00-.638.169c-.238.113-.444.275-.594.481a2.38 2.38 0 00-.413.831 2.372 2.372 0 00-.037.931 2.21 2.21 0 00.312.831 2.44 2.44 0 00.6.638c.088.069.181.125.281.181.213.112.444.188.688.206a2.022 2.022 0 00.419 0c.2-.025.394-.081.575-.163.138-.063.269-.144.388-.238a2.385 2.385 0 00.35-.35l1.012.912z"/></svg>
             </div>
             {isProcessing && <div className="absolute -inset-1 border-2 border-sky-400 rounded-2xl animate-ping opacity-20" />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 leading-none">Proxy Uplink</span>
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black rounded uppercase">Verified</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-sky-100">{PROXY_URL}</span>
          </div>
          <div className="h-8 w-px bg-white/10 mx-2" />
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-white/20 uppercase">Lat_MS</span>
            <span className="text-sm font-mono font-bold text-white">{latency || '--'}</span>
          </div>
        </div>
        
        {/* Animated Data Stream */}
        {isProcessing && (
          <div className="flex gap-1 ml-6 mt-1 overflow-hidden h-4 w-32 items-center">
             {[...Array(6)].map((_, i) => (
               <div key={i} className="w-1 h-1 bg-sky-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
             ))}
             <span className="text-[8px] font-mono text-sky-400/50 uppercase ml-2 animate-pulse">Handshake...</span>
          </div>
        )}
      </div>

      {/* HUD CONTROLS */}
      <div className="absolute top-8 right-8 z-20 flex flex-col gap-4 items-end animate-in fade-in slide-in-from-right-10 duration-1000">
        <div className="flex bg-black/60 backdrop-blur-2xl p-1.5 rounded-3xl border border-white/5 shadow-2xl">
          {['Stats', 'Knowledge', 'Planning', 'Logs'].map((k) => (
            <button key={k} onClick={() => setState(p => ({ ...p, ui: { ...p.ui, [`show${k}`]: !p.ui[`show${k}` as keyof SimulationState['ui']] } }))}
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${state.ui[`show${k}` as keyof SimulationState['ui']] ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/40' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
              {k === 'Knowledge' ? 'Neural' : k}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-xl shadow-inner">
          <div className={`w-2 h-2 rounded-full ${state.networkStatus === 'syncing' ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}`} />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">NODE_UPLINK: {state.networkStatus === 'syncing' ? 'SYNTHESIZING' : 'ACTIVE'}</span>
        </div>
      </div>

      {/* PLANNING HUD */}
      {state.ui.showPlanning && state.activePlan && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 w-[440px] p-8 bg-black/80 backdrop-blur-[60px] border border-white/10 rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-700">
          <div className="flex flex-col gap-1 mb-6 border-l-2 border-emerald-500 pl-5">
            <span className="text-[9px] font-black uppercase text-emerald-400/40 tracking-[0.4em]">Synaptic Chain</span>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">{state.activePlan.objective}</h2>
          </div>
          <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
            {state.activePlan.steps.map((step, idx) => (
              <div key={idx} className={`relative flex items-center justify-between p-4 rounded-[20px] border transition-all duration-500 ${step.status === 'active' ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : step.status === 'completed' ? 'bg-white/5 border-white/5 opacity-40' : 'bg-transparent border-white/5 opacity-20'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${step.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-white/10'}`} />
                  <span className="text-xs font-bold tracking-tight uppercase">{step.label}</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-300/30">L_{idx.toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATS PANEL - NEURAL REPO STYLE */}
      {state.ui.showStats && (
        <div className="absolute top-8 left-8 z-10 w-[320px] p-8 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-2xl animate-in slide-in-from-left-10 duration-1000">
          <div className="flex items-center gap-5 mb-10">
            <div className="w-1.5 h-12 bg-sky-400 rounded-full shadow-[0_0_20px_#38bdf8]" />
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-white leading-none uppercase">Architect_OS</h1>
              <div className="text-[10px] font-mono text-sky-400/40 tracking-[0.3em] mt-1.5 uppercase">Lattice_{state.progression.settlementTier}</div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
              <span className="text-[9px] font-black uppercase text-white/20 tracking-[0.2em] block mb-2">Neural Activity</span>
              <p className="text-sm font-bold text-sky-100 leading-snug">{currentTask}</p>
              {isProcessing && <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-sky-400 transition-all duration-700" style={{ width: `${taskProgress}%` }} /></div>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5"><div className="text-[8px] font-black text-white/10 uppercase mb-1">Synapses</div><div className="text-2xl font-mono font-bold text-white">{state.progression.totalBlocks}</div></div>
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5"><div className="text-[8px] font-black text-white/10 uppercase mb-1">Scale_Factor</div><div className="text-2xl font-mono font-bold text-white">x{state.progression.complexityLevel.toFixed(1)}</div></div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-2">
            <button onClick={triggerScan} className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-all border border-white/5">Grid_Ping</button>
            <button className="px-3 py-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/15 text-[9px] font-black uppercase tracking-widest transition-all border border-rose-500/10 text-rose-300/60" onClick={() => window.location.reload()}>System_Reset</button>
          </div>
        </div>
      )}

      {/* NEURAL CORE PANEL */}
      {state.ui.showKnowledge && (
        <div className="absolute top-20 right-8 z-10 w-[420px] max-h-[75vh] flex flex-col bg-black/70 backdrop-blur-[50px] border border-white/10 rounded-[45px] shadow-2xl overflow-hidden animate-in slide-in-from-right-10 duration-1000">
          <div className="p-8 bg-white/5 border-b border-white/10 flex justify-between items-center">
            <span className="text-xs font-black uppercase text-white/40 tracking-[0.4em]">Synaptic Repository</span>
            <div className="flex gap-1.5"><div className="w-2 h-2 bg-sky-500 rounded-full shadow-[0_0_10px_#0ea5e9] animate-pulse" /></div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {state.knowledgeBase.length > 0 && <KnowledgeGraph entries={state.knowledgeBase} width={350} height={220} />}
            {state.knowledgeBase.length === 0 ? (
              <div className="py-24 text-center opacity-10 text-[9px] font-black uppercase tracking-[0.5em] animate-pulse">Waiting for proxy link...</div>
            ) : (
              state.knowledgeBase.slice().reverse().map((k) => (
                <div key={k.id} className={`p-6 rounded-[28px] border transition-all duration-500 ${k.isHighlight ? 'bg-sky-500/5 border-sky-400/30' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-black text-sky-400/60 uppercase tracking-[0.2em]">{k.category}</span>
                    <span className="text-[8px] font-mono text-white/10">PROXY_SYNTH_{k.iteration}</span>
                  </div>
                  <h4 className="text-xs font-black text-white/90 mb-2 uppercase italic tracking-tight">{k.title}</h4>
                  <p className="text-[11px] leading-relaxed text-white/40">{k.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY LOGS */}
      {state.ui.showLogs && (
        <div className="absolute bottom-8 left-8 z-10 w-[480px] h-[300px] bg-black/85 backdrop-blur-[60px] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl flex flex-col">
          <div className="px-8 py-5 border-b border-white/10 text-[9px] font-black uppercase text-white/20 tracking-[0.3em] flex items-center justify-between">
            <span>Uplink Console [apiland]</span>
            <div className="flex gap-1"><div className="w-1 h-1 bg-sky-500 rounded-full shadow-[0_0_5px_#0ea5e9]"/><div className="w-1 h-1 bg-sky-500/20 rounded-full"/></div>
          </div>
          <div ref={logContainerRef} className="flex-1 overflow-y-auto p-8 space-y-3 font-mono text-[10px]">
            {state.logs.map(log => (
              <div key={log.id} className={`flex gap-4 p-3.5 rounded-[18px] border transition-all duration-300 group hover:bg-white/5 ${log.type === 'success' ? 'bg-emerald-500/5 text-emerald-400/80 border-emerald-500/10' : log.type === 'error' ? 'bg-rose-500/5 text-rose-300/80 border-rose-500/10' : log.type === 'thinking' ? 'bg-sky-500/5 text-sky-400/60 italic border-l border-sky-400/20 ml-3' : 'bg-white/5 text-white/30 border-white/5'}`}>
                <span className="opacity-10 shrink-0 font-black">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="font-bold tracking-tight">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full h-full">
        <SimulationCanvas objects={state.objects} avatarPos={avatarPos} avatarTarget={null} activePlan={state.activePlan} isScanning={state.isScanning} tier={state.progression.settlementTier} />
      </div>

      {/* ACTION FOOTER */}
      <div className="absolute bottom-10 right-10 z-10 flex gap-5">
        <div className="bg-black/80 backdrop-blur-3xl p-2 rounded-[22px] border border-white/10 flex shadow-2xl shadow-black">
          <button onClick={() => setIsAuto(true)} className={`px-7 py-3 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isAuto ? 'bg-sky-500 text-white shadow-lg' : 'text-white/20 hover:text-white'}`}>Auto</button>
          <button onClick={() => setIsAuto(false)} className={`px-7 py-3 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${!isAuto ? 'bg-white text-slate-900' : 'text-white/20 hover:text-white'}`}>Manual</button>
        </div>
        <button onClick={runSimulationStep} disabled={isProcessing} className="group relative px-12 h-16 bg-white hover:bg-sky-50 text-slate-900 rounded-[24px] font-black uppercase italic tracking-tighter transition-all duration-300 shadow-2xl disabled:opacity-50 active:scale-95 flex items-center gap-3">
          <span className="relative z-10">Sync_Directive</span>
          <div className="w-2 h-2 bg-slate-900 rounded-full group-hover:animate-ping" />
        </button>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(1,4,9,0.9)_100%)]" />
    </div>
  );
}

export default App;
