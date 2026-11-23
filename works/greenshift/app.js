// Static replica of GreenShift Rijschool: MySQL + $_SESSION are replaced by localStorage.
const DB_KEY = 'greenshift-db-v1', SES_KEY = 'greenshift-session-v1';
const FULLCALENDAR = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js';
const ROLES = { 1: 'Gebruiker', 2: 'Admin', 3: 'Instructeur', 4: 'Pending instructeur' };
const PACKAGES = [ // from the home page cards
    { package_id: 1, package_name: 'Starter', package_quantity: 10, package_cost: 400 },
    { package_id: 2, package_name: 'Compleet', package_quantity: 20, package_cost: 750 },
    { package_id: 3, package_name: 'Intensief', package_quantity: 30, package_cost: 1100 },
];
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function seed() {
    // shortcut: demo people and slots (the real rows lived only in the school MySQL database)
    const u = (user_id, role, nickname, infix, lastname, email, password, extra = {}) =>
        ({ user_id, role, nickname, infix, lastname, email, password, tele: '0612345678', postcode: '6811AA', housenumber: '12', plate: null, auto_model: null, rating: null, years_experience: null, ...extra });
    const users = [
        u(1, 2, 'Admin', '', 'Greenshift', 'admin@greenshift.nl', 'admin'),
        u(2, 3, 'Sanne', 'de', 'Vries', 'sanne@greenshift.nl', 'instructeur', { plate: 'EV-123-K', auto_model: 'Tesla Model 3', rating: 4.9, years_experience: 6 }),
        u(3, 3, 'Mark', '', 'Jansen', 'mark@greenshift.nl', 'instructeur', { plate: 'GZ-456-L', auto_model: 'Volkswagen ID.3', rating: 4.7, years_experience: 4 }),
        u(4, 4, 'Lisa', '', 'Bakker', 'lisa@greenshift.nl', 'instructeur', { plate: 'KX-789-P', auto_model: 'Kia EV6', rating: 4.5, years_experience: 2 }),
        u(5, 1, 'Jan', '', 'Pieters', 'jan@greenshift.nl', 'student'),
        u(6, 1, 'Emma', '', 'Smit', 'emma@greenshift.nl', 'student'),
    ];
    const availability = [];
    const today = new Date();
    for (let d = 1; d <= 21; d++) {
        const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
        if (day.getDay() === 0 || day.getDay() === 6) continue;
        for (const instructor_id of [2, 3]) for (const hr of [9, 10, 11, 14, 15]) {
            availability.push({ availability_id: availability.length + 1, instructor_id, date: ymd(day), hour: `${pad(hr)}:00:00`, student_id: null, paid: 'nee' });
        }
    }
    // two booked lessons for the demo student: one paid, one still to pay
    Object.assign(availability[0], { student_id: 5, paid: 'ja' });
    Object.assign(availability[12], { student_id: 5, paid: 'nee' });
    return {
        users, availability, package_user: [],
        pending_customers: [
            { pending_customers_id: 1, instructor_id: 2, user_id: 5, status: 'approved' },
            { pending_customers_id: 2, instructor_id: 2, user_id: 6, status: 'pending' },
        ],
    };
}

const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback(); } catch { return fallback(); } };
const db = load(DB_KEY, seed);
const S = load(SES_KEY, () => ({}));
const save = () => { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); localStorage.setItem(SES_KEY, JSON.stringify(S)); } catch { } };
const nextId = (arr, key) => arr.reduce((m, r) => Math.max(m, r[key]), 0) + 1;
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const q = new URLSearchParams(location.search);
const go = url => { location.href = url; };
const say = (kind, msg) => { S[kind] = msg; save(); };
const user = id => db.users.find(u => u.user_id == id);
const naam = u => [u.nickname, u.infix, u.lastname].filter(Boolean).join(' ');
const initials = u => ((u.nickname || '')[0] || '') + ((u.lastname || '')[0] || '');
const lessonTime = a => new Date(`${a.date}T${a.hour}`);
const myInstructor = () => db.pending_customers.find(p => p.user_id === S.user_id && p.status === 'approved')?.instructor_id ?? 2;
function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast33'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 50);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

function renderNav() {
    const links = {
        1: [['?page=home#packages', 'Pakketten'], ['?page=home#instructeurs', 'Rijinstructeurs'], ['?page=geplande-lessen', 'Geplande lessen'], [`?page=availability&instructor_id=${myInstructor()}`, 'Mijn rijinstructeur'], null, ['?logout=1', 'Uitloggen']],
        3: [['?page=geplande-lessen', 'Geplande lessen'], ['?page=availability', 'Les plannen'], ['?page=request_rijinstructeur', 'Bevestigingen'], ['?logout=1', 'Uitloggen']],
        2: [['?page=rijinstructeurbeheer', 'Rijinstructeurbeheer'], ['?page=userbeheer', 'Gebruikersbeheer'], null, ['?logout=1', 'Uitloggen']],
    }[S.role] || [['?page=home#packages', 'Pakketten'], ['?page=home#instructeurs', 'Rijinstructeurs'], ['?page=home#about', 'Over ons'], ['?page=login', 'Login / Registreren']];
    document.getElementById('nav').innerHTML = `<div class="navbar"><a href="?page=home"><img class="logo" src="image/logo.png" alt="Logo" width="80"></a>
        <div class="nav-links">${links.map(l => l ? `<a href="${l[0]}">${l[1]}</a>` : '<br>').join('')}</div></div>`;
}
function renderFlash() {
    const out = ['alert', 'success'].filter(k => S[k]).map(k => `<div class="${k}"><span onclick="this.parentElement.style.display='none'" class="close-btn">&times;</span><p>${h(S[k])}</p></div>`).join('');
    delete S.alert; delete S.success; save();
    document.getElementById('flash').innerHTML = out;
}
const takeBadge = () => { const f = S.flash; delete S.flash; save(); return f ? `<div class="badge">${h(f)}</div>` : ''; };

