// Static replica of PokeTrader: MySQL + $_SESSION are replaced by localStorage,
// the PHP card proxy by direct calls to the public Pokémon TCG API (it allows CORS without a key).
const DB_KEY = 'poketrader-db-v1', SES_KEY = 'poketrader-session-v1';
const TCG = 'https://api.pokemontcg.io/v2/cards/';
const ROLE_NAMES = { 1: 'Admin', 2: 'Klant', 3: 'Instructeur', 4: 'Pending instructeur' };

// €1 = 1000 PD (README); the pakket rows lived only in the database, so names and the tag are demo data.
const PAKKETTEN = [3000, 10000, 25000, 50000, 100000, 200000, 500000].map((pd, i) => ({
    pakket_id: i + 1, pakket_naam: `${pd.toLocaleString('nl-NL')} Pokédollars`, pokedollars: pd, prijs: pd / 1000,
    image: `${pd}.png`, tag: pd === 25000 ? 'Populair' : '',
}));

const seed = () => ({
    users: [
        { user_id: 1, voornaam: 'Admin', tussenvoegsel: '', achternaam: 'Rocket', username: 'admin.rocket', email: 'admin@poketrader.nl', wachtwoord: 'admin', role: 1, pokedollars: 0 },
        { user_id: 2, voornaam: 'Ash', tussenvoegsel: '', achternaam: 'Ketchum', username: 'ash.ketchum', email: 'ash@poketrader.nl', wachtwoord: 'klant', role: 2, pokedollars: 25000 },
    ],
    // shortcut: demo collection for the demo customer; prices are illustrative, not live market data
    mijn_kaarten: [
        { user_id: 2, kaart_id: 'base1-4', kaartnaam: 'Charizard', prijs: 350, datum_gekrijgen: '2025-12-01' },
        { user_id: 2, kaart_id: 'base1-2', kaartnaam: 'Blastoise', prijs: 120, datum_gekrijgen: '2025-12-08' },
        { user_id: 2, kaart_id: 'base1-15', kaartnaam: 'Venusaur', prijs: 95, datum_gekrijgen: '2026-01-10' },
    ],
    betalingen: [],
});

const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback(); } catch { return fallback(); } };
const db = load(DB_KEY, seed);
const S = load(SES_KEY, () => ({}));
const save = () => { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); localStorage.setItem(SES_KEY, JSON.stringify(S)); } catch { } };
const nextId = (arr, key) => arr.reduce((m, r) => Math.max(m, r[key]), 0) + 1;
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = (n, d = 0) => Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const q = new URLSearchParams(location.search);
const go = url => { location.href = url; };
const me = () => db.users.find(u => u.user_id === S.user_id);
const say = (kind, msg) => { S[kind] = msg; save(); };
const cardImg = id => { const [set, num] = id.split('-'); return `https://images.pokemontcg.io/${set}/${num}_hires.png`; };

function renderNav() {
    const u = me();
    const items = S.role === 1
        ? [['?page=veilingen', 'Veiling Beheer'], ['?page=kaarten-toevoegen', 'Kaart Toevoegen'], ['?page=pakketten-beheer', 'Pakketten Beheer'], ['?page=locatie-beheer', 'Locatie Beheer'], ['?page=userbeheer', 'Gebruiker Beheer'], ['?logout=true', 'Uitloggen']]
        : S.role === 2
            ? [['?page=home', 'Home'], ['?page=home#packages', 'Pakketten Kopen'], ['?page=veilingen', 'Veilingen'], ['?page=mijn-biedingen', 'Mijn Biedingen'], ['?page=profile', 'Mijn Profiel'], ['?logout=true', 'Uitloggen', 'logout-link']]
            : [['?page=home', 'Home'], ['?page=veilingen', 'Veilingen'], ['?page=login', 'Login / Registreren']];
    const initial = u ? h(u.username[0].toUpperCase()) : '';
    document.getElementById('nav-user').innerHTML = u
        ? `<a href="?page=profile" class="profile-btn"><div class="profile-icon">${initial}</div><span class="desktop-only">${h(u.username)}</span></a>`
        : `<a href="?page=login" class="profile-btn login-btn">Inloggen</a>`;
    document.getElementById('mySidebar').innerHTML = (u ? `<div class="sidebar-user-info"><div class="sidebar-avatar">${initial}</div>
        <div class="sidebar-details"><strong>${h(u.username)}</strong><div class="sidebar-wallet">💰 ${nl(u.pokedollars)} PD</div></div></div>` : '')
        + items.map(([url, text, cls]) => `<a href="${url}"${cls ? ` class="${cls}"` : ''}>${text}</a>`).join('');
}

