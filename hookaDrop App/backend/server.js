const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// ── Persistence helpers ─────────────────────────────────────────────────────
const DATA_DIR      = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const UPLOADS_DIR   = path.join(__dirname, '..', 'article', 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function loadProducts() {
    try {
        if (fs.existsSync(PRODUCTS_FILE)) {
            const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
            const saved = JSON.parse(raw);
            if (Array.isArray(saved) && saved.length > 0) return saved;
        }
    } catch (e) {
        console.error('[data] Failed to load products.json:', e.message);
    }
    return null; // fall back to hardcoded mock
}

function saveProducts(list) {
    try {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
        console.error('[data] Failed to save products.json:', e.message);
    }
}

// ── Multipart parser (no dependencies) ─────────────────────────────────────
function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) return reject(new Error('No boundary'));
        const boundary = '--' + boundaryMatch[1];

        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            const body   = Buffer.concat(chunks);
            const fields = {};
            let   fileBuffer = null;
            let   fileName   = '';
            let   fileMime   = 'application/octet-stream';

            const delimiter = Buffer.from('\r\n' + boundary);
            let start = body.indexOf(boundary) + boundary.length + 2; // skip first boundary + CRLF

            while (start < body.length) {
                let end = body.indexOf(delimiter, start);
                if (end === -1) end = body.length;
                const part = body.slice(start, end);

                // Split headers from body
                const headerEnd = part.indexOf('\r\n\r\n');
                if (headerEnd === -1) { start = end + delimiter.length + 2; continue; }

                const headerStr = part.slice(0, headerEnd).toString();
                const partBody  = part.slice(headerEnd + 4);

                const dispMatch = headerStr.match(/Content-Disposition:[^\r\n]*name="([^"]+)"/i);
                const fileMatch = headerStr.match(/filename="([^"]+)"/i);
                const mimeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

                if (dispMatch) {
                    const fieldName = dispMatch[1];
                    if (fileMatch) {
                        fileName   = fileMatch[1];
                        fileMime   = mimeMatch ? mimeMatch[1].trim() : 'application/octet-stream';
                        fileBuffer = partBody;
                    } else {
                        fields[fieldName] = partBody.toString().trim();
                    }
                }
                start = end + delimiter.length + 2;
            }
            resolve({ fields, fileBuffer, fileName, fileMime });
        });
        req.on('error', reject);
    });
}

const PORT = process.env.PORT || 8000;

// Mock Database
const users = [
    { _id: "usr_1", name: "Layth", email: "test@example.com", password: "password123" }
];

const categories = [
    { _id: "cat_1", id: "hookahs",   name: "Chichas",          icon: "ic_hookah",   productCount: 6 },
    { _id: "cat_2", id: "tobacco",   name: "Goûts & Tabacs",   icon: "ic_tobacco",  productCount: 5 },
    { _id: "cat_3", id: "coals",     name: "Charbons",         icon: "ic_flame",    productCount: 6 },
    { _id: "cat_4", id: "foyers",    name: "Foyers",           icon: "ic_foyer",    productCount: 8 },
    { _id: "cat_5", id: "cleaning",  name: "Accessoires",      icon: "ic_tool",     productCount: 5 },
    { _id: "cat_6", id: "fullpacks", name: "Packs Complets",   icon: "ic_package",  productCount: 5 }
];

