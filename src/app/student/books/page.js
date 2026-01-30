'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBooks, useEnrollments, logStudentActivity } from '@/hooks/useSupabaseData';
import AskAIModal from '@/components/AskAIModal';
import { isGeminiConfigured } from '@/lib/geminiAI';

// Convert base64 data URL to Blob URL (browsers handle this better)
function base64ToBlobUrl(base64Data) {
    try {
        // Remove data URL prefix if present
        const base64String = base64Data.includes(',')
            ? base64Data.split(',')[1]
            : base64Data;

        // Decode base64
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Create blob and URL
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error converting base64 to blob:', error);
        return null;
    }
}

export default function StudentBooksPage() {
    const { user } = useAuth();
    const { data: allEnrollments, loading: enrollmentsLoading } = useEnrollments({ student_id: user?.id });
    const { data: allBooks, loading: booksLoading } = useBooks();

    const [selectedBook, setSelectedBook] = useState(null);
    const [viewingPDF, setViewingPDF] = useState(false);
    const [showAskAI, setShowAskAI] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');

    const isLoading = enrollmentsLoading || booksLoading;

    // Filter books for enrolled classes
    const books = useMemo(() => {
        const classIds = allEnrollments.map(e => e.class_id);
        console.log('Student enrollments (class IDs):', classIds);
        console.log('All books:', allBooks.map(b => ({ id: b.id, title: b.title, class_id: b.class_id })));

        const filteredBooks = allBooks.filter(b => {
            // Show books that either:
            // 1. Are assigned to one of the student's enrolled classes
            // 2. Have no class restriction (class_id is null/undefined)
            const isAssignedToMyClass = b.class_id && classIds.includes(b.class_id);
            const isPublic = !b.class_id;
            return isAssignedToMyClass || isPublic;
        });

        console.log('Filtered books for student:', filteredBooks.length);
        return filteredBooks;
    }, [allEnrollments, allBooks]);

    // Get unique categories from books
    const categories = useMemo(() => {
        const cats = new Set(['All']);
        books.forEach(book => {
            if (book.category) cats.add(book.category);
            if (book.subject) cats.add(book.subject);
        });
        return Array.from(cats);
    }, [books]);

    // Filter books by selected category
    const filteredBooks = useMemo(() => {
        if (selectedCategory === 'All') return books;
        return books.filter(b => b.category === selectedCategory || b.subject === selectedCategory);
    }, [books, selectedCategory]);

    // Loading state
    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <h2 className="text-lg font-bold text-text-main">📚 My Books</h2>
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    // PDF Reader with embedded viewer and AI sidebar
    if (viewingPDF && selectedBook?.pdf_data) {
        // Convert base64 to Blob URL (browsers block large data URLs)
        const pdfBlobUrl = base64ToBlobUrl(selectedBook.pdf_data);
        // Fallback to data URL for download if blob fails
        const pdfDataUrl = selectedBook.pdf_data.startsWith('data:')
            ? selectedBook.pdf_data
            : `data:application/pdf;base64,${selectedBook.pdf_data}`;

        // Use blob URL if available, otherwise data URL
        const pdfSrc = pdfBlobUrl || pdfDataUrl;

        return (
            <div className="fixed inset-0 bg-gray-100 z-[100] flex flex-col">
                {/* Header */}
                <header className="bg-gray-800 p-3 flex items-center gap-3 shrink-0">
                    <button onClick={() => setViewingPDF(false)} className="p-2 hover:bg-gray-700 rounded-lg">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <h2 className="text-white font-bold truncate flex-1 text-sm">{selectedBook.title}</h2>
                    {isGeminiConfigured() && (
                        <button
                            onClick={() => setShowAskAI(true)}
                            className="md:hidden p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg"
                            title="Ask AI"
                        >
                            <span className="text-white">🤖</span>
                        </button>
                    )}
                    <a
                        href={pdfSrc}
                        download={`${selectedBook.title}.pdf`}
                        className="p-2 hover:bg-gray-700 rounded-lg"
                        title="Download PDF"
                    >
                        <span className="material-symbols-outlined text-white">download</span>
                    </a>
                    <a
                        href={pdfSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-700 rounded-lg"
                        title="Open in new tab"
                    >
                        <span className="material-symbols-outlined text-white">open_in_new</span>
                    </a>
                </header>

                {/* Main content area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* PDF Viewer */}
                    <div className="flex-1 bg-white relative flex flex-col">
                        {/* PDF embed using object tag */}
                        <object
                            data={pdfSrc}
                            type="application/pdf"
                            className="flex-1 w-full"
                        >
                            {/* Fallback if PDF doesn't display */}
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="text-6xl mb-4">📄</div>
                                <h3 className="text-lg font-bold text-text-main mb-2">
                                    {selectedBook.title}
                                </h3>
                                <p className="text-text-muted mb-6">
                                    PDF tidak dapat ditampilkan di browser ini
                                </p>
                                <a
                                    href={pdfSrc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">open_in_new</span>
                                    Buka PDF di Tab Baru
                                </a>
                                <a
                                    href={pdfSrc}
                                    download={`${selectedBook.title}.pdf`}
                                    className="mt-3 px-6 py-3 bg-gray-200 text-text-main font-medium rounded-xl flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined">download</span>
                                    Download PDF
                                </a>
                            </div>
                        </object>
                    </div>

                    {/* Desktop: Fixed AI sidebar */}
                    {isGeminiConfigured() && (
                        <div className="hidden md:flex w-80 bg-white border-l border-gray-200 flex-col">
                            <div className="p-4 border-b bg-gradient-to-r from-purple-500 to-blue-500">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <span>🤖</span> Ask AI Helper
                                </h3>
                                <p className="text-white/80 text-xs mt-1">Ask questions about this book</p>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <AskAIModal
                                    isOpen={true}
                                    onClose={() => { }}
                                    material={{
                                        title: selectedBook.title,
                                        author: selectedBook.author,
                                        description: selectedBook.description,
                                        content_text: selectedBook.content_text,
                                    }}
                                    embedded={true}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile: Fullscreen AI panel */}
                {showAskAI && isGeminiConfigured() && (
                    <div className="md:hidden fixed inset-0 bg-white z-[101] flex flex-col">
                        <header className="bg-gradient-to-r from-purple-500 to-blue-500 p-4 flex items-center gap-3">
                            <button onClick={() => setShowAskAI(false)} className="p-2 hover:bg-white/20 rounded-lg">
                                <span className="material-symbols-outlined text-white">arrow_back</span>
                            </button>
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <span>🤖</span> Ask AI Helper
                                </h3>
                                <p className="text-white/80 text-xs">{selectedBook.title}</p>
                            </div>
                        </header>
                        <div className="flex-1 overflow-hidden">
                            <AskAIModal
                                isOpen={true}
                                onClose={() => setShowAskAI(false)}
                                material={{
                                    title: selectedBook.title,
                                    author: selectedBook.author,
                                    description: selectedBook.description,
                                    content_text: selectedBook.content_text,
                                }}
                                embedded={true}
                            />
                        </div>
                    </div>
                )}
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
                        <div className="text-6xl mb-4">{selectedBook.cover_emoji || '📖'}</div>
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

                    {selectedBook.pdf_data ? (
                        <button
                            onClick={handleReadBook}
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">menu_book</span>
                            Read Book
                            {isGeminiConfigured() && <span className="text-white/80 text-sm ml-2">+ AI Helper 🤖</span>}
                        </button>
                    ) : (
                        <div className="text-center py-8 text-text-muted">
                            <div className="text-4xl mb-2">📚</div>
                            <p>Content coming soon!</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const bookColors = ['bg-yellow-400', 'bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400'];

    const handleReadBook = async () => {
        setViewingPDF(true);
        // Log activity
        await logStudentActivity(
            user?.id,
            'book_read',
            selectedBook.id,
            selectedBook.title,
            { category: selectedBook.category || selectedBook.subject }
        );
    };

    return (
        <div className="p-4 space-y-4 pb-24">
            <h2 className="text-lg font-bold text-text-main">📚 My Books</h2>

            {/* Category Filter */}
            {categories.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {filteredBooks.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                    {filteredBooks.map((book, i) => (
                        <button
                            key={book.id}
                            onClick={() => setSelectedBook(book)}
                            className={`${bookColors[i % bookColors.length]} rounded-2xl p-4 h-40 flex flex-col justify-between text-left active:scale-95 transition-transform relative`}
                        >
                            {book.pdf_data && (
                                <div className="absolute top-2 right-2 bg-white/30 px-2 py-0.5 rounded text-xs text-white font-medium">
                                    PDF
                                </div>
                            )}
                            <div className="text-4xl">{book.cover_emoji || '📖'}</div>
                            <div>
                                <h3 className="font-bold text-white text-sm leading-tight">{book.title}</h3>
                                {book.author && (
                                    <p className="text-xs text-white/80">{book.author}</p>
                                )}
                                {(book.category || book.subject) && (
                                    <p className="text-xs text-white/60 mt-0.5">{book.category || book.subject}</p>
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
