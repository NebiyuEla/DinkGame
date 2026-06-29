const STORE_KEY = 'dink_local_backend_v3';
const AUTH_KEY = 'dink_current_user_id';
const CHANNEL_NAME = 'dink_backend_events';

const ENTITY_NAMES = [
  'User',
  'AdminUser',
  'Game',
  'Question',
  'GamePlayer',
  'Answer',
  'Setting',
  'Deposit',
  'Broadcast',
  'AntiCheatLog',
  'WalletTransaction',
  'Withdrawal',
  'ChatMessage',
  'GameBan',
];

const nowIso = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));

const safeBtoa = (value) => {
  if (typeof btoa === 'function') return btoa(value);
  return value;
};

const createId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const getChannel = () => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!window.__dinkBackendChannel) {
    window.__dinkBackendChannel = new BroadcastChannel(CHANNEL_NAME);
  }
  return window.__dinkBackendChannel;
};

const getApiBase = () => {
  const env = import.meta.env || {};
  const configured = env.VITE_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  return env.PROD ? '/api' : '';
};

const useRemoteApi = () => typeof fetch === 'function' && Boolean(getApiBase());

const remoteRequest = async (path, options = {}) => {
  const storage = getStorage();
  const userId = storage?.getItem(AUTH_KEY);
  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(userId ? { 'x-dink-user-id': userId } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload;
};

const remoteEntityApi = (entityName) => ({
  list(sort, limit) {
    return remoteRequest(`/entities/${entityName}/list`, {
      method: 'POST',
      body: JSON.stringify({ sort, limit }),
    });
  },

  filter(query = {}, sort, limit) {
    return remoteRequest(`/entities/${entityName}/filter`, {
      method: 'POST',
      body: JSON.stringify({ query, sort, limit }),
    });
  },

  create(data = {}) {
    return remoteRequest(`/entities/${entityName}/create`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  },

  update(id, data = {}) {
    return remoteRequest(`/entities/${entityName}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ data }),
    });
  },

  delete(id) {
    return remoteRequest(`/entities/${entityName}/${id}`, { method: 'DELETE' });
  },
});

const seedState = () => {
  const created = nowIso();
  const gameId = 'game_demo_live';
  const userId = 'user_local_player';

  return {
    User: [
      {
        id: userId,
        full_name: 'Local Player',
        username: 'player',
        email: 'player@dink.local',
        telegram_id: 'local-telegram-user',
        telegram_linked: false,
        telegram_username: '',
        photo_url: '',
        total_winnings: 0,
        wallet_balance: 0,
        games_played: 0,
        best_rank: null,
        is_banned: false,
        is_flagged: false,
        sound_enabled: true,
        last_seen: created,
        created_date: created,
        updated_date: created,
      },
    ],
    AdminUser: [
      {
        id: 'admin_default',
        username: 'admin',
        password_hash: safeBtoa('admin123'),
        role: 'super_admin',
        full_name: 'Dink Admin',
        is_active: true,
        last_login: null,
        created_date: created,
        updated_date: created,
      },
    ],
    Game: [
      {
        id: gameId,
        title: 'Meda Trivia Night',
        description: 'Local demo game. Edit or replace it from Admin.',
        scheduled_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        status: 'lobby',
        prize_amount: 5000,
        platform_fee_percent: 25,
        auto_prize_enabled: true,
        max_players: 10000,
        total_questions: 3,
        question_timer: 15,
        current_question_index: 0,
        explanation_question_index: null,
        explanation_revealed_at: null,
        allow_late_join: false,
        base_points: 100,
        speed_bonus_max: 50,
        total_players: 0,
        winner_user_id: null,
        ended_at: null,
        is_paid: false,
        entry_fee: 0,
        min_answers: 3,
        max_answers: 4,
        created_date: created,
        updated_date: created,
      },
    ],
    Question: [
      {
        id: 'question_demo_1',
        game_id: gameId,
        text: 'Which city is the capital of Ethiopia?',
        image_url: '',
        explanation: 'Addis Ababa is the capital city and the seat of the African Union.',
        options: [
          { label: 'A', text: 'Addis Ababa' },
          { label: 'B', text: 'Hawassa' },
          { label: 'C', text: 'Bahir Dar' },
        ],
        correct_option: 'A',
        category: 'General',
        difficulty: 'easy',
        time_limit: 15,
        order_index: 0,
        is_active: true,
        created_date: created,
        updated_date: created,
      },
      {
        id: 'question_demo_2',
        game_id: gameId,
        text: 'How many answer choices can one Dink question have?',
        image_url: '',
        explanation: 'Each Dink Game question uses three or four answer choices so the game stays fast on mobile.',
        options: [
          { label: 'A', text: 'Two choices' },
          { label: 'B', text: 'Three or four choices' },
          { label: 'C', text: 'Seven choices' },
        ],
        correct_option: 'B',
        category: 'General',
        difficulty: 'medium',
        time_limit: 15,
        order_index: 1,
        is_active: true,
        created_date: created,
        updated_date: created,
      },
      {
        id: 'question_demo_3',
        game_id: gameId,
        text: 'What do winners receive after a game ends?',
        image_url: '',
        explanation: 'The prize pool is split between players who remain eligible at the end, then credited to their wallet.',
        options: [
          { label: 'A', text: 'Wallet money' },
          { label: 'B', text: 'Profile badges only' },
          { label: 'C', text: 'Practice badges' },
        ],
        correct_option: 'A',
        category: 'Wallet',
        difficulty: 'easy',
        time_limit: 15,
        order_index: 2,
        is_active: true,
        created_date: created,
        updated_date: created,
      },
    ],
    GamePlayer: [],
    Answer: [],
    Setting: [],
    Deposit: [],
    Broadcast: [],
    AntiCheatLog: [],
    WalletTransaction: [],
    Withdrawal: [],
    ChatMessage: [
      {
        id: 'chat_seed_1',
        game_id: gameId,
        user_id: 'system',
        username: 'Dink Game',
        message: '\u1328\u12cb\u1273\u12cd \u120a\u1300\u121d\u122d \u1290\u12cd',
        is_system: true,
        created_date: created,
        updated_date: created,
      },
    ],
    GameBan: [],
  };
};

const ensureShape = (state) => {
  const next = state && typeof state === 'object' ? state : {};
  ENTITY_NAMES.forEach((name) => {
    if (!Array.isArray(next[name])) next[name] = [];
  });

  const seeded = seedState();
  if (next.User.length === 0) next.User.push(...seeded.User);
  if (next.AdminUser.length === 0) next.AdminUser.push(...seeded.AdminUser);
  if (next.Game.length === 0) next.Game.push(...seeded.Game);
  if (next.Question.length === 0) next.Question.push(...seeded.Question);
  if (next.ChatMessage.length === 0) next.ChatMessage.push(...seeded.ChatMessage);

  return next;
};

const readState = () => {
  const storage = getStorage();
  if (!storage) return ensureShape(seedState());

  const raw = storage.getItem(STORE_KEY);
  if (!raw) {
    const seeded = seedState();
    storage.setItem(STORE_KEY, JSON.stringify(seeded));
    if (!storage.getItem(AUTH_KEY)) storage.setItem(AUTH_KEY, 'user_local_player');
    return seeded;
  }

  try {
    return ensureShape(JSON.parse(raw));
  } catch {
    const seeded = seedState();
    storage.setItem(STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }
};

const writeState = (state, event = 'change') => {
  const storage = getStorage();
  if (storage) storage.setItem(STORE_KEY, JSON.stringify(ensureShape(state)));

  const channel = getChannel();
  if (channel) {
    channel.postMessage({ event, at: nowIso() });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dink:data-change', { detail: { event } }));
  }
};

const applyDefaults = (entityName, data) => {
  const defaults = {
    Game: {
      status: 'draft',
      prize_amount: 0,
      platform_fee_percent: 25,
      auto_prize_enabled: true,
      max_players: 10000,
      total_questions: 15,
      question_timer: 10,
      current_question_index: 0,
      explanation_question_index: null,
      explanation_revealed_at: null,
      allow_late_join: false,
      base_points: 100,
      speed_bonus_max: 50,
      total_players: 0,
      is_paid: false,
      entry_fee: 0,
      min_answers: 3,
      max_answers: 4,
    },
    Question: {
      image_url: '',
      explanation: '',
      category: '',
      difficulty: 'medium',
      time_limit: 10,
      order_index: 0,
      is_active: true,
    },
    GamePlayer: {
      total_score: 0,
      total_response_time_ms: 0,
      rank: null,
      questions_answered: 0,
      correct_answers: 0,
      is_disqualified: false,
      is_eliminated: false,
      disqualify_reason: '',
      warning_count: 0,
      wallet_credit: 0,
      prize_share: 0,
      joined_at: nowIso(),
      status: 'lobby',
    },
    Answer: {
      is_correct: null,
      points_earned: 0,
      speed_bonus: 0,
      is_scored: false,
      submitted_at: nowIso(),
    },
    AdminUser: {
      role: 'viewer',
      is_active: true,
    },
    Broadcast: {
      target: 'all',
      status: 'sent',
      recipient_count: 0,
      sent_at: nowIso(),
    },
    Deposit: {
      amount: 0,
      status: 'pending',
      provider: 'chapa',
      purpose: 'wallet',
      currency: 'ETB',
    },
    AntiCheatLog: {
      severity: 'low',
      action_taken: '',
    },
    WalletTransaction: {
      amount: 0,
      type: 'credit',
      status: 'posted',
      source: 'manual',
      currency: 'ETB',
    },
    Withdrawal: {
      amount: 0,
      status: 'pending',
      provider: 'telebirr',
      currency: 'ETB',
    },
    ChatMessage: {
      message: '',
      is_system: false,
    },
    GameBan: {
      reason: '',
      is_active: true,
      created_at: nowIso(),
    },
  };

  return { ...(defaults[entityName] || {}), ...data };
};

const matchesQueryValue = (actual, expected) => {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if ('$exists' in expected) {
      const exists = actual !== undefined && actual !== null && actual !== '';
      return expected.$exists ? exists : !exists;
    }
    if ('$in' in expected) return expected.$in.includes(actual);
  }
  return actual === expected;
};

const matchesQuery = (record, query = {}) => (
  Object.entries(query).every(([key, expected]) => matchesQueryValue(record[key], expected))
);

const sortRecords = (records, sort) => {
  if (!sort) return records;
  const descending = String(sort).startsWith('-');
  const field = descending ? String(sort).slice(1) : String(sort);

  return [...records].sort((a, b) => {
    const av = a[field] ?? '';
    const bv = b[field] ?? '';
    if (av < bv) return descending ? 1 : -1;
    if (av > bv) return descending ? -1 : 1;
    return 0;
  });
};

const limitRecords = (records, limit) => {
  if (typeof limit !== 'number') return records;
  return records.slice(0, limit);
};

const calculateGameFinancials = (game, deposits = []) => {
  const paidDeposits = deposits.filter((deposit) => deposit.game_id === game.id && deposit.status === 'paid');
  const gross = paidDeposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);
  const platformFeePercent = Number(game.platform_fee_percent ?? 25);
  const platformProfit = Math.round((gross * platformFeePercent) / 100);
  const autoPool = Math.max(0, gross - platformProfit);
  const manualPool = Number(game.prize_amount || 0);
  const prizePool = Number(game.auto_prize_enabled ?? true) ? (manualPool || autoPool) : manualPool;
  return { gross, platformFeePercent, platformProfit, prizePool, paidCount: paidDeposits.length };
};

const buildChapaReturnUrl = (returnUrl, txRef) => {
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  try {
    const url = new URL(returnUrl || '/deposit', fallbackOrigin);
    url.searchParams.set('tx_ref', txRef);
    url.searchParams.set('demo', '1');
    return url.toString();
  } catch {
    const separator = String(returnUrl || '').includes('?') ? '&' : '?';
    return `${returnUrl || '/deposit'}${separator}tx_ref=${encodeURIComponent(txRef)}&demo=1`;
  }
};

const creditWinnerWallets = (state, game) => {
  const activeWinners = state.GamePlayer.filter((player) => (
    player.game_id === game.id &&
    !player.is_disqualified &&
    !player.is_eliminated &&
    ['playing', 'lobby', 'finished'].includes(player.status || 'playing')
  ));
  const financials = calculateGameFinancials(game, state.Deposit);
  const share = activeWinners.length > 0 ? Math.floor(financials.prizePool / activeWinners.length) : 0;
  const creditedAt = nowIso();

  activeWinners.forEach((player) => {
    if (player.wallet_credit && player.wallet_credit > 0) return;
    player.status = 'winner';
    player.prize_share = share;
    player.wallet_credit = share;
    player.updated_date = creditedAt;

    const user = state.User.find((item) => item.id === player.user_id);
    if (user) {
      user.wallet_balance = Number(user.wallet_balance || 0) + share;
      user.total_winnings = Number(user.total_winnings || 0) + share;
      user.games_played = Number(user.games_played || 0) + 1;
      user.updated_date = creditedAt;
    }

    state.WalletTransaction.push({
      id: createId('wallet'),
      user_id: player.user_id,
      game_id: game.id,
      amount: share,
      type: 'credit',
      status: 'posted',
      source: 'game_prize',
      currency: 'ETB',
      note: `${game.title} winner share`,
      created_date: creditedAt,
      updated_date: creditedAt,
    });
  });

  return { winners: activeWinners, share, financials };
};

const createEntityApi = (entityName) => ({
  async list(sort, limit) {
    if (useRemoteApi()) return remoteEntityApi(entityName).list(sort, limit);
    const state = readState();
    return clone(limitRecords(sortRecords(state[entityName], sort), limit));
  },

  async filter(query = {}, sort, limit) {
    if (useRemoteApi()) return remoteEntityApi(entityName).filter(query, sort, limit);
    const state = readState();
    const filtered = state[entityName].filter((record) => matchesQuery(record, query));
    return clone(limitRecords(sortRecords(filtered, sort), limit));
  },

  async create(data = {}) {
    if (useRemoteApi()) return remoteEntityApi(entityName).create(data);
    const state = readState();
    const created = nowIso();
    const record = {
      ...applyDefaults(entityName, data),
      id: data.id || createId(entityName.toLowerCase()),
      created_date: data.created_date || created,
      updated_date: created,
    };
    if (entityName === 'Question') {
      record.options = (record.options || []).slice(0, 4);
      if (record.options.length < 3 || record.options.length > 4) throw new Error('Questions must have 3 or 4 answers');
    }
    if (entityName === 'Withdrawal' && Number(record.amount || 0) < 100) throw new Error('Minimum Telebirr withdrawal is 100 ETB');
    state[entityName].push(record);
    writeState(state, `${entityName}:create`);
    return clone(record);
  },

  async update(id, patch = {}) {
    if (useRemoteApi()) return remoteEntityApi(entityName).update(id, patch);
    const state = readState();
    const index = state[entityName].findIndex((record) => record.id === id);
    if (index === -1) throw new Error(`${entityName} not found`);

    state[entityName][index] = {
      ...state[entityName][index],
      ...patch,
      id,
      updated_date: nowIso(),
    };
    if (entityName === 'Question') {
      state[entityName][index].options = (state[entityName][index].options || []).slice(0, 4);
      if (state[entityName][index].options.length < 3 || state[entityName][index].options.length > 4) throw new Error('Questions must have 3 or 4 answers');
    }
    if (entityName === 'Game' && state[entityName][index].status === 'ended') {
      creditWinnerWallets(state, state[entityName][index]);
    }
    writeState(state, `${entityName}:update`);
    return clone(state[entityName][index]);
  },

  async delete(id) {
    if (useRemoteApi()) return remoteEntityApi(entityName).delete(id);
    const state = readState();
    state[entityName] = state[entityName].filter((record) => record.id !== id);
    writeState(state, `${entityName}:delete`);
    return { success: true };
  },
});

const entities = ENTITY_NAMES.reduce((api, entityName) => {
  api[entityName] = createEntityApi(entityName);
  return api;
}, {});

const getOrCreateLocalUser = async (profile = {}) => {
  const state = readState();
  const storage = getStorage();
  const hasProfileUpdate = Object.values(profile).some(value => value !== undefined && value !== null && value !== '');
  let userId = storage?.getItem(AUTH_KEY);
  let user = userId ? state.User.find((item) => item.id === userId) : null;
  let shouldWrite = false;

  if (!user) {
    user = {
      id: createId('user'),
      full_name: profile.full_name || profile.email?.split('@')[0] || 'Local Player',
      username: profile.username || profile.email?.split('@')[0] || 'player',
      email: profile.email || 'player@dink.local',
      telegram_id: profile.telegram_id || 'local-telegram-user',
      telegram_linked: Boolean(profile.telegram_id),
      telegram_username: profile.telegram_username || profile.username || '',
      photo_url: profile.photo_url || '',
      total_winnings: 0,
      wallet_balance: 0,
      games_played: 0,
      best_rank: null,
      is_banned: false,
      is_flagged: false,
      sound_enabled: true,
      last_seen: nowIso(),
      created_date: nowIso(),
      updated_date: nowIso(),
    };
    state.User.push(user);
    shouldWrite = true;
  } else if (hasProfileUpdate) {
    Object.assign(user, {
      full_name: profile.full_name || user.full_name,
      username: profile.username || user.username,
      email: profile.email || user.email,
      telegram_id: profile.telegram_id || user.telegram_id,
      telegram_linked: profile.telegram_id ? true : user.telegram_linked,
      telegram_username: profile.telegram_username || user.telegram_username,
      photo_url: profile.photo_url || user.photo_url,
      wallet_balance: Number(user.wallet_balance || 0),
    });
    user.last_seen = nowIso();
    user.updated_date = nowIso();
    shouldWrite = true;
  }

  if (storage) storage.setItem(AUTH_KEY, user.id);
  if (shouldWrite) writeState(state, 'auth:user');
  return clone(user);
};

const auth = {
  async me() {
    if (useRemoteApi()) {
      const user = await remoteRequest('/auth/me');
      getStorage()?.setItem(AUTH_KEY, user.id);
      return user;
    }
    return getOrCreateLocalUser();
  },

  async loginViaEmailPassword(email) {
    if (useRemoteApi()) {
      const user = await remoteRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      getStorage()?.setItem(AUTH_KEY, user.id);
      return user;
    }
    const state = readState();
    const existing = state.User.find((user) => user.email === email);
    const user = existing || await getOrCreateLocalUser({ email, username: email?.split('@')[0] });
    getStorage()?.setItem(AUTH_KEY, user.id);
    return clone(user);
  },

  async register({ email }) {
    if (useRemoteApi()) {
      const user = await remoteRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      getStorage()?.setItem(AUTH_KEY, user.id);
      return user;
    }
    await getOrCreateLocalUser({ email, username: email?.split('@')[0] });
    return { ok: true };
  },

  async verifyOtp({ email }) {
    if (useRemoteApi()) {
      const result = await remoteRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (result.user?.id) getStorage()?.setItem(AUTH_KEY, result.user.id);
      return result;
    }
    const user = await getOrCreateLocalUser({ email, username: email?.split('@')[0] });
    return { access_token: `local-${user.id}` };
  },

  async resendOtp() {
    if (useRemoteApi()) {
      return remoteRequest('/auth/resend-otp', { method: 'POST', body: JSON.stringify({}) });
    }
    return { ok: true };
  },

  async resetPasswordRequest() {
    if (useRemoteApi()) {
      return remoteRequest('/auth/reset-request', { method: 'POST', body: JSON.stringify({}) });
    }
    return { ok: true };
  },

  async resetPassword() {
    if (useRemoteApi()) {
      return remoteRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify({}) });
    }
    return { ok: true };
  },

  setToken(token) {
    if (token) getStorage()?.setItem('dink_local_token', token);
  },

  async logout(redirectTo) {
    getStorage()?.removeItem(AUTH_KEY);
    if (typeof redirectTo === 'string' && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  },

  redirectToLogin(redirectTo = '/') {
    if (typeof window !== 'undefined') {
      window.location.href = `/login?next=${encodeURIComponent(redirectTo)}`;
    }
  },

  loginWithProvider() {
    getOrCreateLocalUser({ full_name: 'Google Player', username: 'google_player' })
      .then(() => {
        if (typeof window !== 'undefined') window.location.href = '/';
      });
  },
};

const payments = {
  async initializeChapa(payload) {
    if (useRemoteApi()) {
      return remoteRequest('/payments/chapa/initialize', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const state = readState();
    const created = nowIso();
    const txRef = payload.tx_ref || `DINK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const deposit = {
      ...applyDefaults('Deposit', {
        user_id: payload.user_id,
        game_id: payload.game_id || '',
        amount: Number(payload.amount || 0),
        phone: payload.phone || '',
        email: payload.email || '',
        status: 'pending',
        provider: 'chapa',
        purpose: payload.purpose || 'wallet',
        chapa_tx_ref: txRef,
        chapa_checkout_url: buildChapaReturnUrl(payload.return_url, txRef),
        demo_checkout: true,
      }),
      id: createId('deposit'),
      created_date: created,
      updated_date: created,
    };
    state.Deposit.push(deposit);
    writeState(state, 'Deposit:create');
    return { deposit: clone(deposit), checkout_url: deposit.chapa_checkout_url };
  },

  async verifyChapa(payload) {
    if (useRemoteApi()) {
      return remoteRequest('/payments/chapa/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const state = readState();
    const deposit = state.Deposit.find((item) => item.chapa_tx_ref === payload.tx_ref || item.id === payload.deposit_id);
    if (!deposit) throw new Error('Deposit not found');
    if (deposit.status !== 'paid') {
      deposit.status = 'paid';
      deposit.verified_at = nowIso();
      deposit.updated_date = nowIso();
      const user = state.User.find((item) => item.id === deposit.user_id);
      if (user && deposit.purpose === 'wallet') {
        user.wallet_balance = Number(user.wallet_balance || 0) + Number(deposit.amount || 0);
        user.updated_date = nowIso();
        state.WalletTransaction.push({
          id: createId('wallet'),
          user_id: deposit.user_id,
          amount: Number(deposit.amount || 0),
          type: 'credit',
          status: 'posted',
          source: 'chapa_deposit',
          currency: 'ETB',
          note: 'Chapa wallet deposit',
          created_date: nowIso(),
          updated_date: nowIso(),
        });
      }
      writeState(state, 'Deposit:paid');
    }
    return { deposit: clone(deposit), paid: true };
  },

  async initializeChapaTransfer(payload) {
    if (useRemoteApi()) {
      return remoteRequest('/payments/chapa/transfer', {
        method: 'POST',
        headers: payload.payout_token ? { 'x-dink-payout-token': payload.payout_token } : {},
        body: JSON.stringify(payload),
      });
    }

    const state = readState();
    const withdrawal = state.Withdrawal.find((item) => item.id === payload.withdrawal_id);
    if (!withdrawal) throw new Error('Withdrawal not found');
    const reference = payload.reference || `DINK-PAYOUT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    withdrawal.chapa_transfer_ref = reference;
    withdrawal.transfer_status = 'demo_queued';
    withdrawal.status = 'processing';
    withdrawal.processed_at = nowIso();
    withdrawal.updated_date = nowIso();
    writeState(state, 'Withdrawal:transfer');
    return { withdrawal: clone(withdrawal), transfer: { reference, status: 'demo_queued' } };
  },

  async verifyChapaTransfer(payload) {
    if (useRemoteApi()) {
      return remoteRequest('/payments/chapa/transfer/verify', {
        method: 'POST',
        headers: payload.payout_token ? { 'x-dink-payout-token': payload.payout_token } : {},
        body: JSON.stringify(payload),
      });
    }

    const state = readState();
    const withdrawal = state.Withdrawal.find((item) => item.id === payload.withdrawal_id || item.chapa_transfer_ref === payload.reference);
    if (!withdrawal) throw new Error('Withdrawal not found');
    withdrawal.transfer_status = withdrawal.transfer_status || 'demo_queued';
    withdrawal.updated_date = nowIso();
    writeState(state, 'Withdrawal:verify-transfer');
    return { withdrawal: clone(withdrawal), transfer: { reference: withdrawal.chapa_transfer_ref, status: withdrawal.transfer_status } };
  },
};

const events = {
  subscribe(callback) {
    const channel = getChannel();
    const onWindowChange = (event) => callback(event.detail);
    const onMessage = (event) => callback(event.data);

    if (channel) channel.addEventListener('message', onMessage);
    if (typeof window !== 'undefined') window.addEventListener('dink:data-change', onWindowChange);

    return () => {
      if (channel) channel.removeEventListener('message', onMessage);
      if (typeof window !== 'undefined') window.removeEventListener('dink:data-change', onWindowChange);
    };
  },
};

export const appClient = {
  entities,
  auth,
  payments,
  events,
  async resetAllData(resetToken = '') {
    if (useRemoteApi()) {
      return remoteRequest('/admin/reset-data', {
        method: 'POST',
        headers: resetToken ? { 'x-dink-reset-token': resetToken } : {},
        body: JSON.stringify({}),
      });
    }
    const seeded = seedState();
    writeState(seeded, 'reset');
    getStorage()?.setItem(AUTH_KEY, 'user_local_player');
    return seeded;
  },
  resetLocalData() {
    const seeded = seedState();
    writeState(seeded, 'reset');
    getStorage()?.setItem(AUTH_KEY, 'user_local_player');
    return seeded;
  },
};
