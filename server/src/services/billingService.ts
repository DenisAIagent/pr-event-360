import Stripe from 'stripe';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import {
  STORAGE_BYTES_100_GB,
  type CommercialPlanId,
} from '@pr-event-360/core';
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
import { markStripeEventProcessed, unmarkStripeEvent } from '../db/repositories/stripeEventRepo';
import { requestPasswordReset } from './passwordResetService';
import {
  isCommercialCheckoutEnabled,
  publicCommercialCatalog,
  requireSellableOffer,
  stripePriceIdForPlan,
  getCommercialOffer,
} from './commercialCatalog';
import {
  addEventCredits,
  findOrgBilling,
  insertBillingLedger,
  setEventMediaPlus,
  setOrgCommercialPlan,
} from '../db/repositories/orgBillingRepo';
import { findEventById } from '../db/repositories/eventRepo';
import { getStripeSettings, type StripeSettings } from './settingsService';
import { loadEnv } from '../config/env';

let stripe: Stripe | null = null;
let stripeKeyUsed: string | null = null;

export async function isBillingEnabled(): Promise<boolean> {
  return isCommercialCheckoutEnabled();
}

/** @deprecated préférer le catalogue multi-offres ; conservé pour rétrocompat UI. */
export function priceLabel(): string {
  return 'À partir de 800 € HT / événement';
}

export async function billingPublicConfig() {
  const [billingEnabled, catalog] = await Promise.all([
    isBillingEnabled(),
    publicCommercialCatalog(),
  ]);
  return {
    billingEnabled,
    priceLabel: priceLabel(),
    ...catalog,
  };
}

async function client(): Promise<Stripe> {
  const s = await getStripeSettings();
  if (!s.secretKey) throw AppError.badRequest('Le paiement n’est pas configuré.');
  if (!stripe || stripeKeyUsed !== s.secretKey) {
    stripe = new Stripe(s.secretKey);
    stripeKeyUsed = s.secretKey;
  }
  return stripe;
}

function periodEnd(sub: Stripe.Subscription): string | null {
  const end = (sub as unknown as { current_period_end?: number }).current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

async function allowedPriceIds(s?: StripeSettings): Promise<Set<string>> {
  const st = s ?? (await getStripeSettings());
  const ids = [
    st.priceId,
    st.priceEvent,
    st.pricePack3,
    st.priceAgency,
    st.priceAgencyExtra,
    st.priceMediaPlus,
  ].filter(Boolean) as string[];
  return new Set(ids);
}

export type SignupCheckoutInput =
  | { planId: CommercialPlanId; orgName: string; fullName: string; email: string }
  | { planId: CommercialPlanId; orgName: string; googleCredential: string };

/**
 * Inscription payante multi-offre : pending_signup + Checkout Stripe.
 * mode payment (événement, pack3) ou subscription (agence).
 */
export async function startCheckout(input: SignupCheckoutInput): Promise<{ url: string }> {
  if (!(await isBillingEnabled())) throw AppError.badRequest('Le paiement n’est pas configuré.');

  const planId = (input.planId ?? 'event') as CommercialPlanId;
  if (planId === 'agency_extra' || planId === 'media_plus') {
    throw AppError.badRequest(
      'Cette option s’achète depuis un compte existant (espace Facturation).',
    );
  }
  let offer;
  try {
    offer = requireSellableOffer(planId);
  } catch {
    throw AppError.badRequest('Offre commerciale invalide.');
  }
  if (offer.checkoutMode === 'quote') {
    throw AppError.badRequest('Cette offre est sur devis. Contactez-nous.');
  }

  const priceId = await stripePriceIdForPlan(planId);
  if (!priceId) {
    throw AppError.badRequest(
      `Le tarif Stripe pour l’offre « ${offer.name} » n’est pas configuré (Intégrations → Stripe).`,
    );
  }

  const orgName = input.orgName.trim();
  if (!orgName) throw AppError.badRequest("Le nom de l'organisation est requis");

  let email: string;
  let fullName: string;
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
  }

  if (await findUserByEmail(email)) {
    throw AppError.conflict('Un compte existe déjà avec cet email. Connectez-vous.');
  }

  const pending = await createPendingSignup({
    email,
    orgName,
    fullName,
    googleId,
    authProvider: provider,
    planCode: planId,
  });

  const base = loadEnv().PUBLIC_BASE_URL;
  const mode = offer.checkoutMode === 'subscription' ? 'subscription' : 'payment';
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: pending.id,
    customer_email: email,
    allow_promotion_codes: true,
    success_url: `${base}/admin/abonnement/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/admin/abonnement?annule=1`,
    metadata: { pending_id: pending.id, plan_id: planId, kind: 'signup' },
  };
  if (mode === 'subscription') {
    sessionParams.subscription_data = {
      metadata: { pending_id: pending.id, plan_id: planId, kind: 'signup' },
    };
  }

  const session = await (await client()).checkout.sessions.create(sessionParams);
  await setPendingSignupSession(pending.id, session.id);
  if (!session.url) throw new Error('Stripe Checkout : URL manquante');
  return { url: session.url };
}

