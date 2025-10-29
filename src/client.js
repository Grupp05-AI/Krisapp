const chat = document.getElementById('chat');
const form = document.getElementById('chatForm');
const input = document.getElementById('msg');
const sessionId = 'sess_' + Math.random().toString(36).slice(2,10);

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  div.appendChild(bubble);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage('user', text);
  input.value = '';
  addMessage('assistant', 'Tänker…');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ sessionId, message: text })
    });
    const data = await res.json();
    chat.removeChild(chat.lastChild); // ta bort "Tänker…"
    if (!res.ok) throw new Error(data?.error || 'Fel');
    const clean = (data.reply || '').replace(/^TIP:\s*\{.*\}\s*$/m, '').trim();
    addMessage('assistant', clean || '(inget svar)');
  } catch (err) {
    chat.removeChild(chat.lastChild);
    addMessage('assistant', 'Kunde inte hämta svar just nu.');
    console.error(err);
  }
});
// ====== Supabase TEST: skriv till 'tips' utan AI ======
const SUPABASE_URL = "https://DIN-REF.supabase.co";     // BYT till ditt värde (Settings → API)
const SUPABASE_ANON_KEY = "DIN_ANON_KEY";               // BYT till ditt anon key (inte service key!)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const testForm = document.getElementById('testForm');
const testMsg  = document.getElementById('testMsg');

if (testForm) {
  testForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    testMsg.textContent = "Skickar…";

    const title = document.getElementById('tipTitle').value.trim();
    const text  = document.getElementById('tipText').value.trim();

    // Skriv en rad till 'tips' (kräver att du lagt till 'anon insert policy' i steg 1)
    const { data, error } = await sb
      .from('tips')
      .insert({ title, text })
      .select(); // tar tillbaka skapad rad

    if (error) {
      testMsg.textContent = "Fel: " + error.message;
    } else {
      testMsg.textContent = "Klart! Nytt tips skapat med id: " + data[0].id;
      testForm.reset();
    }
  });
}

