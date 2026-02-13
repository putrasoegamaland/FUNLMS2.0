/**
 * FunLMS Kids - Storage Utility with Supabase
 * Hybrid storage layer: Supabase primary, localStorage fallback
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { generateUUID } from './uuid';

const STORAGE_PREFIX = 'funlms_';

// ==================== LOCAL STORAGE HELPERS ====================

const getLocalItem = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error(`Error reading ${key}:`, e);
    return null;
  }
};

const setLocalItem = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key}:`, e);
  }
};

// ==================== SUPABASE CRUD FACTORY ====================

const createSupabaseCRUD = (tableName, localKey) => ({
  getAll: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
        if (error) {
          console.error(`Supabase getAll ${tableName}:`, error);
          return getLocalItem(localKey) || [];
        }
        // Sync to local for offline access
        setLocalItem(localKey, data);
        return data || [];
      } catch (e) {
        console.error(`Supabase error in getAll ${tableName}:`, e);
        return getLocalItem(localKey) || [];
      }
    }
    return getLocalItem(localKey) || [];
  },

  getById: async (id) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (error) {
          console.error(`Supabase getById ${tableName}:`, error);
          const items = getLocalItem(localKey) || [];
          return items.find(item => item.id === id) || null;
        }
        return data;
      } catch (e) {
        const items = getLocalItem(localKey) || [];
        return items.find(item => item.id === id) || null;
      }
    }
    const items = getLocalItem(localKey) || [];
    return items.find(item => item.id === id) || null;
  },

  create: async (item) => {
    const newItem = {
      ...item,
      id: item.id || generateUUID(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from(tableName).insert(newItem).select().single();
        if (error) {
          console.error(`Supabase create ${tableName}:`, error);
          // Fallback to local
          const items = getLocalItem(localKey) || [];
          items.push(newItem);
          setLocalItem(localKey, items);
          return newItem;
        }
        // Sync to local
        const items = getLocalItem(localKey) || [];
        items.push(data);
        setLocalItem(localKey, items);
        return data;
      } catch (e) {
        console.error(`Supabase error in create ${tableName}:`, e);
        const items = getLocalItem(localKey) || [];
        items.push(newItem);
        setLocalItem(localKey, items);
        return newItem;
      }
    }

    const items = getLocalItem(localKey) || [];
    items.push(newItem);
    setLocalItem(localKey, items);
    return newItem;
  },

  update: async (id, updates) => {
    const updateData = { ...updates, updated_at: new Date().toISOString() };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from(tableName).update(updateData).eq('id', id).select().single();
        if (error) {
          console.error(`Supabase update ${tableName}:`, error);
          // Fallback to local
          const items = getLocalItem(localKey) || [];
          const index = items.findIndex(item => item.id === id);
          if (index === -1) return null;
          items[index] = { ...items[index], ...updateData };
          setLocalItem(localKey, items);
          return items[index];
        }
        // Sync to local
        const items = getLocalItem(localKey) || [];
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
          items[index] = data;
          setLocalItem(localKey, items);
        }
        return data;
      } catch (e) {
        console.error(`Supabase error in update ${tableName}:`, e);
        const items = getLocalItem(localKey) || [];
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        items[index] = { ...items[index], ...updateData };
        setLocalItem(localKey, items);
        return items[index];
      }
    }

    const items = getLocalItem(localKey) || [];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updateData };
    setLocalItem(localKey, items);
    return items[index];
  },

  delete: async (id) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) {
          console.error(`Supabase delete ${tableName}:`, error);
        }
      } catch (e) {
        console.error(`Supabase error in delete ${tableName}:`, e);
      }
    }

    // Always update local storage
    const items = getLocalItem(localKey) || [];
    const filtered = items.filter(item => item.id !== id);
    setLocalItem(localKey, filtered);
    return filtered.length !== items.length;
  },

  clear: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.error(`Supabase error in clear ${tableName}:`, e);
      }
    }
    setLocalItem(localKey, []);
  },
});

// ==================== SYNC LOCAL CRUD (for backward compatibility) ====================

const createLocalCRUD = (key) => ({
  getAll: () => getLocalItem(key) || [],

  getById: (id) => {
    const items = getLocalItem(key) || [];
    return items.find(item => item.id === id) || null;
  },

  create: (item) => {
    const items = getLocalItem(key) || [];
    const newItem = { ...item, id: item.id || generateUUID(), createdAt: new Date().toISOString() };
    items.push(newItem);
    setLocalItem(key, items);
    return newItem;
  },

  update: (id, updates) => {
    const items = getLocalItem(key) || [];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    setLocalItem(key, items);
    return items[index];
  },

  delete: (id) => {
    const items = getLocalItem(key) || [];
    const filtered = items.filter(item => item.id !== id);
    setLocalItem(key, filtered);
    return filtered.length !== items.length;
  },

  clear: () => setLocalItem(key, []),
});

// ==================== STORAGE API ====================

// Async Supabase storage (recommended for new code)
export const supabaseStorage = {
  users: createSupabaseCRUD('users', 'users'),
  classes: createSupabaseCRUD('classes', 'classes'),
  enrollments: createSupabaseCRUD('enrollments', 'enrollments'),
  books: createSupabaseCRUD('books', 'books'),
  subjects: createSupabaseCRUD('subjects', 'subjects'),
  assessments: createSupabaseCRUD('assessments', 'assessments'),
  attempts: createSupabaseCRUD('attempts', 'attempts'),
  videos: createSupabaseCRUD('videos', 'videos'),
  assignments: createSupabaseCRUD('assignments', 'assignments'),
  submissions: createSupabaseCRUD('submissions', 'submissions'),
  badges: createSupabaseCRUD('badges', 'badges'),
  progress: createSupabaseCRUD('progress', 'progress'),
};

// Sync localStorage storage (backward compatible - existing code uses this)
export const storage = {
  // Core entities (sync, localStorage-based for backward compatibility)
  users: createLocalCRUD('users'),
  classes: createLocalCRUD('classes'),
  enrollments: createLocalCRUD('enrollments'),
  books: createLocalCRUD('books'),
  subjects: createLocalCRUD('subjects'),
  assessments: createLocalCRUD('assessments'),
  attempts: createLocalCRUD('attempts'),
  videos: createLocalCRUD('videos'),
  assignments: createLocalCRUD('assignments'),
  submissions: createLocalCRUD('submissions'),

  // Gamification
  badges: createLocalCRUD('badges'),

  // Video progress per user
  videoProgress: {
    get: (userId, videoId) => getLocalItem(`video_progress_${userId}_${videoId}`),
    set: (userId, videoId, progress) => setLocalItem(`video_progress_${userId}_${videoId}`, progress),
    getAll: (userId) => {
      const allVideos = storage.videos.getAll();
      return allVideos.map(video => ({
        videoId: video.id,
        ...getLocalItem(`video_progress_${userId}_${video.id}`),
      })).filter(p => p.watchedSeconds);
    },
    markComplete: (userId, videoId) => {
      const progress = getLocalItem(`video_progress_${userId}_${videoId}`) || {};
      setLocalItem(`video_progress_${userId}_${videoId}`, {
        ...progress,
        completed: true,
        completedAt: new Date().toISOString(),
      });
    },
  },

  // Single-object stores (not arrays)
  gamificationConfig: {
    get: () => getLocalItem('gamification_config') || getDefaultGamificationConfig(),
    set: (config) => setLocalItem('gamification_config', config),
  },

  // Progress per user (keyed by userId)
  progress: {
    get: (userId) => getLocalItem(`progress_${userId}`) || getDefaultProgress(),
    set: (userId, progress) => setLocalItem(`progress_${userId}`, progress),
    addXP: (userId, amount, subject = null) => {
      const progress = storage.progress.get(userId);
      progress.xp += amount;
      progress.totalXp += amount;

      // Track subject-specific XP
      if (subject) {
        progress.subjectXp = progress.subjectXp || {};
        progress.subjectXp[subject] = (progress.subjectXp[subject] || 0) + amount;
      }

      // Level up logic
      const config = storage.gamificationConfig.get();
      while (progress.xp >= config.xpPerLevel) {
        progress.xp -= config.xpPerLevel;
        progress.level += 1;
      }

      storage.progress.set(userId, progress);
      return progress;
    },
  },

  // Analytics cache
  analyticsCache: {
    get: (type, targetId) => getLocalItem(`analytics_${type}_${targetId}`),
    set: (type, targetId, data) => setLocalItem(`analytics_${type}_${targetId}`, {
      ...data,
      computedAt: new Date().toISOString(),
    }),
    clear: (type, targetId) => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(STORAGE_PREFIX + `analytics_${type}_${targetId}`);
    },
  },
};

// Default configurations
function getDefaultGamificationConfig() {
  return {
    xpPerCorrect: 10,
    xpPerfectBonus: 20,
    xpPerLevel: 100,
    streakBonuses: {
      3: 1.1,
      7: 1.25,
      30: 1.5,
    },
  };
}

function getDefaultProgress() {
  return {
    xp: 0,
    totalXp: 0,
    level: 1,
    streak: 0,
    badges: [],
    subjectXp: {},
  };
}

// Seed initial demo data (runs on first load)
export function seedInitialData() {
  // Only seed if no users exist
  const existingUsers = getLocalItem('users');
  if (existingUsers && existingUsers.length > 0) return;

  // Demo users
  const demoUsers = [
    { id: 'admin-1', username: 'admin', name: 'Administrator', password: 'admin123', role: 'admin', avatar: '👑' },
    { id: 'teacher-1', username: 'teacher', name: 'Ms. Johnson', password: 'teacher123', role: 'teacher', avatar: '👩‍🏫' },
    { id: 'student-1', username: 'alex', name: 'Alex', password: 'alex123', role: 'student', avatar: '🦁' },
    { id: 'student-2', username: 'emma', name: 'Emma', password: 'emma123', role: 'student', avatar: '🦊' },
  ];

  // Demo classes
  const demoClasses = [
    { id: 'class-1', name: 'Grade 1A', emoji: '🌟', description: 'First grade class A', teacherId: 'teacher-1' },
    { id: 'class-2', name: 'Grade 1B', emoji: '🌈', description: 'First grade class B', teacherId: 'teacher-1' },
  ];

  // Demo enrollments
  const demoEnrollments = [
    { id: 'enroll-1', studentId: 'student-1', classId: 'class-1' },
    { id: 'enroll-2', studentId: 'student-2', classId: 'class-1' },
  ];

  // Demo subjects
  const demoSubjects = [
    { id: 'subject-1', name: 'Mathematics', emoji: '🔢' },
    { id: 'subject-2', name: 'Science', emoji: '🔬' },
    { id: 'subject-3', name: 'Reading', emoji: '📚' },
  ];

  setLocalItem('users', demoUsers);
  setLocalItem('classes', demoClasses);
  setLocalItem('enrollments', demoEnrollments);
  setLocalItem('subjects', demoSubjects);

  console.log('✅ Demo data seeded successfully');
}

export default storage;

