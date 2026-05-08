import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MessageActor = 'customer' | 'staff' | 'admin' | 'super_admin';
export type SupportCategory = 'general' | 'technical' | 'billing' | 'complaint' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type MessageType = 'message' | 'announcement' | 'report';

export type Reply = {
  id: string;
  from: MessageActor;
  fromName: string;
  body: string;
  timestamp: string;
};

export type SupportTicket = {
  id: string;
  from: MessageActor;
  fromName: string;
  to: 'staff' | 'admin' | 'super_admin';
  subject: string;
  body: string;
  category: SupportCategory;
  status: TicketStatus;
  timestamp: string;
  replies: Reply[];
  isRead: boolean;
};

export type InternalMessage = {
  id: string;
  from: MessageActor;
  fromName: string;
  to: MessageActor;
  subject: string;
  body: string;
  type: MessageType;
  timestamp: string;
  replies: Reply[];
  isRead: boolean;
};

type MessagesCtx = {
  tickets: SupportTicket[];
  messages: InternalMessage[];
  sendTicket: (t: Omit<SupportTicket, 'id' | 'timestamp' | 'replies' | 'isRead' | 'status'>) => void;
  sendMessage: (m: Omit<InternalMessage, 'id' | 'timestamp' | 'replies' | 'isRead'>) => void;
  replyTicket: (ticketId: string, r: Omit<Reply, 'id' | 'timestamp'>) => void;
  replyMessage: (msgId: string, r: Omit<Reply, 'id' | 'timestamp'>) => void;
  markTicketRead: (id: string) => void;
  markMessageRead: (id: string) => void;
  updateStatus: (ticketId: string, status: TicketStatus) => void;
  ticketsFor: (role: MessageActor) => SupportTicket[];
  messagesFor: (role: MessageActor) => InternalMessage[];
  unreadCount: (role: MessageActor) => number;
};

const Ctx = createContext<MessagesCtx | null>(null);

const SEED_TICKETS: SupportTicket[] = [
  {
    id: 't1', from: 'customer', fromName: 'John Doe', to: 'staff',
    subject: 'Long wait time at Downtown branch',
    body: 'I have been waiting for over 2 hours. The estimated wait shown was 30 minutes.',
    category: 'complaint', status: 'open',
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    replies: [], isRead: false,
  },
  {
    id: 't2', from: 'customer', fromName: 'Jane Smith', to: 'admin',
    subject: 'Cannot book appointment online',
    body: 'The appointment booking system shows an error when I try to select a time slot.',
    category: 'technical', status: 'in_progress',
    timestamp: new Date(Date.now() - 7_200_000).toISOString(),
    replies: [
      { id: 'r1', from: 'admin', fromName: 'Admin Team',
        body: 'We are looking into this issue. Thank you for your patience.',
        timestamp: new Date(Date.now() - 3_600_000).toISOString() },
    ],
    isRead: true,
  },
];

const SEED_MESSAGES: InternalMessage[] = [
  {
    id: 'm1', from: 'staff', fromName: 'Sarah Johnson', to: 'admin',
    subject: 'Queue overflow — Northside Branch',
    body: 'We are experiencing unusually high traffic today and need additional resources assigned.',
    type: 'message',
    timestamp: new Date(Date.now() - 1_800_000).toISOString(),
    replies: [], isRead: false,
  },
  {
    id: 'm2', from: 'super_admin', fromName: 'Super Admin', to: 'admin',
    subject: 'New compliance guidelines effective Monday',
    body: 'Please review the updated compliance guidelines and distribute to your teams before Monday.',
    type: 'announcement',
    timestamp: new Date(Date.now() - 86_400_000).toISOString(),
    replies: [], isRead: false,
  },
  {
    id: 'm3', from: 'admin', fromName: 'Admin Team', to: 'staff',
    subject: 'Reminder: System maintenance this weekend',
    body: 'The queue management system will be under maintenance Saturday 11pm–2am. Please inform customers.',
    type: 'announcement',
    timestamp: new Date(Date.now() - 43_200_000).toISOString(),
    replies: [], isRead: false,
  },
];

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<SupportTicket[]>(SEED_TICKETS);
  const [messages, setMessages] = useState<InternalMessage[]>(SEED_MESSAGES);

  const sendTicket = (t: Omit<SupportTicket, 'id' | 'timestamp' | 'replies' | 'isRead' | 'status'>) =>
    setTickets(prev => [
      { ...t, id: `t${Date.now()}`, timestamp: new Date().toISOString(), replies: [], isRead: false, status: 'open' },
      ...prev,
    ]);

  const sendMessage = (m: Omit<InternalMessage, 'id' | 'timestamp' | 'replies' | 'isRead'>) =>
    setMessages(prev => [
      { ...m, id: `m${Date.now()}`, timestamp: new Date().toISOString(), replies: [], isRead: false },
      ...prev,
    ]);

  const replyTicket = (ticketId: string, r: Omit<Reply, 'id' | 'timestamp'>) =>
    setTickets(prev => prev.map(t => t.id !== ticketId ? t : {
      ...t,
      replies: [...t.replies, { ...r, id: `r${Date.now()}`, timestamp: new Date().toISOString() }],
      status: t.status === 'open' ? 'in_progress' : t.status,
    }));

  const replyMessage = (msgId: string, r: Omit<Reply, 'id' | 'timestamp'>) =>
    setMessages(prev => prev.map(m => m.id !== msgId ? m : {
      ...m,
      replies: [...m.replies, { ...r, id: `r${Date.now()}`, timestamp: new Date().toISOString() }],
    }));

  const markTicketRead = (id: string) =>
    setTickets(prev => prev.map(t => t.id === id ? { ...t, isRead: true } : t));

  const markMessageRead = (id: string) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));

  const updateStatus = (ticketId: string, status: TicketStatus) =>
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));

  const ticketsFor = (role: MessageActor): SupportTicket[] => {
    if (role === 'super_admin') return tickets;
    if (role === 'admin') return tickets;
    if (role === 'staff') return tickets.filter(t => t.to === 'staff');
    return tickets.filter(t => t.from === 'customer');
  };

  const messagesFor = (role: MessageActor): InternalMessage[] =>
    messages.filter(m => m.to === role || m.from === role);

  const unreadCount = (role: MessageActor): number => {
    const unreadT = ticketsFor(role).filter(t => !t.isRead && t.from !== role).length;
    const unreadM = messagesFor(role).filter(m => !m.isRead && m.from !== role).length;
    return unreadT + unreadM;
  };

  return (
    <Ctx.Provider value={{
      tickets, messages,
      sendTicket, sendMessage,
      replyTicket, replyMessage,
      markTicketRead, markMessageRead,
      updateStatus,
      ticketsFor, messagesFor, unreadCount,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
}
