import {
  CheckoutSession,
  PaymentBilling,
  PaymentConfigs,
  PaymentCustomField,
  PaymentEvent,
  PaymentEventType,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
} from '.';

/**
 * Creem payment provider configs
 * @docs https://docs.creem.io/
 */
export interface CreemConfigs extends PaymentConfigs {
  apiKey: string;
  signingSecret?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * Creem payment provider implementation
 * @website https://creem.io/
 */
export class CreemProvider implements PaymentProvider {
  readonly name = 'creem';
  configs: CreemConfigs;

  private baseUrl: string;

  constructor(configs: CreemConfigs) {
    this.configs = configs;
    this.baseUrl =
      configs.environment === 'production'
        ? 'https://api.creem.io'
        : 'https://test-api.creem.io';
  }

  // create payment
  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    try {
      if (!order.productId) {
        throw new Error('productId is required');
      }

      // build payment payload
      const payload: any = {
        product_id: order.productId,
        request_id:
          order.orderNo || order.requestId || order.metadata?.order_no,
        units: order.quantity || Number(order.metadata?.seats) || 1,
        discount_code: order.discount
          ? {
              code: order.discount.code,
            }
          : undefined,
        customer: order.customer
          ? {
              id: order.customer.id,
              email: order.customer.email,
            }
          : undefined,
        custom_fields: order.customFields
          ? order.customFields.map((customField: PaymentCustomField) => ({
              type: customField.type,
              key: customField.name,
              label: customField.label,
              optional: !customField.isRequired as boolean,
              text: customField.metadata,
            }))
          : undefined,
        cancel_url: order.cancelUrl,
        return_url: order.successUrl,
        success_url: order.successUrl,
        metadata: {
          ...order.metadata,
          seats: order.quantity || order.metadata?.seats || 1,
        },
      };

      const result = await this.makeRequest('/v1/checkouts', 'POST', payload);

      // create payment failed
      if (result.error) {
        throw new Error(result.error.message || 'create payment failed');
      }

      // create payment success
      return {
        provider: this.name,
        checkoutParams: payload,
        checkoutInfo: {
          sessionId: result.id,
          checkoutUrl: result.checkout_url,
        },
        checkoutResult: result,
        metadata: order.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  // get payment by session id
  // @docs https://docs.creem.io/api-reference/endpoint/get-checkout
  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    try {
      // retrieve payment
      const session = await this.makeRequest(
        `/v1/checkouts/${sessionId}`,
        'GET'
      );

      if (!session.id || !session.order) {
        throw new Error(session.error || 'get payment failed');
      }

      return await this.buildPaymentSessionFromCheckoutSession(session);
    } catch (error) {
      throw error;
    }
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    try {
      const rawBody = await req.text();
      const signature =
        req.headers.get('creem-signature') ||
        req.headers.get('Creem-Signature');

      if (!rawBody || !signature) {
        throw new Error('Invalid webhook request');
      }

      if (!this.configs.signingSecret) {
        throw new Error('Signing Secret not configured');
      }

      const computedSignatureBase64 = await this.generateSignature(
        rawBody,
        this.configs.signingSecret,
        'base64'
      );

      const computedSignatureHex = await this.generateSignature(
        rawBody,
        this.configs.signingSecret,
        'hex'
      );

      const isValid =
        this.constantTimeEqual(computedSignatureBase64, signature) ||
        this.constantTimeEqual(computedSignatureHex, signature);

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // parse the webhook payload
      const event = JSON.parse(rawBody);

      if (!event || !event.eventType) {
        throw new Error('Invalid webhook payload');
      }

      let paymentSession: PaymentSession | undefined = undefined;

      const eventType = this.mapCreemEventType(event.eventType);

      if (eventType === PaymentEventType.UNKNOWN) {
        // Return a dummy event for unknown types to allow 200 ACK
        return {
          eventType: PaymentEventType.UNKNOWN,
          eventResult: event,
          paymentSession: {
            provider: this.name,
            paymentStatus: PaymentStatus.PROCESSING, // Default status
          },
        };
      }

      if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromCheckoutSession(
          event.object as any
        );
      } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromInvoice(
          event.object as any
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.object as any
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.object as any
        );
      }

      if (!paymentSession) {
        // Should not happen if eventType is mapped, but safe fallback
        return {
          eventType: PaymentEventType.UNKNOWN,
          eventResult: event,
          paymentSession: {
            provider: this.name,
            paymentStatus: PaymentStatus.PROCESSING,
          },
        };
      }

      return {
        eventType: eventType,
        eventResult: event,
        paymentSession: paymentSession,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentBilling({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl?: string;
  }): Promise<PaymentBilling> {
    try {
      const billing = await this.makeRequest('/v1/customers/billing', 'POST', {
        customer_id: customerId,
        return_url: returnUrl,
      });

      if (!billing.customer_portal_link) {
        throw new Error('get billing url failed');
      }

      return {
        billingUrl: billing.customer_portal_link,
      };
    } catch (error) {
      throw error;
    }
  }

  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    try {
      const result = await this.makeRequest(
        `/v1/subscriptions/${subscriptionId}/cancel`,
        'POST'
      );

      if (!result.canceled_at) {
        throw new Error('cancel subscription failed');
      }

      return await this.buildPaymentSessionFromSubscription(result);
    } catch (error) {
      throw error;
    }
  }

  private async generateSignature(
    payload: string,
    secret: string,
    encoding: 'hex' | 'base64' = 'hex'
  ): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(payload);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', key, messageData);
      const signatureArray = new Uint8Array(signature);

      if (encoding === 'base64') {
        return btoa(String.fromCharCode(...signatureArray));
      }

      return Array.from(signatureArray)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error: any) {
      throw new Error(`Failed to generate signature: ${error.message}`);
    }
  }

  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  private async makeRequest(endpoint: string, method: string, data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'x-api-key': this.configs.apiKey,
      'Content-Type': 'application/json',
      'Creem-Version': '2024-01-01', // Fixed version
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      config.signal = controller.signal;

      try {
        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        if (response.ok) {
          return await response.json();
        }

        // Don't retry on 4xx errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(
            `request creem api failed with status: ${response.status}`
          );
        }

