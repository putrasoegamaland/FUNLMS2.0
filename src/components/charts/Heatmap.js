'use client';

/**
 * Heatmap - SVG-based heatmap for showing subject difficulty
 * Shows a grid with color intensity based on success rate
 */
export function Heatmap({
    data = [], // Array of { label, value } where value is 0-100 (success rate)
    width = 300,
    height = 150,
    showLabels = true,
    colorScheme = 'green-red', // 'green-red' or 'red-green'
}) {
    const padding = { top: 20, right: 20, bottom: 30, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center text-text-muted text-sm" style={{ width, height }}>
                No data available
            </div>
        );
    }

    const cellHeight = Math.min(30, chartHeight / data.length);
    const cellWidth = Math.min(60, chartWidth);

    // Get color based on value (0-100)
    const getColor = (value) => {
        const normalized = value / 100;

        if (colorScheme === 'green-red') {
            // High = green, Low = red
            if (normalized >= 0.8) return '#22c55e'; // green-500
            if (normalized >= 0.6) return '#84cc16'; // lime-500
            if (normalized >= 0.4) return '#eab308'; // yellow-500
            if (normalized >= 0.2) return '#f97316'; // orange-500
            return '#ef4444'; // red-500
        } else {
            // High = red (hard), Low = green (easy)
            if (normalized >= 0.8) return '#ef4444';
            if (normalized >= 0.6) return '#f97316';
            if (normalized >= 0.4) return '#eab308';
            if (normalized >= 0.2) return '#84cc16';
            return '#22c55e';
        }
    };

    // Get text color for contrast
    const getTextColor = (value) => {
        return value > 40 && value < 70 ? '#000' : '#fff';
    };

    return (
        <svg width={width} height={height} className="heatmap">
            {data.map((item, i) => {
                const y = padding.top + i * (cellHeight + 4);
                const color = getColor(item.value);
                const textColor = getTextColor(item.value);

                return (
                    <g key={i}>
                        {/* Label */}
                        {showLabels && (
                            <text
                                x={padding.left - 8}
                                y={y + cellHeight / 2}
                                textAnchor="end"
                                dominantBaseline="middle"
                                className="fill-text-muted"
                                style={{ fontSize: 11 }}
                            >
                                {item.label}
                            </text>
                        )}

                        {/* Cell */}
                        <rect
                            x={padding.left}
                            y={y}
                            width={cellWidth}
                            height={cellHeight}
                            rx={4}
                            fill={color}
                        />

                        {/* Value */}
                        <text
                            x={padding.left + cellWidth / 2}
                            y={y + cellHeight / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColor}
                            style={{ fontSize: 11, fontWeight: 'bold' }}
                        >
                            {item.value}%
                        </text>
                    </g>
                );
            })}

            {/* Legend */}
            <g transform={`translate(${padding.left + cellWidth + 20}, ${padding.top})`}>
                <text x={0} y={-5} className="fill-text-muted" style={{ fontSize: 9 }}>
                    {colorScheme === 'green-red' ? 'Score' : 'Difficulty'}
                </text>
                {[
                    { color: colorScheme === 'green-red' ? '#22c55e' : '#ef4444', label: 'High' },
                    { color: '#eab308', label: 'Mid' },
                    { color: colorScheme === 'green-red' ? '#ef4444' : '#22c55e', label: 'Low' },
                ].map((item, i) => (
                    <g key={i} transform={`translate(0, ${i * 20 + 5})`}>
                        <rect width={12} height={12} rx={2} fill={item.color} />
                        <text x={16} y={9} className="fill-text-muted" style={{ fontSize: 9 }}>
                            {item.label}
                        </text>
                    </g>
                ))}
            </g>
        </svg>
    );
}

export default Heatmap;
