// Static replica of the Game PC PHP shop: MySQL (PDO) + $_SESSION are replaced by localStorage.
const DB_KEY = 'gamepc-db-v1', SES_KEY = 'gamepc-session-v1';
const ROLES = { 1: 'Customer', 2: 'Admin', 3: 'Worker' };

const CATS = [ // name, image (category images came out of the original database)
    ['CPU', 'img/cpu.jpg'], ['Motherboard', 'img/motherboard.jpg'], ['Graphics Card (GPU)', 'img/gpu.jpg'],
    ['Memory (RAM)', 'img/ram.jpg'], ['Storage', 'img/storage.jpg'], ['Power Supply (PSU)', 'img/psu.jpg'],
    ['PC Case', 'img/case.jpg'], ['Cooling', 'img/cooling.jpg'], ['Pre-built PC', 'img/prebuilt.jpg'],
];
const COMPONENTS = [ // category_id, name, brand, price, specs, image (null = category image)
    // shortcut: parts 1-8 are demo data (the real rows lived only in the school MySQL database)
    [1, 'Ryzen 5 7600', 'AMD', 199, '6 cores / 12 threads, up to 5.1 GHz, AM5'],
    [1, 'Ryzen 7 7800X3D', 'AMD', 399, '8 cores / 16 threads, 96MB L3 3D V-Cache, AM5'],
    [1, 'Core i5-14600K', 'Intel', 299, '14 cores (6P + 8E), up to 5.3 GHz, LGA1700'],
    [1, 'Core i9-14900K', 'Intel', 549, '24 cores (8P + 16E), up to 6.0 GHz, LGA1700'],
    [2, 'MAG B650 Tomahawk WiFi', 'MSI', 219, 'AM5, DDR5, PCIe 5.0 M.2, WiFi 6E'],
    [2, 'ROG Strix Z790-E Gaming', 'ASUS', 429, 'LGA1700, DDR5, PCIe 5.0, WiFi 6E'],
    [2, 'B760M DS3H', 'Gigabyte', 119, 'LGA1700, micro-ATX, DDR4'],
    [3, 'GeForce RTX 4060', 'NVIDIA', 299, '8GB GDDR6, DLSS 3'],
    [3, 'GeForce RTX 4070 Super', 'NVIDIA', 619, '12GB GDDR6X, DLSS 3'],
    [3, 'Radeon RX 7800 XT', 'AMD', 499, '16GB GDDR6, FSR 3'],
    [4, 'Vengeance 16GB DDR5-5600', 'Corsair', 69, '2 x 8GB, CL36'],
    [4, 'Trident Z5 RGB 32GB DDR5-6000', 'G.Skill', 129, '2 x 16GB, CL30'],
    [4, 'Fury Beast 64GB DDR5-5200', 'Kingston', 219, '2 x 32GB, CL40'],
    [5, '990 Pro 1TB', 'Samsung', 119, 'NVMe PCIe 4.0, 7450 MB/s'],
    [5, 'Black SN850X 2TB', 'WD', 169, 'NVMe PCIe 4.0, 7300 MB/s'],
    [5, 'P3 500GB', 'Crucial', 45, 'NVMe PCIe 3.0, 3500 MB/s'],
    [6, 'RM750e', 'Corsair', 99, '750W, 80+ Gold, fully modular'],
    [6, 'Pure Power 12 M 850W', 'be quiet!', 129, '850W, 80+ Gold, ATX 3.0'],
    [6, 'Focus GX-650', 'Seasonic', 95, '650W, 80+ Gold, fully modular'],
    [7, 'H5 Flow', 'NZXT', 89, 'Mid-tower, mesh front panel'],
    [7, 'O11 Dynamic EVO', 'Lian Li', 159, 'Mid-tower, dual chamber, tempered glass'],
    [7, 'North', 'Fractal Design', 139, 'Mid-tower, walnut front panel'],
    [8, 'NH-D15', 'Noctua', 109, 'Dual tower air cooler, 2 x 140mm'],
    [8, 'Liquid Freezer III 360', 'Arctic', 119, '360mm AIO liquid cooler'],
    [8, 'Hyper 212', 'Cooler Master', 39, 'Single tower air cooler, 120mm'],
    [9, 'Budget Brawler', 'Game PC', 850, 'Ready-to-ship prebuilt gaming PC.', 'img/budget-brawler.jpg'],
    [9, '1080p Champion', 'Game PC', 1250, 'Ready-to-ship prebuilt gaming PC.', 'img/1080p-champion.jpg'],
    [9, 'AMD Powerhouse', 'Game PC', 1400, 'Ready-to-ship prebuilt gaming PC.', 'img/amd-powerhouse.avif'],
    [9, 'The Competitor', 'Game PC', 2100, 'Ready-to-ship prebuilt gaming PC.', 'img/prebuilt.jpg'],
    [9, 'The Monolith', 'Game PC', 1950, 'Ready-to-ship prebuilt gaming PC.', 'img/the-monolith.jpg'],
    [9, 'The Arctic Fox', 'Game PC', 1750, 'Ready-to-ship prebuilt gaming PC.', 'img/the-arctic-fox.jpg'],
    [9, 'The Workstation', 'Game PC', 2500, 'Ready-to-ship prebuilt gaming PC.', 'img/the-workstation.avif'],
    [9, 'RGB Fusion', 'Game PC', 1650, 'Ready-to-ship prebuilt gaming PC.', 'img/rgb-fusion.jpg'],
];

