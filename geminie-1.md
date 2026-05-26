# 📘 SCALIFY — Documentation Complète des Fonctionnalités
> *Le copilote intelligent de l'e-commerce en Afrique de l'Ouest*

---

## 🌍 Vue d'ensemble

**SCALIFY** est une plateforme SaaS e-commerce conçue pour les entrepreneurs africains (Sénégal, Côte d'Ivoire, Mali) souhaitant sourcer des produits rentables en Chine (Alibaba) et les revendre en Afrique. Elle combine :
- Un catalogue de **produits gagnants** analysés et scorés
- Un **calculateur de marges et de transport** intelligent
- Un **générateur de marketing IA** (scripts TikTok, hooks, hashtags)
- Un **simulateur de business plan**
- Une **académie e-commerce** et communauté VIP
- Un système de **gestion de compte et de paiement**

---

## 🔐 1. Authentification & Gestion de Session

### 1.1 Inscription (Register)
- L'utilisateur remplit : **Nom**, **Email**, **Téléphone**, **Mot de passe**
- Validation :
  - Le mot de passe doit contenir au moins **8 caractères**
  - **Email unique** : si déjà utilisé, redirection vers la connexion
  - **Numéro de téléphone unique** : associé à un seul compte
- **Vérification OTP simulée** : un code à 6 chiffres est généré et affiché (simulation SMS)
- Après validation : une **clé d'accès unique** est générée (`SCL-XXXX-XXXX`) et affichée
- Redirection automatique vers le **dashboard** + popup de paiement d'abonnement

### 1.2 Connexion (Login)
- Login par **Email + Mot de passe**
- Vérification OTP simulée pour sécuriser la session
- Session persistante via `localStorage` (survit à la fermeture du navigateur)

### 1.3 Mot de passe oublié
- Formulaire de récupération par email
- Message de confirmation simulé

### 1.4 Déconnexion
- Bouton **"Déconnexion"** dans le menu latéral
- Efface la session et retourne à la page d'accueil

---

## 🏠 2. Page d'Accueil (Landing Page)

### 2.1 Section Hero
- Slogan principal, proposition de valeur et boutons d'action :
  - **"Créer mon compte"** → inscription
  - **"Voir la démo interactive"** → accès au dashboard (si connecté, sinon inscription requise)
- Indicateur de confiance : *"+1 200 e-commerçants à Dakar, Abidjan et Bamako"*

### 2.2 Calculateur Démo en Direct
- Trois champs interactifs : **Prix d'achat**, **Prix de vente**, **Frais de fret unitaire**
- Calcul en temps réel (sans rechargement) de :
  - Coût unitaire réel
  - Marge nette
  - ROI (%)

### 2.3 Section Fonctionnalités
- Présentation des 5 modules principaux avec icônes et descriptions

### 2.4 Section Tarifs
- Plan **Freemium** : accès limité
- Plan **Premium** : accès complet avec bouton d'abonnement

### 2.5 Footer
- Liens légaux (CGU/CGV, Confidentialité)
- Liens internes (Fonctionnalités, Tarifs)
- Copyright Scalify 2026

---

## 📊 3. Dashboard Principal (Vue d'ensemble)

Accessible après connexion, le dashboard affiche l'état global de l'utilisateur :

### 3.1 En-tête utilisateur
- **Avatar** avec initiales du nom
- **Nom d'utilisateur** et **Score de points**
- **Badge d'abonnement** : `VIP ACTIF` (vert) ou `ESSAI LIMITÉ` (orange)
- **Niveau de l'utilisateur** (ex: Niveau 1, 2…)

### 3.2 Métriques clés (évolutives)
| Métrique | Valeur initiale | Évolution |
|---|---|---|
| **Profits Simulés Cumulés** | 0 FCFA | +marge à chaque simulation enregistrée |
| **Score de Rentabilité Moyen** | 0 / 10 | Calculé sur le ROI moyen de toutes les simulations |
| **Simulations actives** | 0 | Compte réel de simulations enregistrées |
| **Statut d'abonnement** | Inactif | Devient "Premium Actif" après paiement |

### 3.3 Historique des simulations
- Liste des dernières simulations avec : **Nom produit**, **Date**, **Marge totale**, **ROI**

---

## 🛍️ 4. Catalogue de Produits Tendances

**20 produits gagnants** pré-analysés pour le marché sénégalais, couvrant les catégories :
- Cuisine & Maison · Technologie · Sport & Santé · Beauté · Auto

### 4.1 Fiche produit
Chaque produit affiche :
- 📸 **Image professionnelle** cohérente avec le produit
- 🏷️ **Badges de statut** : 🔥 Viral / 📈 Stable / ⚠️ Risqué
- 🏷️ **Catégorie**
- 💰 **Prix fournisseur Chine** (source Alibaba)
- 🚚 **Coût Transport & Logistique estimé**
- 📈 **Marge nette conseillée**
- 💵 **Prix de vente recommandé**
- 📊 **ROI (%)** et **Score Scalify** (/10)

### 4.2 Actions sur chaque produit
- **"Simuler Profit"** → Pré-remplit le Calculateur avec les données du produit et lance le calcul automatiquement
- **"Générer Marketing IA"** → Ouvre l'onglet Marketing IA avec le produit pré-sélectionné

### 4.3 Ajout de produit personnalisé
- Bouton **"Ajouter un produit"** (réservé VIP — simulé)

---

## 🧮 5. Calculateur de Marges Réelles

Outil de calcul précis du coût réel et de la rentabilité nette.

### 5.1 Paramètres d'entrée
| Champ | Description |
|---|---|
| **Prix d'achat unitaire** | Prix payé au fournisseur en Chine (FCFA) |
| **Quantité commandée** | Nombre de pièces importées |
| **Mode de transport** | Bateau ou Avion |
| **→ Bateau** | Dimensions L×l×H (mètres) → Volume CBM × 180 000 FCFA |
| **→ Avion** | Poids total (Kg) × 8 000 FCFA |
| **Douane + Logistique locale** | Frais de dédouanement à Dakar (FCFA) |
| **Livraison locale** | Coût par colis livré au client (FCFA) |
| **Budget Pub** | Budget total TikTok/Facebook (FCFA) |
| **Prix de vente final** | Prix facturé au client sénégalais |

### 5.2 Formules de transport
- **Bateau (Maritime)** : `Volume (CBM) = Longueur × Largeur × Hauteur` → `Transport = CBM × 180 000 FCFA`
- **Avion (Aérien)** : `Transport = Poids (Kg) × 8 000 FCFA`

### 5.3 Rapport d'Analyse Financière (résultats en temps réel)
| Indicateur | Formule |
|---|---|
| **Coût Unitaire de Revient** | Prix achat + (Fret total / Qté) + Livraison locale |
| **Bénéfice Net Unitaire** | Prix vente − Coût unitaire |
| **Investissement Total** | (Prix achat × Qté) + Fret + Budget Pub |
| **Bénéfice Net Total** | (Marge unitaire × Qté) − Budget Pub |
| **ROI Estimé (%)** | (Bénéfice net / Investissement) × 100 |

### 5.4 Conseil intelligent automatique
- 🏆 **ROI ≥ 80% + marge > 4 000 FCFA** → "Opportunité en or !"
- 📈 **ROI entre 30% et 80%** → "Rentabilité Stable"
- ⚠️ **ROI < 30%** → "Projet à Haut Risque !"

### 5.5 Enregistrement de simulation
- Le bouton **"Enregistrer la simulation"** sauvegarde les résultats dans le dashboard
- La simulation est ajoutée à l'historique et met à jour **les Profits Cumulés** et le **Score de Rentabilité**
- L'utilisateur gagne **+50 points** par simulation enregistrée

---

## 🤖 6. Copilote de Marketing IA

Génère automatiquement du contenu marketing ciblé pour le marché sénégalais.

### 6.1 Hooks TikTok / Reels
- **5 hooks accrocheurs** par produit (phrases d'ouverture pour vidéos courtes)
- Adaptés à la culture locale (référence à Dakar, Plateau, Corniche, Wave...)

### 6.2 Scripts Vidéo Complets
- Structurés en 3 parties : **Hook → Corps → Appel à l'action**
- Adapté au format TikTok/Instagram Reels
- Paiement via Wave ou Cash à la livraison intégré

### 6.3 Hashtags optimisés
- 10 hashtags pertinents par produit (marché sénégalais + e-commerce Afrique)

### 6.4 Personnalisation
- Sélection du produit dans un menu déroulant
- Régénération possible à la demande

---

## 🖼️ 7. Générateur d'Images IA

- Génération de **visuels publicitaires** pour les produits e-commerce
- Sélection du produit cible
- Styles disponibles : **Fond blanc professionnel**, **Studio créatif**, **Lifestyle**
- Résultats affichés directement dans l'interface

---

## 📈 8. Simulateur Business Plan

Outil de projection financière sur 6 mois.

### 8.1 Paramètres de simulation
- Sélection du produit du catalogue
- Quantité de commande et prix de vente
- Budget publicitaire mensuel
- Taux de livraison estimé

### 8.2 Graphiques et projections
- **Chiffre d'affaires mensuel** projeté (SVG interactif)
- **Évolution des bénéfices** sur 6 mois
- **Seuil de rentabilité** (break-even point)

### 8.3 Décisions de lancement
- **"Lancer ce produit"** → enregistre la décision + +100 pts
- **"Passer au suivant"** → enregistre le refus

---

## 📰 9. Analyses E-commerce & Saisons

- Analyse des **tendances saisonnières** (Korité, Tabaski, Noël, Hivernage...)
- **Recherche produit** dans la base de données
- Recommandations de timing de lancement

---

## 🎓 10. Ecom Académie & Communauté VIP

### 10.1 Modules de Formation
- Cours structurés sur : Sourcing Chine, Marketing TikTok, Logistique Sénégal, Paiements Mobile Money
- Niveaux : Débutant → Intermédiaire → Expert

### 10.2 Section Avis & Commentaires
- Ouvert à **tous les utilisateurs connectés** (VIP et gratuits)
- **Système de pagination** : affichage de 3 commentaires à la fois avec bouton "Voir plus"
- **Identification automatique** : badge **(Vous)** sur vos propres commentaires
- Données persistées en `localStorage` (`scalify_comments_v1`)

### 10.3 Groupe VIP
- Lien vers le groupe WhatsApp/Telegram privé (réservé abonnés Premium)

---

## 👤 11. Gestion du Compte

### 11.1 Informations personnelles
- Modification du **Nom** et de l'**Email**
- **Téléphone verrouillé** après inscription (sécurité anti-fraude)
- Bouton **"Sauvegarder les modifications"**

### 11.2 Clé d'accès
- Affichage de la **clé d'accès unique** (`SCL-XXXX-XXXX`)
- Fonctionnalité de **copie en un clic**

### 11.3 Statut d'abonnement
- Affichage du statut : **Payé (Actif)** ou **Non payé (Inactif)**
- Bouton de souscription → déclenche le simulateur de paiement

---

## 💳 12. Système de Paiement (Simulé)

Simule le flux de paiement Mobile Money africain.

### 12.1 Méthodes supportées
- 💚 **Wave** (Sénégal, Côte d'Ivoire)
- 🟠 **Orange Money**
- 📱 **Free Money**

### 12.2 Flux de paiement
1. Sélection du montant et de la méthode
2. Entrée du numéro de téléphone
3. Simulation d'OTP de confirmation
4. Activation du statut **Premium VIP**
5. Mise à jour de toute l'interface (badges, accès, fonctionnalités)

---

## 💬 13. Chatbot IA Scalify

- Chatbot intégré accessible via l'icône dans le coin
- Répond aux questions sur : produits, tarifs, livraison, marketing, inscription
- Basé sur une logique de **mots-clés** (simulation locale, sans API externe)
- Suggestions de questions rapides proposées

---

## 🗄️ 14. Architecture Technique

| Composant | Technologie |
|---|---|
| **Frontend** | HTML5, CSS3 Vanilla, JavaScript ES6+ |
| **Icônes** | Lucide Icons (CDN) |
| **Persistance** | `localStorage` (sessions, utilisateurs, commentaires, simulations) |
| **Images** | Unsplash (URLs directes, photos professionnelles par produit) |
| **Transport** | Calcul dynamique CBM (Bateau) ou Kg (Avion) |
| **Sécurité** | Clés d'accès déterministes, OTP simulé, verrouillage téléphone |

---

## 🔑 15. Système de Points & Gamification

| Action | Points gagnés |
|---|---|
| Inscription | +150 pts |
| Simulation enregistrée | +50 pts |
| Décision de lancement | +100 pts |
| Score ROI → Note /10 | Calculé dynamiquement |

---

## 🚀 16. Prochaines Évolutions Recommandées

1. **Backend réel** : Migrer de `localStorage` vers Firebase/Supabase (multi-appareils)
2. **API IA** : Connecter le chatbot à GPT-4o mini pour des réponses contextuelles
3. **Paiement réel** : Intégration Wave/Orange Money API Production
4. **Sourcing automatique** : Connecter l'API Alibaba pour des prix en temps réel
5. **Notifications Push** : Alertes sur les nouveaux produits tendances

---

*Document généré le 19 Mai 2026 — SCALIFY v2.0*
*Développé avec Antigravity AI pour les entrepreneurs e-commerce africains.*
