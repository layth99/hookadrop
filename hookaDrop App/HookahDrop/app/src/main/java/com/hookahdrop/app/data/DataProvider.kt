package com.hookahdrop.app.data

import com.hookahdrop.app.R

object DataProvider {

    // ── Categories ────────────────────────────────────────────────────────────
    val categories: List<Category> = listOf(
        Category("hookahs",   "Hookahs",     "Premium hookah sets & pipes",      R.drawable.cat_hookah,    24),
        Category("tobacco",   "Tobacco",     "Shisha flavors & blends",           R.drawable.cat_tabacs,    48),
        Category("coals",     "Coals",       "Natural & quick-light coals",       R.drawable.cat_charbons,  18),
        Category("foyers",    "Foyers",      "Bowls, hoses & grommets",           R.drawable.cat_foyers,    62),
        Category("fullpacks", "Full Packs",  "Complete starter kits",             R.drawable.cat_fullpacks, 15),
        Category("cleaning",  "Cleaning",    "Brushes, cleaners & maintenance",   R.drawable.cat_cleaning,  20)
    )

    // ── Products ──────────────────────────────────────────────────────────────
    val products: List<Product> = listOf(

        // ── HOOKAHS ──────────────────────────────────────────────────────────
        Product(
            id          = "p1",
            name        = "Aladin MVP 360",
            description = "The Aladin MVP 360 is a premium rotating hookah with a 360° swivel base. Made from high-grade stainless steel with a silicone hose and clay bowl included. Perfect for solo or group sessions.",
            price       = 129.99,
            originalPrice = 159.99,
            imageRes    = R.drawable.art_hookah_aladin_mvp,
            categoryId  = "hookahs",
            rating      = 4.8f,
            reviewCount = 142,
            isNew       = true,
            discount    = 19
        ),
        Product(
            id          = "p2",
            name        = "Celeste X3",
            description = "The Celeste X3 is an elegant crystal-glass hookah with a handcrafted base. Comes with premium silicone hose and wide-rim phunnel bowl. Ideal for connoisseurs who value aesthetics.",
            price       = 89.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_hookah_celeste_x3,
            categoryId  = "hookahs",
            rating      = 4.7f,
            reviewCount = 98,
            isNew       = false,
            discount    = 0
        ),
        Product(
            id          = "p7",
            name        = "Chicha El Nefes Tahta",
            description = "The El Nefes Tahta is a sleek mid-size hookah combining Turkish craftsmanship with modern aesthetics. Anodized aluminum shaft, wide-bore hose port and a generous clay bowl make it a top pick for enthusiasts.",
            price       = 109.99,
            originalPrice = 134.99,
            imageRes    = R.drawable.art_hookah_el_nefes_tahta,
            categoryId  = "hookahs",
            rating      = 4.6f,
            reviewCount = 74,
            isNew       = false,
            discount    = 18
        ),
        Product(
            id          = "p8",
            name        = "Chicha Majordome Dandy Glass",
            description = "A statement piece — the Majordome Dandy Glass features a hand-blown borosilicate base with brass fittings. Built for long sessions with minimal draw resistance. Ships with a matching leather hose.",
            price       = 179.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_hookah_majordome_dandy,
            categoryId  = "hookahs",
            rating      = 4.9f,
            reviewCount = 55,
            isNew       = true,
            discount    = 0
        ),
        Product(
            id          = "p9",
            name        = "El Nefes Sultan Colonial",
            description = "Inspired by Ottoman design, the Sultan Colonial delivers a rich, smooth draw. Polished stainless shaft with ornate engravings, wide diffuser base and premium food-grade silicone hose included.",
            price       = 149.99,
            originalPrice = 179.99,
            imageRes    = R.drawable.art_hookah_sultan_colonial,
            categoryId  = "hookahs",
            rating      = 4.8f,
            reviewCount = 112,
            isNew       = false,
            discount    = 17
        ),
        Product(
            id          = "p10",
            name        = "Mr Eds King E28",
            description = "The Mr Eds King E28 is a precision-engineered hookah with a powder-coated carbon steel shaft and reinforced downstem. The E28 delivers consistent airflow for sessions that last hours.",
            price       = 99.99,
            originalPrice = 119.99,
            imageRes    = R.drawable.art_hookah_mr_eds_king,
            categoryId  = "hookahs",
            rating      = 4.5f,
            reviewCount = 88,
            isNew       = false,
            discount    = 17
        ),

        // ── TOBACCO ──────────────────────────────────────────────────────────
        Product(
            id          = "p3",
            name        = "Ways 200 Grammes",
            description = "Ways shisha tobacco — 200g pouch of premium double-apple flavored molasses. Smooth smoke with a natural fruity aroma. Compatible with all standard hookah bowls.",
            price       = 24.99,
            originalPrice = 29.99,
            imageRes    = R.drawable.art_tobacco_ways_200g,
            categoryId  = "tobacco",
            rating      = 4.9f,
            reviewCount = 215,
            isNew       = false,
            discount    = 17
        ),
        Product(
            id          = "p11",
            name        = "Booster Ways",
            description = "Booster Ways is a high-nicotine tobacco booster designed to intensify any shisha blend. Add a small amount to your regular tobacco for a stronger hit and richer clouds. 50g tin.",
            price       = 12.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_tobacco_booster_ways,
            categoryId  = "tobacco",
            rating      = 4.5f,
            reviewCount = 134,
            isNew       = false,
            discount    = 0
        ),
        Product(
            id          = "p12",
            name        = "Ice Frutz 50",
            description = "Ice Frutz 50 is a steam paste — tobacco-free, 0% nicotine — packed with tropical fruit flavors and a cool menthol finish. 50g jar. Perfect for those who want full flavor without tobacco.",
            price       = 9.99,
            originalPrice = 12.99,
            imageRes    = R.drawable.art_tobacco_ice_frutz,
            categoryId  = "tobacco",
            rating      = 4.6f,
            reviewCount = 189,
            isNew       = true,
            discount    = 23
        ),
        Product(
            id          = "p13",
            name        = "Icecool 300",
            description = "Icecool 300 delivers an intense icy-fresh sensation. This 300g bucket of premium steam paste is ideal for long parties. Mix with any tobacco or use alone for a zero-nicotine experience.",
            price       = 19.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_tobacco_icecool_300,
            categoryId  = "tobacco",
            rating      = 4.7f,
            reviewCount = 92,
            isNew       = false,
            discount    = 0
        ),
        Product(
            id          = "p14",
            name        = "Zero 200 Grammes",
            description = "Zero 200g is a nicotine-free molasses blend that mimics traditional tobacco texture and cloud production. Available in classic double-apple, blueberry mint and watermelon. 200g pouch.",
            price       = 22.99,
            originalPrice = 27.99,
            imageRes    = R.drawable.art_tobacco_zero_200g,
            categoryId  = "tobacco",
            rating      = 4.4f,
            reviewCount = 67,
            isNew       = false,
            discount    = 18
        ),

        // ── COALS ─────────────────────────────────────────────────────────────
        Product(
            id          = "p4",
            name        = "Charbon Aladin Coco C26 1KG",
            description = "Aladin Coco C26 natural coconut shell charcoal — 1KG bag, 26mm cubes. Long-lasting burn (60+ min), low ash, no chemical taste. The best choice for a pure shisha experience.",
            price       = 14.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_coals_aladin_coco_c26,
            categoryId  = "coals",
            rating      = 4.6f,
            reviewCount = 320,
            isNew       = false,
            discount    = 0
        ),
        Product(
            id          = "p15",
            name        = "Charbon BlackCocos 1KG",
            description = "BlackCocos premium coconut shell charcoal — extra-dense 1KG block. Burns for 75+ minutes with virtually zero ash. The go-to for professional shisha lounges.",
            price       = 16.99,
            originalPrice = 19.99,
            imageRes    = R.drawable.art_coals_blackcocos,
            categoryId  = "coals",
            rating      = 4.8f,
            reviewCount = 241,
            isNew       = false,
            discount    = 15
        ),
        Product(
            id          = "p16",
            name        = "Charbons Carbopol Crown 40mm",
            description = "Carbopol Crown 40mm natural charcoals — extra-large format for slow, even heat distribution. Ideal for phunnel bowls and deep clay bowls. Bag of 24 pieces.",
            price       = 12.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_coals_carbopol_crown,
            categoryId  = "coals",
            rating      = 4.5f,
            reviewCount = 98,
            isNew       = false,
            discount    = 0
        ),
        Product(
            id          = "p17",
            name        = "Coco Goza 80 Pièces",
            description = "Coco Goza coconut charcoals — value pack of 80 pieces (26mm). Consistent burn, minimal smoke and zero chemical additives. Great for daily use at home.",
            price       = 18.99,
            originalPrice = 23.99,
            imageRes    = R.drawable.art_coals_coco_goza,
            categoryId  = "coals",
            rating      = 4.7f,
            reviewCount = 176,
            isNew       = false,
            discount    = 21
        ),
        Product(
            id          = "p18",
            name        = "Fast Coco 80 Pièces",
            description = "Fast Coco quick-light coconut charcoals — lights in under 45 seconds. Pack of 80 pieces. Ideal when you don't have a coil burner. Slightly faster burnout than natural coals.",
            price       = 15.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_coals_fast_coco,
            categoryId  = "coals",
            rating      = 4.3f,
            reviewCount = 145,
            isNew       = true,
            discount    = 0
        ),
        Product(
            id          = "p19",
            name        = "Rouleau Three Kings 33mm",
            description = "Three Kings 33mm quick-light charcoal roll — 10 discs per roll. Classic hookah coal for traditional sessions. Lights with a simple lighter and stays lit without a burner.",
            price       = 4.99,
            originalPrice = 6.99,
            imageRes    = R.drawable.art_coals_three_kings,
            categoryId  = "coals",
            rating      = 4.2f,
            reviewCount = 310,
            isNew       = false,
            discount    = 29
        ),

        // ── FOYERS ───────────────────────────────────────────────────────────
        Product(
            id          = "p6",
            name        = "Fourchette à tabac Beskar",
            description = "The Beskar tobacco fork — a precision-crafted stainless steel tool for packing and fluffing shisha tobacco. Ergonomic grip, dishwasher safe. An essential accessory for every hookah enthusiast.",
            price       = 8.99,
            originalPrice = 11.99,
            imageRes    = R.drawable.art_clean_fourchette_beskar,
            categoryId  = "foyers",
            rating      = 4.3f,
            reviewCount = 56,
            isNew       = false,
            discount    = 25
        ),
        Product(
            id          = "p20",
            name        = "Foyer Katuro Naka",
            description = "The Katuro Naka is a Japanese-inspired phunnel bowl crafted from high-fire stoneware. Deep spire center prevents tobacco juice from dripping into the shaft. Fits all standard 18mm ports.",
            price       = 29.99,
            originalPrice = 34.99,
            imageRes    = R.drawable.art_foyer_katuro_naka,
            categoryId  = "foyers",
            rating      = 4.8f,
            reviewCount = 63,
            isNew       = false,
            discount    = 14
        ),
        Product(
            id          = "p21",
            name        = "Foyer Katuro Nyu",
            description = "The Katuro Nyu is a wide-rim clay bowl designed for generous tobacco loads. Glazed interior for easy cleaning, unglazed exterior for better heat absorption. Available in midnight black.",
            price       = 24.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_foyer_katuro_nyu,
            categoryId  = "foyers",
            rating      = 4.7f,
            reviewCount = 47,
            isNew       = true,
            discount    = 0
        ),
        Product(
            id          = "p22",
            name        = "Foyer Katuro Yoko",
            description = "The Katuro Yoko is a shallow-style bowl perfect for steam paste and light tobacco. Wide channel design maximizes airflow and vapor production. Hand-thrown stoneware.",
            price       = 27.99,
            originalPrice = 32.99,
            imageRes    = R.drawable.art_foyer_katuro_yoko,
            categoryId  = "foyers",
            rating      = 4.6f,
            reviewCount = 39,
            isNew       = false,
            discount    = 15
        ),
        Product(
            id          = "p23",
            name        = "Foyer Narnia",
            description = "The Narnia bowl is a large-capacity phunnel bowl with an extra-wide spire for heavy-pack sessions. Fired at 1200°C for extreme heat resistance. Fits AO, Khalil Mamoon and most Egyptian hookahs.",
            price       = 34.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_foyer_narnia,
            categoryId  = "foyers",
            rating      = 4.9f,
            reviewCount = 82,
            isNew       = false,
            discount    = 0
        ),
        Product(
            id          = "p24",
            name        = "Foyer Silicone Epok",
            description = "The Epok silicone bowl is virtually indestructible — drop-proof, heat-safe and dishwasher-friendly. Phunnel design with a flexible rim adapts to any hookah shaft diameter.",
            price       = 14.99,
            originalPrice = 18.99,
            imageRes    = R.drawable.art_foyer_silicone_epok,
            categoryId  = "foyers",
            rating      = 4.4f,
            reviewCount = 121,
            isNew       = false,
            discount    = 21
        ),
        Product(
            id          = "p25",
            name        = "Hurricane Bowl Dandy Glass",
            description = "The Hurricane Bowl by Dandy Glass is a hand-blown borosilicate glass phunnel that creates a cyclone airflow effect inside the bowl. Stunning visually and functionally outstanding.",
            price       = 49.99,
            originalPrice = 59.99,
            imageRes    = R.drawable.art_foyer_hurricane_bowl,
            categoryId  = "foyers",
            rating      = 4.9f,
            reviewCount = 34,
            isNew       = true,
            discount    = 17
        ),
        Product(
            id          = "p26",
            name        = "Set Pilot Colour",
            description = "The Pilot Colour set includes a matching bowl, hose handle and base adapter in your choice of 6 vibrant colors. Polycarbonate build, food-grade silicone gaskets. The complete aesthetic upgrade.",
            price       = 39.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_foyer_set_pilot,
            categoryId  = "foyers",
            rating      = 4.6f,
            reviewCount = 58,
            isNew       = false,
            discount    = 0
        ),

        // ── FULL PACKS ────────────────────────────────────────────────────────
        Product(
            id          = "p5",
            name        = "Starter Pack Rookie",
            description = "Everything you need to start. Includes a mid-range hookah, 50g tobacco, 10 coconut coals, aluminum foil, and a cleaning brush. The perfect gift for beginners.",
            price       = 49.99,
            originalPrice = 64.99,
            imageRes    = R.drawable.art_pack_starter_x1,
            categoryId  = "fullpacks",
            rating      = 4.8f,
            reviewCount = 87,
            isNew       = true,
            discount    = 23
        ),
        Product(
            id          = "p27",
            name        = "Pack Daytona",
            description = "The Daytona Pack includes a premium stainless hookah, 200g Ways tobacco, 1KG Coco coals, a phunnel bowl and a carrying bag. A complete racing-themed setup for the serious smoker.",
            price       = 189.99,
            originalPrice = 234.99,
            imageRes    = R.drawable.art_pack_daytona,
            categoryId  = "fullpacks",
            rating      = 4.8f,
            reviewCount = 43,
            isNew       = false,
            discount    = 19
        ),
        Product(
            id          = "p28",
            name        = "Pack Madrassa",
            description = "The Madrassa Pack is a curated bundle for enthusiasts: hookah + 3 tobacco flavors + 2KG coals + clay bowl + carrying case. Best value all-in-one deal in our catalog.",
            price       = 229.99,
            originalPrice = 289.99,
            imageRes    = R.drawable.art_pack_madrassa,
            categoryId  = "fullpacks",
            rating      = 4.9f,
            reviewCount = 61,
            isNew       = true,
            discount    = 21
        ),
        Product(
            id          = "p29",
            name        = "Pack Pursuit QT",
            description = "The Pursuit QT is a compact travel-ready pack. Includes a mini hookah (38cm), 50g ice frutz, a quick-light coal roll, and a hardshell carrying case. Perfect for on-the-go sessions.",
            price       = 99.99,
            originalPrice = 124.99,
            imageRes    = R.drawable.art_pack_pursuit_qt,
            categoryId  = "fullpacks",
            rating      = 4.7f,
            reviewCount = 38,
            isNew       = false,
            discount    = 20
        ),
        Product(
            id          = "p30",
            name        = "Ways Nicotine 1KG",
            description = "Ways Nicotine 1KG is a bulk supply of premium molasses — high-nicotine blend for dedicated smokers. Ideal for lounges or heavy personal use. Smooth double-apple base with a full-body throat hit.",
            price       = 79.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_pack_ways_nicotine,
            categoryId  = "fullpacks",
            rating      = 4.6f,
            reviewCount = 29,
            isNew       = false,
            discount    = 0
        ),

        // ── CLEANING ──────────────────────────────────────────────────────────
        Product(
            id          = "p31",
            name        = "Brosse Vase Chicha 30cm",
            description = "A 30cm flexible bristle brush designed specifically for cleaning hookah vases and bases. Reaches every curve of the glass for a streak-free clean. Rustproof stainless handle.",
            price       = 6.99,
            originalPrice = 8.99,
            imageRes    = R.drawable.art_clean_brosse_vase,
            categoryId  = "cleaning",
            rating      = 4.4f,
            reviewCount = 202,
            isNew       = false,
            discount    = 22
        ),
        Product(
            id          = "p32",
            name        = "La Plaque N9 by Jakob Hansen",
            description = "The N9 heat management device by Jakob Hansen is the gold standard in hookah accessories. Replaces foil for a cleaner, more consistent smoke. Fits all standard bowls up to 75mm diameter.",
            price       = 44.99,
            originalPrice = 54.99,
            imageRes    = R.drawable.art_clean_plaque_n9,
            categoryId  = "cleaning",
            rating      = 4.9f,
            reviewCount = 317,
            isNew       = false,
            discount    = 18
        ),
        Product(
            id          = "p33",
            name        = "Pince Epok Angel",
            description = "The Epok Angel tong is a precision-balanced charcoal tool designed for the Epok heat management system. Stainless steel with ergonomic spring-loaded grip. 18cm length for safe handling.",
            price       = 11.99,
            originalPrice = 14.99,
            imageRes    = R.drawable.art_clean_pince_epok,
            categoryId  = "cleaning",
            rating      = 4.6f,
            reviewCount = 88,
            isNew       = false,
            discount    = 20
        ),
        Product(
            id          = "p34",
            name        = "Pince Punishe",
            description = "The Punishe tong is a heavy-duty coal handler built for professional lounges. Titanium-coated tips for extreme heat resistance, locking ring for safe storage. 22cm length.",
            price       = 16.99,
            originalPrice = 0.0,
            imageRes    = R.drawable.art_clean_pince_punishe,
            categoryId  = "cleaning",
            rating      = 4.7f,
            reviewCount = 74,
            isNew       = true,
            discount    = 0
        ),
        Product(
            id          = "p35",
            name        = "Troueur",
            description = "The Troueur is a precision tobacco hole-puncher for foil prep. Creates perfectly spaced holes for optimal airflow with a single press. Stainless steel, dishwasher safe.",
            price       = 7.99,
            originalPrice = 9.99,
            imageRes    = R.drawable.art_clean_troueur,
            categoryId  = "cleaning",
            rating      = 4.3f,
            reviewCount = 156,
            isNew       = false,
            discount    = 20
        )
    )

