/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param unsafe - The string to escape (can be any type, will be converted to string)
 * @returns Escaped string safe for HTML insertion
 */
export function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&#039;');
}
