'use client';

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * Drawing Canvas Component for student answers
 * Supports freehand drawing with undo/redo and export to base64
 */
const DrawingCanvas = forwardRef(function DrawingCanvas({
    width = 300,
    height = 200,
    onChange,
    initialImage = null,
    disabled = false,
}, ref) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(4);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        getImage: () => {
            const canvas = canvasRef.current;
            return canvas ? canvas.toDataURL('image/png') : null;
        },
        clear: () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                saveToHistory();
            }
        },
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            // Set white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // Load initial image if provided
            if (initialImage) {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    saveToHistory();
                };
                img.src = initialImage;
            } else {
                saveToHistory();
            }
        }
    }, []);

    const saveToHistory = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const imageData = canvas.toDataURL();
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(imageData);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);

            if (onChange) {
                onChange(imageData);
            }
        }
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        if (e.touches) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const startDrawing = (e) => {
        if (disabled) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = color;

        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing || disabled) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e);

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveToHistory();
        }
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            loadFromHistory(newIndex);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            loadFromHistory(newIndex);
        }
    };

    const loadFromHistory = (index) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && history[index]) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0);
                if (onChange) {
                    onChange(history[index]);
                }
            };
            img.src = history[index];
        }
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            saveToHistory();
        }
    };

    const colors = ['#000000', '#ff0000', '#0000ff', '#00aa00', '#ff9900', '#9900ff'];

    return (
        <div className="space-y-2">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Colors */}
                <div className="flex gap-1">
                    {colors.map((c) => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            disabled={disabled}
                            className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-800 scale-110' : 'border-gray-300'
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                {/* Brush size */}
                <div className="flex items-center gap-1">
                    {[2, 4, 8, 12].map((size) => (
                        <button
                            key={size}
                            onClick={() => setBrushSize(size)}
                            disabled={disabled}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center ${brushSize === size ? 'bg-gray-200 border-gray-400' : 'border-gray-200'
                                }`}
                        >
                            <div
                                className="rounded-full bg-gray-800"
                                style={{ width: size, height: size }}
                            />
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                    <button
                        onClick={undo}
                        disabled={disabled || historyIndex <= 0}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>undo</span>
                    </button>
                    <button
                        onClick={redo}
                        disabled={disabled || historyIndex >= history.length - 1}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>redo</span>
                    </button>
                    <button
                        onClick={clear}
                        disabled={disabled}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className={`border-2 border-gray-300 rounded-xl bg-white touch-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'
                    }`}
                style={{ maxWidth: '100%' }}
            />
        </div>
    );
});

export default DrawingCanvas;