    // ── Hero Banners ──────────────────────────────────────────────────────────
    val heroBanners: List<HeroBanner> = listOf(
        HeroBanner("b1", "Aladin MVP 360",       "Premium 360° rotating hookah",         R.drawable.art_hookah_aladin_mvp,  categoryId = "hookahs"),
        HeroBanner("b2", "Ways 200g Tobacco",    "Smooth double-apple shisha blend",      R.drawable.art_tobacco_ways_200g,  categoryId = "tobacco"),
        HeroBanner("b3", "Starter Pack Rookie",  "Everything to start — 23% off today",  R.drawable.art_pack_starter_x1,   categoryId = "fullpacks")
    )

    // ── Benefits ──────────────────────────────────────────────────────────────
    val benefits: List<Benefit> = listOf(
        Benefit(R.drawable.ic_in_transit, "Fast Delivery",     "Ships within 24h"),
        Benefit(R.drawable.ic_shield,     "Original Products", "100% authentic"),
        Benefit(R.drawable.ic_headset,    "24/7 Support",      "Always here for you")
    )

    // ── Queries ───────────────────────────────────────────────────────────────
    fun getProductsByCategory(categoryId: String) = products.filter { it.categoryId == categoryId }
    fun getProductById(id: String)  = products.find { it.id == id }
    fun getCategoryById(id: String) = categories.find { it.id == id }
}
