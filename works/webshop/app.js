// Static replica of the V&D PHP webshop: MySQL + $_SESSION are replaced by localStorage.
const DB_KEY = 'vd-db-v1', SES_KEY = 'vd-session-v1';

const P = [ // product_name, brand, gender, category, price, image
    ['RS-X Bold', 'Puma', 'Dames', 'Schoenen', 100, 'puma_rs_x_bold.jpg'],
    ['501 Original Jeans', "Levi's", 'Heren', 'Jeans', 90, 'levis_501.jpg'],
    ['Classic Polo', 'Tommy Hilfiger', 'Heren', 'Shirts', 50, 'tommy_polo.jpg'],
    ['Slim Fit Blazer', 'Zara', 'Dames', 'Jassen', 120, 'zara_blazer.jpg'],
    ['Nuptse Jacket', 'The North Face', 'Heren', 'Jassen', 250, 'tnf_nuptse.jpg'],
    ['Dri-FIT Training Shirt', 'Nike', 'Heren', 'Shirts', 35, 'nike_dri_fit.jpg'],
    ['Tiro 23 Training Pants', 'Adidas', 'Uniseks', 'Broeken', 55, 'adidas_tiro_pants.jpg'],
    ['Essentials Hoodie', 'Puma', 'Dames', 'Hoodie', 60, 'puma_hoodie.jpg'],
    ['721 High Rise Skinny Jeans', "Levi's", 'Dames', 'Jeans', 80, 'levis_721.jpg'],
    ['Iconic Logo T-Shirt', 'Tommy Hilfiger', 'Heren', 'Shirts', 40, 'tommy_logo_tshirt.jpg'],
    ['Oversized Denim Jacket', 'Zara', 'Dames', 'Jassen', 130, 'zara_denim_jacket.jpg'],
    ['Base Camp Duffel Bag', 'The North Face', 'Uniseks', 'Accessoires', 140, 'tnf_duffel.jpg'],
    ['Sportswear Club Fleece Joggers', 'Nike', 'Heren', 'Broeken', 50, 'nike_fleece_joggers.jpg'],
    ['Superstar Sneakers', 'Adidas', 'Uniseks', 'Schoenen', 100, 'adidas_superstar.jpg'],
    ['Future Rider Sneakers', 'Puma', 'Dames', 'Schoenen', 90, 'puma_future_rider.jpg'],
    ['Trucker Jacket', "Levi's", 'Heren', 'Jassen', 120, 'levis_trucker.jpg'],
    ['Slim Fit Dress Shirt', 'Tommy Hilfiger', 'Heren', 'Shirts', 70, 'tommy_dress_shirt.jpg'],
    ['Wide Leg Trousers', 'Zara', 'Dames', 'Broeken', 60, 'zara_wide_leg.jpg'],
    ['ThermoBall Eco Jacket', 'The North Face', 'Uniseks', 'Jassen', 200, 'tnf_thermoball.jpg'],
    ['Air Force 1', 'Nike', 'Uniseks', 'Schoenen', 120, 'nike_air_force_1.jpg'],
    ['NMD_R1 Sneakers', 'Adidas', 'Heren', 'Schoenen', 140, 'adidas_nmd_r1.jpg'],
    ['Active Sports Sweatpants', 'Puma', 'Dames', 'Broeken', 45, 'puma_sweatpants.jpg'],
    ['Mile High Super Skinny Jeans', "Levi's", 'Dames', 'Jeans', 90, 'levis_mile_high.jpg'],
    ['Puffer Jacket', 'Tommy Hilfiger', 'Heren', 'Jassen', 150, 'tommy_puffer.jpg'],
    ['Double Breasted Blazer', 'Zara', 'Dames', 'Jassen', 160, 'zara_double_blazer.jpg'],
    ['Himalayan Down Parka', 'The North Face', 'Uniseks', 'Jassen', 300, 'tnf_himalayan.jpg'],
    ['React Vision', 'Nike', 'Heren', 'Schoenen', 130, 'nike_react_vision.jpg'],
    ['Essentials 3-Stripes Hoodie', 'Adidas', 'Uniseks', 'Hoodie', 65, 'adidas_essentials_hoodie.jpg'],
    ['Classics T7 Track Jacket', 'Puma', 'Dames', 'Jassen', 80, 'puma_t7_track.jpg'],
    ['Ribcage Straight Ankle Jeans', "Levi's", 'Dames', 'Jeans', 100, 'levis_ribcage.jpg'],
    ['Flag Crewneck Sweatshirt', 'Tommy Hilfiger', 'Heren', 'Truien', 90, 'tommy_flag_sweater.jpg'],
    ['High Waist Pleated Skirt', 'Zara', 'Dames', 'Rokken', 50, 'zara_pleated_skirt.jpg'],
    ['Resolve 2 Rain Jacket', 'The North Face', 'Uniseks', 'Jassen', 120, 'tnf_resolve_2.jpg'],
    ['Dunk Low Retro', 'Nike', 'Uniseks', 'Schoenen', 140, 'nike_dunk_low.jpg'],
    ['Gazelle Sneakers', 'Adidas', 'Heren', 'Schoenen', 110, 'adidas_gazelle.jpg'],
    ['Essential Fleece Joggers', 'Puma', 'Dames', 'Broeken', 45, 'puma_fleece_joggers.jpg'],
    ['Wedgie Icon Fit Jeans', "Levi's", 'Dames', 'Jeans', 90, 'levis_wedgie_icon.jpg'],
    ['Essential Polo Dress', 'Tommy Hilfiger', 'Dames', 'Jurken', 80, 'tommy_polo_dress.jpg'],
    ['Long Wool Coat', 'Zara', 'Dames', 'Jassen', 180, 'zara_wool_coat.jpg'],
    ['Denali Fleece Jacket', 'The North Face', 'Uniseks', 'Jassen', 150, 'tnf_denali_fleece.jpg'],
    ['Court Vision Low', 'Nike', 'Heren', 'Schoenen', 100, 'nike_court_vision.jpg'],
    ['Trefoil Logo Sweatshirt', 'Adidas', 'Uniseks', 'Truien', 75, 'adidas_trefoil_sweater.jpg'],
    ['Cali Star Sneakers', 'Puma', 'Dames', 'Schoenen', 90, 'puma_cali_star.jpg'],
];

