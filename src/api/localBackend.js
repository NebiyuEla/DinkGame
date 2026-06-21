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
  'PrizeClaim',
  'Jackpot',
  'Deposit',
  'Broadcast',
  'AntiCheatLog',
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
        total_winnings: 0,
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
        jackpot_amount: 1500,
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
          { label: 'D', text: 'Dire Dawa' },
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
        text: 'How many players stay eligible after a wrong answer?',
        image_url: '',
        explanation: 'In this format, one wrong answer knocks the player out. They can still watch.',
        options: [
          { label: 'A', text: 'All players' },
          { label: 'B', text: 'Only correct players' },
          { label: 'C', text: 'Only late joiners' },
          { label: 'D', text: 'Nobody' },
        ],
        correct_option: 'B',
        category: 'Rules',
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
        text: 'When should players see the correct answer?',
        image_url: '',
        explanation: 'Players see the result only after the admin reveals the explanation.',
        options: [
          { label: 'A', text: 'Immediately after tapping' },
          { label: 'B', text: 'After admin reveal' },
          { label: 'C', text: 'After leaving the app' },
          { label: 'D', text: 'Never' },
        ],
        correct_option: 'B',
        category: 'Rules',
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
    PrizeClaim: [],
    Jackpot: [
      {
        id: 'jackpot_default',
        game_id: gameId,
        amount: 1500,
        is_active: true,
        winner_user_id: null,
        won_at: null,
        label: 'Weekly Jackpot',
        created_date: created,
        updated_date: created,
      },
    ],
    Deposit: [],
    Broadcast: [],
    AntiCheatLog: [],
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
  if (next.Jackpot.length === 0) next.Jackpot.push(...seeded.Jackpot);

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
      jackpot_amount: 0,
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
    Jackpot: {
      amount: 0,
      is_active: true,
      label: 'Weekly Jackpot',
    },
    Broadcast: {
      target: 'all',
      status: 'sent',
      recipient_count: 0,
      sent_at: nowIso(),
    },
    PrizeClaim: {
      status: 'pending',
    },
    Deposit: {
      amount: 0,
      status: 'pending',
    },
    AntiCheatLog: {
      severity: 'low',
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
  let userId = storage?.getItem(AUTH_KEY);
  let user = userId ? state.User.find((item) => item.id === userId) : null;

  if (!user) {
    user = {
      id: createId('user'),
      full_name: profile.full_name || profile.email?.split('@')[0] || 'Local Player',
      username: profile.username || profile.email?.split('@')[0] || 'player',
      email: profile.email || 'player@dink.local',
      telegram_id: 'local-telegram-user',
      total_winnings: 0,
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
  } else {
    user.last_seen = nowIso();
    user.updated_date = nowIso();
  }

  if (storage) storage.setItem(AUTH_KEY, user.id);
  writeState(state, 'auth:user');
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
  events,
  resetLocalData() {
    const seeded = seedState();
    writeState(seeded, 'reset');
    getStorage()?.setItem(AUTH_KEY, 'user_local_player');
    return seeded;
  },
};
