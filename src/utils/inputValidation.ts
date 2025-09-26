// Input validation utilities to prevent XSS and injection attacks
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/vbscript:/gi, '') // Remove vbscript protocol
    .replace(/data:/gi, '') // Remove data protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit length
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validateSearchQuery = (query: string): boolean => {
  if (typeof query !== 'string') return false;
  if (query.length === 0 || query.length > 500) return false;
  // Allow alphanumeric, spaces, and common punctuation
  const allowedChars = /^[a-zA-Z0-9\s.,!?'"()\-_@#$%^&*+=\[\]{}|\\:;`~]+$/;
  return allowedChars.test(query);
};

export const validateFileName = (fileName: string): boolean => {
  if (typeof fileName !== 'string') return false;
  if (fileName.length === 0 || fileName.length > 255) return false;
  // Prevent path traversal and dangerous characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  const pathTraversal = /\.\./;
  return !invalidChars.test(fileName) && !pathTraversal.test(fileName);
};

export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};