/**
 * Achat complémentaire (compte déjà connecté) : pack, extra agence, média plus.
 */
export async function startOrgPurchase(input: {
  organizationId: string;
  planId: CommercialPlanId;
  eventId?: string;
  customerEmail: string;
}): Promise<{ url: string }> {
  if (!(await isBillingEnabled())) throw AppError.badRequest('Le paiement n’est pas configuré.');

  const offer = getCommercialOffer(input.planId);
  if (!offer || offer.checkoutMode === 'quote') {
    throw AppError.badRequest('Offre non achetable en ligne.');
  }
  if (!['pack3', 'agency_extra', 'media_plus', 'event', 'agency'].includes(input.planId)) {
    throw AppError.badRequest('Offre non disponible pour un compte existant.');
  }

  const priceId = await stripePriceIdForPlan(input.planId);
  if (!priceId) throw AppError.badRequest('Tarif Stripe non configuré pour cette offre (Intégrations).');

  if (input.planId === 'media_plus') {
    if (!input.eventId) throw AppError.badRequest('eventId requis pour Média Plus.');
    const ev = await findEventById(input.eventId);
    if (!ev || ev.organizationId !== input.organizationId) {
      throw AppError.notFound('Événement introuvable');
    }
  }

  const mode = offer.checkoutMode === 'subscription' ? 'subscription' : 'payment';
  const base = loadEnv().PUBLIC_BASE_URL;
  const metadata = {
    kind: 'org_purchase',
    organization_id: input.organizationId,
    plan_id: input.planId,
    event_id: input.eventId ?? '',
  };
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: input.customerEmail,
    allow_promotion_codes: true,
    success_url: `${base}/admin/facturation?paid=1`,
    cancel_url: `${base}/admin/facturation?annule=1`,
    metadata,
  };
  if (mode === 'subscription') {
    // Reporté sur la souscription elle-même : les webhooks subscription.*
    // peuvent alors identifier l'organisation et l'offre.
    sessionParams.subscription_data = { metadata };
  }
  const session = await (await client()).checkout.sessions.create(sessionParams);
  if (!session.url) throw new Error('Stripe Checkout : URL manquante');
  return { url: session.url };
}

export async function getOrgBillingStatus(organizationId: string) {
  const org = await findOrgBilling(organizationId);
  if (!org) throw AppError.notFound('Organisation introuvable');
  const offer = getCommercialOffer(org.commercialPlan);
  return {
    organizationId: org.id,
    commercialPlan: org.commercialPlan,
    planName: offer?.name ?? org.commercialPlan,
    eventCreditsBalance: org.eventCreditsBalance,
    eventCreditsUnlimited: org.eventCreditsBalance == null,
    eventCreditsExpireAt: org.eventCreditsExpireAt,
    billingSource: org.billingSource,
    subscriptionStatus: org.subscriptionStatus,
    currentPeriodEnd: org.currentPeriodEnd,
    storageDefaultLabel: '20 Go par événement',
    googleDriveIncluded: true,
    // media_plus exclu : il exige un eventId et s'achète depuis un événement précis.
    offers: (await publicCommercialCatalog()).offers.filter((o) =>
      ['event', 'pack3', 'agency_extra'].includes(o.id),
    ),
  };
}