function seed() {
    const list = (arr, key) => arr.map((v, i) => ({ [key + '_id']: i + 1, [key]: v }));
    const brand = list([...new Set(P.map(p => p[1]))], 'brand');
    const gender = list(['Heren', 'Dames', 'Uniseks'], 'gender');
    const categorie = list(['Jeans', 'Shirts', 'Jassen', 'Broeken', 'Schoenen', 'Truien', 'Hoodie', 'Rokken', 'Jurken', 'Accessoires'], 'category');
    const id = (arr, key, v) => arr.find(r => r[key] === v)[key + '_id'];
    return {
        users: [
            { user_id: 1, email: 'admin@vd.nl', wachtwoord: 'admin', role: 'admin', voornaam: 'Admin', achternaam: 'V&D', name: 'Admin', adres: '' },
            { user_id: 2, email: 'klant@vd.nl', wachtwoord: 'klant', role: 'klant', voornaam: 'Jan', achternaam: 'Jansen', name: 'Jan Jansen', adres: '' },
        ],
        brand, gender, categorie,
        products: P.map((p, i) => ({
            product_id: i + 1, product_name: p[0], brand_id: id(brand, 'brand', p[1]),
            gender_id: id(gender, 'gender', p[2]), categorie_id: id(categorie, 'category', p[3]), price: p[4], image: p[5],
        })),
        orders: [], order_items: [],
    };
}

const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback(); } catch { return fallback(); } };
const db = load(DB_KEY, seed);
const S = load(SES_KEY, () => ({ cart: [] }));
function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); localStorage.setItem(SES_KEY, JSON.stringify(S)); }
    catch { alert('Opslag vol: kies een kleinere afbeelding.'); }
}
const nextId = (arr, key) => arr.reduce((m, r) => Math.max(m, r[key]), 0) + 1;

const h = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => Number(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const q = new URLSearchParams(location.search);
const go = url => { location.href = url; };
const img = name => name?.startsWith('data:') ? name : 'css/' + (name || 'default-image.jpg');

const joined = () => db.products.map(p => ({
    ...p,
    brand: db.brand.find(b => b.brand_id == p.brand_id)?.brand,
    category: db.categorie.find(c => c.category_id == p.categorie_id)?.category,
    gender: db.gender.find(g => g.gender_id == p.gender_id)?.gender,
}));
const cartLink = p => `?page=cart&product_id=${p.product_id}`;
const card = p => `
    <div class="product-card">
        <a href="?page=product&id=${p.product_id}">
            <div class="image-container"><img src="${h(img(p.image))}" alt="${h(p.product_name)}"></div>
            <div class="product-info">
                <h3>${h(p.product_name)}</h3>
                <p class="brand">${h(p.brand)}</p>
                <p class="gender">${h(p.gender)} ${h(p.category)}</p>
                <p class="price">€${eur(p.price)}</p>
            </div>
        </a>
        <a href="${cartLink(p)}" class="add-to-cart">Toevoegen aan Winkelwagen</a>
    </div>`;
const grid = (title, rows) => `<div class="product-section"><h2>${title}</h2><div class="product-grid">${rows.length ? rows.map(card).join('') : '<p>Geen producten beschikbaar.</p>'}</div></div>`;
const options = (arr, key, sel) => arr.map(r => `<option value="${r[key + '_id']}" ${r[key + '_id'] == sel ? 'selected' : ''}>${h(r[key])}</option>`).join('');
const isAdmin = () => S.Role === 'admin';
const fileToData = file => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });

