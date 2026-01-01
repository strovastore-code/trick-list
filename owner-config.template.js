// Owner Configuration
// COPY THIS FILE TO owner-config.js AND SET YOUR CREDENTIALS
const OWNER_EMAIL = 'your-email@example.com';
const OWNER_PASSWORD = 'your-secure-password';

// Make available to other scripts
if (typeof window !== 'undefined') {
  window.OWNER_EMAIL = OWNER_EMAIL;
  window.OWNER_PASSWORD = OWNER_PASSWORD;
}
