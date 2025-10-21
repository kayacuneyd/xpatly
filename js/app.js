import {messages, supported, t} from './i18n.js';

// tüm DOM elementlerine erişim için DOMContentLoaded içinde başlat
document.addEventListener('DOMContentLoaded', ()=>{
  // --- Dil seçimi ve i18n init ---
  // header'daki select kaldırıldı; footer'daki select (langSelectFooter) kullanılıyor.
  const langSelect = document.getElementById('langSelect') || document.getElementById('langSelectFooter');

  // mapping for footer display (yalnızca gösterim amaçlı)
  const langNames = { en: 'English', ru: 'Русский', et: 'Eesti', tr: 'Türkçe' };

  if(langSelect){
    // Wenn das Select bereits Optionen enthält (z.B. statisch im HTML mit Flaggen),
    // nichts hinzufügen — so vermeiden wir doppelte Einträge.
    if(!langSelect.options || langSelect.options.length === 0){
      supported.forEach(code=>{
        const opt = document.createElement('option');
        opt.value = code;
        // Verwende eine lesbare Bezeichnung, wenn vorhanden, sonst ISO-Code
        opt.textContent = langNames[code] || code.toUpperCase();
        langSelect.appendChild(opt);
      });
    }
  }

  function applyTranslations(lang){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      el.innerHTML = t(key, lang);
    });
    // placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key, lang);
    });
    document.title = t('title', lang);
    // set HTML lang attribute for accessibility and SEO
    try{ document.documentElement.lang = lang; }catch(e){/* noop */}
  }

  async function detectCountryLang(){
    // default en
    try{
      const res = await fetch('https://ipapi.co/json/');
      if(res.ok){
        const data = await res.json();
        const country = (data.country_code||'').toUpperCase();
        if(country === 'RU') return 'ru';
        if(country === 'EE') return 'et';
      }
    }catch(err){
      console.warn('Geo lookup failed', err);
    }
    const nav = (navigator.language||navigator.userLanguage||'en').slice(0,2);
    return supported.includes(nav) ? nav : 'en';
  }

  async function initLanguage(){
    const saved = localStorage.getItem('lang');
    let initial = 'en';
    if(saved && supported.includes(saved)){
      initial = saved;
    }else{
      const detected = await detectCountryLang();
      initial = supported.includes(detected) ? detected : 'en';
    }
    if(langSelect) langSelect.value = initial;
    applyTranslations(initial);
  }

  initLanguage();

  if(langSelect){
    langSelect.addEventListener('change', e=>{
      const lang = e.target.value;
      localStorage.setItem('lang', lang);
      applyTranslations(lang);
    });
  }

  // --- Embedded Chat Panel ---
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');

  function addMessage(role, text){
    if(!chatMessages) return;
    const p = document.createElement('p');
    p.className = role; // 'user' | 'assistant'
    p.innerHTML = role === 'assistant' ? `<strong>Asistan:</strong> ${text}` : text;
    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function sendChat(text){
    addMessage('user', text);
    try{
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({message:text, lang: langSelect ? langSelect.value : 'en'})
      });
      if(!res.ok) throw new Error('chat error');
      const j = await res.json();
      addMessage('assistant', j.reply || t('chat.welcome', langSelect ? langSelect.value : 'en'));
      if(j.lead) {
        const leads = JSON.parse(localStorage.getItem('leads')||'[]');
        leads.push(j.lead);
        localStorage.setItem('leads', JSON.stringify(leads));
      }
    }catch(err){
      console.error(err);
      addMessage('assistant', t('chat.welcome', langSelect ? langSelect.value : 'en'));
    }
  }

  if(chatForm && chatInput){
    chatForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const txt = chatInput.value.trim();
      if(!txt) return;
      sendChat(txt);
      chatInput.value = '';
    });
    chatInput.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        chatForm.requestSubmit();
      }
    });
  }

});

async function sendChat(text){
  addMessage('Siz', text, 'user');
  try{
    const res = await fetch('/api/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({message:text, lang: langSelect.value})
    });
    if(!res.ok) throw new Error('chat error');
    const j = await res.json();
    addMessage('Asistan', j.reply, 'assistant');
    if(j.lead) {
      const leads = JSON.parse(localStorage.getItem('leads')||'[]');
      leads.push(j.lead);
      localStorage.setItem('leads', JSON.stringify(leads));
    }
  }catch(err){
    console.error(err);
    addMessage('Asistan', t('chat.welcome', langSelect.value), 'assistant');
  }
}

sendButton.addEventListener('click', ()=>{
  const txt = chatInput.value.trim();
  if(!txt) return;
  sendChat(txt);
  chatInput.value = '';
});
chatInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){ sendButton.click(); }
});
