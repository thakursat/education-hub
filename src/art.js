// Original generated illustrations (inline SVG): themed art for subjects, class stages, areas, blog covers and the home gallery.
// Each scene shares one composition — gradient backdrop, a central motif, floating glyphs — recoloured per theme.

const PALETTES = [
  ['#ff7a1a', '#fff1e6', '#ffd2ad'],
  ['#16a34a', '#e8f8ee', '#b7ebc9'],
  ['#7c3aed', '#f2ebff', '#d6c4ff'],
  ['#e11d74', '#fde8f1', '#f9bcd6'],
  ['#0891b2', '#e3f6fb', '#aee6f3'],
  ['#d97706', '#fdf3dc', '#f6d896'],
];

const GLYPHS = {
  mathematics: ['π', '√', '∑', '÷', 'x²', '∞'],
  physics: ['⚛', 'F=ma', 'λ', 'Ω', 'v', 'E'],
  chemistry: ['H₂O', 'pH', 'CO₂', 'Na', '⚗', 'O₂'],
  biology: ['🧬', 'DNA', '🌱', '🔬', 'cell', '🦋'],
  science: ['🔬', '💡', '🧲', '🌍', '⚡', '🧪'],
  english: ['Aa', 'ABC', '“ ”', '✎', 'Bb', '?'],
  hindi: ['अ', 'क', 'ज्ञ', 'ऋ', 'आ', 'श'],
  'computer-science': ['</>', '{ }', '01', 'py', '#', '=>'],
  accountancy: ['₹', 'Dr', 'Cr', '%', '∑', '📊'],
  economics: ['₹', '📈', 'GDP', '%', '⇅', '$'],
  'social-science': ['🌏', '🗺', '🏛', '📜', 'N↑', '⛰'],
  'spoken-english': ['Hi!', '💬', 'Hello', '🎤', 'Aa', '🗣'],
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Glyph positions around the motif; fixed so every scene stays balanced.
const SPOTS = [
  [70, 70, -12],
  [330, 60, 10],
  [360, 190, -8],
  [40, 200, 8],
  [110, 270, -6],
  [310, 280, 12],
];

function frame(id, title, pal, motif, glyphs) {
  const [c, bg, mid] = pal;
  return `<svg class="art" viewBox="0 0 400 320" role="img" aria-labelledby="${id}-t">
<title id="${id}-t">${esc(title)}</title>
<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
<rect width="400" height="320" rx="28" fill="url(#${id}-g)"/>
<circle cx="200" cy="165" r="118" fill="${mid}" opacity=".55"/>
<circle cx="345" cy="40" r="46" fill="${mid}" opacity=".35"/><circle cx="40" cy="300" r="40" fill="${mid}" opacity=".35"/>
${motif(c)}
${glyphs
  .slice(0, 6)
  .map(
    (g, i) =>
      `<g transform="translate(${SPOTS[i][0]} ${SPOTS[i][1]}) rotate(${SPOTS[i][2]})"><rect x="-30" y="-20" width="60" height="40" rx="12" fill="#fff" stroke="${mid}" stroke-width="2"/><text x="0" y="7" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${g.length > 3 ? 14 : 20}" font-weight="700" fill="${c}">${esc(g)}</text></g>`,
  )
  .join('')}
</svg>`;
}

const motifs = {
  book: (
    c,
  ) => `<path d="M120 200c30-14 60-14 80 0 20-14 50-14 80 0v-90c-30-14-60-14-80 0-20-14-50-14-80 0z" fill="#fff" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>
<path d="M200 110v90" stroke="${c}" stroke-width="4"/><path d="M135 130h45M135 148h45M135 166h38M220 130h45M220 148h45M220 166h38" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity=".55"/>`,
  blocks: (
    c,
  ) => `<rect x="130" y="160" width="60" height="60" rx="10" fill="${c}"/><rect x="200" y="160" width="60" height="60" rx="10" fill="#0b2a6f"/><rect x="165" y="95" width="60" height="60" rx="10" fill="#ffd166"/>