const MOCK_PRODUCTS = [
    // ── HOOKAHS ──────────────────────────────────────────────────────────────
    {
        _id: "p1", id: "p1",
        name: "Aladin MVP 360",
        description: "The Aladin MVP 360 is a premium rotating hookah with a 360° swivel base. Made from high-grade stainless steel with a silicone hose and clay bowl included. Perfect for solo or group sessions.",
        price: 129.99, originalPrice: 159.99,
        image: "/images/hookah/Aladin MVP 360.png",
        categoryId: "hookahs", category: "hookahs",
        rating: 4.8, reviewCount: 142, isNew: true, discount: 19
    },
    {
        _id: "p2", id: "p2",
        name: "Celeste X3",
        description: "The Celeste X3 is an elegant crystal-glass hookah with a handcrafted base. Comes with premium silicone hose and wide-rim phunnel bowl. Ideal for connoisseurs who value aesthetics.",
        price: 89.99, originalPrice: 0.0,
        image: "/images/hookah/Celeste X3.png",
        categoryId: "hookahs", category: "hookahs",
        rating: 4.7, reviewCount: 98, isNew: false, discount: 0
    },
    {
        _id: "p7", id: "p7",
        name: "Chicha El Nefes Tahta",
        description: "The El Nefes Tahta is a sleek mid-size hookah combining Turkish craftsmanship with modern aesthetics. Anodized aluminum shaft, wide-bore hose port and a generous clay bowl make it a top pick for enthusiasts.",
        price: 109.99, originalPrice: 134.99,
        image: "/images/hookah/Chicha El Nefes Tahta.png",
        categoryId: "hookahs", category: "hookahs",
        rating: 4.6, reviewCount: 74, isNew: false, discount: 18
    },
    {
        _id: "p8", id: "p8",
        name: "Chicha Majordome Dandy Glass",
        description: "A statement piece — the Majordome Dandy Glass features a hand-blown borosilicate base with brass fittings. Built for long sessions with minimal draw resistance. Ships with a matching leather hose.",
        price: 179.99, originalPrice: 0.0,
        image: "/images/hookah/Chicha Majordome Dandy Glass.png",
        categoryId: "hookahs", category: "hookahs",
        rating: 4.9, reviewCount: 55, isNew: true, discount: 0
    },
    {
        _id: "p9", id: "p9",
        name: "El Nefes Sultan Colonial",
        description: "Inspired by Ottoman design, the Sultan Colonial delivers a rich, smooth draw. Polished stainless shaft with ornate engravings, wide diffuser base and premium food-grade silicone hose included.",
        price: 149.99, originalPrice: 179.99,
        image: "/images/hookah/El Nefes Sultan Colonial.png",
        categoryId: "hookahs", category: "hookahs",
        rating: 4.8, reviewCount: 112, isNew: false, discount: 17
    },
    {
        _id: "p10", id: "p10",
        name: "Mr Eds King E28",
        description: "The Mr Eds King E28 is a precision-engineered hookah with a powder-coated carbon steel shaft and reinforced downstem. The E28 delivers consistent airflow for sessions that last hours.",
        price: 99.99, originalPrice: 119.99,
        image: "/images/hookah/Mr Eds King E28.png",
        categoryId: "hookahs", category: "hookahs",
        rating: 4.5, reviewCount: 88, isNew: false, discount: 17
    },

    // ── TOBACCO ───────────────────────────────────────────────────────────────
    {
        _id: "p3", id: "p3",
        name: "Ways 200 Grammes",
        description: "Ways shisha tobacco — 200g pouch of premium double-apple flavored molasses. Smooth smoke with a natural fruity aroma. Compatible with all standard hookah bowls.",
        price: 24.99, originalPrice: 29.99,
        image: "/images/tobacco/ways 200-grammes.png",
        categoryId: "tobacco", category: "tobacco",
        rating: 4.9, reviewCount: 215, isNew: false, discount: 17
    },
    {
        _id: "p11", id: "p11",
        name: "Booster Ways",
        description: "Booster Ways is a high-nicotine tobacco booster designed to intensify any shisha blend. Add a small amount to your regular tobacco for a stronger hit and richer clouds. 50g tin.",
        price: 12.99, originalPrice: 0.0,
        image: "/images/tobacco/booster ways.png",
        categoryId: "tobacco", category: "tobacco",
        rating: 4.5, reviewCount: 134, isNew: false, discount: 0
    },
    {
        _id: "p12", id: "p12",
        name: "Ice Frutz 50",
        description: "Ice Frutz 50 is a steam paste — tobacco-free, 0% nicotine — packed with tropical fruit flavors and a cool menthol finish. 50g jar. Perfect for those who want full flavor without tobacco.",
        price: 9.99, originalPrice: 12.99,
        image: "/images/tobacco/ice frutz 50.png",
        categoryId: "tobacco", category: "tobacco",
        rating: 4.6, reviewCount: 189, isNew: true, discount: 23
    },
    {
        _id: "p13", id: "p13",
        name: "Icecool 300",
        description: "Icecool 300 delivers an intense icy-fresh sensation. This 300g bucket of premium steam paste is ideal for long parties. Mix with any tobacco or use alone for a zero-nicotine experience.",
        price: 19.99, originalPrice: 0.0,
        image: "/images/tobacco/icecool 300 .png",
        categoryId: "tobacco", category: "tobacco",
        rating: 4.7, reviewCount: 92, isNew: false, discount: 0
    },
    {
        _id: "p14", id: "p14",
        name: "Zero 200 Grammes",
        description: "Zero 200g is a nicotine-free molasses blend that mimics traditional tobacco texture and cloud production. Available in classic double-apple, blueberry mint and watermelon. 200g pouch.",
        price: 22.99, originalPrice: 27.99,
        image: "/images/tobacco/zero 200-grammes.png",
        categoryId: "tobacco", category: "tobacco",
        rating: 4.4, reviewCount: 67, isNew: false, discount: 18
    },

    // ── COALS ─────────────────────────────────────────────────────────────────
    {
        _id: "p4", id: "p4",
        name: "Charbon Aladin Coco C26 1KG",
        description: "Aladin Coco C26 natural coconut shell charcoal — 1KG bag, 26mm cubes. Long-lasting burn (60+ min), low ash, no chemical taste. The best choice for a pure shisha experience.",
        price: 14.99, originalPrice: 0.0,
        image: "/images/coals/charbon-aladin-coco-c26-1kg.png",
        categoryId: "coals", category: "coals",
        rating: 4.6, reviewCount: 320, isNew: false, discount: 0
    },
    {
        _id: "p15", id: "p15",
        name: "Charbon BlackCocos 1KG",
        description: "BlackCocos premium coconut shell charcoal — extra-dense 1KG block. Burns for 75+ minutes with virtually zero ash. The go-to for professional shisha lounges.",
        price: 16.99, originalPrice: 19.99,
        image: "/images/coals/charbon-blackcocos-1kg.png",
        categoryId: "coals", category: "coals",
        rating: 4.8, reviewCount: 241, isNew: false, discount: 15
    },
    {
        _id: "p16", id: "p16",
        name: "Charbons Carbopol Crown 40mm",
        description: "Carbopol Crown 40mm natural charcoals — extra-large format for slow, even heat distribution. Ideal for phunnel bowls and deep clay bowls. Bag of 24 pieces.",
        price: 12.99, originalPrice: 0.0,
        image: "/images/coals/charbons-carbopol-crown-40mm.png",
        categoryId: "coals", category: "coals",
        rating: 4.5, reviewCount: 98, isNew: false, discount: 0
    },
    {
        _id: "p17", id: "p17",
        name: "Coco Goza 80 Pièces",
        description: "Coco Goza coconut charcoals — value pack of 80 pieces (26mm). Consistent burn, minimal smoke and zero chemical additives. Great for daily use at home.",
        price: 18.99, originalPrice: 23.99,
        image: "/images/coals/coco-goza-80-pieces.png",
        categoryId: "coals", category: "coals",
        rating: 4.7, reviewCount: 176, isNew: false, discount: 21
    },
    {
        _id: "p18", id: "p18",
        name: "Fast Coco 80 Pièces",
        description: "Fast Coco quick-light coconut charcoals — lights in under 45 seconds. Pack of 80 pieces. Ideal when you don't have a coil burner. Slightly faster burnout than natural coals.",
        price: 15.99, originalPrice: 0.0,
        image: "/images/coals/fast-coco-80-pieces.png",
        categoryId: "coals", category: "coals",
        rating: 4.3, reviewCount: 145, isNew: true, discount: 0
    },
    {
        _id: "p19", id: "p19",
        name: "Rouleau Three Kings 33mm",
        description: "Three Kings 33mm quick-light charcoal roll — 10 discs per roll. Classic hookah coal for traditional sessions. Lights with a simple lighter and stays lit without a burner.",
        price: 4.99, originalPrice: 6.99,
        image: "/images/coals/rouleau-de-10-charbons-three-kings-33mm.png",
        categoryId: "coals", category: "coals",
        rating: 4.2, reviewCount: 310, isNew: false, discount: 29
    },

    // ── FOYERS ────────────────────────────────────────────────────────────────
    {
        _id: "p6", id: "p6",
        name: "Fourchette à tabac Beskar",
        description: "The Beskar tobacco fork — a precision-crafted stainless steel tool for packing and fluffing shisha tobacco. Ergonomic grip, dishwasher safe. An essential accessory for every hookah enthusiast.",
        price: 8.99, originalPrice: 11.99,
        image: "/images/cleaning/fourchette-a-tabac-beskar.png",
        categoryId: "foyers", category: "foyers",
        rating: 4.3, reviewCount: 56, isNew: false, discount: 25
    },
    {
        _id: "p20", id: "p20",
        name: "Foyer Katuro Naka",
        description: "The Katuro Naka is a Japanese-inspired phunnel bowl crafted from high-fire stoneware. Deep spire center prevents tobacco juice from dripping into the shaft. Fits all standard 18mm ports.",
        price: 29.99, originalPrice: 34.99,
        image: "/images/foyers/foyer-katuro-naka.png",
        categoryId: "foyers", category: "foyers",
        rating: 4.8, reviewCount: 63, isNew: false, discount: 14
    },
    {
        _id: "p21", id: "p21",
        name: "Foyer Katuro Nyu",
        description: "The Katuro Nyu is a wide-rim clay bowl designed for generous tobacco loads. Glazed interior for easy cleaning, unglazed exterior for better heat absorption. Available in midnight black.",
        price: 24.99, originalPrice: 0.0,
        image: "/images/foyers/foyer-katuro-nyu.png",
        categoryId: "foyers", category: "foyers",
        rating: 4.7, reviewCount: 47, isNew: true, discount: 0
    },
    {
        _id: "p22", id: "p22",
        name: "Foyer Katuro Yoko",
        description: "The Katuro Yoko is a shallow-style bowl perfect for steam paste and light tobacco. Wide channel design maximizes airflow and vapor production. Hand-thrown stoneware.",
        price: 27.99, originalPrice: 32.99,
        image: "/images/foyers/foyer-katuro-yoko.png",
        categoryId: "foyers", category: "foyers",
        rating: 4.6, reviewCount: 39, isNew: false, discount: 15
    },
    {
        _id: "p23", id: "p23",
        name: "Foyer Narnia",
        description: "The Narnia bowl is a large-capacity phunnel bowl with an extra-wide spire for heavy-pack sessions. Fired at 1200°C for extreme heat resistance. Fits AO, Khalil Mamoon and most Egyptian hookahs.",
        price: 34.99, originalPrice: 0.0,
        image: "/images/foyers/foyer-narnia.png",
        categoryId: "foyers", category: "foyers",
        rating: 4.9, reviewCount: 82, isNew: false, discount: 0
    },
    {
        _id: "p24", id: "p24",
        name: "Foyer Silicone Epok",
        description: "The Epok silicone bowl is virtually indestructible — drop-proof, heat-safe and dishwasher-friendly. Phunnel design with a flexible rim adapts to any hookah shaft diameter.",
        price: 14.99, originalPrice: 18.99,
        image: "/images/foyers/foyer-silicone-epok.png",
        categoryId: "foyers", category: "foyers",
        rating: 4.4, reviewCount: 121, isNew: false, discount: 21
    },
    {
        _id: "p25", id: "p25",
        name: "Hurricane Bowl Dandy Glass",
        description: "The Hurricane Bowl by Dandy Glass is a hand-blown borosilicate glass phunnel that creates a cyclone airflow effect inside the bowl. Stunning visually and functionally outstanding.",
        price: 49.99, originalPrice: 59.99,
        image: "/images/foyers/hurricane-bowl-dandy-glass.png",
        categoryId: "foyers", category: "foyers",
        rating: 4.9, reviewCount: 34, isNew: true, discount: 17
    },
    {
        _id: "p26", id: "p26",
        name: "Set Pilot Colour",
        description: "The Pilot Colour set includes a matching bowl, hose handle and base adapter in your choice of 6 vibrant colors. Polycarbonate build, food-grade silicone gaskets. The complete aesthetic upgrade.",
        price: 39.99, originalPrice: 0.0,
        image: "/images/foyers/set-pilot-colour.png",
        categoryId: "foyers", category: "foyers",
        rating: 4.6, reviewCount: 58, isNew: false, discount: 0
    },

    // ── FULL PACKS ────────────────────────────────────────────────────────────
    {
        _id: "p5", id: "p5",
        name: "Starter Pack Rookie",
        description: "Everything you need to start. Includes a mid-range hookah, 50g tobacco, 10 coconut coals, aluminum foil, and a cleaning brush. The perfect gift for beginners.",
        price: 49.99, originalPrice: 64.99,
        image: "/images/full packs/starter-pack-x1.png",
        categoryId: "fullpacks", category: "fullpacks",
        rating: 4.8, reviewCount: 87, isNew: true, discount: 23
    },
    {
        _id: "p27", id: "p27",
        name: "Pack Daytona",
        description: "The Daytona Pack includes a premium stainless hookah, 200g Ways tobacco, 1KG Coco coals, a phunnel bowl and a carrying bag. A complete racing-themed setup for the serious smoker.",
        price: 189.99, originalPrice: 234.99,
        image: "/images/full packs/pack-daytona.png",
        categoryId: "fullpacks", category: "fullpacks",
        rating: 4.8, reviewCount: 43, isNew: false, discount: 19
    },
    {
        _id: "p28", id: "p28",
        name: "Pack Madrassa",
        description: "The Madrassa Pack is a curated bundle for enthusiasts: hookah + 3 tobacco flavors + 2KG coals + clay bowl + carrying case. Best value all-in-one deal in our catalog.",
        price: 229.99, originalPrice: 289.99,
        image: "/images/full packs/pack-madrassa.png",
        categoryId: "fullpacks", category: "fullpacks",
        rating: 4.9, reviewCount: 61, isNew: true, discount: 21
    },
    {
        _id: "p29", id: "p29",
        name: "Pack Pursuit QT",
        description: "The Pursuit QT is a compact travel-ready pack. Includes a mini hookah (38cm), 50g ice frutz, a quick-light coal roll, and a hardshell carrying case. Perfect for on-the-go sessions.",
        price: 99.99, originalPrice: 124.99,
        image: "/images/full packs/pack-pursuit-qt.png",
        categoryId: "fullpacks", category: "fullpacks",
        rating: 4.7, reviewCount: 38, isNew: false, discount: 20
    },
    {
        _id: "p30", id: "p30",
        name: "Ways Nicotine 1KG",
        description: "Ways Nicotine 1KG is a bulk supply of premium molasses — high-nicotine blend for dedicated smokers. Ideal for lounges or heavy personal use. Smooth double-apple base with a full-body throat hit.",
        price: 79.99, originalPrice: 0.0,
        image: "/images/full packs/ways-nicotine-1kg.png",
        categoryId: "fullpacks", category: "fullpacks",
        rating: 4.6, reviewCount: 29, isNew: false, discount: 0
    },

    // ── CLEANING ──────────────────────────────────────────────────────────────
    {
        _id: "p31", id: "p31",
        name: "Brosse Vase Chicha 30cm",
        description: "A 30cm flexible bristle brush designed specifically for cleaning hookah vases and bases. Reaches every curve of the glass for a streak-free clean. Rustproof stainless handle.",
        price: 6.99, originalPrice: 8.99,
        image: "/images/cleaning/brosse-vase-chicha-30cm.png",
        categoryId: "cleaning", category: "cleaning",
        rating: 4.4, reviewCount: 202, isNew: false, discount: 22
    },
    {
        _id: "p32", id: "p32",
        name: "La Plaque N9 by Jakob Hansen",
        description: "The N9 heat management device by Jakob Hansen is the gold standard in hookah accessories. Replaces foil for a cleaner, more consistent smoke. Fits all standard bowls up to 75mm diameter.",
        price: 44.99, originalPrice: 54.99,
        image: "/images/cleaning/la-plaque-n9-by-jakob-hansen.png",
        categoryId: "cleaning", category: "cleaning",
        rating: 4.9, reviewCount: 317, isNew: false, discount: 18
    },
    {
        _id: "p33", id: "p33",
        name: "Pince Epok Angel",
        description: "The Epok Angel tong is a precision-balanced charcoal tool designed for the Epok heat management system. Stainless steel with ergonomic spring-loaded grip. 18cm length for safe handling.",
        price: 11.99, originalPrice: 14.99,
        image: "/images/cleaning/pince-epok-angel.png",
        categoryId: "cleaning", category: "cleaning",
        rating: 4.6, reviewCount: 88, isNew: false, discount: 20
    },
    {
        _id: "p34", id: "p34",
        name: "Pince Punishe",
        description: "The Punishe tong is a heavy-duty coal handler built for professional lounges. Titanium-coated tips for extreme heat resistance, locking ring for safe storage. 22cm length.",
        price: 16.99, originalPrice: 0.0,
        image: "/images/cleaning/pince-punishe.png",
        categoryId: "cleaning", category: "cleaning",
        rating: 4.7, reviewCount: 74, isNew: true, discount: 0
    },
    {
        _id: "p35", id: "p35",
        name: "Troueur",
        description: "The Troueur is a precision tobacco hole-puncher for foil prep. Creates perfectly spaced holes for optimal airflow with a single press. Stainless steel, dishwasher safe.",
        price: 7.99, originalPrice: 9.99,
        image: "/images/cleaning/troueur-removebg-preview.png",
        categoryId: "cleaning", category: "cleaning",
        rating: 4.3, reviewCount: 156, isNew: false, discount: 20
    }
];

