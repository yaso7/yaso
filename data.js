/* =====================================================================
   SITE DATA & SETTINGS: the part you edit most.
   Plain top-level constants, loaded before script.js (see index.html).
   ===================================================================== */
// Photos: put files in an img/ folder next to this page. Anything missing is skipped
// (the portrait falls back to a YM monogram). Never use NDA client screenshots here.
const PHOTOS = {
  portrait: 'img/portrait.jpg',
  strip: [
    { src: 'img/photo-1.jpg', cap: 'WRO Syria · running the event' },
    { src: 'img/photo-2.jpg', cap: 'Where things ship' },
    { src: 'img/photo-3.jpg', cap: 'Thesis demo · live detection' }
  ],
  // One optional image per release, shown when the row is opened.
  releases: { 'v7.0': 'img/thesis-demo.jpg', 'v1.0': 'img/holooltech-game.jpg' }
};
// Contact form: posts to the Vercel function in api/contact.js, which forwards to Telegram.
// If the call fails (or this is empty), the last step offers a prefilled email instead.
const FORM = { endpoint: '/api/contact', extra: {} };
const MY_EMAIL = 'yusramalas@gmail.com';

/* ---------- experience: releases (real work, real figures) ---------- */
const RELEASES = [
  { v:'v7.0', date:'2025–26', org:'spu', title:'Real-time student engagement detection', area:'AI · Computer vision · B.Sc. thesis',
    changes:[['add','Two deep-learning pipelines compared under one protocol: a CNN and a facial-landmark BiLSTM'],['add','A live webcam program that detects engagement in real time'],['fix','Three silent evaluation bugs, including one that reported macro-F1 as 0.000']],
    diff:[['rarest-class F1','≈ 0','0.37–0.44'],['macro-F1, CNN → landmark model','0.457','0.510'],['input per clip','RGB frames','landmarks, 242× lighter']] },
  { v:'v6.0', date:'2025', org:'sawaf', title:'3D / AR home-décor store', area:'SawafTECH · sole developer',
    changes:[['add','Synchronized 2D and 3D product customization with real-time scene updates'],['add','AR placement, so customers see a product in their own room'],['chg','Texture compression, draw-call batching and tuned renderer settings']],
    diff:[['First Contentful Paint','baseline','−25%']] },
  { v:'v5.0', date:'2025', org:'self', title:'Next.js product dashboards', area:'Independent consulting',
    changes:[['add','Two production Next.js 14 apps with type-safe Prisma and PostgreSQL'],['chg','N+1 queries refactored, indexes added, heavy aggregations moved to raw SQL'],['fix','A hydration mismatch on mobile product pages']],
    diff:[['dashboard API response','1.2 s','350 ms']] },
  { v:'v4.0', date:'2023–25', org:'fivev', title:'ISUZU campaign analytics dashboard', area:'Five-V · lead developer',
    changes:[['add','Ad-platform, CRM and uploaded data in one ROI timeline across three dealership regions'],['add','PHPUnit feature tests that keep the metrics accurate across deployments'],['chg','MySQL indexing and query refactoring']],
    diff:[['blank page → production','—','45 days'],['query execution time','baseline','−35%'],['contract','MVP','extended, +2 modules']] },
  { v:'v3.0', date:'2023–24', org:'y1s', title:'Multi-center reservation platform', area:'Your(1)Site · full stack',
    changes:[['add','Bookings, calendars and admin / staff / customer roles for 5+ locations'],['chg','Interfaces rebuilt to WCAG 2.1'],['chg','MySQL query optimization and caching']],
    diff:[['dashboard load time','baseline','−35%'],['local search ranking','—','page 1']] },
  { v:'v2.0', date:'2022–23', org:'ma5zn', title:'E-commerce backend, as team lead', area:'Ma5zn · team of 4',
    changes:[['add','Pest tests in the pull-request checklist'],['add','Git Flow, protected branches and code review'],['chg','Weekly office hours that moved two juniors to Laravel service classes']],
    diff:[['test coverage','0%','65%'],['post-deploy hotfixes','baseline','≈ −40%'],['PR cycle time','baseline','≈ −25%']] },
  { v:'v1.0', date:'2022', org:'holool', title:'Educational games and landing pages', area:'Holooltech · game & web developer',
    changes:[['add','2D and 3D educational games in Unity and C#'],['add','Responsive landing pages built from Figma and PSD designs'],['add','Custom WordPress themes and plugins, plus PHP/MySQL internal tools']],
    diff:[['landing pages shipped','0','15+'],['PageSpeed across client sites','—','85+']] }
];

