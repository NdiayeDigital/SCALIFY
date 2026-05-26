// ============================================================
//  SCALIFY - Serveur Backend Sécurisé (Express + CinetPay)
// ============================================================
//  ⚠️ TOUTES les clés API CinetPay restent ICI côté serveur.
//     RIEN n'est jamais exposé au navigateur du client.
// ============================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (HTML, CSS, JS du frontend)
app.use(express.static(path.join(__dirname, '..')));

// ── Validation des variables d'environnement ───────────────
const CINETPAY_API_KEY   = process.env.CINETPAY_API_KEY;
const CINETPAY_SITE_ID   = process.env.CINETPAY_SITE_ID;
const CINETPAY_SECRET_KEY = process.env.CINETPAY_SECRET_KEY;
const APP_URL            = process.env.APP_URL || 'http://localhost:3000';
const NOTIFY_URL         = process.env.NOTIFY_URL || `${APP_URL}/api/payment/notify`;
const PORT               = process.env.PORT || 3000;

if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID || !CINETPAY_SECRET_KEY) {
    console.error('═══════════════════════════════════════════════');
    console.error('  ❌ ERREUR : Variables CinetPay manquantes !');
    console.error('  Veuillez configurer votre fichier .env avec :');
    console.error('  - CINETPAY_API_KEY');
    console.error('  - CINETPAY_SITE_ID');
    console.error('  - CINETPAY_SECRET_KEY');
    console.error('  Voir .env.example pour le format attendu.');
    console.error('═══════════════════════════════════════════════');
    process.exit(1);
}

// ── Stockage en mémoire des transactions (en prod → BDD) ───
const transactions = new Map();

// ══════════════════════════════════════════════════════════════
//  ROUTE 1 : Initialiser un paiement CinetPay
//  POST /api/payment/initialize
//  Body: { amount, customerName, customerEmail, customerPhone }
// ══════════════════════════════════════════════════════════════
app.post('/api/payment/initialize', async (req, res) => {
    try {
        const { amount, customerName, customerEmail, customerPhone } = req.body;

        // Validation des données reçues du frontend
        if (!amount || !customerName || !customerEmail || !customerPhone) {
            return res.status(400).json({
                success: false,
                message: 'Données manquantes. Veuillez fournir : amount, customerName, customerEmail, customerPhone.'
            });
        }

        // Valider le montant (5000 FCFA pour l'abonnement SCALIFY)
        const parsedAmount = parseInt(amount);
        if (isNaN(parsedAmount) || parsedAmount < 100) {
            return res.status(400).json({
                success: false,
                message: 'Montant invalide. Le montant minimum est de 100 FCFA.'
            });
        }

        // Générer un ID de transaction unique
        const transactionId = 'SCL-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();

        // Préparer le payload pour l'API CinetPay
        // ⚠️ Les clés API sont injectées ICI côté serveur uniquement
        const cinetpayPayload = {
            apikey:       CINETPAY_API_KEY,
            site_id:      CINETPAY_SITE_ID,
            transaction_id: transactionId,
            amount:       parsedAmount,
            currency:     'XOF',
            description:  'Abonnement SCALIFY VIP - Accès complet',
            notify_url:   NOTIFY_URL,
            return_url:   `${APP_URL}/?payment=success&tx=${transactionId}`,
            cancel_url:   `${APP_URL}/?payment=cancel`,
            channels:     'ALL',
            lang:         'fr',

            // Informations client (reçues du frontend, PAS les secrets)
            customer_name:      customerName.split(' ')[0] || customerName,
            customer_surname:   customerName.split(' ').slice(1).join(' ') || '',
            customer_email:     customerEmail,
            customer_phone_number: customerPhone.replace(/\s/g, ''),
            customer_address:   'Dakar, Sénégal',
            customer_city:      'Dakar',
            customer_country:   'SN',
            customer_state:     'DK',
            customer_zip_code:  '10000',

            // Métadonnées pour le suivi
            metadata: JSON.stringify({
                service: 'scalify_vip',
                plan: 'monthly',
                user_email: customerEmail
            })
        };

        // Appeler l'API CinetPay pour initialiser le paiement
        const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cinetpayPayload)
        });

        const data = await response.json();

        if (data.code === '201' && data.data) {
            // Stocker la transaction en attente
            transactions.set(transactionId, {
                id: transactionId,
                amount: parsedAmount,
                email: customerEmail,
                phone: customerPhone,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            });

            console.log(`✅ Paiement initialisé : ${transactionId} | ${parsedAmount} FCFA | ${customerEmail}`);

            // Renvoyer UNIQUEMENT l'URL de paiement et le token au frontend
            // ⚠️ Aucun secret n'est envoyé au navigateur
            return res.json({
                success: true,
                payment_url: data.data.payment_url,
                payment_token: data.data.payment_token,
                transaction_id: transactionId
            });
        } else {
            console.error('❌ Erreur CinetPay:', data);
            return res.status(400).json({
                success: false,
                message: data.message || 'Erreur lors de l\'initialisation du paiement CinetPay.',
                details: data.description || ''
            });
        }

    } catch (error) {
        console.error('❌ Erreur serveur (initialize):', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur. Veuillez réessayer.'
        });
    }
});

