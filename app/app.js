// Leonida Trophy Guide — tracker for the 55 GTA VI trophies.
// Loads app/data/trophies.json, renders the checklist, and keeps the
// earned set in localStorage. Export writes a JSON file; import reads one
// back. Spoiler mode hides story trophies until they are earned. No
// network request happens here besides loading the app's own files.
const STORE_KEY = 'gta6-trophy-guide-earned-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoiler-v1';
const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const filtersEl = document.getElementById('filters');
const spoilerEl = document.getElementById('spoiler');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const gradeText = document.getElementById('gradeText');
const emptyState = document.getElementById('emptyState');

// Demo state for screenshots (?#demo): a spread of earned trophies kept
// only in memory, never written to localStorage.
const DEMO_EARNED = [2, 3, 4, 8, 15, 16, 20, 21, 35, 42, 53, 54];

let trophies = [];
let earned = new Set(readStoredEarned());
let filter = 'all';
let query = '';

function readStoredEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((n) => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

function saveEarned() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

function kindLabel(kind) {
  return {
    story: 'Story',
    collectible: 'Collectible',
    activity: 'Activity',
    robbery: 'Robbery',
    character: 'Side quest',
    misc: 'Leonida',
  }[kind] ?? kind;
}

function trophyMatches(t) {
  if (filter === 'story' && t.kind !== 'story') return false;
  if (filter === 'missable' && !t.missable) return false;
  if (filter === 'collectible' && t.kind !== 'collectible') return false;
  if (filter === 'activity' && t.kind !== 'activity') return false;
  if (filter === 'robbery' && t.kind !== 'robbery') return false;
  if (filter === 'character' && t.kind !== 'character') return false;
  if (filter === 'online') return false;
  if (filter === 'earned' && !earned.has(t.name)) return false;
  if (filter === 'todo' && earned.has(t.name)) return false;
  if (query) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.name));
  const byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of done) byGrade[t.grade] = (byGrade[t.grade] ?? 0) + 1;
  progressFill.style.width = total ? `${(done.length / total) * 100}%` : '0%';
  progressText.textContent = `${done.length} of ${total} earned`;
  document.getElementById('miniProgress').textContent = `${done.length} / ${total} earned`;
  gradeText.textContent =
    `${byGrade.platinum} platinum · ${byGrade.gold} gold · ${byGrade.silver} silver · ${byGrade.bronze} bronze`;
}

function renderList() {
  listEl.replaceChildren();
  const spoilerOn = spoilerEl.checked;
  let shown = 0;
  for (const t of trophies) {
    if (!trophyMatches(t)) continue;
    shown += 1;
    const isEarned = earned.has(t.name);
    const li = document.createElement('li');
    li.className = `trophy${isEarned ? ' earned' : ''}`;
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = isEarned;
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      saveEarned();
      renderProgress();
      renderList();
    });
    li.append(box);
    const body = document.createElement('div');
    const head = document.createElement('div');
    head.className = 'trophy-head';
    const name = document.createElement('h3');
    const grade = document.createElement('span');
    grade.className = `grade grade-${t.grade}`;
    grade.textContent = t.grade;
    const kind = document.createElement('span');
    kind.className = 'tag';
    kind.textContent = kindLabel(t.kind);
    head.append(grade, kind);
    if (t.missable) {
      const flag = document.createElement('span');
      flag.className = 'tag tag-missable';
      flag.textContent = 'Missable';
      head.append(flag);
    }
    if (t.hidden) {
      const hid = document.createElement('span');
      hid.className = 'tag tag-hidden';
      hid.textContent = 'Hidden on PSN';
      head.append(hid);
    }
    if (t.count) {
      const cnt = document.createElement('span');
      cnt.className = 'tag';
      cnt.textContent = `Target: ${t.count.toLocaleString('en-US')}`;
      head.append(cnt);
    }
    const hiddenBySpoiler = spoilerOn && t.kind === 'story' && !isEarned;
    if (hiddenBySpoiler) {
      name.textContent = 'Hidden story trophy';
      head.append(name);
      body.append(head);
      const note = document.createElement('p');
      note.className = 'spoiler-hidden';
      note.textContent =
        'Spoiler mode is on: this story trophy stays hidden until you earn it. Tick the box when you unlock it to reveal its name and guide.';
      body.append(note);
    } else {
      name.textContent = t.name;
      head.append(name);
      body.append(head);
      const desc = document.createElement('p');
      desc.className = 'desc';
      desc.textContent = t.description;
      const guide = document.createElement('p');
      guide.className = 'guide';
      guide.textContent = t.guide;
      const source = document.createElement('p');
      source.className = 'source';
      source.textContent = 'Source: ';
      const link = document.createElement('a');
      link.href = t.sourceUrl;
      link.textContent = t.source;
      link.rel = 'noopener';
      source.append(link);
      body.append(desc, guide, source);
    }
    li.append(body);
    listEl.append(li);
  }
  emptyState.hidden = shown !== 0;
  if (filter === 'online') {
    emptyState.hidden = false;
    emptyState.textContent =
      'No online trophies — GTA VI launches as a single-player game with no new GTA Online, so every one of the 55 is earned offline. (PowerPyx)';
  } else {
    emptyState.textContent =
      'No trophies match this filter. Try clearing the search or picking another filter.';
  }
}

function render() {
  renderProgress();
  renderList();
}

filtersEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  filter = button.dataset.filter;
  for (const chip of filtersEl.querySelectorAll('.chip')) {
    chip.classList.toggle('active', chip === button);
  }
  renderList();
});

searchEl.addEventListener('input', () => {
  query = searchEl.value.trim().toLowerCase();
  renderList();
});

spoilerEl.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0');
  renderList();
});

document.getElementById('export').addEventListener('click', () => {
  const payload = JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned] }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    earned = new Set(names.filter((n) => typeof n === 'string' && trophies.some((t) => t.name === n)));
    saveEarned();
    render();
  } catch {
    alert('That file is not a trophy-progress export from this guide.');
  }
  event.target.value = '';
});

document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Clear every ticked trophy?')) return;
  earned = new Set();
  saveEarned();
  render();
});

function applyHash() {
  const tokens = location.hash.replace(/^#/, '').split('&').filter(Boolean);
  if (tokens.includes('demo')) {
    for (const id of DEMO_EARNED) {
      const t = trophies.find((x) => x.id === id);
      if (t) earned.add(t.name);
    }
  }
  if (tokens.includes('spoiler')) {
    spoilerEl.checked = true;
  }
  if (tokens.includes('missable')) {
    filter = 'missable';
    for (const chip of filtersEl.querySelectorAll('.chip')) {
      chip.classList.toggle('active', chip.dataset.filter === 'missable');
    }
  }
  if (tokens.includes('roadmap')) {
    document.getElementById('roadmap').scrollIntoView();
  }
  if (tokens.includes('list')) {
    document.getElementById('list').scrollIntoView();
  }
}

spoilerEl.checked = localStorage.getItem(SPOILER_KEY) === '1';
const doc = await (await fetch('data/trophies.json')).json();
trophies = doc.trophies;
applyHash();
render();
window.addEventListener('hashchange', () => {
  applyHash();
  render();
});
