import type { EmailProvider, SmsProvider } from './types';

/**
 * Fournisseurs de simulation : n'envoient RIEN. Le message est simplement
 * marqué « simulated » puis persisté par la couche appelante pour visualisation
 * dans le back-office. C'est le mode par défaut avant intégration réelle.
 */
export const simulationEmailProvider: EmailProvider = {
  name: 'simulation',
  async send() {
    return { status: 'simulated', provider: 'simulation' };
  },
};

export const simulationSmsProvider: SmsProvider = {
  name: 'simulation',
  async send() {
    return { status: 'simulated', provider: 'simulation' };
  },
};