// ══════════════════════════════════════════════════════════════
//  ROUTE 2 : Webhook de notification CinetPay (IPN)
//  POST /api/payment/notify
//  Appelé automatiquement par CinetPay après un paiement
// ══════════════════════════════════════════════════════════════
app.post('/api/payment/notify', async (req, res) => {
    try {
        const { cpm_trans_id } = req.body;

        if (!cpm_trans_id) {
            console.warn('⚠️ Notification reçue sans ID de transaction.');
            return res.status(400).json({ message: 'Transaction ID manquant.' });
        }

        console.log(`📨 Notification CinetPay reçue pour : ${cpm_trans_id}`);

        // Vérifier le statut réel auprès de CinetPay (double vérification sécurisée)
        // ⚠️ On utilise l'API key côté serveur pour confirmer
        const verifyResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apikey: CINETPAY_API_KEY,
                site_id: CINETPAY_SITE_ID,
                transaction_id: cpm_trans_id
            })
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.code === '00' && verifyData.data) {
            const paymentStatus = verifyData.data.status;
            const paymentAmount = verifyData.data.amount;

            // Mettre à jour la transaction dans notre stockage
            if (transactions.has(cpm_trans_id)) {
                const tx = transactions.get(cpm_trans_id);
                tx.status = paymentStatus;
                tx.verifiedAt = new Date().toISOString();
                tx.cinetpayData = verifyData.data;
                transactions.set(cpm_trans_id, tx);
            } else {
                // Transaction inconnue mais on l'enregistre quand même
                transactions.set(cpm_trans_id, {
                    id: cpm_trans_id,
                    amount: paymentAmount,
                    status: paymentStatus,
                    verifiedAt: new Date().toISOString(),
                    cinetpayData: verifyData.data
                });
            }

            if (paymentStatus === 'ACCEPTED') {
                console.log(`✅ PAIEMENT CONFIRMÉ : ${cpm_trans_id} | ${paymentAmount} FCFA`);
                // ──────────────────────────────────────────────
                // ICI : Activer l'abonnement dans votre BDD
                // Exemple : updateUserSubscription(tx.email, true);
                // ──────────────────────────────────────────────
            } else {
                console.log(`⚠️ Statut paiement : ${paymentStatus} pour ${cpm_trans_id}`);
            }
        } else {
            console.error('❌ Vérification CinetPay échouée:', verifyData);
        }

        // Toujours répondre 200 à CinetPay pour accuser réception
        return res.status(200).json({ message: 'Notification traitée.' });

    } catch (error) {
        console.error('❌ Erreur webhook:', error.message);
        return res.status(200).json({ message: 'Erreur interne, notification reçue.' });
    }
});

// ══════════════════════════════════════════════════════════════
//  ROUTE 3 : Vérifier le statut d'une transaction
//  POST /api/payment/verify
//  Body: { transaction_id }
//  Appelé par le frontend pour confirmer après redirection
// ══════════════════════════════════════════════════════════════
app.post('/api/payment/verify', async (req, res) => {
    try {
        const { transaction_id } = req.body;

        if (!transaction_id) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID manquant.'
            });
        }

        // Vérifier directement auprès de CinetPay (côté serveur uniquement)
        const verifyResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apikey: CINETPAY_API_KEY,
                site_id: CINETPAY_SITE_ID,
                transaction_id: transaction_id
            })
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.code === '00' && verifyData.data) {
            const status = verifyData.data.status;
            const amount = verifyData.data.amount;

            console.log(`🔍 Vérification tx ${transaction_id} : ${status} | ${amount} FCFA`);

            return res.json({
                success: true,
                status: status,
                amount: amount,
                transaction_id: transaction_id,
                // On ne renvoie que le statut, pas les détails internes
                is_paid: status === 'ACCEPTED'
            });
        } else {
            return res.json({
                success: false,
                status: 'UNKNOWN',
                message: verifyData.message || 'Impossible de vérifier la transaction.'
            });
        }

    } catch (error) {
        console.error('❌ Erreur vérification:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur de vérification. Réessayez.'
        });
    }
});

// ── Route d'accueil (redirige vers index.html) ─────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Démarrage du serveur ────────────────────────────────────
// Si exécuté localement (pas sur Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log('');
        console.log('═══════════════════════════════════════════════');
        console.log('  ⚡ SCALIFY Server démarré avec succès');
        console.log(`  🌐 URL : http://localhost:${PORT}`);
        console.log(`  🔑 CinetPay Site ID : ${CINETPAY_SITE_ID}`);
        console.log(`  📡 Webhook URL : ${NOTIFY_URL}`);
        console.log(`  🔒 Mode : ${process.env.NODE_ENV || 'development'}`);
        console.log('═══════════════════════════════════════════════');
        console.log('');
    });
}

// Pour Vercel Serverless Functions
module.exports = app;
