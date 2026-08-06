export type Language = 'en' | 'ur';

export type RegStatus = 'pending' | 'approved' | 'rejected';

export interface Registration {
  id: string;
  username: string;
  full_name: string;
  status: RegStatus;
  expires_at: string;
  created_at: string;
  referral_code?: string | null;
}

export interface WalletAccount {
  id: string;
  owner_username: string;
  display_name: string;
  balance: number;
  is_active: boolean;
  created_at: string;
}

export interface WalletInfo {
  wallet: WalletAccount;
  user_id: string;
  password: string;
  display_name: string;
  phone_number: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  status: string;
  note: string | null;
  created_at: string;
}

// Phase 2: combined history item (deposit or withdraw request)
export interface HistoryItem {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected';
  screenshot_url?: string | null;
  account_detail?: string | null;
  account_holder_name?: string | null;
  admin_notes?: string | null;
  created_at: string;
  processed_at?: string | null;
}

export interface AdminRegistration {
  id: string;
  full_name: string;
  username: string;
  phone_number: string;
  password_plain: string;
  status: RegStatus;
  admin_decision_at: string | null;
  admin_notes: string | null;
  expires_at: string;
  created_at: string;
  wallet_account_id: string | null;
}

export interface PaymentMethods {
  easypaisa: { name: string; number: string };
  jazzcash: { name: string; number: string };
  bank: { name: string; holder: string; account: string };
  currency: string;
  currencySymbol: string;
  whatsappSupportNumber: string;
}

export interface AdminConfig {
  adminUsername: string;
  telegramBotToken: string;
  telegramChatId: string;
  defaultWalletBalance: string;
  easypaisa: { name: string; number: string };
  jazzcash: { name: string; number: string };
  bank: { name: string; holder: string; account: string };
  currency: string;
  currencySymbol: string;
  whatsappSupportNumber: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  pending_users: number;
  total_deposits: number;
  total_withdrawals: number;
  pending_requests: number;
  wallet_balance_total: number;
}

export interface AdminUser {
  id: string;
  full_name: string;
  username: string;
  phone_number: string;
  password_plain: string | null;
  status: string;
  created_at: string;
  wallet_account_id: string | null;
  wallet_accounts?: Array<{ id: string; balance: number; is_active: boolean }> | null;
}

export interface AdminDeposit {
  id: string;
  owner_username: string;
  amount: number;
  payment_method: string;
  screenshot_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  registration_id: string;
}

export interface AdminWithdraw {
  id: string;
  owner_username: string;
  amount: number;
  payment_method: string;
  account_detail: string;
  account_holder_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  registration_id: string;
}

export interface AdminTransaction {
  id: string;
  owner_username: string;
  amount: number;
  payment_method: string;
  status: string;
  type: 'deposit' | 'withdraw';
  note?: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface HelplineMessage {
  id: string;
  sender: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface HelplineConversation {
  registration_id: string;
  username: string;
  full_name: string;
  messages: HelplineMessage[];
  last_message_at: string;
  unread_count: number;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}