const seed = () => ({
    users: [
        { user_id: 1, username: 'Admin', lastname: 'Game PC', email: 'admin@gamepc.com', password: 'admin', role_id: 2, street: '', house_number: '', zip_code: '' },
        { user_id: 2, username: 'Wang', lastname: 'Yang', email: 'worker@gamepc.com', password: 'worker', role_id: 3, street: '', house_number: '', zip_code: '' },
        { user_id: 3, username: 'Jan', lastname: 'Jansen', email: 'klant@gamepc.com', password: 'klant', role_id: 1, street: 'Hoofdstraat', house_number: '1', zip_code: '6811AA' },
    ],
    categories: CATS.map(([name, img], i) => ({ categories_id: i + 1, name, categorie_image: img })),
    components: COMPONENTS.map(([category_id, name, brand, price, specs, image], i) => ({ components_id: i + 1, category_id, name, brand, price, specs, image: image || null })),
    cart: [], orders: [], order_items: [], builds: [], build_components: [],
});

const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback(); } catch { return fallback(); } };
const db = load(DB_KEY, seed);
const S = load(SES_KEY, () => ({ cart: [] }));
function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); localStorage.setItem(SES_KEY, JSON.stringify(S)); }
    catch { alert('Storage full: choose a smaller image.'); }
}
const nextId = (arr, key) => arr.reduce((m, r) => Math.max(m, r[key]), 0) + 1;
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const ucfirst = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const q = new URLSearchParams(location.search);
const go = url => { location.href = url; };
const role = () => S.role_id ?? null;
const cat = id => db.categories.find(c => c.categories_id == id);
const comp = id => db.components.find(c => c.components_id == id);
const imageOf = c => c.image || cat(c.category_id)?.categorie_image || 'css/placeholder.png';
const fileToData = file => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
const say = (kind, msg) => { S[kind] = msg; save(); };

// Logged-in users keep their cart in the "database", guests in the session, like the PHP version.
const myCart = () => S.userid ? db.cart.filter(c => c.user_id === S.userid) : S.cart;
function addToCart(id) {
    const row = myCart().find(c => c.components_id == id);
    if (row) row.quantity++;
    else if (S.userid) db.cart.push({ user_id: S.userid, components_id: +id, quantity: 1 });
    else S.cart.push({ components_id: +id, quantity: 1 });
    save();
}
const setCart = rows => { if (S.userid) db.cart = db.cart.filter(c => c.user_id !== S.userid).concat(rows); else S.cart = rows; save(); };

function renderAuth() {
    const count = myCart().reduce((t, c) => t + c.quantity, 0);
    const menus = {
        2: [['product_overview', 'Products Overview'], ['add_product', 'Add Products'], ['manage_categories', 'Authorise Categories'], ['users_overview', 'Users Overview'], ['orders', 'Orders']],
        1: [['profile', 'Profile'], ['cart', `Cart (${count})`], ['order_history', 'Bestelgeschiedenis'], ['build', 'Build a PC']],
        3: [['orders', 'Build Orders'], ['medewerker_orders', 'User Orders'], ['telefonisch_samenstellen', 'Telefonisch Samenstellen']],
    };
    document.getElementById('auth').innerHTML = S.userid
        ? `<div class="dropdown"><a class="button">${h(S.username)} ▼</a><div class="dropdown-content">
            ${(menus[role()] || []).map(([p, t]) => `<a href="?page=${p}">${t}</a>`).join('')}</div></div>
           <a href="?logout=true" class="button">Log out</a>`
        : `<a href="?page=cart" class="button">Cart (${count})</a><a href="?page=login" class="button">Login</a><a href="?page=register" class="button">Register</a>`;
}

function renderFlash() {
    let out = '';
    for (const kind of ['alert', 'success']) if (S[kind]) {
        out += `<div class="${kind}"><span class="close-btn" onclick="this.parentElement.style.display='none'">&times;</span><p>${h(S[kind])}</p></div>`;
        delete S[kind];
    }
    save();
    document.getElementById('flash').innerHTML = out;
}

const productCard = (p, extra = '') => `
    <div class="product-container"><div class="product">
        <a class="a_home_link" href="?page=product_page&components_id=${p.components_id}">
            <img src="${h(imageOf(p))}" alt="${h(p.name)}" width="150">
            <h2>${h(p.name)}</h2>
            ${extra}
        </a>
    </div></div>`;

