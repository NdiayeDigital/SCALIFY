// ========================================================
//                 SCALIFY CORE APPLICATION LOGIC
// ========================================================

// --- USER DATABASE (localStorage) ---
const DB_KEY = 'scalify_users_v1';
const SESSION_KEY = 'scalify_session_v1';

function getUsers() { try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; } catch(e) { return []; } }
function saveUsers(u) { localStorage.setItem(DB_KEY, JSON.stringify(u)); }
function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch(e) { return null; } }
function saveSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function findUserByEmail(email) { return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()); }
function findUserByPhone(phone) { return getUsers().find(u => u.phone === phone.replace(/\s/g,'')); }

// Generate a unique access key per user (deterministic from email+phone+timestamp)
function generateAccessKey(email, phone) {
    const src = email + phone + Date.now().toString();
    let hash = 0;
    for (let i = 0; i < src.length; i++) {
        hash = ((hash << 5) - hash) + src.charCodeAt(i);
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    return 'SCL-' + hex.slice(0,4) + '-' + hex.slice(4,8);
}

function registerUser(data) {
  const users = getUsers();
  const accessKey = generateAccessKey(data.email, data.phone);
  const newUser = {
    id: Date.now().toString(),
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone.replace(/\s/g,''),
    password: data.password,
    accessKey: accessKey,
    isPremium: false,
    level: 1,
    score: 150,
    decisions: [],
    simulations: [],
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

function updateUser(email, changes) {
  const users = getUsers();
  const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (idx >= 0) { users[idx] = { ...users[idx], ...changes }; saveUsers(users); return users[idx]; }
  return null;
}

// --- OTP SIMULATION ---
let pendingVerification = null;
function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// 1. DATA STORES (Sourcing, Products, and IA Models)
const TRENDING_PRODUCTS = [
    {
        id: "prod-1",
        name: "Mini Blender Portable Rechargeable",
        image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=500&q=80",
        buyPrice: 900,
        transportCost: 1200,
        localFees: 1500,
        recommendedSalePrice: 9500,
        competitors: "Moyen",
        status: "viral",
        score: 9.4,
        category: "Cuisine & Maison",
        description: "Mélangeur de jus portable sans fil, parfait pour les smoothies en déplacement. Idéal pour les sportifs et actifs à Dakar.",
        hooks: [
            "🔥 Tu veux des jus frais n'importe où à Dakar sans allumer un gros robot ? Regarde ça !",
            "⚠️ Arrête de gaspiller ton argent dans des jus industriels pleins de sucre !",
            "POV: Tu es en retard pour le boulot au Plateau, mais ton smoothie est prêt en 30 secondes chrono. ⏱️",
            "Le gadget indispensable que toutes les mamans du Sénégal s'arrachent en ce moment !",
            "Petit, puissant et rechargeable par USB. Le compagnon idéal pour le sport ou le bureau."
        ],
        scripts: [
            "【Hook】: Montre le mini blender dans un sac à main, puis sors-le en souriant.\n【Corps】: 'Voici le mini blender portable rechargeable. Tu mets tes fruits, tu appuies deux fois, et boum ! Ton smoothie frais est prêt en 20 secondes. Il est ultra facile à laver et se recharge avec un simple câble USB.'\n【Appel à l'action】: 'Profite de notre promo de livraison gratuite à Dakar aujourd'hui. Clique sur le lien !'",
            "【Hook】: Coupe un morceau de mangue bien mûre et de banane sur une table.\n【Corps】: 'Pas besoin de prise électrique ! Que tu sois à la plage de Ngor, au bureau ou à la salle de sport, prépare des jus frais instantanés. Plus d'excuse pour ne pas manger sain.'\n【Appel à l'action】: 'Paiement à la livraison par Wave ou Cash. Commande vite en cliquant ici !'",
            "【Hook】: Secoue le blender à l'envers sans qu'aucune goutte ne coule.\n【Corps】: 'Il est 100% étanche et super puissant. Regarde comment il broie la glace sans problème. Parfait pour tes boissons glacées durant l'hivernage.'\n【Appel à l'action】: 'Stock très limité au Sénégal. Lien en bio !'"
        ],
        hashtags: ["#DakarEcom", "#SenegalEcommerce", "#MiniBlenderDakar", "#VieSaineDakar", "#TikTokSenegal", "#CuisineSain", "#AlibabaSenegal", "#SenegalEntrepreneur", "#DakarGagnant", "#CadeauDakar"]
    },
    {
        id: "prod-2",
        name: "Masseur Musculaire Professionnel (Massage Gun)",
        image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=500&q=80",
        buyPrice: 2500,
        transportCost: 2800,
        localFees: 2000,
        recommendedSalePrice: 22000,
        competitors: "Faible",
        status: "stable",
        score: 8.9,
        category: "Sport & Santé",
        description: "Pistolet de massage à percussion thérapeutique pour soulager les douleurs musculaires des athlètes et personnes souffrant de maux de dos.",
        hooks: [
            "💆‍♂️ Tu as tout le temps mal au dos après une longue journée assis au bureau ?",
            "L'arme secrète des athlètes de haut niveau pour récupérer deux fois plus vite.",
            "POV: Tu as ton propre kiné personnel à la maison pour moins de 25 000 FCFA.",
            "Dis adieu aux courbatures et tensions musculaires dès aujourd'hui !",
            "Ne paie plus des séances de massage hors de prix à Dakar. Regarde ça."
        ],
        scripts: [
            "【Hook】: Montre une personne grimaçant de douleur au cou, puis utilisant le pistolet.\n【Corps】: 'Ce pistolet de massage professionnel décontracte tes muscles en profondeur avec ses 6 vitesses et 4 têtes différentes. Il soulage instantanément la nuque, le dos et les jambes.'\n【Appel à l'action】: 'Livraison express partout au Sénégal. Commande le tien aujourd'hui !'",
            "【Hook】: Fais rebondir la tête du masseur sur le mollet pour montrer la percussion.\n【Corps】: 'Tu fais du sport au Monument de la Renaissance ou tu cours sur la Corniche ? C'est le produit idéal pour éviter les courbatures et relaxer tes muscles après l'effort.'\n【Appel à l'action】: 'Paiement sécurisé Wave disponible. Lien dans la description !'"
        ],
        hashtags: ["#SportDakar", "#FitnessSenegal", "#MassageDakar", "#BienEtreSenegal", "#DakarPlateau", "#Dakarois", "#DakarFitness", "#RecupMusculaire", "#SanteDakar", "#EcomAfrica"]
    },
    {
        id: "prod-3",
        name: "Ring Light LED Pro 18 pouces avec Trépied",
        image: "https://images.unsplash.com/photo-1615751072497-5f5169febe17?w=500&q=80",
        buyPrice: 2100,
        transportCost: 4500,
        localFees: 1800,
        recommendedSalePrice: 18500,
        competitors: "Élevé",
        status: "risky",
        score: 6.5,
        category: "Technologie & Beauté",
        description: "Anneau lumineux LED professionnel pour créateurs de contenu TikTok, esthéticiennes et maquilleuses à Dakar.",
        hooks: [
            "📸 Le secret pour doubler la qualité de tes vidéos TikTok et attirer plus d'abonnés !",
            "⚠️ Ne commence pas à créer du contenu e-commerce sans cet accessoire indispensable.",
            "POV: Tes vidéos passent de floues et sombres à un rendu digne d'un studio télé.",
            "Idéal pour les salons de coiffure, maquilleuses et influenceurs au Sénégal.",
            "La lumière parfaite pour mettre en valeur tes produits en ligne."
        ],
        scripts: [
            "【Hook】: Éteins puis allume brutalement la Ring Light pour montrer la différence de lumière sur le visage.\n【Corps】: 'La luminosité est la clé pour percer sur TikTok. Cette Ring Light Pro de 18 pouces possède un grand trépied ajustable et 3 modes de couleur pour sublimer tes visuels.'\n【Appel à l'action】: 'Disponible immédiatement à Dakar. Commande en un clic !'"
        ],
        hashtags: ["#TikTokDakar", "#CreateurDeContenuSenegal", "#RingLightDakar", "#BeauteDakar", "#CoiffureDakar", "#DakarGalsen", "#EcomSenegal", "#SourcingChine"]
    },
    {
        id: "prod-4",
        name: "Montre Connectée Smartwatch Ultra Series 9",
        image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&q=80",
        buyPrice: 2300,
        transportCost: 1200,
        localFees: 1500,
        recommendedSalePrice: 15500,
        competitors: "Moyen",
        status: "viral",
        score: 9.1,
        category: "Technologie",
        description: "Smartwatch dernière génération avec écran AMOLED tactile, suivi du rythme cardiaque, appels Bluetooth et étanchéité IP68.",
        hooks: [
            "⌚ Pourquoi payer 400 000 FCFA pour une montre quand tu peux avoir les mêmes fonctions pour 15 000 FCFA ?",
            "Reçois tes appels, tes messages WhatsApp et suis ta santé directement sur ton poignet.",
            "Le cadeau idéal et super élégant à offrir à un proche au Sénégal !",
            "Compatible avec iPhone et tous les téléphones Android. Regarde la fluidité !",
            "Design robuste, sportif et ultra-moderne qui s'adapte à tous tes styles."
        ],
        scripts: [
            "【Hook】: Tapote l'écran de la montre pour l'allumer et réponds à un appel simulé.\n【Corps】: 'Voici la Smartwatch Ultra Series 9. Elle te permet de passer des appels en Bluetooth sans sortir ton téléphone dans les embouteillages de Dakar. Elle traque aussi tes pas, tes calories et ton sommeil.'\n【Appel à l'action】: 'Profite de notre offre de lancement spéciale. Livraison en 24h !'"
        ],
        hashtags: ["#MontreConnecteeDakar", "#SmartwatchSenegal", "#TechDakar", "#GalsenTech", "#DakarEcom", "#ModeSenegal", "#CadeauHommeDakar", "#AlibabaAfrique"]
    },
    {
        id: "prod-5", name: "Humidificateur d'air Lumineux", image: "https://images.unsplash.com/photo-1602524816277-6f5fee0f7f37?w=500&q=80",
        buyPrice: 700, transportCost: 900, localFees: 1000, recommendedSalePrice: 7500,
        competitors: "Faible", status: "stable", score: 8.5, category: "Maison",
        description: "Humidificateur et diffuseur d'huiles essentielles avec veilleuse LED.",
        hooks: ["Transforme ta chambre en un spa relaxant avec ce petit gadget.", "Finis les problèmes de nez sec avec la climatisation."],
        scripts: ["【Hook】: Montre la fumée relaxante qui sort de l'humidificateur dans le noir avec ses LEDs.\n【Corps】: 'Ce diffuseur parfume ta chambre et purifie l'air pour mieux dormir...'"],
        hashtags: ["#DecoDakar", "#BienEtreSenegal"]
    },
    {
        id: "prod-6", name: "Écouteurs Sans Fil Pro Étanches", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80",
        buyPrice: 1200, transportCost: 500, localFees: 800, recommendedSalePrice: 9900,
        competitors: "Élevé", status: "risky", score: 7.2, category: "Technologie",
        description: "Écouteurs Bluetooth 5.3 avec réduction de bruit et boîtier de charge.",
        hooks: ["Des basses incroyables pour moins de 10 000 FCFA !", "Marre des fils qui s'emmêlent dans le bus ?"],
        scripts: ["【Hook】: Mets les écouteurs dans tes oreilles et danse sur une musique.\n【Corps】: 'Le son de ces écouteurs est juste magique. 24h d'autonomie et ils résistent même à la transpiration...'"],
        hashtags: ["#TechSenegal", "#EcouteursDakar"]
    },
    {
        id: "prod-7", name: "Tondeuse Cheveux & Barbe Vintage", image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&q=80",
        buyPrice: 1500, transportCost: 800, localFees: 1000, recommendedSalePrice: 12000,
        competitors: "Moyen", status: "viral", score: 9.5, category: "Beauté Homme",
        description: "Tondeuse de précision rechargeable, corps en métal avec motifs gravés, pour des contours parfaits.",
        hooks: ["Fais tes contours comme un pro sans aller chez le coiffeur !", "Le cadeau parfait pour qu'il soit toujours frais."],
        scripts: ["【Hook】: Fais un zoom sur la lame ultra précise en train de tracer un contour net.\n【Corps】: 'Fini les salons de coiffure chaque semaine. Avec cette tondeuse vintage, tes contours sont toujours propres...'"],
        hashtags: ["#CoiffureHommeDakar", "#BarbierSenegal"]
    },
    {
        id: "prod-8", name: "Ceinture Chauffante Menstruelle", image: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=500&q=80",
        buyPrice: 1800, transportCost: 1000, localFees: 1200, recommendedSalePrice: 14000,
        competitors: "Faible", status: "viral", score: 9.2, category: "Santé Femme",
        description: "Ceinture chauffante et massante pour soulager les douleurs menstruelles instantanément.",
        hooks: ["Soulage tes douleurs menstruelles en moins de 3 minutes !", "Plus besoin de bouillotte d'eau chaude dangereuse."],
        scripts: ["【Hook】: Fille assise qui a mal au ventre, puis sourit après avoir mis la ceinture.\n【Corps】: 'Cette ceinture magique chauffe et masse en même temps. Elle soulage tes crampes pour que tu puisses vivre ta journée normalement...'"],
        hashtags: ["#SanteFemmeDakar", "#BienEtreSenegal"]
    },
    {
        id: "prod-9", name: "Aspirateur de Voiture Sans Fil", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80",
        buyPrice: 1700, transportCost: 1500, localFees: 1200, recommendedSalePrice: 15000,
        competitors: "Moyen", status: "stable", score: 8.4, category: "Auto",
        description: "Mini aspirateur puissant et compact pour nettoyer votre voiture rapidement, n'importe où.",
        hooks: ["Garde ta voiture toujours propre sans aller à la station de lavage !", "Aspire la poussière, le sable et les miettes en un instant."],
        scripts: ["【Hook】: Aspire des miettes sur le siège de la voiture en 2 secondes.\n【Corps】: 'Plus besoin de payer pour nettoyer l'intérieur de ta voiture. Ce mini aspirateur sans fil se range dans la boîte à gants et est super puissant...'"],
        hashtags: ["#AutoDakar", "#VoitureSenegal"]
    },
    {
        id: "prod-10", name: "Mini Fer à Repasser Portable", image: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=500&q=80",
        buyPrice: 1100, transportCost: 1000, localFees: 1000, recommendedSalePrice: 8500,
        competitors: "Moyen", status: "stable", score: 8.7, category: "Maison & Voyage",
        description: "Fer à repasser vapeur compact, idéal pour les voyages et les retouches rapides le matin.",
        hooks: ["Tes vêtements toujours impeccables, même en voyage !", "Repasse ta chemise en 1 minute avant de sortir."],
        scripts: ["【Hook】: Montre une chemise froissée qui devient lisse en un passage avec le mini fer.\n【Corps】: 'Ce petit fer vapeur chauffe en 30 secondes et se glisse dans n'importe quel sac. Indispensable pour être toujours présentable...'"],
        hashtags: ["#ModeDakar", "#VoyageSenegal"]
    },
    {
        id: "prod-11", name: "Hachoir Électrique Multifonction", image: "https://images.unsplash.com/photo-1585325701165-32b00b944c16?w=500&q=80",
        buyPrice: 1900, transportCost: 2000, localFees: 1500, recommendedSalePrice: 16000,
        competitors: "Moyen", status: "viral", score: 9.0, category: "Cuisine",
        description: "Hachoir en acier inoxydable de grande capacité, parfait pour la viande, les oignons et les épices.",
        hooks: ["Prépare tes repas de Tabaski / Korité deux fois plus vite !", "Hache la viande et les légumes sans effort."],
        scripts: ["【Hook】: Hache un oignon entier en 3 secondes sans pleurer.\n【Corps】: 'Maman, voici le secret pour gagner du temps en cuisine. Ce hachoir puissant fait tout le travail difficile à ta place...'"],
        hashtags: ["#CuisineSenegalaise", "#DakarGourmand"]
    },
    {
        id: "prod-12", name: "Projecteur LED Home Cinéma", image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&q=80",
        buyPrice: 7200, transportCost: 3500, localFees: 2500, recommendedSalePrice: 35000,
        competitors: "Élevé", status: "risky", score: 7.5, category: "Technologie",
        description: "Mini projecteur portable pour transformer votre salon ou chambre en salle de cinéma.",
        hooks: ["Ton propre cinéma à la maison pour moins du prix d'une télé !", "Regarde les matchs et les films sur un écran géant sur ton mur."],
        scripts: ["【Hook】: Montre un film projeté sur un grand mur blanc dans une chambre sombre.\n【Corps】: 'Connecte simplement ton téléphone ou ton ordinateur, et profite d'une image jusqu'à 100 pouces. Le son est intégré !'"],
        hashtags: ["#CinemaDakar", "#TechSenegal"]
    },
    {
        id: "prod-13", name: "Brosse Soufflante 3 en 1", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&q=80",
        buyPrice: 1500, transportCost: 1200, localFees: 1000, recommendedSalePrice: 13000,
        competitors: "Moyen", status: "viral", score: 8.8, category: "Beauté Femme",
        description: "Sèche, brosse et donne du volume à vos cheveux en une seule étape.",
        hooks: ["Un brushing de salon fait à la maison en 10 minutes !", "Dompte tes cheveux facilement tous les matins."],
        scripts: ["【Hook】: Montre des cheveux mouillés transformés en un brushing parfait.\n【Corps】: 'Économise l'argent du salon de coiffure. Cette brosse magique sèche et lisse en même temps pour un résultat professionnel...'"],
        hashtags: ["#BeauteDakar", "#CoiffureSenegal"]
    },
    {
        id: "prod-14", name: "Gourde Isotherme Intelligente", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80",
        buyPrice: 900, transportCost: 800, localFees: 800, recommendedSalePrice: 7000,
        competitors: "Élevé", status: "stable", score: 8.1, category: "Sport & Santé",
        description: "Gourde qui maintient l'eau froide 24h ou chaude 12h, avec écran tactile LED affichant la température.",
        hooks: ["Garde ton eau glacée toute la journée sous la chaleur de Dakar !", "Vérifie la température de ton café avant de te brûler."],
        scripts: ["【Hook】: Touche le bouchon et montre la température qui s'affiche en LED.\n【Corps】: 'Cette gourde n'est pas comme les autres. Elle te dit exactement à quelle température est ta boisson et la garde fraîche toute la journée...'"],
        hashtags: ["#SportSenegal", "#GadgetDakar"]
    },
    {
        id: "prod-15", name: "Sac à Dos Antivol Imperméable", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80",
        buyPrice: 2100, transportCost: 1500, localFees: 1200, recommendedSalePrice: 15000,
        competitors: "Moyen", status: "stable", score: 8.6, category: "Mode & Bagagerie",
        description: "Sac à dos avec fermetures cachées, port USB de charge et tissu résistant à l'eau.",
        hooks: ["Protège ton ordinateur et tes affaires des pickpockets !", "Le sac parfait pour les étudiants et travailleurs à Dakar."],
        scripts: ["【Hook】: Essaie d'ouvrir le sac de dos sans trouver la fermeture.\n【Corps】: 'Ce sac antivol a la fermeture zippée cachée contre ton dos. Personne ne peut l'ouvrir dans les transports. Et il a même un port USB pour charger ton tel !'"],
        hashtags: ["#ModeDakar", "#EtudiantSenegal"]
    },
    {
        id: "prod-16", name: "Correcteur de Posture Intelligent", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80",
        buyPrice: 1100, transportCost: 600, localFees: 800, recommendedSalePrice: 9000,
        competitors: "Faible", status: "viral", score: 9.3, category: "Santé",
        description: "Ceinture avec capteur qui vibre lorsque vous courbez le dos, pour vous aider à vous tenir droit.",
        hooks: ["Arrête d'avoir le dos voûté devant ton téléphone !", "Le gadget qui t'aide à avoir une posture fière et sans douleur."],
        scripts: ["【Hook】: Personne courbée, le capteur vibre, elle se redresse immédiatement.\n【Corps】: 'Ce correcteur de posture invisible sous les vêtements vibre doucement dès que tu te tiens mal. En 2 semaines, ton dos sera droit naturellement...'"],
        hashtags: ["#SanteSenegal", "#BienEtreDakar"]
    },
    {
        id: "prod-17", name: "Épilateur Laser IPL Permanent", image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500&q=80",
        buyPrice: 3600, transportCost: 1500, localFees: 1500, recommendedSalePrice: 28000,
        competitors: "Faible", status: "viral", score: 9.6, category: "Beauté",
        description: "Épilateur à lumière pulsée pour réduire la pousse des poils à domicile, sans douleur.",
        hooks: ["Fini l'épilation douloureuse ou les rasoirs qui irritent la peau !", "Une peau lisse en permanence à faire soi-même à la maison."],
        scripts: ["【Hook】: Flash de l'épilateur sur la jambe en douceur.\n【Corps】: 'Obtiens des résultats d'institut de beauté depuis ton canapé. Cet épilateur IPL détruit la racine du poil sans aucune douleur...'"],
        hashtags: ["#BeauteSenegal", "#SoinsPeauDakar"]
    },
    {
        id: "prod-18", name: "Support Téléphone Voiture Aimanté", image: "https://images.unsplash.com/photo-1609726494499-27d3e942456c?w=500&q=80",
        buyPrice: 500, transportCost: 400, localFees: 500, recommendedSalePrice: 4500,
        competitors: "Élevé", status: "risky", score: 6.8, category: "Auto",
        description: "Support de fixation magnétique ultra puissant pour la grille d'aération de la voiture.",
        hooks: ["Le support de téléphone le plus discret et solide pour ta voiture !", "Pose ton téléphone en une seconde, il ne tombera jamais."],
        scripts: ["【Hook】: Approche le téléphone et CLAC, il se fixe solidement au support.\n【Corps】: 'Conduis en sécurité sans chercher ton téléphone. Cet aimant est tellement puissant que même sur les routes cabossées, ton tel ne bouge pas.'"],
        hashtags: ["#AutoSenegal", "#GadgetVoiture"]
    },
    {
        id: "prod-19", name: "Mini Imprimante Thermique Bluetooth", image: "https://images.unsplash.com/photo-1612833603922-5b2fc5f6b13e?w=500&q=80",
        buyPrice: 2400, transportCost: 1000, localFees: 1200, recommendedSalePrice: 18000,
        competitors: "Moyen", status: "stable", score: 8.5, category: "Technologie",
        description: "Imprimante sans encre pour imprimer photos, étiquettes ou notes directement depuis le smartphone.",
        hooks: ["Imprime tes souvenirs ou tes étiquettes depuis ton téléphone en 2 secondes !", "L'imprimante magique qui fonctionne sans aucune goutte d'encre."],
        scripts: ["【Hook】: Prends une photo et lance l'impression depuis l'appli sur le téléphone.\n【Corps】: 'Cette mini imprimante thermique tient dans la poche et n'a jamais besoin d'encre ! Parfaite pour les étudiants ou pour organiser ta maison...'"],
        hashtags: ["#TechDakar", "#AstuceSenegal"]
    },
    {
        id: "prod-20", name: "Masseur de Cou & Épaules Shiatsu", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&q=80",
        buyPrice: 3300, transportCost: 2500, localFees: 1500, recommendedSalePrice: 25000,
        competitors: "Faible", status: "stable", score: 8.8, category: "Santé",
        description: "Appareil de massage en U avec fonction chauffante pour dénouer les tensions du cou et des trapèzes.",
        hooks: ["Soulage tes tensions au cou après une dure journée de travail !", "Un massage shiatsu profond avec chaleur relaxante à la maison."],
        scripts: ["【Hook】: Personne avec le masseur autour du cou, les yeux fermés et très détendue.\n【Corps】: 'Plus besoin d'aller au spa. Ce masseur malaxe exactement comme de vraies mains et chauffe pour détendre tous tes muscles fatigués...'"],
        hashtags: ["#SanteDakar", "#RelaxationSenegal"]
    }
];

// App User Session Mock
let USER_SESSION = {
    isAuthenticated: false,
    name: "Invité",
    email: "",
    phone: "",
    isPremium: false,
    score: 0,
    simulations: []
};

// Initial Load
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    setupRouter();
    setupAuthFlow();
    setupCalculator();
    renderTrendingProducts();
    setupIAMarketing();
    setupBusinessSimulator();
    setupPaymentSimulator(); // Also registers: profile save, market analysis, sim decisions
    updateDashboardUI();
    // Auto-restore session on page load
    const savedSession = getSession();
    if (savedSession && savedSession.isAuthenticated) {
        USER_SESSION = { ...USER_SESSION, ...savedSession };
        showView("app-dashboard");
        updateDashboardUI();
    }
    setupSwipeSidebar();
    setupChatbot();
    setupComments();
});

// ========================================================
//                 2. ROUTING & VIEW CONTROLLER
// ========================================================
function setupRouter() {
    // Main Landing triggers
    document.getElementById("btn-login-nav").addEventListener("click", () => showView("auth-page", "login"));
    document.getElementById("btn-register-nav").addEventListener("click", () => showView("auth-page", "register"));
    document.getElementById("btn-login-mob").addEventListener("click", () => showView("auth-page", "login"));
    document.getElementById("btn-register-mob").addEventListener("click", () => showView("auth-page", "register"));
    document.getElementById("hero-btn-register").addEventListener("click", () => showView("auth-page", "register"));
    document.getElementById("pricing-btn-subscribe").addEventListener("click", () => showView("auth-page", "register"));
    
    // Demo button: requires real registration for security
    document.getElementById("hero-btn-demo").addEventListener("click", () => {
        const session = getSession();
        if (session) {
            USER_SESSION = { ...USER_SESSION, ...session };
            showView("app-dashboard");
            updateDashboardUI();
        } else {
            showToast("Veuillez vous inscrire pour acceder a la demonstration. Vos données sont protegées.", "info");
            showView("auth-page", "register");
        }
    });

    document.getElementById("demo-cta-btn").addEventListener("click", () => {
        showView("auth-page", "register");
    });

    // Mobile menu toggle on Landing
    const mobToggle = document.getElementById("mobile-menu-toggle");
    const mobNav = document.getElementById("mobile-nav");
    mobToggle.addEventListener("click", () => {
        const isOpen = mobNav.style.display === "block";
        mobNav.style.display = isOpen ? "none" : "block";
    });

    // Close mobile menu on clicking any link
    document.querySelectorAll(".mobile-nav-link").forEach(link => {
        link.addEventListener("click", () => {
            mobNav.style.display = "none";
        });
    });

    // Back to home from auth
    document.getElementById("auth-btn-back-home").addEventListener("click", (e) => {
        e.preventDefault();
        showView("landing-page");
    });

    // Sidebar Tab Changer
    const menuItems = document.querySelectorAll(".menu-item[data-tab]");
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = item.getAttribute("data-tab");
            appSwitchTab(tabId);
            
            // On mobile, close sidebar after choosing a tab
            const sidebar = document.getElementById("app-sidebar");
            sidebar.classList.remove("active");
        });
    });

    // Sidebar Mobile Toggles
    document.getElementById("sidebar-open-btn").addEventListener("click", () => {
        document.getElementById("app-sidebar").classList.add("active");
    });
    document.getElementById("sidebar-close-btn").addEventListener("click", () => {
        document.getElementById("app-sidebar").classList.remove("active");
    });

    // VIP Group Link Trigger
    document.getElementById("btn-vip-group").addEventListener("click", (e) => {
        e.preventDefault();
        appSwitchTab("tab-academy");
        showToast("Dirigez-vous vers la section Communauté ci-dessous !", "info");
    });

    // Log-out trigger
    document.getElementById("btn-logout").addEventListener("click", () => {
        USER_SESSION.isAuthenticated = false;
        clearSession();
        showToast("Vous avez été déconnecté.", "info");
        showView("landing-page");
    });
}