        // Retry on 5xx or network errors
        throw new Error(`Server error: ${response.status}`);
      } catch (error: any) {
        clearTimeout(timeoutId);
        attempt++;

        if (attempt >= maxRetries || (error.message && error.message.includes('4'))) {
           if (attempt >= maxRetries) {
             console.error(`Creem API request failed after ${maxRetries} attempts: ${error.message}`);
           }
           if (error.message && error.message.includes('4')) {
             throw error; // Rethrow 4xx immediately
           }
        }

        // Exponential backoff: 0.5s, 1s, 2s
        const delay = 500 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        
        if (attempt === maxRetries) {
             throw error;
        }
      }
    }
  }

  private mapCreemEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case 'checkout.completed':
        return PaymentEventType.CHECKOUT_SUCCESS;
      case 'subscription.paid':
        return PaymentEventType.PAYMENT_SUCCESS;
      case 'subscription.update':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.paused':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.active':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'subscription.canceled':
        return PaymentEventType.SUBSCRIBE_CANCELED;
      case 'subscription.expired':
        return PaymentEventType.SUBSCRIBE_CANCELED;
      case 'subscription.trialing':
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case 'refund.created':
        return PaymentEventType.PAYMENT_REFUNDED; // Assuming this exists or map to updated
      case 'dispute.created':
        return PaymentEventType.DISPUTE_CREATED; // Assuming this exists or map to unknown/log
      default:
        return PaymentEventType.UNKNOWN;
    }
  }

  private mapCreemStatus(session: any): PaymentStatus {
    const status = session.status;
    const order = session.order || session.last_transaction;
    const orderStatus = order?.status;

    if (orderStatus === 'paid') {
      return PaymentStatus.SUCCESS;
    } else if (
      ['processing', 'pending', 'unpaid'].includes(orderStatus) ||
      ['processing', 'pending', 'unpaid'].includes(status)
    ) {
      return PaymentStatus.PROCESSING;
    } else if (
      ['failed', 'canceled', 'expired', 'refunded'].includes(orderStatus) ||
      ['failed', 'canceled', 'expired', 'refunded'].includes(status)
    ) {
      return PaymentStatus.FAILED;
    } else {
      console.warn(`Unknown Creem session status: ${status}/${orderStatus}`);
      return PaymentStatus.PROCESSING;
    }
  }

  // build payment session from checkout session
  private async buildPaymentSessionFromCheckoutSession(
    session: any
  ): Promise<PaymentSession> {
    let subscription: any | undefined = undefined;
    let billingUrl = '';

    if (session.subscription) {
      subscription = session.subscription;
    }

    const order = session.order;

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapCreemStatus(session),
      paymentInfo: {
        transactionId: order?.transaction || order?.id,
        amount: order?.amount || 0,
        currency: order?.currency || '',
        discountCode: '',
        discountAmount: order?.discount_amount || 0,
        discountCurrency: order?.currency || '',
        paymentAmount: order?.amount_paid || 0,
        paymentCurrency: order?.currency || '',
        paymentEmail: session.customer?.email,
        paymentUserName: session.customer?.name,
        paymentUserId: session.customer?.id,
        paidAt: order?.created_at ? new Date(order.created_at) : undefined,
        invoiceId: '', // todo: invoice id
        invoiceUrl: '',
      },
      paymentResult: session,
      metadata: session.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        session.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from subscription session
  private async buildPaymentSessionFromInvoice(
    invoice: any
  ): Promise<PaymentSession> {
    const order = invoice.order || invoice.last_transaction;

    const subscription = invoice.subscription || invoice;

    const subscriptionCreatedAt = new Date(subscription.created_at);
    const currentPeriodStartAt = new Date(
      subscription.current_period_start_date
    );
    const timeDiff =
      currentPeriodStartAt.getTime() - subscriptionCreatedAt.getTime();

    const cycleType =
      timeDiff < 5000 // 5s
        ? SubscriptionCycleType.CREATE
        : SubscriptionCycleType.RENEWAL;

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapCreemStatus(invoice),
      paymentInfo: {
        description: order?.description,
        amount: order?.amount || 0,
        currency: order?.currency || '',
        transactionId: order?.transaction || order?.id,
        discountCode: '',
        discountAmount: order?.discount_amount || 0,
        discountCurrency: order?.currency || '',
        paymentAmount: order?.amount_paid || 0,
        paymentCurrency: order?.currency || '',
        paymentEmail: invoice.customer?.email,
        paymentUserName: invoice.customer?.name,
        paymentUserId: invoice.customer?.id,
        paidAt: order?.created_at ? new Date(order.created_at) : undefined,
        invoiceId: '', // todo: invoice id
        invoiceUrl: '',
        subscriptionCycleType: cycleType,
      },
      paymentResult: invoice,
      metadata: invoice.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        subscription.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from subscription
  private async buildPaymentSessionFromSubscription(
    subscription: any
  ): Promise<PaymentSession> {
    const result: PaymentSession = {
      provider: this.name,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        subscription.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build subscription info from subscription
  private async buildSubscriptionInfo(
    subscription: any,
    product?: any
  ): Promise<SubscriptionInfo> {
    const { interval, count: intervalCount } = this.mapCreemInterval(product);

    const subscriptionInfo: SubscriptionInfo = {
      subscriptionId: subscription.id,
      productId: product?.id,
      planId: '',
      description: product?.description,
      amount: product?.price,
      currency: product?.currency,
      currentPeriodStart: new Date(subscription.current_period_start_date),
      currentPeriodEnd: new Date(subscription.current_period_end_date),
      interval: interval,
      intervalCount: intervalCount,
      metadata: subscription.metadata,
    };

    if (subscription.status === 'active') {
      if (subscription.cancel_at) {
        subscriptionInfo.status = SubscriptionStatus.PENDING_CANCEL;
        // cancel apply at
        subscriptionInfo.canceledAt = new Date(subscription.canceled_at);
      } else {
        subscriptionInfo.status = SubscriptionStatus.ACTIVE;
      }
    } else if (subscription.status === 'canceled') {
      // subscription canceled
      subscriptionInfo.status = SubscriptionStatus.CANCELED;
      subscriptionInfo.canceledAt = new Date(subscription.canceled_at);
    } else if (subscription.status === 'trialing') {
      subscriptionInfo.status = SubscriptionStatus.TRIALING;
    } else if (subscription.status === 'paused') {
      subscriptionInfo.status = SubscriptionStatus.PAUSED;
    } else {
      throw new Error(
        `Unknown Creem subscription status: ${subscription.status}`
      );
    }

    return subscriptionInfo;
  }

  private mapCreemInterval(product: any): {
    interval: PaymentInterval;
    count: number;
  } {
    if (!product || !product.billing_period) {
      throw new Error('Invalid product');
    }

    switch (product.billing_period) {
      case 'every-month':
        return {
          interval: PaymentInterval.MONTH,
          count: 1,
        };
      case 'every-three-months':
        return {
          interval: PaymentInterval.MONTH,
          count: 3,
        };
      case 'every-six-months':
        return {
          interval: PaymentInterval.MONTH,
          count: 6,
        };
      case 'every-year':
        return {
          interval: PaymentInterval.YEAR,
          count: 1,
        };
      case 'once':
        return {
          interval: PaymentInterval.ONE_TIME,
          count: 1,
        };
      default:
        throw new Error(
          `Unknown Creem product billing period: ${product.billing_period}`
        );
    }
  }
}

/**
 * Create Creem provider with configs
 */
export function createCreemProvider(configs: CreemConfigs): CreemProvider {
  return new CreemProvider(configs);
}