// --- instructeurs lijst + modal (rijinstructeurs_lijst / rijinstructeurs_calendar) ---
const instructeursLijst = () => `<div class="container33">
    <header class="header33"><div><h1>Rijinstructeurs — Voorregistratie</h1><p>Kies een instructeur en meld je aan. Wij nemen contact op om je les te bevestigen.</p></div>
        <div style="text-align:right;color:#64748b">Online aanmeldingen: <strong>Gratis</strong></div></header>
    <main class="grid33" id="instructor-list">${db.users.filter(u => u.role === 3).map(i => `<article class="card33">
        <div class="meta33"><div class="avatar33">${h(initials(i).toUpperCase())}</div><div class="name33"><h3>${h(naam(i))}</h3></div>
            <div class="rating33">★ ${Number(i.rating || 0).toFixed(1)}</div></div>
        <div class="info33"><div class="chip33">🚗 ${h(i.auto_model ?? 'Onbekend')}</div><div class="chip33">🏷️ ${h(i.plate ?? 'N.V.T.')}</div>
            <div class="chip33">⏱️ ${h(i.years_experience ?? '?')} jaar ervaring</div></div>
        <div class="actions33"><a class="btn33 btn33-primary show-instructor-modal" href="#" data-instructor-id="${i.user_id}">Meer info</a></div>
    </article>`).join('')}</main></div>
    <div id="instructorModal" class="modal-overlay"><div class="modal-content"><a href="#" class="modal-close">&times;</a><div id="modal-body-content"></div></div></div>`;
const instructeurKaart = i => `<div class="instructor-card-wrapper"><div class="instructor-card">
    <div class="inst-header"><div class="inst-avatar">${h(initials(i).toUpperCase() || 'I')}</div><div class="inst-meta"><h1 class="inst-name">${h(naam(i))}</h1></div></div>
    <div class="inst-details">
        ${i.rating ? `<div class="detail-item inst-rating"><span class="icon">⭐</span><span>Beoordeling: <strong>${Number(i.rating).toFixed(1)}</strong></span></div>` : ''}
        ${i.auto_model ? `<div class="detail-item inst-car"><span class="icon">🚗</span><span>Auto: <strong>${h(i.auto_model)}</strong></span></div>` : ''}
        ${i.plate ? `<div class="detail-item inst-plate"><span class="icon">🏷️</span><span>Kenteken: <strong>${h(i.plate)}</strong></span></div>` : ''}
    </div>
    <div class="inst-contact"><h3>Contact</h3>
        <div class="detail-item inst-email"><span class="icon">📧</span><a href="mailto:${h(i.email)}" class="contact-link">${h(i.email)}</a></div>
        <div class="detail-item inst-phone"><span class="icon">📞</span><a href="tel:${h(i.tele)}" class="contact-link">${h(i.tele)}</a></div></div>
    <button type="button" class="btn-inschrijven" data-id="${i.user_id}">Inschrijven</button>
    <div class="inschrijvings-result"></div>
    <a href="?page=availability&instructor_id=${i.user_id}" class="btn-calendar">📅</a>
</div></div>`;