function showView(viewId, subForm = null) {
    document.getElementById("landing-page").className = "view-hidden";
    document.getElementById("auth-page").className = "view-hidden";
    document.getElementById("app-dashboard").className = "view-hidden";

    document.getElementById(viewId).className = "view-active";

    if (viewId === "auth-page" && subForm) {
        toggleAuthForm(subForm);
    }
    
    // Scroll window back to top on transitions
    window.scrollTo(0, 0);
}

function appSwitchTab(tabId) {
    // Deactivate all tabs
    document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.classList.remove("active");
    });
    document.querySelectorAll(".menu-item[data-tab]").forEach(item => {
        item.classList.remove("active");
    });

    // Activate selected
    const activePanel = document.getElementById(tabId);
    if (activePanel) {
        activePanel.classList.add("active");
    }
    const activeMenu = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
    if (activeMenu) {
        activeMenu.classList.add("active");
    }

    // Set page title
    const titles = {
        "tab-overview": "Dashboard Principal",
        "tab-products": "Produits Tendances",
        "tab-calculator": "Calculateur de Marges",
        "tab-marketing-ia": "Copilote de Marketing IA",
        "tab-image-ia": "Générateur d'Images IA",
        "tab-simulation": "Simulateur Business Plan",
        "tab-market-trends": "Analyses Ecom & Saisons",
        "tab-academy": "Ecom Académie & VIP",
        "tab-account": "Gestion du Compte"
    };
    document.getElementById("app-page-title").textContent = titles[tabId] || "Scalify";
}

