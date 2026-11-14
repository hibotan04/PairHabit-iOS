export interface RecordStatus {
  status: 'completed' | 'skipped' | 'failed';
  timestamp?: string;
}

export interface HistoryRecord {
  status: 'completed' | 'skipped' | 'failed';
  by?: string;
  timestamp?: string;
}

export interface Habit {
  id: string;
  name: string;
  value: number;
  emoji: string;
  history: Record<string, HistoryRecord | string>; // string for legacy 'completed'
  ownerId?: string;
  createdAt?: string;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  achieved: boolean;
  image?: string;
  imageUrl?: string; // For compatibility
  title?: string; // For compatibility
  price?: number; // For compatibility
  status?: 'active' | 'redeemed' | 'ticket';
  createdAt: string;
  requiredDays?: number; // Days to wait after exchange
  availableFrom?: string; // Specific date (ISO string)
  availableAt?: string; // Calculated unlock date (ISO string)
  conditions?: {
    days: number;
    rate: number;
  };
}

export interface User {
  uid: string;
  name: string;
  icon: string;

  color: string;
  weekStartDay?: number;
  themeColor?: string;
  iconBg?: string;
  isPro?: boolean;
  isSponsor?: boolean;
}

export interface TimelineItem {
  id: string;
  text: string;
  timestamp: string;
  type: 'habit' | 'reward' | 'system';
  user: 'me' | 'partner' | 'system';
}
