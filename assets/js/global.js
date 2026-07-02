import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import CONFIG from './config.js';

// Initialize Client using centralized config
export const client = createClient(
  CONFIG.SUPABASE.URL,
  CONFIG.SUPABASE.ANON_KEY
);

// Auth API URL
const AUTH_URL = CONFIG.SUPABASE.AUTH_FUNCTION;

// Common Utilities
export function getSession() {
  const sess = localStorage.getItem('mc_member_session');
  return sess ? JSON.parse(sess) : null;
}

export function getToken() {
  return localStorage.getItem('mc_member_token');
}

// Validate session with server (async)
export async function validateSession() {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate', token })
    });
    const result = await response.json();

    if (result.valid && result.member) {
      // Update local session with fresh data
      localStorage.setItem('mc_member_session', JSON.stringify(result.member));
      return result.member;
    }
  } catch (e) {
    console.error('Session validation error:', e);
    // Notificar al usuario sobre el error de conexión
    if (typeof showToast === 'function') {
      showToast('ERROR DE CONEXIÓN', 'error');
    }
  }

  // Invalid session - clear storage
  clearSession();
  return null;
}

export function clearSession() {
  localStorage.removeItem('mc_member_token');
  localStorage.removeItem('mc_member_session');
}

// Redirect if not authenticated (async version)
export async function requireAuth() {
  const member = await validateSession();
  if (!member) {
    window.location.href = 'index';
    return null;
  }
  return member;
}

// Sync version for quick checks (use validateSession for secure check)
export function requireAuthSync() {
  const user = getSession();
  if (!user || !getToken()) {
    window.location.href = 'index';
    return null;
  }
  return user;
}

/**
 * Sistema de notificaciones Toast.
 * @param {string} msg - Mensaje a mostrar
 * @param {'info'|'success'|'error'|'warning'} type - Tipo de notificación
 */
export function showToast(msg, type = 'info') {
  // Crear contenedor si no existe
  let container = document.getElementById('mc-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mc-toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  // Colores por tipo
  const colors = {
    info: { bg: 'rgba(228,210,168,0.15)', border: '#e4d2a8', text: '#e4d2a8' },
    success: { bg: 'rgba(74,222,128,0.15)', border: '#4ade80', text: '#4ade80' },
    error: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444' },
    warning: { bg: 'rgba(251,191,36,0.15)', border: '#fbbf24', text: '#fbbf24' }
  };
  const c = colors[type] || colors.info;

  // Crear toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${c.bg};
    backdrop-filter: blur(12px);
    border: 1px solid ${c.border};
    color: ${c.text};
    padding: 12px 20px;
    border-radius: 8px;
    font-family: 'Manrope', sans-serif;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.5px;
    pointer-events: auto;
    transform: translateX(120%);
    transition: transform 0.3s ease;
    max-width: 320px;
  `;
  toast.textContent = msg;
  container.appendChild(toast);

  // Animar entrada
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
  });

  // Auto-dismiss
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Exponer globalmente para acceso desde cualquier módulo
window.Toast = showToast;
