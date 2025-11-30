import { EmailManager, ResendProvider } from '@/extensions/email';
import { Configs, getAllConfigs } from '@/shared/models/config';

/**
 * get email service with configs
 */
export function getEmailServiceWithConfigs(configs: Configs) {
  const emailManager = new EmailManager();

  if (configs.resend_api_key) {
    emailManager.addProvider(
      new ResendProvider({
        apiKey: configs.resend_api_key,
        defaultFrom: configs.resend_sender_email,
      })
    );
  }

  return emailManager;
}

/**
 * global email service
 */
const globalForServices = globalThis as typeof globalThis & {
  __emailService?: EmailManager;
};

/**
 * get email service instance
 */
export async function getEmailService(): Promise<EmailManager> {
  if (globalForServices.__emailService) {
    return globalForServices.__emailService;
  }

  const configs = await getAllConfigs();
  const emailService = getEmailServiceWithConfigs(configs);

  globalForServices.__emailService = emailService;
  return emailService;
}