const pages = {
    home: () => `<section id="home" class="hero relative"><div class="hero-container">
            <div class="hero-text"><h1>Rij veilig met Greenshift</h1><p>Zelfverzekerd de weg op met persoonlijke begeleiding en ervaren instructeurs.</p><a href="#packages" class="cta-btn">Bekijk pakketten</a></div>
            <img src="image/home.jpg" alt="Homepage banner" class="hero-img"></div></section>
        <section class="stats-section"><div class="stats-grid">
            ${[['95%', 'Succesratio'], ['100+', 'Leerlingen geslaagd'], ['2000+', 'Lessen gegeven'], ['5+', 'Jaar ervaring']].map(([n, t]) => `<div class="stat-box"><div class="text-3xl font-bold">${n}</div><div class="text-sm text-gray-400">${t}</div></div>`).join('')}
        </div></section>
        <section id="about" class="about-section"><div class="about-container"><img src="image/rij.jpg" alt="Over ons" class="about-img"><div>
            <h2>Waarom Greenshift?</h2><p>Bij Greenshift draait rijles niet alleen om leren schakelen en sturen, maar om vertrouwen, veiligheid en groei.
            Onze instructeurs zijn geduldig en ervaren, en helpen jou om met zelfvertrouwen de weg op te gaan.</p><a href="?page=over_ons" class="cta-btn">Ontdek meer over ons</a></div></div></section>
        <section id="packages" class="packages-section"><h2 class="text-3xl font-bold text-center">Onze Rijles Pakketten</h2><p class="text-center mt-2 mb-10">Kies een pakket dat bij jou past</p>
            <div class="packages-grid">
                <div class="package-box"><h3>Starter</h3><p>10 lessen om de basis goed onder de knie te krijgen.</p><div class="price">€400</div><a href="?page=betalen&pakket=1" class="btn">Boek nu</a></div>
                <div class="package-box highlight"><h3>Compleet</h3><p>20 lessen inclusief voorbereiding op het praktijkexamen.</p><div class="price">€750</div><a href="?page=betalen&pakket=2" class="btn">Boek nu</a></div>
                <div class="package-box"><h3>Intensief</h3><p>30 lessen voor wie snel en intensief wil leren rijden.</p><div class="price">€1100</div><a href="?page=betalen&pakket=3" class="btn">Boek nu</a></div>
            </div></section>
        <section id="instructeurs" style="text-align: center; padding: 60px 0;"><a href="?page=rijinstructeurs_lijst" class="cta-btn1">Bekijk alle rijinstructeurs</a>
            <div class="instructeurs-lijst">${instructeursLijst()}</div></section>
        <footer class="footer"><div class="footer-container">
            <div class="footer-col"><h3>Greenshift Rijschool</h3><p>Wij helpen jou veilig en zelfverzekerd de weg op. Met ervaren instructeurs en persoonlijke begeleiding zorgen we dat je met vertrouwen je rijbewijs haalt.</p></div>
            <div class="footer-col"><h4>Snelle links</h4><ul><li><a href="#home">Home</a></li><li><a href="?page=over_ons">Over ons</a></li><li><a href="#packages">Pakketten</a></li><li><a href="?page=login">Login / Registreren</a></li></ul></div>
            <div class="footer-col"><h4>Contact</h4><p>Email: info@greenshift.nl</p><p>Tel: +31 6 12345678</p><p>Adres: Rijschoolstraat 12, Arnhem</p></div>
        </div><div class="footer-bottom">© 2025 Greenshift Rijschool. Alle rechten voorbehouden.</div></footer>`,

    over_ons: () => `<div class="about-container"><h2>Over ons</h2>
        <p>Welkom op onze website! 🚗 Wij geloven dat rijlessen meer zijn dan alleen het behalen van je rijbewijs. Het gaat om vertrouwen opbouwen, veiligheid op de weg en met plezier leren rijden.</p>
        <p>Op deze website kun je eenvoudig kennismaken met onze rijinstructeurs, hun profielen bekijken en hun beschikbaarheid inplannen. Zo weet je altijd precies bij wie je gaat lessen en wanneer dit kan. Transparantie en duidelijkheid staan bij ons centraal.</p>
        <p>Ons team bestaat uit ervaren en geduldige instructeurs die al vele leerlingen succesvol hebben begeleid naar hun rijbewijs. Met meer dan 100 geslaagde leerlingen, duizenden gegeven lessen en jarenlange ervaring weten wij precies hoe we jou kunnen helpen om zelfverzekerd de weg op te gaan.</p>
        <p>Of je nu net begint met je eerste rijles of al wat ervaring hebt en je rijvaardigheid verder wilt verbeteren, wij staan voor je klaar. Onze missie is om iedere leerling stap voor stap te begeleiden tot een zelfstandige en veilige bestuurder.</p>
        <p>Samen maken we van jouw rijopleiding een leerzame, maar ook leuke ervaring. Klaar om de eerste stap te zetten? Ontdek onze instructeurs en plan vandaag nog je eerste les!</p></div>`,

    login: () => `<div class="login-content"><form id="login"><div class="login">
        <h1>Email:</h1><input type="email" placeholder="user@gmail.com" name="email" required>
        <h1>Password:</h1><input type="password" placeholder="password" name="password" required>
        <p>Don't have an account? <a href="?page=register" class="register-button">Register here</a></p>
        <small>Demo: jan@greenshift.nl / student &middot; sanne@greenshift.nl / instructeur &middot; admin@greenshift.nl / admin</small>
        <br><button type="submit">Login</button><br></div></form></div>`,

    register: () => registerForm(false),
    'i-register': () => registerForm(true),
    rijinstructeurs_lijst: instructeursLijst,

    availability: () => {
        const role = S.role || 0;
        return `<div class="container33"><header class="header33"><div><h1>Rijinstructeur Beschikbaarheid</h1>
            <p>${role == 3 ? 'Klik op een dag en voer een tijdbereik in (08:00 – 20:00). Elke uur wordt apart opgeslagen.' : 'Klik op een beschikbaar uur om een les te reserveren.'}</p></div></header>
            <div id="calendar"></div></div>
        ${role == 3 ? `<div id="timeModal" class="modal33"><div class="modal-content33"><h3 id="selectedDate">Beschikbare uren</h3>
            <form id="availabilityForm">
                <label for="start_time">Starttijd</label><select name="start_time" id="start_time" required>${Array.from({ length: 12 }, (_, i) => `<option>${pad(i + 8)}:00</option>`).join('')}</select>
                <label for="end_time">Eindtijd</label><select name="end_time" id="end_time" required>${Array.from({ length: 12 }, (_, i) => `<option>${pad(i + 9)}:00</option>`).join('')}</select>
                <input type="hidden" name="date" id="dateField">
                <div class="modal-actions33"><button type="submit" class="btn33 btn33-primary">Opslaan</button><button type="button" id="closeModal" class="btn33 btn33-outline">Annuleren</button></div>
            </form></div></div>` : ''}`;
    },

    'geplande-lessen': () => {
        if (!S.user_id) return "<p style='color:#f87171'>Sessie verlopen. Log opnieuw in.</p>";
        const now = new Date(), field = S.role == 1 ? 'student_id' : S.role == 3 ? 'instructor_id' : null;
        const lessons = field ? db.availability.filter(a => a[field] === S.user_id && a.student_id && (a.paid === 'nee' || lessonTime(a) >= now))
            .sort((a, b) => lessonTime(a) - lessonTime(b)) : [];
        if (q.get('status') === 'success') S.success = 'Betaling gelukt ✅';
        return `<h2>Mijn geplande lessen</h2><table><thead><tr><th>Datum</th><th>Tijd</th><th>Student</th><th>Status</th><th>Acties</th></tr></thead><tbody>
            ${lessons.map(a => {
                const diff = (lessonTime(a) - now) / 36e5;
                return `<tr id="lesson-${a.availability_id}"><td>${h(a.date)}</td><td>${a.hour.slice(0, 5)}</td><td>${h(user(a.student_id)?.nickname || '-')}</td>
                    <td class="status-cell">${a.paid === 'ja' ? 'Betaald' : 'Niet betaald'}</td><td>
                    ${a.paid !== 'ja' ? (S.role == 3 ? `<button class="cta-btn actie-btn" data-action="betalen" data-id="${a.availability_id}">Betalen</button>`
                        : `<button class="cta-btn" onclick="location.href='?page=betalen&lesson_id=${a.availability_id}'">Betalen</button>`) : ''}
                    ${diff >= 24 ? `<button class="cta-btn delete actie-btn" data-action="annuleer" data-id="${a.availability_id}">Annuleren</button>` : ''}
                    ${diff < 0 && a.paid === 'ja' ? '-' : ''}</td></tr>`;
            }).join('') || '<tr><td colspan="5">Geen geplande lessen gevonden.</td></tr>'}</tbody></table>`;
    },

    betalen: () => {
        if (!S.user_id) return go('?page=login');
        const lesson_id = +q.get('lesson_id') || 0, pakket = +q.get('pakket') || 0;
        const flow = lesson_id ? 'lesson' : pakket ? 'package' : null;
        if (!flow) return go('?page=geplande-lessen');
        const lesson = db.availability.find(a => a.availability_id === lesson_id), pkg = PACKAGES.find(p => p.package_id === pakket);
        if (flow === 'lesson' && !lesson) return go('?page=geplande-lessen');
        if (flow === 'lesson' && lesson.student_id !== S.user_id && lesson.instructor_id !== S.user_id) return go('?page=geplande-lessen&status=forbidden');
        if (flow === 'package' && !pkg) return go('?page=home#packages');
        if (flow === 'package' && S.role !== 1) return say('alert', 'Log in als leerling om een pakket te kopen.'), go('?page=home#packages');
        const u = user(S.user_id), status = q.get('status');
        const inputStyle = 'width:100%;padding:10px;border-radius:6px;border:1px solid #374151;background:#151d31;color:#fff;';
        return `<div class="container33" style="max-width:880px;margin:40px auto;">
            <div class="header33"><h1>Betalen</h1>${flow === 'lesson' ? `<p>Lesdatum: <strong>${h(lesson.date + ' ' + lesson.hour)}</strong>.</p>`
                : `<p>Pakket: <strong>${h(pkg.package_name)}</strong> — <strong>${pkg.package_quantity}</strong> lessen — €${pkg.package_cost.toLocaleString('nl-NL')}.</p>`}
                <p><small>Demo: er wordt niets afgeschreven en kaartgegevens worden nergens opgeslagen. Gebruik testgegevens, bijvoorbeeld 4242 4242 4242 4242.</small></p></div>
            ${status && status !== 'success' ? `<div class="alert"><p>❌ Betaling mislukt. ${status === 'failed' ? 'Controleer je gegevens.' : h(status)}</p><span class="close-btn" onclick="this.parentElement.remove()">×</span></div>` : ''}
            <div style="display:flex;gap:14px;margin-bottom:16px;"><button type="button" id="btnCard" class="cta-btn1" style="border:none;">Creditcard</button>
                <button type="button" id="btnIdeal" class="cta-btn1" style="border:none;background:#0ea5e9;">iDEAL</button></div>
            <form id="idealForm" class="form" style="background:#10182c;display:none;"><h3 style="color:#22c55e;">iDEAL</h3>
                <div><label style="color:white;">Kies je bank</label><select name="ideal_issuer" required style="${inputStyle}"><option value="">-- Selecteer bank --</option>
                    ${['ABN AMRO', 'ING', 'Rabobank', 'bunq', 'SNS', 'ASN Bank', 'RegioBank', 'Triodos Bank', 'Knab'].map(b => `<option>${b}</option>`).join('')}</select></div>
                <div style="text-align:right;margin-top:20px;"><button type="submit" class="cta-btn1" style="border:none;">${flow === 'lesson' ? 'Afrekenen met iDEAL' : 'Pakket afrekenen'}</button></div></form>
            <form id="paymentForm" class="form" style="background:#10182c;" autocomplete="off"><h3 style="color:#22c55e;">Factuurgegevens</h3>
                <div style="display:flex;gap:10px;"><div style="flex:1;"><label style="color:white;">Voornaam</label><input type="text" name="first_name" value="${h(u.nickname)}" required></div>
                    <div style="flex:1;"><label style="color:white;">Achternaam</label><input type="text" name="last_name" value="${h(u.lastname)}" required></div></div>
                <div><label style="color:white;">E-mailadres</label><input type="email" name="email" value="${h(u.email)}" required></div>
                <h3 style="color:#22c55e;margin-top:25px;">Creditcardgegevens</h3>
                <div><label style="color:white;">Naam op kaart</label><input type="text" name="card_name" placeholder="Naam op kaart" required></div>
                <div><label style="color:white;">Kaartnummer</label><input type="text" name="card_number" maxlength="19" placeholder="1111-2222-3333-4444" required></div>
                <div style="display:flex;gap:10px;"><div style="flex:1;"><label style="color:white;">Vervalmaand</label><input type="text" name="exp_month" maxlength="9" placeholder="januari" required></div>
                    <div style="flex:1;"><label style="color:white;">Vervaljaar</label><input type="number" name="exp_year" placeholder="2026" required></div>
                    <div style="flex:1;"><label style="color:white;">CVC</label><input type="text" name="cvc" pattern="\\d{3,4}" inputmode="numeric" maxlength="4" placeholder="123" required></div></div>
                <div style="text-align:right;margin-top:20px;"><button type="submit" class="cta-btn1" style="border:none;">${flow === 'lesson' ? 'Betalen' : 'Pakket betalen'}</button></div></form>
        </div>
        <div id="popup" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(3px);justify-content:center;align-items:center;z-index:10000;">
            <div style="background:#10182c;padding:30px;border-radius:12px;color:white;text-align:center;box-shadow:0 0 20px rgba(0,0,0,0.4);width:300px;">
                <h2 id="popupText" style="color:#22c55e;">💳 Betaling wordt verwerkt...</h2><p>Even geduld a.u.b.</p></div></div>`;
    },

    request_rijinstructeur: () => `<h1>Inschrijvingsaanvragen</h1><table><tr><th>Klant</th><th>Email</th><th>Tel</th><th>Status</th><th>Actie</th></tr>
        ${db.pending_customers.filter(p => p.instructor_id === S.user_id).map(p => {
            const u = user(p.user_id) || {};
            return `<tr><td>${h(u.nickname + ' ' + u.lastname)}</td><td>${h(u.email)}</td><td>${h(u.tele)}</td><td>${h(p.status)}</td>
                <td><button class="accept" data-req="${p.pending_customers_id}" data-status="approved">Accepteren</button>
                    <button class="reject" data-req="${p.pending_customers_id}" data-status="rejected">Weigeren</button></td></tr>`;
        }).join('')}</table>`,

    rijinstructeurbeheer: () => {
        const rij = (r, actions) => `<tr><td>${h(naam(r))}</td><td>${h(r.tele)}</td><td>${h(r.email)}</td><td>${h(r.plate)}</td><td>${h(r.auto_model)}</td><td>${actions}</td></tr>`;
        const head = last => `<thead><tr><th>Naam</th><th>Telefoon</th><th>E-mail</th><th>Kenteken</th><th>Automodel</th><th>${last}</th></tr></thead>`;
        return `${takeBadge()}<h2>Actieve instructeurs</h2><table>${head('Acties')}<tbody>
            ${db.users.filter(u => u.role === 3).map(r => rij(r, `<a class="cta-btn edit" href="?page=rijinstructeur_edit&id=${r.user_id}">Bewerken</a>
                <a class="cta-btn delete" href="#" data-demote="${r.user_id}">Verwijderen</a>`)).join('')}</tbody></table>
            <h2>Pending instructeurs</h2><table>${head('Actie')}<tbody>
            ${db.users.filter(u => u.role === 4).map(r => rij(r, `<a class="cta-btn activate" href="#" data-activate="${r.user_id}">Activeer</a>`)).join('')}</tbody></table>
            <h3>Instructeur toevoegen</h3><form id="instructeur_toevoegen" class="form">
                <label for="instructor_id">Naam (gebruikers → instructeurs)</label><select id="instructor_id" name="instructor_id" required><option value="">Kies...</option>
                    ${db.users.filter(u => [1, 4].includes(u.role)).sort((a, b) => a.nickname.localeCompare(b.nickname)).map(u => `<option value="${u.user_id}" data-tele="${h(u.tele)}" data-email="${h(u.email)}">${h(naam(u))} (ID:${u.user_id})</option>`).join('')}</select>
                <label>Telefoon</label><input type="text" id="tele" readonly><label>E-mail</label><input type="text" id="email" readonly>
                <label for="plate">Kenteken</label><input type="text" id="plate" name="plate" placeholder="EV-123-K" required>
                <label for="auto_model">Automodel</label><input type="text" id="auto_model" name="auto_model" placeholder="Tesla Model 3" required>
                <button class="cta-btn edit" type="submit">Toevoegen</button></form>`;
    },

    rijinstructeur_edit: () => {
        const e = user(q.get('id'));
        if (!e) return say('flash', 'Instructeur niet gevonden 🚫'), go('?page=rijinstructeurbeheer');
        return `<h2>Instructeur bewerken</h2><form id="instructeur_edit">
            <label>Naam</label><input type="text" value="${h(naam(e))}" readonly><label>Telefoon</label><input type="text" value="${h(e.tele)}" readonly>
            <label>E-mail</label><input type="text" value="${h(e.email)}" readonly>
            <label for="plate">Kenteken</label><input type="text" id="plate" name="plate" required value="${h(e.plate)}">
            <label for="auto_model">Automodel</label><input type="text" id="auto_model" name="auto_model" required value="${h(e.auto_model)}">
            <button class="cta-btn" type="submit">Opslaan</button><a class="cta-btn cancel" href="?page=rijinstructeurbeheer">Annuleren</a></form>`;
    },

    userbeheer: () => {
        if (q.get('delete')) { db.users = db.users.filter(u => u.user_id != q.get('delete')); say('flash', 'Gebruiker verwijderd 🗑️'); return go('?page=userbeheer'); }
        return `${takeBadge()}<h2>Gebruikersbeheer</h2><table><thead><tr><th>Naam</th><th>Telefoon</th><th>E-mail</th><th>Postcode</th><th>Huisnr</th><th>Rol</th><th>Acties</th></tr></thead><tbody>
            ${db.users.map(r => `<tr><td>${h(naam(r))}</td><td>${h(r.tele)}</td><td>${h(r.email)}</td><td>${h(r.postcode)}</td><td>${h(r.housenumber)}</td><td>${ROLES[r.role] ?? 'Onbekend'}</td>
                <td><a class="cta-btn edit" href="#" data-user="${r.user_id}">Bewerken</a>
                    <a class="cta-btn delete" href="?page=userbeheer&delete=${r.user_id}" onclick="return confirm('Weet je het zeker?')">Verwijderen</a></td></tr>`).join('')}</tbody></table>
            <div id="editModal" class="modal33"><div class="modal-content33"><h3>Gebruiker bewerken</h3><form id="userbeheer"><input type="hidden" name="user_id" id="edit_user_id">
                <div class="name-row"><div class="field"><label>Voornaam</label><input type="text" name="nickname" id="edit_nickname" required></div>
                    <div class="field small"><label>Tussenvoegsel</label><input type="text" name="infix" id="edit_infix"></div>
                    <div class="field"><label>Achternaam</label><input type="text" name="lastname" id="edit_lastname" required></div></div>
                <label>Telefoon</label><input type="text" name="tele" id="edit_tele"><label>E-mail</label><input type="email" name="email" id="edit_email" required>
                <label>Postcode</label><input type="text" name="postcode" id="edit_postcode"><label>Huisnummer</label><input type="text" name="housenumber" id="edit_housenumber">
                <label>Rol</label><select name="role" id="edit_role">${Object.entries(ROLES).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
                <div class="modal-actions33"><button type="submit" class="btn33 btn33-primary">Opslaan</button><button type="button" class="btn33 btn33-outline" id="closeModal">Annuleren</button></div>
            </form></div></div>`;
    },
};
const ACCESS = { availability: [1, 3], 'geplande-lessen': [1, 3], betalen: [1, 3], request_rijinstructeur: [3], rijinstructeurbeheer: [2], rijinstructeur_edit: [2], userbeheer: [2] };

