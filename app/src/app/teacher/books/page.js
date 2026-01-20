'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import storage from '@/lib/storage';
import { processPDF, formatFileSize } from '@/lib/fileUtils';

export default function TeacherBooksPage() {
    const { user } = useAuth();
    const [books, setBooks] = useState([]);
    const [classes, setClasses] = useState([]);
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = () => {
        const allBooks = storage.books.getAll();
        setBooks(allBooks);

        const allClasses = storage.classes.getAll();
        const teacherClasses = allClasses.filter(c => c.teacherId === user?.id);
        setClasses(teacherClasses);
    };

    const filteredBooks = filter === 'all'
        ? books
        : books.filter(b => b.classIds?.includes(filter));

    const handleDelete = (bookId) => {
        if (confirm('Delete this book?')) {
            storage.books.delete(bookId);
            loadData();
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-main">Class Library</h2>
                <button className="p-2 rounded-lg hover:bg-gray-100">
                    <span className="material-symbols-outlined text-text-muted">tune</span>
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" style={{ fontSize: 20 }}>
                    search
                </span>
                <input
                    type="text"
                    placeholder="Search by title or topic..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm"
                />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'
                        }`}
                >
                    All
                </button>
                {classes.map((cls) => (
                    <button
                        key={cls.id}
                        onClick={() => setFilter(cls.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === cls.id ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'
                            }`}
                    >
                        {cls.name}
                    </button>
                ))}
            </div>

            {/* Books Grid */}
            <div className="grid grid-cols-2 gap-3">
                {filteredBooks.map((book) => (
                    <BookCard
                        key={book.id}
                        book={book}
                        classes={classes}
                        onEdit={() => {
                            setEditingBook(book);
                            setShowModal(true);
                        }}
                        onDelete={() => handleDelete(book.id)}
                    />
                ))}
            </div>

            {/* Add Button */}
            <button
                onClick={() => {
                    setEditingBook(null);
                    setShowModal(true);
                }}
                className="fixed bottom-24 right-4 flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-full shadow-lg font-bold"
            >
                <span className="material-symbols-outlined">add</span>
                Add New Book
            </button>

            {/* Modal */}
            {showModal && (
                <BookModal
                    book={editingBook}
                    classes={classes}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        loadData();
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
}

function BookCard({ book, classes, onEdit, onDelete }) {
    const bookColors = ['bg-yellow-400', 'bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400'];
    const colorIndex = book.id?.charCodeAt(0) % bookColors.length || 0;

    const assignedClasses = classes.filter(c => book.classIds?.includes(c.id));
    const classLabel = assignedClasses.length > 0
        ? assignedClasses.map(c => c.name).join(', ')
        : 'All Classes';

    return (
        <div className="relative group">
            <div className={`${bookColors[colorIndex]} rounded-2xl p-4 h-40 flex flex-col justify-between`}>
                <div className="flex justify-between">
                    <div className="text-4xl">{book.coverEmoji || '📖'}</div>
                    {book.pdfData && (
                        <div className="bg-white/20 px-2 py-1 rounded text-xs text-white font-medium">
                            PDF
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-xs text-white/80 uppercase font-medium">{classLabel}</p>
                    <h3 className="font-bold text-white text-sm leading-tight">{book.title}</h3>
                </div>
            </div>

            {/* Actions overlay */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                    onClick={onEdit}
                    className="p-1.5 bg-white/90 rounded-lg shadow"
                >
                    <span className="material-symbols-outlined text-text-main" style={{ fontSize: 16 }}>edit</span>
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 bg-white/90 rounded-lg shadow"
                >
                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: 16 }}>delete</span>
                </button>
            </div>
        </div>
    );
}

function BookModal({ book, classes, onClose, onSave }) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        title: book?.title || '',
        author: book?.author || '',
        description: book?.description || '',
        coverEmoji: book?.coverEmoji || '📖',
        classIds: book?.classIds || [],
        pdfData: book?.pdfData || null,
        pdfName: book?.pdfName || null,
        pdfSize: book?.pdfSize || null,
    });

    const emojis = ['📖', '📚', '🦁', '🚀', '🍎', '🌊', '🦒', '🎨', '🔢', '🌿', '🐶', '🌈'];

    const toggleClass = (classId) => {
        setFormData(prev => ({
            ...prev,
            classIds: prev.classIds.includes(classId)
                ? prev.classIds.filter(id => id !== classId)
                : [...prev.classIds, classId]
        }));
    };

    const handlePDFUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const result = await processPDF(file);

        if (result.success) {
            setFormData(prev => ({
                ...prev,
                pdfData: result.data,
                pdfName: result.name,
                pdfSize: result.size,
            }));
        } else {
            setError(result.error);
        }

        setUploading(false);
    };

    const removePDF = () => {
        setFormData(prev => ({
            ...prev,
            pdfData: null,
            pdfName: null,
            pdfSize: null,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (book) {
            storage.books.update(book.id, formData);
        } else {
            storage.books.create(formData);
        }

        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
            <div className="w-full max-w-md bg-white rounded-t-3xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 shrink-0">
                    <h3 className="font-bold text-text-main">
                        {book ? 'Edit Book' : 'Add New Book'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Cover Emoji</label>
                            <div className="flex flex-wrap gap-2">
                                {emojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, coverEmoji: emoji })}
                                        className={`w-10 h-10 rounded-lg border-2 text-xl ${formData.coverEmoji === emoji ? 'border-primary bg-primary/10' : 'border-gray-200'
                                            }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Book Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Author</label>
                            <input
                                type="text"
                                value={formData.author}
                                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none resize-none"
                            />
                        </div>

                        {/* PDF Upload */}
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">PDF File</label>
                            {formData.pdfData ? (
                                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <span className="material-symbols-outlined text-green-600" style={{ fontSize: 32 }}>picture_as_pdf</span>
                                    <div className="flex-1">
                                        <p className="font-medium text-green-800 truncate">{formData.pdfName}</p>
                                        <p className="text-xs text-green-600">{formatFileSize(formData.pdfSize)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removePDF}
                                        className="p-2 hover:bg-green-100 rounded-lg"
                                    >
                                        <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>delete</span>
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/10 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }}>
                                        {uploading ? 'hourglass_empty' : 'upload_file'}
                                    </span>
                                    <p className="text-sm text-text-main mt-2 font-medium">
                                        {uploading ? 'Uploading...' : 'Click to upload PDF'}
                                    </p>
                                    <p className="text-xs text-text-muted">Max 5MB</p>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={handlePDFUpload}
                                className="hidden"
                            />
                            {error && (
                                <p className="text-sm text-red-500 mt-2">{error}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Assign to Classes</label>
                            <div className="flex flex-wrap gap-2">
                                {classes.map((cls) => (
                                    <button
                                        key={cls.id}
                                        type="button"
                                        onClick={() => toggleClass(cls.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${formData.classIds.includes(cls.id)
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-text-muted'
                                            }`}
                                    >
                                        {cls.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sticky Submit Button */}
                    <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                        <button
                            type="submit"
                            className="w-full py-3 bg-primary text-text-main font-bold rounded-xl hover:opacity-90 transition-opacity"
                        >
                            {book ? 'Update Book' : 'Add Book'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