// ========================================================
//                 3. AUTHENTICATION & SESSIONS
// ========================================================
function setupAuthFlow() {
    // Links togglers inside Auth Box
    document.getElementById("link-register").addEventListener("click", (e) => { e.preventDefault(); toggleAuthForm("register"); });
    document.getElementById("link-login").addEventListener("click", (e) => { e.preventDefault(); toggleAuthForm("login"); });
    document.getElementById("link-forgot").addEventListener("click", (e) => { e.preventDefault(); toggleAuthForm("forgot"); });
    document.getElementById("link-back-login").addEventListener("click", (e) => { e.preventDefault(); toggleAuthForm("login"); });

    // Submit forms
    document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        const user = findUserByEmail(email);
        if (!user) {
            showToast("Aucun compte trouve pour cet email. Veuillez vous inscrire.", "danger"); return;
        }
        if (user.password !== password) {
            showToast("Mot de passe incorrect. Verifiez vos identifiants.", "danger"); return;
        }
        // Show OTP verification
        pendingVerification = { type: 'login', user };
        const otp = generateOTP();
        pendingVerification.otp = otp;
        document.getElementById("otp-phone-hint").textContent = user.phone.slice(0,-4).replace(/./g,'*') + user.phone.slice(-4);
        document.getElementById("otp-simulated-code").textContent = `Code simule : ${otp}`;
        toggleAuthForm("otp");
    });

    document.getElementById("register-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("register-name").value.trim();
        const email = document.getElementById("register-email").value.trim().toLowerCase();
        const phone = document.getElementById("register-phone").value.replace(/\s/g,'');
        const password = document.getElementById("register-password").value;
        if (password.length < 8) { showToast("Le mot de passe doit contenir au moins 8 caracteres.", "danger"); return; }
        // Uniqueness check
        if (findUserByEmail(email)) {
            showToast("Cette adresse email est deja utilisee. Veuillez vous connecter.", "danger");
            toggleAuthForm("login");
            document.getElementById("login-email").value = email;
            return;
        }
        if (findUserByPhone(phone)) {
            showToast("Ce numero de telephone est deja associe a un compte. Veuillez vous connecter.", "danger");
            toggleAuthForm("login"); return;
        }
        // OTP verification before account creation
        pendingVerification = { type: 'register', data: { name, email, phone, password } };
        const otp = generateOTP();
        pendingVerification.otp = otp;
        document.getElementById("otp-phone-hint").textContent = `+221 ${phone.slice(0,-4).replace(/./g,'*')}${phone.slice(-4)}`;
        document.getElementById("otp-simulated-code").textContent = `Code simule : ${otp}`;
        toggleAuthForm("otp");
    });

    document.getElementById("forgot-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("forgot-email").value.trim();
        if (!findUserByEmail(email)) { showToast("Aucun compte associe a cet email.", "danger"); return; }
        showToast("Lien de reinitialisation envoye a votre email.", "success");
        toggleAuthForm("login");
    });

    // OTP verification submit
    document.getElementById("otp-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const entered = document.getElementById("otp-input").value.trim();
        if (!pendingVerification) { return; }
        if (entered !== pendingVerification.otp) {
            showToast("Code incorrect. Verifiez le code affiche (simulation).", "danger"); return;
        }
        if (pendingVerification.type === 'register') {
            const user = registerUser(pendingVerification.data);
            USER_SESSION = { isAuthenticated: true, ...user };
            saveSession(USER_SESSION);
            pendingVerification = null;
            showToast("Compte verifie. Votre cle d'acces : " + user.accessKey, "success");
            // Show access key in a visible place
            showAccessKeyNotice(user.accessKey);
            showView("app-dashboard");
            updateDashboardUI();
            openPaymentModal();
        } else if (pendingVerification.type === 'login') {
            const user = pendingVerification.user;
            USER_SESSION = { isAuthenticated: true, ...user };
            saveSession(USER_SESSION);
            pendingVerification = null;
            showToast("Connexion reussie. Bienvenue " + user.name + ".", "success");
            showView("app-dashboard");
            updateDashboardUI();
        }
    });
}