function registerForm(instructor) {
    const o = k => h(S.old?.[k]);
    const html = `<div class="login-content"><form id="register" data-type="${instructor ? 'instructor' : 'user'}" novalidate>${instructor ? '<h1>Sign Up as Instructor</h1>' : ''}<div class="login">
        <label>Voornaam</label><input type="text" name="nickname" value="${o('nickname')}" required>
        <label>Tussenvoegsel</label><input type="text" name="infix" value="${o('infix')}">
        <label>Achternaam</label><input type="text" name="lastname" value="${o('lastname')}" required>
        <label>Postcode</label><input name="postcode" type="text" value="${o('postcode')}" required>
        <label>Huis Nummer</label><input name="housenumber" type="text" value="${o('housenumber')}" required>
        <label>Telefoonnummer</label><input name="tele" type="text" value="${o('tele')}" required>
        <label>Email</label><input name="email" type="email" value="${o('email')}" required>
        <label>Wachtwoord</label><input name="password" type="password" required>
        <label>Herhaal Wachtwoord</label><input name="passwordconfrim" type="password" required>
        ${instructor ? `<label>Kentekenplaat</label><input name="plate" type="text" placeholder="EV-123-K" value="${o('plate')}" required>
            <label>Automodel</label><input name="auto_model" type="text" placeholder="Tesla Model 3" value="${o('auto_model')}" required>
            <label>Rating</label><input name="rating" step="0.1" type="number" placeholder="4,9" value="${o('rating')}" required>
            <label>Jaren ervaring</label><input name="years_experience" type="number" placeholder="2 jaren ervaring" value="${o('years_experience')}" required>
            <p>Wilt u liever een regulier studentenaccount? <a href="?page=register" class="register-button">Aanmelden als student</a></p>`
            : `<p>aanmelden als rij-instructeur? <a href="?page=i-register" class="register-button">Registreer hier</a></p>`}
        ${S.notification ? `<div class="alert">${h(S.notification)}</div>` : ''}
        <button type="submit">Aanmelden</button></div></form></div>`;
    delete S.notification; delete S.old; save();
    return html;
}

