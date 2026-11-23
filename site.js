// Shared portfolio script: NL/EN/TR translations, the language switcher, and a deferred
// load of the ASCII background (bundle.js) so it never blocks the first paint.
const I18N = {
    en: {
        'nav.home': 'Home', 'nav.about': 'About', 'nav.works': 'Projects', 'nav.contact': 'Contact', 'nav.lang': 'Language',
        'index.tagline': 'Software developer & designer — web, UI/UX and games.',
        'index.worksTitle': 'Projects',
        'index.allTitle': 'All projects',
        'index.allDesc': '8 school projects, 6 with a live demo: PokéTrader, DiVo, GreenShift and more',
        'index.contact': 'Get in touch',

        'about.title': 'About me',
        'about.p1': 'Hello! My name is <span class="eren">Eren</span><span class="aygen"> Aygen</span>, and I am a <strong>software developer and designer</strong> passionate about creating innovative and user-friendly digital experiences. My focus is <strong>web development, UI/UX design and game development</strong>, where I combine technical skills with creativity to bring ideas to life.',
        'about.p2': 'I work with <strong>HTML, CSS, JavaScript, PHP and MySQL</strong>, and with design tools like <strong>Canva, Photoshop and Illustrator</strong>. Whether it is a functional, good-looking website or an intuitive interface, I enjoy every step of the creative process.',
        'about.skills': 'Tools I use',
        'about.visionTitle': 'My work & vision',
        'about.vision': 'Great design and well-written code go hand in hand. My goal is to <strong>build engaging and efficient digital products</strong> that make things easier for people. In the future I want to start my own <strong>software and game development company</strong>.',
        'about.factsTitle': 'A few things about me',
        'about.f1': '<i class="bi bi-controller" aria-hidden="true"></i> Passionate about gaming, especially football and Formula 1 games.',
        'about.f2': '<i class="bi bi-speedometer2" aria-hidden="true"></i> New <strong>Formula 1</strong> fan — my newest hobby.',
        'about.f3': '<i class="bi bi-palette" aria-hidden="true"></i> Always experimenting with new design ideas and UI concepts.',
        'about.contactTitle': 'Contact',
        'about.contact': 'Want to <strong>work together</strong> or just say hi? Find me here:',

        'works.title': 'Projects',
        'works.intro': 'School projects from the Rijn IJssel software development course. The PHP + MySQL originals are rebuilt here as working static demos, so you can click through them.',
        'works.filter.all': 'All', 'works.filter.demo': 'Live demo', 'works.filter.team': 'Team', 'works.filter.php': 'PHP',
        'works.demo': 'Live demo', 'works.gitlab': 'GitLab', 'works.gitlabNote': 'School GitLab — needs a school login',
        'works.noDemo': 'No demo yet', 'works.wip': 'In progress', 'works.team': 'Team',
        'works.empty': 'No projects match this filter.',
        'p.tournament.desc': 'App for creating and managing tournaments and leagues.',
        'p.tournament.note': 'Just started — the repository has no code yet.',
        'p.divo.desc': 'Digital voting app for the Dutch House of Representatives elections.',
        'p.divo.note': 'Highlights: 3-choice preference vote with rule checks, party and candidate management with automatic list order, voting period, a seeder for 100,000 votes and a D3 seat chart.',
        'p.greenshift.desc': 'Driving school with electric cars.',
        'p.greenshift.note': 'Highlights: instructor approval flow, FullCalendar availability and booking, lesson packages and a (simulated) checkout.',
        'p.poketrader.desc': 'Auction platform for rare Pokémon cards.',
        'p.poketrader.note': 'Team project with Emir Aşçı and Nathaniel Flier. Live card data from the Pokémon TCG API and a PokéDollar wallet.',
        'p.gamepc.desc': 'Build your own gaming PC from parts.',
        'p.gamepc.note': 'Team project with Ahmad Eknan and Wang An Yang. Three roles (customer, admin, worker), a PC builder wizard and phone orders.',
        'p.webshop.desc': 'E-commerce store for V&D.',
        'p.webshop.note': 'Highlights: product and category management, cart and checkout with a province and municipality picker.',
        'p.bos.desc': 'Library app for borrowing books.',
        'p.bos.note': 'Highlights: lending rules (max. 3 books), reservations that turn into loans, book management.',
        'p.gimpies.desc': 'Sales system for a sneaker store.',
        'p.gimpies.note': 'The repository is empty, so there is no demo.',

        'search.title': 'Search',
        'search.label': 'Search Google', 'search.placeholder': 'Search Google…', 'search.hint': 'Press <kbd>/</kbd> to focus',
        'search.night': 'Good night', 'search.morning': 'Good morning', 'search.afternoon': 'Good afternoon', 'search.evening': 'Good evening',
    },
    nl: {
        'nav.home': 'Home', 'nav.about': 'Over mij', 'nav.works': 'Projecten', 'nav.contact': 'Contact', 'nav.lang': 'Taal',
        'index.tagline': 'Softwareontwikkelaar & ontwerper — web, UI/UX en games.',
        'index.worksTitle': 'Projecten',
        'index.allTitle': 'Alle projecten',
        'index.allDesc': '8 schoolprojecten, 6 met een live demo: PokéTrader, DiVo, GreenShift en meer',
        'index.contact': 'Neem contact op',

        'about.title': 'Over mij',
        'about.p1': 'Hoi! Mijn naam is <span class="eren">Eren</span><span class="aygen"> Aygen</span>, ik ben <strong>softwareontwikkelaar en ontwerper</strong> en ik maak graag vernieuwende, gebruiksvriendelijke digitale ervaringen. Mijn focus ligt op <strong>webontwikkeling, UI/UX-design en gameontwikkeling</strong>, waar ik techniek en creativiteit combineer.',
        'about.p2': 'Ik werk met <strong>HTML, CSS, JavaScript, PHP en MySQL</strong>, en met ontwerptools als <strong>Canva, Photoshop en Illustrator</strong>. Of het nu een functionele, mooie website is of een intuïtieve interface: ik geniet van elke stap van het creatieve proces.',
        'about.skills': 'Tools die ik gebruik',
        'about.visionTitle': 'Mijn werk & visie',
        'about.vision': 'Goed design en goed geschreven code gaan hand in hand. Mijn doel is om <strong>boeiende en efficiënte digitale producten</strong> te bouwen die het leven makkelijker maken. Later wil ik mijn eigen <strong>software- en gamebedrijf</strong> beginnen.',
        'about.factsTitle': 'Een paar dingen over mij',
        'about.f1': '<i class="bi bi-controller" aria-hidden="true"></i> Gek op gamen, vooral voetbal- en Formule 1-games.',
        'about.f2': '<i class="bi bi-speedometer2" aria-hidden="true"></i> Nieuwe <strong>Formule 1</strong>-fan — mijn nieuwste hobby.',
        'about.f3': '<i class="bi bi-palette" aria-hidden="true"></i> Altijd aan het experimenteren met nieuwe ontwerpideeën en UI-concepten.',
        'about.contactTitle': 'Contact',
        'about.contact': 'Wil je <strong>samenwerken</strong> of gewoon hoi zeggen? Hier vind je me:',

        'works.title': 'Projecten',
        'works.intro': 'Schoolprojecten van de opleiding Software Developer bij Rijn IJssel. De originele PHP + MySQL-projecten zijn hier nagebouwd als werkende statische demo’s, zodat je er doorheen kunt klikken.',
        'works.filter.all': 'Alles', 'works.filter.demo': 'Live demo', 'works.filter.team': 'Team', 'works.filter.php': 'PHP',
        'works.demo': 'Live demo', 'works.gitlab': 'GitLab', 'works.gitlabNote': 'School-GitLab — schoollogin nodig',
        'works.noDemo': 'Nog geen demo', 'works.wip': 'Bezig', 'works.team': 'Team',
        'works.empty': 'Geen projecten voor dit filter.',
        'p.tournament.desc': 'App om toernooien en competities te maken en te beheren.',
        'p.tournament.note': 'Net begonnen — er staat nog geen code in de repository.',
        'p.divo.desc': 'Digitale stemapp voor de Tweede Kamerverkiezingen.',
        'p.divo.note': 'Hoogtepunten: voorkeursstem met 3 keuzes en regelcontrole, partij- en kandidaatbeheer met automatische lijstvolgorde, stemperiode, een seeder voor 100.000 stemmen en een D3-zetelgrafiek.',
        'p.greenshift.desc': 'Rijschool met elektrische auto’s.',
        'p.greenshift.note': 'Hoogtepunten: goedkeuring door instructeurs, beschikbaarheid en boeken met FullCalendar, lespakketten en een (gesimuleerde) betaling.',
        'p.poketrader.desc': 'Veilingplatform voor zeldzame Pokémonkaarten.',
        'p.poketrader.note': 'Teamproject met Emir Aşçı en Nathaniel Flier. Live kaartdata uit de Pokémon TCG API en een PokéDollar-wallet.',
        'p.gamepc.desc': 'Stel je eigen game-pc samen uit onderdelen.',
        'p.gamepc.note': 'Teamproject met Ahmad Eknan en Wang An Yang. Drie rollen (klant, admin, medewerker), een pc-bouwwizard en telefonische bestellingen.',
        'p.webshop.desc': 'Webshop voor de V&D.',
        'p.webshop.note': 'Hoogtepunten: product- en categoriebeheer, winkelwagen en afrekenen met provincie- en gemeentekeuze.',
        'p.bos.desc': 'Bibliotheekapp om boeken te lenen.',
        'p.bos.note': 'Hoogtepunten: leenregels (max. 3 boeken), reserveringen die automatisch leningen worden, boekbeheer.',
        'p.gimpies.desc': 'Verkoopsysteem voor een sneakerwinkel.',
        'p.gimpies.note': 'De repository is leeg, dus er is geen demo.',

        'search.title': 'Zoeken',
        'search.label': 'Zoeken met Google', 'search.placeholder': 'Zoeken met Google…', 'search.hint': 'Druk op <kbd>/</kbd> om te zoeken',
        'search.night': 'Goedenacht', 'search.morning': 'Goedemorgen', 'search.afternoon': 'Goedemiddag', 'search.evening': 'Goedenavond',
    },
    tr: {
        'nav.home': 'Ana sayfa', 'nav.about': 'Hakkımda', 'nav.works': 'Projeler', 'nav.contact': 'İletişim', 'nav.lang': 'Dil',
        'index.tagline': 'Yazılım geliştirici & tasarımcı — web, UI/UX ve oyun.',
        'index.worksTitle': 'Projeler',
        'index.allTitle': 'Tüm projeler',
        'index.allDesc': '8 okul projesi, 6’sı canlı demolu: PokéTrader, DiVo, GreenShift ve dahası',
        'index.contact': 'İletişime geç',

        'about.title': 'Hakkımda',
        'about.p1': 'Merhaba! Ben <span class="eren">Eren</span><span class="aygen"> Aygen</span>; yenilikçi ve kullanıcı dostu dijital deneyimler üretmeyi seven bir <strong>yazılım geliştirici ve tasarımcıyım</strong>. Odağım <strong>web geliştirme, UI/UX tasarım ve oyun geliştirme</strong>; teknik becerilerle yaratıcılığı birleştirerek fikirleri hayata geçiriyorum.',
        'about.p2': '<strong>HTML, CSS, JavaScript, PHP ve MySQL</strong> ile, tasarımda da <strong>Canva, Photoshop ve Illustrator</strong> ile çalışıyorum. İster işlevsel ve şık bir web sitesi, ister sezgisel bir arayüz olsun; yaratıcı sürecin her adımından keyif alıyorum.',
        'about.skills': 'Kullandığım araçlar',
        'about.visionTitle': 'İşim & vizyonum',
        'about.vision': 'İyi tasarım ile iyi yazılmış kod el ele gider. Hedefim insanların işini kolaylaştıran <strong>etkileyici ve verimli dijital ürünler</strong> geliştirmek. İleride kendi <strong>yazılım ve oyun geliştirme şirketimi</strong> kurmak istiyorum.',
        'about.factsTitle': 'Benim hakkımda birkaç şey',
        'about.f1': '<i class="bi bi-controller" aria-hidden="true"></i> Oyun tutkunuyum, özellikle futbol ve Formula 1 oyunları.',
        'about.f2': '<i class="bi bi-speedometer2" aria-hidden="true"></i> Yeni <strong>Formula 1</strong> hayranıyım — en yeni hobim.',
        'about.f3': '<i class="bi bi-palette" aria-hidden="true"></i> Sürekli yeni tasarım fikirleri ve arayüz konseptleri deniyorum.',
        'about.contactTitle': 'İletişim',
        'about.contact': '<strong>Birlikte çalışmak</strong> ya da sadece merhaba demek mi istiyorsun? Beni burada bulabilirsin:',

        'works.title': 'Projeler',
        'works.intro': 'Rijn IJssel yazılım geliştirme bölümündeki okul projelerim. Orijinal PHP + MySQL projeleri burada çalışan statik demolar olarak yeniden kuruldu, içinde gezinebilirsin.',
        'works.filter.all': 'Tümü', 'works.filter.demo': 'Canlı demo', 'works.filter.team': 'Takım', 'works.filter.php': 'PHP',
        'works.demo': 'Canlı demo', 'works.gitlab': 'GitLab', 'works.gitlabNote': 'Okul GitLab’ı — okul girişi gerekir',
        'works.noDemo': 'Henüz demo yok', 'works.wip': 'Devam ediyor', 'works.team': 'Takım',
        'works.empty': 'Bu filtreye uyan proje yok.',
        'p.tournament.desc': 'Turnuva ve lig oluşturup yönetmek için uygulama.',
        'p.tournament.note': 'Yeni başladı — repoda henüz kod yok.',
        'p.divo.desc': 'Hollanda Tweede Kamer seçimleri için dijital oylama uygulaması.',
        'p.divo.note': 'Öne çıkanlar: kural kontrollü 3 tercihli oy, otomatik liste sıralamalı parti ve aday yönetimi, oy dönemi, 100.000 oyluk seeder ve D3 sandalye grafiği.',
        'p.greenshift.desc': 'Elektrikli araçlarla sürüş okulu.',
        'p.greenshift.note': 'Öne çıkanlar: eğitmen onay akışı, FullCalendar ile müsaitlik ve rezervasyon, ders paketleri ve (simüle) ödeme.',
        'p.poketrader.desc': 'Nadir Pokémon kartları için açık artırma platformu.',
        'p.poketrader.note': 'Emir Aşçı ve Nathaniel Flier ile takım projesi. Pokémon TCG API’den canlı kart verisi ve PokéDollar cüzdanı.',
        'p.gamepc.desc': 'Parça seçerek kendi oyun bilgisayarını topla.',
        'p.gamepc.note': 'Ahmad Eknan ve Wang An Yang ile takım projesi. Üç rol (müşteri, admin, çalışan), PC toplama sihirbazı ve telefonla sipariş.',
        'p.webshop.desc': 'V&D için e-ticaret sitesi.',
        'p.webshop.note': 'Öne çıkanlar: ürün ve kategori yönetimi, il ve belediye seçimli sepet ve ödeme.',
        'p.bos.desc': 'Kitap ödünç alınabilen kütüphane uygulaması.',
        'p.bos.note': 'Öne çıkanlar: ödünç kuralları (en fazla 3 kitap), ödünce dönüşen rezervasyonlar, kitap yönetimi.',
        'p.gimpies.desc': 'Sneaker mağazası için satış sistemi.',
        'p.gimpies.note': 'Repo boş olduğu için demo yok.',

        'search.title': 'Ara',
        'search.label': 'Google’da ara', 'search.placeholder': 'Google’da ara…', 'search.hint': 'Odaklanmak için <kbd>/</kbd>',
        'search.night': 'İyi geceler', 'search.morning': 'Günaydın', 'search.afternoon': 'İyi günler', 'search.evening': 'İyi akşamlar',
    },
};
const LANGS = ['nl', 'en', 'tr'];

function getLang() {
    const fromUrl = new URLSearchParams(location.search).get('lang'); // shareable links, e.g. index.html?lang=nl#projects
    if (LANGS.includes(fromUrl)) return fromUrl;
    try { const l = localStorage.getItem('lang'); if (LANGS.includes(l)) return l; } catch { }
    return 'en';
}
const t = key => I18N[getLang()][key] ?? I18N.en[key] ?? key;

function applyLang(lang) {
    try { localStorage.setItem('lang', lang); } catch { }
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); }); // dictionary is ours, not user input
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        for (const pair of el.dataset.i18nAttr.split(';')) { const [attr, key] = pair.split(':'); el.setAttribute(attr, t(key)); }
    });
    document.querySelectorAll('.lang-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

document.querySelectorAll('.lang-switch button').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));
applyLang(getLang());

// ASCII background: an injected script is async, so it never blocks the first paint.
// Skipped on small screens and with data saver on.
if (document.getElementById('hero') && !navigator.connection?.saveData && !matchMedia('(max-width: 480px)').matches) {
    const s = document.createElement('script');
    s.src = 'bundle.js';
    document.body.appendChild(s);
}
