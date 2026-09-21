/*
 * EXCELSIOR'26 EVENT PORTAL
 *
 * EDIT EVENT OVERLAYS HERE.
 * Each key matches the data-event value in events.html.
 * You can change title, subtitle, description, details, accent, and registration link
 * without touching the HTML.
 */
const EVENT_OVERLAYS = {
  'SYMPOSIUM 1': {accent:'#d94dff',eyebrow:'EVENT 01 // SYMPOSIUM 1',title:'SYMPOSIUM 1',subtitle:'Present your work with clarity, evidence and impact.',description:'An academic presentation event for participants to communicate ideas, findings and clinical relevance.',details:[['FORMAT','Team Event'],['ELIGIBILITY','As announced by EPISTEME'],['DATE','Coming Soon'],['VENUE','Coming Soon']],points:['Abstract submission','Presentation round','Jury evaluation'],ctaText:'REGISTER FOR EVENT',ctaLink:'registration-portals.html'},
  'SYMPOSIUM 2': {accent:'#36aaff',eyebrow:'EVENT 02 // SYMPOSIUM 2',title:'SYMPOSIUM 2',subtitle:'Present your work with clarity, evidence and impact.',description:'A second symposium portal for academic presentation, discussion and evaluation.',details:[['FORMAT','Team Event'],['ELIGIBILITY','As announced by EPISTEME'],['DATE','Coming Soon'],['VENUE','Coming Soon']],points:['Abstract submission','Presentation round','Jury evaluation'],ctaText:'REGISTER FOR EVENT',ctaLink:'registration-portals.html'},
  'JUNIOR QUIZ': {accent:'#ffd83d',eyebrow:'EVENT 03 // JUNIOR QUIZ',title:'JUNIOR QUIZ',subtitle:'Fast questions. Sharp minds.',description:'A team quiz focused on recall, reasoning and quick decision-making.',details:[['FORMAT','Team / Quiz'],['ELIGIBILITY','As announced by EPISTEME'],['DATE','Coming Soon'],['VENUE','Coming Soon']],points:['Multiple rounds','Time-bound questions','Final round'],ctaText:'REGISTER FOR EVENT',ctaLink:'registration-portals.html'},
  'SENIOR QUIZ': {accent:'#64ff48',eyebrow:'EVENT 04 // SENIOR QUIZ',title:'SENIOR QUIZ',subtitle:'Think fast. Answer faster.',description:'A competitive team quiz for senior participants with progressively challenging questions.',details:[['FORMAT','Team / Quiz'],['ELIGIBILITY','As announced by EPISTEME'],['DATE','Coming Soon'],['VENUE','Coming Soon']],points:['Multiple rounds','Time-bound questions','Final round'],ctaText:'REGISTER FOR EVENT',ctaLink:'registration-portals.html'},
  'MEME & SLOGAN': {accent:'#ff3e3e',eyebrow:'EVENT 05 // MEME & SLOGAN',title:'MEME & SLOGAN',subtitle:'Create, caption and make it memorable.',description:'A creative event combining visual humour, concise writing and theme-based ideas.',details:[['FORMAT','Individual Event'],['ELIGIBILITY','As announced by EPISTEME'],['DATE','Coming Soon'],['VENUE','Coming Soon']],points:['Original concept','Theme interpretation','Abstract submission'],ctaText:'REGISTER FOR EVENT',ctaLink:'registration-portals.html'},
  'POSTER': {accent:'#ff9f25',eyebrow:'EVENT 06 // POSTER',title:'POSTER',subtitle:'Design the message. Make it stand out.',description:'A visual design challenge focused on communicating an idea through an original poster.',details:[['FORMAT','Individual Event'],['ELIGIBILITY','As announced by EPISTEME'],['DATE','Coming Soon'],['VENUE','Coming Soon']],points:['Original artwork','Theme interpretation','Abstract submission'],ctaText:'REGISTER FOR EVENT',ctaLink:'registration-portals.html'}
};

const sections = [...document.querySelectorAll('.event-section')];
const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    sections.forEach(s => s.classList.remove('active'));
    entry.target.classList.add('active');
  }
}), { threshold: .45 });
sections.forEach(section => observer.observe(section));