/* ---------- experience: by company ---------- */
const COMPANIES = [
  { id:'rightware', org:'Rightware LLC', role:'Front-End Engineer', start:'2026-08', end:null, kind:'full', type:'Full-time', place:'Syria',
    notes:[
      'Migrating Flutter web sites to Next.js and Vue.js.',
      'Improving existing dashboards: visual style, UI and the day-to-day user experience.',
      'Collecting feedback from dashboard users and studying how they work in our systems, then making those tasks faster and easier to manage.',
      'Building and designing all of the company\'s landing pages.'] },
  { id:'self', org:'Independent', role:'Full-Stack Consultant', start:'2022-01', end:null, kind:'split', splitAt:'2025-09', type:'Direct clients', place:'Remote',
    notes:['Alongside agency and contract roles until August 2025; full-time since September 2025.','Two production Next.js 14 apps; dashboard API cut from 1.2 s to 350 ms.','Earlier client work: React, Laravel, Stripe and WordPress builds for shops, agencies and a non-profit.'], rel:'v5.0' },
  { id:'sawaf', org:'SawafTECH', role:'Full-Stack Web Developer (solo contractor)', start:'2025-01', end:'2025-08', kind:'full', type:'Full-time contract', place:'Remote',
    notes:['Sole developer of a 3D/AR home-décor store in Vue 3, TypeScript and Three.js, from requirements to deployment.','Weekly design reviews with the client\'s creative director.'], rel:'v6.0' },
  { id:'fivev', org:'Five-V Marketing Research', role:'Full-Stack Web Developer', start:'2023-06', end:'2025-01', kind:'full', type:'Full-time', place:'Damascus',
    notes:['Built and maintained the ISUZU campaign dashboard: MVP in 45 days, then 19 months as its sole maintainer.','E-commerce, booking and marketing sites for agency clients.'], rel:'v4.0' },
  { id:'y1s', org:'Your(1)Site', role:'Full-Stack Web Developer', start:'2023-05', end:'2024-11', kind:'part', type:'Part-time · 14 h/week', place:'Remote',
    notes:['Reservation platform for 5+ locations with bookings, calendars and role-based dashboards.','Off-hours work, disclosed to my primary employer.'], rel:'v3.0' },
  { id:'ma5zn', org:'Ma5zn', role:'Team Lead / Lead Backend Developer', start:'2022-11', end:'2023-05', kind:'full', type:'Full-time · startup', place:'Damascus',
    notes:['Led a team of 4 across two e-commerce projects while staying hands-on.','Brought in tests, Git Flow and code review: coverage 0% → 65%.'], rel:'v2.0' },
  { id:'holool', org:'Holooltech', role:'Game Developer / Web Developer', start:'2022-01', end:'2022-11', kind:'full', type:'Full-time', place:'Damascus',
    notes:['Educational games in Unity and C#.','15+ landing pages and custom WordPress themes and plugins.'], rel:'v1.0' }
];

/* ---------- lab: the three briefs ---------- */
const LAB = [
  { id:'kori', name:'Kōri', brief:'Landing page for an iced matcha bar in Rotterdam.' },
  { id:'lina', name:'Lina Haddad', brief:'Portfolio for a street photographer in Beirut.' },
  { id:'spinswap', name:'Spin Swap', brief:'Four mobile screens for a neighbourhood record-swapping app.' }
];

/* ---------- hero headline variants, rotating verbs, contact needs ---------- */
const VARIANTS = { A: ['Yusra', 'Malas'], B: ['From idea', 'to shipped', 'product.'] };
const VERBS = ['ships', 'builds', 'develops', 'designs', 'maintains', 'improves', 'scales', 'tests', 'launches'];
const NEEDS = ['Consulting', 'Full-stack development', 'AI integration & agents', 'Front-end & UI', '3D / WebGL / AR', 'Performance & maintenance', 'Something else'];