function renderFlash() {
    const out = [['alert', 'WAARSCHUWING'], ['success', 'SUCCES']].filter(([k]) => S[k]).map(([k, label]) =>
        `<div class="${k}"><span onclick="this.parentElement.style.display='none'" class="close-btn">&times;</span><p>${label}: ${h(S[k])}</p></div>`).join('');
    delete S.alert; delete S.success; save();
    document.getElementById('flash').innerHTML = out;
}

const notBuilt = title => `<div class="profile-container"><div class="empty-state"><i class='bx bx-hard-hat'></i>
    <p><strong>${h(title)}</strong> is in de originele repository nog niet gebouwd.</p><a href="?page=home" class="cta-btn">Terug naar Home</a></div></div>`;

const pages = {
    home: () => `
<section id="home" class="hero gradient-bg"><div class="hero-container">
    <div class="hero-text">
        <h1 class="text-4xl font-bold mb-4">Word de Ultieme Pokémon Meester</h1>
        <p class="mb-6 text-lg">Verzamel zeldzame kaarten, bied op veilingen en bouw je droomdeck. Jouw avontuur begint hier bij PokeTrader.</p>
        <div class="flex gap-4">
            <a href="?page=veilingen" class="cta-btn bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold">Bekijk Veilingen</a>
            <a href="?page=register" class="cta-btn bg-white text-blue-800 hover:bg-gray-100 px-6 py-3 rounded-lg font-bold">Nu Registreren</a>
        </div>
    </div>
    <img src="image/pokemon_hero.png" alt="Pokemon Ruil Banner" class="hero-img">
</div></section>

<section id="daily-drop" class="split-section"><div class="split-container">
    <div class="left-panel">
        <h2 class="section-title">Dagelijkse Drop</h2>
        <div id="card-tilt-wrapper" class="card-tilt-wrapper"><div class="flip-card-scene"><div id="flip-card-inner" class="flip-card-inner">
            <div class="flip-card-front"><img src="https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg" alt="Kaart Achterkant" class="poke-img"></div>
            <div class="flip-card-back"><div class="card-glare"></div><img id="card-image" src="" alt="Pokemon Kaart" class="poke-img"></div>
        </div></div></div>
        <div id="set-info-container" class="set-info-badge fade-content"><img id="set-logo" src="" alt="Set Logo" class="set-logo-img"><span id="set-name" class="set-name-text">...</span></div>
    </div>
    <div class="right-panel"><div class="dashboard-box stats-box">
        <h4 id="card-title" class="card-name-title">Laden...</h4>
        <div id="card-stats" class="stats-grid fade-content">
            <div class="stat-row"><span class="label">Type:</span><span id="info-type" class="value type-icons-container">...</span></div>
            <div class="stat-row"><span class="label">HP:</span><span id="info-hp" class="value">...</span></div>
            <div class="stat-row"><span class="label">Zeldzaamheid:</span><span id="info-rarity" class="value">...</span></div>
            <div class="stat-row"><span class="label">Marktwaarde:</span><span id="info-price" class="value price-tag">...</span></div>
        </div>
    </div></div>
</div></section>

<section id="packages" class="packages-section">
    <div class="section-header"><h2 class="text-3xl font-bold">PokeStore Bundels</h2>
        <p class="section-subtitle">Koop Pokedollars en begin direct met bieden op zeldzame kaarten.</p></div>
    <div class="packages-grid">${PAKKETTEN.map(p => `
        <div class="package-card ${p.tag ? 'featured-pkg' : ''}">
            ${p.tag ? `<div class="pkg-tag">${h(p.tag)}</div>` : ''}
            <div class="pkg-image-wrapper"><img src="image/${p.image}" alt="${h(p.pakket_naam)}" class="pkg-img"></div>
            <div class="pkg-content"><h3 class="pkg-title">${h(p.pakket_naam)}</h3>
                <div class="pkg-price-row"><span class="pkg-pd">${nl(p.pokedollars)} PD</span><span class="pkg-euro">€${nl(p.prijs, 2)}</span></div>
                <a href="?page=betalen&pakket=${p.pakket_id}" class="pkg-btn">Nu Kopen</a></div>
        </div>`).join('')}
    </div>
</section>

<footer id="footer" class="footer bg-gray-800 text-white py-12"><div class="footer-container max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
    <div class="footer-col"><h3 class="text-xl font-bold mb-4">PokeTrader</h3><p class="text-gray-400">Het nummer 1 platform voor het kopen, verkopen en ruilen.</p></div>
    <div class="footer-col"><h4 class="text-lg font-bold mb-4">Snelle links</h4><ul class="text-gray-400 space-y-2"><li><a href="#home">Home</a></li><li><a href="?page=veilingen">Veilingen</a></li></ul></div>
    <div class="footer-col"><h4 class="text-lg font-bold mb-4">Contact</h4><p class="text-gray-400">support@poketrader.nl</p></div>
</div></footer>`,

    login: () => `<div class="login-content"><form id="login"><div class="login">
        <h1>Email:</h1><input type="email" placeholder="user@gmail.com" name="email" required>
        <h1>Password:</h1><input type="password" placeholder="password" name="password" required>
        <p>Don't have an account? <a href="?page=register" class="register-button">Register here</a></p>
        <small>Demo: admin@poketrader.nl / admin &middot; ash@poketrader.nl / klant</small>
        <br><button type="submit">Login</button><br>
    </div></form></div>`,

    register: () => {
        const old = k => h(S.old?.[k]);
        const html = `<div class="login-content"><form id="register" novalidate><div class="login">
            <label>Voornaam</label><input type="text" name="nickname" value="${old('nickname')}" required>
            <label>Tussenvoegsel</label><input type="text" name="infix" value="${old('infix')}">
            <label>Achternaam</label><input type="text" name="lastname" value="${old('lastname')}" required>
            <label>Postcode</label><input name="postcode" type="text" required>
            <label>Huis Nummer</label><input name="housenumber" type="text" required>
            <label>Telefoonnummer</label><input name="tele" type="text" required>
            <label>Email</label><input name="email" type="email" value="${old('email')}" required>
            <label>Wachtwoord</label><input name="password" type="password" required>
            <label>Herhaal Wachtwoord</label><input name="passwordconfrim" type="password" required>
            ${S.notification ? `<div class="alert">${h(S.notification)}</div>` : ''}
            <button type="submit">Aanmelden</button>
        </div></form></div>`;
        delete S.notification; delete S.old; save();
        return html;
    },

    betalen: () => {
        const p = PAKKETTEN.find(p => p.pakket_id == q.get('pakket'));
        if (!p) return notBuilt('Dit pakket');
        if (!S.user_id) return say('alert', 'Log in om Pokedollars te kopen.'), go('?page=login');
        return `<div class="login-content"><form id="betalen"><div class="login">
            <h1>${h(p.pakket_naam)}</h1>
            <p>${nl(p.pokedollars)} PD voor €${nl(p.prijs, 2)}</p>
            <p><small>Demo: er wordt niets afgeschreven, de Pokedollars worden direct bijgeschreven.</small></p>
            <button type="submit">Bevestigen</button>
        </div></form></div>`;
    },

    profile: () => {
        const u = me(), tab = ['gegevens', 'kaarten', 'wallet'].includes(q.get('tab')) ? q.get('tab') : 'gegevens';
        const tabLink = (t, icon, label) => `<a href="?page=profile&tab=${t}" class="tab ${tab === t ? 'active' : ''}"><i class='bx ${icon}'></i> ${label}</a>`;
        return `<div class="profile-container">
            <div class="profile-header"><h1>Mijn Profiel</h1><div class="profile-welcome"><p>Welkom, <strong>${h(u.voornaam + ' ' + u.achternaam)}</strong></p></div></div>
            <div class="profile-tabs">${tabLink('gegevens', 'bx-user', 'Mijn Gegevens')}${tabLink('kaarten', 'bx-collection', 'Mijn Kaarten')}${tabLink('wallet', 'bx-wallet', 'Mijn Wallet')}</div>
            <div class="profile-content">${tabs[tab](u)}</div>
        </div>`;
    },

    userbeheer: () => {
        if (q.get('delete')) {
            db.users = db.users.filter(u => u.user_id != q.get('delete'));
            say('flash', 'Gebruiker verwijderd 🗑️'); return go('?page=userbeheer');
        }
        const flash = S.flash; delete S.flash; save();
        return `<div class="userbeheer">
            ${flash ? `<div class="badge">${h(flash)}</div>` : ''}
            <h2>Gebruikersbeheer</h2>
            <table><thead><tr><th>Naam</th><th>E-mail</th><th>Rol</th><th>Acties</th></tr></thead><tbody>
            ${db.users.map(r => `<tr><td>${h([r.voornaam, r.tussenvoegsel, r.achternaam].filter(Boolean).join(' '))}</td><td>${h(r.email)}</td>
                <td>${ROLE_NAMES[r.role] ?? 'Onbekend'}</td>
                <td><a class="cta-btn edit" href="#" data-user="${r.user_id}">Bewerken</a>
                    <a class="cta-btn delete" href="?page=userbeheer&delete=${r.user_id}" onclick="return confirm('Weet je het zeker?')">Verwijderen</a></td></tr>`).join('')}
            </tbody></table>
            <div id="editModal" class="modal33"><div class="modal-content33"><h3>Gebruiker bewerken</h3>
                <form id="userbeheer"><input type="hidden" name="user_id" id="edit_user_id">
                    <div class="name-row">
                        <div class="field"><label>Voornaam</label><input type="text" name="nickname" id="edit_nickname" required></div>
                        <div class="field small"><label>Tussenvoegsel</label><input type="text" name="infix" id="edit_infix"></div>
                        <div class="field"><label>Achternaam</label><input type="text" name="lastname" id="edit_lastname" required></div>
                    </div>
                    <label>E-mail</label><input type="email" name="email" id="edit_email" required>
                    <label>Rol</label><select name="role" id="edit_role">${Object.entries(ROLE_NAMES).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
                    <div class="modal-actions33"><button type="submit" class="btn33 btn33-primary">Opslaan</button>
                        <button type="button" class="btn33 btn33-outline" id="closeModal">Annuleren</button></div>
                </form></div></div>
        </div>`;
    },
};
const NOT_BUILT = { veilingen: 'Veilingen', 'mijn-biedingen': 'Mijn Biedingen', 'kaarten-toevoegen': 'Kaart Toevoegen', 'pakketten-beheer': 'Pakketten Beheer', 'locatie-beheer': 'Locatie Beheer', 'i-register': 'Instructeur registratie' };
const ACCESS = { profile: [1, 2], userbeheer: [1] };

