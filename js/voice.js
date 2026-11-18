'use strict';
/* ================= voice add =================
   Mic button in Quick add (and the "Voice add" home-screen shortcut, ?voice=1).
   Understands things like:
     "add milk, eggs and rice to shopping"   -> 3 Shopping items
     "buy paper towels", "we're out of coffee" -> Shopping
     "remind me to call the plumber"          -> To-Do
     "note the wifi password is on the fridge" -> Notes
     "add dentist to the calendar"            -> Upcoming (you pick the date, then tap Add)
   Anything else goes to whichever type is selected. */
const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const VOICE_DEST = [
  [/^(shopping|grocery|groceries|store|costco|target)$/, 'shop'],
  [/^(to-?do|todo|task|tasks|chores?)$/, 'todo'],
  [/^(notes?)$/, 'notes'],
  [/^(calendar|events?|upcoming|schedule|plans?)$/, 'events']
];
function parseVoice(said, current = 'todo') {
  let t = String(said || '').trim().replace(/[.!?]+$/, ''); if (!t) return null;
  const low = t.toLowerCase(), cut = re => t.slice(t.length - low.replace(re, '').length).trim();
  let type = null, text = t;
  const m = low.match(/^(?:please\s+)?(?:add|put)\s+(.+?)\s+(?:to|on|onto|in|into)\s+(?:the\s+|my\s+|our\s+)?([\w-]+)(?:\s+list)?$/);
  if (m) { const d = VOICE_DEST.find(([re]) => re.test(m[2])); if (d) { type = d[1]; text = t.substr(low.indexOf(m[1]), m[1].length); } }
  if (!type) {
    const rules = [
      [/^(?:remind me to|i need to|i have to|don't forget to|to-?do|task)\s+/, 'todo'],
      [/^(?:take a note|make a note|note|remember)\s+(?:that\s+)?/, 'notes'],
      [/^(?:buy|we need(?!\s+to\b)|we're out of|we are out of|we're low on|add to shopping)\s+(?:some\s+|more\s+)?/, 'shop']
    ];
    for (const [re, k] of rules) if (re.test(low)) { type = k; text = cut(re); break; }
  }
  type = type || current;
  if (type === 'shop') text = text.replace(/,?\s+and\s+/gi, ', ').replace(/\s*,\s*/g, ', ');
  text = text.charAt(0).toUpperCase() + text.slice(1);
  return { type, text };
}
const voiceBtnHtml = () => SpeechRec ? `<button class="btn mic" type="button" data-mic aria-label="Speak instead of typing">${icon('mic')}<span>Speak</span></button>` : '';
function bindVoice(f, ta, { auto = false } = {}) {
  const btn = $('[data-mic]', f); if (!btn || !SpeechRec) return;
  let rec = null;
  const stop = () => { btn.classList.remove('on'); btn.lastChild.textContent = 'Speak'; rec = null; };
  const start = () => {
    if (rec) { rec.stop(); return; }
    rec = new SpeechRec(); rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1;
    btn.classList.add('on'); btn.lastChild.textContent = 'Listening'; ta.placeholder = 'Listening…';
    let final = '';
    rec.onresult = e => {
      let interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) final += r[0].transcript; else interim += r[0].transcript; }
      ta.value = (final + interim).trim();
    };
    rec.onerror = e => {
      const msg = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Allow microphone access to add by voice' : e.error === 'no-speech' ? 'Did not catch that. Tap Speak and try again.' : e.error === 'aborted' ? '' : 'Voice input is not available right now';
      if (msg) toast(msg);
    };
    rec.onend = () => {
      stop(); const p = parseVoice(final || ta.value, f.type.value); if (!p) return;
      const radio = $(`input[name=type][value="${p.type}"]`, f); if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
      ta.value = p.text;
      if (p.type === 'events') { toast('Pick a date, then tap Add'); $('[name=date]', f) && $('[name=date]', f).focus(); }
      else f.requestSubmit();
    };
    try { rec.start(); } catch { stop(); toast('Tap Speak to start'); }
  };
  btn.addEventListener('click', start);
  if (auto) setTimeout(start, 250);
}
if (typeof module !== 'undefined') module.exports = { parseVoice };
