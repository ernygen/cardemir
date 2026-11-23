// Static replica of DiVo: MySQL + $_SESSION are replaced by localStorage. Votes are kept as
// per-candidate tallies (same numbers the PHP telling reads), so the seeder can add 100k rows.
const DB_KEY = 'divo-db-v1', SES_KEY = 'divo-session-v1';
const DEMO_BSN = '987654321';

const seed = () => ({
    partijen: SEED.partijen.map(p => ({ ...p })),
    leden: SEED.leden.map(l => ({ ...l })),
    beheerders: SEED.beheerders,
    // shortcut: seed planning is kept, but the demo starts manually "open" so voting always works
    stemperiode: { start_moment: SEED.stemperiode[0], eind_moment: SEED.stemperiode[1], handmatig: 'open' },
    gestemd: [], totaal: 0, tally: { 1: {}, 2: {}, 3: {} },
});
const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback(); } catch { return fallback(); } };
const db = load(DB_KEY, seed);
const S = load(SES_KEY, () => ({}));
function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); localStorage.setItem(SES_KEY, JSON.stringify(S)); }
    catch { alert('Opslag vol: kies een kleiner logo.'); }
}
const nextId = (arr, key) => arr.reduce((m, r) => Math.max(m, r[key]), 0) + 1;
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl = n => Number(n).toLocaleString('nl-NL');
const q = new URLSearchParams(location.search);
const go = url => { location.href = url; };
const isAdmin = () => S.role === 2;
const partij = id => db.partijen.find(p => p.partij_id == id);
const lid = id => db.leden.find(l => l.lid_id == id);
const sortedPartijen = () => db.partijen.slice().sort((a, b) => a.partij_positie - b.partij_positie || a.partij_id - b.partij_id);
const ledenVan = pid => db.leden.filter(l => l.partij_id == pid).sort((a, b) => a.lid_positie - b.lid_positie || a.lid_id - b.lid_id);
const pad = n => String(n).padStart(2, '0');
const dbDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const nlDate = s => s ? `${s.slice(8, 10)}-${s.slice(5, 7)}-${s.slice(0, 4)} ${s.slice(11, 16)}` : '';
const fileToData = file => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });

function stemmingIsOpen() {
    const p = db.stemperiode;
    if (p.handmatig === 'open') return true;
    if (p.handmatig === 'dicht') return false;
    const nu = dbDate(new Date());
    return nu >= p.start_moment && nu <= p.eind_moment;
}

// --- helpers.inc.php ports ---
const VAST = { D66: '#00CD67', VVD: '#3A5FCD', PRO: '#DD2132', PVV: '#00008B', CDA: '#008B00', JA21: '#756699', FvD: '#A71C20', BBB: '#94C11F',
    DENK: '#22EEFF', SGP: '#EE7C10', PvdD: '#006B2D', CU: '#00A7EB', SP: '#8B0000', '50PLUS': '#92107D', Volt: '#730880' };
const crc32 = s => { let c, crc = -1; for (const b of new TextEncoder().encode(s)) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ -1) >>> 0; };
const hexRgb = hx => { const m = /^#?([0-9a-f]{6})$/i.exec(hx); return m ? [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)) : null; };
const tooClose = (hx, list) => { const a = hexRgb(hx); return list.some(o => { const b = hexRgb(o); return b && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 70; }); };
function hslHex(hh, s, l) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map(v => pad(Math.round((v + m) * 255).toString(16))).join('');
}
function partijKleur(afk, vermijd) {
    if (VAST[afk]) return VAST[afk];
    const genomen = Object.values(VAST).concat(vermijd);
    let hue = crc32(afk.trim().toLowerCase()) % 360, hx;
    for (let i = 0; i < 12; i++) { hx = hslHex(hue, 68, 45); if (!tooClose(hx, genomen)) return hx; hue = (hue + 47) % 360; }
    return hx;
}
function allePartijKleuren() {
    const uit = {}, genomen = [];
    for (const p of sortedPartijen()) { uit[p.afkorting] = partijKleur(p.afkorting, genomen); genomen.push(uit[p.afkorting]); }
    return uit;
}
// logo_bg_color: most frequent opaque colour on 8 border samples (browser canvas instead of GD)
function logoBg(src) {
    return new Promise(res => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas'), w = c.width = img.naturalWidth, hh = c.height = img.naturalHeight, ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const freq = {};
            for (const [x, y] of [[2, 2], [w - 3, 2], [2, hh - 3], [w - 3, hh - 3], [w >> 1, 2], [w >> 1, hh - 3], [2, hh >> 1], [w - 3, hh >> 1]]) {
                if (x < 0 || y < 0 || x >= w || y >= hh) continue;
                const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
                if (a < 155) continue;
                const hx = r > 245 && g > 245 && b > 245 ? '#ffffff' : '#' + [r, g, b].map(v => pad(v.toString(16))).join('');
                freq[hx] = (freq[hx] || 0) + 1;
            }
            res(Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0] || '#ffffff');
        };
        img.onerror = () => res('#ffffff');
        img.src = src;
    });
}

// --- volgorde (PHP/volgorde_herstellen.php, partij_volgorde.php, kandidaat_volgorde.php) ---
function herstelVolgorde() {
    sortedPartijen().forEach((p, i) => { p.partij_positie = i + 1; });
    for (const p of db.partijen) ledenVan(p.partij_id).forEach((l, i) => { l.lid_positie = i + 1; });
}
function verplaatsPartij(id, positie) {
    const ids = sortedPartijen().map(p => p.partij_id).filter(x => x !== id);
    if (positie < 1 || positie > ids.length + 1) throw new Error(`Kies een positie tussen 1 en ${ids.length + 1}.`);
    ids.splice(positie - 1, 0, id);
    ids.forEach((pid, i) => { partij(pid).partij_positie = i + 1; });
}
function verplaatsKandidaat(lidId, partijId, positie) {
    if (!partij(partijId)) throw new Error('Kies een bestaande partij.');
    const lijst = ledenVan(partijId).filter(l => l.lid_id !== lidId);
    if (positie < 1 || positie > lijst.length + 1) throw new Error(`Kies een positie tussen 1 en ${lijst.length + 1}.`);
    const k = lid(lidId), oud = k.partij_id;
    lijst.splice(positie - 1, 0, k);
    k.partij_id = partijId;
    lijst.forEach((l, i) => { l.lid_positie = i + 1; });
    if (oud && oud !== partijId) ledenVan(oud).forEach((l, i) => { l.lid_positie = i + 1; });
}
const stemmenOp = id => [1, 2, 3].reduce((t, k) => t + (db.tally[k][id] || 0), 0);

// --- layout ---
const logoImg = (p, alt = '') => p?.logo ? `<img src="${h(p.logo)}" alt="${h(alt)}">` : '';
function renderNav() {
    const logo = `<a href="?page=home" class="navbar-logo"><img src="image/logo%20(1).svg" alt="Tweede Kamer Logo"></a>`;
    document.getElementById('nav').innerHTML = isAdmin()
        ? `<header class="admin-header navbar-invert"><div class="navbar-inner">${logo}<nav class="admin-nav">
            <a href="?page=partijbeheer">Partijen Beheren</a><a href="?page=kandidaatbeheer">Kandidaten</a><a href="?page=stemperiode">Stemperiode</a>
            <a href="?page=stemmen_seeder">Seeder</a><a href="?page=uitslag">Telling</a><a href="?logout=1">Uitloggen</a></nav></div></header>`
        : S.bsn
            ? `<header class="admin-header navbar-invert"><div class="navbar-inner">${logo}<nav class="admin-nav"><a href="?page=stempagina">Stemmen</a><a href="?logout=1">Uitloggen</a></nav></div></header>`
            : `<header class="site-navbar navbar-invert"><div class="navbar-inner">${logo}<a href="?page=adminlogin" class="admin-login-btn">Admin</a></div></header>`;
}
function renderFlash() {
    let out = '';
    if (S.alert) out += `<div class="alert alert-danger"><p>${h(S.alert)}</p><button class="toast-close" onclick="this.parentElement.remove()" aria-label="Sluiten">&times;</button></div>`;
    if (S.success) out += `<div class="toast" role="status" aria-live="polite"><div class="toast-icon"><i class='bx bx-check'></i></div>
        <div class="toast-body"><strong>${h(S.success)}</strong><span>Succesvol ingelogd</span></div>
        <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Sluiten">&times;</button></div>`;
    delete S.alert; delete S.success; save();
    document.getElementById('flash').innerHTML = out;
}
const say = (kind, msg) => { S[kind] = msg; save(); };