const tabs = {
    gegevens: u => `<div class="profile-gegevens"><h2>Mijn Gegevens</h2>
        <div class="profile-section"><h3>Persoonlijke Informatie</h3><form id="update_profile" class="profile-form">
            <div class="form-group"><label>Voornaam *</label><input type="text" name="voornaam" value="${h(u.voornaam)}" required></div>
            <div class="form-group"><label>Tussenvoegsel</label><input type="text" name="tussenvoegsel" value="${h(u.tussenvoegsel)}"></div>
            <div class="form-group"><label>Achternaam *</label><input type="text" name="achternaam" value="${h(u.achternaam)}" required></div>
            <div class="form-group"><label>E-mail *</label><input type="email" name="email" value="${h(u.email)}" required></div>
            <div class="form-group"><label>Gebruikersnaam</label><input type="text" value="${h(u.username)}" disabled><small>Gebruikersnaam kan niet worden gewijzigd</small></div>
            <button type="submit" class="btn33 btn33-primary">Opslaan</button></form></div>
        <div class="profile-section"><h3>Wachtwoord Wijzigen</h3><form id="update_password" class="profile-form">
            <div class="form-group"><label>Huidig Wachtwoord *</label><input type="password" name="current_password" required></div>
            <div class="form-group"><label>Nieuw Wachtwoord *</label><input type="password" name="new_password" required></div>
            <div class="form-group"><label>Bevestig Nieuw Wachtwoord *</label><input type="password" name="confirm_password" required></div>
            <button type="submit" class="btn33 btn33-primary">Wachtwoord Wijzigen</button></form></div>
    </div>`,

    kaarten: u => {
        const kaarten = db.mijn_kaarten.filter(k => k.user_id === u.user_id).sort((a, b) => b.datum_gekrijgen.localeCompare(a.datum_gekrijgen));
        return `<div class="profile-kaarten"><h2>Mijn Kaarten</h2>${!kaarten.length
            ? `<div class="empty-state"><i class='bx bx-collection'></i><p>Je hebt nog geen kaarten verzameld.</p><a href="?page=veilingen" class="cta-btn">Bekijk Veilingen</a></div>`
            : `<div class="kaarten-stats">
                <div class="stat-card"><span class="stat-number">${kaarten.length}</span><span class="stat-label">Totaal Kaarten</span></div>
                <div class="stat-card"><span class="stat-number">€${kaarten.reduce((t, k) => t + k.prijs, 0).toFixed(2)}</span><span class="stat-label">Totale Waarde</span></div></div>
               <div class="kaarten-grid">${kaarten.map(k => `<div class="kaart-card">
                   <div class="kaart-image"><img src="${cardImg(k.kaart_id)}" alt="${h(k.kaartnaam)}" loading="lazy" onerror="this.src='image/pokemon_hero.png'"></div>
                   <div class="kaart-info"><h3>${h(k.kaartnaam)}</h3><p class="kaart-id">ID: ${h(k.kaart_id)}</p><p class="kaart-prijs">€${k.prijs.toFixed(2)}</p>
                       <p class="kaart-datum">Verkregen: ${new Date(k.datum_gekrijgen).toLocaleDateString('nl-NL')}</p></div></div>`).join('')}</div>`}</div>`;
    },

    wallet: u => {
        const trans = db.betalingen.filter(b => b.user_id === u.user_id).slice(-10).reverse();
        return `<div class="profile-wallet"><h2>Mijn Wallet</h2>
            <div class="wallet-overview">
                <div class="wallet-card"><div class="wallet-icon"><i class='bx bx-wallet'></i></div>
                    <div class="wallet-info"><h3>Pokedollars</h3><p class="wallet-amount">${nl(u.pokedollars)} PD</p></div></div>
                <div class="wallet-actions"><a href="?page=home#packages" class="cta-btn"><i class='bx bx-plus'></i> Pokedollars Kopen</a></div>
            </div>
            <div class="transactie-historie"><h3>Transactie Geschiedenis</h3>${!trans.length
                ? `<div class="empty-state"><i class='bx bx-history'></i><p>Nog geen transacties.</p><a href="?page=home#packages" class="cta-btn">Koop Pokedollars</a></div>`
                : `<table class="transactie-table"><thead><tr><th>Datum</th><th>Type</th><th>Bedrag</th><th>Pokedollars</th><th>Status</th></tr></thead><tbody>
                    ${trans.map(t => `<tr><td>${new Date(t.datum).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}</td><td>Pakket Aankoop</td>
                        <td>€${t.prijs.toFixed(2)}</td><td>${nl(t.pokedollars)} PD</td><td><span class="status active">Actief</span></td></tr>`).join('')}</tbody></table>`}
            </div></div>`;
    },
};

