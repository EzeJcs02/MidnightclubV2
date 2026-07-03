import CONFIG from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pinInput');
  const btnEnter = document.getElementById('btnEnter');
  
  const authSection = document.getElementById('authSection');
  const scannerSection = document.getElementById('scannerSection');
  
  const btnManual = document.getElementById('btnManual');
  const manualCode = document.getElementById('manualCode');
  
  const resultModal = document.getElementById('resultModal');
  const resultTitle = document.getElementById('resultTitle');
  const resultMsg = document.getElementById('resultMsg');
  const ticketInfo = document.getElementById('ticketInfo');
  const btnNextScan = document.getElementById('btnNextScan');
  
  const tiEvent = document.getElementById('tiEvent');
  const tiMember = document.getElementById('tiMember');

  let html5QrcodeScanner = null;
  let currentPin = '';
  let isScanning = false;

  // --- 1. Login Logic ---
  // El PIN no se valida en el cliente: se guarda y se envía al servidor
  // en cada validación de ticket, que es quien realmente lo verifica.
  btnEnter.addEventListener('click', () => {
    const pin = pinInput.value.trim();
    if (!pin) {
      alert('INGRESA EL PIN');
      return;
    }
    currentPin = pin;
    authSection.style.display = 'none';
    scannerSection.style.display = 'flex';
    startScanner();
  });

  // --- 2. Scanner Logic ---
  function startScanner() {
    if (html5QrcodeScanner) return; // Ya iniciado

    html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: {width: 250, height: 250} },
      /* verbose= */ false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    isScanning = true;
  }

  function onScanSuccess(decodedText, decodedResult) {
    if (!isScanning) return;
    isScanning = false;
    
    // Detener escaner temporalmente
    if (html5QrcodeScanner) {
      try { html5QrcodeScanner.pause(true); } catch(e) {}
    }
    
    validateCode(decodedText);
  }

  function onScanFailure(error) {
    // ignorar los errores normales de "no se detecta qr"
  }

  // --- 3. Manual Entry Logic ---
  btnManual.addEventListener('click', () => {
    const code = manualCode.value.trim().toUpperCase();
    if (code) {
      if (html5QrcodeScanner) {
        try { html5QrcodeScanner.pause(true); } catch(e) {}
      }
      validateCode(code);
    }
  });

  // --- 4. Validation Logic ---
  async function validateCode(qrCode) {
    // UI de carga
    resultModal.style.background = 'rgba(0,0,0,0.95)';
    resultTitle.style.color = '#fff';
    resultTitle.textContent = 'VERIFICANDO...';
    resultMsg.textContent = 'Contactando servidor...';
    ticketInfo.style.display = 'none';
    resultModal.style.display = 'flex';
    
    try {
      const res = await fetch(CONFIG.SUPABASE.TICKETS_FUNCTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'validate_ticket', 
          pin: currentPin,
          qr_code: qrCode
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // ENTRADA VALIDA
        resultModal.style.background = '#0a2e0a'; // Verde oscuro
        resultTitle.style.color = '#4ade80'; // Verde brillante
        resultTitle.textContent = '✅ VÁLIDO';
        resultMsg.textContent = data.message;
        
        if (data.ticket && data.ticket.events && data.ticket.members) {
          tiEvent.textContent = data.ticket.events.title;
          tiMember.textContent = data.ticket.members.nombre;
          ticketInfo.style.display = 'block';
        }
      } else {
        // ERROR O USADA
        resultModal.style.background = '#3b0909'; // Rojo oscuro
        resultTitle.style.color = '#f87171'; // Rojo brillante
        resultTitle.textContent = '❌ RECHAZADO';
        resultMsg.textContent = data.error || 'CÓDIGO INVÁLIDO';

        // PIN incorrecto: volver a pedirlo, no seguir escaneando con un PIN inválido
        if (data.error && data.error.toLowerCase().includes('pin')) {
          currentPin = '';
          pinInput.value = '';
        }

        if (data.ticket && data.ticket.events && data.ticket.members) {
          tiEvent.textContent = data.ticket.events.title;
          tiMember.textContent = data.ticket.members.nombre;
          ticketInfo.style.display = 'block';
        }
      }
    } catch (e) {
      resultModal.style.background = '#3b0909'; // Rojo oscuro
      resultTitle.style.color = '#f87171'; // Rojo brillante
      resultTitle.textContent = '❌ ERROR';
      resultMsg.textContent = 'Fallo de conexión';
    }
  }

  // --- 5. Reset Logic ---
  btnNextScan.addEventListener('click', () => {
    resultModal.style.display = 'none';
    manualCode.value = '';

    if (!currentPin) {
      // El PIN fue rechazado por el servidor: volver a pedirlo
      if (html5QrcodeScanner) {
        try { html5QrcodeScanner.pause(true); } catch (e) {}
      }
      scannerSection.style.display = 'none';
      authSection.style.display = 'flex';
      return;
    }

    isScanning = true;
    if (html5QrcodeScanner) {
      html5QrcodeScanner.resume();
    }
  });

});
