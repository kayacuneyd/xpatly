import {messages, supported, t} from './i18n.js';

// tüm DOM elementlerine erişim için DOMContentLoaded içinde başlat
document.addEventListener('DOMContentLoaded', ()=>{
  // --- Dil seçimi ve i18n init ---
  // header'daki select kaldırıldı; footer'daki select (langSelectFooter) kullanılıyor.
  const langSelect = document.getElementById('langSelect') || document.getElementById('langSelectFooter');

  // mapping for footer display (yalnızca gösterim amaçlı)
  const langNames = { en: 'English', ru: 'Русский', et: 'Eesti', tr: 'Türkçe' };

  if(langSelect){
    supported.forEach(code=>{
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = code.toUpperCase();
      langSelect.appendChild(opt);
    });
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

  // --- Lead Form işlemleri ---
  const leadForm = document.getElementById('leadForm');
  const formMessage = document.getElementById('formMessage');

  if(leadForm){
    leadForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const data = {
        name: leadForm.name.value.trim(),
        email: leadForm.email.value.trim(),
        phone: leadForm.phone.value.trim(),
        role: leadForm.role.value,
        lang: langSelect ? langSelect.value : 'en',
        createdAt: new Date().toISOString()
      };
      // validation
      if(!data.name || !data.email || !data.role){
        formMessage.textContent = t('form.error', langSelect ? langSelect.value : 'en');
        formMessage.style.color = 'crimson';
        return;
      }
      // localStorage
      const leads = JSON.parse(localStorage.getItem('leads')||'[]');
      leads.push(data);
      localStorage.setItem('leads', JSON.stringify(leads));
      formMessage.textContent = t('form.success', langSelect ? langSelect.value : 'en');
      formMessage.style.color = 'green';

      // send to mock backend
      try{
        await fetch('/api/leads', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(data)
        });
      }catch(e){
        console.warn('Lead send failed', e);
      }

      leadForm.reset();
    });
  }

  // --- Chat UI & Proxy ---
  const chatButton = document.getElementById('chatButton');
  const chatWindow = document.getElementById('chatWindow');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendButton = document.getElementById('sendButton');

  function addMessage(sender, text, className){
    const p = document.createElement('p');
    p.className = className||'';
    p.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  if(chatButton){
    chatButton.addEventListener('click', ()=>{
      const visible = chatWindow.style.display === 'flex';
      chatWindow.style.display = visible ? 'none' : 'flex';
      chatWindow.setAttribute('aria-hidden', visible ? 'true' : 'false');
    });
  }

  async function sendChat(text){
    addMessage('Siz', text, 'user');
    try{
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({message:text, lang: langSelect ? langSelect.value : 'en'})
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
      addMessage('Asistan', t('chat.welcome', langSelect ? langSelect.value : 'en'), 'assistant');
    }
  }

  if(sendButton){
    sendButton.addEventListener('click', ()=>{
      const txt = chatInput.value.trim();
      if(!txt) return;
      sendChat(txt);
      chatInput.value = '';
    });
  }
  if(chatInput){
    chatInput.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){ sendButton.click(); }
    });
  }

});

// --- Lead Form işlemleri ---
const leadForm = document.getElementById('leadForm');
const formMessage = document.getElementById('formMessage');

leadForm.addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const data = {
    name: leadForm.name.value.trim(),
    email: leadForm.email.value.trim(),
    phone: leadForm.phone.value.trim(),
    role: leadForm.role.value,
    lang: langSelect.value,
    createdAt: new Date().toISOString()
  };
  // validation
  if(!data.name || !data.email || !data.role){
    formMessage.textContent = t('form.error', langSelect.value);
    formMessage.style.color = 'crimson';
    return;
  }
  // localStorage
  const leads = JSON.parse(localStorage.getItem('leads')||'[]');
  leads.push(data);
  localStorage.setItem('leads', JSON.stringify(leads));
  formMessage.textContent = t('form.success', langSelect.value);
  formMessage.style.color = 'green';

  // send to mock backend
  try{
    await fetch('/api/leads', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
  }catch(e){
    console.warn('Lead send failed', e);
  }

  leadForm.reset();
});

// --- Chat UI & Proxy ---
const chatButton = document.getElementById('chatButton');
const chatWindow = document.getElementById('chatWindow');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');

function addMessage(sender, text, className){
  const p = document.createElement('p');
  p.className = className||'';
  p.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatMessages.appendChild(p);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatButton.addEventListener('click', ()=>{
  const visible = chatWindow.style.display === 'flex';
  chatWindow.style.display = visible ? 'none' : 'flex';
  chatWindow.setAttribute('aria-hidden', visible ? 'true' : 'false');
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