const forms = {
    login(f) {
        const u = db.users.find(u => u.email === f.email.trim());
        if (!f.email || !f.password) return say('alert', 'Email and password are required.'), go('?page=login');
        if (!u || u.wachtwoord !== f.password) return say('alert', 'E-mailadres of wachtwoord onjuist! Probeer het opnieuw.'), go('?page=login');
        Object.assign(S, { role: u.role, user_id: u.user_id, username: u.username });
        say('success', 'inloggen succesvol'); go('?page=home');
    },
    register(f) {
        const old = { nickname: f.nickname.trim(), infix: f.infix.trim(), lastname: f.lastname.trim(), email: f.email.trim() };
        const back = msg => { Object.assign(S, { notification: msg, old }); save(); go('?page=register'); };
        if (!old.nickname || !old.lastname || !old.email || !f.password || !f.passwordconfrim) return back('Vul alle verplichte velden in.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(old.email)) return back('Vul een geldig e mailadres in.');
        if (f.password !== f.passwordconfrim) return back('Wachtwoorden komen niet overeen.');
        if (db.users.some(u => u.email === old.email)) return back('Dit e mailadres is al geregistreerd.');
        let username = `${old.nickname}.${old.lastname}`.toLowerCase(), n = 1;
        while (db.users.some(u => u.username === username)) username = `${old.nickname}.${old.lastname}${n++}`.toLowerCase();
        db.users.push({ user_id: nextId(db.users, 'user_id'), voornaam: old.nickname, tussenvoegsel: old.infix, achternaam: old.lastname, username, email: old.email, wachtwoord: f.password, role: 2, pokedollars: 0 });
        say('success', 'Account is succesvol aangemaakt. Je kunt nu inloggen.'); go('?page=login');
    },
    betalen() {
        const p = PAKKETTEN.find(p => p.pakket_id == q.get('pakket')), u = me();
        u.pokedollars += p.pokedollars;
        db.betalingen.push({ user_id: u.user_id, pakket_id: p.pakket_id, prijs: p.prijs, pokedollars: p.pokedollars, datum: Date.now() });
        say('success', `${nl(p.pokedollars)} PD bijgeschreven!`); go('?page=profile&tab=wallet');
    },
    update_profile(f) {
        if (!f.voornaam.trim() || !f.achternaam.trim() || !f.email.trim()) return say('alert', 'Vul alle verplichte velden in.'), go('?page=profile&tab=gegevens');
        Object.assign(me(), { voornaam: f.voornaam.trim(), tussenvoegsel: f.tussenvoegsel.trim(), achternaam: f.achternaam.trim(), email: f.email.trim() });
        say('success', 'Profiel bijgewerkt!'); go('?page=profile&tab=gegevens');
    },
    update_password(f) {
        const u = me();
        if (f.new_password !== f.confirm_password) say('alert', 'Nieuwe wachtwoorden komen niet overeen.');
        else if (u.wachtwoord !== f.current_password) say('alert', 'Huidig wachtwoord is onjuist.');
        else { u.wachtwoord = f.new_password; say('success', 'Wachtwoord bijgewerkt!'); }
        go('?page=profile&tab=gegevens');
    },
    userbeheer(f) {
        const u = db.users.find(u => u.user_id == f.user_id);
        if (u && f.nickname.trim() && f.email.trim()) {
            Object.assign(u, { voornaam: f.nickname.trim(), tussenvoegsel: f.infix.trim(), achternaam: f.lastname.trim(), email: f.email.trim(), role: +f.role });
            S.flash = 'Gebruiker bijgewerkt ✅';
            if (u.user_id === S.user_id) S.role = u.role;
        } else S.flash = 'Fout bij het bewerken 🚫';
        save(); go('?page=userbeheer');
    },
};

// --- Dagelijkse Drop (same card list, tilt effect and cache as the original home page) ---
const TYPE_ICONS = {
    Colorless: 'a/ae/Normal_icon.png/30px-Normal_icon.png', Darkness: '3/33/Dark_icon.png/30px-Dark_icon.png', Dragon: '9/91/Dragon_icon.png/30px-Dragon_icon.png',
    Fairy: '5/5a/Fairy_icon.png/30px-Fairy_icon.png', Fighting: '7/7d/Fighting_icon.png/30px-Fighting_icon.png', Fire: '5/5e/Fire_icon.png/30px-Fire_icon.png',
    Grass: 'c/cb/Grass_icon.png/30px-Grass_icon.png', Lightning: 'a/af/Electric_icon.png/30px-Electric_icon.png', Metal: 'b/b8/Steel_icon.png/30px-Steel_icon.png',
    Psychic: 'a/a6/Psychic_icon.png/30px-Psychic_icon.png', Water: '7/7f/Water_icon.png/30px-Water_icon.png',
};
const COOL_CARDS = ['base1-4', 'swsh7-215', 'xy7-98', 'sm35-10', 'sv2-269', 'swsh11-196', 'base1-2', 'base1-15', 'neo1-9', 'neo3-7',
    'sm12-226', 'swsh8-251', 'sv3-223', 'sv1-248', 'swsh9-154', 'det1-1', 'xy1-1', 'sm1-138', 'swsh4-185', 'cel25-25'];

function dailyDrop() {
    const $ = id => document.getElementById(id);
    const wrap = $('card-tilt-wrapper'), inner = $('flip-card-inner'), glare = document.querySelector('.card-glare');
    if (!wrap) return;
    wrap.addEventListener('mousemove', e => {
        if (!inner.classList.contains('is-flipped')) return;
        const r = wrap.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        inner.style.transform = `rotateY(180deg) rotateX(${((y - r.height / 2) / (r.height / 2)) * -20}deg) rotateY(${((x - r.width / 2) / (r.width / 2)) * 20}deg)`;
        glare.style.background = `radial-gradient(circle at ${x / r.width * 100}% ${y / r.height * 100}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 80%)`;
        glare.style.opacity = '1';
    });
    wrap.addEventListener('mouseleave', () => { if (inner.classList.contains('is-flipped')) { inner.style.transform = 'rotateY(180deg)'; glare.style.opacity = '0'; } });

    const now = new Date(), day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    const id = COOL_CARDS[day % COOL_CARDS.length], key = `poketrader_v10_${id}`;
    const render = c => {
        $('card-title').textContent = c.name; $('info-hp').textContent = c.hp; $('info-rarity').textContent = c.rarity; $('info-price').innerHTML = c.price;
        $('set-name').textContent = c.set.name; $('set-logo').src = c.set.logo; $('set-info-container').classList.add('visible');
        $('info-type').innerHTML = c.types.length ? c.types.map(t => TYPE_ICONS[t]
            ? `<img src="https://archives.bulbagarden.net/media/upload/thumb/${TYPE_ICONS[t]}" class="type-icon-img" alt="${h(t)}">` : h(t) + ' ').join('') : 'Trainer';
        $('card-image').src = c.image; $('card-stats').classList.add('visible');
        setTimeout(() => inner.classList.add('is-flipped'), 100);
    };
    try { const cached = JSON.parse(localStorage.getItem(key)); if (cached) return render(cached); } catch { }
    fetch(TCG + id).then(r => r.json()).then(({ data: card }) => {
        const p = card.tcgplayer?.prices, pObj = p && (p.holofoil || p.normal || p.unlimited);
        const price = pObj?.market
            ? `<span style="color:#a0aec0; font-size:0.9em">$${pObj.market.toFixed(2)}</span> <span style="color:#4a5568; margin:0 5px">•</span> <span style="color:#48bb78; font-weight:bold; font-size:1.1em">${Math.round(pObj.market * 1000).toLocaleString('nl-NL')} PD</span>`
            : 'N/B';
        const data = { name: card.name, image: card.images.small, rarity: card.rarity || 'Promo', hp: card.hp || '-', types: card.types || [], price,
            set: { name: card.set.name, logo: card.set.images.symbol || card.set.images.logo } };
        try { localStorage.setItem(key, JSON.stringify(data)); } catch { }
        render(data);
    }).catch(() => { $('card-title').textContent = 'Kaart kon niet geladen worden'; });
}

function render() {
    if (q.has('logout')) { for (const k in S) delete S[k]; save(); return go('?page=home'); }
    const page = q.get('page') || 'home';
    if (ACCESS[page] && !ACCESS[page].includes(S.role)) return go(S.user_id ? '?page=home' : '?page=login');
    const html = NOT_BUILT[page] ? notBuilt(NOT_BUILT[page]) : (pages[page] || pages.home)();
    if (html === undefined) return; // page redirected
    renderNav(); renderFlash();
    document.getElementById('page').innerHTML = html;
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
    dailyDrop();

    document.querySelectorAll('#page form[id]').forEach(el => el.addEventListener('submit', e => {
        e.preventDefault();
        forms[el.id]?.(Object.fromEntries(new FormData(el)), el);
    }));
    const modal = document.getElementById('editModal');
    if (modal) {
        document.querySelectorAll('.cta-btn.edit').forEach(btn => btn.addEventListener('click', e => {
            e.preventDefault();
            const u = db.users.find(u => u.user_id == btn.dataset.user);
            Object.entries({ user_id: u.user_id, nickname: u.voornaam, infix: u.tussenvoegsel, lastname: u.achternaam, email: u.email, role: u.role })
                .forEach(([k, v]) => { document.getElementById('edit_' + k).value = v ?? ''; });
            modal.classList.add('show');
        }));
        document.getElementById('closeModal').addEventListener('click', () => modal.classList.remove('show'));
        window.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
    }
}
render();
