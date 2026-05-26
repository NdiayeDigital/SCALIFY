# SCALIFY - Résumé du SaaS

## 🚀 Présentation de SCALIFY
SCALIFY est une plateforme SaaS (Software as a Service) novatrice conçue spécifiquement pour les entrepreneurs et e-commerçants en Afrique, avec un focus particulier sur le marché sénégalais. Son objectif est de simplifier et d'optimiser toutes les étapes de la création d'un business e-commerce rentable, de la recherche du produit gagnant jusqu'à la création d'un plan marketing soutenu par l'intelligence artificielle.

## 🎯 Proposition de Valeur
*   **Accessibilité:** Permettre aux e-commerçants débutants comme experts de structurer leurs activités.
*   **Rentabilité:** Diminuer le risque financier grâce à des simulateurs de marges ultra-précis tenant compte des réalités locales (fret, douanes, livraison).
*   **Gain de temps:** Des outils IA pour générer des scripts marketing, des hooks TikTok et des argumentaires de vente en un clic.

## 🛠️ Technologies Utilisées
Le SaaS est actuellement construit en tant qu'application "Front-End Only" avec persistance locale pour garantir une expérience utilisateur (UX) ultra-rapide.
*   **Interface:** HTML5 sémantique, CSS3 (Vanilla avec variables pour les thèmes et responsivité totale).
*   **Logique Métier & Base de Données Simulée:** JavaScript ES6 (Vanilla).
*   **Persistance des Données:** Stockage via l'API `localStorage` du navigateur (Sessions et Comptes).
*   **Iconographie:** Lucide Icons.

## ⚙️ Fonctionnalités Clés (Enterprise-Ready)

### 1. Sécurité et Identité (Auth)
*   **Inscription & OTP:** Processus d'inscription strict nécessitant une validation par code OTP (One-Time Password) simulé.
*   **Clés d'Accès Uniques:** Génération algorithmique d'une clé d'accès unique (`SCL-XXXX-XXXX`) pour chaque utilisateur, utilisée comme moyen d'activation sécurisé après paiement Mobile Money.
*   **Profils Verrouillés:** Impossibilité de modifier le numéro de téléphone après inscription pour la sécurité des paiements.

### 2. Catalogue de Produits Tendances
*   **Bibliothèque Dynamique:** Plus de 20 produits pré-analysés avec des images réelles, leurs coûts réels d'importation (Alibaba), frais de fret, et marges bénéficiaires recommandées.
*   **Statut du Produit:** Badges indiquant si le produit est "Viral", "Stable" ou "Risqué".

### 3. Business Simulator & Calculateur de Marges
*   Permet d'entrer les prix d'achat, quantités, et budget publicitaire pour calculer instantanément :
    *   Coût de Revient Unitaire (CRU).
    *   Marge nette.
    *   Retour sur Investissement (ROI).
*   Un système de "Launch/Decline" donne des conseils stratégiques sur la viabilité du business.
*   Les simulations sont sauvegardées dans le compte utilisateur.

### 4. IA Marketing Copilot
*   Sélection automatique d'un produit depuis le catalogue pour générer du contenu promotionnel (Hooks vidéo pour TikTok/Reels, Scripts détaillés, Descriptions de vente optimisées).

### 5. Analyse de Marché IA
*   Moteur de recherche pour analyser de nouveaux produits.
*   Évaluation des tendances saisonnières (ex: Tabaski, Magal, Hivernage) et des risques logistiques.

### 6. Expérience Utilisateur (UI/UX)
*   **Design Premium & Dark Mode:** Interface moderne avec un fort contraste et des effets de glassmorphisme.
*   **Mobile-First & Swipe:** Navigation sur mobile améliorée avec un menu latéral ("Sidebar") ouvrable et fermable via un geste de balayage (Swipe).
*   **Chatbot Flottant:** Assistant virtuel intégré répondant instantanément aux questions de support, de pricing ou d'utilisation, visible en permanence en bas de l'écran.
*   **Notifications Toast:** Système non intrusif d'alertes en temps réel pour l'utilisateur.

## 🔄 Flux Utilisateur Typique (Workflow)
1. **Atterrissage:** L'utilisateur découvre la Landing Page et ses arguments de vente.
2. **Inscription:** Il crée un compte et valide son numéro via OTP.
3. **Paiement:** Il reçoit sa clé d'accès personnelle `SCL-...` et utilise Wave/Orange Money pour payer son abonnement de 5 000 FCFA.
4. **Onboarding:** Il accède au Dashboard VIP, consulte les produits tendances.
5. **Simulation:** Il calcule la rentabilité de l'importation de 100 montres connectées.
6. **Lancement:** S'il trouve le projet rentable (ROI élevé), il l'ajoute à son compte et passe à la section IA Marketing pour obtenir sa vidéo TikTok promotionnelle.

---
*Ce document sert de référence architecturale et technique pour les développeurs et investisseurs du projet SCALIFY.*