<text x="160" y="201" text-anchor="middle" font-family="system-ui,sans-serif" font-size="30" font-weight="800" fill="#fff">A</text><text x="230" y="201" text-anchor="middle" font-family="system-ui,sans-serif" font-size="30" font-weight="800" fill="#fff">B</text><text x="195" y="136" text-anchor="middle" font-family="system-ui,sans-serif" font-size="30" font-weight="800" fill="#0b2a6f">C</text>`,
  pencil: (c) =>
    `<g transform="rotate(-35 200 165)"><rect x="120" y="148" width="150" height="34" rx="6" fill="${c}"/><rect x="120" y="148" width="22" height="34" fill="#f9bcd6"/><path d="M270 148l38 17-38 17z" fill="#f4d3a0"/><path d="M296 160l12 5-12 5z" fill="#0b2a6f"/></g>`,
  flask: (
    c,
  ) => `<path d="M178 95h44v50l40 70a16 16 0 0 1-14 24h-96a16 16 0 0 1-14-24l40-70z" fill="#fff" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>
<path d="M150 200h100l12 20a10 10 0 0 1-9 15h-106a10 10 0 0 1-9-15z" fill="${c}" opacity=".85"/><circle cx="185" cy="185" r="6" fill="#fff"/><circle cx="210" cy="172" r="4" fill="#fff"/>`,
  cap: (c) =>
    `<path d="M110 150l90-42 90 42-90 42z" fill="#0b2a6f"/><path d="M150 168v34c0 14 100 14 100 0v-34l-50 24z" fill="${c}"/><path d="M280 155v40" stroke="#0b2a6f" stroke-width="4"/><circle cx="280" cy="200" r="7" fill="#ffd166"/>`,
  target: (
    c,
  ) => `<circle cx="200" cy="165" r="70" fill="#fff" stroke="${c}" stroke-width="6"/><circle cx="200" cy="165" r="46" fill="none" stroke="${c}" stroke-width="6"/><circle cx="200" cy="165" r="20" fill="${c}"/>
<path d="M200 165l70-60" stroke="#0b2a6f" stroke-width="6" stroke-linecap="round"/><path d="M262 98l20-6-6 20z" fill="#0b2a6f"/>`,
  laptop: (c) => `<rect x="125" y="105" width="150" height="95" rx="10" fill="#0b2a6f"/><rect x="137" y="117" width="126" height="71" rx="4" fill="#fff"/>
<circle cx="200" cy="145" r="15" fill="${c}"/><path d="M178 180c4-14 40-14 44 0" fill="${c}"/><rect x="105" y="200" width="190" height="14" rx="7" fill="${c}"/>`,
  house: (
    c,
  ) => `<path d="M120 170l80-62 80 62" fill="none" stroke="#0b2a6f" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><rect x="140" y="165" width="120" height="70" rx="8" fill="#fff" stroke="${c}" stroke-width="5"/>
<rect x="185" y="195" width="30" height="40" rx="4" fill="${c}"/><rect x="152" y="180" width="22" height="22" rx="3" fill="#cfe0ff"/><rect x="226" y="180" width="22" height="22" rx="3" fill="#cfe0ff"/>`,
};

const subjectMotif = {
  'computer-science': 'laptop',
  'spoken-english': 'laptop',
  chemistry: 'flask',
  biology: 'flask',
  science: 'flask',
  physics: 'target',
};

const subjectArt = (s, i) =>
  frame(`art-s-${s.slug}`, `${s.name} home tuition illustration`, PALETTES[i % 6], motifs[subjectMotif[s.slug] || 'book'], GLYPHS[s.slug] || GLYPHS.english);

const classMotif = { pre: 'blocks', primary: 'pencil', middle: 'flask', board: 'cap', higher: 'target' };
const classGlyphs = {
  pre: ['🎨', '🧸', '123', 'ABC', '⭐', '🎵'],
  primary: ['✏️', '📒', '+ −', 'Aa', '⭐', '🍎'],
  middle: ['🔬', 'x+y', '🌍', '📐', 'Aa', '💡'],
  board: ['📝', '💯', '🏆', 'A+', '📚', '⏱'],
  higher: ['🎯', 'JEE', 'NEET', '📈', '🏆', '⏱'],
};
const classArt = (c, i) => frame(`art-c-${c.slug}`, `${c.name} home tuition illustration`, PALETTES[i % 6], motifs[classMotif[c.group]], classGlyphs[c.group]);

const boardArt = (b, i) =>
  frame(`art-b-${b.slug}`, `${b.name} board tuition illustration`, PALETTES[i % 6], motifs.cap, [b.name.split(' ')[0], '📚', 'A+', '✔', '📝', '⭐']);

const examArt = (e, i) =>
  frame(`art-e-${e.slug}`, `${e.name} coaching illustration`, PALETTES[(i + 2) % 6], motifs.target, [e.short, '📈', '⏱', '🏆', '💯', '📝']);

// Generic old-Lucknow skyline (domes, minarets and a gateway arch) with a location pin for each area.
const areaArt = (a, i) => {
  const [c, bg, mid] = PALETTES[i % 6];
  const id = `art-a-${a.slug}`;
  return `<svg class="art" viewBox="0 0 400 320" role="img" aria-labelledby="${id}-t">
