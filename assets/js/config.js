/**
 * Midnight Club Online - Configuration
 * Centralizes all environment variables and constants.
 */

const CONFIG = {
    SUPABASE: {
        URL: 'https://iyknbgmcnbpvalvsjxjz.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a25iZ21jbmJwdmFsdnNqeGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTc4MTEsImV4cCI6MjA4MzkzMzgxMX0.n3aFby5YOMZbyqwsWZPlSJuf_KzRB6woja70divY32A',
        // Edge Function for secure member authentication
        AUTH_FUNCTION: 'https://iyknbgmcnbpvalvsjxjz.supabase.co/functions/v1/auth-member'
    },
    // EMAILJS: Removed - email now sent from backend via Resend
    ASSETS: {
        DEFAULT_HERO: 'assets/images/hero_bg.jpg'
    }
};

export default CONFIG;