function markPaid(lessonId) {
    const a = db.availability.find(x => x.availability_id === lessonId);
    if (a && a.paid !== 'ja') a.paid = 'ja';
}
function buyPackage(pid) {
    const pkg = PACKAGES.find(p => p.package_id === pid), row = db.package_user.find(r => r.user_id === S.user_id && r.package_id === pid);
    if (row) row.package_quantity += pkg.package_quantity; else db.package_user.push({ user_id: S.user_id, package_id: pid, package_quantity: pkg.package_quantity });
}

const forms = {
    login(f) {
        const u = db.users.find(u => u.email === f.email.trim());
        if (!f.email.trim() || !f.password) return say('alert', 'Email and password are required.'), go('?page=login');
        if (!u) return say('alert', 'Incorrect E-mail or Password! Please try again'), go('?page=login');
        if (u.password !== f.password) return say('alert', 'E-mailadres of wachtwoord onjuist! Probeer het opnieuw.'), go('?page=login');
        Object.assign(S, { role: u.role, user_id: u.user_id });
        say('success', 'inloggen succesvol'); go('?page=home');
    },
    register(f, el) {
        const instructor = el.dataset.type === 'instructor', back = msg => { Object.assign(S, { notification: msg, old: f }); delete S.old.password; delete S.old.passwordconfrim; save(); go(instructor ? '?page=i-register' : '?page=register'); };
        const v = k => (f[k] || '').trim(), tele = v('tele').replace(/\s+/g, ''), postcode = v('postcode').replace(/ /g, '').toUpperCase(), plate = v('plate').replace(/ /g, '').toUpperCase();
        if (!v('nickname') || !v('lastname') || !v('email') || !f.password || !f.passwordconfrim || !postcode || !v('housenumber') || !tele) return back('Vul alle verplichte velden in.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) return back('Vul een geldig e mailadres in.');
        if (f.password !== f.passwordconfrim) return back('Wachtwoorden komen niet overeen.');
        if (!/^\+?[0-9]{8,15}$/.test(tele)) return back('Telefoonnummer mag alleen cijfers en eventueel een plus teken bevatten, 8 tot 15 cijfers.');
        if (!/^[1-9][0-9]{3}[A-Z]{2}$/.test(postcode)) return back('Postcode ongeldig. Gebruik het formaat 1234AB.');
        if (instructor && (!plate || !v('auto_model'))) return back('Vul een kenteken en automodel in.');
        if (instructor && !/^[A-Z0-9-]{1,8}$/.test(plate)) return back('Ongeldig kenteken. Gebruik alleen letters, cijfers en eventueel streepjes, max 8 tekens.');
        if (db.users.some(u => u.email === v('email'))) return back('Dit e mailadres is al geregistreerd.');
        db.users.push({ user_id: nextId(db.users, 'user_id'), role: instructor ? 4 : 1, nickname: v('nickname'), infix: v('infix'), lastname: v('lastname'), tele, email: v('email'), password: f.password,
            postcode, housenumber: v('housenumber'), plate: instructor ? plate : '', auto_model: instructor ? v('auto_model') : '', rating: instructor ? +f.rating || null : null, years_experience: instructor ? +f.years_experience || null : null });
        say('success', instructor ? 'Instructeur account is succesvol aangemaakt. Je kunt nu inloggen.' : 'Account is succesvol aangemaakt. Je kunt nu inloggen.'); go('?page=login');
    },
    instructeur_toevoegen(f) {
        const u = user(f.instructor_id);
        if (u && f.plate.trim() && f.auto_model.trim()) { Object.assign(u, { plate: f.plate.trim(), auto_model: f.auto_model.trim(), role: 3 }); S.flash = 'Opgeslagen ✅'; } else S.flash = 'Er is een fout 🚫';
        save(); go('?page=rijinstructeurbeheer');
    },
    instructeur_edit(f) {
        const u = user(q.get('id'));
        if (!f.plate.trim() || !f.auto_model.trim()) return say('flash', 'Er is een fout 🚫'), go(location.search);
        Object.assign(u, { plate: f.plate.trim(), auto_model: f.auto_model.trim(), role: 3 });
        say('flash', 'Instructeur bijgewerkt ✅'); go('?page=rijinstructeurbeheer');
    },
    userbeheer(f) {
        const u = user(f.user_id);
        if (u && f.nickname.trim() && f.email.trim()) {
            Object.assign(u, { nickname: f.nickname.trim(), infix: f.infix.trim(), lastname: f.lastname.trim(), tele: f.tele.trim(), email: f.email.trim(),
                postcode: f.postcode.replace(/ /g, '').toUpperCase(), housenumber: f.housenumber.trim(), role: +f.role });
            S.flash = 'Gebruiker bijgewerkt ✅';
            if (u.user_id === S.user_id) S.role = u.role;
        } else S.flash = 'Fout bij het bewerken 🚫';
        save(); go('?page=userbeheer');
    },
};

function finishPayment(method, f) {
    const lesson_id = +q.get('lesson_id') || 0, pakket = +q.get('pakket') || 0, qs = lesson_id ? `lesson_id=${lesson_id}` : `pakket=${pakket}`;
    if (method === 'ideal' && !f.ideal_issuer) return go(`?page=betalen&${qs}&status=Kies%20je%20bank%20(iDEAL).`);
    if (method === 'card') {
        const card = (f.card_number || '').replace(/\D/g, '');
        const ok = card.length >= 13 && card.length <= 19 && /^\d{3,4}$/.test(f.cvc) && f.first_name.trim() && f.last_name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) && f.exp_month.trim() && /^\d+$/.test(f.exp_year);
        if (!ok) return go(`?page=betalen&${qs}&status=failed`);
    }
    if (lesson_id) { markPaid(lesson_id); save(); return go('?page=geplande-lessen&status=success'); }
    buyPackage(pakket); save(); go('?page=home#instructeurs');
}