function toggleAuthForm(formType) {
    document.getElementById("login-form-wrapper").className = "auth-form-wrapper hidden";
    document.getElementById("register-form-wrapper").className = "auth-form-wrapper hidden";
    document.getElementById("forgot-form-wrapper").className = "auth-form-wrapper hidden";
    document.getElementById("otp-form-wrapper").className = "auth-form-wrapper hidden";

    if (formType === "login") {
        document.getElementById("login-form-wrapper").className = "auth-form-wrapper";
    } else if (formType === "register") {
        document.getElementById("register-form-wrapper").className = "auth-form-wrapper";
    } else if (formType === "forgot") {
        document.getElementById("forgot-form-wrapper").className = "auth-form-wrapper";
    } else if (formType === "otp") {
        document.getElementById("otp-form-wrapper").className = "auth-form-wrapper";
    }
}

// Update UI metrics in the main app dashboard based on USER_SESSION state
function updateDashboardUI() {
    // Restore session from localStorage if needed
    if (!USER_SESSION.isAuthenticated) {
        const saved = getSession();
        if (saved) { USER_SESSION = { ...USER_SESSION, ...saved }; }
    }
    const isPremium = USER_SESSION.isPremium;

    // Profile headers
    document.getElementById("user-display-name").textContent = USER_SESSION.name || "Utilisateur";
    document.getElementById("header-avatar").textContent = (USER_SESSION.name || "U").substring(0,2).toUpperCase();
    document.getElementById("prof-name").value = USER_SESSION.name || "";
    document.getElementById("prof-email").value = USER_SESSION.email || "";
    // Phone is locked - show but disable
    const phoneInput = document.getElementById("prof-phone");
    phoneInput.value = USER_SESSION.phone || "";
    phoneInput.disabled = true;
    phoneInput.title = "Le numero de telephone ne peut pas etre modifie apres inscription.";
    document.getElementById("header-user-score").textContent = `${USER_SESSION.score || 0} pts`;

    // Level display
    const level = USER_SESSION.level || 1;
    const levelEl = document.getElementById("user-level-badge");
    if (levelEl) levelEl.textContent = `Niveau ${level}`;

    // Premium logic
    const subBadge = document.getElementById("user-sub-badge");
    const subPill = document.getElementById("header-sub-pill");
    const ovSub = document.getElementById("overview-sub-status");
    const accSub = document.getElementById("account-sub-status-label");

    if (USER_SESSION.isPremium) {
        subBadge.textContent = "Premium VIP 🇸🇳";
        subBadge.className = "badge badge-success-outline";
        subPill.textContent = "VIP ACTIF";
        subPill.className = "badge badge-success";
        ovSub.textContent = "Premium Actif";
        ovSub.className = "metric-value text-success";
        accSub.textContent = "Payé (Actif)";
        accSub.className = "text-success font-bold";
        
        // Cacher le bouton d'activation si déjà payé
        const subActionZone = document.getElementById("subscription-action-zone");
        if (subActionZone) subActionZone.classList.add("hidden");
    } else {
        subBadge.textContent = "Freemium Inactif";
        subBadge.className = "badge badge-warning";
        subPill.textContent = "ESSAI LIMITE";
        subPill.className = "badge badge-warning";
        ovSub.textContent = "Inactif / Expiré";
        ovSub.className = "metric-value text-warning";
        accSub.textContent = "Non payé (Inactif)";
        accSub.className = "text-warning font-bold";

        // Afficher le bouton d'activation si non payé
        const subActionZone = document.getElementById("subscription-action-zone");
        if (subActionZone) subActionZone.classList.remove("hidden");
    }

    // Dynamic calculations for Overview Dashboard
    let totalMargin = 0;
    let totalRoi = 0;
    const simCount = USER_SESSION.simulations.length;
    
    USER_SESSION.simulations.forEach(sim => {
        totalMargin += sim.margin;
        totalRoi += sim.roi;
    });

    const avgRoi = simCount > 0 ? Math.round(totalRoi / simCount) : 0;
    let scoreRentabilite = 0;
    if (avgRoi > 100) scoreRentabilite = 10;
    else if (avgRoi > 80) scoreRentabilite = 9;
    else if (avgRoi > 50) scoreRentabilite = 7;
    else if (avgRoi > 30) scoreRentabilite = 5;
    else if (avgRoi > 0) scoreRentabilite = 3;

    const elProfits = document.getElementById("overview-simulated-profits");
    if (elProfits) elProfits.textContent = `${totalMargin.toLocaleString()} FCFA`;
    
    const elAvgScore = document.getElementById("overview-avg-score");
    if (elAvgScore) elAvgScore.textContent = `${scoreRentabilite} / 10`;

    // We can also update the description text using DOM navigation if we didn't add an ID
    if (elProfits && elProfits.nextElementSibling) {
        elProfits.nextElementSibling.textContent = `à travers ${simCount} simulations de projets actives`;
    }

    // Populate recent simulation list in overview
    const recList = document.getElementById("recent-products-list");
    recList.innerHTML = "";
    USER_SESSION.simulations.forEach(sim => {
        const div = document.createElement("div");
        div.className = "recent-prod-item";
        div.innerHTML = `
            <div class="recent-prod-left">
                <h4>${sim.productName}</h4>
                <span>Simulé le ${sim.date}</span>
            </div>
            <div class="recent-prod-right">
                <span class="price">+${sim.margin.toLocaleString()} F</span>
                <span class="metric-desc">${sim.roi}% ROI</span>
            </div>
        `;
        recList.appendChild(div);
    });

    // Populate product drop downs
    populateProductSelects();
}

