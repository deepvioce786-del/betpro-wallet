import type { Language } from './types';

export interface Translation {
  dir: 'ltr' | 'rtl';
  appName: string;
  // nav
  home: string;
  signIn: string;
  signUp: string;
  signOut: string;
  dashboard: string;
  adminPanel: string;
  // home / hero
  heroTagline: string;
  heroDescription: string;
  getStarted: string;
  featuresTitle: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Title: string;
  feature4Desc: string;
  secureWalletTitle: string;
  secureWalletDesc: string;
  // signup
  createAccount: string;
  createAccountDesc: string;
  fullName: string;
  fullNamePlaceholder: string;
  username: string;
  usernamePlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  passwordHint: string;
  phoneNumber: string;
  phoneNumberPlaceholder: string;
  alreadyHaveAccount: string;
  submitRegistration: string;
  // signin
  welcomeBack: string;
  signInDesc: string;
  signInButton: string;
  dontHaveAccount: string;
  // pending
  pendingTitle: string;
  pendingEn: string;
  pendingUr: string;
  countdownLabel: string;
  pendingSubtitle: string;
  pendingExpiredTitle: string;
  pendingExpiredDesc: string;
  backToHome: string;
  accountRejectedTitle: string;
  accountRejectedDesc: string;
  contactAdmin: string;
  // dashboard
  walletBalance: string;
  deposit: string;
  withdraw: string;
  history: string;
  userId: string;
  copy: string;
  copied: string;
  welcomeUser: string;
  // deposit/withdraw
  depositTitle: string;
  depositDesc: string;
  withdrawTitle: string;
  withdrawDesc: string;
  amount: string;
  amountPlaceholder: string;
  note: string;
  notePlaceholder: string;
  submit: string;
  cancel: string;
  availableBalance: string;
  transactionSuccess: string;
  insufficientBalance: string;
  // history
  historyTitle: string;
  historyDesc: string;
  type: string;
  date: string;
  status: string;
  noTransactions: string;
  deposits: string;
  withdrawals: string;
  // admin
  adminLogin: string;
  adminLoginDesc: string;
  adminUsername: string;
  adminPassword: string;
  adminDashboard: string;
  pendingApprovals: string;
  approve: string;
  reject: string;
  noPendingRequests: string;
  allRegistrations: string;
  approved: string;
  rejected: string;
  pending: string;
  telegramConfig: string;
  botToken: string;
  chatId: string;
  defaultBalance: string;
  saveConfig: string;
  setWebhook: string;
  webhookInfo: string;
  changeCredentials: string;
  newUsername: string;
  newPassword: string;
  newPasswordHint: string;
  // misc
  loading: string;
  error: string;
  back: string;
  language: string;
  english: string;
  urdu: string;
  // Phase 2 — deposit
  paymentMethod: string;
  easypaisa: string;
  jazzcash: string;
  bankAccount: string;
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  uploadScreenshot: string;
  screenshotHint: string;
  depositPendingMsg: string;
  selectMethod: string;
  // Phase 2 — withdraw
  withdrawMethod: string;
  yourAccountDetail: string;
  yourAccountDetailPlaceholder: string;
  accountHolderName: string;
  withdrawPendingMsg: string;
  withdrawDeductedMsg: string;
  // Phase 2 — history statuses
  successful: string;
  method: string;
  screenshot: string;
  viewScreenshot: string;
  // Phase 2 — admin
  overview: string;
  userManagement: string;
  activeUsers: string;
  pendingUsers: string;
  depositRequests: string;
  withdrawRequests: string;
  transactionHistory: string;
  walletManagement: string;
  telegramSettings: string;
  systemSettings: string;
  adminProfile: string;
  totalUsers: string;
  totalDeposits: string;
  totalWithdrawals: string;
  pendingReqs: string;
  walletBalanceStats: string;
  searchUsers: string;
  searchPlaceholder: string;
  suspendUser: string;
  activateUser: string;
  addBalance: string;
  removeBalance: string;
  viewHistory: string;
  suspended: string;
  active: string;
  adjustBalance: string;
  enterAmount: string;
  adminNote: string;
  testConnection: string;
  testSuccess: string;
  testFailed: string;
  updateConfig: string;
  saveSettings: string;
  easypaisaName: string;
  easypaisaNumber: string;
  jazzcashName: string;
  jazzcashNumber: string;
  bankHolder: string;
  bankAccountNumber: string;
  paymentAccounts: string;
  userHistory: string;
  reports: string;
  noUsers: string;
  noDeposits: string;
  noWithdrawals: string;
  confirmApprove: string;
  confirmReject: string;
  amountRs: string;
  usernameCol: string;
  phoneCol: string;
  actions: string;
  balanceCol: string;
  close: string;
  save: string;
  // Phase 2b — unified sign-in + username validation
  userMode: string;
  adminMode: string;
  loginAs: string;
  usernameValidation: string;
  usernameValidationUr: string;
  // Username suggestions
  usernameSuggestions: string;
  usernameSuggestionsDesc: string;
  checkingAvailability: string;
  usernameAvailable: string;
  usernameTakenLabel: string;
  usernameTakenChooseSuggestion: string;
  usernameAvailableMsg: string;
  useThisUsername: string;
  orEnterYourOwn: string;
  // Sign-in with phone
  usernameOrPhone: string;
  usernameOrPhonePlaceholder: string;
  // Helpline
  helpline: string;
  helplineDesc: string;
  helplinePlaceholder: string;
  helplineSend: string;
  helplineOnline: string;
  helplineOffline: string;
  helplineAdmin: string;
  helplineYou: string;
  helplineNoMessages: string;
  helplineLoading: string;
  helplineError: string;
  // Admin helpline
  adminHelpline: string;
  adminHelplineDesc: string;
  adminHelplineNoConversations: string;
  adminHelplineReply: string;
  adminHelplineReplyPlaceholder: string;
  adminHelplineSend: string;
  // Announcements
  announcement: string;
  announcementDesc: string;
  noAnnouncements: string;
  closeAnnouncement: string;
  // Admin announcements
  adminAnnouncements: string;
  adminAnnouncementsDesc: string;
  adminAnnouncementTitle: string;
  adminAnnouncementBody: string;
  adminAnnouncementCreate: string;
  adminAnnouncementEdit: string;
  adminAnnouncementDelete: string;
  adminAnnouncementActive: string;
  adminAnnouncementInactive: string;
  adminAnnouncementConfirmDelete: string;
  adminAnnouncementNew: string;
  adminAnnouncementSave: string;
  msgStatusSent: string;
  msgStatusDelivered: string;
  msgStatusSeen: string;
  // Admin alerts
  alertsNav: string;
  alertSettings: string;
  alertHistory: string;
  newUserRegistered: string;
  stopAlarm: string;
  uploadAlarmSound: string;
  alarmSoundHint: string;
  currentAlarmSound: string;
  noAlarmSound: string;
  removeAlarmSound: string;
  testAlarm: string;
  noAlerts: string;
  dismissAll: string;
  clearHistory: string;
  unreadAlerts: string;
  passwordCol: string;
  registeredAt: string;
  dismiss: string;
  viewInApprovals: string;
  // Edit username
  editUsername: string;
  editUsernameTitle: string;
  newUsernameLabel: string;
  confirmUsernameChange: string;
  usernameUpdatedSuccess: string;
  usernameTaken: string;
  // Change user password
  changePassword: string;
  changePasswordTitle: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  passwordMismatch: string;
  passwordUpdatedSuccess: string;
  confirmPasswordChange: string;
}

