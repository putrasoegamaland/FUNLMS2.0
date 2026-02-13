
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'local_data');
const DB_FILE = path.join(DB_PATH, 'db.json');

// Default empty schema
const DEFAULT_DB = {
    users: [],
    classes: [],
    enrollments: [],
    assessments: [],
    attempts: [],
    assignments: [],
    submissions: [],
    progress: [],
    books: [],
    videos: [],
    teacher_notifications: [],
    teacher_activity: [],
    student_activity: [],
    questions: [],
    question_bank: [],
    subject_benchmarks: [],
    topics: [],
    last_sync: null
};

// Ensure DB directory and file exist
export async function initLocalDB() {
    try {
        await fs.mkdir(DB_PATH, { recursive: true });
        try {
            await fs.access(DB_FILE);
        } catch {
            // File doesn't exist, create it
            await fs.writeFile(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
        }
        return true;
    } catch (error) {
        console.error('Error initializing local DB:', error);
        return false;
    }
}

// Read the entire DB
export async function getLocalDB() {
    try {
        await initLocalDB();
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading local DB:', error);
        return DEFAULT_DB;
    }
}

// Write the entire DB
export async function saveLocalDB(data) {
    try {
        await initLocalDB();
        await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        // Handle read-only filesystem (Vercel serverless)
        if (error.code === 'EROFS' || error.code === 'ENOENT' || error.code === 'EACCES') {
            console.warn('Local DB write skipped (read-only filesystem, e.g. Vercel)');
            return false;
        }
        console.error('Error saving local DB:', error);
        return false;
    }
}

// Get specific collection
export async function getCollection(collectionName) {
    const db = await getLocalDB();
    return db[collectionName] || [];
}

// Save specific collection (replace)
export async function saveCollection(collectionName, items) {
    const db = await getLocalDB();
    db[collectionName] = items;
    await saveLocalDB(db);
    return true;
}

// Authenticate user against local DB
export async function authenticateLocalUser(username, password) {
    const users = await getCollection('users');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        const { password: _, ...safeUser } = user;
        return safeUser;
    }
    return null;
}