// ========================================================
//                 4. TRENDING PRODUCTS CATALOG
// ========================================================
function renderTrendingProducts() {
    const grid = document.getElementById("trending-products-grid");
    grid.innerHTML = "";

    TRENDING_PRODUCTS.forEach(prod => {
        // Calculate dynamic values
        const realTotalCost = prod.buyPrice + prod.transportCost + prod.localFees;
        const profitMargin = prod.recommendedSalePrice - realTotalCost;
        const roi = Math.round((profitMargin / realTotalCost) * 100);

        let badgeClass = "badge-success";
        let badgeLabel = "🔥 Viral";
        if (prod.status === "stable") {
            badgeClass = "badge-accent";
            badgeLabel = "📈 Stable";
        } else if (prod.status === "risky") {
            badgeClass = "badge-danger";
            badgeLabel = "⚠️ Risqué";
        }

        const card = document.createElement("div");
        card.className = "prod-card";
        card.innerHTML = `
            <div class="prod-img-box">
                <img src="${prod.image}" alt="${prod.name}">
                <div class="prod-badges">
                    <span class="badge ${badgeClass}">${badgeLabel}</span>
                    <span class="badge badge-secondary">${prod.category}</span>
                </div>
            </div>
            <div class="prod-details-box">
                <h3>${prod.name}</h3>
                
                <div class="prod-metrics-table">
                    <div class="prod-metric-row">
                        <span class="label">Prix Fournisseur (Chine)</span>
                        <span class="val">${prod.buyPrice.toLocaleString()} FCFA</span>
                    </div>
                    <div class="prod-metric-row">
                        <span class="label">Transport & Livraison Est.</span>
                        <span class="val">${(prod.transportCost + prod.localFees).toLocaleString()} FCFA</span>
                    </div>
                    <div class="prod-metric-row highlight">
                        <span class="label">Marge Nette (Conseillée)</span>
                        <span class="val">+${profitMargin.toLocaleString()} FCFA</span>
                    </div>
                    <div class="prod-metric-row">
                        <span class="label">Prix de Vente Recommandé</span>
                        <span class="val">${prod.recommendedSalePrice.toLocaleString()} FCFA</span>
                    </div>
                </div>

                <div class="flex justify-between align-center mb-1">
                    <span class="text-sm text-muted">ROI : <strong>${roi}%</strong></span>
                    <span class="text-sm text-muted">Score : <strong>${prod.score}/10</strong></span>
                </div>

                <div class="prod-actions">
                    <button class="btn btn-primary btn-sm" onclick="triggerSimForProduct('${prod.id}')">Simuler Profit</button>
                    <button class="btn btn-secondary btn-sm" onclick="triggerMktForProduct('${prod.id}')"><i data-lucide="bot" class="inline-icon"></i> Générer Marketing IA</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    // Add event listener to "Ajouter un produit" button
    document.getElementById("btn-add-custom-product").addEventListener("click", () => {
        showToast("Fonction d'ajout de produit disponible pour les membres VIP. Formulaire simulé !", "info");
    });

    // Re-trigger icon parsing
    lucide.createIcons();
}

function triggerSimForProduct(prodId) {
    const prod = TRENDING_PRODUCTS.find(p => p.id === prodId);
    if (!prod) return;

    // Fill form in calculator
    document.getElementById("calc-buy-price").value = prod.buyPrice;
    document.getElementById("calc-quantity").value = 100;
    document.getElementById("calc-frais-locaux").value = prod.localFees * 100;
    document.getElementById("calc-delivery").value = 1500;
    document.getElementById("calc-sale-price").value = prod.recommendedSalePrice;

    appSwitchTab("tab-calculator");
    calculateProfits();
}

function triggerMktForProduct(prodId) {
    const select = document.getElementById("mkt-product-select");
    select.value = prodId;
    appSwitchTab("tab-marketing-ia");
    generateMarketingTexts();
}

function populateProductSelects() {
    const selects = ["mkt-product-select", "img-product-select", "sim-product"];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = "";
        TRENDING_PRODUCTS.forEach(prod => {
            const opt = document.createElement("option");
            opt.value = prod.id;
            opt.textContent = prod.name;
            select.appendChild(opt);
        });
    });
}

// ========================================================
//                 5. CALCULATEUR DYNAMIQUE
// ========================================================
function setupCalculator() {
    document.getElementById("btn-trigger-calculate").addEventListener("click", calculateProfits);
    
    // Toggle Boat/Air inputs
    const modeSelect = document.getElementById("calc-transport-mode");
    if(modeSelect) {
        modeSelect.addEventListener("change", function() {
            if (this.value === "bateau") {
                document.getElementById("boat-inputs").classList.remove("hidden");
                document.getElementById("air-inputs").classList.add("hidden");
            } else {
                document.getElementById("boat-inputs").classList.add("hidden");
                document.getElementById("air-inputs").classList.remove("hidden");
            }
        });
    }

    // Landing demo dynamic calculation
    const demoInputs = ["demo-purchase", "demo-sale", "demo-fret"];
    demoInputs.forEach(inputId => {
        document.getElementById(inputId).addEventListener("input", runDemoCalculation);
    });

    // Save simulation
    const btnSave = document.getElementById("btn-save-simulation");
    if(btnSave) {
        btnSave.addEventListener("click", () => {
            const qty = parseInt(document.getElementById("calc-quantity").value) || 0;
            const buyPrice = parseInt(document.getElementById("calc-buy-price").value) || 0;
        
        let trans = 0;
        const mode = document.getElementById("calc-transport-mode") ? document.getElementById("calc-transport-mode").value : "bateau";
        if (mode === "bateau") {
            const length = parseFloat(document.getElementById("calc-length").value) || 0;
            const width = parseFloat(document.getElementById("calc-width").value) || 0;
            const height = parseFloat(document.getElementById("calc-height").value) || 0;
            trans = (length * width * height) * 180000;
        } else {
            const weight = parseFloat(document.getElementById("calc-weight").value) || 0;
            trans = weight * 8000;
        }

        const local = parseInt(document.getElementById("calc-frais-locaux").value) || 0;
        const deliveryCost = parseInt(document.getElementById("calc-delivery").value) || 0;
        const salePrice = parseInt(document.getElementById("calc-sale-price").value) || 0;
        
        const unitCost = buyPrice + (trans / qty) + (local / qty) + deliveryCost;
        const margin = salePrice - unitCost;
        const roi = Math.round((margin / unitCost) * 100);

        // Save
        USER_SESSION.simulations.unshift({
            productName: "Simulation Personnalisée",
            totalCost: Math.round(unitCost),
            salePrice: salePrice,
            margin: Math.round(margin * qty),
            roi: roi,
            date: "Aujourd'hui"
        });
        
        USER_SESSION.score += 50; // Increase score!
        showToast("Simulation enregistrée dans votre dashboard ! (+50 pts)", "success");
        updateDashboardUI();
    });
    }

    // Trigger initial calculation
    setTimeout(calculateProfits, 500);
}

function calculateProfits() {
    const buyPrice = parseInt(document.getElementById("calc-buy-price").value) || 0;
    const qty = parseInt(document.getElementById("calc-quantity").value) || 0;
    
    let trans = 0;
    const mode = document.getElementById("calc-transport-mode") ? document.getElementById("calc-transport-mode").value : "bateau";
    if (mode === "bateau") {
        const length = parseFloat(document.getElementById("calc-length").value) || 0;
        const width = parseFloat(document.getElementById("calc-width").value) || 0;
        const height = parseFloat(document.getElementById("calc-height").value) || 0;
        trans = (length * width * height) * 180000;
    } else {
        const weight = parseFloat(document.getElementById("calc-weight").value) || 0;
        trans = weight * 8000;
    }

    const local = parseInt(document.getElementById("calc-frais-locaux").value) || 0;
    const deliveryCost = parseInt(document.getElementById("calc-delivery").value) || 0;
    const adBudget = parseInt(document.getElementById("calc-ad-budget").value) || 0;
    const salePrice = parseInt(document.getElementById("calc-sale-price").value) || 0;

    if (qty <= 0) {
        showToast("Veuillez entrer une quantité valide supérieure à 0.", "danger");
        return;
    }

    // Calculations
    const totalCargoExp = trans + local;
    const unitImportCost = buyPrice + (totalCargoExp / qty);
    const totalUnitCost = unitImportCost + deliveryCost;
    
    // Total investment (Achat + Transport + Douane + Pub)
    const totalInvestment = (buyPrice * qty) + totalCargoExp + adBudget;
    
    // Revenue & Margins
    const totalRevenue = salePrice * qty;
    const unitMargin = salePrice - totalUnitCost;
    
    // Total profit incorporating advertisement budget
    const totalNetProfit = (unitMargin * qty) - adBudget;
    const roi = Math.round((totalNetProfit / totalInvestment) * 100);

    // Render results
    document.getElementById("calc-res-unit-cost").textContent = `${Math.round(totalUnitCost).toLocaleString()} FCFA`;
    document.getElementById("calc-res-unit-margin").textContent = `${unitMargin > 0 ? '+' : ''}${Math.round(unitMargin).toLocaleString()} FCFA`;
    document.getElementById("calc-res-total-invest").textContent = `${Math.round(totalInvestment).toLocaleString()} FCFA`;
    document.getElementById("calc-res-total-margin").textContent = `${totalNetProfit > 0 ? '+' : ''}${Math.round(totalNetProfit).toLocaleString()} FCFA`;
    document.getElementById("calc-res-roi").textContent = `${roi}% ROI`;

    // Advisory logic
    const advBox = document.getElementById("calc-advisory-box");
    const advIcon = document.getElementById("calc-advisory-icon");
    const advTitle = document.getElementById("calc-advisory-title");
    const advText = document.getElementById("calc-advisory-text");

    if (roi >= 80 && unitMargin > 4000) {
        advBox.className = "advisory-box success bg-glass mt-1";
        advIcon.textContent = "🏆";
        advTitle.textContent = "Opportunité en or !";
        advText.textContent = "Ce produit dispose d'une marge exceptionnelle au Sénégal. L'investissement est très solide et résistera bien à l'augmentation possible des budgets pub sur TikTok.";
    } else if (roi >= 30 && roi < 80) {
        advBox.className = "advisory-box success bg-glass mt-1";
        advIcon.textContent = "📈";
        advTitle.textContent = "Rentabilité Stable";
        advText.textContent = "Le produit est rentable avec un ROI correct. Surveillez attentivement votre coût d'acquisition client (CAC). Assurez-vous d'avoir des livreurs réactifs à Dakar pour réduire le taux de retour.";
    } else {
        advBox.className = "advisory-box danger bg-glass mt-1";
        advIcon.textContent = "⚠️";
        advTitle.textContent = "Projet à Haut Risque !";
        advText.textContent = "La marge est beaucoup trop faible pour couvrir les risques liés à l'e-commerce en Afrique (livraisons échouées, publicité chère). Nous vous recommandons de négocier le prix d'achat Chine ou d'augmenter votre prix de vente conseillé.";
    }
}

function runDemoCalculation() {
    const buy = parseInt(document.getElementById("demo-purchase").value) || 0;
    const sale = parseInt(document.getElementById("demo-sale").value) || 0;
    const fret = parseInt(document.getElementById("demo-fret").value) || 0;

    // Delivery & local logistics estimated
    const delivery = 1500;
    const douane = 1000;

    const realUnitCost = buy + fret + delivery + douane;
    const margin = sale - realUnitCost;
    const roi = Math.round((margin / realUnitCost) * 100);

    document.getElementById("demo-res-cost").textContent = `${realUnitCost.toLocaleString()} FCFA`;
    document.getElementById("demo-res-margin").textContent = `${margin > 0 ? '+' : ''}${margin.toLocaleString()} FCFA`;
    document.getElementById("demo-res-roi").textContent = `${roi}% ROI`;

    const scoreBadge = document.getElementById("demo-res-score");
    if (roi >= 100) {
        scoreBadge.textContent = "Excellent (9.6/10)";
        scoreBadge.className = "badge badge-success";
    } else if (roi >= 50 && roi < 100) {
        scoreBadge.textContent = "Modéré (7.8/10)";
        scoreBadge.className = "badge badge-warning";
    } else {
        scoreBadge.textContent = "Risqué (4.2/10)";
        scoreBadge.className = "badge badge-danger";
    }
}

// ========================================================
//                 6. IA MARKETING COPILOT
// ========================================================
function setupIAMarketing() {
    document.getElementById("btn-generate-mkt").addEventListener("click", generateMarketingTexts);
    
    // Mkt Tab switcher
    document.querySelectorAll(".mkt-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".mkt-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const targetId = btn.getAttribute("data-mkt");
            document.querySelectorAll(".mkt-content-panel").forEach(p => p.classList.remove("active"));
            document.getElementById(targetId).classList.add("active");
        });
    });

    // AI Prompt Image generator link
    document.getElementById("btn-generate-img-prompt").addEventListener("click", generateImagePrompt);
    document.getElementById("btn-copy-img-prompt").addEventListener("click", () => {
        const text = document.getElementById("image-prompt-output").textContent;
        navigator.clipboard.writeText(text);
        showToast("Prompt image copié dans le presse-papiers !", "success");
    });
}

function generateMarketingTexts() {
    const prodId = document.getElementById("mkt-product-select").value;
    const prod = TRENDING_PRODUCTS.find(p => p.id === prodId);
    if (!prod) return;

    const mktStatus = document.getElementById("mkt-status-badge");
    mktStatus.textContent = "Génération IA...";
    mktStatus.className = "badge badge-warning";

    // Simulate AI text generation delay
    setTimeout(() => {
        mktStatus.textContent = "Généré";
        mktStatus.className = "badge badge-success";

        // Fill hooks
        const hooksContainer = document.getElementById("generated-hooks-container");
        hooksContainer.innerHTML = "";
        prod.hooks.forEach((hook, index) => {
            const div = document.createElement("div");
            div.className = "mkt-card-item";
            div.innerHTML = `
                <h4>Hook TikTok #${index + 1} <button class="copy-bubble-btn" onclick="copyText(this)">Copier</button></h4>
                <p>"${hook}"</p>
            `;
            hooksContainer.appendChild(div);
        });

        // Fill scripts
        const scriptsContainer = document.getElementById("generated-scripts-container");
        scriptsContainer.innerHTML = "";
        prod.scripts.forEach((script, index) => {
            const div = document.createElement("div");
            div.className = "mkt-card-item";
            div.innerHTML = `
                <h4>Script Vidéo TikTok / Reels #${index + 1} <button class="copy-bubble-btn" onclick="copyText(this)">Copier</button></h4>
                <p>${script}</p>
            `;
            scriptsContainer.appendChild(div);
        });

        // Fill WhatsApp/Ads copy
        const copyContainer = document.getElementById("generated-copy-container");
        copyContainer.innerHTML = "";
        
        const whatsappCopy = `💬 *OFFRE SPÉCIALE DAKAR* 🇸🇳\n\nMarre des produits inefficaces ? Découvrez le *${prod.name}* ! 🔥\n\n✨ *Pourquoi vous allez l'adorer :*\n- ${prod.description}\n- Matériaux durables et garantis\n- Ultra simple d'utilisation au quotidien\n\n💰 *PRIX PROMO :* ${prod.recommendedSalePrice.toLocaleString()} FCFA au lieu de ${(prod.recommendedSalePrice * 1.4).toLocaleString()} FCFA !\n📦 *LIVRAISON EXPRESS* dans toute la région de Dakar (Paiement sécurisé Wave ou Cash en main au livreur).\n\nPour commander, envoyez-nous votre adresse et numéro de téléphone directement par WhatsApp en cliquant sur ce lien ! ⚡`;
        
        const hashtagsText = prod.hashtags.join(" ");

        const divAd = document.createElement("div");
        divAd.className = "mkt-card-item";
        divAd.innerHTML = `
            <h4>Copywriting WhatsApp & SMS <button class="copy-bubble-btn" onclick="copyText(this)">Copier</button></h4>
            <p>${whatsappCopy}</p>
        `;
        copyContainer.appendChild(divAd);

        const divHash = document.createElement("div");
        divHash.className = "mkt-card-item";
        divHash.innerHTML = `
            <h4>Hashtags Tendances Sénégal <button class="copy-bubble-btn" onclick="copyText(this)">Copier</button></h4>
            <p>${hashtagsText}</p>
        `;
        copyContainer.appendChild(divHash);

        showToast("Textes marketing générés avec succès par l'IA !", "success");
        USER_SESSION.score += 20;
        updateDashboardUI();
    }, 1000);
}

function generateImagePrompt() {
    const prodId = document.getElementById("img-product-select").value;
    const prod = TRENDING_PRODUCTS.find(p => p.id === prodId);
    if (!prod) return;

    const style = document.getElementById("img-style").value;
    const platform = document.getElementById("img-platform").value;

    let styleDesc = "";
    let ar = "--ar 1:1";

    if (style === "luxury") {
        styleDesc = "high-end luxury product photography, commercial studio setting, golden hours lighting, soft dramatic shadows, dark obsidian backdrop, 8k resolution, elegant, photorealistic, ultra-detailed";
    } else if (style === "minimalist") {
        styleDesc = "clean minimalist product showcase, soft natural daylight, simple concrete beige backdrop, light wood accents, scandinavian design aesthetic, sharp focus, magazine editorial style";
    } else if (style === "lifestyle") {
        styleDesc = "lifestyle product photography, modern African urban background, bright tropical sunlight, lush green foliage accents, vibrant colors, premium commercial styling, real-life context";
    } else {
        styleDesc = "clean e-commerce product photograph, pure white background, studio lightning, clear reflections, high-definition, sharp details, optimized for Shopify, commercial display";
    }

    if (platform === "tiktok") ar = "--ar 9:16";
    else if (platform === "facebook") ar = "--ar 16:9";

    const promptText = `Professional product photo of a ${prod.name}, ${styleDesc}, shot on 85mm lens, f/1.8, cinematic lighting, award-winning composition, commercial design showcase, --v 6.0 ${ar}`;

    document.getElementById("image-prompt-output").textContent = promptText;
    showToast("Prompt d'image conçu !", "success");
}

function copyText(button) {
    const paragraph = button.parentElement.nextElementSibling;
    navigator.clipboard.writeText(paragraph.textContent);
    showToast("Copié !", "success");
}

// ========================================================
//                 7. BUSINESS SIMULATOR (V2)
// ========================================================
function setupBusinessSimulator() {
    document.getElementById("btn-run-simulation").addEventListener("click", runBusinessSimulation);
}

function runBusinessSimulation() {
    const prodId = document.getElementById("sim-product").value;
    const prod = TRENDING_PRODUCTS.find(p => p.id === prodId);
    if (!prod) return;

    const stockQty = parseInt(document.getElementById("sim-qty").value) || 100;
    const dailyAd = parseInt(document.getElementById("sim-ad-daily").value) || 5000;
    const cac = parseInt(document.getElementById("sim-cac").value) || 1500;
    const deliveryRate = parseFloat(document.getElementById("sim-delivery-rate").value) || 0.8;

    // Unit costs
    const unitImport = prod.buyPrice + prod.transportCost + prod.localFees;
    const deliveryCost = 1500;
    const totalUnitCost = unitImport + deliveryCost;

    // Simulation metrics
    const dailySalesEst = Math.round(dailyAd / cac);
    if (dailySalesEst <= 0) {
        showToast("Le budget pub journalier est trop faible pour générer des ventes selon ce CAC.", "danger");
        return;
    }

    const daysToDeplete = Math.ceil(stockQty / dailySalesEst);
    const finalDays = Math.min(daysToDeplete, 30); // Max 30 days visualization

    // Let's model daily finances
    let remainingStock = stockQty;
    let cashFlow = - (stockQty * unitImport) - (finalDays * dailyAd); // Initial negative investment (Stock purchase + Ad commit)
    let cumulativeRevenue = 0;
    let breakEvenDay = -1;
    let profitHistory = [];
    let cashflowHistory = [];

    for (let day = 1; day <= finalDays; day++) {
        const potentialSales = Math.min(dailySalesEst, remainingStock);
        remainingStock -= potentialSales;

        // Sales success vs failures (delivery rates)
        const successfulDeliveries = Math.round(potentialSales * deliveryRate);
        const failedDeliveries = potentialSales - successfulDeliveries;

        // Financial impacts
        const revenue = successfulDeliveries * prod.recommendedSalePrice;
        // Costs: Delivery costs are paid for all attempts, plus returned freight on fails
        const dayDeliveryCost = (potentialSales * deliveryCost) + (failedDeliveries * 1000); 

        cumulativeRevenue += revenue;
        cashFlow += (revenue - dayDeliveryCost);

        cashflowHistory.push(cashFlow);
        profitHistory.push({ day, cashFlow, remainingStock });

        if (cashFlow >= 0 && breakEvenDay === -1) {
            breakEvenDay = day;
        }
    }

    // Results rendering
    document.getElementById("sim-res-days").textContent = `${finalDays} jours`;
    document.getElementById("sim-res-ca").textContent = `${cumulativeRevenue.toLocaleString()} FCFA`;
    document.getElementById("sim-res-net-profit").textContent = `${cashFlow > 0 ? '+' : ''}${cashFlow.toLocaleString()} FCFA`;
    document.getElementById("sim-res-breakeven").textContent = breakEvenDay !== -1 ? `Jour ${breakEvenDay}` : "Non atteint";

    if (cashFlow < 0) {
        document.getElementById("sim-res-net-profit").className = "val text-danger";
    } else {
        document.getElementById("sim-res-net-profit").className = "val text-success";
    }

    // Draw custom SVG chart!
    drawSvgSimulationChart(cashflowHistory, finalDays);

    // Show launch/decline decision panel
    const decisionPanel = document.getElementById("sim-decision-panel");
    if (decisionPanel) {
        decisionPanel.classList.remove("hidden");
        decisionPanel.dataset.cashflow = cashFlow;
        decisionPanel.dataset.prodId = prodId;
        decisionPanel.dataset.days = finalDays;
    }

    showToast("Simulation terminee. Choisissez votre decision ci-dessous.", "success");
    USER_SESSION.score += 30;
    updateDashboardUI();
}

function drawSvgSimulationChart(history, totalDays) {
    const wrapper = document.getElementById("sim-svg-chart");
    wrapper.innerHTML = "";

    const width = 380;
    const height = 150;
    const padding = 20;

    // Find min and max cashflow
    const minVal = Math.min(0, ...history);
    const maxVal = Math.max(...history);
    const valRange = maxVal - minVal;

    // Plotting coordinates
    let points = "";
    history.forEach((val, i) => {
        const x = padding + (i * (width - 2 * padding) / (totalDays - 1));
        // Invert Y since SVG Y starts from top
        const y = height - padding - ((val - minVal) * (height - 2 * padding) / valRange);
        points += `${x},${y} `;
    });

    // Zero-line Y coordinate
    const zeroY = height - padding - ((0 - minVal) * (height - 2 * padding) / valRange);

    const svg = `
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-full">
            <!-- Grid Lines -->
            <line x1="${padding}" y1="${padding}" x2="${width-padding}" y2="${padding}" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3" />
            <line x1="${padding}" y1="${height/2}" x2="${width-padding}" y2="${height/2}" stroke="rgba(255,255,255,0.03)" stroke-dasharray="3" />
            <line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="rgba(255,255,255,0.05)" />
            
            <!-- Zero Break-even baseline -->
            <line x1="${padding}" y1="${zeroY}" x2="${width-padding}" y2="${zeroY}" stroke="rgba(255, 107, 0, 0.4)" stroke-width="1.5" stroke-dasharray="4" />
            <text x="${width - 80}" y="${zeroY - 4}" fill="#ff6b00" font-size="7" font-weight="bold">SEUIL DE RENTABILITÉ</text>

            <!-- Chart Line Curve -->
            <polyline fill="none" stroke="#10b981" stroke-width="2.5" points="${points}" />

            <!-- Highlight Data Points -->
            ${history.map((val, i) => {
                const x = padding + (i * (width - 2 * padding) / (totalDays - 1));
                const y = height - padding - ((val - minVal) * (height - 2 * padding) / valRange);
                // Highlight only last and break-even points
                if (i === history.length - 1 || (val >= 0 && history[Math.max(0, i-1)] < 0)) {
                    return `<circle cx="${x}" cy="${y}" r="4" fill="#ffffff" stroke="#10b981" stroke-width="2" />`;
                }
                return "";
            }).join("")}
            
            <!-- Axis labels -->
            <text x="${padding}" y="${height - 6}" fill="#9ca3af" font-size="7">Jour 1</text>
            <text x="${width - padding - 30}" y="${height - 6}" fill="#9ca3af" font-size="7">Jour ${totalDays}</text>
            <text x="${padding}" y="${padding + 8}" fill="#10b981" font-size="7" font-weight="bold">CASHFLOW MAX : ${Math.round(maxVal/1000)}K F</text>
        </svg>
    `;
    wrapper.innerHTML = svg;
}

// ========================================================
//        8. PAIEMENT CINETPAY (SÉCURISÉ VIA BACKEND)
// ========================================================
// ⚠️ AUCUNE clé API, mot de passe ou secret CinetPay
//    n'est présent dans ce fichier JavaScript frontend.
//    Toutes les opérations sensibles passent par le serveur
//    Express (/api/payment/*) qui détient les credentials.
// ========================================================

function setupPaymentSimulator() {
    // Close payment modal
    document.getElementById("btn-close-payment-modal").addEventListener("click", closePaymentModal);
    
    // ── Bouton principal : Payer via CinetPay ──────────────
    document.getElementById("btn-confirm-payment").addEventListener("click", async () => {
        const phone = document.getElementById("payment-phone-input").value.trim();
        const accessKeyInput = document.getElementById("payment-access-key");
        const enteredKey = accessKeyInput ? accessKeyInput.value.trim() : "";

        // Validation côté client (données NON sensibles)
        if (!phone) {
            showToast("Veuillez saisir votre numéro Mobile Money.", "danger");
            return;
        }
        if (!enteredKey) {
            showToast("Veuillez saisir votre clé d'accès personnelle.", "danger");
            return;
        }
        // Vérifier la clé d'accès localement
        if (USER_SESSION.accessKey && enteredKey.toUpperCase() !== USER_SESSION.accessKey) {
            showToast("Clé d'accès incorrecte. Vérifiez la clé attribuée lors de l'inscription.", "danger");
            return;
        }

        const btn = document.getElementById("btn-confirm-payment");
        const statusZone = document.getElementById("payment-status-zone");
        const statusText = document.getElementById("payment-status-text");

        btn.disabled = true;
        btn.textContent = "Initialisation du paiement...";
        statusZone.classList.remove("hidden");
        statusText.textContent = "Connexion sécurisée au serveur de paiement...";

        try {
            // ── Appeler NOTRE backend (pas CinetPay directement) ──
            // Le backend injecte les clés API de son côté
            const response = await fetch('http://localhost:3000/api/payment/initialize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: 5000,
                    customerName: USER_SESSION.name || 'Client SCALIFY',
                    customerEmail: USER_SESSION.email || 'client@scalify.sn',
                    customerPhone: phone.replace(/\s/g, '')
                })
            });

            const data = await response.json();

            if (data.success && data.payment_url) {
                // Sauvegarder l'ID de transaction pour vérification au retour
                localStorage.setItem('scalify_pending_tx', data.transaction_id);
                
                statusText.textContent = "Redirection vers CinetPay...";
                showToast("Redirection vers la page de paiement sécurisée CinetPay...", "success");
                
                // Rediriger vers la page de paiement CinetPay
                setTimeout(() => {
                    window.location.href = data.payment_url;
                }, 800);
            } else {
                // Erreur renvoyée par notre backend
                statusZone.classList.add("hidden");
                showToast(data.message || "Erreur lors de l'initialisation du paiement.", "danger");
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="lock" class="inline-icon"></i> Payer 5 000 FCFA via CinetPay';
                if (window.lucide) lucide.createIcons();
            }
        } catch (error) {
            // Erreur réseau ou serveur non disponible
            statusZone.classList.add("hidden");
            console.error("Erreur paiement:", error);
            showToast("Impossible de contacter le serveur de paiement. Vérifiez votre connexion.", "danger");
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="lock" class="inline-icon"></i> Payer 5 000 FCFA via CinetPay';
            if (window.lucide) lucide.createIcons();
        }
    });

    // ── Bouton d'activation d'abonnement (Onglet Compte) ───
    const btnActivateSub = document.getElementById("btn-activate-subscription");
    if (btnActivateSub) {
        btnActivateSub.addEventListener("click", () => {
            openPaymentModal();
        });
    }

    // ── Bouton caché (Test : forcer l'expiration) ──────────
    const btnSimulateExpire = document.getElementById("btn-simulate-expire");
    if (btnSimulateExpire) {
        btnSimulateExpire.addEventListener("click", () => {
            USER_SESSION.isPremium = false;
            updateUser(USER_SESSION.email, { isPremium: false });
            saveSession(USER_SESSION);
            showToast("Abonnement expiré par simulation. (Mode test)", "warning");
            updateDashboardUI();
        });
    }

    // ── Décisions post-simulation (lancement / déclin) ─────
    const btnLaunch = document.getElementById("btn-sim-launch");
    const btnDecline = document.getElementById("btn-sim-decline");
    if (btnLaunch) {
        btnLaunch.addEventListener("click", () => {
            const panel = document.getElementById("sim-decision-panel");
            const decision = { type: 'launch', prodId: panel.dataset.prodId, cashflow: parseFloat(panel.dataset.cashflow), date: new Date().toLocaleDateString('fr-FR') };
            USER_SESSION.decisions = USER_SESSION.decisions || [];
            USER_SESSION.decisions.unshift(decision);
            USER_SESSION.level = Math.min(10, (USER_SESSION.level || 1) + 1);
            USER_SESSION.score += 100;
            updateUser(USER_SESSION.email, { decisions: USER_SESSION.decisions, level: USER_SESSION.level, score: USER_SESSION.score });
            saveSession(USER_SESSION);
            panel.classList.add("hidden");
            updateDashboardUI();
            showToast(`Decision enregistree : Lancement confirme. Vous passez au Niveau ${USER_SESSION.level}. (+100 pts)`, "success");
        });
    }
    if (btnDecline) {
        btnDecline.addEventListener("click", () => {
            const panel = document.getElementById("sim-decision-panel");
            const decision = { type: 'decline', prodId: panel.dataset.prodId, cashflow: parseFloat(panel.dataset.cashflow), date: new Date().toLocaleDateString('fr-FR') };
            USER_SESSION.decisions = USER_SESSION.decisions || [];
            USER_SESSION.decisions.unshift(decision);
            USER_SESSION.score += 20;
            updateUser(USER_SESSION.email, { decisions: USER_SESSION.decisions, score: USER_SESSION.score });
            saveSession(USER_SESSION);
            panel.classList.add("hidden");
            updateDashboardUI();
            showToast("Decision enregistree : Projet decline. Votre historique est mis a jour. (+20 pts)", "info");
        });
    }

    // ── Profil : édition du nom ────────────────────────────
    const profileForm = document.getElementById("profile-edit-form");
    if (profileForm) {
        profileForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const newName = document.getElementById("prof-name").value.trim();
            if (!newName) { showToast("Le nom ne peut pas etre vide.", "danger"); return; }
            USER_SESSION.name = newName;
            updateUser(USER_SESSION.email, { name: newName });
            saveSession(USER_SESSION);
            updateDashboardUI();
            showToast("Nom mis a jour avec succes.", "success");
        });
    }

    // ── Analyse de marché IA ──────────────────────────────
    const btnAnalyzeMarket = document.getElementById("btn-analyze-product");
    if (btnAnalyzeMarket) {
        btnAnalyzeMarket.addEventListener("click", () => {
            const query = document.getElementById("market-product-query").value.trim();
            if (!query) { showToast("Veuillez saisir un produit a analyser.", "danger"); return; }
            analyzeProductMarket(query);
        });
    }

    // ── Vérifier si l'utilisateur revient d'un paiement CinetPay ──
    checkPaymentReturn();
}

// ── Vérification du retour de paiement CinetPay ────────────
// Quand CinetPay redirige l'utilisateur vers notre site après paiement,
// on vérifie le statut auprès de notre backend (qui contacte CinetPay
// avec les clés API côté serveur).
async function checkPaymentReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const txId = urlParams.get('tx') || localStorage.getItem('scalify_pending_tx');

    if (!paymentStatus || !txId) return;

    // Nettoyer l'URL pour ne pas re-déclencher au prochain refresh
    window.history.replaceState({}, document.title, window.location.pathname);

    if (paymentStatus === 'success') {
        showToast("Vérification de votre paiement en cours...", "info");

        try {
            // Appeler notre backend pour vérifier (le backend utilise la clé API)
            const response = await fetch('http://localhost:3000/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transaction_id: txId })
            });

            const data = await response.json();

            if (data.success && data.is_paid) {
                // Paiement confirmé par CinetPay via notre backend !
                USER_SESSION.isPremium = true;
                USER_SESSION.score += 200;
                updateUser(USER_SESSION.email, { isPremium: true, score: USER_SESSION.score });
                saveSession(USER_SESSION);
                localStorage.removeItem('scalify_pending_tx');
                showToast("✅ Paiement confirmé ! Votre abonnement VIP est maintenant actif.", "success");
                updateDashboardUI();
                
                // Afficher le dashboard si l'utilisateur est connecté
                const session = getSession();
                if (session && session.isAuthenticated) {
                    USER_SESSION = { ...USER_SESSION, ...session, isPremium: true };
                    showView("app-dashboard");
                    updateDashboardUI();
                }
            } else {
                showToast("Le paiement n'a pas été confirmé. Statut : " + (data.status || 'inconnu'), "warning");
            }
        } catch (error) {
            console.error("Erreur vérification paiement:", error);
            showToast("Impossible de vérifier le paiement. Contactez le support.", "danger");
        }
    } else if (paymentStatus === 'cancel') {
        showToast("Paiement annulé. Vous pouvez réessayer à tout moment.", "warning");
        localStorage.removeItem('scalify_pending_tx');
    }
}

function openPaymentModal() {
    const modal = document.getElementById("payment-modal");
    modal.classList.remove("hidden");
    // Pré-remplir le téléphone si disponible
    if (USER_SESSION.phone) {
        document.getElementById("payment-phone-input").value = USER_SESSION.phone;
    }
    // Pré-remplir la clé d'accès si disponible
    if (USER_SESSION.accessKey) {
        document.getElementById("payment-access-key").value = USER_SESSION.accessKey;
    }
    // Reset le statut
    const btn = document.getElementById("btn-confirm-payment");
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="lock" class="inline-icon"></i> Payer 5 000 FCFA via CinetPay';
    document.getElementById("payment-status-zone").classList.add("hidden");
    if (window.lucide) lucide.createIcons();
}

function closePaymentModal() {
    document.getElementById("payment-modal").classList.add("hidden");
}

// ========================================================
//                 9. TOAST NOTIFICATION SYSTEM
// ========================================================
// ========================================================
//          9. MARKET ANALYSIS AI ENGINE
// ========================================================
function analyzeProductMarket(query) {
    const resultBox = document.getElementById("market-ai-result");
    if (!resultBox) return;
    resultBox.innerHTML = `<div class="text-muted text-sm">Analyse du marche senegalais pour "${query}" en cours...</div>`;
    resultBox.classList.remove("hidden");

    // Simulate AI analysis delay
    setTimeout(() => {
        const lowerQ = query.toLowerCase();
        // Scoring heuristics based on keywords
        let score = Math.floor(60 + Math.random() * 35);
        let demand = "Moderee";
        let competition = "Moyenne";
        let trend = "Stable";
        let advice = "";
        let riskLevel = "Modere";

        const viralKeywords = ["blender","smoothie","masseur","massage","smartwatch","montre","sac","imperméable","impermeable","gadget","bougie","parfum","cosmétique","cosmetique","huile"];
        const saturatedKeywords = ["ring light","écouteur","ecouteur","pistolet","projecteur","power bank","iphone","samsung"];
        const seasonalKeywords = ["ramadan","tabaski","noël","noel","rentrée","rentree","pluie","hivernage"];

        if (viralKeywords.some(k => lowerQ.includes(k))) {
            score = Math.min(98, score + 20);
            demand = "Tres forte";
            trend = "En hausse";
            competition = "Faible a moyenne";
            riskLevel = "Faible";
            advice = `Le produit "${query}" presente une forte demande sur le marche senegalais. Le sourcing depuis Alibaba est recommande avec un fret aerien pour une mise en vente rapide. Budget publicitaire conseille : 5 000 - 15 000 FCFA/jour sur TikTok Ads et Facebook Ads Dakar.`;
        } else if (saturatedKeywords.some(k => lowerQ.includes(k))) {
            score = Math.max(20, score - 30);
            demand = "Saturee";
            trend = "En baisse";
            competition = "Tres elevee";
            riskLevel = "Eleve";
            advice = `Le segment "${query}" est fortement sature au Senegal. Les marges sont tres faibles en raison de la concurrence directe sur Facebook Marketplace et TikTok Shop. Nous vous deconseillons d'investir dans cette niche sans une differentiation produit tres forte (bundle, garantie, livraison ultra-rapide).`;
        } else if (seasonalKeywords.some(k => lowerQ.includes(k))) {
            score = Math.min(95, score + 15);
            demand = "Forte (Saisonniere)";
            trend = "Pic saisonnier";
            competition = "Moderee";
            riskLevel = "Faible pendant la saison";
            advice = `Le produit "${query}" est a fort potentiel saisonnier. Preparez votre stock 6 semaines avant le pic de demande. Negociez les prix fret en avance pour eviter les ruptures de capacite cargo. La fenetre d'opportunite est courte mais tres lucrative.`;
        } else {
            advice = `Le produit "${query}" presente un potentiel standard sur le marche senegalais. Verifiez la demande locale via Facebook Ads Audience Manager pour Dakar avant d'investir dans un stock important. Commandez un lot test de 30 a 50 unites pour valider la demande.`;
        }

        resultBox.innerHTML = `
            <div class="market-ai-analysis-card bg-glass p-15 rounded border-accent mt-1">
                <div class="flex justify-between align-center mb-1">
                    <h4>Analyse IA : <strong>${query}</strong></h4>
                    <span class="badge ${score >= 75 ? 'badge-success' : score >= 50 ? 'badge-warning' : 'badge-danger'}">${score}/100</span>
                </div>
                <div class="grid grid-3 gap-1 mb-1">
                    <div class="small-stat bg-dark p-1 rounded">
                        <span class="label">Demande locale</span>
                        <span class="val text-accent">${demand}</span>
                    </div>
                    <div class="small-stat bg-dark p-1 rounded">
                        <span class="label">Concurrence</span>
                        <span class="val">${competition}</span>
                    </div>
                    <div class="small-stat bg-dark p-1 rounded">
                        <span class="label">Tendance</span>
                        <span class="val ${trend.includes('hausse') ? 'text-success' : trend.includes('baisse') ? 'text-danger' : 'text-warning'}">${trend}</span>
                    </div>
                </div>
                <div class="advisory-box bg-dark p-1 rounded mt-05" style="border-left: 4px solid ${riskLevel === 'Faible' ? 'var(--color-success)' : riskLevel === 'Eleve' ? 'var(--color-danger)' : 'var(--color-warning)'};">
                    <div class="mb-05"><strong>Recommandation IA :</strong></div>
                    <p class="text-sm">${advice}</p>
                </div>
            </div>
        `;
    }, 1200);
}

