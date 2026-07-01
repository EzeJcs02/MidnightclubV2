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

  // Formato Fecha Automático
  dobInput.addEventListener('input', function(e) {
    let value = this.value.replace(/\D/g, '');
    if (value.length > 8) value = value.substring(0, 8);
    let formatted = '';
    if (value.length > 0) formatted = value.substring(0, 2);
    if (value.length >= 3) formatted += '/' + value.substring(2, 4);
    if (value.length >= 5) formatted += '/' + value.substring(4, 8);
    this.value = formatted;
  });
  dobInput.addEventListener('keydown', function(e) { if (e.key === 'Backspace' && this.value.endsWith('/')) {} });
  
  // 4.8: Validación fecha en tiempo real
  dobInput.addEventListener('blur', function() {
    const value = this.value;
    const hint = document.getElementById('nacimiento-hint');
    this.classList.remove('input-error', 'input-success');
    
    if (!value) {
      if (hint) hint.textContent = 'Formato: DD/MM/AAAA';
      return;
    }
    
    // Validar formato completo
    if (value.length !== 10) {
      this.classList.add('input-error');
      if (hint) hint.textContent = 'Fecha incompleta';
      return;
    }
    
    // Validar fecha válida
    const parts = value.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
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
    if (hint) hint.textContent = 'Formato: DD/MM/AAAA';
  });

  // Enviar a Supabase
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // 1. Validar edad (+18)
    const dobValue = dobInput.value;
    if (dobValue.length !== 10) return;
    const parts = dobValue.split('/');
    const birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

    if (age < 18) {
      errorMsg.style.display = 'block';
      errorMsg.innerText = 'DEBES SER MAYOR DE 18 AÑOS';
      return;
    }

    // 2. VALIDAR DUPLICADOS
    const emailInput = document.getElementById('email').value.trim().toLowerCase();
    const phoneInput = document.getElementById('telefono').value.trim();

    btnSubmit.disabled = true;
    btnSubmit.childNodes[2].textContent = " VERIFICANDO...";

    // Check email (case insensitive para seguridad)
    const { data: emailExists, error: errEmail } = await client
        .from('members')
        .select('id')
        .ilike('email', emailInput)
        .maybeSingle();

    // Check phone
    const { data: phoneExists, error: errPhone } = await client
        .from('members')
        .select('id')
        .eq('telefono', phoneInput)
        .maybeSingle();

    if (errEmail || errPhone) {
        errorMsg.style.display = 'block';
        errorMsg.innerText = 'ERROR DE CONEXIÓN AL VERIFICAR DATOS';
        btnSubmit.disabled = false;
        btnSubmit.childNodes[2].textContent = "ENVIAR SOLICITUD";
        return;
    }

    if (emailExists || phoneExists) {
        errorMsg.style.display = 'block';
        errorMsg.innerText = emailExists
            ? 'ESTE EMAIL YA FUE REGISTRADO'
            : 'ESTE NÚMERO YA FUE REGISTRADO';
        btnSubmit.disabled = false;
        btnSubmit.childNodes[2].textContent = "ENVIAR SOLICITUD";
        return;
    }

    // 3. Guardar
    errorMsg.style.display = 'none';
    loader.style.display = 'inline-block';
    btnSubmit.childNodes[2].textContent = " GUARDANDO...";
    
    // Normalizar datos finales
    const nombreFinal = document.getElementById('nombre').value.trim();
    const instagramFinal = document.getElementById('instagram').value.trim();

    const { error } = await client
      .from('members')
      .insert({
        nombre: nombreFinal,
        nacimiento: dobInput.value,
        instagram: instagramFinal,
        telefono: phoneInput,
        email: emailInput
      });

    loader.style.display = 'none';
    
    if (error) {
      console.error(error);
      errorMsg.style.display = 'block';
      errorMsg.innerText = 'ERROR DE CONEXIÓN - INTENTA NUEVAMENTE';
      btnSubmit.disabled = false;
      btnSubmit.childNodes[2].textContent = "ENVIAR SOLICITUD";
    } else {
      // Éxito - limpiar draft
      localStorage.removeItem('mco_member_draft');
      form.style.display = 'none';
      successMsg.style.display = 'block';
      setTimeout(() => { window.location.href = 'success.html'; }, 1500);
    }
  });
});
