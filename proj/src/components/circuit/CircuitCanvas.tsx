/**
 * LabMate - Interactive Circuit Canvas
 * Real-time SVG schematic and breadboard workspace with pin-to-pin wiring,
 * animated electron flow, component placement, rotation, and parameter editing.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CircuitComponent, Wire, SimulationReadings } from '../../types/circuit';
import { Trash2, RotateCw, Settings2, Power, Eye, EyeOff } from 'lucide-react';

interface CircuitCanvasProps {
  components: CircuitComponent[];
  wires: Wire[];
  readings: SimulationReadings;
  powerSupplyOn: boolean;
  onUpdateComponents: (components: CircuitComponent[]) => void;
  onUpdateWires: (wires: Wire[]) => void;
  onSelectComponent: (comp: CircuitComponent | null) => void;
  selectedComponent: CircuitComponent | null;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  components,
  wires,
  readings,
  powerSupplyOn,
  onUpdateComponents,
  onUpdateWires,
  onSelectComponent,
  selectedComponent
}) => {
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showElectronAnimation, setShowElectronAnimation] = useState(true);

  const svgRef = useRef<SVGSVGElement>(null);

  // Helper to find exact terminal coordinates in SVG space
  const getTerminalCoords = useCallback((termId: string) => {
    for (const comp of components) {
      const term = comp.terminals.find(t => t.id === termId);
      if (term) {
        const rad = (comp.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotatedX = term.relX * cos - term.relY * sin;
        const rotatedY = term.relX * sin + term.relY * cos;
        return {
          x: comp.x + rotatedX,
          y: comp.y + rotatedY,
          name: term.name,
          compId: comp.id
        };
      }
    }
    return null;
  }, [components]);

  // Terminal click handler for wiring
  const handleTerminalClick = (termId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!activeTerminalId) {
      // Start wire
      setActiveTerminalId(termId);
      setSelectedWireId(null);
    } else if (activeTerminalId === termId) {
      // Deselect
      setActiveTerminalId(null);
    } else {
      // Prevent wiring a terminal to itself on the same component if not allowed
      const termA = getTerminalCoords(activeTerminalId);
      const termB = getTerminalCoords(termId);

      if (termA && termB && termA.compId !== termB.compId) {
        // Create wire
        const existingWire = wires.find(w => 
          (w.fromTerminalId === activeTerminalId && w.toTerminalId === termId) ||
          (w.fromTerminalId === termId && w.toTerminalId === activeTerminalId)
        );

        if (!existingWire) {
          const wireColors = ['#0891b2', '#0284c7', '#f59e0b', '#f43f5e', '#a855f7'];
          const newWire: Wire = {
            id: `w-${Date.now()}`,
            fromTerminalId: activeTerminalId,
            toTerminalId: termId,
            color: wireColors[wires.length % wireColors.length]
          };
          onUpdateWires([...wires, newWire]);
        }
      }
      setActiveTerminalId(null);
    }
  };

  // Dragging components
  const handleMouseDownComp = (comp: CircuitComponent, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectComponent(comp);
    setSelectedWireId(null);

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    setDraggingCompId(comp.id);
    setDragOffset({
      x: e.clientX - svgRect.left - comp.x,
      y: e.clientY - svgRect.top - comp.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingCompId || !svgRef.current) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const rawX = e.clientX - svgRect.left - dragOffset.x;
    const rawY = e.clientY - svgRect.top - dragOffset.y;

    // Snap to 10px grid
    const snapX = Math.round(rawX / 10) * 10;
    const snapY = Math.round(rawY / 10) * 10;

    // Constrain within board
    const boundedX = Math.max(60, Math.min(680, snapX));
    const boundedY = Math.max(50, Math.min(370, snapY));

    const updated = components.map(c => 
      c.id === draggingCompId ? { ...c, x: boundedX, y: boundedY } : c
    );
    onUpdateComponents(updated);
  };

  const handleMouseUp = () => {
    setDraggingCompId(null);
  };

  const handleDeleteSelected = () => {
    if (selectedComponent) {
      const remainingComps = components.filter(c => c.id !== selectedComponent.id);
      const remainingTermIds = new Set(
        remainingComps.flatMap(c => c.terminals.map(t => t.id))
      );
      const remainingWires = wires.filter(w => 
        remainingTermIds.has(w.fromTerminalId) && remainingTermIds.has(w.toTerminalId)
      );
      onUpdateComponents(remainingComps);
      onUpdateWires(remainingWires);
      onSelectComponent(null);
    } else if (selectedWireId) {
      onUpdateWires(wires.filter(w => w.id !== selectedWireId));
      setSelectedWireId(null);
    }
  };

  const handleRotate = () => {
    if (!selectedComponent) return;
    const nextRot = (selectedComponent.rotation + 90) % 360;
    const updated = components.map(c => 
      c.id === selectedComponent.id ? { ...c, rotation: nextRot } : c
    );
    onUpdateComponents(updated);
    onSelectComponent({ ...selectedComponent, rotation: nextRot });
  };

  const handleToggleSwitch = (comp: CircuitComponent) => {
    const isClosed = !comp.properties.closed;
    const updated = components.map(c => 
      c.id === comp.id ? { ...c, properties: { ...c.properties, closed: isClosed } } : c
    );
    onUpdateComponents(updated);
    if (selectedComponent?.id === comp.id) {
      onSelectComponent({ ...selectedComponent, properties: { ...selectedComponent.properties, closed: isClosed } });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Top canvas controls bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-t-xl text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">Interactive Circuit Workspace</span>
          <span className="text-[11px] text-slate-600">· Click terminal pins to draw wires</span>
        </div>

        <div className="flex items-center gap-2">
          {activeTerminalId && (
            <span className="px-2 py-0.5 rounded bg-cyan-50 border border-cyan-500/50 text-[11px] text-cyan-700 animate-pulse">
              Select 2nd pin to complete wire
            </span>
          )}

          <button
            onClick={() => setShowElectronAnimation(!showElectronAnimation)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] text-slate-700 transition-colors"
            title="Toggle animated current indicators"
          >
            {showElectronAnimation ? <Eye className="w-3.5 h-3.5 text-cyan-700" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            <span>Flow Indicator</span>
          </button>

          {(selectedComponent || selectedWireId) && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              {selectedComponent && (
                <button
                  onClick={handleRotate}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] text-slate-800 transition-colors"
                  title="Rotate 90 degrees"
                >
                  <RotateCw className="w-3 h-3 text-cyan-700" />
                  <span>Rotate</span>
                </button>
              )}
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[11px] text-rose-700 transition-colors"
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SVG Circuit Grid Stage */}
      <div className="relative w-full overflow-hidden bg-slate-50 border border-slate-200 rounded-b-xl circuit-grid shadow-inner select-none">
        <svg
          ref={svgRef}
          viewBox="0 0 740 420"
          className="w-full h-[380px] lg:h-[420px] cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={() => {
            setActiveTerminalId(null);
            setSelectedWireId(null);
            onSelectComponent(null);
          }}
        >
          <defs>
            {/* Glow filters for active terminals and current flow */}
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="activeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Render Wires */}
          {wires.map(wire => {
            const start = getTerminalCoords(wire.fromTerminalId);
            const end = getTerminalCoords(wire.toTerminalId);
            if (!start || !end) return null;

            const isSelected = selectedWireId === wire.id;
            const isLive = powerSupplyOn && readings.status === 'VALID' && readings.totalCurrent > 0;

            // Generate clean curved wire Bézier path
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const cx1 = start.x + dx * 0.4;
            const cy1 = start.y;
            const cx2 = start.x + dx * 0.6;
            const cy2 = end.y;
            const pathData = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;

            return (
              <g
                key={wire.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWireId(wire.id);
                  onSelectComponent(null);
                }}
                className="cursor-pointer"
              >
                {/* Thick invisible click hit-area */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                />

                {/* Main wire conductor */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#0891b2' : wire.color || '#0284c7'}
                  strokeWidth={isSelected ? '3.5' : '2.5'}
                  strokeLinecap="round"
                  className="transition-colors"
                />

                {/* Animated electron current flow pulses */}
                {isLive && showElectronAnimation && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeDasharray="4 16"
                    className="animate-current-flow"
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}

          {/* 2. Render Components */}
          {components.map(comp => {
            const isSelected = selectedComponent?.id === comp.id;
            return (
              <g
                key={comp.id}
                transform={`translate(${comp.x}, ${comp.y}) rotate(${comp.rotation})`}
                onMouseDown={(e) => handleMouseDownComp(comp, e)}
                className="cursor-move"
              >
                {/* Selection halo */}
                {isSelected && (
                  <rect
                    x="-55"
                    y="-45"
                    width="110"
                    height="90"
                    rx="8"
                    fill="none"
                    stroke="#0891b2"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    className="animate-pulse"
                  />
                )}

                {/* Render Component Symbol by Type */}
                {renderComponentGraphics(comp, powerSupplyOn, readings, handleToggleSwitch)}

                {/* Render Terminals */}
                {comp.terminals.map(term => {
                  const isActive = activeTerminalId === term.id;
                  const isPositive = term.name === 'pos' || term.name === 'A';
                  return (
                    <g
                      key={term.id}
                      transform={`translate(${term.relX}, ${term.relY})`}
                      onClick={(e) => handleTerminalClick(term.id, e)}
                      className="cursor-pointer"
                    >
                      {/* Active pulse aura */}
                      {isActive && (
                        <circle
                          r="10"
                          fill="none"
                          stroke="#0891b2"
                          strokeWidth="2"
                          className="animate-ping"
                        />
                      )}
                      {/* Terminal pin base */}
                      <circle
                        r="6"
                        fill={isPositive ? '#ef4444' : '#0284c7'}
                        stroke={isActive ? '#0891b2' : '#ffffff'}
                        strokeWidth={isActive ? '2.5' : '1.5'}
                        className="hover:scale-125 transition-transform"
                        filter={isActive ? 'url(#cyanGlow)' : undefined}
                      />
                      {/* Pin center core */}
                      <circle r="2" fill="#ffffff" />
                      {/* Terminal label */}
                      <text
                        x="0"
                        y={term.relY < 0 ? -10 : 16}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                        className="select-none pointer-events-none"
                      >
                        {term.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Selected Component Floating Property Inspector */}
        {selectedComponent && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-800 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-cyan-700">{selectedComponent.label}</span>
              <span className="text-[11px] text-slate-600">({selectedComponent.type})</span>
            </div>

            {/* Voltage control for DC Source */}
            {selectedComponent.type === 'DC_SOURCE' && (
              <div className="flex items-center gap-3">
                <span className="text-slate-600">Voltage:</span>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={selectedComponent.properties.voltage ?? 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = components.map(c => 
                      c.id === selectedComponent.id ? { ...c, properties: { ...c.properties, voltage: val } } : c
                    );
                    onUpdateComponents(updated);
                    onSelectComponent({ ...selectedComponent, properties: { ...selectedComponent.properties, voltage: val } });
                  }}
                  className="w-28 accent-cyan-400 cursor-pointer"
                />
                <span className="font-mono font-semibold text-cyan-700 w-12">
                  {(selectedComponent.properties.voltage ?? 10).toFixed(1)} V
                </span>
              </div>
            )}

            {/* Resistance presets & slider for Resistor */}
            {selectedComponent.type === 'RESISTOR' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-600">Resistance:</span>
                <div className="flex items-center gap-1">
                  {[50, 100, 200, 300, 1000].map(preset => (
                    <button
                      key={preset}
                      onClick={() => {
                        const updated = components.map(c => 
                          c.id === selectedComponent.id ? { ...c, properties: { ...c.properties, resistance: preset } } : c
                        );
                        onUpdateComponents(updated);
                        onSelectComponent({ ...selectedComponent, properties: { ...selectedComponent.properties, resistance: preset } });
                      }}
                      className={`px-2 py-0.5 rounded border text-[11px] font-mono transition-colors ${
                        selectedComponent.properties.resistance === preset
                          ? 'bg-cyan-50 border-cyan-500/70 text-cyan-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000}kΩ` : `${preset}Ω`}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={selectedComponent.properties.resistance ?? 100}
                  onChange={(e) => {
                    const val = Math.max(1, parseFloat(e.target.value) || 100);
                    const updated = components.map(c => 
                      c.id === selectedComponent.id ? { ...c, properties: { ...c.properties, resistance: val } } : c
                    );
                    onUpdateComponents(updated);
                    onSelectComponent({ ...selectedComponent, properties: { ...selectedComponent.properties, resistance: val } });
                  }}
                  className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-right font-mono text-cyan-700"
                />
                <span className="font-mono text-slate-600">Ω</span>
              </div>
            )}

            {/* Switch toggle */}
            {selectedComponent.type === 'SWITCH' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Contacts:</span>
                <button
                  onClick={() => handleToggleSwitch(selectedComponent)}
                  className={`px-3 py-1 rounded font-medium text-xs flex items-center gap-1.5 transition-colors ${
                    selectedComponent.properties.closed
                      ? 'bg-emerald-50 border border-emerald-500/60 text-emerald-700'
                      : 'bg-rose-50 border border-rose-500/60 text-rose-700'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{selectedComponent.properties.closed ? 'CLOSED (Conducting)' : 'OPEN (Isolated)'}</span>
                </button>
              </div>
            )}

            {/* Capacitance for Capacitor */}
            {selectedComponent.type === 'CAPACITOR' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Capacitance:</span>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={selectedComponent.properties.capacitance ?? 100}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = components.map(c => 
                      c.id === selectedComponent.id ? { ...c, properties: { ...c.properties, capacitance: val } } : c
                    );
                    onUpdateComponents(updated);
                    onSelectComponent({ ...selectedComponent, properties: { ...selectedComponent.properties, capacitance: val } });
                  }}
                  className="w-24 accent-cyan-400 cursor-pointer"
                />
                <span className="font-mono text-cyan-700">
                  {selectedComponent.properties.capacitance ?? 100} μF
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// SVG rendering helpers for electrical symbols
function renderComponentGraphics(
  comp: CircuitComponent,
  powerOn: boolean,
  readings: SimulationReadings,
  onToggleSwitch: (comp: CircuitComponent) => void
) {
  switch (comp.type) {
    case 'DC_SOURCE': {
      const v = comp.properties.voltage ?? 10;
      return (
        <g>
          {/* Main instrument chassis */}
          <rect x="-42" y="-30" width="84" height="60" rx="8" fill="#f1f5f9" stroke="#2563eb" strokeWidth="2" />
          <circle cx="-16" cy="0" r="16" fill="#e0f2fe" stroke="#3b82f6" strokeWidth="1.5" />
          <text x="-16" y="4" textAnchor="middle" fill="#0891b2" fontSize="11" fontWeight="bold">DC</text>
          <text x="14" y="-8" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">+</text>
          <text x="14" y="16" textAnchor="middle" fill="#3b82f6" fontSize="13" fontWeight="bold">−</text>
          <text x="0" y="38" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
            {v.toFixed(1)}V
          </text>
        </g>
      );
    }
    case 'RESISTOR': {
      const r = comp.properties.resistance ?? 100;
      const vDrop = readings.componentVoltages[comp.id];
      const iThru = readings.componentCurrents[comp.id];
      return (
        <g>
          {/* Resistor body (IEC ceramic block) */}
          <rect x="-35" y="-14" width="70" height="28" rx="5" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          {/* Ceramic color code decorative bands */}
          <rect x="-24" y="-14" width="5" height="28" fill="#b45309" />
          <rect x="-12" y="-14" width="5" height="28" fill="#1e1e1e" />
          <rect x="0" y="-14" width="5" height="28" fill="#b91c1c" />
          <rect x="16" y="-14" width="4" height="28" fill="#eab308" />
          {/* Resistor value tag */}
          <text x="0" y="24" textAnchor="middle" fill="#0284c7" fontSize="10" fontWeight="600" fontFamily="monospace">
            {r >= 1000 ? `${(r / 1000).toFixed(1)}kΩ` : `${r}Ω`}
          </text>
          {vDrop !== undefined && (
            <text x="0" y="-20" textAnchor="middle" fill="#b45309" fontSize="9" fontFamily="monospace">
              {vDrop.toFixed(2)}V · {(iThru * 1000).toFixed(0)}mA
            </text>
          )}
        </g>
      );
    }
    case 'SWITCH': {
      const closed = comp.properties.closed;
      return (
        <g onClick={() => onToggleSwitch(comp)} className="cursor-pointer">
          {/* Switch board */}
          <rect x="-35" y="-18" width="70" height="36" rx="6" fill="#f1f5f9" stroke={closed ? '#10b981' : '#f43f5e'} strokeWidth="1.5" />
          {/* Terminals pins */}
          <circle cx="-20" cy="0" r="4" fill="#64748b" />
          <circle cx="20" cy="0" r="4" fill="#64748b" />
          {/* Knife switch arm */}
          {closed ? (
            <line x1="-20" y1="0" x2="20" y2="0" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
          ) : (
            <line x1="-20" y1="0" x2="14" y2="-16" stroke="#f43f5e" strokeWidth="3.5" strokeLinecap="round" />
          )}
          <text x="0" y="24" textAnchor="middle" fill={closed ? '#10b981' : '#f43f5e'} fontSize="9" fontWeight="bold">
            {closed ? 'CLOSED' : 'OPEN'}
          </text>
        </g>
      );
    }
    case 'GROUND': {
      return (
        <g>
          {/* Vertical stem */}
          <line x1="0" y1="-20" x2="0" y2="0" stroke="#22c55e" strokeWidth="2.5" />
          {/* 3 descending ground bars */}
          <line x1="-16" y1="0" x2="16" y2="0" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
          <line x1="-10" y1="6" x2="10" y2="6" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="-4" y1="12" x2="4" y2="12" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
          <text x="0" y="24" textAnchor="middle" fill="#15803d" fontSize="9" fontFamily="monospace">GND (0V)</text>
        </g>
      );
    }
    case 'CAPACITOR': {
      const c = comp.properties.capacitance ?? 100;
      return (
        <g>
          {/* Leads */}
          <line x1="0" y1="-35" x2="0" y2="-8" stroke="#0284c7" strokeWidth="2" />
          <line x1="0" y1="8" x2="0" y2="35" stroke="#0284c7" strokeWidth="2" />
          {/* Two parallel capacitor plates */}
          <line x1="-16" y1="-8" x2="16" y2="-8" stroke="#0891b2" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="-16" y1="8" x2="16" y2="8" stroke="#0891b2" strokeWidth="3.5" strokeLinecap="round" />
          <text x="22" y="3" textAnchor="start" fill="#0284c7" fontSize="10" fontFamily="monospace">
            {c}μF
          </text>
        </g>
      );
    }
    case 'VOLTMETER': {
      return (
        <g>
          <circle cx="0" cy="0" r="22" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
          <text x="0" y="5" textAnchor="middle" fill="#b45309" fontSize="14" fontWeight="bold">V</text>
          <text x="0" y="32" textAnchor="middle" fill="#b45309" fontSize="9" fontFamily="monospace">VOLTMETER</text>
        </g>
      );
    }
    case 'AMMETER': {
      return (
        <g>
          <circle cx="0" cy="0" r="22" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
          <text x="0" y="5" textAnchor="middle" fill="#0e7490" fontSize="14" fontWeight="bold">A</text>
          <text x="0" y="32" textAnchor="middle" fill="#0e7490" fontSize="9" fontFamily="monospace">AMMETER</text>
        </g>
      );
    }
    default:
      return null;
  }
}