function renderAuth() {
    const c = `Cart(${S.cart.length})`;
    document.getElementById('auth').innerHTML = !S.user_id
        ? `<a href="?page=cart" class="button">${c}</a><a href="?page=login" class="button">Inloggen</a><a href="?page=register" class="button">Registreren</a>`
        : isAdmin()
            ? `<div class="dropdown"><a class="button">Admin</a><div class="dropdown-content">
                <a href="?page=profile">Profile</a><a href="?page=product_overview">Producten Overzicht</a>
                <a href="?page=add_product">Product Toevoegen</a><a href="?page=manage_categories">Categorieën Beheren</a>
                <a href="?page=orders">Bestellingen</a></div></div>
               <div class="dropdown"><a href="?logout=true" class="button">Uitloggen</a></div>`
            : `<a href="?page=cart" class="button">${c}</a><a href="?page=profile" class="button">Profile</a><a href="?logout=true" class="button">Uitloggen</a>`;
}

function renderNavbar() {
    const rows = joined();
    const nav = db.gender.map(g => {
        const cats = [...new Set(rows.filter(p => p.gender === g.gender).map(p => p.category))];
        return `<div class="dropdown"><a href="?page=category&gen=${encodeURIComponent(g.gender)}" class="dropbtn">${h(g.gender)}</a><div class="dropdown-content">
            ${cats.map(c => `<a href="?page=category&gen=${encodeURIComponent(g.gender)}&cat=${encodeURIComponent(c)}">${h(c)}</a>`).join('')}</div></div>`;
    }).join('');
    document.getElementById('navbar').innerHTML = `
    <div class="announcement-bar"><marquee behavior="scroll" direction="left">
        🎉 Grote openingskorting! | 🛍️ Seizoensuitverkoop: Kortingen tot 50%! | 🚚 Vandaag besteld, morgen in huis! | 🏷️ Exclusieve deals voor snelle beslissers! | 💳 Veilig betalen, 100% tevredenheidsgarantie! |
        🛒 Winkel met vertrouwen, wij staan altijd voor u klaar! | 📦 Meer dan 10.000 tevreden klanten! | 🌟 Beoordeeld met 4.9/5 sterren! |
        📉 Wacht, onze korting... wordt kleiner? | 🐌 Misschien niet morgen in huis... maar volgende week zeker! | 🔄 Retourbeleid? Hmm, daar moeten we nog over nadenken. |
        📞 Klantenservice? Ja, we hadden ooit iemand... | 🏚️ Ons magazijn? Daar willen we het niet over hebben. | 🏴‍☠️ Onze CEO is vermist, stuur hulp! | 🚑 Send Help | 🙋‍♂️ Hallo? | 😦 Is er iemand? | ❓Of zo, ik weet het ook niet meer...
    </marquee></div>
    <a class="logo" href="?page=home"><img src="css/logo.png" alt="Logo" style="height: auto" width="auto"></a>
    <div class="navbar" style="text-align: center">${nav}</div>`;
}

