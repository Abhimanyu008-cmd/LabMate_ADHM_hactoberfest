/**
 * LabMate - Guided Step-by-Step Procedure Stepper
 * Enforces rigorous laboratory procedure with deterministic condition validation.
 * Prevents skipping steps without satisfying electrical and connection constraints.
 */

import React, { useState } from 'react';
import { ExperimentStep, CircuitComponent, Wire, SimulationReadings } from '../../types/circuit';
import { CheckCircle2, AlertCircle, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface ProcedureStepperProps {
  steps: ExperimentStep[];
  currentStepIndex: number;
  completedStepIndices: number[];
  components: CircuitComponent[];
  wires: Wire[];
  readings: SimulationReadings;
  onAdvanceStep: () => void;
  onSetStepIndex: (index: number) => void;
  onStepVerified: (index: number) => void;
}

export const ProcedureStepper: React.FC<ProcedureStepperProps> = ({
  steps,
  currentStepIndex,
  completedStepIndices,
  components,
  wires,
  readings,
  onAdvanceStep,
  onSetStepIndex,
  onStepVerified
}) => {
  const [showHint, setShowHint] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    tested: boolean;
    passed: boolean;
    message: string;
  } | null>(null);

  const activeStep = steps[currentStepIndex];
  if (!activeStep) return null;

  const isCurrentStepCompleted = completedStepIndices.includes(currentStepIndex);

  const handleVerify = () => {
    try {
      const passed = activeStep.validator(components, wires, readings);
      if (passed) {
        setValidationResult({
          tested: true,
          passed: true,
          message: 'Step Verified! Electrical condition successfully satisfied.'
        });
        onStepVerified(currentStepIndex);
      } else {
        setValidationResult({
          tested: true,
          passed: false,
          message: `Target condition not met: "${activeStep.targetCondition}". Check connections or parameter values and retry.`
        });
      }
    } catch {
      setValidationResult({
        tested: true,
        passed: false,
        message: 'Validation could not verify the circuit state. Ensure components are connected.'
      });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3">
      {/* Step header and pill-free progress */}
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800">Guided Laboratory Procedure</span>
          <span className="text-[11px] text-slate-500">·</span>
          <span className="text-xs font-mono text-cyan-700">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
        </div>

        {/* Step indicator buttons */}
        <div className="flex items-center gap-1.5">
          {steps.map((st, idx) => {
            const isDone = completedStepIndices.includes(idx);
            const isCur = idx === currentStepIndex;
            return (
              <button
                key={st.stepNumber}
                onClick={() => {
                  onSetStepIndex(idx);
                  setValidationResult(null);
                  setShowHint(false);
                }}
                className={`w-6 h-6 rounded-md text-xs font-mono font-semibold transition-all ${
                  isCur
                    ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/50'
                    : isDone
                    ? 'bg-emerald-50 border border-emerald-500/60 text-emerald-600'
                    : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
                title={`Step ${idx + 1}: ${st.title}`}
              >
                {st.stepNumber}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active step details */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">
            {activeStep.stepNumber}. {activeStep.title}
          </h4>
          {isCurrentStepCompleted && (
            <span className="text-[11px] text-emerald-600 flex items-center gap-1 shrink-0 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
            </span>
          )}
        </div>

        <p className="text-xs text-slate-700 leading-relaxed">
          {activeStep.description}
        </p>

        <div className="p-2 rounded bg-white border border-slate-200/80 text-[11px] flex flex-col gap-1">
          <span className="font-semibold text-cyan-700">Target Condition:</span>
          <span className="text-slate-700 font-mono">{activeStep.targetCondition}</span>
        </div>

        {/* Hint drawer */}
        {showHint && (
          <div className="p-2.5 rounded bg-cyan-50 border border-cyan-200 text-[11px] text-cyan-800">
            <span className="font-semibold text-cyan-700">Lab Tip: </span>
            {activeStep.hint}
          </div>
        )}

        {/* Validation message */}
        {validationResult && (
          <div
            className={`p-2.5 rounded text-xs flex items-start gap-2 border ${
              validationResult.passed
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {validationResult.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="leading-snug">{validationResult.message}</div>
          </div>
        )}
      </div>

      {/* Stepper bottom action buttons */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setShowHint(!showHint)}
          className="text-xs text-slate-600 hover:text-cyan-700 flex items-center gap-1 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            Verify Step
          </button>

          {currentStepIndex < steps.length - 1 && (
            <button
              onClick={() => {
                if (isCurrentStepCompleted || validationResult?.passed) {
                  onAdvanceStep();
                  setValidationResult(null);
                  setShowHint(false);
                } else {
                  handleVerify();
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                isCurrentStepCompleted || validationResult?.passed
                  ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
