'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import storage from '@/lib/storage';
import AskAIModal from '@/components/AskAIModal';
import { isGeminiConfigured } from '@/lib/geminiAI';

export default function StudentBooksPage() {
    const { user } = useAuth();
    const [books, setBooks] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [viewingPDF, setViewingPDF] = useState(false);
    const [showAskAI, setShowAskAI] = useState(false);

    useEffect(() => {
        // Get books assigned to student's classes
        const enrollments = storage.enrollments.getAll().filter(e => e.studentId === user?.id);
        const classIds = enrollments.map(e => e.classId);

        const allBooks = storage.books.getAll();
        const available = allBooks.filter(b =>
            b.classIds?.some(cid => classIds.includes(cid)) || b.classIds?.length === 0
        );

        setBooks(available);
    }, [user]);

    // PDF Viewer
    if (viewingPDF && selectedBook?.pdfData) {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col">
                <header className="bg-gray-900 p-4 flex items-center gap-4">
                    <button onClick={() => setViewingPDF(false)}>
                        <span className="material-symbols-outlined text-white">close</span>
                    </button>
                    <h2 className="text-white font-bold truncate">{selectedBook.title}</h2>
                </header>
                <div className="flex-1 overflow-auto">
                    <iframe
                        src={selectedBook.pdfData}
                        className="w-full h-full min-h-[80vh]"
                        title={selectedBook.title}
                    />
                </div>
            </div>
        );
    }

    if (selectedBook) {
        return (
            <div className="min-h-screen bg-background-light">
                <header className="sticky top-0 bg-card-light border-b border-gray-100 p-4 flex items-center gap-4">
                    <button onClick={() => setSelectedBook(null)}>
                        <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                    </button>
                    <h2 className="font-bold text-text-main">{selectedBook.title}</h2>
                </header>

                <div className="p-4 space-y-4">
                    <div className="bg-primary/10 rounded-2xl p-8 text-center">
                        <div className="text-6xl mb-4">{selectedBook.coverEmoji || '📖'}</div>
                        <h3 className="text-xl font-bold text-text-main">{selectedBook.title}</h3>
                        {selectedBook.author && (
                            <p className="text-text-muted">by {selectedBook.author}</p>
                        )}
                    </div>

                    {selectedBook.description && (
                        <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                            <h4 className="font-bold text-text-main mb-2">About this book</h4>
                            <p className="text-text-muted text-sm">{selectedBook.description}</p>
                        </div>
                    )}

                    {selectedBook.pdfData ? (
                        <button
                            onClick={() => setViewingPDF(true)}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">menu_book</span>
                            Open Book
                        </button>
                    ) : (
                        <div className="text-center py-8 text-text-muted">
                            <div className="text-4xl mb-2">📚</div>
                            <p>Content coming soon!</p>
                        </div>
                    )}

                    {/* Ask AI Button - only shows when AI is configured */}
                    {isGeminiConfigured() && (
                        <button
                            onClick={() => setShowAskAI(true)}
                            className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            <span className="text-xl">🤖</span>
                            Ask AI About This Book
                        </button>
                    )}
                </div>

                {/* Ask AI Modal */}
                <AskAIModal
                    isOpen={showAskAI}
                    onClose={() => setShowAskAI(false)}
                    material={{
                        title: selectedBook.title,
                        description: selectedBook.description || `A book by ${selectedBook.author || 'Unknown Author'}`,
                    }}
                />
            </div>
        );
    }

    const bookColors = ['bg-yellow-400', 'bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400'];

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold text-text-main">📚 My Books</h2>

            {books.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                    {books.map((book, i) => (
                        <button
                            key={book.id}
                            onClick={() => setSelectedBook(book)}
                            className={`${bookColors[i % bookColors.length]} rounded-2xl p-4 h-40 flex flex-col justify-between text-left active:scale-95 transition-transform relative`}
                        >
                            {book.pdfData && (
                                <div className="absolute top-2 right-2 bg-white/30 px-2 py-0.5 rounded text-xs text-white font-medium">
                                    PDF
                                </div>
                            )}
                            <div className="text-4xl">{book.coverEmoji || '📖'}</div>
                            <div>
                                <h3 className="font-bold text-white text-sm leading-tight">{book.title}</h3>
                                {book.author && (
                                    <p className="text-xs text-white/80">{book.author}</p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-text-muted">
                    <div className="text-4xl mb-4">📚</div>
                    <p>No books available yet</p>
                    <p className="text-sm">Check back later!</p>
                </div>
            )}
        </div>
    );
}
