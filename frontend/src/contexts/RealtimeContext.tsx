import React, { createContext, useContext, useEffect, useState } from 'react';
import realtimeClient, { type RealtimeMessage, type RealtimeStatus } from '../api/realtime';

interface RealtimeContextType {
  status: RealtimeStatus;
  lastMessage: RealtimeMessage | null;
  broadcastEvent: (message: RealtimeMessage) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<RealtimeStatus>(realtimeClient.getStatus());
  const [lastMessage, setLastMessage] = useState<RealtimeMessage | null>(null);

  useEffect(() => {
    // Start connection
    realtimeClient.connect();

    // Listen for status changes
    const unsubStatus = realtimeClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Listen for incoming messages
    const unsubMsg = realtimeClient.subscribe((msg) => {
      setLastMessage(msg);
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, []);

  const broadcastEvent = (msg: RealtimeMessage) => {
    realtimeClient.broadcastLocalEvent(msg);
  };

  return (
    <RealtimeContext.Provider value={{ status, lastMessage, broadcastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

export default RealtimeContext;