function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast active";
    if (type === "success") toast.classList.add("success");
    else if (type === "danger") toast.classList.add("danger");
    else if (type === "warning") toast.classList.add("warning");
    setTimeout(() => { toast.className = "toast hidden"; }, 4500);
}

// ========================================================
//          10. ACCESS KEY NOTICE OVERLAY
// ========================================================
function showAccessKeyNotice(key) {
    const overlay = document.getElementById("access-key-notice");
    if (!overlay) return;
    document.getElementById("access-key-display").textContent = key;
    overlay.classList.remove("hidden");
    document.getElementById("btn-close-access-key").addEventListener("click", () => {
        overlay.classList.add("hidden");
    });
}

// ========================================================
//          11. SWIPE SIDEBAR (MOBILE TOUCH)
// ========================================================
function setupSwipeSidebar() {
    let touchStartX = 0;
    let touchEndX = 0;
    const sidebar = document.getElementById("app-sidebar");
    const dashEl = document.getElementById("app-dashboard");
    if (!sidebar || !dashEl) return;

    dashEl.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    dashEl.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        // Swipe right to open (from left edge)
        if (diff > 70 && touchStartX < 60) {
            sidebar.classList.add("active");
        }
        // Swipe left to close
        if (diff < -70) {
            sidebar.classList.remove("active");
        }
    }, { passive: true });

    // Also handle swipe inside sidebar to close
    sidebar.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    sidebar.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX - touchStartX < -70) {
            sidebar.classList.remove("active");
        }
    }, { passive: true });
}

