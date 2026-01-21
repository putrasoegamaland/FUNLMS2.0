'use client';

/**
 * RadarChart - SVG-based radar/spider chart for showing student strengths/weaknesses
 * No external dependencies - pure React + SVG
 */
export function RadarChart({
    data = [], // Array of { label, value, maxValue } 
    size = 200,
    color = '#0df259',
    showLabels = true,
}) {
    const center = size / 2;
    const radius = size * 0.35;
    const levels = 5;
    const angleSlice = (Math.PI * 2) / data.length;

    // Generate polygon points for a given radius multiplier
    const getPolygonPoints = (radiusMultiplier) => {
        return data.map((_, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const x = center + Math.cos(angle) * radius * radiusMultiplier;
            const y = center + Math.sin(angle) * radius * radiusMultiplier;
            return `${x},${y}`;
        }).join(' ');
    };

    // Generate data polygon points
    const getDataPoints = () => {
        return data.map((item, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const value = (item.value / (item.maxValue || 100));
            const x = center + Math.cos(angle) * radius * value;
            const y = center + Math.sin(angle) * radius * value;
            return `${x},${y}`;
        }).join(' ');
    };

    // Get label position
    const getLabelPosition = (index) => {
        const angle = angleSlice * index - Math.PI / 2;
        const labelRadius = radius * 1.25;
        return {
            x: center + Math.cos(angle) * labelRadius,
            y: center + Math.sin(angle) * labelRadius,
        };
    };

    if (data.length < 3) {
        return (
            <div className="flex items-center justify-center text-text-muted text-sm" style={{ width: size, height: size }}>
                Need at least 3 data points
            </div>
        );
    }

    return (
        <svg width={size} height={size} className="radar-chart">
            {/* Background levels */}
            {[...Array(levels)].map((_, level) => (
                <polygon
                    key={level}
                    points={getPolygonPoints((level + 1) / levels)}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={1}
                />
            ))}

            {/* Axis lines */}
            {data.map((_, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                const x2 = center + Math.cos(angle) * radius;
                const y2 = center + Math.sin(angle) * radius;
                return (
                    <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={x2}
                        y2={y2}
                        stroke="#e5e7eb"
                        strokeWidth={1}
                    />
                );
            })}

            {/* Data polygon */}
            <polygon
                points={getDataPoints()}
                fill={color}
                fillOpacity={0.3}
                stroke={color}
                strokeWidth={2}
            />

            {/* Data points */}
            {data.map((item, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                const value = (item.value / (item.maxValue || 100));
                const x = center + Math.cos(angle) * radius * value;
                const y = center + Math.sin(angle) * radius * value;
                return (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={4}
                        fill={color}
                        stroke="white"
                        strokeWidth={2}
                    />
                );
            })}

            {/* Labels */}
            {showLabels && data.map((item, i) => {
                const pos = getLabelPosition(i);
                return (
                    <text
                        key={i}
                        x={pos.x}
                        y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs fill-text-muted"
                        style={{ fontSize: 10 }}
                    >
                        {item.label}
                    </text>
                );
            })}
        </svg>
    );
}

export default RadarChart;