// --- stemflow ---
function keuzeData(id) {
    const l = lid(id), p = l && partij(l.partij_id);
    if (!l || !p) return null;
    return { partij: p.partij_naam, p, naam: `${l.achternaam}, ${l.voornaam}${l.tussenvoegsels ? ' ' + l.tussenvoegsels : ''}`, woonplaats: l.woonplaats, geslacht: l.geslacht };
}
const sex = g => g === 'Man' ? 'M' : 'V';
const actie = (name, label, cls = 'btn-verander') => `<form data-actie="${name}" style="margin:0;"><button type="submit" class="${cls}">${label}</button></form>`;
const controleRij = (label, k, act) => k
    ? `<div class="controle-rij"><div class="controle-rij-logo" style="background: ${h(k.p.bg)};">${logoImg(k.p)}</div>
        <div class="controle-rij-content"><span class="controle-rij-label">${label}</span><div class="controle-rij-partij">${h(k.partij)}</div>
        <div class="controle-rij-details"><span class="controle-rij-naam">${h(k.naam)}</span><span class="controle-rij-sep">&bull;</span>
        <span class="controle-rij-info">(${sex(k.geslacht)})</span><span class="controle-rij-sep">&bull;</span><span class="controle-rij-info">${h(k.woonplaats)}</span></div></div>
        ${act ? actie(act, 'Verander') : ''}</div>`
    : `<div class="controle-rij"><div class="controle-rij-logo controle-rij-logo-blank">?</div>
        <div class="controle-rij-content"><span class="controle-rij-label">${label}</span><div class="controle-rij-partij">Blanco</div></div>${act ? actie(act, 'Verander') : ''}</div>`;
const partijGrid = (act, gekozen = []) => `<form data-actie="${act}"><div class="partij-grid">
    ${sortedPartijen().filter(p => ledenVan(p.partij_id).length).map(p => {
        const dis = gekozen.includes(p.partij_id);
        return `<button type="submit" name="partij_id" value="${p.partij_id}" class="partij-tile${dis ? ' is-gekozen' : ''}"${dis ? ' disabled' : ''}>
            <div class="partij-logo-box" style="background: ${h(p.bg)};">${dis ? '<span class="partij-gekozen-label">Gekozen</span>' : ''}${p.logo ? logoImg(p, p.partij_naam) : '<span class="logo-placeholder">Logo</span>'}</div>
            <span class="partij-tile-naam">${h(p.partij_naam)}</span></button>`;
    }).join('')}</div></form>`;
function kandidaatLijst(nr, pid, uitsluiten, extra = '') {
    const p = partij(pid), leden = ledenVan(pid).filter(l => !uitsluiten.includes(l.lid_id));
    return `<div class="kandidaat-top"><div class="kandidaat-header-logo" style="background: ${h(p?.bg)};">${logoImg(p)}</div>
        <div class="kandidaat-header-naam">${h(p?.partij_naam)}</div></div>
        <div class="kandidaat-kees-label">Kies een kandidaat</div>
        <form data-actie="kandidaat_${nr}" class="kandidaatForm"><div class="kandidaat-list">
        ${leden.map((l, i) => `<label class="kandidaat-row" data-lid="${l.lid_id}"><span class="kandidaat-radio">${i + 1}</span>
            <input type="radio" name="lid_id" value="${l.lid_id}" style="display:none;"><div class="kandidaat-info">
            <span class="kandidaat-naam">${h(l.achternaam + ', ' + l.voornaam)}</span><span class="kandidaat-woonplaats">${h(l.woonplaats)}</span>
            <span class="kandidaat-geslacht">${sex(l.geslacht)}</span></div></label>`).join('')}
        </div><div class="stemmen-nav"><div style="display: flex; gap: 10px;">
            <button type="button" class="btn-vorige" data-go="terug_partij_${nr}" style="border:none;cursor:pointer;">Andere partij</button>${extra}</div>
            <div class="stemmen-nav-right"><button type="submit" class="btn-volgende btnKies" disabled>Kies</button></div></div></form>`;
}
const overslaan = nr => `<div class="stemmen-nav" style="border-top:none; padding-top:0;"><span></span><div class="stemmen-nav-right">
    <form data-actie="overslaan_${nr}" style="display:inline;"><button type="submit" class="btn-volgende">Overslaan</button></form></div></div>`;

function stempagina() {
    if (!stemmingIsOpen()) {
        const p = db.stemperiode, nu = dbDate(new Date());
        const reden = p.handmatig === 'dicht' ? 'De stemming is gesloten door de beheerder.'
            : p.eind_moment && nu > p.eind_moment ? `De stemming is gesloten op ${nlDate(p.eind_moment)}.`
                : p.start_moment && nu < p.start_moment ? `De stemming opent op ${nlDate(p.start_moment)}.` : 'De stemming is momenteel gesloten.';
        return `<main class="stemmen-page"><h1 class="stemmen-title">Stemmen</h1><div class="keuze-sectie" style="text-align: center;">
            <p style="font-size: 1.1rem; font-weight: 600;">De stemming is <strong>gesloten</strong>.</p><p style="color: var(--ro-grijs-7);">${h(reden)}</p></div></main>`;
    }
    const blanco = S.stem_blanco === true, k1 = S.stem_kandidaat_1, k2 = S.stem_kandidaat_2, k3 = S.stem_kandidaat_3;
    const skip2 = S.stem_2_overgeslagen === true, skip3 = S.stem_3_overgeslagen === true, edit1 = S.edit_1 === true;
    const klaar1 = blanco || !!k1, klaar2 = !!k2 || skip2, klaar3 = !!k3 || skip3;
    let s1;
    if (blanco) s1 = controleRij('Eerste keuze', null, 'blanco_ongedaan');
    else if (k1 && keuzeData(k1)) s1 = controleRij('Eerste keuze', keuzeData(k1), 'bewerk_1');
    else if (S.stem_partij) s1 = kandidaatLijst(1, S.stem_partij, [k2, k3],
        edit1 ? `<button type="button" class="btn-vorige" data-go="annuleer_1" style="border:none;cursor:pointer;">Annuleren</button>` : '');
    else {
        const oud = edit1 && S.edit_1_backup?.stem_kandidaat_1 && keuzeData(S.edit_1_backup.stem_kandidaat_1);
        s1 = (oud ? `<div class="alert alert-info">Huidige keuze: <strong>${h(oud.partij)}</strong> – ${h(oud.naam)}. Kies een nieuwe partij of annuleer.</div>` : '')
            + partijGrid('partij_1')
            + (edit1 ? `<div class="stemmen-nav" style="border-top:none; padding-top:12px;"><button type="button" class="btn-vorige" data-go="annuleer_1" style="border:none;cursor:pointer;">Annuleren</button></div>` : '')
            + `<div class="blancostemmen-wrap"><form data-actie="blanco"><button type="submit" class="blancostemmen-btn">Blanco stemmen</button></form></div>`;
    }
    let out = `<main class="stemmen-page"><h1 class="stemmen-title">Stemmen</h1>
        <section class="keuze-sectie" id="keuze-1"><div class="keuze-sectie-titel"><span class="keuze-nummer">1</span> Eerste keuze</div>${s1}</section>`;
    if (!blanco && klaar1) {
        const s2 = k2 && keuzeData(k2) ? controleRij('Tweede keuze', keuzeData(k2), 'verander_2')
            : skip2 ? controleRij('Tweede keuze', null, 'verander_2')
                : S.stem_partij_2 ? kandidaatLijst(2, S.stem_partij_2, [k1, k3])
                    : `<div class="alert alert-info"><strong>Let op:</strong> Uw 2e keuze moet van een andere partij zijn dan uw 1e keuze.</div>${partijGrid('partij_2', [S.stem_partij])}${overslaan(2)}`;
        out += `<section class="keuze-sectie" id="keuze-2"><div class="keuze-sectie-titel"><span class="keuze-nummer">2</span> Tweede keuze <span class="keuze-optioneel">(optioneel)</span></div>${s2}</section>`;
    }
    if (!blanco && klaar1 && klaar2) {
        const s3 = !k2 ? controleRij('Derde keuze', null)
            : k3 && keuzeData(k3) ? controleRij('Derde keuze', keuzeData(k3), 'verander_3')
                : skip3 ? controleRij('Derde keuze', null, 'verander_3')
                    : S.stem_partij_3 ? kandidaatLijst(3, S.stem_partij_3, [k1, k2])
                        : `<div class="alert alert-info"><strong>Let op:</strong> Uw 3e keuze moet van een andere partij zijn dan uw 1e en 2e keuze.</div>${partijGrid('partij_3', [S.stem_partij, S.stem_partij_2])}${overslaan(3)}`;
        out += `<section class="keuze-sectie" id="keuze-3"><div class="keuze-sectie-titel"><span class="keuze-nummer">3</span> Derde keuze <span class="keuze-optioneel">(optioneel)</span></div>${s3}</section>`;
    }
    if (blanco || (klaar1 && klaar2 && klaar3)) out += `<form id="controleForm"><div class="akkoord-wrap">
        <label class="akkoord-check"><input type="checkbox" id="akkoordCheck" required><span>Alle stemmen zijn juist en ik geef akkoord.*</span></label>
        <button type="submit" class="btn-klaar" id="btnKlaar" disabled>Klaar</button></div></form>`;
    return out + '</main>';
}