/* Event detail overlay */
const overlay = document.createElement('div');
overlay.className = 'event-detail-overlay';
overlay.id = 'eventDetailOverlay';
overlay.setAttribute('aria-hidden', 'true');
overlay.innerHTML = `
  <div class="event-detail-shell" role="dialog" aria-modal="true" aria-labelledby="eventDetailTitle">
    <button class="event-detail-close" id="eventDetailClose" type="button" aria-label="Close event details">×</button>
    <div class="event-detail-orbit"><span></span><i></i></div>
    <div class="event-detail-body">
      <p class="event-detail-eyebrow" id="eventDetailEyebrow"></p>
      <h2 id="eventDetailTitle"></h2>
      <p class="event-detail-subtitle" id="eventDetailSubtitle"></p>
      <div class="event-detail-rule"></div>
      <p class="event-detail-description" id="eventDetailDescription"></p>
      <div class="event-detail-grid" id="eventDetailGrid"></div>
      <div class="event-detail-points" id="eventDetailPoints"></div>
      <div class="event-detail-actions">
        <a class="event-detail-cta" id="eventDetailCta" href="registration.html">REGISTER FOR EVENT <span>›</span></a>
        <button class="event-detail-back" id="eventDetailBack" type="button">CLOSE</button>
      </div>
    </div>
  </div>`;
document.body.appendChild(overlay);

const overlayClose = document.getElementById('eventDetailClose');
const overlayBack = document.getElementById('eventDetailBack');
const overlayShell = overlay.querySelector('.event-detail-shell');
const detailEyebrow = document.getElementById('eventDetailEyebrow');
const detailTitle = document.getElementById('eventDetailTitle');
const detailSubtitle = document.getElementById('eventDetailSubtitle');
const detailDescription = document.getElementById('eventDetailDescription');
const detailGrid = document.getElementById('eventDetailGrid');
const detailPoints = document.getElementById('eventDetailPoints');
const detailCta = document.getElementById('eventDetailCta');

function openEventDetails(section) {
  const key = section.dataset.event;
  const data = EVENT_OVERLAYS[key];
  if (!data) return;

  section.classList.add('details-open');
  overlay.style.setProperty('--detail-accent', data.accent || section.dataset.color || '#ffffff');
  detailEyebrow.textContent = data.eyebrow || key;
  detailTitle.textContent = data.title || section.querySelector('h2')?.textContent || key;
  detailSubtitle.textContent = data.subtitle || section.querySelector('.event-description')?.textContent || '';
  detailDescription.textContent = data.description || '';
  detailGrid.innerHTML = (data.details || []).map(([label, value]) => `
    <div class="detail-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  detailPoints.innerHTML = (data.points || []).map(point => `<span><i>✓</i>${escapeHtml(point)}</span>`).join('');
  detailCta.textContent = data.ctaText || 'REGISTER FOR EVENT';
  const arrow = document.createElement('span');
  arrow.textContent = '›';
  detailCta.appendChild(arrow);
  detailCta.href = data.ctaLink || 'registration.html';

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overlay-lock');
  requestAnimationFrame(() => overlayShell.classList.add('visible'));
  overlayClose.focus();
}

function closeEventDetails() {
  overlayShell.classList.remove('visible');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('overlay-lock');
  sections.forEach(section => section.classList.remove('details-open'));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

document.querySelectorAll('.event-button').forEach(button => button.addEventListener('click', () => {
  openEventDetails(button.closest('.event-section'));
}));
overlayClose.addEventListener('click', closeEventDetails);
overlayBack.addEventListener('click', closeEventDetails);
overlay.addEventListener('click', event => { if (event.target === overlay) closeEventDetails(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeEventDetails();
    closeJarvis();
  }
});

/* J.A.R.V.I.S. navigation — intentionally kept independent from the event overlay. */
const jarvis = document.getElementById('jarvisBtn');
const panel = document.getElementById('jarvisPanel');
const close = document.getElementById('jarvisClose');
function openJarvis() { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); }
function closeJarvis() { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }
jarvis.addEventListener('click', openJarvis);
close.addEventListener('click', closeJarvis);
panel.addEventListener('click', e => { if (e.target === panel) closeJarvis(); });
const routes = { 'HOME':'site.html', 'EVENTS':'events.html', 'GENERAL RULES':'general-rules.html', 'REGISTRATIONS':'registration.html', 'PROFILE':'profile.html', 'CONTACTS':'contact.html' };
document.querySelectorAll('.jarvis-links button').forEach(btn => btn.addEventListener('click', () => {
  const target = btn.dataset.target;
  if (target === 'EVENTS') { closeJarvis(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (routes[target]) { closeJarvis(); location.href = routes[target]; }
}));
document.querySelectorAll('a.page-link').forEach(a => a.addEventListener('click', e => {
  const href = a.getAttribute('href');
  if (href && href !== '#') { e.preventDefault(); location.href = href; }
}));
