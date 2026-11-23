// Static replica of the Book on Shelf PHP library: MySQL + $_SESSION are replaced by localStorage.
const DB_KEY = 'bos-db-v1', SES_KEY = 'bos-session-v1';

const B = [ // book_name, writer, genre, taal, page, copies, cover (first 5 = "Popular" on home, like LIMIT 5)
    ['Buiten is het oorlog', 'Janny van der Molen', 'Historisch', 'Nederlands', 256, 3, 'anne_frank.jpg'],
    ['Sinterklaas', 'Charlotte Dematons', 'Kinderboek', 'Nederlands', 48, 2, 'sinterklaas.jpeg'],
    ['Intermezzo', 'Sally Rooney', 'Roman', 'Nederlands', 448, 4, 'intermezzo.jpeg'],
    ['Dubbelspel', 'David Baldacci', 'Thriller', 'Nederlands', 432, 2, 'dubbel.jpeg'],
    ['Paris', 'Bert Wagendorp', 'Roman', 'Nederlands', 320, 1, 'paris.jpeg'],
    ['Afgrond', 'Robert Harris', 'Thriller', 'Nederlands', 400, 3, 'afgrond.jpeg'],
    ['Alice in Wonderland', 'Lewis Carroll', 'Fantasy', 'Nederlands', 224, 2, 'alice.jpeg'],
    ["Harry Potter and the Sorcerer's Stone", 'J.K. Rowling', 'Fantasy', 'Engels', 309, 0, 'harry.jpg'],
    ['Harry Butter', 'K.R. Jowling', 'Humor', 'AbraCadabra', 69, 1, 'butter.png'],
    ['Vier de teugels', 'Kathryn Scanlan', 'Roman', 'Nederlands', 160, 2, 'horse.jpeg'],
    ['The Life of A', 'Onbekend', 'Roman', 'Engels', 280, 1, 'lifeofa.png'],
    ['Place', 'Hannah Huber', 'Roman', 'Engels', 336, 2, 'place.jpeg'],
    ['De sprong', 'Maria Stepanova', 'Roman', 'Nederlands', 192, 0, 'sprong.jpeg'],
    ['De laatste droom', 'Pedro Almodóvar', 'Verhalen', 'Nederlands', 240, 2, 'thedroom.jpeg'],
    ['The Hitchhiker', 'Gerwin van der Werf', 'Roman', 'Engels', 288, 1, 'thehitchikers.jpeg'],
    ['The Leash and the Ball', 'Rodaan Al Galidi', 'Roman', 'Engels', 304, 2, 'theleash.jpeg'],
];

const seed = () => ({
    users: [
        { user_id: 1, voornaam: 'Admin', tussenvoegsel: '', achternaam: 'BoS', g_datum: '2000-01-01', adres: 'BookonShelfStraat / Arnhem', email: 'admin@bookonshelf.nl', wachtwoord: 'admin', role: 'admin' },
        { user_id: 2, voornaam: 'Jan', tussenvoegsel: 'de', achternaam: 'Jansen', g_datum: '2004-05-12', adres: 'Boekstraat 1 / Arnhem', email: 'jan@bookonshelf.nl', wachtwoord: 'klant', role: 'klant' },
    ],
    books: B.map((b, i) => ({ book_id: i + 1, ISBN: 'BoS-' + String(9789000000 + i), book_name: b[0], writer: b[1], genre: b[2], taal: b[3], page: b[4], copies: b[5], cover: b[6] })),
    geleende_boeken: [], reservations: [],
});

const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback(); } catch { return fallback(); } };
const db = load(DB_KEY, seed);
const S = load(SES_KEY, () => ({}));
function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); localStorage.setItem(SES_KEY, JSON.stringify(S)); }
    catch { alert('Opslag vol: kies een kleinere afbeelding.'); }
}
const nextId = (arr, key) => arr.reduce((m, r) => Math.max(m, r[key]), 0) + 1;
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const q = new URLSearchParams(location.search);
const go = url => { location.href = url; };
const cover = c => c?.startsWith('data:') ? c : 'css/' + (c || 'default-cover.jpg');
const fileToData = file => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
const flash = (message, type) => { Object.assign(S, { message, message_type: type }); save(); };
const takeFlash = () => {
    if (!S.message) return '';
    const t = S.message_type || 'danger', out = `<div class="alert ${h(t)}"><strong>${t[0].toUpperCase() + t.slice(1)}!</strong> ${h(S.message)}</div>`;
    delete S.message; delete S.message_type; save();
    return out;
};
const table = (head, rows) => rows.length
    ? `<table${head.border ? " border='1'" : ''}><tr>${head.cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows.join('')}</table>`
    : '<p>Geen boeken gevonden.</p>';

