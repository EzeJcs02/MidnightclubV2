/**
 * Midnight Club Online - Configuration
 * Centralizes all environment variables and constants.
 */

const CONFIG = {
    SUPABASE: {
        URL: 'https://tiaclyamzvcnyqwdcyen.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpYWNseWFtenZjbnlxd2RjeWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzI4MjYsImV4cCI6MjA5ODUwODgyNn0.GyYGY7c5st9JlMrFGf-N8ho5eXD1RKtcT2YL-IlMIOs',
        // Edge Function for secure member authentication
        AUTH_FUNCTION: 'https://tiaclyamzvcnyqwdcyen.supabase.co/functions/v1/auth-member',
        // Edge Function for member tickets
        TICKETS_FUNCTION: 'https://tiaclyamzvcnyqwdcyen.supabase.co/functions/v1/tickets-api'
    },
    ASSETS: {
        DEFAULT_HERO: 'assets/images/hero_bg.jpg'
    }
};

export default CONFIG;