const PROVINCIES = {
    "Drenthe": ["Aa en Hunze", "Assen", "Borger-Odoorn", "Coevorden", "Emmen", "Hoogeveen", "Meppel", "Midden-Drenthe", "Noordenveld", "Tynaarlo", "Westerveld"],
    "Flevoland": ["Almere", "Dronten", "Lelystad", "Noordoostpolder", "Urk", "Zeewolde"],
    "Friesland": ["Achtkarspelen", "Ameland", "Dantumadiel", "De Fryske Marren", "Harlingen", "Heerenveen", "Leeuwarden", "Noardeast-Fryslân", "Ooststellingwerf", "Opsterland", "Schiermonnikoog", "Smallingerland", "Súdwest-Fryslân", "Terschelling", "Tytsjerksteradiel", "Vlieland", "Waadhoeke", "Weststellingwerf"],
    "Gelderland": ["Aalten", "Apeldoorn", "Arnhem", "Barneveld", "Berg en Dal", "Berkelland", "Beuningen", "Bronckhorst", "Brummen", "Buren", "Culemborg", "Doesburg", "Doetinchem", "Druten", "Duiven", "Ede", "Elburg", "Epe", "Ermelo", "Harderwijk", "Hattem", "Heerde", "Heumen", "Lingewaard", "Lochem", "Maasdriel", "Montferland", "Neder-Betuwe", "Nijkerk", "Nijmegen", "Oldebroek", "Oost Gelre", "Oude IJsselstreek", "Overbetuwe", "Putten", "Renkum", "Rheden", "Rozendaal", "Scherpenzeel", "Tiel", "Voorst", "Wageningen", "West Betuwe", "West Maas en Waal", "Winterswijk", "Wijchen", "Zaltbommel", "Zevenaar", "Zutphen"],
    "Groningen": ["Appingedam", "Delfzijl", "Groningen", "Het Hogeland", "Loppersum", "Midden-Groningen", "Oldambt", "Pekela", "Stadskanaal", "Veendam", "Westerkwartier", "Westerwolde"],
    "Limburg": ["Beek", "Beekdaelen", "Beesel", "Bergen", "Brunssum", "Echt-Susteren", "Eijsden-Margraten", "Gennep", "Gulpen-Wittem", "Heerlen", "Horst aan de Maas", "Kerkrade", "Landgraaf", "Leudal", "Maasgouw", "Maastricht", "Meerssen", "Mook en Middelaar", "Nederweert", "Peel en Maas", "Roerdalen", "Roermond", "Simpelveld", "Sittard-Geleen", "Stein", "Vaals", "Venlo", "Venray", "Voerendaal", "Weert"],
    "Noord-Brabant": ["Alphen-Chaam", "Asten", "Baarle-Nassau", "Bergeijk", "Bergen op Zoom", "Bernheze", "Best", "Bladel", "Boekel", "Boxmeer", "Boxtel", "Breda", "Cranendonck", "Cuijk", "Deurne", "Dongen", "Drimmelen", "Eersel", "Eindhoven", "Etten-Leur", "Geertruidenberg", "Geldrop-Mierlo", "Gemert-Bakel", "Gilze en Rijen", "Goirle", "Grave", "Haaren", "Halderberge", "Heeze-Leende", "Helmond", "Heusden", "'s-Hertogenbosch", "Hilvarenbeek", "Laarbeek", "Landerd", "Loon op Zand", "Meierijstad", "Mill en Sint Hubert", "Moerdijk", "Nuenen, Gerwen en Nederwetten", "Oirschot", "Oisterwijk", "Oosterhout", "Oss", "Reusel-De Mierden", "Rucphen", "Sint Anthonis", "Sint-Michielsgestel", "Someren", "Son en Breugel", "Steenbergen", "Tilburg", "Uden", "Valkenswaard", "Veldhoven", "Vught", "Waalre", "Waalwijk", "Woensdrecht", "Zundert"],
    "Noord-Holland": ["Aalsmeer", "Alkmaar", "Amstelveen", "Amsterdam", "Beemster", "Bergen", "Beverwijk", "Blaricum", "Bloemendaal", "Castricum", "Den Helder", "Diemen", "Drechterland", "Edam-Volendam", "Enkhuizen", "Gooise Meren", "Haarlem", "Haarlemmermeer", "Heemskerk", "Heemstede", "Heerhugowaard", "Heiloo", "Hilversum", "Hollands Kroon", "Hoorn", "Huizen", "Koggenland", "Landsmeer", "Langedijk", "Laren", "Medemblik", "Oostzaan", "Opmeer", "Ouder-Amstel", "Purmerend", "Schagen", "Stede Broec", "Texel", "Uitgeest", "Uithoorn", "Velsen", "Weesp", "Zaanstad", "Zandvoort"],
    "Overijssel": ["Almelo", "Borne", "Dalfsen", "Deventer", "Enschede", "Haaksbergen", "Hardenberg", "Hellendoorn", "Hengelo", "Hof van Twente", "Kampen", "Losser", "Oldenzaal", "Ommen", "Raalte", "Staphorst", "Steenwijkerland", "Tubbergen", "Twenterand", "Wierden", "Zwartewaterland", "Zwolle"],
    "Utrecht": ["Amersfoort", "Baarn", "Bunnik", "Bunschoten", "De Bilt", "De Ronde Venen", "Eemnes", "Houten", "IJsselstein", "Leusden", "Lopik", "Montfoort", "Nieuwegein", "Oudewater", "Renswoude", "Rhenen", "Soest", "Stichtse Vecht", "Utrecht", "Utrechtse Heuvelrug", "Veenendaal", "Vijfheerenlanden", "Wijk bij Duurstede", "Woerden", "Woudenberg", "Zeist"],
    "Zeeland": ["Borsele", "Goes", "Hulst", "Kapelle", "Middelburg", "Noord-Beveland", "Reimerswaal", "Schouwen-Duiveland", "Sluis", "Terneuzen", "Tholen", "Veere", "Vlissingen"],
    "Zuid-Holland": ["Alblasserdam", "Albrandswaard", "Alphen aan den Rijn", "Barendrecht", "Bodegraven-Reeuwijk", "Capelle aan den IJssel", "Delft", "Den Haag", "Dordrecht", "Goeree-Overflakkee", "Gorinchem", "Gouda", "Hardinxveld-Giessendam", "Hellevoetsluis", "Hendrik-Ido-Ambacht", "Hillegom", "Hoeksche Waard", "Kaag en Braassem", "Katwijk", "Krimpen aan den IJssel", "Krimpenerwaard", "Lansingerland", "Leiden", "Leiderdorp", "Leidschendam-Voorburg", "Lisse", "Maassluis", "Midden-Delfland", "Nieuwkoop", "Nissewaard", "Noordwijk", "Oegstgeest", "Papendrecht", "Pijnacker-Nootdorp", "Ridderkerk", "Rijswijk", "Rotterdam", "Schiedam", "Sliedrecht", "Teylingen", "Vlaardingen", "Voorschoten", "Waddinxveen", "Wassenaar", "Westland", "Westvoorne", "Zoetermeer", "Zoeterwoude", "Zuidplas", "Zwijndrecht"]
};

