import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Brain, HelpCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutonomySliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const autonomyModes = [
  {
    value: 0,
    label: 'Manual',
    icon: Brain,
    description: 'No hints - learn at your own pace',
    color: 'text-gray-500',
  },
  {
    value: 1,
    label: 'Help',
    icon: HelpCircle,
    description: 'Occasional hints when you need them',
    color: 'text-blue-500',
  },
  {
    value: 2,
    label: 'Guide Me',
    icon: Lightbulb,
    description: 'Active guidance and instant help',
    color: 'text-purple-500',
  },
];

export default function AutonomySlider({ value, onChange, className }: AutonomySliderProps) {
  const currentMode = autonomyModes[value];
  const Icon = currentMode.icon;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", currentMode.color)} />
          <span className="text-sm font-medium">{currentMode.label} Mode</span>
        </div>
        <span className="text-xs text-muted-foreground">InfoBite Assistant</span>
      </div>
      
      <Slider
        value={[value]}
        onValueChange={([newValue]) => onChange(newValue)}
        max={2}
        step={1}
        className="cursor-pointer"
      />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        {autonomyModes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={cn(
              "px-2 py-1 rounded transition-colors",
              value === mode.value
                ? "bg-muted text-foreground font-medium"
                : "hover:bg-muted/50"
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        {currentMode.description}
      </p>
    </div>
  );
}