function renderChrome(page) {
    const auth = document.getElementById('auth');
    if (page === 'login') auth.innerHTML = `<a href="?page=register" class="button">Register</a>`;
    else if (page === 'register') auth.innerHTML = `<a href="?page=login" class="button">Login</a>`;
    else auth.innerHTML = S.Role
        ? `<a href="?page=profile" class="button">${h(S.Username)}'s Profile</a>`
        : `<a href="?page=login" class="button">Login</a><a href="?page=register" class="button">Register</a>`;

    if (page === 'login' || page === 'register') return; // these were standalone pages without the navbar
    const links = S.Role === 'admin'
        ? [['overzicht', 'Overzicht (Admin)'], ['overzicht_g', 'Leen Boek'], ['b_bewerken', 'Bewerken'], ['b_toevoegen', 'Toevoegen'], ['m_geleende', 'Geleende Boeken'], ['m_gereserveerde_b', 'Gereserveerde Boeken']]
        : [['overzicht_g', 'Leen Boek'], ['m_geleende', 'Geleende Boeken'], ['m_gereserveerde_b', 'Gereserveerde Boeken']];
    document.getElementById('navbar').innerHTML = `<h1><a class="header" href="?page=home">Book on Shelf</a></h1>
        <div class="topnav">${!S.Role ? '<h3>Je moet inloggen of registreren om boeken te lenen</h3>'
            : links.map(([p, t]) => `<a href="?page=${p}">${t}</a>`).join('') + '<a href="?logout=true">Uitloggen</a>'}</div>`;
}