// Each page returns HTML; an optional `bind` wires up forms after render.
const pages = {
    home: () => grid('Popular', joined()),

    category: () => {
        const gen = q.get('gen') || '', cat = q.get('cat') || '';
        return grid(`${h(gen)} ${h(cat)}`, joined().filter(p => (!gen || p.gender === gen) && (!cat || p.category === cat)));
    },

    product: () => {
        const p = joined().find(p => p.product_id == q.get('id'));
        if (!p) return 'Product not found.';
        return `<div class="product-container">
            <a href="?page=home"><button type="button">&lt;</button></a>
            <div class="product-details">
                <h2>${h(p.product_name)}</h2>
                <p><strong>Gender:</strong> ${h(p.gender)}</p>
                <p><strong>Brand:</strong> ${h(p.brand)}</p>
                <p><strong>Category:</strong> ${h(p.category)}</p>
                <p class="price"><strong>Price:</strong> €${eur(p.price)}</p>
                <a href="${cartLink(p)}" class="add-to-cart">Toevoegen aan Winkelwagen</a>
            </div>
            <div class="product-image"><img src="${h(img(p.image))}" alt="${h(p.product_name)}"></div>
        </div>`;
    },

    cart: () => {
        const add = db.products.find(p => p.product_id == q.get('product_id'));
        if (add) {
            const item = S.cart.find(i => i.id === add.product_id);
            item ? item.quantity++ : S.cart.push({ id: add.product_id, name: add.product_name, price: add.price, image: add.image, quantity: 1 });
            save(); return go('?page=cart');
        }
        if (q.get('update_id')) {
            const item = S.cart.find(i => i.id == q.get('update_id'));
            if (item) { item.quantity += q.get('action') === 'increase' ? 1 : -1; S.cart = S.cart.filter(i => i.quantity > 0); }
            save(); return go('?page=cart');
        }
        const total = S.cart.reduce((t, i) => t + i.price * i.quantity, 0);
        return `<div class="cart-section">
            <h2>Winkelwagen ${S.cart.length ? `(€${eur(total)})` : ''}</h2>
            <div class="cart-items">${S.cart.length ? S.cart.map(i => `
                <div class="cart-item">
                    <img class="image-container" src="${h(img(i.image))}" alt="${h(i.name)}">
                    <div class="cart-info">
                        <h3 style="color: #0f1111">${h(i.name)}</h3>
                        <p class="price">&euro;${eur(i.price)}</p>
                        <p class="quantity">Aantal:
                            <a href="?page=cart&update_id=${i.id}&action=decrease" class="quantity-btn">◀</a>
                            ${i.quantity}
                            <a href="?page=cart&update_id=${i.id}&action=increase" class="quantity-btn">▶</a>
                        </p>
                    </div>
                </div>`).join('') : '<p>Je winkelwagen is leeg.</p>'}
            </div>
            <form class="checkout-form" id="checkout">
                <div class="form-group">
                    <label>Email</label><input type="email" placeholder="jan.jansen@example.com" required name="email" value="${h(S.email)}">
                    <label>Straat en Huisnummer</label><input type="text" required name="straat_en_huisnummer">
                    <label>Telefoon Nummer</label><input type="text" placeholder="+31" required name="t.nummer">
                    <label>Postcode</label><input type="text" required name="postcode">
                    <div>
                        <label>Provincie</label><select id="provincie" required name="provincie"><option value="">Selecteer een provincie </option>
                            ${Object.keys(PROVINCIES).map(p => `<option>${p}</option>`).join('')}</select>
                        <label>Gemeente</label><select id="gemeente" required disabled name="gemeente"><option value="">Selecteer een gemeente</option></select>
                    </div>
                    <label>Betaalmethode</label><br>
                    <div class="form-group">
                        <label for="idealRadio">iDEAL</label><input type="radio" id="idealRadio" name="paymentMethod" value="ideal" checked>
                        <label for="cardRadio">Creditcard</label><input type="radio" id="cardRadio" name="paymentMethod" value="card">
                    </div>
                    <div id="idealSection"><label>Uw Bank</label><select required name="idealBank">
                        ${['Kies een Bank...', 'ABN AMRO', 'ASN Bank', 'Bunq', 'ING', 'Knab', 'Moneyou', 'Rabobank', 'Regiobank', 'SNS', 'Svenska Hadelsbanken', 'Tridos Bank', 'Van Lanschot'].map(b => `<option>${b}</option>`).join('')}</select></div>
                    <div id="cardSection" style="display: none;">
                        <label>Kaartnummer</label><input type="text" name="kaartnummer" id="kaartnummer" maxlength="19" placeholder="1234 5678 9012 3456">
                        <label>Exp. Maand</label><input type="month" name="exp_date">
                        <label>CVV</label><input type="text" name="cvv" maxlength="3">
                    </div>
                </div>
                <button type="submit">Betalen</button>
            </form>
        </div>`;
    },

    login: () => `<div class="content"><form id="login"><div class="login">
        E-mail <input type="text" placeholder="gebruikersnaam@bookonshelf.nl" name="email">
        Wachtwoord <input type="password" placeholder="Wachtwoord" name="pword">
        <button type="submit">Login</button>
        <small>Demo: admin@vd.nl / admin &middot; klant@vd.nl / klant</small>
    </div></form></div>`,

    register: () => `<form id="register"><div class="login">
        Email <input type="email" placeholder="jan.jansen@example.com" name="email" required>
        Wachtwoord <input type="password" placeholder="********" name="pword" required>
        <button type="submit">Register</button>
    </div></form>`,

    profile: () => {
        if (!S.user_id) return go('?page=login');
        const u = db.users.find(u => u.user_id === S.user_id) || {};
        const orders = db.orders.filter(o => o.user_email === S.email).reverse();
        return `<div class="profile-container">
            <h1>Profielgegevens</h1>
            ${q.get('updated') ? '<div class="success-message">Profiel succesvol bijgewerkt!</div>' : ''}
            <form id="profile" class="profile-form">
                <div class="form-group"><label for="name">Naam:</label><input type="text" id="name" name="name" value="${h(u.name)}" required></div>
                <div class="form-group"><label for="email">E-mailadres:</label><input type="email" id="email" name="email" value="${h(u.email)}" required></div>
                <div class="form-group"><label for="adres">Adres:</label><textarea id="adres" name="adres" rows="3">${h(u.adres)}</textarea></div>
                <button type="submit" class="button">Profiel Bijwerken</button>
            </form>
            <div class="orders-section"><h2>Mijn Bestellingen</h2>
                ${orders.length ? `<div class="orders-list">${orders.map(o => `<div class="order-item">
                    <p>Bestelnummer: #${o.order_id}</p><p>Datum: ${new Date(o.order_date).toLocaleDateString('nl-NL')}</p>
                    <p>Status: ${h(o.status)}</p><p>Totaalbedrag: €${o.total_amount.toFixed(2)}</p>
                    <p>Verzendadres: ${h(o.shipping_address)}</p><p>Betaalmethode: ${h(o.billing_methode)}</p>
                    <div class="order-items"><h4>Producten:</h4>${db.order_items.filter(i => i.order_id === o.order_id).map(i =>
                        `<p>${h(i.product_name)} - €${i.unit_price.toFixed(2)} x ${i.quantity} = €${i.line_total.toFixed(2)}</p>`).join('')}</div>
                </div>`).join('')}</div>` : '<p>U heeft nog geen bestellingen geplaatst.</p>'}
            </div>
        </div>
        <style>
            .profile-container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .profile-form { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .form-group input, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            .success-message { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
            .orders-section { margin-top: 30px; }
            .order-item { background: #f8f9fa; padding: 15px; margin-bottom: 15px; border-radius: 4px; border: 1px solid #ddd; }
            .order-items { margin-top: 10px; padding: 10px; background: #fff; border-radius: 4px; }
            .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
            .button:hover { background: #0056b3; }
        </style>`;
    },

    product_overview: () => `<h2>Producten Overzicht</h2>
        <table style="color: #0f1111"><thead><tr style="color: #e60000"><th>Merk</th><th>Product Naam</th><th>Categorie</th><th>Gender</th><th>Prijs</th></tr></thead>
        <tbody>${joined().map(p => `<tr><td>${h(p.brand)}</td><td>${h(p.product_name)}</td><td>${h(p.category)}</td><td>${h(p.gender)}</td><td>€${eur(p.price)}</td>
            <td><a href="?page=edit_product&id=${p.product_id}">Edit</a> | <a href="#" data-delete-product="${p.product_id}">Verwijderen</a></td></tr>`).join('')}</tbody></table>`,

    add_product: () => `<h2>Product Toevoegen</h2>
        <form id="add_product">
            <label for="brand">Brand:</label>
            <select name="brand"><option value="">Kies een Brand</option>${options(db.brand, 'brand')}</select>
            <input type="text" name="new_brand" placeholder="Of schrijf nieuwe brand-naam"><br><br>
            <label for="product_name">Product Naam:</label><input type="text" name="product_name" required><br><br>
            <label for="price">Prijs:</label><input type="number" name="price" step="0.01" min="0" required><br><br>
            <label for="categorie">Categorie:</label><select name="categorie" required>${options(db.categorie, 'category')}</select><br><br>
            <label for="gender">Gender:</label><select name="gender" required>${options(db.gender, 'gender')}</select><br><br>
            <label for="image">Beeld:</label><input type="file" name="image" accept="image/*" required><br><br>
            <input type="submit" value="Add Product">
        </form>`,

    edit_product: () => {
        const p = db.products.find(p => p.product_id == q.get('id'));
        if (!p) return 'Product not found.';
        return `<h2>Edit Product</h2><form id="edit_product">
            <label>Product Naam:</label><input type="text" name="product_name" value="${h(p.product_name)}" required><br>
            <label>Merk:</label><select name="brand_id" required>${options(db.brand, 'brand', p.brand_id)}</select><br>
            <label>Categorie:</label><select name="categorie_id" required>${options(db.categorie, 'category', p.categorie_id)}</select><br>
            <label>Gender:</label><select name="gender_id" required>${options(db.gender, 'gender', p.gender_id)}</select><br>
            <label>Prijs (€):</label><input type="number" step="0.01" min="0" name="price" value="${p.price}" required><br>
            <button type="submit">Save Changes</button></form>`;
    },

    manage_categories: () => `<h2>Categorieën Beheren</h2>
        ${S.error_message ? `<p style="color: red;">${h(S.error_message)}</p>` : ''}
        <form id="add_category"><label for="category_name">Categorie Toevoegen:</label>
            <input type="text" id="category_name" name="category_name" required><button type="submit">Toevoegen</button></form>
        <h3 style="color: #0f1111">Categorieën</h3>
        <table style="color:black"><tbody>${db.categorie.map(c => `<tr><td>${h(c.category)}</td>
            <td><a href="?page=edit_category&id=${c.category_id}">Edit</a> | <a href="#" data-delete-category="${c.category_id}">Verwijderen</a></td></tr>`).join('')}</tbody></table>`,

    edit_category: () => {
        const c = db.categorie.find(c => c.category_id == q.get('id'));
        if (!c) return 'Category not found.';
        return `<h2>Edit Categorie</h2><form id="edit_category"><label for="category_name">Naam:</label>
            <input type="text" id="category_name" name="category_name" value="${h(c.category)}" required>
            <button type="submit">Update</button></form>`;
    },

    orders: () => `<h2>Bestellingen</h2>
        <table style="color: #0f1111; border-collapse: collapse;" border="1" cellpadding="8" cellspacing="0">
        <thead><tr><th>Order ID</th><th>Klant</th><th>Status</th><th>Verzendadres</th><th>Betaalmethode</th><th>Producten</th></tr></thead>
        <tbody>${db.orders.map(o => {
            const items = db.order_items.filter(i => i.order_id === o.order_id);
            return `<tr><td>${o.order_id}</td><td>${h(o.user_email)}</td><td>${h(o.status)}</td><td>${h(o.shipping_address)}</td><td>${h(o.billing_methode)}</td><td>
                ${items.length ? `<table style="color: #0f1111;" border="1" cellpadding="8" cellspacing="0">
                    <tr><th>Product ID</th><th>Product Naam</th><th>Eenheidsprijs</th><th>Aantal</th><th>Totaal</th></tr>
                    ${items.map(i => `<tr><td>${i.product_id}</td><td>${h(i.product_name)}</td><td>${i.unit_price}</td><td>${i.quantity}</td><td>${i.line_total}</td></tr>`).join('')}</table>` : 'Geen producten'}
            </td></tr>`;
        }).join('')}</tbody></table>`,
};
const ADMIN_ONLY = ['product_overview', 'add_product', 'edit_product', 'manage_categories', 'edit_category', 'orders'];

