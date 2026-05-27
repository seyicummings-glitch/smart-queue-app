import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

export type UserRole = 'super_admin' | 'superadmin' | 'admin' | 'staff' | 'customer' | null;

export type StaffQueue = {
  id: number;
  name: string;
  count: number;
};

export type ActiveTicket = {
  ticketId?: number;        // backend PK — used to cancel via API
  ticketNumber: string;
  service: string;
  industry: string;
  branch: string;
  waitTime: number;
  peopleAhead: number;
  issuedAt: string;
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'missed';
  aheadTickets?: string[];  // ticket numbers of people ahead
  counter?: string;
};

type AppContextType = {
  staffQueues: StaffQueue[];
  role: UserRole;
  setRole: (role: UserRole) => void;
  activeTicket: ActiveTicket | null;
  setActiveTicket: React.Dispatch<React.SetStateAction<ActiveTicket | null>>;
};

const AppContext = createContext<AppContextType>({
  staffQueues: [],
  role: null,
  setRole: () => {},
  activeTicket: null,
  setActiveTicket: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('admin');
  const [staffQueues] = useState<StaffQueue[]>([]);
  const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null);

  const value = useMemo(
    () => ({ staffQueues, role, setRole, activeTicket, setActiveTicket }),
    [staffQueues, role, activeTicket]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