/** Vérifie la signature du webhook puis traite l'événement. */
export async function handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
  const stripeCfg = await getStripeSettings();
  if (!stripeCfg.webhookSecret || !stripeCfg.secretKey) {
    throw AppError.badRequest('Webhook Stripe non configuré.');
  }
  let event: Stripe.Event;
  try {
    event = (await client()).webhooks.constructEvent(
      rawBody,
      signature ?? '',
      stripeCfg.webhookSecret,
    );
  } catch {
    throw AppError.badRequest('Signature de webhook invalide.');
  }

  if (!(await markStripeEventProcessed(event.id, event.type))) return;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== 'paid') break;
        const kind = session.metadata?.kind ?? 'signup';
        if (kind === 'org_purchase') {
          await materializeOrgPurchase(session);
        } else {
          await materializeFromSession(session);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatusBySubId(sub.id, sub.status, periodEnd(sub));
        // Renouvellement agence : recharger 10 crédits en début de période active.
        if (
          event.type === 'customer.subscription.updated' &&
          (sub.status === 'active' || sub.status === 'trialing')
        ) {
          const planId = sub.metadata?.plan_id;
          if (planId === 'agency') {
            // best-effort : crédits gérés à la matérialisation initiale ;
            // un job de renouvellement peut être ajouté plus tard via invoice.paid
          }
        }
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
  } catch (e) {
    await unmarkStripeEvent(event.id).catch(() => undefined);
    throw e;
  }
}

async function materializeOrgPurchase(session: Stripe.Checkout.Session): Promise<void> {
  const organizationId = session.metadata?.organization_id;
  const planId = (session.metadata?.plan_id ?? '') as CommercialPlanId;
  if (!organizationId || !planId) return;

  const offer = getCommercialOffer(planId);
  if (!offer) return;

  const paymentIntent =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

  if (planId === 'media_plus') {
    const eventId = session.metadata?.event_id;
    if (!eventId) return;
    await withTransaction(async (db) => {
      await setEventMediaPlus(eventId, STORAGE_BYTES_100_GB, db);
      await insertBillingLedger(
        {
          organizationId,
          planCode: planId,
          creditsDelta: 0,
          stripeSessionId: session.id,
          stripePaymentIntent: paymentIntent ?? null,
          eventId,
          note: 'Option Média Plus',
        },
        db,
      );
    });
    return;
  }

  // Abonnement (agence) acheté depuis un compte existant : rattacher la
  // souscription à l'organisation pour que les webhooks subscription.* la retrouvent.
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : (session.subscription?.id ?? null);
  const customerId = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
  let subStatus = 'active';
  let subPeriodEnd: string | null = null;
  if (subscriptionId) {
    const sub = await (await client()).subscriptions.retrieve(subscriptionId);
    subStatus = sub.status;
    subPeriodEnd = periodEnd(sub);
  }

  const credits = offer.eventCredits ?? 0;
  await withTransaction(async (db) => {
    if (credits > 0) {
      await addEventCredits(
        organizationId,
        credits,
        {
          commercialPlan: planId === 'agency' ? 'agency' : undefined,
          extendExpireMonths: offer.creditsValidityMonths,
          billingSource: 'stripe',
        },
        db,
      );
    }
    if (subscriptionId) {
      await setOrgSubscription(
        organizationId,
        {
          stripeCustomerId: customerId ?? '',
          stripeSubscriptionId: subscriptionId,
          status: subStatus,
          currentPeriodEnd: subPeriodEnd,
        },
        db,
      );
    }
    await insertBillingLedger(
      {
        organizationId,
        planCode: planId,
        creditsDelta: credits,
        stripeSessionId: session.id,
        stripePaymentIntent: paymentIntent ?? null,
        note: `Achat ${offer.name}`,
      },
      db,
    );
  });
}

