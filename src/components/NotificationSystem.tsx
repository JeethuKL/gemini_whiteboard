import { useState, useEffect } from 'react';
import { CheckCircle, Info, AlertCircle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationSystem({ notifications, onRemove }: NotificationSystemProps) {
  useEffect(() => {
    notifications.forEach(notification => {
      const duration = notification.duration || 3000;
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, duration);

      return () => clearTimeout(timer);
    });
  }, [notifications, onRemove]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm
            ${notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : ''}
            ${notification.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : ''}
            transform transition-all duration-300 ease-in-out
          `}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
          {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
          {notification.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
          
          <span className="text-sm font-medium">{notification.message}</span>
          
          <button
            onClick={() => onRemove(notification.id)}
            className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    addNotification,
    removeNotification,
  };
}
