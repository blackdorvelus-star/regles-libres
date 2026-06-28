require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// Pour le webhook Stripe, on a besoin du raw body
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ─── Routes statiques ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'success.html'));
});

app.get('/cancel', (req, res) => {
  res.sendFile(path.join(__dirname, 'cancel.html'));
});

// ─── API : Clé publique Stripe ─────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// ─── API : Créer une session de paiement Stripe ─────────────────────────────────
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { cart, contribution, customer } = req.body;

    // Construire les line items depuis le panier
    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'cad',
        product_data: {
          name: item.name,
          description: item.description,
          images: [item.imageUrl || `${BASE_URL}/images/${item.image}`],
        },
        unit_amount: Math.round(item.price * 100), // en centimes
      },
      quantity: item.quantity,
    }));

    // Ajouter la contribution volontaire si > 0
    if (contribution > 0) {
      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: {
            name: '💝 Contribution volontaire',
            description: 'Votre contribution soutient l\'accès aux produits menstruels pour toutes.',
          },
          unit_amount: Math.round(contribution * 100),
        },
        quantity: 1,
      });
    }

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel`,
      shipping_address_collection: {
        allowed_countries: ['CA', 'FR', 'BE', 'CH'],
      },
      customer_email: customer?.email || undefined,
      locale: 'fr',
      metadata: {
        customer_name: customer?.name || '',
        customer_email: customer?.email || '',
        notes: customer?.notes || '',
      },
      custom_text: {
        submit: {
          message: 'Merci pour votre commande et votre soutien à Règles Libres 💕',
        },
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Erreur Stripe:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── API : Vérifier une session (page de succès) ──────────────────────────────
app.get('/api/session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({
      customerEmail: session.customer_email || session.customer_details?.email,
      customerName: session.customer_details?.name,
      amountTotal: session.amount_total,
      paymentStatus: session.payment_status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Webhook Stripe ───────────────────────────────────────────────────────────
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Erreur webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gérer les événements
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log(`✅ Commande complétée! Session: ${session.id}`);
      console.log(`   Client: ${session.customer_email}`);
      console.log(`   Montant: ${(session.amount_total / 100).toFixed(2)} CAD`);
      // TODO: Envoyer un email de confirmation, créer la commande en BD, etc.
      break;

    case 'payment_intent.payment_failed':
      console.log('❌ Paiement échoué:', event.data.object.id);
      break;

    default:
      console.log(`Événement non géré: ${event.type}`);
  }

  res.json({ received: true });
});

// ─── Démarrer le serveur ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║         🌸 Règles Libres — Serveur       ║
╠══════════════════════════════════════════╣
║  URL : http://localhost:${PORT}             ║
║  Mode : ${process.env.NODE_ENV || 'development'}                    ║
╚══════════════════════════════════════════╝
  `);
});
