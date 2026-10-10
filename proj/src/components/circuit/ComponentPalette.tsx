/**
 * LabMate - Component Palette
 * Allows adding electrical parts onto the breadboard/schematic workspace.
 */

import React from 'react';
import { ComponentType } from '../../types/circuit';
import { Zap, Activity, ToggleRight, Radio, BatteryCharging, Gauge } from 'lucide-react';

interface ComponentPaletteProps {
  onAddComponent: (type: ComponentType) => void;
  disabled?: boolean;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ onAddComponent, disabled }) => {
  const tools = [
    { type: 'DC_SOURCE' as ComponentType, label: 'DC Voltage Source', icon: Zap, hint: '0–30V Regulated' },
    { type: 'RESISTOR' as ComponentType, label: 'Resistor', icon: Activity, hint: '10Ω – 100kΩ' },
    { type: 'SWITCH' as ComponentType, label: 'SPST Switch', icon: ToggleRight, hint: 'Knife / Toggle' },
    { type: 'GROUND' as ComponentType, label: 'Earth Ground', icon: Radio, hint: '0V Reference' },
    { type: 'CAPACITOR' as ComponentType, label: 'Capacitor', icon: BatteryCharging, hint: '1μF – 1000μF' },
    { type: 'VOLTMETER' as ComponentType, label: 'Voltmeter Probe', icon: Gauge, hint: 'Parallel V Meter' },
    { type: 'AMMETER' as ComponentType, label: 'Ammeter Probe', icon: Gauge, hint: 'In-Series I Meter' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Component Rack</span>
        <span className="text-[11px] text-cyan-700">Click to add</span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.type}
              onClick={() => onAddComponent(tool.type)}
              disabled={disabled}
              className="group flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-100/70 hover:bg-slate-200 border border-slate-200/50 hover:border-cyan-500/40 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-cyan-700 group-hover:text-cyan-700 group-hover:border-cyan-500/40 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-800 group-hover:text-slate-900">{tool.label}</div>
                  <div className="text-[10px] text-slate-600">{tool.hint}</div>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-cyan-700 transition-colors font-mono">+</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