// Load persisted products (added via dashboard) or fall back to mock data
let products = loadProducts() || MOCK_PRODUCTS.slice();

// If we loaded mock data for the first time, persist it so future additions are saved
if (!fs.existsSync(PRODUCTS_FILE)) {
    saveProducts(products);
}

let paymentMethods = [
    {
        _id: "pm_test_visa",
        brand: "visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2028,
        isDefault: true,
        cardholderName: "Layth"
    }
];

let orders = [];
let wishlists = {};

function parseJsonBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
    });
}

function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const query = parsedUrl.query;
    const method = req.method;

    console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

    // ── Health Check ───────────────
    if (pathname === '/api/health' && method === 'GET') {
        return sendJson(res, 200, { status: "OK", timestamp: new Date().toISOString() });
    }

    // ── Auth Endpoints ─────────────
    if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseJsonBody(req);
        const { email, password } = body;
        let user = users.find(u => u.email === email);
        if (!user) {
            user = { _id: `usr_${Date.now()}`, name: (email || 'user').split('@')[0], email: email || 'user@example.com', password };
            users.push(user);
        }
        return sendJson(res, 200, {
            token: `jwt_token_${user._id}`,
            user: { _id: user._id, name: user.name, email: user.email }
        });
    }

    if (pathname === '/api/users' && method === 'POST') {
        const body = await parseJsonBody(req);
        const { name, email, password } = body;
        let user = users.find(u => u.email === email);
        if (user) {
            return sendJson(res, 400, { error: "Email already exists" });
        }
        user = { _id: `usr_${Date.now()}`, name, email, password };
        users.push(user);
        return sendJson(res, 201, {
            token: `jwt_token_${user._id}`,
            user: { _id: user._id, name: user.name, email: user.email }
        });
    }

    // ── Categories & Products ─────
    if (pathname === '/api/categories' && method === 'GET') {
        return sendJson(res, 200, { data: categories });
    }

    if (pathname === '/api/products' && method === 'GET') {
        const category = query.category;
        let result = products;
        if (category) {
            result = products.filter(p => p.categoryId.toLowerCase() === category.toLowerCase());
        }
        return sendJson(res, 200, { data: result });
    }

    if (pathname === '/api/products/search' && method === 'GET') {
        const q = (query.name || "").toLowerCase();
        const result = products.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
        return sendJson(res, 200, { data: result });
    }

    if (pathname.startsWith('/api/products/') && method === 'GET') {
        const id = pathname.replace('/api/products/', '');
        const prod = products.find(p => p._id === id || p.id === id);
        if (!prod) return sendJson(res, 404, { error: "Product not found" });
        return sendJson(res, 200, { data: prod });
    }

    // ── Create product (Dashboard → App) ───────────────────────────────────
    if (pathname === '/api/products' && method === 'POST') {
        const body = await parseJsonBody(req);
        const { name, description, price, originalPrice, categoryId, category,
                image, rating, reviewCount, isNew, discount, stock, mark } = body;
        if (!name || !categoryId) {
            return sendJson(res, 400, { error: "name and categoryId are required" });
        }
        const newId = `p_${Date.now()}`;
        const product = {
            _id: newId, id: newId,
            name:          name         || '',
            description:   description  || '',
            price:         parseFloat(price)         || 0,
            originalPrice: parseFloat(originalPrice) || 0,
            categoryId:    categoryId || category || '',
            category:      categoryId || category || '',
            image:         image       || '',
            rating:        parseFloat(rating)    || 4.5,
            reviewCount:   parseInt(reviewCount) || 0,
            isNew:         isNew === true || isNew === 'true',
            discount:      parseInt(discount) || 0,
            stock:         parseInt(stock)    || 999,
            mark:          mark        || ''
        };
        products.push(product);
        saveProducts(products);
        console.log(`[products] Created: ${product.name} (${product._id})`);
        return sendJson(res, 201, { data: product });
    }

    // ── Update product ─────────────────────────────────────────────────────
    if (pathname.startsWith('/api/products/') && method === 'PUT') {
        const id  = pathname.replace('/api/products/', '');
        const idx = products.findIndex(p => p._id === id || p.id === id);
        if (idx === -1) return sendJson(res, 404, { error: "Product not found" });
        const body = await parseJsonBody(req);
        const updated = { ...products[idx], ...body, _id: products[idx]._id, id: products[idx].id };
        if (body.price         !== undefined) updated.price         = parseFloat(body.price)         || 0;
        if (body.originalPrice !== undefined) updated.originalPrice = parseFloat(body.originalPrice) || 0;
        if (body.discount      !== undefined) updated.discount      = parseInt(body.discount)        || 0;
        if (body.stock         !== undefined) updated.stock         = parseInt(body.stock)           || 999;
        if (body.rating        !== undefined) updated.rating        = parseFloat(body.rating)        || 4.5;
        if (body.reviewCount   !== undefined) updated.reviewCount   = parseInt(body.reviewCount)     || 0;
        if (body.isNew         !== undefined) updated.isNew         = body.isNew === true || body.isNew === 'true';
        products[idx] = updated;
        saveProducts(products);
        console.log(`[products] Updated: ${updated.name} (${id})`);
        return sendJson(res, 200, { data: updated });
    }

    // ── Delete product ─────────────────────────────────────────────────────
    if (pathname.startsWith('/api/products/') && method === 'DELETE') {
        const id  = pathname.replace('/api/products/', '');
        const idx = products.findIndex(p => p._id === id || p.id === id);
        if (idx === -1) return sendJson(res, 404, { error: "Product not found" });
        const [removed] = products.splice(idx, 1);
        saveProducts(products);
        console.log(`[products] Deleted: ${removed.name} (${id})`);
        return sendJson(res, 200, { success: true, data: removed });
    }

    // ── Upload product image ───────────────────────────────────────────────
    if (pathname === '/api/upload/product-image' && method === 'POST') {
        try {
            const { fields, fileBuffer, fileName } = await parseMultipart(req);
            if (!fileBuffer || !fileName) {
                return sendJson(res, 400, { error: "No file uploaded" });
            }
            const ext      = path.extname(fileName) || '.png';
            const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const dest     = path.join(UPLOADS_DIR, safeName);
            fs.writeFileSync(dest, fileBuffer);
            const imageUrl = `/images/uploads/${safeName}`;
            console.log(`[upload] Saved image: ${imageUrl}`);
            return sendJson(res, 200, { imageUrl });
        } catch (e) {
            return sendJson(res, 500, { error: 'Upload failed: ' + e.message });
        }
    }

    // ── Orders ─────────────────────
    if (pathname === '/api/orders' && method === 'GET') {
        return sendJson(res, 200, { data: orders });
    }

    if (pathname === '/api/orders' && method === 'POST') {
        const body = await parseJsonBody(req);
        const newOrder = {
            _id: `ord_${Date.now()}`,
            ...body,
            createdAt: new Date().toISOString()
        };
        orders.push(newOrder);
        return sendJson(res, 201, { data: newOrder });
    }

    // ── Stripe Payment Endpoints ──
    if (pathname === '/api/stripe/setup-intent' && method === 'POST') {
        return sendJson(res, 200, {
            clientSecret: `seti_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`
        });
    }

    if (pathname === '/api/stripe/save-payment-method' && method === 'POST') {
        const body = await parseJsonBody(req);
        const { paymentMethodId, cardholderName, setAsDefault } = body;
        if (setAsDefault) {
            paymentMethods.forEach(pm => pm.isDefault = false);
        }
        const newPm = {
            _id: paymentMethodId || `pm_${Date.now()}`,
            brand: "Visa",
            last4: "4242",
            expMonth: 12,
            expYear: 2028,
            isDefault: !!setAsDefault,
            cardholderName: cardholderName || "Cardholder"
        };
        paymentMethods.push(newPm);
        return sendJson(res, 200, { success: true, paymentMethod: newPm });
    }

    if (pathname === '/api/stripe/payment-methods' && method === 'GET') {
        return sendJson(res, 200, paymentMethods);
    }

    if (pathname.startsWith('/api/stripe/payment-methods/') && pathname.endsWith('/default') && method === 'POST') {
        const id = pathname.replace('/api/stripe/payment-methods/', '').replace('/default', '');
        paymentMethods.forEach(pm => pm.isDefault = (pm._id === id));
        return sendJson(res, 200, { success: true });
    }

    if (pathname.startsWith('/api/stripe/payment-methods/') && method === 'DELETE') {
        const id = pathname.replace('/api/stripe/payment-methods/', '');
        paymentMethods = paymentMethods.filter(pm => pm._id !== id);
        return sendJson(res, 200, { success: true });
    }

    // ── Static Images ─────────────
    if (pathname.startsWith('/images/')) {
        const relPath = pathname.replace('/images/', '');
        const filePath = path.join(__dirname, '..', 'article', relPath);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
            } else {
                const ext = path.extname(filePath).toLowerCase();
                const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
                res.end(data);
            }
        });
        return;
    }

    // 404
    sendJson(res, 404, { error: "Route not found" });
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is busy, retrying in 3s…`);
        setTimeout(() => server.listen(PORT, '0.0.0.0'), 3000);
    } else {
        throw err;
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` HookahDrop Backend API Server active on port ${PORT}`);
    console.log(` Local URL:     http://localhost:${PORT}`);
    console.log(` Android Emul:  http://10.0.2.2:${PORT}`);
    console.log(`====================================================`);
});
