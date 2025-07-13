import 'react-native-get-random-values';
// Global polyfills for React 19 compatibility
import React from 'react';
import { logger } from '@/config/logger';

// Polyfill for useInsertionEffect
if (typeof (React as any).useInsertionEffect === 'undefined') {
  (React as any).useInsertionEffect = (React as any).useLayoutEffect || (React as any).useEffect;
}

// Suppress useInsertionEffect warnings
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    args[0] && 
    typeof args[0] === 'string' && 
    (args[0].includes('useInsertionEffect') || 
     args[0].includes('Warning: React.useInsertionEffect'))
  ) {
    return; // Suppress these warnings
  }
  originalWarn.apply(console, args);
};

// Suppress useInsertionEffect errors
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    args[0] && 
    typeof args[0] === 'string' && 
    (args[0].includes('useInsertionEffect') || 
     args[0].includes('Warning: React.useInsertionEffect'))
  ) {
    return; // Suppress these errors
  }
  originalError.apply(console, args);
};

export {}; 