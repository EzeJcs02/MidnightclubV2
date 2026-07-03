import { client } from './global.js';
import { loadDynamicHero, pulseSuccess, setupAuthUI } from './shared-ui.js';

loadDynamicHero();
setupAuthUI();

// Helper: mostrar hint de validación
function showHint(input, message, type) {
  let hint = input.nextElementSibling;
  if (!hint || !hint.classList.contains('input-hint')) {
    hint = document.createElement('div');
    hint.className = 'input-hint';
    input.parentNode.insertBefore(hint, input.nextSibling);
  }
  hint.textContent = message;
  hint.className = `input-hint ${type} ${message ? 'visible' : ''}`;
}

// Validación en tiempo real
async function validateEmail(e) {
  const input = e.target;
  const email = input.value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  input.classList.remove('input-error', 'input-success');
  
  if (!email) {
    showHint(input, '', '');
    return;
  }
  
  if (!emailRegex.test(email)) {
    input.classList.add('input-error');
    showHint(input, 'Formato de email inválido', 'error');
    return;
  }
  
  // Check duplicado async
  const { data, error } = await client.from('members').select('id').ilike('email', email).maybeSingle();
  if (error) console.error("Error validando email:", error);
  if (data) {
    input.classList.add('input-error');
    showHint(input, 'Este email ya está registrado', 'error');
  } else {
    input.classList.add('input-success');
    showHint(input, '', 'success');
  }
}

async function validatePhone(e) {
  const input = e.target;
  const phone = input.value.trim();
  
  input.classList.remove('input-error', 'input-success');
  
  if (!phone) {
    showHint(input, '', '');
    return;
  }
  
  if (phone.length < 8) {
    input.classList.add('input-error');
    showHint(input, 'Número muy corto', 'error');
    return;
  }
  
  // Check duplicado
  const { data, error } = await client.from('members').select('id').eq('telefono', phone).maybeSingle();
  if (error) console.error("Error validando teléfono:", error);
  if (data) {
    input.classList.add('input-error');
    showHint(input, 'Este número ya está registrado', 'error');
  } else {
    input.classList.add('input-success');
    showHint(input, '', 'success');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dobInput = document.getElementById('nacimiento');
  const form = document.getElementById('memberForm');
  const errorMsg = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');
  const btnSubmit = document.getElementById('btnSubmit');
  const loader = document.getElementById('loader');
  
  // Validación en tiempo real
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('telefono');
  emailInput?.addEventListener('blur', validateEmail);
  phoneInput?.addEventListener('blur', validatePhone);

  if (!dobInput || !form) return;
  
  // 3.8: Form Auto-Save
  const DRAFT_KEY = 'mco_member_draft';
  const FORM_FIELDS = ['nombre', 'nacimiento', 'instagram', 'telefono', 'email'];
  
  // Restaurar draft si existe
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft) {
    try {
      const draft = JSON.parse(savedDraft);
      const hasData = FORM_FIELDS.some(f => draft[f]);
      if (hasData && confirm('¿Querés continuar tu solicitud anterior?')) {
        FORM_FIELDS.forEach(field => {
          const el = document.getElementById(field);
          if (el && draft[field]) el.value = draft[field];
        });
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (e) { localStorage.removeItem(DRAFT_KEY); }
  }
  
  // Auto-save cada 5 segundos
  setInterval(() => {
    const draft = {};
    FORM_FIELDS.forEach(field => {
      const el = document.getElementById(field);
      if (el) draft[field] = el.value;
    });
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, 5000);
  
  // Clear draft on success (agregado más abajo en submit handler)

  // 4.8: Validación fecha en tiempo real (nativo type="date" devuelve YYYY-MM-DD)
  dobInput.addEventListener('blur', function() {
    const value = this.value; // YYYY-MM-DD
    const hint = document.getElementById('nacimiento-hint');
    this.classList.remove('input-error', 'input-success');
    
    if (!value) {
      if (hint) hint.textContent = '';
      return;
    }
    
    // Validar formato YYYY-MM-DD
    if (value.length !== 10) {
      this.classList.add('input-error');
      if (hint) hint.textContent = 'Fecha incompleta';
      return;
    }
    
    const parts = value.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month - 1, day);
    
    if (date.getDate() !== day || date.getMonth() !== month - 1 || year < 1900 || year > new Date().getFullYear()) {
      this.classList.add('input-error');
      if (hint) hint.textContent = 'Fecha inválida';
      return;
    }
    
    // Validar edad mínima (18 años)
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - (month - 1);
    if (m < 0 || (m === 0 && today.getDate() < day)) age--;
    
    if (age < 18) {
      this.classList.add('input-error');
      if (hint) hint.textContent = 'Debes ser mayor de 18';
      return;
    }
    
    this.classList.add('input-success');
    if (hint) hint.textContent = '';
  });

  // Enviar a Supabase
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // 1. Validar edad (+18) con YYYY-MM-DD
    const dobValue = dobInput.value;
    if (dobValue.length !== 10) return;
    const parts = dobValue.split('-');
    const birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    if (age < 18) {
      errorMsg.style.display = 'block';
      errorMsg.innerText = 'DEBES SER MAYOR DE 18 AÑOS';
      return;
    }

    const emailInput = document.getElementById('email').value.trim().toLowerCase();
    const phoneInput = document.getElementById('telefono').value.trim();
    const nombreFinal = document.getElementById('nombre').value.trim();
    const instagramFinal = document.getElementById('instagram').value.trim();

    btnSubmit.disabled = true;
    btnSubmit.childNodes[2].textContent = " GUARDANDO...";
    errorMsg.style.display = 'none';
    loader.style.display = 'inline-block';

    // 2. Enviar a Edge Function segura
    try {
      // Usar authRequest porque apunta al Edge Function "auth-member" 
      // (Se debe exportar o definir authRequest en members.js o shared-ui.js)
      const res = await fetch(window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') 
          ? 'https://tiaclyamzvcnyqwdcyen.supabase.co/functions/v1/auth-member' 
          : 'https://tiaclyamzvcnyqwdcyen.supabase.co/functions/v1/auth-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          user_data: {
            nombre: nombreFinal,
            email: emailInput,
            telefono: phoneInput,
            fecha_nacimiento: dobValue, // YYYY-MM-DD
            instagram: instagramFinal
          }
        })
      });

      const result = await res.json();
      loader.style.display = 'none';

      if (result.success) {
        localStorage.removeItem('mco_member_draft');
        form.style.display = 'none';
        successMsg.style.display = 'block';
        setTimeout(() => { window.location.href = 'success.html'; }, 1500);
      } else {
        errorMsg.style.display = 'block';
        errorMsg.innerText = result.error || 'ERROR DE CONEXIÓN - INTENTA NUEVAMENTE';
        btnSubmit.disabled = false;
        btnSubmit.childNodes[2].textContent = "ENVIAR SOLICITUD";
      }
    } catch (error) {
      console.error(error);
      loader.style.display = 'none';
      errorMsg.style.display = 'block';
      errorMsg.innerText = 'ERROR DE RED - INTENTA NUEVAMENTE';
      btnSubmit.disabled = false;
      btnSubmit.childNodes[2].textContent = "ENVIAR SOLICITUD";
    }
  });
});