function bindCalendar() {
    const el = document.getElementById('calendar');
    if (!el) return;
    const role = S.role, instructorId = role === 3 ? S.user_id : +q.get('instructor_id') || myInstructor();
    const modal = document.getElementById('timeModal'), form = document.getElementById('availabilityForm');
    const verified = () => role === 3 || db.pending_customers.some(p => p.instructor_id === instructorId && p.user_id === S.user_id && p.status === 'approved');
    const s = document.createElement('script');
    s.src = FULLCALENDAR;
    s.onerror = () => { el.innerHTML = '<p>De kalender kon niet worden geladen (geen verbinding met CDN).</p>'; };
    s.onload = () => {
        const calendar = new FullCalendar.Calendar(el, {
            initialView: 'dayGridMonth', locale: 'nl', selectable: role === 3, height: 'auto', eventDisplay: 'block', firstDay: 1,
            buttonText: { today: 'Vandaag', month: 'Maand', week: 'Week', day: 'Dag' },
            headerToolbar: { left: '', center: 'title', right: 'today prev,next' },
            events: (info, ok) => {
                if (!verified()) { toast('Je account is nog niet geverifieerd door de instructeur.'); return ok([]); }
                ok(db.availability.filter(a => a.instructor_id === instructorId).sort((a, b) => lessonTime(a) - lessonTime(b)).map(a => ({
                    id: String(a.availability_id), title: a.hour.slice(0, 5), start: a.date,
                    color: a.student_id ? (a.student_id === S.user_id ? '#3b82f6' : '#ef4444') : '#16a34a',
                })));
            },
            eventClick: info => {
                const a = db.availability.find(x => x.availability_id == info.event.id);
                if (role === 3) {
                    if (!confirm(`Weet je zeker dat je het uur ${info.event.title} op ${info.event.startStr} wilt verwijderen?`)) return;
                    if (a.student_id) return alert('Dit tijdslot is al toegewezen.');
                    db.availability = db.availability.filter(x => x !== a); save();
                    toast('🗑️ Beschikbaarheid verwijderd.'); info.event.remove();
                } else if (role === 1) {
                    if (!confirm(`Wil je dit tijdslot reserveren (${info.event.title})?`)) return;
                    if (a.student_id) return alert('Dit tijdslot is al bezet.');
                    const pkg = db.package_user.filter(p => p.user_id === S.user_id && p.package_quantity > 0).sort((x, y) => x.package_id - y.package_id)[0];
                    if (pkg) { pkg.package_quantity--; Object.assign(a, { student_id: S.user_id, paid: 'ja' }); toast('📅 Tijdslot gereserveerd. 1 les uit je pakket is gebruikt (betaald).'); }
                    else { Object.assign(a, { student_id: S.user_id, paid: 'nee' }); toast('📅 Tijdslot succesvol gereserveerd! Reken dit later af via Betalen.'); }
                    save(); calendar.refetchEvents();
                }
            },
            dateClick: info => {
                if (role !== 3 || !modal) return;
                document.getElementById('selectedDate').textContent = 'Beschikbare uren voor ' + info.dateStr;
                form.reset(); document.getElementById('dateField').value = info.dateStr; modal.classList.add('show');
            },
        });
        calendar.render();
        if (!form) return;
        form.addEventListener('submit', e => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(form)), sh = +f.start_time.slice(0, 2), eh = +f.end_time.slice(0, 2);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return alert('Ongeldige datum.');
            if (sh < 8 || eh > 20 || eh <= sh) return alert('Tijdbereik moet tussen 08:00 en 20:00 liggen en eindtijd moet later zijn dan starttijd.');
            for (let hr = sh; hr < eh; hr++) {
                const hour = `${pad(hr)}:00:00`;
                if (!db.availability.some(a => a.instructor_id === S.user_id && a.date === f.date && a.hour === hour)) // INSERT IGNORE
                    db.availability.push({ availability_id: nextId(db.availability, 'availability_id'), instructor_id: S.user_id, date: f.date, hour, student_id: null, paid: 'nee' });
            }
            save(); toast('✅ Beschikbaarheid toegevoegd!'); modal.classList.remove('show'); calendar.refetchEvents();
        });
        document.getElementById('closeModal').addEventListener('click', () => modal.classList.remove('show'));
        window.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    };
    document.head.appendChild(s);
}

