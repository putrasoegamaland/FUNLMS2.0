'use client';

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * Drawing Canvas Component for student answers
 * Enhanced "Gartic-like" environment with tools, colors, and sizes
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
    const [tool, setTool] = useState('pencil'); // pencil, eraser
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
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;

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

    const colors = ['#000000', '#ff0000', '#0000ff', '#00aa00', '#ff9900', '#9900ff', '#884400', '#FF69B4'];
    const sizes = [2, 4, 8, 16, 24];

    return (
        <div className="space-y-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
            {/* Main Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">

                {/* Tools */}
                <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button
                        onClick={() => setTool('pencil')}
                        className={`p-2 rounded-lg transition-all ${tool === 'pencil' ? 'bg-primary text-white shadow-md scale-105' : 'hover:bg-gray-100 text-text-muted'}`}
                        title="Pencil"
                    >
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-pink-500 text-white shadow-md scale-105' : 'hover:bg-gray-100 text-text-muted'}`}
                        title="Eraser"
                    >
                        <span className="material-symbols-outlined">ink_eraser</span>
                    </button>
                </div>

                {/* Colors (only show if pencil) */}
                {tool === 'pencil' && (
                    <div className="flex gap-1.5 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
                        {colors.map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                disabled={disabled}
                                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-gray-800 scale-110 ring-2 ring-offset-1 ring-gray-200' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                )}

                {/* Brush Size */}
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100">
                    {sizes.map((size) => (
                        <button
                            key={size}
                            onClick={() => setBrushSize(size)}
                            disabled={disabled}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${brushSize === size ? 'bg-gray-100 ring-2 ring-primary ring-inset' : 'hover:bg-gray-50'}`}
                        >
                            <div
                                className={`rounded-full ${tool === 'eraser' ? 'bg-pink-300 border border-pink-500' : 'bg-gray-800'}`}
                                style={{ width: Math.min(size, 20), height: Math.min(size, 20) }}
                            />
                        </button>
                    ))}
                </div>

                {/* History Actions */}
                <div className="flex gap-2 ml-auto">
                    <button onClick={undo} disabled={disabled || historyIndex <= 0} className="p-2 rounded-lg bg-white border border-gray-100 hover:bg-gray-50 disabled:opacity-30 shadow-sm text-text-muted">
                        <span className="material-symbols-outlined">undo</span>
                    </button>
                    <button onClick={redo} disabled={disabled || historyIndex >= history.length - 1} className="p-2 rounded-lg bg-white border border-gray-100 hover:bg-gray-50 disabled:opacity-30 shadow-sm text-text-muted">
                        <span className="material-symbols-outlined">redo</span>
                    </button>
                    <button onClick={clear} disabled={disabled} className="p-2 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 text-red-500 disabled:opacity-30 shadow-sm" title="Clear All">
                        <span className="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="relative rounded-2xl overflow-hidden shadow-inner bg-white border-2 border-dashed border-gray-300">
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
                    className={`touch-none w-full h-full ${disabled ? 'opacity-50 cursor-not-allowed' : (tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair')}`}
                    style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
                />
            </div>
        </div>
    );
});

export default DrawingCanvas;
