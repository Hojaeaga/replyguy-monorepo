import { randomBytes } from 'crypto';

// ID Generation
export const generateId = (prefix?: string): string => {
    const id = randomBytes(16).toString('hex');
    return prefix ? `${prefix}_${id}` : id;
};

export const generateShortId = (length = 8): string => {
    return randomBytes(length).toString('hex').substring(0, length);
};

// Date/Time Utilities
export const now = (): string => new Date().toISOString();

export const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
};

export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
        )
    ]);
};

// String Utilities
export const truncate = (str: string, length: number, suffix = '...'): string => {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
};

export const slugify = (str: string): string => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim();
};

export const extractHashtags = (text: string): string[] => {
    const hashtags = text.match(/#\w+/g);
    return hashtags ? hashtags.map(tag => tag.substring(1).toLowerCase()) : [];
};

export const extractMentions = (text: string): string[] => {
    const mentions = text.match(/@\w+/g);
    return mentions ? mentions.map(mention => mention.substring(1).toLowerCase()) : [];
};

export const sanitizeText = (text: string): string => {
    return text
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
        .trim();
};

// Validation Utilities
export const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const isValidFid = (fid: any): boolean => {
    return typeof fid === 'number' && fid > 0;
};

export const isValidCastHash = (hash: string): boolean => {
    return typeof hash === 'string' && /^0x[a-fA-F0-9]{40}$/.test(hash);
};

// Array Utilities
export const chunk = <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

export const unique = <T>(array: T[]): T[] => {
    return Array.from(new Set(array));
};

export const shuffle = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Object Utilities
export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
};

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj } as any;
    keys.forEach(key => {
        delete result[key];
    });
    return result;
};

export const isEmpty = (obj: any): boolean => {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
};

// Retry Utilities
export interface RetryOptions {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
    maxDelay?: number;
}

export const retry = async <T>(
    fn: () => Promise<T>,
    options: RetryOptions
): Promise<T> => {
    const { attempts, delay, backoff = 'linear', maxDelay = 30000 } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === attempts) {
                throw lastError;
            }

            let waitTime = delay;
            if (backoff === 'exponential') {
                waitTime = Math.min(delay * Math.pow(2, attempt - 1), maxDelay);
            }

            await sleep(waitTime);
        }
    }

    throw lastError!;
};

// Debounce/Throttle Utilities
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
): T => {
    let timeoutId: NodeJS.Timeout;

    return ((...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
};

export const throttle = <T extends (...args: any[]) => any>(
    func: T,
    delay: number
): T => {
    let lastCall = 0;

    return ((...args: any[]) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func(...args);
        }
    }) as T;
};

// Environment Utilities
export const getEnvVar = (name: string, defaultValue?: string): string => {
    const value = process.env[name];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value || defaultValue!;
};

export const getEnvVarAsNumber = (name: string, defaultValue?: number): number => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required`);
    }
    const parsed = value ? parseInt(value, 10) : defaultValue!;
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${name} must be a valid number`);
    }
    return parsed;
};

export const getEnvVarAsBoolean = (name: string, defaultValue?: boolean): boolean => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required`);
    }
    if (!value) return defaultValue!;
    return value.toLowerCase() === 'true';
};

// Crypto/Hashing Utilities
export const hash = (input: string): string => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(input).digest('hex');
};

export const hashObject = (obj: any): string => {
    return hash(JSON.stringify(obj, Object.keys(obj).sort()));
}; 