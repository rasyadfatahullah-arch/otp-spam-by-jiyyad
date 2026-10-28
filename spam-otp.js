const DAILY_LIMIT = 7;
const LIMIT_KEY   = 'spamOtp_count';
const DATE_KEY    = 'spamOtp_date';

/* ================= DOM ================= */
const phoneInput   = document.getElementById('phoneInput');
const sendBtn      = document.getElementById('sendBtn');
const sendText     = document.getElementById('sendText');
const consoleEl    = document.getElementById('console');
const channelModal = document.getElementById('channelModal');

/* ================= LIMIT HELPER ================= */
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getUsage() {
  const savedDate = localStorage.getItem(DATE_KEY);
  const today     = getTodayStr();
  if (savedDate !== today) {
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
  updateBtnLabel();
  const used = getUsage();
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

  sendBtn.disabled = true;
  sendText.textContent = 'MEMPROSES...';
  log(`Mengirim request ke nomor: ${phone}...`, 'info');

  let success = false;

  try {
    const res = await fetch('/api/spam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomor: phone })
    });
    if (res.ok) {
      const txt = await res.text();
      log(`✅ SUCCESS: ${txt.substring(0, 100)}`, 'success');
      success = true;
    } else {
      log(`❌ GAGAL: Server merespons ${res.status}`, 'error');
    }
  } catch (e) {
    log(`❌ GAGAL: ${e.message}`, 'error');
  }

  if (success) {
    const nowUsed = incrementUsage();
    const sisa = DAILY_LIMIT - nowUsed;
    log(`🎯 Proses selesai. Cek HP target (${phone}).`, 'success');
    log(`📊 Sisa penggunaan hari ini: ${sisa}/${DAILY_LIMIT}`, 'warn');
  }

  updateBtnLabel();
}
