/**
 * LabMate - AI Viva Coach
 * Interactive oral examination practice module powered by local Gemma.
 * Evaluates conceptual rigor, mathematical equations, and boundary assumptions.
 */

import React, { useState } from 'react';
import { EXPERIMENTS } from '../data/experiments';
import { VivaDifficulty, VivaSessionRecord, VivaSessionItem, VivaQuestionEvaluation } from '../types/app';
import { evaluateVivaAnswer, generateVivaQuestion, getOllamaConfig } from '../services/ollamaService';
import { StorageService } from '../services/storageService';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Send
} from 'lucide-react';

// Offline fallback question bank (used only when the local Gemma model is unreachable)
const VIVA_QUESTION_BANK: Record<string, Record<VivaDifficulty, string[]>> = {
  'ohms-law': {
    Beginner: [
      "State Ohm's Law in simple words and write its mathematical formula.",
      "What are the SI units of electrical potential difference, current, and resistance?",
      "If the resistance of a circuit is kept constant while the applied voltage is doubled, what happens to the current?"
    ],
    Intermediate: [
      "What are the necessary physical conditions and assumptions required for Ohm's Law to strictly hold true?",
      "Why should a digital ammeter always be connected in series with a load, and what is its ideal internal resistance?",
      "Why must a voltmeter be connected in parallel, and what happens if a student mistakenly connects it in series?"
    ],
    Advanced: [
      "Explain the microscopic physical mechanism of Ohm's Law in terms of electron drift velocity, relaxation time, and free electron density (J = σE).",
      "Explain the non-linear V-I characteristic of a tungsten filament lamp as current increases, and why it is termed a non-ohmic device.",
      "How does ambient operating temperature influence the resistance of metallic conductors versus intrinsic semiconductors?"
    ]
  },
  'series-circuit': {
    Beginner: [
      "What is the total equivalent resistance when a 100 Ω and 200 Ω resistor are connected in series?",
      "Does the same current or different current flow through components in a series branch?",
      "What happens to the entire circuit if one resistor in a series circuit is disconnected or burns out?"
    ],
    Intermediate: [
      "Derive the formula for equivalent resistance of two resistors in series using Kirchhoff's Voltage Law.",
      "If a 10 V source is connected across a series combination of 100 Ω and 400 Ω, calculate the voltage drop across the 400 Ω resistor.",
      "Why are holiday fairy lights or household appliances rarely wired in pure series configuration?"
    ],
    Advanced: [
      "Analyze the voltage divider ratio under loaded conditions when an external resistance RL is connected across R2.",
      "Explain how component manufacturing tolerances affect the worst-case equivalent resistance of a series string of precision resistors."
    ]
  },
  'parallel-circuit': {
    Beginner: [
      "How does the voltage across each branch in a parallel circuit compare with the total supply voltage?",
      "If a 100 Ω and a 100 Ω resistor are connected in parallel, what is their equivalent resistance?",
      "Why does turning off one light bulb in your house not turn off the others?"
    ],
    Intermediate: [
      "State and explain the Current Divider Rule for two parallel branches R1 and R2.",
      "Calculate the total current supplied by a 12 V battery when connected across 60 Ω and 40 Ω resistors in parallel.",
      "Explain why the equivalent resistance of any parallel combination is strictly less than the smallest individual resistor."
    ],
    Advanced: [
      "Apply nodal analysis to prove Kirchhoff's Current Law at a parallel junction node.",
      "Discuss the safety hazards of adding too many high-current parallel appliances to a single wall socket."
    ]
  },
  'rc-transient': {
    Beginner: [
      "What is an RC circuit and what are its two primary passive components?",
      "Define the time constant (tau) of an RC circuit and state its formula.",
      "What is the final steady-state current flowing through a capacitor connected to a constant DC source?"
    ],
    Intermediate: [
      "Explain what happens to the capacitor voltage during the charging phase at time t = tau (1 time constant).",
      "Why does current start at maximum (Vs/R) at t = 0 and decay exponentially to zero as the capacitor charges?",
      "How many time constants (tau) are conventionally considered necessary for an RC circuit to reach practical steady state?"
    ],
    Advanced: [
      "Derive the differential equation governing the charging of an RC circuit and solve for Vc(t).",
      "Explain how RC circuits are utilized as low-pass filters and differentiators in signal processing."
    ]
  }
};