const RESET_2 = { stem_partij_2: null, stem_kandidaat_2: null, stem_2_overgeslagen: false };
const RESET_3 = { stem_partij_3: null, stem_kandidaat_3: null, stem_3_overgeslagen: false };
const BACKUP_KEYS = ['stem_partij', 'stem_kandidaat_1', 'stem_partij_2', 'stem_kandidaat_2', 'stem_partij_3', 'stem_kandidaat_3', 'stem_2_overgeslagen', 'stem_3_overgeslagen'];
// Returns an error message, or nothing when the action was applied (stempagina_actie.php).
function stemActie(a, f) {
    if (!stemmingIsOpen()) return 'De stemming is gesloten. Uw keuze is niet opgeslagen.';
    const pid = +f.partij_id || 0, lidId = +f.lid_id || 0;
    const heeftLeden = id => ledenVan(id).length > 0, vanPartij = (l, p) => lid(l)?.partij_id == p;
    switch (a) {
        case 'blanco': Object.assign(S, { stem_blanco: true, stem_partij: null, stem_kandidaat_1: null, ...RESET_2, ...RESET_3, edit_1: false }); delete S.edit_1_backup; break;
        case 'blanco_ongedaan': S.stem_blanco = false; break;
        case 'partij_1':
            if (pid < 1) return 'Selecteer een geldige partij.';
            if (!heeftLeden(pid)) return 'Deze partij heeft geen kandidaten.';
            if (S.edit_1) {
                const conflict = [];
                if (S.stem_partij_2 && pid == S.stem_partij_2) { Object.assign(S, RESET_2); conflict.push('2e keuze'); }
                if (S.stem_partij_3 && pid == S.stem_partij_3) { Object.assign(S, RESET_3); conflict.push('3e keuze'); }
                Object.assign(S, { stem_partij: pid, stem_blanco: false, stem_kandidaat_1: null });
                if (conflict.length) S.alert = `Let op: uw ${conflict.join(' en ')} was van dezelfde partij en is gewist.`;
            } else Object.assign(S, { stem_partij: pid, stem_blanco: false, stem_kandidaat_1: null, ...RESET_2, ...RESET_3 });
            break;
        case 'kandidaat_1':
            if (!S.stem_partij) return 'Kies eerst een partij.';
            if (lidId < 1) return 'Selecteer een geldige kandidaat.';
            if (!vanPartij(lidId, S.stem_partij)) return 'Deze kandidaat hoort niet bij de gekozen partij.';
            if (S.stem_kandidaat_2 == lidId) return 'Deze kandidaat is al gekozen als 2e keuze.';
            if (S.stem_kandidaat_3 == lidId) return 'Deze kandidaat is al gekozen als 3e keuze.';
            Object.assign(S, { stem_kandidaat_1: lidId, edit_1: false }); delete S.edit_1_backup; break;
        case 'bewerk_1':
            S.edit_1_backup = Object.fromEntries(BACKUP_KEYS.map(k => [k, S[k] ?? null]));
            Object.assign(S, { stem_partij: null, stem_kandidaat_1: null, edit_1: true }); break;
        case 'annuleer_1':
            if (S.edit_1_backup) { Object.assign(S, S.edit_1_backup); delete S.edit_1_backup; }
            S.edit_1 = false; break;
        case 'terug_partij_1': Object.assign(S, { stem_partij: null, stem_kandidaat_1: null }); break;
        case 'partij_2':
            if (pid < 1) return 'Selecteer een geldige partij.';
            if (pid == S.stem_partij) return 'Uw 2e keuze moet van een andere partij zijn dan uw 1e keuze.';
            if (!heeftLeden(pid)) return 'Deze partij heeft geen kandidaten.';
            if (S.stem_partij_3 == pid) Object.assign(S, RESET_3);
            Object.assign(S, { ...RESET_2, stem_partij_2: pid }); break;
        case 'kandidaat_2':
            if (!S.stem_partij_2) return 'Kies eerst een partij voor uw 2e keuze.';
            if (lidId < 1) return 'Selecteer een geldige kandidaat.';
            if (!vanPartij(lidId, S.stem_partij_2)) return 'Deze kandidaat hoort niet bij de gekozen partij.';
            if (S.stem_kandidaat_1 == lidId) return 'Deze kandidaat is al gekozen als 1e keuze.';
            if (S.stem_kandidaat_3 == lidId) return 'Deze kandidaat is al gekozen als 3e keuze.';
            Object.assign(S, { stem_kandidaat_2: lidId, stem_2_overgeslagen: false }); break;
        case 'overslaan_2': Object.assign(S, RESET_2, RESET_3, { stem_2_overgeslagen: true, stem_3_overgeslagen: true }); break;
        case 'verander_2': case 'terug_partij_2': Object.assign(S, RESET_2); break;
        case 'partij_3':
            if (!S.stem_kandidaat_2) return 'Vul eerst een 2e keuze in voordat u een 3e keuze kiest.';
            if (pid < 1) return 'Selecteer een geldige partij.';
            if (pid == S.stem_partij) return 'Uw 3e keuze moet van een andere partij zijn dan uw 1e keuze.';
            if (S.stem_partij_2 && pid == S.stem_partij_2) return 'Uw 3e keuze moet van een andere partij zijn dan uw 2e keuze.';
            if (!heeftLeden(pid)) return 'Deze partij heeft geen kandidaten.';
            Object.assign(S, { ...RESET_3, stem_partij_3: pid }); break;
        case 'kandidaat_3':
            if (!S.stem_kandidaat_2) return 'Vul eerst een 2e keuze in voordat u een 3e keuze kiest.';
            if (!S.stem_partij_3) return 'Kies eerst een partij voor uw 3e keuze.';
            if (lidId < 1) return 'Selecteer een geldige kandidaat.';
            if (!vanPartij(lidId, S.stem_partij_3)) return 'Deze kandidaat hoort niet bij de gekozen partij.';
            if (S.stem_kandidaat_1 == lidId) return 'Deze kandidaat is al gekozen als 1e keuze.';
            if (S.stem_kandidaat_2 == lidId) return 'Deze kandidaat is al gekozen als 2e keuze.';
            Object.assign(S, { stem_kandidaat_3: lidId, stem_3_overgeslagen: false }); break;
        case 'overslaan_3': Object.assign(S, RESET_3, { stem_3_overgeslagen: true }); break;
        case 'verander_3':
            if (!S.stem_kandidaat_2) return 'Vul eerst een 2e keuze in voordat u een 3e keuze kiest.';
            Object.assign(S, RESET_3); break;
        case 'terug_partij_3': Object.assign(S, RESET_3); break;
        default: return 'Onbekende actie.';
    }
}

function stemBevestig() {
    if (!S.stem_partij && !S.stem_blanco) return say('alert', 'U heeft geen geldige keuze gemaakt.'), go('?page=stempagina');
    if (!stemmingIsOpen()) return say('alert', 'De stemming is gesloten. Uw stem is niet opgeslagen.'), go('?page=stempagina');
    const blanco = S.stem_blanco === true, k1 = blanco ? null : +S.stem_kandidaat_1 || 0;
    if (!blanco && k1 < 1) return say('alert', 'U heeft geen kandidaat geselecteerd.'), go('?page=stempagina');
    const k2 = +S.stem_kandidaat_2 || null;
    let k3 = +S.stem_kandidaat_3 || null;
    if (k3 && !k2) return say('alert', 'Zonder 2e keuze kunt u geen 3e keuze opslaan.'), go('?page=stempagina');
    if (k3) {
        const p3 = lid(k3)?.partij_id;
        if (p3 && (p3 === lid(k1)?.partij_id || p3 === lid(k2)?.partij_id)) { k3 = null; S.alert = 'Uw 3e keuze was van dezelfde partij als uw 1e of 2e keuze en is daarom verwijderd.'; }
    }
    if (db.gestemd.includes(S.bsn)) return say('alert', 'Met dit BSN is al gestemd. U kunt niet opnieuw stemmen.'), go('?page=login');
    db.gestemd.push(S.bsn);
    [k1, k2, k3].forEach((k, i) => { const key = k ?? 'blanco'; db.tally[i + 1][key] = (db.tally[i + 1][key] || 0) + 1; });
    db.totaal++;
    BACKUP_KEYS.concat('stem_blanco').forEach(k => delete S[k]);
    say('success', 'Uw stem is succesvol opgeslagen!'); go('?page=stemmen_bedankt');
}