const forms = {
    login(f) {
        const u = db.users.find(u => u.email === f.email);
        if (!f.email || !f.pword) return alert('Gebruikersnaam en wachtwoord zijn vereist.');
        if (!u) return alert('Gebruiker niet gevonden.');
        if (u.wachtwoord !== f.pword) return alert('Onjuiste wachtwoord.');
        Object.assign(S, { Role: u.role, Username: `${u.voornaam ?? ''} ${u.achternaam ?? ''}`.trim(), user_id: u.user_id, email: u.email });
        save(); go(u.role === 'admin' ? '?page=product_overview' : '?page=home');
    },
    register(f) {
        if (db.users.some(u => u.email === f.email)) return alert('Dit e-mailadres is al geregistreerd.');
        const u = { user_id: nextId(db.users, 'user_id'), email: f.email, wachtwoord: f.pword, role: 'klant', name: '', adres: '' };
        db.users.push(u);
        Object.assign(S, { Role: 'klant', user_id: u.user_id, email: u.email });
        save(); go('?page=home');
    },
    checkout(f) {
        if (!S.cart.length) return alert('Je winkelwagen is leeg.');
        const order_id = nextId(db.orders, 'order_id');
        const total_amount = S.cart.reduce((t, i) => t + i.price * i.quantity, 0);
        db.orders.push({ order_id, user_email: f.email, total_amount, order_date: Date.now(), status: 'new',
            shipping_address: `${f.straat_en_huisnummer}, ${f.postcode}, ${f.gemeente}, ${f.provincie}`, billing_methode: f.paymentMethod });
        S.cart.forEach(i => db.order_items.push({ order_id, product_id: i.id, product_name: i.name, unit_price: i.price, quantity: i.quantity, line_total: i.price * i.quantity }));
        S.cart = []; save();
        alert(`Gelukt! Order ID: ${order_id}`); go('?page=home');
    },
    profile(f) {
        const u = db.users.find(u => u.user_id === S.user_id);
        Object.assign(u, { name: f.name, email: f.email, adres: f.adres }); S.email = f.email;
        save(); go('?page=profile&updated=true');
    },
    async add_product(f, el) {
        let brand_id = +f.brand;
        if (f.new_brand) { brand_id = nextId(db.brand, 'brand_id'); db.brand.push({ brand_id, brand: f.new_brand }); }
        if (!brand_id) return alert('Kies een Brand.');
        const image = await fileToData(el.image.files[0]);
        db.products.push({ product_id: nextId(db.products, 'product_id'), product_name: f.product_name, price: +f.price,
            brand_id, categorie_id: +f.categorie, gender_id: +f.gender, image });
        save(); go('?page=product_overview');
    },
    edit_product(f) {
        Object.assign(db.products.find(p => p.product_id == q.get('id')),
            { product_name: f.product_name, brand_id: +f.brand_id, categorie_id: +f.categorie_id, gender_id: +f.gender_id, price: +f.price });
        save(); go('?page=product_overview');
    },
    add_category(f) {
        if (db.categorie.some(c => c.category === f.category_name)) S.error_message = `Error: Category '${f.category_name}' already exists!`;
        else db.categorie.push({ category_id: nextId(db.categorie, 'category_id'), category: f.category_name });
        save(); go('?page=manage_categories');
    },
    edit_category(f) {
        db.categorie.find(c => c.category_id == q.get('id')).category = f.category_name;
        save(); go('?page=manage_categories');
    },
};

