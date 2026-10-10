/**
 * LabMate - Interactive Virtual Electronics Laboratory
 * Core experiment workspace supporting Ohm's Law, Series, Parallel, KVL, KCL,
 * Voltage Divider, and RC transient circuits.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EXPERIMENTS } from '../data/experiments';
import { ExperimentDefinition, CircuitComponent, Wire, ComponentType, MistakeDiagnostic } from '../types/circuit';
import { simulateCircuit } from '../services/simulationEngine';
import { StorageService } from '../services/storageService';
import { ComponentPalette } from '../components/circuit/ComponentPalette';
import { CircuitCanvas } from '../components/circuit/CircuitCanvas';
import { InstrumentPanel } from '../components/circuit/InstrumentPanel';
import { ProcedureStepper } from '../components/circuit/ProcedureStepper';
import { MistakeFeedbackCard } from '../components/circuit/MistakeFeedbackCard';
import { LabMentorDrawer } from '../components/circuit/LabMentorDrawer';
import {
  BookOpen,
  Bot,
  Layers,
  Compass,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
  Info
} from 'lucide-react';

export const VirtualLab: React.FC = () => {
  const [selectedExpId, setSelectedExpId] = useState<string>('ohms-law');
  const [activeExperiment, setActiveExperiment] = useState<ExperimentDefinition>(EXPERIMENTS[0]);

  // Circuit Workspace State
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [powerSupplyOn, setPowerSupplyOn] = useState<boolean>(true);
  const [selectedComponent, setSelectedComponent] = useState<CircuitComponent | null>(null);

  // Guided Procedure State
  const [isGuidedMode, setIsGuidedMode] = useState<boolean>(true);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedStepIndices, setCompletedStepIndices] = useState<number[]>([]);

  // Lab Mentor State
  const [isMentorOpen, setIsMentorOpen] = useState<boolean>(false);
  const [mentorInitialQuery, setMentorInitialQuery] = useState<string | undefined>(undefined);

  // RC Transient dynamic state
  const [rcTimeSeconds, setRcTimeSeconds] = useState<number>(0);
  const [isPlayingRc, setIsPlayingRc] = useState<boolean>(false);
  const rcTimerRef = useRef<number | null>(null);

  // Lab Manual Modal toggle
  const [showManualModal, setShowManualModal] = useState<boolean>(false);

  // Time tracking for attempt recording
  const startTimeRef = useRef<number>(Date.now());

  // Load experiment definition when selectedExpId changes
  useEffect(() => {
    const exp = EXPERIMENTS.find(e => e.id === selectedExpId) || EXPERIMENTS[0];
    setActiveExperiment(exp);
    // Load default components & wires
    setComponents(JSON.parse(JSON.stringify(exp.defaultComponents)));
    setWires(JSON.parse(JSON.stringify(exp.defaultWires)));
    setCurrentStepIndex(0);
    setCompletedStepIndices([]);
    setRcTimeSeconds(0);
    setIsPlayingRc(false);
    setSelectedComponent(null);
    startTimeRef.current = Date.now();
  }, [selectedExpId]);

  // RC Transient playback loop
  useEffect(() => {
    if (isPlayingRc && activeExperiment.id === 'rc-transient') {
      rcTimerRef.current = window.setInterval(() => {
        setRcTimeSeconds(prev => {
          if (prev >= 6.0) {
            setIsPlayingRc(false);
            return 6.0;
          }
          return parseFloat((prev + 0.1).toFixed(2));
        });
      }, 100);
    } else {
      if (rcTimerRef.current) clearInterval(rcTimerRef.current);
    }
    return () => {
      if (rcTimerRef.current) clearInterval(rcTimerRef.current);
    };
  }, [isPlayingRc, activeExperiment.id]);

  // Execute deterministic circuit simulation
  const readings = simulateCircuit(
    components,
    wires,
    powerSupplyOn,
    activeExperiment.id,
    rcTimeSeconds
  );

  // Handlers for adding components
  const handleAddComponent = (type: ComponentType) => {
    const id = `${type.toLowerCase()}-${Date.now()}`;
    let newComp: CircuitComponent;

    switch (type) {
      case 'DC_SOURCE':
        newComp = {
          id,
          type: 'DC_SOURCE',
          label: `DC Source (${components.filter(c => c.type === 'DC_SOURCE').length + 1})`,
          x: 100,
          y: 200,
          rotation: 0,
          terminals: [
            { id: `${id}-pos`, name: 'pos', componentId: id, relX: 40, relY: -20 },
            { id: `${id}-neg`, name: 'neg', componentId: id, relX: 40, relY: 20 }
          ],
          properties: { voltage: 10 }
        };
        break;
      case 'RESISTOR':
        newComp = {
          id,
          type: 'RESISTOR',
          label: `R${components.filter(c => c.type === 'RESISTOR').length + 1}`,
          x: 350,
          y: 200,
          rotation: 0,
          terminals: [
            { id: `${id}-a`, name: 'A', componentId: id, relX: -45, relY: 0 },
            { id: `${id}-b`, name: 'B', componentId: id, relX: 45, relY: 0 }
          ],
          properties: { resistance: 100 }
        };
        break;
      case 'SWITCH':
        newComp = {
          id,
          type: 'SWITCH',
          label: `Switch S${components.filter(c => c.type === 'SWITCH').length + 1}`,
          x: 250,
          y: 120,
          rotation: 0,
          terminals: [
            { id: `${id}-a`, name: 'A', componentId: id, relX: -35, relY: 0 },
            { id: `${id}-b`, name: 'B', componentId: id, relX: 35, relY: 0 }
          ],
          properties: { closed: true }
        };
        break;
      case 'GROUND':
        newComp = {
          id,
          type: 'GROUND',
          label: 'GND',
          x: 300,
          y: 350,
          rotation: 0,
          terminals: [
            { id: `${id}-gnd`, name: 'gnd', componentId: id, relX: 0, relY: -20 }
          ],
          properties: {}
        };
        break;
      case 'CAPACITOR':
        newComp = {
          id,
          type: 'CAPACITOR',
          label: `Capacitor C${components.filter(c => c.type === 'CAPACITOR').length + 1}`,
          x: 480,
          y: 200,
          rotation: 90,
          terminals: [
            { id: `${id}-pos`, name: 'pos', componentId: id, relX: 0, relY: -40 },
            { id: `${id}-neg`, name: 'neg', componentId: id, relX: 0, relY: 40 }
          ],
          properties: { capacitance: 100 }
        };
        break;
      case 'VOLTMETER':
        newComp = {
          id,
          type: 'VOLTMETER',
          label: 'Voltmeter',
          x: 420,
          y: 80,
          rotation: 0,
          terminals: [
            { id: `${id}-pos`, name: 'pos', componentId: id, relX: -25, relY: 0 },
            { id: `${id}-neg`, name: 'neg', componentId: id, relX: 25, relY: 0 }
          ],
          properties: {}
        };
        break;
      case 'AMMETER':
        newComp = {
          id,
          type: 'AMMETER',
          label: 'Ammeter',
          x: 220,
          y: 80,
          rotation: 0,
          terminals: [
            { id: `${id}-pos`, name: 'pos', componentId: id, relX: -25, relY: 0 },
            { id: `${id}-neg`, name: 'neg', componentId: id, relX: 25, relY: 0 }
          ],
          properties: {}
        };
        break;
      default:
        return;
    }

    setComponents([...components, newComp]);
    setSelectedComponent(newComp);
  };

  const handleResetCircuit = () => {
    setComponents(JSON.parse(JSON.stringify(activeExperiment.defaultComponents)));
    setWires(JSON.parse(JSON.stringify(activeExperiment.defaultWires)));
    setPowerSupplyOn(true);
    setRcTimeSeconds(0);
    setIsPlayingRc(false);
    setSelectedComponent(null);
  };

  const handleStepVerified = (index: number) => {
    if (!completedStepIndices.includes(index)) {
      const nextCompleted = [...completedStepIndices, index];
      setCompletedStepIndices(nextCompleted);

      // Record experiment attempt progress
      if (nextCompleted.length === activeExperiment.guidedSteps.length) {
        StorageService.recordAttempt({
          experimentId: activeExperiment.id,
          experimentTitle: activeExperiment.title,
          timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
          isCompleted: true,
          mistakesCount: readings.diagnostics.length,
          correctedMistakesCount: readings.diagnostics.length === 0 ? 1 : 0,
          stepsCompleted: nextCompleted.length,
          totalSteps: activeExperiment.guidedSteps.length,
          finalReadings: {
            voltage: readings.sourceVoltage,
            current: readings.totalCurrent,
            resistance: readings.totalResistance,
            power: readings.totalPower
          }
        });
      }
    }
  };

  const handleAskMentorAboutMistake = (diag: MistakeDiagnostic) => {
    const query = `Can you explain why my circuit has this issue: "${diag.what}" at ${diag.where}? What is the concept of ${diag.concept}?`;
    setMentorInitialQuery(query);
    setIsMentorOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Experiment Selector & Mode Switch Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Select Experiment:</span>
            <select
              value={selectedExpId}
              onChange={(e) => setSelectedExpId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-cyan-700 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {EXPERIMENTS.map(exp => (
                <option key={exp.id} value={exp.id} className="bg-white text-slate-800">
                  Exp {exp.number}: {exp.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 hover:text-slate-900 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-700" />
            <span>Lab Manual & Theory</span>
          </button>
        </div>

        {/* Mode Switch: Guided vs Free Practice */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <button
              onClick={() => setIsGuidedMode(true)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                isGuidedMode
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Guided Procedure
            </button>
            <button
              onClick={() => setIsGuidedMode(false)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                !isGuidedMode
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Free Practice
            </button>
          </div>

          <button
            onClick={() => {
              setMentorInitialQuery(undefined);
              setIsMentorOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-500/50 text-xs text-cyan-700 font-medium transition-colors"
          >
            <Bot className="w-4 h-4 text-cyan-700" />
            <span>Lab Mentor</span>
          </button>
        </div>
      </div>

      {/* 2. Main Lab 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Component Rack & Procedure / Theory (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <ComponentPalette onAddComponent={handleAddComponent} />

          {isGuidedMode ? (
            <ProcedureStepper
              steps={activeExperiment.guidedSteps}
              currentStepIndex={currentStepIndex}
              completedStepIndices={completedStepIndices}
              components={components}
              wires={wires}
              readings={readings}
              onAdvanceStep={() => setCurrentStepIndex(prev => Math.min(activeExperiment.guidedSteps.length - 1, prev + 1))}
              onSetStepIndex={setCurrentStepIndex}
              onStepVerified={handleStepVerified}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-cyan-700">
                <Compass className="w-4 h-4" />
                <span>Free Practice Sandbox</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                You are in unrestricted practice mode. Place components, wire custom resistor networks, change values, and inspect deterministic multi-meter readings without guided procedure steps.
              </p>
            </div>
          )}

          {/* Quick Theory Callout Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 border-b border-slate-200/70 pb-1.5">
              <Info className="w-4 h-4 text-cyan-700" />
              <span>Experiment Overview</span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed line-clamp-3">
              {activeExperiment.aim}
            </p>
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-200/50">
              <span className="text-[11px] text-slate-600 font-semibold">Key Formulas:</span>
              {activeExperiment.formulas.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] font-mono text-cyan-700 bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
                  <span>{f.name}:</span>
                  <span className="text-amber-600">{f.formula}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Circuit Workspace & Instruments (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <CircuitCanvas
            components={components}
            wires={wires}
            readings={readings}
            powerSupplyOn={powerSupplyOn}
            onUpdateComponents={setComponents}
            onUpdateWires={setWires}
            onSelectComponent={setSelectedComponent}
            selectedComponent={selectedComponent}
          />

          <InstrumentPanel
            readings={readings}
            powerSupplyOn={powerSupplyOn}
            onTogglePower={() => setPowerSupplyOn(!powerSupplyOn)}
            onResetCircuit={handleResetCircuit}
            experimentId={activeExperiment.id}
            rcTimeSeconds={rcTimeSeconds}
            onUpdateRcTime={setRcTimeSeconds}
            isPlayingRc={isPlayingRc}
            onTogglePlayRc={() => setIsPlayingRc(!isPlayingRc)}
          />

          <MistakeFeedbackCard
            diagnostics={readings.diagnostics}
            onAskMentorAboutMistake={handleAskMentorAboutMistake}
          />
        </div>
      </div>

      {/* Lab Manual & Theory Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-700">Lab Manual · Exp {activeExperiment.number}</span>
                <h2 className="text-lg font-bold text-slate-900">{activeExperiment.title}</h2>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div>
                <h4 className="font-semibold text-cyan-700 mb-1">Aim of Experiment</h4>
                <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">{activeExperiment.aim}</p>
              </div>

              <div>
                <h4 className="font-semibold text-cyan-700 mb-1">Theoretical Background</h4>
                <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">{activeExperiment.theory}</p>
              </div>

              <div>
                <h4 className="font-semibold text-cyan-700 mb-1">Required Apparatus</h4>
                <ul className="list-disc list-inside bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  {activeExperiment.requiredApparatus.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-cyan-700 mb-1">Standard Laboratory Procedure</h4>
                <ol className="list-decimal list-inside bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                  {activeExperiment.procedure.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-cyan-700 mb-1">Safety Precautions</h4>
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-800 space-y-1">
                  {activeExperiment.safetyNotes.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lab Mentor AI Assistant Drawer */}
      <LabMentorDrawer
        context={{
          experimentTitle: activeExperiment.title,
          experimentAim: activeExperiment.aim,
          currentStep: isGuidedMode ? activeExperiment.guidedSteps[currentStepIndex]?.title : undefined,
          readings
        }}
        isOpen={isMentorOpen}
        onClose={() => setIsMentorOpen(false)}
        initialQuery={mentorInitialQuery}
      />
    </div>
  );
};