function leen(book_id) {
    const uid = S.user_id, book = db.books.find(b => b.book_id === book_id);
    if (db.geleende_boeken.filter(g => g.user_id === uid).length >= 3) return flash('Je kunt maximaal 3 boeken lenen.', 'warning'), 'm_geleende';
    if (!book) return flash('Boek niet gevonden.', 'danger'), 'overzicht_g';
    if (db.geleende_boeken.some(g => g.user_id === uid && g.book_name === book.book_name)) return flash('Je hebt dit boek al geleend.', 'warning'), 'm_geleende';
    if (book.copies <= 0) return flash('Het boek is niet beschikbaar om te lenen.', 'warning'), 'overzicht_g';
    book.copies--;
    db.geleende_boeken.push({ book_name: book.book_name, writer: book.writer, user_id: uid, loan_date: Date.now() });
    flash('Boek succesvol geleend.', 'success');
    return 'm_geleende';
}
function reserveer(book_id) {
    const uid = S.user_id;
    if (db.reservations.some(r => r.user_id === uid && r.book_id === book_id)) return flash('Je hebt dit boek al gereserveerd.', 'warning'), 'm_gereserveerde_b';
    db.reservations.push({ book_id, user_id: uid, reservation_date: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    flash('Boek succesvol gereserveerd.', 'success');
    return 'm_gereserveerde_b';
}

const bookForm = (b = {}) => `
    Boek Titel <input type="text" id="title" placeholder="Parry Hotter" name="title" required value="${h(b.book_name)}">
    Naam van Schrijver <input type="text" id="schrijver" placeholder="K.R.Jowling" name="schrijver" required value="${h(b.writer)}">
    Genre <input type="text" id="genre" placeholder="Nice" name="genre" value="${h(b.genre)}">`;

const pages = {
    home: () => `<div class="shelf"><h2>Popular Boeken</h2><div class="books">
        ${db.books.slice(0, 5).map(b => `<div class="book"><img src="${h(cover(b.cover))}" alt=""><span class="book-title">${h(b.book_name)}</span></div>`).join('') || '<p>Geen boeken beschikbaar.</p>'}
        </div></div>`,

    login: () => `<form id="login"><div class="login">
        E-mail <input type="text" placeholder="gebruikersnaam@bookonshelf.nl" name="username">
        Wachtwoord <input type="password" placeholder="Wachtwoord" name="pword">
        <button type="submit">Login</button>
        <small>Demo: admin@bookonshelf.nl / admin &middot; jan@bookonshelf.nl / klant</small>
    </div></form>`,

    register: () => `<form id="register"><div class="login">
        Voornaam / Tussenvoegsel / Achternaam
        <div class="name-group">
            <input type="text" placeholder="Jan" name="firstname" required>
            <input type="text" placeholder="de" name="infix">
            <input type="text" placeholder="Jansen" name="lastname">
        </div>
        Geboortedatum <input type="date" name="gdatum" required>
        Adres <input type="text" placeholder="BookonShelfStraat / Arnhem" name="street">
        Email <input type="email" placeholder="jan.jansen@example.com" name="email" required>
        Wachtwoord <input type="password" placeholder="********" name="pword" required>
        <button type="submit">Register</button>
    </div></form>`,

    overzicht: () => table({ cols: ['Boek Titel', 'Naam van Schrijver', 'Genre', 'ISBN-nummer', 'Taal', "Aantal pagina's", 'Aantal exemplaren'] },
        db.books.map(b => `<tr><td>${h(b.book_name)}</td><td>${h(b.writer)}</td><td>${h(b.genre)}</td><td>${h(b.ISBN)}</td><td>${h(b.taal)}</td><td>${h(b.page)}</td><td>${h(b.copies)}</td></tr>`)),

    overzicht_g: () => {
        const shelves = [];
        for (let i = 0; i < db.books.length; i += 5) shelves.push(db.books.slice(i, i + 5));
        return `<div class="shelf-container"><h2>Boeken voor Lenen of Reserveren</h2>${takeFlash()}
            ${shelves.length ? shelves.map(row => `<div class="books">${row.map(b => `
                <div class="book" style="width: fit-content; height: fit-content; max-width: 180px">
                    <img src="${h(cover(b.cover))}" alt=""><span class="book-title">${h(b.book_name)}</span>
                    <form data-book="${b.book_id}" data-action="${b.copies > 0 ? 'leen' : 'reserveer'}">
                        <button class="${b.copies > 0 ? 'leenboek' : 'reserveer'}" type="submit">${b.copies > 0 ? 'Leen Boek' : 'Reserveer'}</button>
                    </form>
                </div>`).join('')}</div>`).join('<div class="shelf"></div>') : '<p>Geen boeken beschikbaar.</p>'}
        </div>`;
    },

    m_geleende: () => takeFlash() + table({ cols: ['Boek Titel', 'Naam van Schrijver', 'Acties'] },
        db.geleende_boeken.filter(g => g.user_id === S.user_id).map(g => `<tr><td>${h(g.book_name)}</td><td>${h(g.writer)}</td>
            <td><a href="?page=terug&book_name=${encodeURIComponent(g.book_name)}" style="margin-left: 10px; color: white;">Terug Brengen</a></td></tr>`)),

    m_gereserveerde_b: () => {
        const flashHtml = takeFlash(), uid = S.user_id, rows = [];
        const mine = db.reservations.filter(r => r.user_id === uid);
        for (const r of mine) {
            const b = db.books.find(b => b.book_id === r.book_id);
            if (!b) continue;
            if (b.copies > 0) { // like the PHP page: a reserved book that is back in stock is lent out on view
                db.geleende_boeken.push({ user_id: uid, book_name: b.book_name, writer: b.writer, loan_date: Date.now() });
                db.reservations = db.reservations.filter(x => x !== r);
                b.copies--;
            } else rows.push(`<tr><td>${h(b.book_name)}</td><td>${h(b.writer)}</td><td>${h(r.reservation_date)}</td></tr>`);
        }
        save();
        return flashHtml + (mine.length ? `<table><tr><th>Boek Titel</th><th>Naam van Schrijver</th><th>Reserveringsdatum</th></tr>${rows.join('')}</table>` : '<p>Geen boeken gevonden.</p>');
    },

    terug: () => {
        const name = q.get('book_name'), b = db.books.find(b => b.book_name === name);
        if (b) b.copies++;
        db.geleende_boeken = db.geleende_boeken.filter(g => !(g.user_id === S.user_id && g.book_name === name));
        save(); go('?page=overzicht_g');
    },

    b_bewerken: () => {
        if (q.get('delete')) {
            if (confirm('Wilt u zeker verwijderen?')) { db.books = db.books.filter(b => b.ISBN !== q.get('delete')); save(); }
            return go('?page=b_bewerken');
        }
        return table({ border: true, cols: ['Boek Titel', 'Naam van Schrijver', 'Genre', 'ISBN', 'Taal', "Aantal pagina's", 'Aantal exemplaren', 'Acties'] },
            db.books.map(b => `<tr><td>${h(b.book_name)}</td><td>${h(b.writer)}</td><td>${h(b.genre)}</td><td>${h(b.ISBN)}</td><td>${h(b.taal)}</td><td>${h(b.page)}</td><td>${h(b.copies)}</td>
                <td><a href="?page=edit&edit=${encodeURIComponent(b.ISBN)}" style="margin-left: 10px; color: white;">Edit</a>
                    <a href="?page=b_bewerken&delete=${encodeURIComponent(b.ISBN)}" style="margin-left: 10px; color: red;">Delete</a></td></tr>`));
    },

    b_toevoegen: () => `<form id="b_toevoegen"><div class="login">${bookForm()}
        ISBN-nummer <input type="text" id="isbn" placeholder="BoS-1234567890" maxlength="14" name="isbn">
        Taal <input type="text" id="taal" placeholder="AbraCadabra" name="taal">
        Aantal pagina's <input type="number" id="pages" placeholder="69" name="pages" min="1">
        <label for="copies">Aantal exemplaren</label><input type="number" id="copies" placeholder="31" name="copies" min="1">
        Cover <input type="file" name="cover" id="cover" accept="image/*">
        <button type="submit">Toevoegen</button>
    </div></form>`,

    edit: () => {
        const b = db.books.find(b => b.ISBN === q.get('edit'));
        if (!b) return '<p>Boek niet gevonden.</p>';
        return `<h2>Boek Bewerken</h2><form id="edit">
            <label for="name">Boek Titel:</label><input type="text" id="name" name="name" value="${h(b.book_name)}"><br>
            <label for="writer">Naam van Schrijver:</label><input type="text" id="writer" name="writer" value="${h(b.writer)}"><br>
            <label for="genre">Genre:</label><input type="text" id="genre" name="genre" value="${h(b.genre)}"><br>
            <label for="taal">Taal:</label><input type="text" id="taal" name="taal" value="${h(b.taal)}"><br>
            <label for="page">Aantal pagina's:</label><input type="number" id="page" name="page" value="${h(b.page)}"><br>
            <label for="copies">Aantal exemplaren:</label><input type="number" id="copies" name="copies" min="0" value="${h(b.copies)}"><br>
            <button type="submit">Opslaan</button><a href="?page=b_bewerken" style="margin-left: 10px;">Annuleren</a>
        </form>`;
    },

    profile: () => {
        const u = db.users.find(u => u.user_id === S.user_id);
        const full = `${u.voornaam} ${u.tussenvoegsel} ${u.achternaam}`;
        const note = S.Notification; delete S.Notification; save();
        return `<div class="profile-container">
            <h1 style="color: white">Welkom, ${h(full)}!</h1>
            ${note ? `<p class="notification">${h(note)}</p>` : ''}
            <div class="section-header"><h2>Persoonlijke Gegevens</h2>
                <a href="#" class="edit-icon" id="toggle-edit"><i class="fa fa-pencil"></i> Edit Info</a></div>
            <div id="profile-info">
                <h3><strong>Naam:</strong> ${h(full)}</h3>
                <h3><strong>Geboortedatum:</strong> ${h(u.g_datum)}</h3>
                <h3><strong>Email:</strong> ${h(u.email)}</h3>
                <h3><strong>Adres:</strong> ${h(u.adres)}</h3>
            </div>
            <form id="profile" style="display:none;">
                <label for="firstname">Naam:</label><input type="text" id="firstname" name="firstname" value="${h(u.voornaam)}" required><br>
                <label for="infix">Tussenvoegsel:</label><input type="text" id="infix" name="infix" value="${h(u.tussenvoegsel)}"><br>
                <label for="lastname">Achternaam:</label><input type="text" id="lastname" name="lastname" value="${h(u.achternaam)}" required><br>
                <label for="birthdate">Geboortedatum:</label><input type="date" id="birthdate" name="birthdate" value="${h(u.g_datum)}" required><br>
                <label for="street">Adres:</label><input type="text" id="street" name="street" value="${h(u.adres)}" required><br>
                <label for="email">Email:</label><input type="email" id="email" name="email" value="${h(u.email)}" required><br>
                <input type="submit" value="Update Profiel">
            </form>
        </div>`;
    },
};
const NEEDS_LOGIN = ['overzicht_g', 'm_geleende', 'm_gereserveerde_b', 'terug', 'profile'];
const ADMIN_ONLY = ['overzicht', 'b_bewerken', 'b_toevoegen', 'edit'];

const forms = {
    login(f) {
        if (!f.username || !f.pword) return alert('Gebruikersnaam en wachtwoord zijn vereist.');
        const u = db.users.find(u => u.email === f.username);
        if (!u) return alert('Gebruiker niet gevonden.');
        if (u.wachtwoord !== f.pword) return alert('Onjuiste wachtwoord.');
        Object.assign(S, { Role: u.role, Username: u.voornaam, user_id: u.user_id });
        save(); go(u.role === 'admin' ? '?page=overzicht' : '?page=overzicht_g');
    },
    register(f) {
        if (db.users.some(u => u.email === f.email)) return alert('Dit e-mailadres is al geregistreerd.');
        db.users.push({ user_id: nextId(db.users, 'user_id'), voornaam: f.firstname, tussenvoegsel: f.infix, achternaam: f.lastname,
            g_datum: f.gdatum, adres: f.street, email: f.email, wachtwoord: f.pword, role: 'klant' });
        save(); alert('Registratie succesvol! :)'); go('?page=login');
    },
    async b_toevoegen(f, el) {
        if (f.isbn && db.books.some(b => b.ISBN === f.isbn)) return alert('Dit ISBN bestaat al.');
        const file = el.cover.files[0];
        db.books.push({ book_id: nextId(db.books, 'book_id'), ISBN: f.isbn || 'BoS-' + Date.now().toString().slice(-10), book_name: f.title, writer: f.schrijver,
            genre: f.genre, taal: f.taal, page: +f.pages || 0, copies: +f.copies || 0, cover: file ? await fileToData(file) : '' });
        save(); go('?page=b_bewerken');
    },
    edit(f) {
        Object.assign(db.books.find(b => b.ISBN === q.get('edit')),
            { book_name: f.name, writer: f.writer, genre: f.genre, taal: f.taal, page: +f.page, copies: Math.max(0, +f.copies) });
        save(); go('?page=b_bewerken');
    },
    profile(f) {
        Object.assign(db.users.find(u => u.user_id === S.user_id),
            { voornaam: f.firstname, tussenvoegsel: f.infix, achternaam: f.lastname, g_datum: f.birthdate, email: f.email, adres: f.street });
        Object.assign(S, { Username: f.firstname, Notification: 'Profiel succesvol bijgewerkt!' });
        save(); go('?page=profile');
    },
};

function render() {
    if (q.has('logout')) { for (const k in S) delete S[k]; save(); return go('?page=home'); }
    let page = q.get('page') || 'home';
    if (!pages[page]) page = 'home';
    if ((NEEDS_LOGIN.includes(page) && !S.Role) || (ADMIN_ONLY.includes(page) && S.Role !== 'admin')) return go('?page=login');
    const html = pages[page]();
    if (html === undefined) return; // page redirected
    renderChrome(page);
    document.getElementById('page').innerHTML = html;

    document.querySelectorAll('#page form[id]').forEach(el => el.addEventListener('submit', e => {
        e.preventDefault();
        forms[el.id]?.(Object.fromEntries(new FormData(el)), el);
    }));
    document.querySelectorAll('form[data-book]').forEach(el => el.addEventListener('submit', e => {
        e.preventDefault();
        const id = +el.dataset.book, next = el.dataset.action === 'leen' ? leen(id) : reserveer(id);
        save(); go('?page=' + next);
    }));
    document.getElementById('toggle-edit')?.addEventListener('click', e => {
        e.preventDefault();
        const info = document.getElementById('profile-info'), form = document.getElementById('profile'), show = form.style.display === 'none';
        form.style.display = show ? 'block' : 'none'; info.style.display = show ? 'none' : 'block';
    });
}
render();