function render() {
    if (q.has('logout')) { for (const k in S) delete S[k]; save(); return go('?page=home'); }
    let page = (q.get('page') || 'home').toLowerCase();
    if (page === 'paketten') return go('?page=home#packages');
    if (!pages[page]) page = 'home';
    if (ACCESS[page] && !ACCESS[page].includes(S.role)) return go(S.user_id ? '?page=home' : '?page=login');
    const html = pages[page]();
    if (html === undefined) return; // page redirected
    renderNav(); renderFlash();
    const styleKey = page === 'home' ? 'rijinstructeurs_lijst' : page;
    document.getElementById('page-style').textContent = PAGE_STYLES[styleKey] || '';
    document.getElementById('page').innerHTML = html;
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
    bindCalendar();

    const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => { e.preventDefault(); fn(el, e); }));
    on('#page form[id]:not(#idealForm):not(#paymentForm):not(#availabilityForm)', 'submit', el => forms[el.id]?.(Object.fromEntries(new FormData(el)), el));

    // instructor modal (was jQuery + AJAX)
    const modal = document.getElementById('instructorModal');
    if (modal) {
        const close = () => modal.classList.remove('active');
        on('.show-instructor-modal', 'click', el => {
            document.getElementById('modal-body-content').innerHTML = instructeurKaart(user(el.dataset.instructorId));
            modal.classList.add('active');
            on('.btn-inschrijven', 'click', b => {
                const out = b.nextElementSibling;
                if (S.role !== 1) { out.textContent = 'Toegang geweigerd.'; return; }
                const iid = +b.dataset.id;
                if (db.pending_customers.some(p => p.user_id === S.user_id && p.instructor_id === iid)) { out.textContent = 'Je hebt al een aanvraag gestuurd naar deze instructeur.'; return; }
                db.pending_customers.push({ pending_customers_id: nextId(db.pending_customers, 'pending_customers_id'), instructor_id: iid, user_id: S.user_id, status: 'pending' });
                save(); out.textContent = '✅ Aanvraag succesvol verzonden!';
            });
        });
        on('.modal-close', 'click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    }

    on('.actie-btn', 'click', el => {
        const id = +el.dataset.id, a = db.availability.find(x => x.availability_id === id);
        if (el.dataset.action === 'annuleer') {
            if (!confirm('Weet je zeker dat je deze les wilt annuleren?')) return;
            if (!(a.student_id === S.user_id || (S.role === 3 && a.instructor_id === S.user_id))) return alert('Fout: Je hebt geen toestemming om deze les te annuleren.');
            if (lessonTime(a) - new Date() < 24 * 36e5) return alert('Fout: Annuleren kan tot 24 uur voor aanvang.');
            Object.assign(a, { student_id: null, paid: 'nee' }); save(); alert('Les geannuleerd ✅'); go(location.search);
        } else {
            if (!(S.role === 3 && a.instructor_id === S.user_id)) return alert('Fout: Alleen de instructeur van deze les kan deze als betaald markeren.');
            markPaid(id); save(); alert('Les gemarkeerd als betaald ✅'); go(location.search);
        }
    });

    const card = document.getElementById('paymentForm'), ideal = document.getElementById('idealForm');
    if (card) {
        const toggle = m => {
            ideal.style.display = m === 'ideal' ? 'block' : 'none'; card.style.display = m === 'ideal' ? 'none' : 'block';
            document.getElementById('btnIdeal').style.filter = m === 'ideal' ? 'brightness(1)' : 'brightness(0.85)';
            document.getElementById('btnCard').style.filter = m === 'ideal' ? 'brightness(0.85)' : 'brightness(1)';
        };
        toggle('ideal');
        on('#btnCard', 'click', () => toggle('card'));
        on('#btnIdeal', 'click', () => toggle('ideal'));
        const popup = document.getElementById('popup'), text = document.getElementById('popupText');
        const submit = (form, method, first) => {
            popup.style.display = 'flex'; if (first) text.innerHTML = first;
            const f = Object.fromEntries(new FormData(form)); form.reset(); // card data is never kept
            setTimeout(() => { text.innerHTML = '✅ Betaling gelukt!'; }, 1300);
            setTimeout(() => finishPayment(method, f), 2300);
        };
        on('#paymentForm', 'submit', () => submit(card, 'card'));
        on('#idealForm', 'submit', () => submit(ideal, 'ideal', '🏦 iDEAL bankomgeving...'));
    }

    on('[data-req]', 'click', el => {
        const r = db.pending_customers.find(p => p.pending_customers_id == el.dataset.req);
        if (['approved', 'rejected'].includes(r.status)) say('alert', 'Aanvraag is al afgehandeld.');
        else { r.status = el.dataset.status; say('success', r.status === 'approved' ? 'Aanvraag succesvol goedgekeurd!' : 'Aanvraag succesvol geweigerd!'); }
        go('?page=request_rijinstructeur');
    });
    on('[data-demote]', 'click', el => {
        if (!confirm('Weet je het zeker?')) return;
        Object.assign(user(el.dataset.demote), { role: 1, plate: null, auto_model: null });
        say('flash', 'Instructeur teruggezet naar gebruiker; kenteken en automodel verwijderd. 🗑️'); go('?page=rijinstructeurbeheer');
    });
    on('[data-activate]', 'click', el => { user(el.dataset.activate).role = 3; say('flash', 'Instructeur geactiveerd ✅'); go('?page=rijinstructeurbeheer'); });
    const sel = document.getElementById('instructor_id');
    sel?.addEventListener('change', () => {
        const o = sel.options[sel.selectedIndex];
        document.getElementById('tele').value = o.dataset.tele || ''; document.getElementById('email').value = o.dataset.email || '';
    });
    const edit = document.getElementById('editModal');
    if (edit) {
        on('.cta-btn.edit[data-user]', 'click', el => {
            const u = user(el.dataset.user);
            for (const k of ['user_id', 'nickname', 'infix', 'lastname', 'tele', 'email', 'postcode', 'housenumber', 'role']) document.getElementById('edit_' + k).value = u[k] ?? '';
            edit.classList.add('show');
        });
        document.getElementById('closeModal').addEventListener('click', () => edit.classList.remove('show'));
        window.addEventListener('click', e => { if (e.target === edit) edit.classList.remove('show'); });
    }
}
render();
