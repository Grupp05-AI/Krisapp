import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Enkel OpenAI-funktion (ingen streaming för enkelhet)
async function askOpenAI(messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      messages
    })
  });
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

const SYSTEM_PROMPT = `
Du är en svensk krisinformationsassistent. Svara kort och sakligt. 
Om användaren beskriver en faktisk händelse som kan vara ett tips, 
lägg sist i svaret EN rad: 
TIP: {"title":"...","text":"..."}
`;

// POST /api/chat  – tar emot {sessionId, message}, svarar {reply}
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body || {};
    if (!sessionId || !message) return res.status(400).json({ error: 'sessionId och message krävs' });

    // spara användarmeddelande
    await supabase.from('chat_messages').insert({ sender: 'user', message });

    // fråga OpenAI (vi skickar med systemprompt + senaste användarmeddelande)
    const reply = await askOpenAI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: message }
    ]);

    // spara AI-svar
    await supabase.from('chat_messages').insert({ sender: 'assistant', message: reply });

    // extrahera ev. TIP-rad och spara i tips-tabellen
    const tipLine = reply.split('\n').find(l => l.trim().startsWith('TIP:'));
    if (tipLine) {
      const jsonStr = tipLine.trim().slice(4).trim();
      try {
        const tip = JSON.parse(jsonStr);
        await supabase.from('tips').insert({
          title: tip.title || null,
          text:  tip.text  || null,
          attachments: null
        });
      } catch { /* ignorera om json felar */ }
    }

    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Serverfel' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server igång: http://localhost:${PORT}`));
