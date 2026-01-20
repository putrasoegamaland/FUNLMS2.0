'use client';

/**
 * TrendChart - SVG-based line chart for showing score trends over time
 * No external dependencies - pure React + SVG
 */
export function TrendChart({
    data = [], // Array of { label, value, date }
    width = 300,
    height = 150,
    color = '#0df259',
    showLabels = true,
    showDots = true,
    showGrid = true,
}) {
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center text-text-muted text-sm" style={{ width, height }}>
                No data available
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.value), 100);
    const minValue = 0;
    const valueRange = maxValue - minValue;

    // Calculate point positions
    const getX = (index) => {
        if (data.length === 1) return chartWidth / 2;
        return (index / (data.length - 1)) * chartWidth;
    };

    const getY = (value) => {
        return chartHeight - ((value - minValue) / valueRange) * chartHeight;
    };

    // Generate path
    const pathD = data.map((item, i) => {
        const x = padding.left + getX(i);
        const y = padding.top + getY(item.value);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Generate area path (for gradient fill)
    const areaD = pathD +
        ` L ${padding.left + getX(data.length - 1)} ${padding.top + chartHeight}` +
        ` L ${padding.left} ${padding.top + chartHeight} Z`;

    // Grid lines
    const gridLines = [0, 25, 50, 75, 100];

    return (
        <svg width={width} height={height} className="trend-chart">
            {/* Definitions for gradient */}
            <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {showGrid && gridLines.map((value) => {
                const y = padding.top + getY(value);
                return (
                    <g key={value}>
                        <line
                            x1={padding.left}
                            y1={y}
                            x2={width - padding.right}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth={1}
                            strokeDasharray="4,4"
                        />
                        <text
                            x={padding.left - 8}
                            y={y}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="fill-text-muted"
                            style={{ fontSize: 10 }}
                        >
                            {value}
                        </text>
                    </g>
                );
            })}

            {/* Area fill */}
            <path
                d={areaD}
                fill="url(#areaGradient)"
            />

            {/* Line */}
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Dots */}
            {showDots && data.map((item, i) => {
                const x = padding.left + getX(i);
                const y = padding.top + getY(item.value);
                return (
                    <g key={i}>
                        <circle
                            cx={x}
                            cy={y}
                            r={5}
                            fill="white"
                            stroke={color}
                            strokeWidth={2}
                        />
                        {/* Value tooltip */}
                        <title>{`${item.label}: ${item.value}%`}</title>
                    </g>
                );
            })}

            {/* X-axis labels */}
            {showLabels && data.map((item, i) => {
                // Only show a few labels if there are many data points
                if (data.length > 5 && i % Math.ceil(data.length / 5) !== 0 && i !== data.length - 1) {
                    return null;
                }
                const x = padding.left + getX(i);
                return (
                    <text
                        key={i}
                        x={x}
                        y={height - 8}
                        textAnchor="middle"
                        className="fill-text-muted"
                        style={{ fontSize: 9 }}
                    >
                        {item.label}
                    </text>
                );
            })}
        </svg>
    );
}

export default TrendChart;
