import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { registerForPushNotificationsAsync } from '@/lib/push';

interface NotificationContextValue {
  expoPushToken: string | null;
}

const NotificationContext = createContext<NotificationContextValue>({ expoPushToken: null });

/** Turn a push `data` payload into an in-app route. */
function routeFor(data: Record<string, unknown>): string | null {
  const kind = String(data.kind ?? '');
  if (kind === 'prescription_ready' && data.prescriptionId) {
    return `/prescription/${String(data.prescriptionId)}`;
  }
  if (kind.startsWith('appointment_') && data.appointmentId) {
    return `/appointment/${String(data.appointmentId)}`;
  }
  return null;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const received = useRef<Notifications.EventSubscription | null>(null);
  const responded = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    void registerForPushNotificationsAsync().then(setExpoPushToken);

    // Cold start from a notification tap.
    void Notifications.getLastNotificationResponseAsync().then((res) => {
      const path = res && routeFor(res.notification.request.content.data ?? {});
      if (path) router.push(path as never);
    });

    received.current = Notifications.addNotificationReceivedListener(() => {
      // Foreground display is handled by setNotificationHandler in _layout.
    });
    responded.current = Notifications.addNotificationResponseReceivedListener((res) => {
      const path = routeFor(res.notification.request.content.data ?? {});
      if (path) router.push(path as never);
    });

    return () => {
      received.current?.remove();
      responded.current?.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ expoPushToken }}>{children}</NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  return useContext(NotificationContext);
}