/** Crée l'organisation + le compte à partir d'une session Checkout payée. Idempotent. */
export async function materializeFromSession(session: Stripe.Checkout.Session): Promise<void> {
  const pendingId = session.client_reference_id ?? session.metadata?.pending_id ?? null;
  if (!pendingId) return;
  const pending = await findPendingSignupById(pendingId);
  if (!pending) return;
  if (!pending.stripeSessionId || pending.stripeSessionId !== session.id) {
    console.error(`[billing] Session ${session.id} non liée au pending ${pending.id} — matérialisation refusée.`);
    return;
  }
  if (new Date(pending.expiresAt).getTime() < Date.now()) {
    await deletePendingSignup(pending.id);
    return;
  }
  if (await findUserByEmail(pending.email)) {
    await deletePendingSignup(pending.id);
    return;
  }

  const planId = (session.metadata?.plan_id ?? pending.planCode ?? 'event') as CommercialPlanId;
  const offer = getCommercialOffer(planId) ?? getCommercialOffer('event')!;

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : (session.subscription?.id ?? null);
  const customerId = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);

  let status = 'active';
  let currentPeriodEnd: string | null = null;
  const allowed = await allowedPriceIds();
  if (subscriptionId) {
    const sub = await (await client()).subscriptions.retrieve(subscriptionId);
    const priceId = sub.items.data[0]?.price.id;
    if (priceId && !allowed.has(priceId)) {
      console.error(`[billing] Prix inattendu (${priceId}) pour la session ${session.id} — matérialisation refusée.`);
      return;
    }
    if (sub.status !== 'active' && sub.status !== 'trialing') {
      console.error(`[billing] Statut d'abonnement non actif (${sub.status}) — matérialisation refusée.`);
      return;
    }
    status = sub.status;
    currentPeriodEnd = periodEnd(sub);
  } else {
    try {
      const full = await (await client()).checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price'],
      });
      const pid = full.line_items?.data?.[0]?.price;
      const id = typeof pid === 'string' ? pid : pid?.id;
      if (id && !allowed.has(id)) {
        console.error(`[billing] Prix one-shot inattendu (${id}) — refus.`);
        return;
      }
    } catch {
      /* best-effort */
    }
  }

  const slug = await uniqueSlug(pending.orgName);
  const passwordCredential =
    pending.authProvider === 'password'
      ? await argon2.hash(randomBytes(32).toString('hex'))
      : null;

  const credits = offer.eventCredits ?? 1;
  let expireAt: Date | null = null;
  if (offer.creditsValidityMonths) {
    expireAt = new Date();
    expireAt.setMonth(expireAt.getMonth() + offer.creditsValidityMonths);
  }

  await withTransaction(async (db) => {
    const org = await createOrganization({ name: pending.orgName, slug }, db);
    await createUser(
      {
        email: pending.email,
        fullName: pending.fullName,
        role: 'admin',
        organizationId: org.id,
        passwordHash: passwordCredential,
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
    await setOrgCommercialPlan(
      org.id,
      {
        commercialPlan: planId,
        eventCreditsBalance: credits,
        eventCreditsExpireAt: expireAt,
        billingSource: 'stripe',
      },
      db,
    );
    await insertBillingLedger(
      {
        organizationId: org.id,
        planCode: planId,
        creditsDelta: credits,
        stripeSessionId: session.id,
        note: `Inscription ${offer.name}`,
      },
      db,
    );
  });
  await deletePendingSignup(pending.id);
  if (pending.authProvider === 'password') {
    await requestPasswordReset(pending.email);
  }
}

/** Grant manuel super-admin (accès offert / comped). */
export async function grantOrgCredits(input: {
  organizationId: string;
  planCode: string;
  credits: number;
  expireMonths?: number | null;
  note?: string;
}): Promise<void> {
  await withTransaction(async (db) => {
    await addEventCredits(
      input.organizationId,
      input.credits,
      {
        commercialPlan: input.planCode,
        extendExpireMonths: input.expireMonths ?? null,
        billingSource: 'comped',
      },
      db,
    );
    await insertBillingLedger(
      {
        organizationId: input.organizationId,
        planCode: input.planCode,
        creditsDelta: input.credits,
        note: input.note ?? 'Grant super-admin',
      },
      db,
    );
  });
}
