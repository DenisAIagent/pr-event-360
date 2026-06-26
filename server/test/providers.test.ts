import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrevoEmailProvider, createBrevoSmsProvider } from '../src/services/notifications/providers/brevo';
import { createTwilioSmsProvider } from '../src/services/notifications/providers/twilio';
import {
  simulationEmailProvider,
  simulationSmsProvider,
} from '../src/services/notifications/providers/simulation';

function mockFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (url: unknown, init: unknown) => impl(String(url), init as RequestInit));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const okJson = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('simulation providers', () => {
  it('ne livrent rien et renvoient le statut « simulated »', async () => {
    expect(await simulationEmailProvider.send({ to: 'a@b.c', subject: 's', body: 'b' })).toEqual({
      status: 'simulated',
      provider: 'simulation',
    });
    expect(await simulationSmsProvider.send({ to: '+351900', body: 'b' })).toEqual({
      status: 'simulated',
      provider: 'simulation',
    });
  });
});

describe('Brevo email provider', () => {
  it('poste vers l’API Brevo avec la clé et le bon corps, puis renvoie « sent »', async () => {
    const fetchMock = mockFetch(() => okJson({ messageId: '<abc@brevo>' }));
    const provider = createBrevoEmailProvider({
      apiKey: 'key-123',
      senderEmail: 'no-reply@event.fr',
      senderName: 'PR Event 360',
    });

    const result = await provider.send({ to: 'lea@press.pt', subject: 'Bonjour', body: 'Corps' });

    expect(result).toEqual({ status: 'sent', provider: 'brevo', providerMessageId: '<abc@brevo>' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init!.headers as Record<string, string>)['api-key']).toBe('key-123');
    const sent = JSON.parse(init!.body as string);
    expect(sent.sender).toEqual({ email: 'no-reply@event.fr', name: 'PR Event 360' });
    expect(sent.to).toEqual([{ email: 'lea@press.pt' }]);
    expect(sent.subject).toBe('Bonjour');
    expect(sent.textContent).toBe('Corps');
  });

  it('renvoie « failed » avec le détail HTTP sur réponse non-2xx', async () => {
    mockFetch(() => new Response('unauthorized', { status: 401 }));
    const provider = createBrevoEmailProvider({ apiKey: 'bad', senderEmail: 's@e.fr', senderName: 'X' });
    const result = await provider.send({ to: 'a@b.c', subject: 's', body: 'b' });
    expect(result.status).toBe('failed');
    expect(result.error).toContain('401');
  });

  it('renvoie « failed » si le réseau échoue (ne lève pas)', async () => {
    mockFetch(() => {
      throw new Error('ECONNREFUSED');
    });
    const provider = createBrevoEmailProvider({ apiKey: 'k', senderEmail: 's@e.fr', senderName: 'X' });
    const result = await provider.send({ to: 'a@b.c', subject: 's', body: 'b' });
    expect(result).toMatchObject({ status: 'failed', provider: 'brevo' });
    expect(result.error).toContain('ECONNREFUSED');
  });
});

describe('Brevo SMS provider', () => {
  it('tronque l’émetteur à 11 caractères et poste le contenu', async () => {
    const fetchMock = mockFetch(() => okJson({ messageId: 42 }));
    const provider = createBrevoSmsProvider({ apiKey: 'k', sender: 'PREventTropLong' });
    const result = await provider.send({ to: '+351912345678', body: 'Urgent' });
    expect(result).toMatchObject({ status: 'sent', provider: 'brevo' });
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.sender).toBe('PREventTrop'); // 11 caractères
    expect(body.recipient).toBe('+351912345678');
    expect(body.content).toBe('Urgent');
  });
});

describe('Twilio SMS provider', () => {
  it('utilise l’auth Basic, l’URL du compte et un corps form-urlencoded', async () => {
    const fetchMock = mockFetch(() => okJson({ sid: 'SM123' }));
    const provider = createTwilioSmsProvider({ accountSid: 'AC9', authToken: 'tok', from: '+15550001111' });

    const result = await provider.send({ to: '+351912345678', body: 'Créneau 14h' });

    expect(result).toEqual({ status: 'sent', provider: 'twilio', providerMessageId: 'SM123' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC9/Messages.json');
    const headers = init!.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Basic ${Buffer.from('AC9:tok').toString('base64')}`);
    expect(headers['content-type']).toBe('application/x-www-form-urlencoded');
    const params = new URLSearchParams(init!.body as string);
    expect(params.get('To')).toBe('+351912345678');
    expect(params.get('From')).toBe('+15550001111');
    expect(params.get('Body')).toBe('Créneau 14h');
  });

  it('renvoie « failed » sur erreur Twilio', async () => {
    mockFetch(() => new Response('{"message":"bad"}', { status: 400 }));
    const provider = createTwilioSmsProvider({ accountSid: 'AC9', authToken: 'tok', from: '+1' });
    const result = await provider.send({ to: '+1', body: 'x' });
    expect(result.status).toBe('failed');
    expect(result.error).toContain('400');
  });
});
