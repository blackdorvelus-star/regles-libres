<div align="center">

<h1>🌸 Règles Libres</h1>

**Boutique solidaire de produits menstruels à contribution volontaire**

*Des serviettes hygiéniques et tampons de haute qualité, accessibles à toutes.*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)](https://expressjs.com)
[![Stripe](https://img.shields.io/badge/Stripe-Intégré-635BFF?logo=stripe&logoColor=white)](https://stripe.com)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-pink)](LICENSE)

</div>

---

## ✨ À propos

**Règles Libres** est une boutique en ligne solidaire permettant de commander des produits menstruels (serviettes hygiéniques, tampons) **à contribution volontaire** — c'est-à-dire que chaque client·e choisit librement combien il/elle souhaite payer, y compris 0$.

> 💜 *La précarité menstruelle ne devrait pas exister. Règles Libres croit que la dignité menstruelle est un droit, pas un privilège.*

---

## 🚀 Fonctionnalités

- 🛍️ **Catalogue produits** — Serviettes hygiéniques, Tampons, Pack Solidaire
- 🎛️ **Variantes** — Regular, Super, Nuit / Super+
- 🛒 **Panier latéral** animé avec gestion des quantités
- 💝 **Contribution volontaire** — Montants suggérés (0$, 2$, 5$, 10$, 20$) ou montant libre
- 💳 **Paiement Stripe** — Checkout sécurisé hébergé par Stripe
- 📦 **Livraison** — Adresse collectée directement par Stripe Checkout
- ✅ **Page de confirmation** avec détails de commande
- 🌙 **Design dark mode premium** — Glassmorphism, animations, responsive
- ♿ **Accessibilité** — ARIA, navigation au clavier, contraste

---

## 🛠️ Stack technique

| Technologie | Usage |
|---|---|
| **HTML5 / CSS3 / JS Vanilla** | Frontend complet |
| **Node.js + Express** | Serveur backend |
| **Stripe** | Paiement sécurisé + Webhooks |
| **dotenv** | Gestion des variables d'environnement |

---

## ⚙️ Installation

### Prérequis
- [Node.js](https://nodejs.org) v18+
- Un compte [Stripe](https://stripe.com)

### 1. Cloner le dépôt

```bash
git clone https://github.com/VOTRE-USERNAME/regles-libres.git
cd regles-libres
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditez `.env` et remplacez les valeurs :

```env
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete
STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_publique
STRIPE_WEBHOOK_SECRET=whsec_votre_secret_webhook
BASE_URL=http://localhost:3000
PORT=3000
```

> 🔑 Obtenez vos clés sur [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)

### 4. Lancer le serveur

```bash
node server.js
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 💳 Test du paiement Stripe

Utilisez les cartes de test Stripe :

| Scénario | Numéro de carte |
|---|---|
| Paiement réussi | `4242 4242 4242 4242` |
| Échec du paiement | `4000 0000 0000 0002` |

- Date d'expiration : n'importe quelle date future
- CVC : n'importe quel code à 3 chiffres

---

## 🔗 Webhooks Stripe (optionnel)

Pour recevoir les événements Stripe en local :

```bash
# Installer Stripe CLI
stripe listen --forward-to localhost:3000/webhook
```

Copiez le `whsec_...` affiché dans votre `.env`.

---

## 📁 Structure du projet

```
regles-libres/
├── index.html          ← Page principale
├── style.css           ← Design system
├── app.js              ← Logique frontend (panier, Stripe)
├── server.js           ← Backend Express.js
├── success.html        ← Page de confirmation
├── cancel.html         ← Page d'annulation
├── package.json
├── .env.example        ← Template variables d'env
└── images/
    ├── hero.png
    ├── serviettes.png
    └── tampons.png
```

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche (`git checkout -b feature/ma-fonctionnalite`)
3. Committez vos changements (`git commit -m 'feat: ajout de ma fonctionnalité'`)
4. Poussez la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrez une Pull Request

---

## 📄 Licence

Distribué sous licence MIT. Voir [LICENSE](LICENSE) pour plus d'informations.

---

<div align="center">

Fait avec ♥ pour toutes. 🌸

</div>