// --- pagina's ---
const kandidaatForm = (k = {}) => {
    const today = new Date().toISOString().slice(0, 10);
    return `<div class="form-group"><label for="voornaam">Voornaam</label><input type="text" id="voornaam" name="voornaam" required value="${h(k.voornaam)}"></div>
    <div class="form-group"><label for="tussenvoegsels">Tussenvoegsels</label><input type="text" id="tussenvoegsels" name="tussenvoegsels" value="${h(k.tussenvoegsels)}"></div>
    <div class="form-group"><label for="achternaam">Achternaam</label><input type="text" id="achternaam" name="achternaam" required value="${h(k.achternaam)}"></div>
    <div class="form-group"><label for="geslacht">Geslacht</label><select id="geslacht" name="geslacht" required><option value="">Maak een keuze</option>
        ${['Man', 'Vrouw'].map(g => `<option value="${g}" ${k.geslacht === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
    <div class="form-group"><label for="woonplaats">Woonplaats</label><input type="text" id="woonplaats" name="woonplaats" required value="${h(k.woonplaats)}"></div>
    <div class="form-group"><label for="geboortedatum">Geboortedatum</label><input type="date" id="geboortedatum" name="geboortedatum" max="${today}" value="${h(k.geboortedatum)}"></div>
    <div class="form-group"><label for="lid_positie">Positie op de lijst</label><input type="number" id="lid_positie" name="lid_positie" min="1" required value="${h(k.lid_positie)}"></div>
    <div class="form-group"><label for="partij_id">Partij</label><select id="partij_id" name="partij_id" required><option value="">Maak een keuze</option>
        ${sortedPartijen().map(p => `<option value="${p.partij_id}" ${p.partij_id == k.partij_id ? 'selected' : ''}>${h(p.afkorting + ' - ' + p.partij_naam)}</option>`).join('')}</select></div>`;
};
const partijForm = (p, max) => `<div class="form-with-preview">
    <form class="form-container container-narrow" id="${p ? 'partij_bewerken' : 'partij_toevoegen'}">
        <div class="form-group"><label>Partij Naam</label><input type="text" name="partij_naam" required value="${h(p?.partij_naam)}"></div>
        <div class="form-group"><label>Afkorting</label><input type="text" name="afkorting" required value="${h(p?.afkorting)}"></div>
        <div class="form-group"><label>${p ? 'Positie (nummer in lijst)' : 'Positie'}</label><input type="number" name="partij_positie" min="1"${p ? ` max="${max}"` : ''} required value="${h(p?.partij_positie)}"></div>
        <div class="form-group"><label>${p ? 'Logo (laat leeg om huidig te behouden)' : 'Logo'}</label><input type="file" name="logo" id="logoInput" accept="image/*"></div>
        <div class="form-actions-row"><button type="submit" class="btn">${p ? 'Opslaan' : 'Toevoegen'}</button><a href="?page=partijbeheer" class="btn btn-secondary btn-inline-flex">Annuleren</a></div>
    </form>
    <div class="preview-pane"><span class="preview-label">${p ? 'Voorbeeld (homepage box)' : 'Voorbeeld'}</span>
        <div class="deelnemende-logo preview-logo" id="previewLogo" style="background: ${h(p?.bg || '#fff')};">${p?.logo ? `<img src="${h(p.logo)}" alt="logo">` : '<span class="logo-placeholder">Logo</span>'}</div></div>
</div>`;

const pages = {
    home: () => `<main>
        <section class="hero"><div class="hero-container">
            <h1 class="hero-title">Digitale Tweede Kamerverkiezingen 2021</h1>
            <p class="hero-text">Vanwege COVID-19 vinden de verkiezingen dit jaar veilig op afstand plaats. Breng op 17 april 2021 gemakkelijk uw stem uit via deze officiële website van de Rijksoverheid.</p>
            ${isAdmin() ? '' : '<a href="?page=login" class="btn">Inloggen met BSN om te stemmen</a>'}
        </div></section>
        <section class="section-container"><div class="alert alert-info"><strong>Belangrijk bericht over de kiesdrempel:</strong>
            Vanaf deze verkiezingen geldt een kiesdrempel van vijf zetels. Valt uw 1e keuze af tijdens de telling? Dan telt automatisch uw 2e of 3e keuze mee bij de hertelling.</div></section>
        <section class="section-container"><h2 class="section-title">Hoe werkt digitaal stemmen?</h2><div class="step-grid">
            <div class="step-card"><h3>1. Veilig Inloggen</h3><p>Vul uw Burgerservicenummer (BSN) in en verifieer uw identiteit veilig via de officiële DigiD app of via sms-controle.</p></div>
            <div class="step-card"><h3>2. Voorkeursstem opgeven</h3><p>Kies een persoon uit de kieslijst. U kunt een 1e, 2e en 3e keuze doorgeven. Een 2e of 3e keuze is niet verplicht. Blanco stemmen is ook mogelijk.</p></div>
            <div class="step-card"><h3>3. Bevestigen &amp; Wijzigen</h3><p>Na het indienen is uw stem geregistreerd. U heeft op 17 april tot 23:59 uur de mogelijkheid om uw uitgebrachte stem nog aan te passen.</p></div>
        </div></section></main>
        <footer class="site-footer"><div class="footer-container">
            <div class="footer-about"><h3>Rijksoverheid</h3><p>Deze website is onderdeel van de Rijksoverheid. Wij zorgen voor een gemakkelijke, correcte en veilige digitale stemming.</p></div>
            <div class="footer-links"><h4>Informatie</h4><ul><li><span>Over deze website: digitale Tweede Kamerverkiezingen voor het schoolproject DiVo.</span></li></ul></div>
        </div></footer>`,

    login: () => {
        if (isAdmin()) return say('alert', 'U bent ingelogd als beheerder. Log eerst uit voordat u met uw BSN inlogt.'), go('?page=home');
        return `<main class="login-page"><div class="login-card login-card-centered login-app-card">
            <h2 class="login-app-title"><span class="app-naam">Welkom</span></h2>
            <form id="login" class="login-form app-login-form">
                <div class="form-group"><label for="bsn">BSN Nummer</label>
                    <input type="text" id="bsn" name="bsn" placeholder="Vul uw BSN in" required pattern="[0-9]{9}" maxlength="9" title="Vul een geldig BSN in (9 cijfers)" autocomplete="off"></div>
                <p><small>Demo: gebruik bijvoorbeeld <button type="button" id="demoBsn" style="border:0;background:none;color:inherit;text-decoration:underline;cursor:pointer;padding:0;">${DEMO_BSN}</button> (of elk ander nep-nummer van 9 cijfers).</small></p>
                <div class="login-options"><div class="login-option"><div class="login-icon icon-digid"><img src="image/Logo_of_DigiD.png" alt="DigiD"></div>
                    <button type="submit" class="login-btn btn-digid">Inloggen met DigiD</button></div></div>
            </form></div></main>`;
    },

    adminlogin: () => `<main class="login-page"><div class="login-card admin-login-card">
        <h1>Admin Login</h1><p class="admin-login-sub">Alleen voor beheerders van DiVo</p>
        <form id="adminlogin" class="login-form">
            <div class="form-group"><label for="email">E-mailadres</label><input type="email" id="email" name="email" placeholder="admin@divo.nl" required autocomplete="email"></div>
            <div class="form-group"><label for="wachtwoord">Wachtwoord</label><input type="password" id="wachtwoord" name="wachtwoord" placeholder="Wachtwoord" required></div>
            <button type="submit" class="btn admin-login-btn-full">Inloggen</button>
        </form>
        <p class="admin-login-hint"><small>Demo: admin@divo.nl / admin123</small><br><a href="?page=login">Terug naar DigiD login (kiezers)</a></p>
    </div></main>`,

    stempagina: stempagina,

    stemmen_bedankt: () => `<main class="stemmen-page" style="text-align: center; padding-top: 80px;">
        <h1 class="stemmen-title">Bedankt voor uw stem!</h1>
        <p style="font-size: 1.1rem; color: var(--ro-grijs-7); max-width: 500px; margin: 0 auto 30px;">Uw stem is succesvol opgeslagen. Met dit BSN kunt u niet opnieuw stemmen.</p>
        <div style="display: flex; gap: 12px; justify-content: center;"><a href="?page=home" class="btn btn-secondary">Terug naar home</a><a href="?logout=1" class="btn">Uitloggen</a></div></main>`,

    partijbeheer: () => {
        herstelVolgorde(); save();
        return `<main class="partijbeheer-page"><div class="partijbeheer-container">
            <div class="partijbeheer-header"><h1>Partijen Beheren</h1><a href="?page=partij_toevoegen" class="btn btn-partij-toevoegen">+ Partij toevoegen</a></div>
            <div class="partijen-card table-responsive"><table class="tbl tbl-partijen">
                <thead><tr><th class="tbl-nr"></th><th class="tbl-logo"></th><th>Partij Naam</th><th>Afkorting</th><th>Kandidaten</th><th>Acties</th></tr></thead><tbody>
                ${sortedPartijen().map(p => `<tr><td><span class="positie-badge">${p.partij_positie}</span></td>
                    <td><div class="logo-box" style="background: ${h(p.bg)};">${p.logo ? `<img src="${h(p.logo)}" alt="Logo ${h(p.afkorting)}">` : '<span class="logo-placeholder">Logo</span>'}</div></td>
                    <td>${h(p.partij_naam)}</td><td>${h(p.afkorting)}</td><td>${ledenVan(p.partij_id).length}</td>
                    <td><div class="col-acties"><a href="?page=partij_bewerken&id=${p.partij_id}" class="btn-actie btn-bewerken">Bewerken</a>
                        <a href="#" data-del-partij="${p.partij_id}" class="btn-actie btn-verwijderen">Verwijderen</a></div></td></tr>`).join('') || '<tr><td colspan="6" class="partijen-empty">Geen partijen gevonden.</td></tr>'}
            </tbody></table></div></div></main>`;
    },

    partij_toevoegen: () => `<main class="partijbeheer-page"><div class="partijbeheer-container container-narrow"><h1>Partij Toevoegen</h1>${partijForm(null)}</div></main>`,

    partij_bewerken: () => {
        const p = partij(q.get('id'));
        if (!p) return say('alert', 'Partij niet gevonden.'), go('?page=partijbeheer');
        return `<main class="partijbeheer-page"><div class="partijbeheer-container container-narrow"><h1>Partij Bewerken</h1>${partijForm(p, db.partijen.length)}</div></main>`;
    },

    kandidaatbeheer: () => {
        herstelVolgorde(); save();
        const zoek = (q.get('search') || '').trim(), fp = +q.get('partij') || 0, z = zoek.toLowerCase();
        const rows = db.leden.map(l => ({ ...l, p: partij(l.partij_id) }))
            .filter(l => !z || [l.achternaam, l.voornaam, l.woonplaats, l.p?.partij_naam].some(v => v?.toLowerCase().includes(z)))
            .filter(l => !fp || l.partij_id === fp)
            .sort((a, b) => (!a.p - !b.p) || (a.p?.partij_positie ?? 0) - (b.p?.partij_positie ?? 0) || a.lid_positie - b.lid_positie || a.lid_id - b.lid_id);
        return `<main class="partijbeheer-page"><div class="partijbeheer-container container-wide">
            <div class="partijbeheer-header"><h1>Kandidaten Beheren</h1><a href="?page=kandidaat_toevoegen" class="btn btn-partij-toevoegen">+ Kandidaat toevoegen</a></div>
            <form method="get" class="kand-filterbar"><input type="hidden" name="page" value="kandidaatbeheer">
                <div class="kand-search-wrap"><input type="text" name="search" placeholder="Search" value="${h(zoek)}" class="kand-search-input">
                    <button type="submit" class="kand-search-btn" aria-label="Zoeken"><i class='bx bx-search'></i></button></div>
                <div class="kand-select-wrap"><select name="partij" onchange="this.form.submit()" class="kand-select"><option value="0">Selecteer Partij</option>
                    ${sortedPartijen().map(p => `<option value="${p.partij_id}" ${fp === p.partij_id ? 'selected' : ''}>${h(p.afkorting + ' - ' + p.partij_naam)}</option>`).join('')}</select></div>
                ${zoek || fp ? '<a href="?page=kandidaatbeheer" class="btn btn-secondary btn-sm-reset">Reset</a>' : ''}
            </form>
            <div class="partijen-card kand-card table-responsive"><table class="tbl tbl-kandidaten">
                <thead><tr><th></th><th>Achternaam, Voornaam</th><th>Partij Naam</th><th>Woonplaats</th><th>Geslacht</th><th>Geboortedatum</th><th></th></tr></thead><tbody>
                ${rows.map(k => `<tr><td><span class="positie-badge">${k.lid_positie}</span></td>
                    <td>${h(`${k.achternaam}, ${k.voornaam} ${k.tussenvoegsels}`.trim())}</td>
                    <td>${k.p ? h(k.p.partij_naam) : '<em class="text-muted">Partijloos</em>'}</td><td>${h(k.woonplaats)}</td>
                    <td>${h((k.geslacht || 'M')[0].toUpperCase())}</td><td>${k.geboortedatum ? k.geboortedatum.split('-').reverse().join('-') : '—'}</td>
                    <td><div class="k-col-acties"><a href="?page=kandidaat_aanpassen&id=${k.lid_id}" class="btn-actie btn-bewerken">Bewerken</a>
                        <a href="?page=kandidaat_verwijderen&id=${k.lid_id}" class="btn-actie btn-verwijderen">Verwijderen</a></div></td></tr>`).join('')
                    || '<tr><td colspan="7" class="partijen-empty">Geen kandidaten gevonden.</td></tr>'}
            </tbody></table></div></div></main>`;
    },

    kandidaat_toevoegen: () => `<main class="partijbeheer-page"><div class="partijbeheer-container container-narrow"><h1>Kandidaat Toevoegen</h1>
        <form id="kandidaat_toevoegen" class="form-container container-narrow">${kandidaatForm()}
        <div class="form-actions-row"><button type="submit" class="btn">Toevoegen</button><a href="?page=kandidaatbeheer" class="btn btn-secondary btn-inline-flex">Annuleren</a></div></form></div></main>`,

    kandidaat_aanpassen: () => {
        const k = lid(q.get('id'));
        if (!k) return say('alert', 'Kandidaat niet gevonden.'), go('?page=kandidaatbeheer');
        return `<main class="partijbeheer-page"><div class="partijbeheer-container container-narrow"><h1>Kandidaat Aanpassen</h1>
            <form id="kandidaat_aanpassen" class="form-container container-narrow">${kandidaatForm(k)}
            <div class="form-actions-row"><button type="submit" class="btn">Opslaan</button><a href="?page=kandidaatbeheer" class="btn btn-secondary btn-inline-flex">Annuleren</a></div></form></div></main>`;
    },

    kandidaat_verwijderen: () => {
        const k = lid(q.get('id'));
        if (!k) return say('alert', 'Kandidaat niet gevonden.'), go('?page=kandidaatbeheer');
        const n = stemmenOp(k.lid_id), naam = [k.voornaam, k.tussenvoegsels, k.achternaam].filter(Boolean).join(' ');
        return `<main class="partijbeheer-page"><div class="partijbeheer-container container-narrow"><h1>Kandidaat Verwijderen</h1>
            <p>Weet u zeker dat u deze kandidaat wilt verwijderen? Dit kan niet ongedaan worden gemaakt.</p>
            <div class="partijen-card"><p><strong>Naam:</strong> ${h(naam)}</p><p><strong>Partij:</strong> ${h(partij(k.partij_id)?.partij_naam || 'Partijloos')}</p><p><strong>Positie:</strong> ${k.lid_positie}</p></div>
            ${n > 0 ? `<div class="alert alert-danger"><p>Er zijn ${n} stemmen op deze kandidaat uitgebracht. Verwijderen is niet mogelijk.</p></div>
                <div class="form-actions-row"><a href="?page=kandidaatbeheer" class="btn btn-secondary btn-inline-flex">Terug</a></div>`
                : `<form id="kandidaat_verwijderen"><div class="form-actions-row"><button type="submit" class="btn">Ja, verwijderen</button>
                <a href="?page=kandidaatbeheer" class="btn btn-secondary btn-inline-flex">Annuleren</a></div></form>`}</div></main>`;
    },

    stemperiode: () => {
        const p = db.stemperiode, open = stemmingIsOpen();
        const reden = p.handmatig === 'open' ? 'De stemming staat handmatig open. De planning hieronder wordt genegeerd.'
            : p.handmatig === 'dicht' ? 'De stemming staat handmatig dicht. De planning hieronder wordt genegeerd.' : 'De stemming volgt de planning hieronder.';
        const veld = s => s ? s.slice(0, 16).replace(' ', 'T') : '';
        return `<main class="partijbeheer-page stemperiode-page"><div class="partijbeheer-container">
            <div class="partijbeheer-header"><h1>Stemming Openen en Sluiten</h1></div>
            <div class="partijen-card"><p class="stemperiode-status">Op dit moment is de stemming ${open ? '<strong class="stemperiode-open">OPEN</strong>' : '<strong class="stemperiode-dicht">GESLOTEN</strong>'}.</p>
                <p class="stemperiode-reden">${h(reden)}</p></div>
            <div class="partijen-card"><h2>Handmatig bedienen</h2><div class="form-actions-row">
                <button type="button" class="btn" data-periode="openen">Stemming nu openen</button>
                <button type="button" class="btn btn-secondary" data-periode="sluiten">Stemming nu sluiten</button></div></div>
            <div class="partijen-card"><h2>Planning</h2><form id="planning"><div class="stemperiode-velden">
                <div class="form-group"><label for="start_moment">Stemming gaat open op</label><input type="datetime-local" id="start_moment" name="start_moment" required value="${veld(p.start_moment)}"></div>
                <div class="form-group"><label for="eind_moment">Stemming gaat dicht op</label><input type="datetime-local" id="eind_moment" name="eind_moment" required value="${veld(p.eind_moment)}"></div>
            </div><div class="form-actions-row"><button type="submit" class="btn">Planning opslaan</button></div></form></div>
        </div></main>`;
    },

    stemmen_seeder: () => {
        const parties = sortedPartijen().map(p => ({ id: p.partij_id, naam: p.partij_naam, n: ledenVan(p.partij_id).length })).concat({ id: 'blanco', naam: 'Blanco', n: 0 });
        const input = S.stemmen_seed_invoer || {}; delete S.stemmen_seed_invoer; save();
        return `<main class="partijbeheer-page stemmen-seeder"><div class="partijbeheer-container">
            <h1>Stemmen seeder</h1>
            <p>Vul per partij het aantal stemmen voor elke keuze in. De stemmen worden willekeurig over de kandidaten van die partij verdeeld. Leeg of 0 betekent geen stemmen voor die partij.</p>
            <p>Het hoogste keuzetotaal bepaalt het aantal nieuwe stemrijen. Ontbrekende keuzes worden aangevuld als blanco. Maximaal 100000 per keuze per keer.</p>
            <p class="seeder-status">Er staan nu <strong>${db.totaal}</strong> stemrijen in de database. Toevoegen behoudt bestaande stemmen.</p>
            <form id="seed_toevoegen">
                <div class="seeder-random"><label for="randomMax">Max. per partij</label><input type="number" id="randomMax" value="20" min="0" max="100000" step="1">
                    <button type="button" class="btn btn-secondary" id="btnRandom">Willekeurig invullen</button>
                    <span class="seeder-regel">Regel: 2e keuze &le; 1e keuze, 3e keuze &le; 2e keuze (per partij).</span></div>
                <div class="table-responsive"><table><thead><tr><th>Partij</th><th>Eerste keuze</th><th>Tweede keuze</th><th>Derde keuze</th></tr></thead><tbody>
                ${parties.map(p => {
                    const geen = p.id !== 'blanco' && !p.n;
                    return `<tr class="${p.id === 'blanco' ? 'seeder-blanco' : ''}"><th scope="row">${h(p.naam)}${geen ? ' (geen kandidaten)' : ''}</th>
                        ${[1, 2, 3].map(c => `<td><input type="number" min="0" max="100000" step="1" placeholder="0" aria-label="${h(p.naam)}, keuze ${c}" name="${c}:${p.id}" value="${h(input[`${c}:${p.id}`])}"${geen ? ' disabled' : ''}></td>`).join('')}</tr>`;
                }).join('')}
                </tbody></table></div>
                <button type="submit" class="btn">Stemmen toevoegen</button>
            </form>
            <section class="seeder-verwijderen" aria-labelledby="seeder-verwijderen-titel"><h2 id="seeder-verwijderen-titel">Stemmen leegmaken</h2>
                <p>Hiermee verwijder je alle opgeslagen stemmen en de BSN-registratie, zodat iedereen opnieuw kan stemmen. Dit kan niet ongedaan worden gemaakt.</p>
                <form id="seed_leegmaken"><label class="seeder-bevestiging"><input type="checkbox" name="bevestigen" value="ja" required> <span>Ik wil alle bestaande stemmen verwijderen.</span></label>
                    <button type="submit" class="btn seeder-verwijderknop">Stemmen tabel leegmaken</button></form></section>
        </div></main>`;
    },

    uitslag: () => {
        const partijStemmen = {}, partijloos = { 1: 0, 2: 0, 3: 0 }, blanco = [1, 2, 3].map(k => db.tally[k].blanco || 0);
        let heeftPartijloos = false;
        const st = (id, k) => db.tally[k][id] || 0;
        for (const l of db.leden) for (const k of [1, 2, 3]) {
            if (!l.partij_id) { partijloos[k] += st(l.lid_id, k); heeftPartijloos = true; }
            else (partijStemmen[l.partij_id] ??= { 1: 0, 2: 0, 3: 0 })[k] += st(l.lid_id, k);
        }
        // Largest remainder over first choices, 150 seats (same as verdeelZetels)
        const eerste = sortedPartijen().map(p => ({ afkorting: p.afkorting, stemmen: partijStemmen[p.partij_id]?.[1] || 0 })).filter(r => r.stemmen > 0);
        const som = eerste.reduce((t, r) => t + r.stemmen, 0);
        let zetels = [];
        if (som) {
            zetels = eerste.map(r => { const ex = r.stemmen / som * 150; return { ...r, zetels: Math.floor(ex), rest: ex - Math.floor(ex) }; });
            const volg = zetels.map((_, i) => i).sort((a, b) => zetels[b].rest - zetels[a].rest || zetels[b].stemmen - zetels[a].stemmen);
            for (let i = 0, v = zetels.reduce((t, r) => t + r.zetels, 0); v < 150; i++, v++) zetels[volg[i % volg.length]].zetels++;
            zetels = zetels.sort((a, b) => b.zetels - a.zetels || b.stemmen - a.stemmen).filter(r => r.zetels > 0);
        }
        const kleur = allePartijKleuren();
        window.__zetelData = zetels.map(z => ({ name: z.afkorting, seats: z.zetels, zetels: z.zetels, stemmen: z.stemmen, color: kleur[z.afkorting] }));
        const totaal = p => [1, 2, 3].reduce((t, k) => t + (partijStemmen[p]?.[k] || 0), 0);
        const lidSort = (a, b) => st(b.lid_id, 1) - st(a.lid_id, 1) || stemmenOp(b.lid_id) - stemmenOp(a.lid_id) || a.lid_positie - b.lid_positie;
        const partijen = sortedPartijen().sort((a, b) => (partijStemmen[b.partij_id]?.[1] || 0) - (partijStemmen[a.partij_id]?.[1] || 0) || totaal(b.partij_id) - totaal(a.partij_id) || a.partij_positie - b.partij_positie);
        const lozen = db.leden.filter(l => !l.partij_id).sort(lidSort);
        const naam = l => [l.voornaam, l.tussenvoegsels, l.achternaam].filter(Boolean).join(' ');
        const groep = (key, label, cells, leden) => `<tr class="uitslag-toggle${leden.length ? '' : ' geen-kandidaten'}"${leden.length ? ` data-partij="${key}" tabindex="0" aria-expanded="false"` : ''}>
            <th scope="row">${leden.length ? '<span class="toggle-teken" aria-hidden="true"></span>' : ''}${h(label)} <span class="kandidaat-telling">(${leden.length})</span></th>${cells.map(c => `<td>${c}</td>`).join('')}</tr>
            ${leden.map(l => `<tr class="kandidaat-rij" data-partij="${key}" hidden><th scope="row">${h(naam(l))}</th>${[1, 2, 3].map(k => `<td>${st(l.lid_id, k)}</td>`).join('')}</tr>`).join('')}`;
        return `<main class="partijbeheer-page"><div class="partijbeheer-container">
            <h1>Uitslagen &amp; Telling</h1><p>Aantal opgeslagen stemmen: <strong>${db.totaal}</strong>.</p>
            <h2>Zetelverdeling (eerste keuze)</h2>
            ${zetels.length ? `<div class="zetel-wrap"><svg id="zetelChart" role="img" aria-label="Zetelverdeling"></svg></div>
                <div class="zetel-legenda">${zetels.map(z => `<span class="zetel-leg" title="${nl(z.stemmen)} stemmen"><i style="background: ${h(kleur[z.afkorting])};"></i>${h(z.afkorting)} ${z.zetels}</span>`).join('')}</div>
                <p class="zetel-totaal">150 zetels &bull; ${nl(som)} geldige stemmen</p>`
                : '<p>Nog geen (eerste-keuze)stemmen uitgebracht — de zetelverdeling verschijnt hier zodra er gestemd is.</p>'}
            <h2>Stemmen per partij en kandidaat</h2>
            <div class="table-responsive"><table><thead><tr><th>Partij / kandidaat</th><th>Eerste keuze</th><th>Tweede keuze</th><th>Derde keuze</th></tr></thead><tbody>
                ${db.leden.length ? '' : '<tr><td colspan="4">Geen kandidaten gevonden.</td></tr>'}
                ${partijen.map(p => groep(p.partij_id, p.partij_naam, [1, 2, 3].map(k => partijStemmen[p.partij_id]?.[k] || 0), ledenVan(p.partij_id).sort(lidSort))).join('')}
                ${heeftPartijloos || lozen.length ? groep('loos', 'Partijloze kandidaten', [1, 2, 3].map(k => partijloos[k]), lozen) : ''}
                <tr><th scope="row">Blanco / niet ingevuld</th>${blanco.map(b => `<td>${b}</td>`).join('')}</tr>
            </tbody></table></div></div></main>`;
    },

    onderconstructie: () => `<main class="uc-page"><div class="uc-container">
        <div class="uc-icon"><i class='bx bx-hard-hat'></i></div><div class="uc-badge"><span class="uc-badge-dot"></span>Onder Constructie</div>
        <h1 class="uc-title">${h(S.error_title || 'Deze pagina is in aanbouw')}</h1>
        <div class="uc-strip"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
        <div class="uc-actions"><a href="?page=home" class="btn uc-btn-primary"><i class='bx bx-home-alt-2'></i> Terug naar Home</a>
            <a href="javascript:history.back()" class="btn btn-secondary uc-btn-secondary"><i class='bx bx-arrow-back'></i> Ga terug</a></div>
    </div></main>`,
};
const ADMIN_ONLY = ['partijbeheer', 'partij_toevoegen', 'partij_bewerken', 'kandidaatbeheer', 'kandidaat_toevoegen', 'kandidaat_aanpassen', 'kandidaat_verwijderen', 'stemperiode', 'stemmen_seeder', 'uitslag'];

function validKandidaat(f, back) {
    const err = msg => { say('alert', msg); go(back); return false; };
    if (!f.voornaam.trim() || !f.achternaam.trim() || !f.woonplaats.trim()) return err('Vul voornaam, achternaam en woonplaats in.');
    if (!['Man', 'Vrouw'].includes(f.geslacht)) return err('Kies een geldig geslacht.');
    if (!(+f.lid_positie >= 1) || !Number.isInteger(+f.lid_positie)) return err('De positie moet een geheel getal van 1 of hoger zijn.');
    if (!(+f.partij_id >= 1)) return err('Kies een partij.');
    if (f.geboortedatum && f.geboortedatum > new Date().toISOString().slice(0, 10)) return err('De geboortedatum mag niet in de toekomst liggen.');
    return true;
}
const kandidaatVelden = f => ({ voornaam: f.voornaam.trim(), tussenvoegsels: f.tussenvoegsels.trim(), achternaam: f.achternaam.trim(), geslacht: f.geslacht, woonplaats: f.woonplaats.trim(), geboortedatum: f.geboortedatum || null });

const forms = {
    login(f) {
        const bsn = f.bsn.trim();
        if (!/^[0-9]{9}$/.test(bsn)) return say('alert', 'Vul een geldig BSN in (9 cijfers).'), go('?page=login');
        if (db.gestemd.includes(bsn)) return say('alert', 'Met dit BSN is al gestemd. U kunt niet opnieuw stemmen.'), go('?page=login');
        S.bsn = bsn; say('success', 'U bent ingelogd.'); go('?page=stempagina');
    },
    adminlogin(f) {
        const b = db.beheerders.find(b => b.email === f.email.trim());
        if (!b || b.wachtwoord !== f.wachtwoord) return say('alert', 'E-mail of wachtwoord onjuist.'), go('?page=adminlogin');
        Object.assign(S, { role: 2, beheerder_email: b.email }); delete S.bsn;
        say('success', 'Admin inlog succesvol.'); go('?page=partijbeheer');
    },
    async partij_toevoegen(f, el) {
        const naam = f.partij_naam.trim(), afk = f.afkorting.trim(), pos = +f.partij_positie;
        try {
            if (!naam || !afk || !(pos > 0)) throw new Error('Vul alle velden correct in.');
            herstelVolgorde();
            if (pos > db.partijen.length + 1) throw new Error(`Kies een positie tussen 1 en ${db.partijen.length + 1}.`);
            if (db.partijen.some(p => p.partij_naam === naam || p.afkorting === afk)) throw new Error('Er bestaat al een partij met deze naam of afkorting.');
            const file = el.logo.files[0], logo = file ? await fileToData(file) : '';
            const p = { partij_id: nextId(db.partijen, 'partij_id'), partij_naam: naam, afkorting: afk, partij_positie: db.partijen.length + 1, logo, bg: logo ? await logoBg(logo) : '#ffffff' };
            db.partijen.push(p); verplaatsPartij(p.partij_id, pos);
            say('success', 'Partij toegevoegd.'); go('?page=partijbeheer');
        } catch (e) { say('alert', 'Toevoegen mislukt: ' + e.message); go('?page=partij_toevoegen'); }
    },
    async partij_bewerken(f, el) {
        const id = +q.get('id'), naam = f.partij_naam.trim(), afk = f.afkorting.trim(), pos = +f.partij_positie, back = '?page=partij_bewerken&id=' + id;
        if (!naam || !afk || !(pos > 0)) return say('alert', 'Vul alle velden correct in.'), go(back);
        try {
            herstelVolgorde();
            if (db.partijen.some(p => (p.partij_naam === naam || p.afkorting === afk) && p.partij_id !== id)) throw new Error('Er bestaat al een partij met deze naam of afkorting.');
            verplaatsPartij(id, pos);
            const p = partij(id), file = el.logo.files[0];
            Object.assign(p, { partij_naam: naam, afkorting: afk });
            if (file) { p.logo = await fileToData(file); p.bg = await logoBg(p.logo); }
            say('success', 'Partij bijgewerkt.'); go('?page=partijbeheer');
        } catch (e) { say('alert', 'Opslaan mislukt: ' + e.message); go(back); }
    },
    kandidaat_toevoegen(f) {
        if (!validKandidaat(f, '?page=kandidaat_toevoegen')) return;
        try {
            herstelVolgorde();
            const k = { lid_id: nextId(db.leden, 'lid_id'), ...kandidaatVelden(f), partij_id: null, lid_positie: +f.lid_positie };
            db.leden.push(k);
            try { verplaatsKandidaat(k.lid_id, +f.partij_id, +f.lid_positie); } catch (e) { db.leden.pop(); throw e; }
            say('success', 'Kandidaat toegevoegd.'); go('?page=kandidaatbeheer');
        } catch (e) { say('alert', e.message); go('?page=kandidaat_toevoegen'); }
    },
    kandidaat_aanpassen(f) {
        const id = +q.get('id'), back = '?page=kandidaat_aanpassen&id=' + id;
        if (!validKandidaat(f, back)) return;
        try {
            herstelVolgorde();
            verplaatsKandidaat(id, +f.partij_id, +f.lid_positie);
            Object.assign(lid(id), kandidaatVelden(f));
            say('success', 'Kandidaat bijgewerkt.'); go('?page=kandidaatbeheer');
        } catch (e) { say('alert', e.message); go(back); }
    },
    kandidaat_verwijderen() {
        const id = +q.get('id');
        if (stemmenOp(id) > 0) return say('alert', 'Er zijn stemmen op deze kandidaat uitgebracht. Verwijderen is niet mogelijk.'), go('?page=kandidaatbeheer');
        db.leden = db.leden.filter(l => l.lid_id !== id); herstelVolgorde();
        say('success', 'Kandidaat verwijderd.'); go('?page=kandidaatbeheer');
    },
    planning(f) {
        const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
        if (!re.test(f.start_moment) || !re.test(f.eind_moment)) return say('alert', 'Vul een geldige startdatum en einddatum in.'), go('?page=stemperiode');
        const s = f.start_moment.replace('T', ' ') + ':00', e = f.eind_moment.replace('T', ' ') + ':00';
        if (e <= s) return say('alert', 'De einddatum moet na de startdatum liggen.'), go('?page=stemperiode');
        db.stemperiode = { start_moment: s, eind_moment: e, handmatig: 'auto' };
        say('success', 'De planning is opgeslagen. De stemming volgt nu de ingestelde datums.'); go('?page=stemperiode');
    },
    seed_toevoegen(f) {
        S.stemmen_seed_invoer = f;
        try {
            const keuzes = { 1: [], 2: [], 3: [] };
            for (const [key, raw] of Object.entries(f)) {
                const [c, pid] = key.split(':'), v = String(raw).trim(), n = v === '' ? 0 : Number(v);
                if (!Number.isInteger(n) || n < 0 || n > 100000) throw new Error('Vul hele aantallen tussen 0 en 100000 in.');
                if (!n) continue;
                if (keuzes[c].length + n > 100000) throw new Error('Voeg maximaal 100000 stemmen per keuze tegelijk toe.');
                const leden = pid === 'blanco' ? null : ledenVan(+pid).map(l => l.lid_id);
                if (leden && !leden.length) throw new Error('Een gekozen partij bestaat niet of heeft geen kandidaten.');
                for (let i = 0; i < n; i++) keuzes[c].push(leden ? leden[Math.floor(Math.random() * leden.length)] : 'blanco');
            }
            const rijen = Math.max(keuzes[1].length, keuzes[2].length, keuzes[3].length);
            if (!rijen) throw new Error('Vul minstens één aantal stemmen in.');
            for (const c of [1, 2, 3]) {
                while (keuzes[c].length < rijen) keuzes[c].push('blanco');
                for (const id of keuzes[c]) db.tally[c][id] = (db.tally[c][id] || 0) + 1;
            }
            db.totaal += rijen; delete S.stemmen_seed_invoer;
            say('success', `${rijen} stemrijen toegevoegd.`);
        } catch (e) { say('alert', e.message); }
        go('?page=stemmen_seeder');
    },
    seed_leegmaken(f) {
        if (f.bevestigen !== 'ja') return say('alert', 'Bevestig eerst dat je alle stemmen wilt verwijderen.'), go('?page=stemmen_seeder');
        const n = db.totaal;
        Object.assign(db, { totaal: 0, tally: { 1: {}, 2: {}, 3: {} }, gestemd: [] });
        say('success', `${n} stemrijen verwijderd.`); go('?page=stemmen_seeder');
    },
};

function tekenZetels() {
    const svgEl = document.getElementById('zetelChart');
    if (!svgEl) return;
    if (typeof d3 === 'undefined' || !d3.parliamentChart) { svgEl.outerHTML = '<p>De grafiek kon niet worden geladen (geen verbinding met CDN).</p>'; return; }
    const breedte = Math.max(280, document.querySelector('.zetel-wrap').clientWidth || 640), schaal = breedte / 640;
    const svg = d3.select(svgEl).attr('width', breedte).attr('height', breedte / 2 + 20);
    svg.selectAll('*').remove();
    svg.call(d3.parliamentChart().aggregatedData(window.__zetelData).width(breedte).sections(6)
        .sectionGap(Math.max(4, Math.round(28 * schaal))).seatRadius(Math.max(2, Math.round(9 * schaal))).rowHeight(Math.max(6, Math.round(26 * schaal))));
    svg.selectAll('circle').append('title').text(d => `${d.name}: ${d.zetels} zetels`);
}
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

function render() {
    if (q.has('logout')) { for (const k in S) delete S[k]; save(); return go('?page=home'); }
    let page = (q.get('page') || 'home').replace(/[^a-zA-Z0-9_\-]/g, '') || 'home';
    if (!pages[page]) { S.error_title = 'Pagina bestaat niet of is nog in aanbouw'; page = 'onderconstructie'; }
    if (ADMIN_ONLY.includes(page) && !isAdmin()) return say('alert', 'Log eerst in als beheerder.'), go('?page=adminlogin');
    if (['stempagina', 'stemmen_bedankt'].includes(page) && !S.bsn) return go('?page=login');
    const html = pages[page]();
    if (html === undefined) return; // page redirected
    delete S.error_title;
    renderNav(); renderFlash();
    document.getElementById('seeder-css').disabled = page !== 'stemmen_seeder';
    document.getElementById('page').innerHTML = html;
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();

    const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => { e.preventDefault(); fn(el, e); }));
    on('#page form[id]:not(#controleForm)', 'submit', el => forms[el.id]?.(Object.fromEntries(new FormData(el)), el));
    // Stemflow actions: buttons that carry partij_id use the submitter's value.
    on('form[data-actie]', 'submit', (el, e) => {
        const f = Object.fromEntries(new FormData(el));
        if (e.submitter?.name) f[e.submitter.name] = e.submitter.value;
        const err = stemActie(el.dataset.actie, f);
        if (err) S.alert = err;
        save(); go('?page=stempagina' + (err ? '' : '#keuze-' + (el.dataset.actie.match(/_([23])$/)?.[1] || '1')));
    });
    on('[data-go]', 'click', el => { const err = stemActie(el.dataset.go, {}); if (err) S.alert = err; save(); go('?page=stempagina'); });
    document.querySelectorAll('.kandidaatForm').forEach(form => form.querySelectorAll('.kandidaat-row').forEach(row => row.addEventListener('click', () => {
        form.querySelectorAll('.kandidaat-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected'); row.querySelector('input').checked = true; form.querySelector('.btnKies').disabled = false;
    })));
    const akk = document.getElementById('akkoordCheck');
    akk?.addEventListener('change', () => { document.getElementById('btnKlaar').disabled = !akk.checked; });
    on('#controleForm', 'submit', stemBevestig);
    on('#demoBsn', 'click', () => { document.getElementById('bsn').value = DEMO_BSN; });
    on('[data-del-partij]', 'click', el => {
        const p = partij(el.dataset.delPartij);
        if (!confirm(`Weet je zeker dat je '${p.partij_naam}' wilt verwijderen? Kandidaten worden partijloos.`)) return;
        db.leden.filter(l => l.partij_id === p.partij_id).forEach(l => { l.partij_id = null; });
        db.partijen = db.partijen.filter(x => x !== p); herstelVolgorde();
        say('success', 'Partij verwijderd. Kandidaten zijn partijloos gemaakt.'); go('?page=partijbeheer');
    });
    on('[data-periode]', 'click', el => {
        const open = el.dataset.periode === 'openen';
        db.stemperiode.handmatig = open ? 'open' : 'dicht';
        say('success', open ? 'De stemming is handmatig geopend.' : 'De stemming is handmatig gesloten.'); go('?page=stemperiode');
    });
    on('#btnRandom', 'click', () => {
        const mi = document.getElementById('randomMax');
        let max = parseInt(mi.value, 10); if (isNaN(max) || max < 0) max = 0; if (max > 100000) { max = 100000; mi.value = 100000; }
        document.querySelectorAll('.stemmen-seeder tbody tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input[type="number"]:not([disabled])');
            if (inputs.length !== 3) return;
            const n1 = Math.floor(Math.random() * (max + 1)), n2 = Math.floor(Math.random() * (n1 + 1)), n3 = Math.floor(Math.random() * (n2 + 1));
            [n1, n2, n3].forEach((n, i) => { inputs[i].value = n; });
        });
    });
    document.getElementById('logoInput')?.addEventListener('change', async e => {
        const f = e.target.files[0], box = document.getElementById('previewLogo');
        if (!f) return;
        const src = await fileToData(f);
        box.innerHTML = `<img src="${src}" alt="preview">`; box.style.background = await logoBg(src);
    });
    document.querySelectorAll('.uitslag-toggle[data-partij]').forEach(rij => {
        const schakel = () => {
            const open = rij.getAttribute('aria-expanded') === 'true';
            rij.setAttribute('aria-expanded', String(!open));
            document.querySelectorAll(`.kandidaat-rij[data-partij="${rij.dataset.partij}"]`).forEach(k => { k.hidden = open; });
        };
        rij.addEventListener('click', schakel);
        rij.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); schakel(); } });
    });
    if (document.getElementById('zetelChart')) {
        loadScript('https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js')
            .then(() => loadScript('https://cdn.jsdelivr.net/npm/d3-parliament-chart@0.0.8/build/d3-parliament-chart.min.js'))
            .catch(() => { }).then(() => { tekenZetels(); let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(tekenZetels, 200); }); });
    }
}
render();
