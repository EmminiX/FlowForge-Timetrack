import clsx from 'clsx';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FF3B30', // Red
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#5856D6', // Indigo
  '#00C7BE', // Teal
  '#FFCC00', // Yellow
  '#8E8E93', // Gray
];

export function ColorPicker({
  value,
  onChange,
  colors = DEFAULT_COLORS,
  className,
}: ColorPickerProps) {
  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      {colors.map((color) => (
        <button
          key={color}
          type='button'
          onClick={() => onChange(color)}
          className={clsx(
            'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            value === color ? 'border-foreground scale-110' : 'border-transparent',
          )}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}
