import React, {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, ReactNode,
} from 'react';
import { api } from '@/lib/api';

export type ToastType = 'queue' | 'appointment' | 'system' | 'alert' | 'success';

export type ToastItem = {
  id: string;
  title: string;
  body: string;
  type: ToastType;
};

type NotifContextType = {
  showToast:    (title: string, body: string, type?: ToastType) => void;
  unreadCount:  number;
  setUnreadCount: (n: number) => void;
  activeToast:  ToastItem | null;
  dismissToast: () => void;
};

const NotifContext = createContext<NotifContextType>({
  showToast:      () => {},
  unreadCount:    0,
  setUnreadCount: () => {},
  activeToast:    null,
  dismissToast:   () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [queue,       setQueue]       = useState<ToastItem[]>([]);
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const showing = useRef(false);

  // Poll backend unread count every 30 s
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      const { data } = await api.get<{ count: number }>('/notifications/unread-count/');
      if (!cancelled && data) setUnreadCount(data.count);
    };
    fetch();
    const t = setInterval(fetch, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Drain queue one toast at a time
  useEffect(() => {
    if (queue.length > 0 && !showing.current) {
      showing.current = true;
      setActiveToast(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [queue]);

  const showToast = useCallback((title: string, body: string, type: ToastType = 'system') => {
    const id = `${Date.now()}-${Math.random()}`;
    setQueue(q => [...q, { id, title, body, type }]);
    setUnreadCount(c => c + 1);
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
    showing.current = false;
  }, []);

  return (
    <NotifContext.Provider value={{ showToast, unreadCount, setUnreadCount, activeToast, dismissToast }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}
