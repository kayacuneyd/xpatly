import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import {fileURLToPath} from 'url';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

// serve static files from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname)));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if(!OPENAI_KEY){
  console.warn('OPENAI_API_KEY not set. Chat responses will be simulated.');
}

app.post('/api/leads', (req,res)=>{
  console.log('Lead received', req.body);
  // In production, save to DB. Here respond OK.
  res.json({ok:true});
});

app.post('/api/chat', async (req,res)=>{
  const {message, lang} = req.body || {};
  if(!message) return res.status(400).json({error:'no message'});
  try{
    if(!OPENAI_KEY){
      // fallback simulated response in user's language
      const reply = `Simulated reply: "${message}"`;
      return res.json({reply, lead: null});
    }

    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {role:'system', content: 'You are a helpful real estate assistant. Ask for budget, location, and property type.'},
          {role:'user', content: message}
        ],
        max_tokens: 400
      })
    });

    if(!apiRes.ok){
      const text = await apiRes.text();
      console.error('OpenAI error', text);
      return res.status(502).json({error:'OpenAI error'});
    }
    const data = await apiRes.json();
    const reply = data.choices?.[0]?.message?.content || '...';
    // Simple lead extraction heuristic
    let lead = null;
    if(/(budget|bütçe|цена|hind|price)/i.test(message)){
      lead = { note: message, lang, createdAt: new Date().toISOString() };
    }
    res.json({reply, lead});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, ()=> console.log(`Server running on http://localhost:${PORT}`));