/** Picks an unused question from the offline bank (used only if Gemma/Ollama can't be reached). */
function pickFallbackQuestion(expId: string, difficulty: VivaDifficulty, expTitle: string, used: string[]): string {
  const expBank = VIVA_QUESTION_BANK[expId] || VIVA_QUESTION_BANK['ohms-law'];
  const ordered = [...(expBank[difficulty] || []), ...expBank['Intermediate'], ...expBank['Beginner'], ...expBank['Advanced']];
  const fresh = ordered.find(q => !used.includes(q));
  return fresh || `Explain the aim of the experiment "${expTitle}", the governing equations, and one source of experimental error.`;
}

export const VivaCoach: React.FC = () => {
  // Session Configuration State
  const [selectedExpId, setSelectedExpId] = useState<string>('ohms-law');
  const [difficulty, setDifficulty] = useState<VivaDifficulty>('Intermediate');
  const [questionCount, setQuestionCount] = useState<number>(3);

  // Active Viva State
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [isSessionCompleted, setIsSessionCompleted] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [studentAnswer, setStudentAnswer] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [sessionItems, setSessionItems] = useState<VivaSessionItem[]>([]);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState<boolean>(false);
  const [activeEvaluation, setActiveEvaluation] = useState<VivaQuestionEvaluation | null>(null);

  // Saved Session History
  const [history, setHistory] = useState<VivaSessionRecord[]>(StorageService.getVivaSessions());

  const activeExp = EXPERIMENTS.find(e => e.id === selectedExpId) || EXPERIMENTS[0];

  /** Asks local Gemma for the next viva question (adapting to earlier answers); falls back to the offline bank. */
  const fetchNextQuestion = async (items: VivaSessionItem[]): Promise<VivaSessionItem> => {
    const aiQuestion = await generateVivaQuestion({
      experimentTitle: activeExp.title,
      experimentAim: activeExp.aim,
      difficulty,
      questionNumber: items.length + 1,
      totalQuestions: questionCount,
      previous: items
        .filter(i => i.evaluation)
        .map(i => ({ question: i.question, studentAnswer: i.studentAnswer, score: i.evaluation?.score }))
    });

    const question = aiQuestion ?? pickFallbackQuestion(selectedExpId, difficulty, activeExp.title, items.map(i => i.question));
    return {
      questionNumber: items.length + 1,
      question,
      studentAnswer: '',
      source: aiQuestion ? 'gemma' : 'fallback'
    };
  };

  const handleStartSession = async () => {
    if (isGeneratingQuestion) return;
    setSessionItems([]);
    setCurrentQuestionIndex(0);
    setStudentAnswer('');
    setActiveEvaluation(null);
    setIsSessionActive(true);
    setIsSessionCompleted(false);
    setIsGeneratingQuestion(true);

    try {
      const first = await fetchNextQuestion([]);
      setSessionItems([first]);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!studentAnswer.trim() || isEvaluating) return;

    const currentItem = sessionItems[currentQuestionIndex];
    if (!currentItem) return;

    setIsEvaluating(true);

    try {
      const evaluation = await evaluateVivaAnswer(
        currentItem.question,
        studentAnswer,
        activeExp.title,
        difficulty
      );

      setActiveEvaluation(evaluation);

      // Record answer and evaluation in items
      const updated = [...sessionItems];
      updated[currentQuestionIndex] = {
        ...currentItem,
        studentAnswer,
        evaluation
      };
      setSessionItems(updated);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = async () => {
    if (isGeneratingQuestion) return;

    if (currentQuestionIndex < questionCount - 1) {
      setIsGeneratingQuestion(true);
      try {
        const next = await fetchNextQuestion(sessionItems);
        setSessionItems(prev => [...prev, next]);
        setCurrentQuestionIndex(prev => prev + 1);
        setStudentAnswer('');
        setActiveEvaluation(null);
      } finally {
        setIsGeneratingQuestion(false);
      }
    } else {
      finalizeSession();
    }
  };

  const finalizeSession = () => {
    setIsSessionCompleted(true);
    setIsSessionActive(false);

    // Calculate summary statistics
    const evaluatedItems = sessionItems.filter(i => i.evaluation);
    const avgScore = evaluatedItems.length > 0
      ? evaluatedItems.reduce((acc, i) => acc + (i.evaluation?.score || 0), 0) / evaluatedItems.length
      : 0;

    const allCorrect = evaluatedItems.flatMap(i => i.evaluation?.correctConcepts || []);
    const allMissing = evaluatedItems.flatMap(i => i.evaluation?.missingConcepts || []);

    const newRecord: VivaSessionRecord = {
      id: `viva-${Date.now()}`,
      timestamp: Date.now(),
      subject: activeExp.category,
      experimentId: activeExp.id,
      experimentTitle: activeExp.title,
      difficulty,
      totalQuestions: questionCount,
      completedQuestions: evaluatedItems.length,
      averageScore: parseFloat(avgScore.toFixed(1)),
      items: evaluatedItems,
      strongConcepts: Array.from(new Set(allCorrect)).slice(0, 4),
      conceptsToRevise: Array.from(new Set(allMissing)).slice(0, 4)
    };

    StorageService.saveVivaSession(newRecord);
    setHistory(StorageService.getVivaSessions());
  };

  const currentQuestion = sessionItems[currentQuestionIndex];
  const answeredItems = sessionItems.filter(i => i.evaluation);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Practical Examination Preparation</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-700 font-mono">Gemma Local Intelligence</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-cyan-700" />
            <span>AI Viva Coach</span>
          </h1>
          <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
            Your local Gemma model acts as the examiner: it asks fresh viva questions one at a time, adapts to your earlier answers, and evaluates each answer for conceptual clarity, governing formulas, and boundary assumptions.
          </p>
        </div>

        {!isSessionActive && (
          <button
            onClick={handleStartSession}
            disabled={isGeneratingQuestion}
            className="disabled:opacity-60 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-slate-300/50 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Viva Session</span>
          </button>
        )}
      </div>

      {/* 2. Main Content Area */}
      {!isSessionActive && !isSessionCompleted ? (
        /* Configuration & History View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Setup Card (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
            <h3 className="text-xs font-semibold text-slate-800 border-b border-slate-200 pb-2">
              Configure Viva Examination Session
            </h3>

            {/* Experiment Selection */}
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-slate-600 font-medium">Experiment:</label>
              <select
                value={selectedExpId}
                onChange={(e) => setSelectedExpId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {EXPERIMENTS.map(exp => (
                  <option key={exp.id} value={exp.id}>
                    Exp {exp.number}: {exp.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Level */}
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-slate-600 font-medium">Difficulty Level:</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Beginner', 'Intermediate', 'Advanced'] as VivaDifficulty[]).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                      difficulty === d
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Questions */}
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-slate-600 font-medium">Questions in Session:</label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 8].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                      questionCount === cnt
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartSession}
              disabled={isGeneratingQuestion}
              className="disabled:opacity-60 mt-2 w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <span>Begin Examination Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Past Sessions History (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-800">
                  Recent Viva Examination History ({history.length})
                </h3>
                <span className="text-[11px] text-slate-600">Stored Attempts</span>
              </div>

              {history.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2.5 max-h-[340px] overflow-y-auto">
                  {history.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.experimentTitle}</h4>
                          <div className="text-[11px] text-slate-600">
                            {item.difficulty} Level · {item.completedQuestions} questions answered
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-amber-600">
                            {item.averageScore.toFixed(1)} / 10
                          </span>
                          <div className="text-[10px] text-slate-500">Avg Score</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {item.strongConcepts.map((sc, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ {sc}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  No viva examination history yet. Click "Start Viva Session" to take your first oral test.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : isSessionCompleted ? (
        /* Final Session Review & Summary */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-mono text-cyan-700">Session Completed</span>
                <h2 className="text-lg font-bold text-slate-900">Viva Examination Performance Report</h2>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSessionCompleted(false);
                setIsSessionActive(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-800 transition-colors"
            >
              Start New Session
            </button>
          </div>

          {/* Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="text-xs text-slate-600">Average Viva Score</div>
              <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
                {(
                  answeredItems.reduce((acc, i) => acc + (i.evaluation?.score || 0), 0) /
                  Math.max(1, answeredItems.length)
                ).toFixed(1)}{' '}
                <span className="text-xs text-amber-600/70">/ 10</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="text-xs text-slate-600">Questions Answered</div>
              <div className="text-2xl font-bold font-mono text-cyan-700 mt-1">
                {answeredItems.length} of {questionCount}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="text-xs text-slate-600">Curriculum Topic</div>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                {activeExp.title}
              </div>
            </div>
          </div>

          {/* Question-by-Question Review Breakdown */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-800">Examiner Review Breakdown</h3>
            {answeredItems.map(item => (
              <div
                key={item.questionNumber}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-slate-900">
                    Q{item.questionNumber}: {item.question}
                  </div>
                  <span className="font-mono font-bold text-amber-600 text-sm shrink-0">
                    {item.evaluation?.score ?? 0} / 10
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-slate-700">
                  <span className="text-slate-600 font-medium">Your Submitted Answer: </span>
                  {item.studentAnswer}
                </div>

                {item.evaluation && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/60 text-[11px]">
                    <div className="text-emerald-700">
                      <span className="font-semibold">Correct Concepts: </span>
                      {item.evaluation.correctConcepts.join(', ') || 'General effort recognized'}
                    </div>

                    {item.evaluation.missingConcepts.length > 0 && (
                      <div className="text-amber-700">
                        <span className="font-semibold">Missing Points to Revise: </span>
                        {item.evaluation.missingConcepts.join(', ')}
                      </div>
                    )}

                    <div className="bg-white p-2.5 rounded border border-slate-200 text-cyan-800">
                      <span className="font-semibold text-cyan-700">Examiner Model Answer: </span>
                      {item.evaluation.modelAnswer}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Active Examination Interactive Interface */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          {/* Question Banner */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono text-xs font-semibold">
                Question {currentQuestionIndex + 1} of {questionCount}
              </span>
              <span className="text-xs text-slate-600">· {difficulty} Level</span>
            </div>

            <button
              onClick={finalizeSession}
              className="text-xs text-slate-600 hover:text-rose-600 transition-colors"
            >
              End Session Early
            </button>
          </div>

          {/* Active Question Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            {currentQuestion && !(isGeneratingQuestion && !activeEvaluation && sessionItems.length === 0) ? (
              <>
                <h3 className="text-base font-bold text-slate-900 leading-relaxed">
                  {currentQuestion.question}
                </h3>
                <div className="mt-2">
                  {currentQuestion.source === 'gemma' ? (
                    <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-mono">
                      Asked by {getOllamaConfig().model}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono">
                      Ollama offline - using built-in question bank
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <BrainCircuit className="w-4 h-4 animate-spin text-cyan-700" />
                <span>Gemma is thinking of your first question...</span>
              </div>
            )}
            <div className="text-xs text-slate-600 mt-2">
              Explain the physical concept clearly. State governing formulas, boundary assumptions, and units where applicable.
            </div>
          </div>

          {/* Student Answer Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-700">
              Your Answer:
            </label>
            <textarea
              rows={4}
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              disabled={!currentQuestion || !!activeEvaluation || isEvaluating}
              placeholder="Type your answer here (e.g. Ohm's law states that current is directly proportional to voltage at constant temperature: V = I * R...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 disabled:opacity-75 resize-none leading-relaxed"
            />
          </div>

          {/* Submit / Action Buttons */}
          {!activeEvaluation ? (
            <div className="flex justify-end">
              <button
                onClick={handleSubmitAnswer}
                disabled={isEvaluating || !currentQuestion || !studentAnswer.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-md"
              >
                {isEvaluating ? (
                  <>
                    <BrainCircuit className="w-4 h-4 animate-spin text-cyan-700" />
                    <span>Evaluating with Gemma...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Answer for Evaluation</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Post-Submission Evaluation Card */
            <div className="bg-slate-50 border border-cyan-200 rounded-xl p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-cyan-700">Examiner Evaluation</span>
                <span className="font-mono text-base font-bold text-amber-600">
                  Estimated Score: {activeEvaluation.score} / 10
                </span>
              </div>

              <div className="space-y-2 text-slate-700">
                <div className="text-emerald-700">
                  <span className="font-semibold">Correct Concepts: </span>
                  {activeEvaluation.correctConcepts.join(', ') || 'Demonstrated foundational effort'}
                </div>

                {activeEvaluation.missingConcepts.length > 0 && (
                  <div className="text-amber-700">
                    <span className="font-semibold">Missing Points to Revise: </span>
                    {activeEvaluation.missingConcepts.join(', ')}
                  </div>
                )}

                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                  {activeEvaluation.explanation}
                </p>

                <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-lg text-cyan-800 leading-relaxed">
                  <span className="font-semibold text-cyan-700">Model Answer: </span>
                  {activeEvaluation.modelAnswer}
                </div>

                {activeEvaluation.followUpQuestion && (
                  <div className="text-slate-700 italic">
                    <span className="font-semibold text-amber-600 not-italic">Follow-up thought: </span>
                    "{activeEvaluation.followUpQuestion}"
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <button
                  onClick={handleNextQuestion}
                  disabled={isGeneratingQuestion}
                  className="disabled:opacity-60 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-md"
                >
                  <span>
                    {isGeneratingQuestion
                      ? 'Gemma is preparing the next question...'
                      : currentQuestionIndex < questionCount - 1 ? 'Next Question' : 'Complete Viva Session'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