const builder = worker => {
    const cats = db.categories.slice().sort((a, b) => a.categories_id - b.categories_id).slice(0, 8);
    const sorted = db.components.slice().sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
    return `<div class="container">
        <h1>${worker ? 'PC Builder (for Worker)' : 'PC Builder Wizard'}</h1>
        <form id="build" data-worker="${worker ? 1 : ''}">
            <div class="pc-builder-grid">
                <div class="components-section">
                    <div class="card"><div class="card-content"><div>
                        <label for="build-name" class="form-label">Build Name</label>
                        <input type="text" id="build-name" name="build_name" required class="form-input" placeholder="e.g., Gaming Beast">
                    </div></div>
                    ${worker ? `<label for="klant-select" class="form-label">Selecteer Klant</label>
                        <select name="user_id" id="klant-select" required>
                            <option value="">-- Selecteer een klant --</option>
                            ${db.users.filter(u => u.role_id == 1).map(u => `<option value="${u.user_id}">${h(u.username)} ${h(u.lastname)}</option>`).join('')}
                        </select>` : ''}
                    </div>
                    <div class="card" style="margin-top: 2rem;"><h2 class="card-header">Select Components</h2><div class="card-content">
                        ${cats.map(c => `<div>
                            <label for="category-select-${c.categories_id}" class="form-label">${h(c.name)}</label>
                            <select name="c${c.categories_id}" id="category-select-${c.categories_id}" data-category-name="${h(c.name)}" class="component-select">
                                <option value="" data-price="0">-- Select a ${h(c.name)} --</option>
                                ${sorted.filter(p => p.category_id === c.categories_id).map(p => `<option value="${p.components_id}" data-price="${p.price}" data-name="${h(p.brand + ' - ' + p.name)}">
                                    ${h(p.brand + ' - ' + p.name)} (€${Number(p.price).toFixed(2)})</option>`).join('')}
                            </select></div>`).join('')}
                    </div></div>
                </div>
                <div class="summary-section"><div class="card summary-box">
                    <h2 class="card-header" style="margin-bottom: 1rem;">Build Summary</h2>
                    <div id="summary"><p class="text-placeholder">Please select components to begin.</p></div>
                    <div class="summary-footer"><div class="total-price-line"><span>Total:</span><span id="total-price">€0.00</span></div></div>
                    <button type="submit" class="submit-button">Save Build</button>
                </div></div>
            </div>
        </form>
    </div>`;
};

function bindBuilder() {
    const selects = document.querySelectorAll('.component-select'), summary = document.getElementById('summary'), total = document.getElementById('total-price');
    if (!selects.length) return;
    const money = n => n.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' });
    const update = () => {
        let sum = 0, rows = '';
        selects.forEach(s => {
            const o = s.options[s.selectedIndex];
            if (!o.value) return;
            sum += +o.dataset.price;
            rows += `<div class="summary-item"><div class="summary-item-details"><p class="summary-item-category">${h(s.dataset.categoryName)}</p>
                <p class="summary-item-name">${h(o.dataset.name)}</p></div><p class="summary-item-price">${money(+o.dataset.price)}</p></div>`;
        });
        summary.innerHTML = rows || '<p class="text-placeholder">Please select components to begin.</p>';
        total.textContent = money(sum);
    };
    selects.forEach(s => s.addEventListener('change', update));
}

function buildsTable() {
    const mine = role() == 1 ? db.builds.filter(b => b.user_id === S.userid) : db.builds;
    const worker = role() == 3;
    return `<h2>Saved Builds</h2>
    <table style="color: #0f1111; border-collapse: collapse;" border="1" cellpadding="8" cellspacing="0">
        <thead><tr><th>Build Name</th><th>Created By</th><th>Components</th><th>Total Price</th><th>Order Date</th><th>Status</th>${worker ? '<th>Actions</th>' : ''}</tr></thead>
        <tbody>${!mine.length ? `<tr><td colspan="${worker ? 7 : 6}" style="text-align: center;">No saved builds found.</td></tr>`
            : mine.slice().reverse().map(b => {
                const parts = db.build_components.filter(x => x.build_id === b.builds_id).map(x => comp(x.component_id)?.name).filter(Boolean);
                const email = db.users.find(u => u.user_id === b.user_id)?.email;
                return `<tr><td>${h(b.name)}</td><td>${h(email)}</td>
                    <td><textarea readonly style="width: 100%; height: 100px; resize: vertical;" disabled>${h(parts.join('\n'))}</textarea></td>
                    <td>€${eur(b.total_price)}</td><td>${fmtDate(b.created_at)}</td>
                    <td>${ucfirst(b.status) || 'N/A'}</td>
                    ${worker ? `<td><form data-build-status="${b.builds_id}"><select name="new_status">
                        ${['processing', 'shipped', 'completed'].map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${ucfirst(s)}</option>`).join('')}
                        </select><button type="submit" class="button">Save</button></form></td>` : ''}</tr>`;
            }).join('')}
        </tbody></table>`;
}

function orderHistory() {
    if (!S.userid) return "<p style='text-align:center;'>Log in om je bestelgeschiedenis te bekijken.</p>";
    const orders = db.orders.filter(o => o.user_id === S.userid).reverse();
    return `<h1 style="text-align:center;">Mijn Bestellingen</h1>${!orders.length ? '<p style="text-align:center;">Je hebt nog geen bestellingen geplaatst.</p>'
        : `<table style="width:100%; border-collapse: collapse;"><thead><tr><th>Bestelling ID</th><th>Totaalprijs</th><th>Datum</th><th>Status</th></tr></thead>
        <tbody>${orders.map(o => `<tr><td>#${o.orders_id}</td><td>€${eur(o.total_price)}</td><td>${fmtDate(o.created_at)}</td><td>${h(ucfirst(o.status))}</td></tr>`).join('')}</tbody></table>`}`;
}