// ========================================================
//          12. FLOATING CHATBOT
// ========================================================
function setupChatbot() {
    const toggleBtn = document.getElementById("chatbot-toggle");
    const panel = document.getElementById("chatbot-panel");
    const closeBtn = document.getElementById("chatbot-close");
    const sendBtn = document.getElementById("chatbot-send");
    const input = document.getElementById("chatbot-input");
    const messages = document.getElementById("chatbot-messages");
    if (!toggleBtn || !panel) return;

    toggleBtn.addEventListener("click", () => {
        panel.classList.toggle("hidden");
        toggleBtn.classList.toggle("active");
    });
    closeBtn.addEventListener("click", () => {
        panel.classList.add("hidden");
        toggleBtn.classList.remove("active");
    });

    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;
        appendMsg("user", text);
        input.value = "";
        // Simulate bot reply
        setTimeout(() => {
            const reply = getBotReply(text);
            appendMsg("bot", reply);
        }, 800);
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    function appendMsg(role, text) {
        const div = document.createElement("div");
        div.className = role === "user" ? "chat-msg user" : "chat-msg bot";
        div.textContent = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function getBotReply(q) {
        const lower = q.toLowerCase();
        if (lower.includes("prix") || lower.includes("tarif") || lower.includes("abonnement"))
            return "L'abonnement SCALIFY est de 5 000 FCFA/mois avec acces complet a tous les outils. Paiement par Wave ou Orange Money.";
        if (lower.includes("cle") || lower.includes("acces"))
            return "Votre cle d'acces unique vous a ete attribuee lors de l'inscription. Elle est visible dans votre espace Compte. Contactez-nous si vous l'avez perdue.";
        if (lower.includes("produit") || lower.includes("tendance"))
            return "Consultez l'onglet Produits Gagnants pour decouvrir les articles les plus rentables du moment au Senegal.";
        if (lower.includes("livraison") || lower.includes("transport"))
            return "Les frais de fret dependent du poids et du mode (aerien 10-15j ou maritime 30-45j). Utilisez le Calculateur pour estimer vos couts reels.";
        if (lower.includes("simulation") || lower.includes("business"))
            return "Le Simulateur Business Plan V2 vous permet de modeliser vos ventes sur 30 jours avec budget pub, CAC et taux de livraison.";
        if (lower.includes("contact") || lower.includes("aide") || lower.includes("support"))
            return "Pour toute assistance, rejoignez notre groupe Telegram VIP ou envoyez un email a support@scalify.sn.";
        return "Merci pour votre message. Pour une aide plus detaillee, utilisez les modules du dashboard ou contactez notre support via le groupe Telegram VIP.";
    }
}

// ========================================================
//                 20. USER COMMENTS (ABONNEMENT)
// ========================================================
const COMMENTS_KEY = 'scalify_comments_v1';
function getComments() { try { return JSON.parse(localStorage.getItem(COMMENTS_KEY)) || getDefaultComments(); } catch(e) { return getDefaultComments(); } }
function saveComments(c) { localStorage.setItem(COMMENTS_KEY, JSON.stringify(c)); }
function getDefaultComments() {
    return [
        { id: "c1", author: "Moussa Diop", date: "Il y a 2 heures", text: "La plateforme est incroyable. J'ai trouve mon premier produit gagnant grace au calculateur. Le dashboard est tres intuitif." },
        { id: "c2", author: "Fatou Sow", date: "Il y a 5 heures", text: "L'outil IA pour les videos TikTok m'a fait gagner enormement de temps. L'abonnement VIP est tres vite rentabilise !" },
        { id: "c3", author: "Ousmane Ndiaye", date: "Hier", text: "L'analyse des tendances locales est un game changer. Je sais exactement quand lancer mes campagnes pour la Tabaski maintenant." },
        { id: "c4", author: "Aicha Fall", date: "Il y a 2 jours", text: "Le simulateur de marge m'a évité de perdre de l'argent sur un produit qui semblait rentable mais dont les frais de douane étaient trop élevés." },
        { id: "c5", author: "Ibrahima Sy", date: "Il y a 3 jours", text: "Très bon outil. La génération de scripts de vente est très pertinente pour le marché sénégalais." },
        { id: "c6", author: "Khady Gueye", date: "Il y a 1 semaine", text: "Je recommande fortement ! Le service client via le chatbot est réactif et les produits gagnants sont vraiment top." },
        { id: "c7", author: "Cheikh Lo", date: "Il y a 2 semaines", text: "Le meilleur investissement pour mon business e-commerce cette année. Merci l'équipe !" }
    ];
}

let visibleCommentsCount = 3;

function setupComments() {
    renderComments();
    
    const loadMoreBtn = document.getElementById("btn-load-more-comments");
    if(loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            visibleCommentsCount += 3;
            renderComments();
        });
    }

    const form = document.getElementById("comment-form");
    if(form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            if(!USER_SESSION.isAuthenticated) {
                showToast("Veuillez vous connecter pour laisser un avis.", "danger");
                return;
            }
            
            const text = document.getElementById("comment-text").value.trim();
            if(text) {
                const comments = getComments();
                comments.unshift({
                    id: "c" + Date.now(),
                    author: USER_SESSION.name || "Abonne VIP",
                    date: "A l'instant",
                    text: text
                });
                saveComments(comments);
                document.getElementById("comment-text").value = "";
                renderComments();
                showToast("Votre avis a ete publie avec succes !", "success");
            }
        });
    }
}

