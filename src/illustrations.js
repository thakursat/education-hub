// Original flat illustrations, inlined as SVG so they cost no extra requests and stay sharp on every screen.

const homeScene = `<svg class="illo" viewBox="0 0 520 420" role="img" aria-labelledby="illo-home-t">
<title id="illo-home-t">A tutor teaching a child at a desk inside a home</title>
<defs>
  <linearGradient id="ih-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3edff"/><stop offset="1" stop-color="#fff1e6"/></linearGradient>
  <linearGradient id="ih-roof" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1565e0"/><stop offset="1" stop-color="#0b2a6f"/></linearGradient>
</defs>
<circle cx="260" cy="220" r="190" fill="url(#ih-sky)"/>
<circle cx="440" cy="80" r="26" fill="#ffd166"/>
<path d="M90 190 260 70l170 120" fill="none" stroke="url(#ih-roof)" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
<rect x="120" y="185" width="280" height="190" rx="10" fill="#fff" stroke="#dfe6f2" stroke-width="3"/>
<rect x="320" y="210" width="50" height="50" rx="6" fill="#cfe0ff"/><path d="M345 210v50M320 235h50" stroke="#fff" stroke-width="4"/>
<path d="M210 64l50-26 50 26-50 26z" fill="#0b2a6f"/><path d="M296 72v26" stroke="#0b2a6f" stroke-width="3"/><circle cx="296" cy="102" r="5" fill="#ff7a1a"/>
<rect x="150" y="300" width="220" height="12" rx="6" fill="#0b2a6f"/>
<rect x="165" y="312" width="10" height="60" fill="#0b2a6f"/><rect x="345" y="312" width="10" height="60" fill="#0b2a6f"/>
<rect x="180" y="276" width="60" height="10" rx="3" fill="#ff7a1a"/><rect x="184" y="266" width="52" height="10" rx="3" fill="#16a34a"/><rect x="178" y="256" width="58" height="10" rx="3" fill="#7c3aed"/>
<path d="M262 298l30-22 30 22" fill="#fff" stroke="#1565e0" stroke-width="3"/><path d="M292 276v22" stroke="#1565e0" stroke-width="2"/>
<circle cx="205" cy="215" r="20" fill="#f4c39a"/><path d="M185 212a20 20 0 0 1 40-4c-10-6-28-6-40 4z" fill="#3b2a1e"/>
<path d="M175 300c0-40 14-62 30-62s30 22 30 62z" fill="#e11d74"/>
<circle cx="330" cy="236" r="16" fill="#e8b48a"/><path d="M314 232a16 16 0 0 1 32-2c-8-8-24-8-32 2z" fill="#1d1d1d"/>
<path d="M308 300c0-32 10-48 22-48s22 16 22 48z" fill="#16a34a"/>
<g fill="#ffd166"><path d="M70 120l5 12 13 1-10 8 3 13-11-7-11 7 3-13-10-8 13-1z"/><path d="M455 300l4 9 10 1-8 6 3 10-9-5-9 5 3-10-8-6 10-1z"/></g>
<circle cx="80" cy="300" r="10" fill="#7c3aed" opacity=".25"/><circle cx="470" cy="200" r="14" fill="#16a34a" opacity=".2"/>
<path d="M420 140h40v52h-40z" fill="#fff" stroke="#ff7a1a" stroke-width="3" transform="rotate(10 440 166)"/>
<path d="M428 152h22M428 162h22M428 172h14" stroke="#ff7a1a" stroke-width="3" stroke-linecap="round" transform="rotate(10 440 166)"/>
</svg>`;

const tutorScene = `<svg class="illo" viewBox="0 0 520 380" role="img" aria-labelledby="illo-tutor-t">
<title id="illo-tutor-t">A tutor with books, a laptop and a growth chart</title>
<defs><linearGradient id="it-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2ebff"/><stop offset="1" stop-color="#e8f8ee"/></linearGradient></defs>
<rect x="30" y="30" width="460" height="320" rx="160" fill="url(#it-bg)"/>
<rect x="300" y="80" width="150" height="110" rx="12" fill="#fff" stroke="#dfe6f2" stroke-width="3"/>
<path d="M320 170l30-30 25 18 50-50" fill="none" stroke="#16a34a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="425" cy="108" r="7" fill="#16a34a"/>
<rect x="110" y="250" width="300" height="14" rx="7" fill="#0b2a6f"/>
<rect x="250" y="190" width="120" height="60" rx="6" fill="#1565e0"/><rect x="240" y="248" width="140" height="6" rx="3" fill="#0b2a6f"/>
<rect x="262" y="202" width="96" height="36" rx="3" fill="#cfe0ff"/>
<circle cx="180" cy="150" r="26" fill="#e8b48a"/><path d="M154 146a26 26 0 0 1 52-4c-12-10-38-10-52 4z" fill="#2b2b2b"/>
<path d="M140 250c0-50 18-74 40-74s40 24 40 74z" fill="#7c3aed"/>
<rect x="130" y="222" width="50" height="10" rx="3" fill="#ff7a1a"/><rect x="134" y="212" width="44" height="10" rx="3" fill="#e11d74"/>
<path d="M90 90l8 16 18 2-13 12 4 18-17-9-17 9 4-18-13-12 18-2z" fill="#ffd166"/>
<circle cx="460" cy="250" r="12" fill="#ff7a1a" opacity=".3"/><circle cx="70" cy="260" r="16" fill="#0891b2" opacity=".2"/>
<path d="M220 80c10-20 30-20 40 0" fill="none" stroke="#ffd166" stroke-width="5" stroke-linecap="round"/>
<circle cx="240" cy="96" r="14" fill="#ffd166"/><rect x="234" y="110" width="12" height="10" rx="2" fill="#0b2a6f"/>
</svg>`;

module.exports = { homeScene, tutorScene };