const pages = {
    home: () => `
        <div class="home_page"><img src="css/homepage.png" alt="">
            <div class="text-overlay"><h1>The best Game PC’s</h1><p>We have the best game pc's for you!</p>
                <a href="?page=build" class="button-link"><button>Build a custom pc now! </button></a></div></div>
        <div class="extrapng"><img src="css/extra.png" alt=""></div>
        <img class="arrow_down" src="css/down-arrow.png" alt="">
        <h1 class="text_center">Built your own pc now!</h1>
        <div class="categories_container"><h1 class="text_center">Categories</h1><div class="categories_grid">
            ${db.categories.map(c => `<div class="categories_wrapper" onclick="location.href='?page=product_overview&category=${c.categories_id}'">
                <div class="categories_box"><div class="categories"><img src="${h(c.categorie_image)}" alt=""><h2>${h(c.name)}</h2><p class="see_more">See more!</p></div></div></div>`).join('') || '<p>No categories found.</p>'}
        </div></div>
        <img class="red_arrow" src="css/redarrow.png" alt="">
        <img class="foto_1" src="css/foto_1.png" alt=""><img class="foto_2" src="css/foto2.png" alt=""><img class="foto_3" src="css/foto3.png" alt=""><img class="foto_4" src="css/foto4.png" alt="">
        <div class="prebuild_pc">
            <h1 class="text_center">Prebuilt Pc's</h1><img class=" arrow_down" src="css/down-arrow.png" alt="">
            <h3 class="text_center"> We have some prebuilt pc's that are ready to be shipped!</h3>
            <div class="product-grid">${db.components.filter(p => p.category_id === 9).map(p => `<div class="products-wrapper">
                ${productCard(p, `<h3 class="price">${Number(p.price).toFixed(2)}</h3><p class="see_more"> see more!</p>`)}</div>`).join('') || '<p>No products found.</p>'}
            </div>
            <footer class="site-footer">
                <div class="footer-content">
                    <div class="footer-section about"><h2>Customer Service</h2>
                        <a href="#">Delivery &amp; Returns</a><a href="#">Product &amp; Stock</a><a href="#">Technical Support</a><a href="#">Term of Use</a><a href="#">Contact Us</a></div>
                    <div class="footer-section links"><h2>Quick Links</h2><ul><li><a href="?page=home">Home</a></li><li><a href="?page=register">Register</a></li></ul></div>
                    <div class="footer-section contact"><h2>Contact Us</h2><p>Email: support@gamepc.com</p><p>Phone: +123 456 7890</p></div>
                </div>
                <div class="footer-bottom">&copy; 2023 SK GAMING | Designed by SK GAMING</div>
            </footer>
        </div>`,

    login: () => `<div class="content"><form id="login"><div class="login">
        E-mail <input type="text" placeholder="gebruikersnaam@bookonshelf.nl" name="email" required>
        Wachtwoord <input type="password" placeholder="Wachtwoord" name="password" required>
        <p>Don't have a account?<a href="?page=register" class="register-button"> Register here</a></p>
        <small>Demo: admin@gamepc.com / admin &middot; worker@gamepc.com / worker &middot; klant@gamepc.com / klant</small>
        <br><button type="submit">Login</button><br>
    </div></form></div>`,

    register: () => `<div class="sign-up"><form id="register"><h1>sign up</h1><div class="login">
        <label>First Name / Prefix / Last Name</label>
        <div class="name-group"><input type="text" placeholder="Jan" name="username" required><input type="text" placeholder="de" name="prefix"><input type="text" placeholder="Jansen" name="lastname"></div>
        <div class="register"><h1>Address</h1>
            <label>Place</label><input name="place" type="text" required>
            <label>Street</label><input name="street" type="text" required>
            <label>House Number</label><input name="housenumber" type="text" required>
            <label>Zip Code</label><input name="zipcode" type="text" required></div>
        <label>Email</label><input name="email" type="email" required>
        <label>Password</label><input name="password" type="password" required>
        <label>Confirm Password</label><input name="confirm_password" type="password" required>
        <button type="submit">Register</button>
    </div></form></div>`,

    product_overview: () => {
        const sel = q.get('category') || '', sortBy = ['name', 'price'].includes(q.get('sort_by')) ? q.get('sort_by') : 'default';
        const order = q.get('sort_order') === 'ASC' ? 'ASC' : 'DESC';
        let list = db.components.filter(p => !sel || p.category_id == sel);
        list.sort(sortBy === 'default' ? (a, b) => b.components_id - a.components_id
            : (a, b) => (sortBy === 'price' ? a.price - b.price : a.name.localeCompare(b.name)) * (order === 'ASC' ? 1 : -1));
        const cats = db.categories.slice().sort((a, b) => a.name.localeCompare(b.name));
        const opt = (v, t, cur) => `<option value="${v}" ${cur == v ? 'selected' : ''}>${t}</option>`;
        return `<h1>Components</h1>
            <form id="filterForm" method="get">
                <input type="hidden" name="page" value="product_overview">
                <div class="filter-controls" style="display: flex; gap: 20px; align-items: center; margin-bottom: 20px;">
                    <div><label for="category">Filter by Category</label><select class="login" name="category" id="category" style="max-width:300px; margin-top: 0px;">
                        <option value="">All</option>${cats.map(c => opt(c.categories_id, h(c.name), sel)).join('')}</select></div>
                    <div><label for="sort_by">Sort By</label><select class="login" name="sort_by" id="sort_by" style="max-width:200px; margin-top: 0px;">
                        ${opt('default', 'Default', sortBy)}${opt('name', 'Name', sortBy)}${opt('price', 'Price', sortBy)}</select></div>
                    <div><label for="sort_order">Order</label><select class="login" name="sort_order" id="sort_order" style="max-width:200px; margin-top: 0px;">
                        ${opt('ASC', 'Ascending', order)}${opt('DESC', 'Descending', order)}</select></div>
                    <div><button type="submit" class="login" style="margin-top: 18px; color: #3674B5">Apply Filters</button></div>
                </div>
            </form>
            ${list.length ? `<div class="products-wrapper">${list.map(p => productCard(p, `
                <p style="margin: 15px 10px; color: #ffffff;"><strong style="color: #0f1111">Brand:</strong> ${h(p.brand)}</p>
                <p style="margin: 15px 10px; color: #ffffff;"><strong style="color: #0f1111">Category:</strong> ${h(cat(p.category_id)?.name)}</p>
                <h3 class="price">€ ${eur(p.price)}</h3>`).replace('</a>', '</a>' + (role() == 2
                    ? `<div><a href="?page=edit_product&id=${p.components_id}"><button>Edit</button></a> <button data-delete-component="${p.components_id}">Delete</button></div>`
                    : role() == null || role() == 1 ? `<div class="add-to-cart-btn-overview"><a href="?page=cart&id=${p.components_id}"><button>Add to Cart</button></a></div>` : ''))).join('')}</div>`
                : '<p>There are no components that match the filter.</p>'}`;
    },

    product_page: () => {
        const p = comp(q.get('components_id'));
        if (!p) return 'Product not found.';
        return `<div class="product-card">
            <div class="product-photo"><img src="${h(imageOf(p))}" alt="Product Image"></div>
            <div class="product-details">
                <h2 class="product-title">${h(p.name)} - ${h(p.brand)}</h2>
                <p class="product-price">€${h(p.price)}</p>
                <a href="?page=cart&id=${p.components_id}" class="add-to-cart-btn">Add to cart</a>
                <a href="?page=check_out&components_id=${p.components_id}" class="add-to-cart-btn">Pay now</a>
                <div class="product-description"><textarea name="product-info" rows="4" cols="50" readonly>${h(p.specs)}</textarea></div>
            </div>
        </div>`;
    },

    cart: () => {
        if (q.get('id')) { if (comp(q.get('id'))) addToCart(q.get('id')); return go('?page=cart'); }
        const rows = myCart().map(c => ({ ...comp(c.components_id), quantity: c.quantity })).filter(p => p.name);
        if (!rows.length) return '<h2 style="text-align:center; margin-top: 50px;">Your cart is empty.</h2><div style="text-align:center;"><a href="?page=home" class="button">Back to shop</a></div>';
        const total = rows.reduce((t, p) => t + p.price * p.quantity, 0);
        return `<h1>Shopping Cart Overview</h1>
            <table style="width: 100%; border-collapse: collapse;">
                <thead><tr><th>Name</th><th>Brand</th><th>Specs</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th>Action</th></tr></thead>
                <tbody>${rows.map(p => `<tr><td>${h(p.name)}</td><td>${h(p.brand)}</td><td>${h(p.specs)}</td><td>€${eur(p.price)}</td>
                    <td><form data-cart-update="${p.components_id}" style="display: flex; gap: 5px;"><input type="number" name="quantity" value="${p.quantity}" min="1" max="99" style="width: 100px;">
                        <button type="submit" class="button" style="padding: 5px 10px;">Update</button></form></td>
                    <td>€${eur(p.price * p.quantity)}</td>
                    <td><button class="button" style="background-color: #e74c3c;" data-cart-remove="${p.components_id}">Remove</button></td></tr>`).join('')}</tbody>
            </table>
            <h3 style="text-align:right;">Total: €${eur(total)}</h3>
            <div style="text-align: right; margin-top: 20px;"><button class="button" id="checkout">Check Out</button></div>`;
    },

    check_out: () => {
        const u = db.users.find(u => u.user_id === S.userid) || {};
        return `<h2>Checkout</h2><form id="pay_now">
            <label>First Name *</label><input type="text" name="username" value="${h(u.username)}" required><br>
            <label>Last Name *</label><input type="text" name="lastname" value="${h(u.lastname)}" required><br>
            <label>Street *</label><input type="text" name="street" value="${h(u.street)}" required><br>
            <label>House Number *</label><input type="text" name="house_number" value="${h(u.house_number)}" required><br>
            <label>Postal Code *</label><input type="text" name="postal_code" value="${h(u.zip_code)}" required><br>
            <button type="submit">Place Order</button></form>`;
    },

    order_history: orderHistory,

    profile: () => {
        const u = db.users.find(u => u.user_id === S.userid) || {};
        return `<div class="profile-container"><h1>Profielgegevens</h1>
            ${q.get('updated') ? '<div class="success-message">Profiel succesvol bijgewerkt!</div>' : ''}
            <form id="profile" class="profile-form">
                <div class="form-group"><label for="name">Naam:</label><input type="text" id="name" name="name" value="${h(u.username)}" required></div>
                <div class="form-group"><label for="email">E-mailadres:</label><input type="email" id="email" name="email" value="${h(u.email)}" required></div>
                <div class="form-group"><label for="adres">Adres:</label><textarea id="adres" name="adres" rows="3">${h(u.street)}</textarea></div>
                <button type="submit" class="button">Profiel Bijwerken</button>
            </form>
            <div class="orders-section">${buildsTable()}${orderHistory()}</div></div>`;
    },

    build: () => role() == 3 ? go('?page=telefonisch_samenstellen') : builder(false),
    telefonisch_samenstellen: () => builder(true),
    orders: buildsTable,

    medewerker_orders: () => `<h1>Manage Orders</h1>
        <table><thead><tr><th>Order ID</th><th>User</th><th>Total Price</th><th>Date</th><th>Status</th><th>Change Status</th></tr></thead>
        <tbody>${db.orders.slice().reverse().map(o => `<tr><td>#${o.orders_id}</td><td>${h(db.users.find(u => u.user_id === o.user_id)?.username ?? 'Guest')}</td>
            <td>€${eur(o.total_price)}</td><td>${fmtDate(o.created_at)}</td><td>${ucfirst(o.status)}</td>
            <td><form data-order-status="${o.orders_id}"><select name="new_status">${['processing', 'shipped', 'completed'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${ucfirst(s)}</option>`).join('')}</select>
                <button type="submit" class="button">Save</button></form></td></tr>`).join('')}</tbody></table>`,

    add_product: () => `<form id="add_product"><div class="small_container"><h1>Add Product</h1><div class="product-box"><div class="row-2">
        <div class="col-2">
            <label>Product Name:</label><input type="text" name="name" required>
            <label>Product Price:</label><input type="text" name="price" required>
            <label>Brand:</label><input type="text" name="brand" required>
            <label>Choose a Category:</label><select name="category_id" class="add-categories_product" required>
                ${db.categories.map(c => `<option value="${c.categories_id}">${h(c.name)}</option>`).join('')}</select>
            <h3>Product Details</h3><textarea name="specs" rows="4" cols="50"></textarea>
        </div>
        <div class="col-2"><label for="file" class="file-input-label">Upload Image</label><input type="file" id="file" name="image" accept="image/*" required>
            <div class="file-name" id="file-name">No file chosen</div></div>
        <button type="submit" class="btn_add">Add Product</button>
    </div></div></div></form>`,

    edit_product: () => {
        const p = comp(q.get('id'));
        if (!p) return 'Product not found.';
        return `<form id="edit_product" class="product-box"><h1>Edit Product</h1><div class="product_edit_container">
            <img src="${h(imageOf(p))}" alt="Product Image" class="current_image">
            <label class="file-input-label" for="product_image">Choose Image</label><input type="file" name="image" id="product_image" accept="image/*">
            <div class="edit_product">
                <label>Product Name:</label><input name="product_name" type="text" value="${h(p.name)}" required>
                <label>Product Price:</label><input name="product_price" type="number" value="${h(p.price)}" required placeholder="0,00" step="0.01" min="0">
                <label>Product Brand:</label><input name="product_brand" type="text" value="${h(p.brand)}" required>
                <label>Product Category:</label><select name="category" class="styled-select">
                    ${db.categories.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.categories_id}" ${c.categories_id == p.category_id ? 'selected' : ''}>${h(c.name)}</option>`).join('')}</select>
                <label>Product Description:</label><textarea name="product_desc" rows="4" cols="50" class="styled-textarea">${h(p.specs)}</textarea>
            </div></div>
            <button type="submit" class="btn_add">Update Product</button></form>`;
    },

    manage_categories: () => `${S.error_message ? `<p style="color: red;">${h(S.error_message)}</p>` : ''}
        <h2>Manage Categories</h2><h3>Add Category</h3>
        <div class="login" style="margin-left: 0px; width: fit-content"><form id="add_category">
            <label for="category_name">Category name</label><input type="text" id="category_name" name="category_name" placeholder="New category..." required>
            <div class="login" style="margin-left: 0px;"><label for="file" class="file-input-label">Upload Image</label><input type="file" id="file" name="image" accept="image/*" required>
                <div class="file-name" id="file-name">No file chosen</div></div>
            <button type="submit">Add</button></form></div>
        <h3>Categorys</h3>
        <table><tbody>${db.categories.map(c => `<tr><td>${h(c.name)}</td>
            <td><a href="?page=edit_category&id=${c.categories_id}">Edit</a> | <a href="#" data-delete-category="${c.categories_id}">Delete</a></td></tr>`).join('')}</tbody></table>`,

    edit_category: () => {
        const c = cat(q.get('id'));
        if (!c) return 'Category not found.';
        return `<h2>Edit Category</h2><form id="edit_category">
            <label for="category_name">Name:</label><input type="text" id="category_name" name="category_name" value="${h(c.name)}" required><br><br>
            <label>Current image:</label><br>${c.categorie_image ? `<img style="width: 250px" src="${h(c.categorie_image)}" alt=""><br>` : '<em>No image available</em><br>'}
            <label for="category_image">New image (optional):</label><br><input type="file" id="category_image" name="category_image" accept="image/*"><br><br>
            <button type="submit">Update</button></form>`;
    },

    users_overview: () => `<h2>Users Management</h2>
        <table><thead><tr><th>Name</th><th>Email</th><th>Current Role</th><th>Actions</th></tr></thead>
        <tbody>${db.users.map(u => `<tr><td>${h(u.username)}</td><td>${h(u.email)}</td><td>${ROLES[u.role_id] ?? 'Unknown'}</td><td>
            ${u.user_id === S.userid ? '<em>Cannot modify your own account</em>' : `
                <form data-role="${u.user_id}" style="display:inline;"><select name="new_role_id" required>
                    ${Object.entries(ROLES).map(([id, label]) => `<option value="${id}" ${u.role_id == id ? 'selected' : ''}>${label}</option>`).join('')}
                </select><button type="submit">Edit</button></form>
                <button data-delete-user="${u.user_id}">Delete</button>`}</td></tr>`).join('')}</tbody></table>`,
};
const ACCESS = { // page -> roles allowed (missing = everyone)
    profile: [1, 2, 3], order_history: [1, 2, 3], build: [1, 3], telefonisch_samenstellen: [3], orders: [1, 2, 3], medewerker_orders: [3],
    add_product: [2], edit_product: [2], manage_categories: [2], edit_category: [2], users_overview: [2],
};

const forms = {
    login(f) {
        const u = db.users.find(u => u.email === f.email);
        if (!u || u.password !== f.password) return say('alert', 'email or password is incorrect please try again.'), go('?page=login');
        Object.assign(S, { role_id: u.role_id, userid: u.user_id, email: u.email, username: u.username });
        // a guest cart is carried over on login
        S.cart.forEach(c => { for (let i = 0; i < c.quantity; i++) addToCart(c.components_id); }); S.cart = [];
        say('success', `Successfully logged in as ${ROLES[u.role_id].toLowerCase()}.`);
        go({ 1: '?page=home', 2: '?page=users_overview', 3: '?page=orders' }[u.role_id]);
    },
    register(f) {
        if (+f.housenumber < 0 || +f.zipcode < 0) return say('alert', 'Housnumber and Postal code most not be a negative number!'), go('?page=register');
        if (db.users.some(u => u.email === f.email)) return say('alert', 'E-mail already in use!'), go('?page=register');
        if (f.password !== f.confirm_password) return say('alert', 'password does not match!'), go('?page=register');
        db.users.push({ user_id: nextId(db.users, 'user_id'), username: f.username, prefix: f.prefix, lastname: f.lastname, place: f.place,
            street: f.street, house_number: f.housenumber, zip_code: f.zipcode, email: f.email, password: f.password, role_id: 1 });
        save(); go('?page=login');
    },
    build(f, el) {
        const user_id = el.dataset.worker ? +f.user_id : S.userid;
        const ids = Object.entries(f).filter(([k, v]) => /^c\d+$/.test(k) && v).map(([, v]) => +v);
        if (!user_id || !f.build_name || !ids.length) return alert('Kies een naam en minstens één component.');
        const builds_id = nextId(db.builds, 'builds_id');
        db.builds.push({ builds_id, user_id, name: f.build_name, total_price: ids.reduce((t, id) => t + comp(id).price, 0), created_at: Date.now(), status: null });
        ids.forEach(component_id => db.build_components.push({ build_id: builds_id, component_id }));
        say('success', `Build saved! Build ID: ${builds_id}`); go('?page=orders');
    },
    pay_now(f) {
        if (!S.userid) return say('alert', 'Je moet ingelogd zijn om te bestellen.'), go('?page=login');
        const p = comp(q.get('components_id'));
        if (!p) return say('alert', 'Geen product geselecteerd.'), go('?page=home');
        Object.assign(db.users.find(u => u.user_id === S.userid), { username: f.username, lastname: f.lastname, street: f.street, house_number: f.house_number, zip_code: f.postal_code });
        placeOrder([{ ...p, quantity: 1 }]);
        db.cart = db.cart.filter(c => !(c.user_id === S.userid && c.components_id === p.components_id));
        say('success', 'Bedankt voor uw bestelling!'); go('?page=order_history');
    },
    profile(f) {
        Object.assign(db.users.find(u => u.user_id === S.userid), { username: f.name, email: f.email, street: f.adres });
        Object.assign(S, { username: f.name, email: f.email });
        save(); go('?page=profile&updated=true');
    },
    async add_product(f, el) {
        const file = el.image.files[0];
        if (!file) return say('alert', 'Image upload failed!'), go('?page=add_product');
        if (file.size > 1000000) return say('alert', 'Image size too big!'), go('?page=add_product');
        if (db.components.some(c => c.name === f.name)) return say('alert', 'Component with this name already exists!'), go('?page=add_product');
        if (!(+f.price >= 0) || f.price.trim() === '') return say('alert', 'Product price must be a non-negative number!'), go('?page=add_product');
        db.components.push({ components_id: nextId(db.components, 'components_id'), name: f.name, brand: f.brand, category_id: +f.category_id, price: +f.price, specs: f.specs, image: await fileToData(file) });
        say('success', 'Product added successfully!'); go('?page=add_product');
    },
    async edit_product(f, el) {
        const p = comp(q.get('id')), back = '?page=edit_product&id=' + p.components_id, file = el.image.files[0];
        if (db.components.some(c => c.name === f.product_name && c !== p)) return say('alert', 'Product name already exists!'), go(back);
        if (!(+f.product_price >= 0)) return say('alert', 'Product price must be a valid non-negative number!'), go(back);
        if (file && file.size > 1000000) return say('alert', 'Image size too big!'), go(back);
        Object.assign(p, { name: f.product_name, price: +f.product_price, specs: f.product_desc, brand: f.product_brand, category_id: +f.category });
        if (file) p.image = await fileToData(file);
        say('success', 'Product updated successfully!'); go('?page=product_overview');
    },
    async add_category(f, el) {
        const file = el.image.files[0];
        if (!file) S.error_message = 'Please select a valid image.';
        else if (db.categories.some(c => c.name === f.category_name)) S.error_message = `Error: Category '${f.category_name}' already exists!`;
        else db.categories.push({ categories_id: nextId(db.categories, 'categories_id'), name: f.category_name, categorie_image: await fileToData(file) });
        save(); go('?page=manage_categories');
    },
    async edit_category(f, el) {
        const c = cat(q.get('id')), file = el.category_image.files[0];
        c.name = f.category_name;
        if (file) c.categorie_image = await fileToData(file);
        save(); go('?page=manage_categories');
    },
};

function placeOrder(items) {
    const orders_id = nextId(db.orders, 'orders_id');
    db.orders.push({ orders_id, user_id: S.userid ?? null, total_price: items.reduce((t, i) => t + i.price * i.quantity, 0), status: 'processing', created_at: Date.now() });
    items.forEach(i => db.order_items.push({ orders_id, product_name: i.name, quantity: i.quantity, price: i.price, subtotal: i.price * i.quantity }));
}

const on = (sel, ev, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => { e.preventDefault(); fn(el, e); }));

function render() {
    if (q.has('logout')) { for (const k in S) delete S[k]; S.cart = []; save(); return go('?page=home'); }
    let page = q.get('page') || 'home';
    if (!pages[page]) page = 'home';
    if (ACCESS[page] && !ACCESS[page].includes(role())) return go(S.userid ? '?page=home' : '?page=login');
    const html = pages[page]();
    if (html === undefined) return; // page redirected
    renderAuth(); renderFlash();
    document.getElementById('page').innerHTML = html;
    if (page === 'manage_categories' && S.error_message) { delete S.error_message; save(); }
    bindBuilder();

    on('#page form[id]:not(#filterForm)', 'submit', el => forms[el.id]?.(Object.fromEntries(new FormData(el)), el));
    document.querySelectorAll('input[type=file]#file').forEach(i => i.addEventListener('change', () => {
        document.getElementById('file-name').textContent = i.files[0]?.name || 'No file chosen';
    }));
    on('[data-cart-update]', 'submit', el => {
        const n = +new FormData(el).get('quantity');
        if (n >= 1 && n <= 99) { myCart().find(c => c.components_id == el.dataset.cartUpdate).quantity = n; save(); }
        go('?page=cart');
    });
    on('[data-cart-remove]', 'click', el => { setCart(myCart().filter(c => c.components_id != el.dataset.cartRemove)); go('?page=cart'); });
    on('#checkout', 'click', () => {
        const items = myCart().map(c => ({ ...comp(c.components_id), quantity: c.quantity })).filter(p => p.name);
        if (!items.length) return say('alert', 'Your cart is empty.'), go('?page=cart');
        placeOrder(items); setCart([]);
        say('success', 'Thank you for your order!'); go(S.userid ? '?page=order_history' : '?page=home');
    });
    on('[data-delete-component]', 'click', el => {
        if (!confirm('Are you sure you want to delete this component?')) return;
        db.components = db.components.filter(c => c.components_id != el.dataset.deleteComponent);
        say('success', 'Product successfully deleted.'); go('?page=product_overview');
    });
    on('[data-delete-category]', 'click', el => {
        const id = +el.dataset.deleteCategory, n = db.components.filter(c => c.category_id === id).length;
        if (n && !confirm(`In deze categorie staan ${n} producten. Wil je het echt verwijderen?`)) return;
        db.categories = db.categories.filter(c => c.categories_id !== id); save(); go('?page=manage_categories');
    });
    on('[data-role]', 'submit', el => {
        db.users.find(u => u.user_id == el.dataset.role).role_id = +new FormData(el).get('new_role_id');
        say('success', 'User role updated successfully.'); go('?page=users_overview');
    });
    on('[data-delete-user]', 'click', el => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        db.users = db.users.filter(u => u.user_id != el.dataset.deleteUser);
        say('success', 'User successfully deleted.'); go('?page=users_overview');
    });
    on('[data-build-status]', 'submit', el => {
        db.builds.find(b => b.builds_id == el.dataset.buildStatus).status = new FormData(el).get('new_status');
        say('success', 'Build status updated successfully.'); go('?page=orders');
    });
    on('[data-order-status]', 'submit', el => {
        db.orders.find(o => o.orders_id == el.dataset.orderStatus).status = new FormData(el).get('new_status');
        say('success', 'Status updated!'); go('?page=medewerker_orders');
    });
}
render();