function renderComments() {
    const list = document.getElementById("comments-list");
    const loadMoreBtn = document.getElementById("btn-load-more-comments");
    if(!list) return;
    
    const comments = getComments();
    list.innerHTML = "";
    
    if(comments.length === 0) {
        list.innerHTML = "<p class='text-sm text-muted'>Aucun commentaire pour le moment. Soyez le premier !</p>";
        if(loadMoreBtn) loadMoreBtn.classList.add("hidden");
        return;
    }

    const visibleComments = comments.slice(0, visibleCommentsCount);
    
    visibleComments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment-item";
        div.innerHTML = `
            <div class="comment-item-header">
                <span class="comment-author">
                    ${c.author} 
                    ${(USER_SESSION.isAuthenticated && c.author === USER_SESSION.name) || c.author === "Abonne VIP" ? '<span class="text-xs text-muted font-normal ml-1">(Vous)</span>' : ''}
                </span>
                <span class="comment-date">${c.date}</span>
            </div>
            <div class="comment-body">${c.text}</div>
        `;
        list.appendChild(div);
    });

    if(loadMoreBtn) {
        if(visibleCommentsCount < comments.length) {
            loadMoreBtn.classList.remove("hidden");
        } else {
            loadMoreBtn.classList.add("hidden");
        }
    }
    
    if(window.lucide) {
        lucide.createIcons();
    }
}