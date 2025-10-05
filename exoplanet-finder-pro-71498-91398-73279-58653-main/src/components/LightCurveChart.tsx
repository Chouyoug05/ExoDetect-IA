interface LightCurveChartProps {
  time: number[];
  flux: number[];
}

const LightCurveChart = ({ time, flux }: LightCurveChartProps) => {
  // Find min and max for scaling
  const maxFlux = Math.max(...flux);
  const minFlux = Math.min(...flux);
  const range = maxFlux - minFlux;
  
  // Create SVG path
  const width = 800;
  const height = 300;
  const padding = 40;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  const points = time.map((t, i) => {
    const x = padding + (t / Math.max(...time)) * chartWidth;
    const y = padding + chartHeight - ((flux[i] - minFlux) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="p-8 rounded-3xl glass-card glass-border">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-8 bg-gradient-primary rounded-full"></div>
          <h3 className="text-2xl font-bold text-foreground">
            Courbe de lumière
          </h3>
        </div>
        
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto rounded-xl"
          style={{ maxHeight: '500px' }}
        >
          {/* Grid lines */}
          <g className="opacity-10">
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={`h-${i}`}
                x1={padding}
                y1={padding + (i * chartHeight / 4)}
                x2={width - padding}
                y2={padding + (i * chartHeight / 4)}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                className="text-primary"
              />
            ))}
          </g>
          
          {/* Gradient and glow definitions */}
          <defs>
            <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              <stop offset="50%" stopColor="hsl(var(--primary-glow))" stopOpacity="1" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Axes */}
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="2"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={height - padding}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="2"
          />
          
          {/* Data line with glow */}
          <polyline
            points={points}
            fill="none"
            stroke="url(#curveGradient)"
            strokeWidth="3"
            filter="url(#glow)"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
          
          {/* Data points with glow */}
          {time.map((t, i) => {
            const x = padding + (t / Math.max(...time)) * chartWidth;
            const y = padding + chartHeight - ((flux[i] - minFlux) / range) * chartHeight;
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill="hsl(var(--primary-glow))"
                  filter="url(#glow)"
                  className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                />
              </g>
            );
          })}
          
          {/* Labels */}
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize="14"
            fontWeight="500"
          >
            Temps (jours)
          </text>
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            fill="hsl(var(--foreground))"
            fontSize="14"
            fontWeight="500"
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            Flux normalisé
          </text>
        </svg>
      </div>
    </div>
  );
};

export default LightCurveChart;
