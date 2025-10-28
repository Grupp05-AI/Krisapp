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
