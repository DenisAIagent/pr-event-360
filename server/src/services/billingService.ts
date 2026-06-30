import Stripe from 'stripe';
import argon2 from 'argon2';
import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { withTransaction } from '../db/pool';
import { uniqueSlug } from './orgService';
import { verifyGoogleCredential } from './googleAuthService';
import {
  createOrganization,
  setOrgSubscription,
  updateSubscriptionStatusBySubId,
} from '../db/repositories/organizationRepo';
import { createUser, findUserByEmail } from '../db/repositories/userRepo';
import {
  createPendingSignup,
  setPendingSignupSession,
  findPendingSignupById,
  deletePendingSignup,
} from '../db/repositories/pendingSignupRepo';

const env = loadEnv();
let stripe: Stripe | null = null;

export function isBillingEnabled(): boolean {
  // Les 3 clés ensemble : sans le secret de webhook, le paiement aboutirait sans création de compte.
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_ID && env.STRIPE_WEBHOOK_SECRET);
}
export function priceLabel(): string {
  return '800 € / an';
}

function client(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw AppError.badRequest('Le paiement n’est pas configuré.');
  if (!stripe) stripe = new Stripe(env.STRIPE_SECRET_KEY);
  return stripe;
}

function periodEnd(sub: Stripe.Subscription): string | null {
  const end = (sub as unknown as { current_period_end?: number }).current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

export type CheckoutInput =
  | { orgName: string; fullName: string; email: string; password: string }
  | { orgName: string; googleCredential: string };

/**
 * Démarre l'inscription payante : enregistre l'intention (pending_signup) et crée une
 * session Stripe Checkout (abonnement). Le compte n'est créé qu'au webhook de paiement.
 */
export async function startCheckout(input: CheckoutInput): Promise<{ url: string }> {
  if (!isBillingEnabled()) throw AppError.badRequest('Le paiement n’est pas configuré.');
  const orgName = input.orgName.trim();
  if (!orgName) throw AppError.badRequest("Le nom de l'organisation est requis");

  let email: string;
  let fullName: string;
  let passwordHash: string | null = null;
  let googleId: string | null = null;
  let provider: 'password' | 'google';

  if ('googleCredential' in input) {
    const g = await verifyGoogleCredential(input.googleCredential);
    email = g.email;
    fullName = g.name;
    googleId = g.googleId;
    provider = 'google';
  } else {
    email = input.email.toLowerCase();
    fullName = input.fullName;
    provider = 'password';
    passwordHash = await argon2.hash(input.password);
  }

  if (await findUserByEmail(email)) {
    throw AppError.conflict('Un compte existe déjà avec cet email. Connectez-vous.');
  }

  const pending = await createPendingSignup({
    email,
    orgName,
    fullName,
    passwordHash,
    googleId,
    authProvider: provider,
  });

  const base = env.PUBLIC_BASE_URL;
  const session = await client().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_ID!, quantity: 1 }],
    client_reference_id: pending.id,
    customer_email: email,
    allow_promotion_codes: true,
    success_url: `${base}/admin/abonnement/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/admin/abonnement?annule=1`,
    metadata: { pending_id: pending.id },
    subscription_data: { metadata: { pending_id: pending.id } },
  });
  await setPendingSignupSession(pending.id, session.id);
  if (!session.url) throw new Error('Stripe Checkout : URL manquante');
  return { url: session.url };
}

/** Vérifie la signature du webhook puis traite l'événement. */
export async function handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
  if (!env.STRIPE_WEBHOOK_SECRET) throw AppError.badRequest('Webhook Stripe non configuré.');
  let event: Stripe.Event;
  try {
    event = client().webhooks.constructEvent(rawBody, signature ?? '', env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw AppError.badRequest('Signature de webhook invalide.');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid' || session.status === 'complete') {
        await materializeFromSession(session);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await updateSubscriptionStatusBySubId(sub.id, sub.status, periodEnd(sub));
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as unknown as { subscription?: string | { id: string } };
      const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
      if (subId) await updateSubscriptionStatusBySubId(subId, 'past_due', null);
      break;
    }
    default:
      break;
  }
}

/** Crée l'organisation + le compte à partir d'une session Checkout payée. Idempotent. */
async function materializeFromSession(session: Stripe.Checkout.Session): Promise<void> {
  const pendingId = session.client_reference_id ?? session.metadata?.pending_id ?? null;
  if (!pendingId) return;
  const pending = await findPendingSignupById(pendingId);
  if (!pending) return; // déjà traité (livraison multiple du webhook)
  if (await findUserByEmail(pending.email)) {
    await deletePendingSignup(pending.id);
    return;
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : (session.subscription?.id ?? null);
  const customerId = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);

  let status = 'active';
  let currentPeriodEnd: string | null = null;
  if (subscriptionId) {
    const sub = await client().subscriptions.retrieve(subscriptionId);
    status = sub.status;
    currentPeriodEnd = periodEnd(sub);
  }

  const slug = await uniqueSlug(pending.orgName);
  await withTransaction(async (db) => {
    const org = await createOrganization({ name: pending.orgName, slug }, db);
    await createUser(
      {
        email: pending.email,
        fullName: pending.fullName,
        role: 'admin',
        organizationId: org.id,
        passwordHash: pending.passwordHash,
        googleId: pending.googleId,
        authProvider: pending.authProvider,
      },
      db,
    );
    await setOrgSubscription(
      org.id,
      {
        stripeCustomerId: customerId ?? '',
        stripeSubscriptionId: subscriptionId ?? '',
        status,
        currentPeriodEnd,
      },
      db,
    );
  });
  await deletePendingSignup(pending.id);
}
