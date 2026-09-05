/**
 * Browser Local Notification Utility
 * Leverages the standard HTML5 Notification API to alert the user about critical bot events:
 * - Critical Loss / Stop-Loss Threshold reached
 * - Unexpected Bot Stop (insufficient balance, API failure, emergency circuit breaker)
 * - Take-Profit / Session Goal reached
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check if the browser supports the HTML5 Notification API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission state
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return Notification.permission || 'default';
  }
}

export interface NotificationPayloadOptions {
  body?: string;
  icon?: string;
  tag?: string;
  badge?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Dispatch a native local browser notification
 */
export function sendBrowserNotification(
  title: string,
  options?: NotificationPayloadOptions
): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const defaultIcon = '/icon.png';
    const notif = new Notification(title, {
      icon: options?.icon || defaultIcon,
      body: options?.body || '',
      tag: options?.tag || `stake-bot-${Date.now()}`,
      badge: options?.badge || defaultIcon,
      requireInteraction: options?.requireInteraction ?? false,
      silent: options?.silent ?? false,
    });

    // Bring tab into focus on click if supported
    notif.onclick = () => {
      try {
        window.focus();
        notif.close();
      } catch (e) {
        // Ignored in strict sandboxes
      }
    };

    // Auto-close after 8 seconds if not interacting
    setTimeout(() => {
      try {
        notif.close();
      } catch (e) {
        // Ignored
      }
    }, 8000);

    return notif;
  } catch (err) {
    console.warn('Error displaying browser notification:', err);
    return null;
  }
}

/**
 * Trigger an alert when a critical loss / stop-loss threshold is hit
 */
export function notifyCriticalLoss(details: {
  lossAmount: number;
  currency: string;
  lossPercent?: number;
  reason?: string;
  strategyName?: string;
}): void {
  const title = `🛑 ALERTE : Seuil critique de perte atteint !`;
  const body = details.lossPercent
    ? `Perte de -${Math.abs(details.lossAmount).toFixed(2)} ${details.currency} (-${details.lossPercent}% de bankroll). ${details.reason || "L'auto-betting a été coupé immédiatement par sécurité."}`
    : `Perte session de -${Math.abs(details.lossAmount).toFixed(2)} ${details.currency}. ${details.reason || "L'auto-betting a été arrêté par sécurité."}`;

  sendBrowserNotification(title, {
    body,
    tag: 'critical-loss-alert',
    requireInteraction: true,
  });
}

/**
 * Trigger an alert when the bot stops unexpectedly (balance empty, circuit breaker, runtime error)
 */
export function notifyUnexpectedBotStop(details: {
  reason: string;
  game?: string;
  balance?: number;
  currency?: string;
  strategyName?: string;
}): void {
  const title = `⚠️ Arrêt Inattendu de l'Auto-Betting`;
  let body = `Le bot s'est arrêté : ${details.reason}`;
  if (details.balance !== undefined && details.currency) {
    body += ` (Solde restant : ${details.balance.toFixed(2)} ${details.currency})`;
  }

  sendBrowserNotification(title, {
    body,
    tag: 'unexpected-stop-alert',
    requireInteraction: true,
  });
}

/**
 * Trigger an alert when a Take-Profit or session target is secured
 */
export function notifyTakeProfit(details: {
  profitAmount: number;
  currency: string;
  strategyName?: string;
  reason?: string;
}): void {
  const title = `🎯 Objectif Take-Profit Atteint !`;
  const body = `Session clôturée avec succès à +${details.profitAmount.toFixed(2)} ${details.currency}. ${details.reason || 'Vos gains ont été sécurisés.'}`;

  sendBrowserNotification(title, {
    body,
    tag: 'take-profit-alert',
    requireInteraction: false,
  });
}

/**
 * Send a test notification to verify audio and visual push integration
 */
export function sendTestNotification(): void {
  sendBrowserNotification('🔔 Test Notification Stake Bot', {
    body: 'Les notifications locales du navigateur fonctionnent parfaitement ! Vous recevrez des alertes en cas de stop-loss ou d’arrêt inattendu.',
    tag: 'test-notification',
  });
}