<title id="${id}-t">${esc(`Home tutors in ${a.name}, Lucknow`)}</title>
<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
<rect width="400" height="320" rx="28" fill="url(#${id}-g)"/>
<circle cx="320" cy="70" r="30" fill="#ffd166"/>
<g fill="${mid}"><rect x="30" y="170" width="24" height="90"/><path d="M30 170l12-30 12 30z"/><rect x="346" y="170" width="24" height="90"/><path d="M346 170l12-30 12 30z"/></g>
<g fill="${c}" opacity=".9"><path d="M90 260v-70a40 40 0 0 1 80 0v70z"/><circle cx="130" cy="140" r="6"/><path d="M128 146h4v12h-4z"/>
<path d="M230 260v-70a40 40 0 0 1 80 0v70z"/><circle cx="270" cy="140" r="6"/><path d="M268 146h4v12h-4z"/></g>
<path d="M165 260v-60a35 35 0 0 1 70 0v60z" fill="#0b2a6f"/><path d="M185 260v-40a15 15 0 0 1 30 0v40z" fill="${bg}"/>
<rect x="20" y="258" width="360" height="10" rx="5" fill="#0b2a6f"/>
<g transform="translate(200 70)"><path d="M0 50c-18-24-28-38-28-52a28 28 0 0 1 56 0c0 14-10 28-28 52z" fill="#e11d74"/><circle cy="-2" r="10" fill="#fff"/></g>
<rect x="110" y="282" width="180" height="30" rx="15" fill="#fff" stroke="${mid}" stroke-width="2"/>
<text x="200" y="302" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="800" fill="#0b2a6f">📍 ${esc(a.name)}</text>
</svg>`;
};

const postArt = (p, i) =>
  frame(`art-p-${p.slug}`, p.title, PALETTES[(i + 1) % 6], motifs[['house', 'cap', 'laptop'][i % 3]], ['💡', '📚', '✔', '⭐', '📝', '🎯']);

// Home "ways we teach" gallery tiles.
const gallery = [
  ['Home tuition', 'A tutor at your doorstep, one-to-one', 'house', ['🏠', '📚', '✏️', '⭐', '💡', '😊']],
  ['Online classes', 'Live sessions on Meet or Zoom', 'laptop', ['💻', '🎧', '📶', '⭐', '💬', '✔']],
  ['Board exam prep', 'Sample papers, tests and revision', 'cap', ['📝', '💯', 'A+', '⏱', '📚', '🏆']],
  ['Early learners', 'Play-way phonics and numbers', 'blocks', ['🎨', '🧸', '123', 'ABC', '🎵', '⭐']],
  ['JEE & NEET', 'Concepts, PYQs and mock tests', 'target', ['🎯', '📈', 'JEE', 'NEET', '⏱', '🏆']],
  ['Science & labs', 'Concepts with real experiments', 'flask', ['🔬', '🧪', '⚛', '🌱', '💡', '🧲']],
].map(([title, text, m, g], i) => ({ title, text, svg: frame(`art-g-${i}`, title, PALETTES[i % 6], motifs[m], g) }));

module.exports = { subjectArt, classArt, boardArt, examArt, areaArt, postArt, gallery };
