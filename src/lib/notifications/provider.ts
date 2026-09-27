export type ReminderMessage = {
  to: string;
  body: string;
  idempotencyKey: string;
};

export type ReminderResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "not_configured"; reason: string }
  | { status: "failed"; reason: string };

export interface NotificationProvider {
  readonly name: string;
  send(message: ReminderMessage): Promise<ReminderResult>;
}

class UnconfiguredWhatsAppProvider implements NotificationProvider {
  readonly name = "not_configured";

  async send(): Promise<ReminderResult> {
    return {
      status: "not_configured",
      reason: "Configure um provedor oficial de WhatsApp antes do envio.",
    };
  }
}

export function getNotificationProvider(): NotificationProvider {
  return new UnconfiguredWhatsAppProvider();
}