export const translations: Record<Language, Translation> = {
  en: {
    dir: 'ltr',
    appName: 'BetPro Wallet',
    home: 'Home', signIn: 'Sign In', signUp: 'Sign Up', signOut: 'Sign Out',
    dashboard: 'Dashboard', adminPanel: 'Admin',
    heroTagline: 'Your Trusted Digital Wallet',
    heroDescription: 'Secure, fast and reliable. Manage your funds with confidence — deposits, withdrawals and full transaction history, all in one place.',
    getStarted: 'Get Started', featuresTitle: 'Why Choose BetPro Wallet',
    feature1Title: 'Bank-Grade Security', feature1Desc: 'Your account is protected by admin-approved access and encrypted credentials.',
    feature2Title: 'Instant Transactions', feature2Desc: 'Deposit and withdraw in seconds with real-time balance updates.',
    feature3Title: 'Full Transparency', feature3Desc: 'Track every transaction with a complete, timestamped history.',
    feature4Title: '24/7 Access', feature4Desc: 'Your wallet is always available, on any device, anywhere.',
    secureWalletTitle: 'Secure Wallet Management', secureWalletDesc: 'Every account is reviewed and approved by our admin team before activation.',
    createAccount: 'Create Your Account', createAccountDesc: 'Fill in your details below. An administrator will review and approve your account.',
    fullName: 'Full Name', fullNamePlaceholder: 'John Doe',
    username: 'Username', usernamePlaceholder: 'johndoe',
    password: 'Password', passwordPlaceholder: 'Exactly 8 characters', passwordHint: 'Password must be exactly 8 characters long and contain both letters and numbers.',
    phoneNumber: 'Phone Number', phoneNumberPlaceholder: '+92 300 1234567',
    alreadyHaveAccount: 'Already have an account?', submitRegistration: 'Submit Registration',
    welcomeBack: 'Welcome Back', signInDesc: 'Sign in to access your wallet dashboard.',
    signInButton: 'Sign In', dontHaveAccount: "Don't have an account?",
    pendingTitle: 'Account Under Review',
    pendingEn: 'Please wait. Your account is under admin approval.',
    pendingUr: 'براہ کرم انتظار کریں، آپ کا اکاؤنٹ ایڈمن کی منظوری کے انتظار میں ہے۔',
    countdownLabel: 'Time remaining', pendingSubtitle: 'Your registration has been received. An administrator has been notified.',
    pendingExpiredTitle: 'Still Waiting for Approval', pendingExpiredDesc: 'The initial review window has passed. Your request is still in the queue — please be patient or contact support.',
    backToHome: 'Back to Home', accountRejectedTitle: 'Account Rejected', accountRejectedDesc: 'Unfortunately your registration was not approved. Please contact support for assistance.', contactAdmin: 'Contact Admin',
    walletBalance: 'Wallet Balance', deposit: 'Deposit', withdraw: 'Withdraw', history: 'History',
    userId: 'User ID', copy: 'Copy', copied: 'Copied!', welcomeUser: 'Welcome',
    depositTitle: 'Deposit Funds', depositDesc: 'Add funds to your wallet balance.',
    withdrawTitle: 'Withdraw Funds', withdrawDesc: 'Withdraw funds from your wallet.',
    amount: 'Amount', amountPlaceholder: '0.00', note: 'Note (optional)', notePlaceholder: 'Add a note for this transaction',
    submit: 'Submit', cancel: 'Cancel', availableBalance: 'Available Balance',
    transactionSuccess: 'Transaction completed successfully', insufficientBalance: 'Insufficient balance for this withdrawal',
    historyTitle: 'Transaction History', historyDesc: 'A complete record of your deposits and withdrawals.',
    type: 'Type', date: 'Date', status: 'Status', noTransactions: 'No transactions yet',
    deposits: 'Deposits', withdrawals: 'Withdrawals',
    adminLogin: 'Admin Login', adminLoginDesc: 'Restricted access. Administrators only.',
    adminUsername: 'Admin Username', adminPassword: 'Admin Password', adminDashboard: 'Admin Dashboard',
    pendingApprovals: 'Pending Approvals', approve: 'Approve', reject: 'Reject', noPendingRequests: 'No pending requests',
    allRegistrations: 'All Registrations', approved: 'Approved', rejected: 'Rejected', pending: 'Pending',
    telegramConfig: 'Telegram Configuration', botToken: 'Bot Token', chatId: 'Chat ID', defaultBalance: 'Default Wallet Balance',
    saveConfig: 'Save Configuration', setWebhook: 'Set Telegram Webhook', webhookInfo: 'Webhook Info',
    changeCredentials: 'Change Admin Credentials', newUsername: 'New Admin Username', newPassword: 'New Admin Password', newPasswordHint: 'Minimum 8 characters. Must include at least one letter. Numbers-only passwords are not allowed. Leave blank to keep current password.',
    loading: 'Loading...', error: 'Error', back: 'Back', language: 'Language', english: 'English', urdu: 'اردو',
    paymentMethod: 'Payment Method', easypaisa: 'EasyPaisa', jazzcash: 'JazzCash', bankAccount: 'Bank Account',
    accountHolder: 'Account Holder Name', accountNumber: 'Account Number', bankName: 'Bank Name',
    uploadScreenshot: 'Upload Payment Screenshot', screenshotHint: 'Upload your payment receipt (max 500 MB)',
    depositPendingMsg: 'Your deposit request has been submitted and is pending admin approval.',
    selectMethod: 'Select a payment method',
    withdrawMethod: 'Withdrawal Method', yourAccountDetail: 'Your Account Number', yourAccountDetailPlaceholder: 'Enter your account number',
    accountHolderName: 'Account Holder Name', withdrawPendingMsg: 'Your withdrawal request has been submitted and is pending admin approval.',
    withdrawDeductedMsg: 'The amount has been deducted from your wallet. If rejected, it will be refunded.',
    successful: 'Successful', method: 'Method', screenshot: 'Screenshot', viewScreenshot: 'View',
    overview: 'Dashboard Overview', userManagement: 'User Management', activeUsers: 'Active Users', pendingUsers: 'Pending Users',
    depositRequests: 'Deposit Requests', withdrawRequests: 'Withdrawal Requests', transactionHistory: 'Transaction History',
    walletManagement: 'Wallet Management', telegramSettings: 'Telegram Settings', systemSettings: 'System Settings', adminProfile: 'Admin Profile',
    totalUsers: 'Total Users', totalDeposits: 'Total Deposits', totalWithdrawals: 'Total Withdrawals', pendingReqs: 'Pending Requests', walletBalanceStats: 'Wallet Balance',
    searchUsers: 'Search Users', searchPlaceholder: 'Search by username, name or phone...',
    suspendUser: 'Suspend', activateUser: 'Activate', addBalance: 'Add Balance', removeBalance: 'Remove Balance', viewHistory: 'View History',
    suspended: 'Suspended', active: 'Active', adjustBalance: 'Adjust Balance', enterAmount: 'Enter amount', adminNote: 'Admin note (optional)',
    testConnection: 'Test Connection', testSuccess: 'Test message sent successfully!', testFailed: 'Test failed',
    updateConfig: 'Update', saveSettings: 'Save Settings',
    easypaisaName: 'EasyPaisa Name', easypaisaNumber: 'EasyPaisa Number', jazzcashName: 'JazzCash Name', jazzcashNumber: 'JazzCash Number',
    bankHolder: 'Account Holder Name', bankAccountNumber: 'Account Number', paymentAccounts: 'Payment Accounts',
    userHistory: 'User History', reports: 'Reports & Statistics', noUsers: 'No users found', noDeposits: 'No deposit requests', noWithdrawals: 'No withdrawal requests',
    confirmApprove: 'Are you sure you want to approve this request?', confirmReject: 'Are you sure you want to reject this request?',
    amountRs: 'Amount (Rs)', usernameCol: 'Username', phoneCol: 'Phone', actions: 'Actions', balanceCol: 'Balance',
    close: 'Close', save: 'Save',
    userMode: 'User', adminMode: 'Admin', loginAs: 'Login as',
    usernameValidation: 'Username must start with letters and end with 4 or 5 digits (e.g. ali1234, ahmed56789).',
    usernameValidationUr: 'یوزر نیم حروف سے شروع ہو اور آخر میں 4 یا 5 نمبرز ہوں (جیسے ali1234، ahmed56789)۔',
    usernameSuggestions: 'Username Suggestions',
    usernameSuggestionsDesc: 'Pick a suggested username or enter your own.',
    checkingAvailability: 'Checking...',
    usernameAvailable: 'Available',
    usernameTakenLabel: 'Taken',
    usernameTakenChooseSuggestion: 'This username is already taken. Please choose one of the available suggestions below.',
    usernameAvailableMsg: 'Username is available.',
    useThisUsername: 'Use',
    orEnterYourOwn: 'Or enter your own username',
    usernameOrPhone: 'Username or Phone Number',
    usernameOrPhonePlaceholder: 'username or phone number',
    helpline: 'Helpline',
    helplineDesc: 'Send a message to admin. We will reply as soon as possible.',
    helplinePlaceholder: 'Type your message...',
    helplineSend: 'Send',
    helplineOnline: 'Online',
    helplineOffline: 'Offline',
    helplineAdmin: 'Admin',
    helplineYou: 'You',
    helplineNoMessages: 'No messages yet. Start the conversation!',
    helplineLoading: 'Loading messages...',
    helplineError: 'Failed to load messages. Please try again.',
    adminHelpline: 'Helpline',
    adminHelplineDesc: 'View and reply to user messages.',
    adminHelplineNoConversations: 'No helpline conversations yet.',
    adminHelplineReply: 'Reply',
    adminHelplineReplyPlaceholder: 'Type your reply...',
    adminHelplineSend: 'Send Reply',
    announcement: 'Announcement',
    announcementDesc: 'Latest update from BetPro',
    noAnnouncements: 'No announcements available.',
    closeAnnouncement: 'Dismiss',
    adminAnnouncements: 'Announcements',
    adminAnnouncementsDesc: 'Publish updates and announcements visible to all users.',
    adminAnnouncementTitle: 'Title',
    adminAnnouncementBody: 'Message',
    adminAnnouncementCreate: 'Publish',
    adminAnnouncementEdit: 'Edit',
    adminAnnouncementDelete: 'Delete',
    adminAnnouncementActive: 'Active',
    adminAnnouncementInactive: 'Inactive',
    adminAnnouncementConfirmDelete: 'Delete this announcement? This cannot be undone.',
    adminAnnouncementNew: 'New Announcement',
    adminAnnouncementSave: 'Save',
    msgStatusSent: 'Sent',
    msgStatusDelivered: 'Delivered',
    msgStatusSeen: 'Seen',
    alertsNav: 'Alerts',
    alertSettings: 'Alarm Settings',
    alertHistory: 'Notification History',
    newUserRegistered: 'New user registered.',
    stopAlarm: 'Stop Alarm',
    uploadAlarmSound: 'Upload Alarm Sound',
    alarmSoundHint: 'Select an MP3 or WAV file from your device.',
    currentAlarmSound: 'Current alarm sound:',
    noAlarmSound: 'Default beep (no custom sound set)',
    removeAlarmSound: 'Remove',
    testAlarm: 'Test Alarm',
    noAlerts: 'No alerts yet.',
    dismissAll: 'Dismiss All',
    clearHistory: 'Clear History',
    unreadAlerts: 'unread',
    passwordCol: 'Password',
    registeredAt: 'Registered at',
    dismiss: 'Dismiss',
    viewInApprovals: 'View in Approvals',
    editUsername: 'Edit Username',
    editUsernameTitle: 'Edit Username',
    newUsernameLabel: 'New Username',
    confirmUsernameChange: 'Are you sure you want to change this username?',
    usernameUpdatedSuccess: 'Username updated successfully.',
    usernameTaken: 'This username is already taken by another user.',
    changePassword: 'Change Password',
    changePasswordTitle: 'Change Password',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm New Password',
    passwordMismatch: 'Passwords do not match.',
    passwordUpdatedSuccess: 'Password updated successfully.',
    confirmPasswordChange: 'Are you sure you want to change this user\'s password?',
  },
  ur: {
    dir: 'rtl',
    appName: 'بیٹ پرو والٹ',
    home: 'ہوم', signIn: 'سائن ان', signUp: 'سائن اپ', signOut: 'سائن آؤٹ',
    dashboard: 'ڈیش بورڈ', adminPanel: 'ایڈمن',
    heroTagline: 'آپ کا قابلِ اعتماد ڈیجیٹل والٹ',
    heroDescription: 'محفوظ، تیز اور قابلِ اعتماد۔ اپنے فنڈز کو اعتماد کے ساتھ منظم کریں — جمع، نکاسی اور مکمل لین دین کی تاریخ، سب کچھ ایک جگہ۔',
    getStarted: 'شروع کریں', featuresTitle: 'بیٹ پرو والٹ کیوں منتخب کریں',
    feature1Title: 'بینک سطح کی سیکیورٹی', feature1Desc: 'آپ کا اکاؤنٹ ایڈمن کی منظوری اور خفیہ کاری سے محفوظ ہے۔',
    feature2Title: 'فوری لین دین', feature2Desc: 'سیکنڈوں میں جمع اور نکاسی کریں، حقیقی وقت میں بیلنس اپ ڈیٹ ہوتا ہے۔',
    feature3Title: 'مکمل شفافیت', feature3Desc: 'ہر لین دین کو مکمل وقت کے ساتھ ٹریک کریں۔',
    feature4Title: '24/7 رسائی', feature4Desc: 'آپ کا والٹ ہمیشہ دستیاب ہے، کسی بھی ڈیوائس پر، کہیں بھی۔',
    secureWalletTitle: 'محفوظ والٹ مینجمنٹ', secureWalletDesc: 'ہر اکاؤنٹ کو ایکٹیویٹ کرنے سے پہلے ہماری ایڈمن ٹیم کی جانب سے جائزہ لیا جاتا ہے۔',
    createAccount: 'اپنا اکاؤنٹ بنائیں', createAccountDesc: 'نیچے اپنی تفصیل درج کریں۔ ایک ایڈمن آپ کے اکاؤنٹ کا جائزہ لے کر منظور کرے گا۔',
    fullName: 'پورا نام', fullNamePlaceholder: 'محمد علی',
    username: 'یوزر نیم', usernamePlaceholder: 'mohammadalali',
    password: 'پاس ورڈ', passwordPlaceholder: 'بالکل 8 حروف', passwordHint: 'پاس ورڈ بالکل 8 حروف کا ہونا چاہیے اور اس میں حروف اور نمبرز دونوں ہونے چاہئیں۔',
    phoneNumber: 'فون نمبر', phoneNumberPlaceholder: '+92 300 1234567',
    alreadyHaveAccount: 'پہلے سے اکاؤنٹ ہے؟', submitRegistration: 'رجسٹریشن جمع کریں',
    welcomeBack: 'خوش آمدید', signInDesc: 'اپنے والٹ ڈیش بورڈ تک رسائی کے لیے سائن ان کریں۔',
    signInButton: 'سائن ان', dontHaveAccount: 'اکاؤنٹ نہیں ہے؟',
    pendingTitle: 'اکاؤنٹ جائزے میں',
    pendingEn: 'Please wait. Your account is under admin approval.',
    pendingUr: 'براہ کرم انتظار کریں، آپ کا اکاؤنٹ ایڈمن کی منظوری کے انتظار میں ہے۔',
    countdownLabel: 'بقیہ وقت', pendingSubtitle: 'آپ کی رجسٹریشن موصول ہوگئی ہے۔ ایڈمن کو مطلع کر دیا گیا ہے۔',
    pendingExpiredTitle: 'منظوری کا انتظار جاری ہے', pendingExpiredDesc: 'ابتدائی جائزے کا وقت ختم ہوگیا ہے۔ آپ کی درخواست ابھی قطار میں ہے — براہ کرم صبر کریں یا سپورٹ سے رابطہ کریں۔',
    backToHome: 'ہوم پر واپس', accountRejectedTitle: 'اکاؤنٹ مسترد کر دیا گیا', accountRejectedDesc: 'افسوس کہ آپ کی رجسٹریشن منظور نہیں ہوئی۔ مدد کے لیے سپورٹ سے رابطہ کریں۔', contactAdmin: 'ایڈمن سے رابطہ',
    walletBalance: 'والٹ بیلنس', deposit: 'جمع', withdraw: 'نکاسی', history: 'تاریخ',
    userId: 'یوزر آئی ڈی', copy: 'کاپی', copied: 'کاپی ہو گیا!', welcomeUser: 'خوش آمدید',
    depositTitle: 'فنڈز جمع کریں', depositDesc: 'اپنے والٹ بیلنس میں فنڈز شامل کریں۔',
    withdrawTitle: 'فنڈز نکاسیں', withdrawDesc: 'اپنے والٹ سے فنڈز نکاسیں۔',
    amount: 'رقم', amountPlaceholder: '0.00', note: 'نوٹ (اختیاری)', notePlaceholder: 'اس لین دین کے لیے نوٹ',
    submit: 'جمع کریں', cancel: 'منسوخ', availableBalance: 'دستیاب بیلنس',
    transactionSuccess: 'لین دین کامیابی سے مکمل ہوا', insufficientBalance: 'اس نکاسی کے لیے بیلنس کافی نہیں',
    historyTitle: 'لین دین کی تاریخ', historyDesc: 'آپ کی تمام جمع اور نکاسی کا مکمل ریکارڈ۔',
    type: 'قسم', date: 'تاریخ', status: 'حالت', noTransactions: 'ابھی کوئی لین دین نہیں',
    deposits: 'جمع شدہ', withdrawals: 'نکاسی شدہ',
    adminLogin: 'ایڈمن لاگ ان', adminLoginDesc: 'محدود رسائی۔ صرف ایڈمنز کے لیے۔',
    adminUsername: 'ایڈمن یوزر نیم', adminPassword: 'ایڈمن پاس ورڈ', adminDashboard: 'ایڈمن ڈیش بورڈ',
    pendingApprovals: 'منظوری کے منتظر', approve: 'منظور', reject: 'مسترد', noPendingRequests: 'کوئی زیرِ التواء درخواست نہیں',
    allRegistrations: 'تمام رجسٹریشنز', approved: 'منظور شدہ', rejected: 'مسترد شدہ', pending: 'زیر التواء',
    telegramConfig: 'ٹیلیگرام کنفیگریشن', botToken: 'بوٹ ٹوکن', chatId: 'چیٹ آئی ڈی', defaultBalance: 'ڈیفالٹ والٹ بیلنس',
    saveConfig: 'کنفیگریشن محفوظ کریں', setWebhook: 'ٹیلیگرام ویب ہوک سیٹ کریں', webhookInfo: 'ویب ہوک معلومات',
    changeCredentials: 'ایڈمن اسناد تبدیل کریں', newUsername: 'نیا ایڈمن یوزر نیم', newPassword: 'نیا ایڈمن پاس ورڈ', newPasswordHint: 'کم از کم 8 حروف۔ کم از کم ایک حرف ضروری ہے۔ صرف نمبرز پر مشتمل پاس ورڈز کی اجازت نہیں۔ موجودہ پاس ورڈ رکھنے کے لیے خالی چھوڑیں۔',
    loading: 'لوڈ ہو رہا ہے...', error: 'خرابی', back: 'واپس', language: 'زبان', english: 'English', urdu: 'اردو',
    paymentMethod: 'ادائیگی کا طریقہ', easypaisa: 'ایزی پیسہ', jazzcash: 'جاز کیش', bankAccount: 'بینک اکاؤنٹ',
    accountHolder: 'اکاؤنٹ ہولڈر کا نام', accountNumber: 'اکاؤنٹ نمبر', bankName: 'بینک کا نام',
    uploadScreenshot: 'ادائیگی کا اسکرین شاٹ اپ لوڈ کریں', screenshotHint: 'اپنی ادائیگی کی رسید اپ لوڈ کریں (زیادہ سے زیادہ 500 MB)',
    depositPendingMsg: 'آپ کی جمع کی درخواست جمع ہو گئی ہے اور ایڈمن کی منظوری کے منتظر ہے۔',
    selectMethod: 'ادائیگی کا طریقہ منتخب کریں',
    withdrawMethod: 'نکاسی کا طریقہ', yourAccountDetail: 'آپ کا اکاؤنٹ نمبر', yourAccountDetailPlaceholder: 'اپنا اکاؤنٹ نمبر درج کریں',
    accountHolderName: 'اکاؤنٹ ہولڈر کا نام', withdrawPendingMsg: 'آپ کی نکاسی کی درخواست جمع ہو گئی ہے اور ایڈمن کی منظوری کے منتظر ہے۔',
    withdrawDeductedMsg: 'رقم آپ کے والٹ سے کاٹ دی گئی ہے۔ مسترد ہونے پر واپس کر دی جائے گی۔',
    successful: 'کامیاب', method: 'طریقہ', screenshot: 'اسکرین شاٹ', viewScreenshot: 'دیکھیں',
    overview: 'ڈیش بورڈ جائزہ', userManagement: 'یوزر مینجمنٹ', activeUsers: 'فعال یوزرز', pendingUsers: 'زیر التواء یوزرز',
    depositRequests: 'جمع کی درخواستیں', withdrawRequests: 'نکاسی کی درخواستیں', transactionHistory: 'لین دین کی تاریخ',
    walletManagement: 'والٹ مینجمنٹ', telegramSettings: 'ٹیلیگرام سیٹنگز', systemSettings: 'سسٹم سیٹنگز', adminProfile: 'ایڈمن پروفائل',
    totalUsers: 'کل یوزرز', totalDeposits: 'کل جمع', totalWithdrawals: 'کل نکاسی', pendingReqs: 'زیر التواء درخواستیں', walletBalanceStats: 'والٹ بیلنس',
    searchUsers: 'یوزرز تلاش کریں', searchPlaceholder: 'یوزر نیم، نام یا فون سے تلاش کریں...',
    suspendUser: 'معطل کریں', activateUser: 'فعال کریں', addBalance: 'بیلنس میں اضافہ', removeBalance: 'بیلنس کم کریں', viewHistory: 'تاریخ دیکھیں',
    suspended: 'معطل', active: 'فعال', adjustBalance: 'بیلنس ایڈجسٹ کریں', enterAmount: 'رقم درج کریں', adminNote: 'ایڈمن نوٹ (اختیاری)',
    testConnection: 'کنکشن ٹیسٹ کریں', testSuccess: 'ٹیسٹ پیغام کامیابی سے بھیجا گیا!', testFailed: 'ٹیسٹ ناکام',
    updateConfig: 'اپ ڈیٹ', saveSettings: 'سیٹنگز محفوظ کریں',
    easypaisaName: 'ایزی پیسہ نام', easypaisaNumber: 'ایزی پیسہ نمبر', jazzcashName: 'جاز کیش نام', jazzcashNumber: 'جاز کیش نمبر',
    bankHolder: 'اکاؤنٹ ہولڈر نام', bankAccountNumber: 'اکاؤنٹ نمبر', paymentAccounts: 'ادائیگی کے اکاؤنٹس',
    userHistory: 'یوزر تاریخ', reports: 'رپورٹس اور شماریات', noUsers: 'کوئی یوزر نہیں', noDeposits: 'کوئی جمع کی درخواست نہیں', noWithdrawals: 'کوئی نکاسی کی درخواست نہیں',
    confirmApprove: 'کیا آپ واقعی اس درخواست کو منظور کرنا چاہتے ہیں؟', confirmReject: 'کیا آپ واقعی اس درخواست کو مسترد کرنا چاہتے ہیں؟',
    amountRs: 'رقم (روپے)', usernameCol: 'یوزر نیم', phoneCol: 'فون', actions: 'اقدامات', balanceCol: 'بیلنس',
    close: 'بند کریں', save: 'محفوظ کریں',
    userMode: 'یوزر', adminMode: 'ایڈمن', loginAs: 'لاگ ان بطور',
    usernameValidation: 'Username must start with letters and end with 4 or 5 digits (e.g. ali1234, ahmed56789).',
    usernameValidationUr: 'یوزر نیم حروف سے شروع ہو اور آخر میں 4 یا 5 نمبرز ہوں (جیسے ali1234، ahmed56789)۔',
    usernameSuggestions: 'یوزر نیم تجاویز',
    usernameSuggestionsDesc: 'ایک تجویز کردہ یوزر نیم منتخب کریں یا اپنا خود درج کریں۔',
    checkingAvailability: 'چیک ہو رہا ہے...',
    usernameAvailable: 'دستیاب',
    usernameTakenLabel: 'پہلے سے موجود',
    usernameTakenChooseSuggestion: 'یہ یوزر نیم پہلے سے موجود ہے۔ براہ کرم نیچے دی گئی تجاویز میں سے ایک منتخب کریں۔',
    usernameAvailableMsg: 'یوزر نیم دستیاب ہے۔',
    useThisUsername: 'استعمال کریں',
    orEnterYourOwn: 'یا اپنا یوزر نیم درج کریں',
    usernameOrPhone: 'یوزر نیم یا فون نمبر',
    usernameOrPhonePlaceholder: 'یوزر نیم یا فون نمبر',
    helpline: 'ہیلپ لائن',
    helplineDesc: 'ایڈمن کو پیغام بھیجیں۔ ہم جلد از جلد جواب دیں گے۔',
    helplinePlaceholder: 'اپنا پیغام لکھیں...',
    helplineSend: 'بھیجیں',
    helplineOnline: 'آن لائن',
    helplineOffline: 'آف لائن',
    helplineAdmin: 'ایڈمن',
    helplineYou: 'آپ',
    helplineNoMessages: 'ابھی کوئی پیغام نہیں۔ گفتگو شروع کریں!',
    helplineLoading: 'پیغامات لوڈ ہو رہے ہیں...',
    helplineError: 'پیغامات لوڈ کرنے میں ناکام۔ دوبارہ کوشش کریں۔',
    adminHelpline: 'ہیلپ لائن',
    adminHelplineDesc: 'یوزر پیغامات دیکھیں اور جواب دیں۔',
    adminHelplineNoConversations: 'ابھی کوئی ہیلپ لائن گفتگو نہیں۔',
    adminHelplineReply: 'جواب دیں',
    adminHelplineReplyPlaceholder: 'اپنا جواب لکھیں...',
    adminHelplineSend: 'جواب بھیجیں',
    announcement: 'اعلان',
    announcementDesc: 'BetPro کی تازہ خبر',
    noAnnouncements: 'کوئی اعلان دستیاب نہیں۔',
    closeAnnouncement: 'مسترد کریں',
    adminAnnouncements: 'اعلانات',
    adminAnnouncementsDesc: 'تمام یوزرز کے لیے visible updates اور اعلانات شائع کریں۔',
    adminAnnouncementTitle: 'عنوان',
    adminAnnouncementBody: 'پیغام',
    adminAnnouncementCreate: 'شائع کریں',
    adminAnnouncementEdit: 'ترمیم',
    adminAnnouncementDelete: 'حذف کریں',
    adminAnnouncementActive: 'فعال',
    adminAnnouncementInactive: 'غیر فعال',
    adminAnnouncementConfirmDelete: 'اس اعلان کو حذف کریں؟ یہ واپس نہیں ہوگا۔',
    adminAnnouncementNew: 'نیا اعلان',
    adminAnnouncementSave: 'محفوظ کریں',
    msgStatusSent: 'بھیجا گیا',
    msgStatusDelivered: 'پہنچا',
    msgStatusSeen: 'دیکھا گیا',
    alertsNav: 'الرٹس',
    alertSettings: 'الارم سیٹنگز',
    alertHistory: 'نوٹیفکیشن ہسٹری',
    newUserRegistered: 'نیا یوزر رجسٹر ہوا۔',
    stopAlarm: 'الارم بند کریں',
    uploadAlarmSound: 'الارم آواز اپ لوڈ کریں',
    alarmSoundHint: 'اپنی ڈیوائس سے MP3 یا WAV فائل منتخب کریں۔',
    currentAlarmSound: 'موجودہ الارم آواز:',
    noAlarmSound: 'ڈیفالٹ بیپ (کوئی اپنی آواز سیٹ نہیں)',
    removeAlarmSound: 'ہٹائیں',
    testAlarm: 'الارم ٹیسٹ کریں',
    noAlerts: 'ابھی کوئی الرٹ نہیں۔',
    dismissAll: 'سب مسترد کریں',
    clearHistory: 'ہسٹری صاف کریں',
    unreadAlerts: 'غیر پڑھے',
    passwordCol: 'پاس ورڈ',
    registeredAt: 'رجسٹریشن وقت',
    dismiss: 'مسترد کریں',
    viewInApprovals: 'منظوریوں میں دیکھیں',
    editUsername: 'یوزر نیم تبدیل کریں',
    editUsernameTitle: 'یوزر نیم تبدیل کریں',
    newUsernameLabel: 'نیا یوزر نیم',
    confirmUsernameChange: 'کیا آپ واقعی اس یوزر نیم کو تبدیل کرنا چاہتے ہیں؟',
    usernameUpdatedSuccess: 'یوزر نیم کامیابی سے تبدیل ہو گیا۔',
    usernameTaken: 'یہ یوزر نیم پہلے سے کسی اور یوزر کے پاس ہے۔',
    changePassword: 'پاس ورڈ تبدیل کریں',
    changePasswordTitle: 'پاس ورڈ تبدیل کریں',
    newPasswordLabel: 'نیا پاس ورڈ',
    confirmPasswordLabel: 'نیا پاس ورڈ تصدیق کریں',
    passwordMismatch: 'پاس ورڈ مماثل نہیں ہیں۔',
    passwordUpdatedSuccess: 'پاس ورڈ کامیابی سے تبدیل ہو گیا۔',
    confirmPasswordChange: 'کیا آپ واقعی اس یوزر کا پاس ورڈ تبدیل کرنا چاہتے ہیں؟',
  },
};