function bindCart() {
    const prov = document.getElementById('provincie'), gem = document.getElementById('gemeente');
    if (!prov) return;
    prov.addEventListener('change', () => {
        gem.innerHTML = '<option value="">Selecteer een gemeente</option>' + (PROVINCIES[prov.value] || []).map(g => `<option>${h(g)}</option>`).join('');
        gem.disabled = !prov.value;
    });
    const toggle = () => {
        const card = document.getElementById('cardRadio').checked;
        document.getElementById('idealSection').style.display = card ? 'none' : 'block';
        document.getElementById('cardSection').style.display = card ? 'block' : 'none';
    };
    document.getElementById('idealRadio').addEventListener('change', toggle);
    document.getElementById('cardRadio').addEventListener('change', toggle);
    document.getElementById('kaartnummer').addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 16).replace(/(.{4})/g, '$1 ').trim();
    });
}

function render() {
    if (q.has('logout')) { for (const k in S) delete S[k]; S.cart = []; save(); return go('?page=home'); }
    let page = q.get('page') || 'home';
    if (ADMIN_ONLY.includes(page) && !isAdmin()) page = 'home';
    const html = (pages[page] || pages.home)();
    if (html === undefined) return; // page redirected
    renderAuth(); renderNavbar();
    document.getElementById('page').innerHTML = html;
    if (page === 'manage_categories' && S.error_message) { delete S.error_message; save(); }
    if (page === 'cart') bindCart();

    document.querySelectorAll('#page form[id]').forEach(el => el.addEventListener('submit', e => {
        e.preventDefault();
        forms[el.id]?.(Object.fromEntries(new FormData(el)), el);
    }));
    document.querySelectorAll('[data-delete-product]').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        if (!confirm('Wil je echt verwijderen ?')) return;
        db.products = db.products.filter(p => p.product_id != a.dataset.deleteProduct); save(); go('?page=product_overview');
    }));
    document.querySelectorAll('[data-delete-category]').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const id = +a.dataset.deleteCategory, n = db.products.filter(p => p.categorie_id === id).length;
        if (n && !confirm(`In deze categorie staan ${n} producten. Wil je het echt verwijderen?`)) return;
        db.categorie = db.categorie.filter(c => c.category_id !== id); save(); go('?page=manage_categories');
    }));
}
render();
