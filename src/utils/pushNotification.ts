/**
 * Sends a push notification for an event using the Service Worker or fallback to regular Notification API
 * @param title - The notification title
 * @param body - The notification body text
 */
export const sendEventPushNotification = async (title: string, body: string) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.active) {
          await reg.showNotification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200],
            tag: 'cica-nyt-event',
            data: { url: '/' },
          });
          return;
        }
      }
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        tag: 'cica-nyt-event',
      });
    } catch (e) {
      console.warn('Push notification trigger error:', e);
    }
  }
};

/**
 * Requests notification permission from the user
 * @returns Promise that resolves to true if permission was granted, false otherwise
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (e) {
    console.warn('Notification permission request error:', e);
    return false;
  }
};
