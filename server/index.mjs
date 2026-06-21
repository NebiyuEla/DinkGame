import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const DATA_FILE = process.env.DINK_DATA_FILE || path.join(ROOT, 'data', 'dink-data.json');
const PORT = Number(process.env.PORT || 3000);

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
const safeBtoa = (value) => Buffer.from(value, 'utf8').toString('base64');
const createId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

const seedState = () => {
  const created = nowIso();
  const gameId = 'game_demo_live';
  const userId = 'user_local_player';

  return {
    User: [{
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
    }],
    AdminUser: [{
      id: 'admin_default',
      username: 'admin',
      password_hash: safeBtoa('admin123'),
      role: 'super_admin',
      full_name: 'Dink Admin',
      is_active: true,
      last_login: null,
      created_date: created,
      updated_date: created,
    }],
    Game: [{
      id: gameId,
      title: 'Meda Trivia Night',
      description: 'Demo game. Edit or replace it from Admin.',
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
    }],
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
    Jackpot: [{
      id: 'jackpot_default',
      game_id: gameId,
      amount: 1500,
      is_active: true,
      winner_user_id: null,
      won_at: null,
      label: 'Weekly Jackpot',
      created_date: created,
      updated_date: created,
    }],
    Deposit: [],
    Broadcast: [],
    AntiCheatLog: [],
  };
};

const ensureShape = (state) => {
  const next = state && typeof state === 'object' ? state : {};
  const seeded = seedState();
  ENTITY_NAMES.forEach((name) => {
    if (!Array.isArray(next[name])) next[name] = [];
    if (next[name].length === 0 && ['User', 'AdminUser', 'Game', 'Question', 'Jackpot'].includes(name)) {
      next[name].push(...seeded[name]);
    }
  });
  return next;
};

const ensureDataFile = async () => {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify(seedState(), null, 2));
  }
};

const readState = async () => {
  await ensureDataFile();
  try {
    return ensureShape(JSON.parse(await readFile(DATA_FILE, 'utf8')));
  } catch {
    const seeded = seedState();
    await writeFile(DATA_FILE, JSON.stringify(seeded, null, 2));
    return seeded;
  }
};

const writeState = async (state) => {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(ensureShape(state), null, 2));
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
    Question: { image_url: '', explanation: '', category: '', difficulty: 'medium', time_limit: 10, order_index: 0, is_active: true },
    GamePlayer: { total_score: 0, total_response_time_ms: 0, rank: null, questions_answered: 0, correct_answers: 0, is_disqualified: false, is_eliminated: false, disqualify_reason: '', joined_at: nowIso(), status: 'lobby' },
    Answer: { is_correct: null, points_earned: 0, speed_bonus: 0, is_scored: false, submitted_at: nowIso() },
    AdminUser: { role: 'viewer', is_active: true },
    Jackpot: { amount: 0, is_active: true, label: 'Weekly Jackpot' },
    Broadcast: { target: 'all', status: 'sent', recipient_count: 0, sent_at: nowIso() },
    PrizeClaim: { status: 'pending' },
    Deposit: { amount: 0, status: 'pending' },
    AntiCheatLog: { severity: 'low' },
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

const limitRecords = (records, limit) => (typeof limit === 'number' ? records.slice(0, limit) : records);

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,x-dink-user-id',
  });
  res.end(JSON.stringify(data));
};

const sendError = (res, statusCode, message) => sendJson(res, statusCode, { error: message });

const getOrCreateUser = async (profile = {}, userId) => {
  const state = await readState();
  let user = userId ? state.User.find((item) => item.id === userId) : null;

  if (!user && profile.email) user = state.User.find((item) => item.email === profile.email);

  if (!user) {
    user = {
      id: createId('user'),
      full_name: profile.full_name || profile.email?.split('@')[0] || 'Player',
      username: profile.username || profile.email?.split('@')[0] || 'player',
      email: profile.email || `${createId('player')}@dink.local`,
      telegram_id: profile.telegram_id || '',
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

  await writeState(state);
  return clone(user);
};

const handleEntityApi = async (req, res, pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  const entityName = parts[2];
  const actionOrId = parts[3];
  const id = parts[4] || actionOrId;

  if (!ENTITY_NAMES.includes(entityName)) return sendError(res, 404, 'Unknown entity');
  const state = await readState();

  if (req.method === 'POST' && actionOrId === 'list') {
    const { sort, limit } = await readJsonBody(req);
    return sendJson(res, 200, clone(limitRecords(sortRecords(state[entityName], sort), limit)));
  }

  if (req.method === 'POST' && actionOrId === 'filter') {
    const { query, criteria, sort, limit } = await readJsonBody(req);
    const filterQuery = query || criteria || {};
    const filtered = state[entityName].filter((record) => matchesQuery(record, filterQuery));
    return sendJson(res, 200, clone(limitRecords(sortRecords(filtered, sort), limit)));
  }

  if (req.method === 'POST' && actionOrId === 'create') {
    const body = await readJsonBody(req);
    const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : body;
    const created = nowIso();
    const record = {
      ...applyDefaults(entityName, data),
      id: data.id || createId(entityName.toLowerCase()),
      created_date: data.created_date || created,
      updated_date: created,
    };
    state[entityName].push(record);
    await writeState(state);
    return sendJson(res, 201, clone(record));
  }

  if (req.method === 'PATCH' && id) {
    const body = await readJsonBody(req);
    const data = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : body;
    const index = state[entityName].findIndex((record) => record.id === id);
    if (index === -1) return sendError(res, 404, `${entityName} not found`);
    state[entityName][index] = { ...state[entityName][index], ...data, id, updated_date: nowIso() };
    await writeState(state);
    return sendJson(res, 200, clone(state[entityName][index]));
  }

  if (req.method === 'DELETE' && id) {
    state[entityName] = state[entityName].filter((record) => record.id !== id);
    await writeState(state);
    return sendJson(res, 200, { success: true });
  }

  return sendError(res, 405, 'Unsupported entity operation');
};

const handleAuthApi = async (req, res, pathname) => {
  const userId = req.headers['x-dink-user-id'];

  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const user = await getOrCreateUser({}, userId);
    return sendJson(res, 200, user);
  }

  if (req.method === 'POST' && ['/api/auth/login', '/api/auth/register', '/api/auth/verify-otp'].includes(pathname)) {
    const body = await readJsonBody(req);
    const user = await getOrCreateUser({ email: body.email, username: body.email?.split('@')[0] }, userId);
    if (pathname === '/api/auth/verify-otp') return sendJson(res, 200, { access_token: `server-${user.id}`, user });
    return sendJson(res, 200, user);
  }

  if (req.method === 'POST' && ['/api/auth/resend-otp', '/api/auth/reset-request', '/api/auth/reset-password'].includes(pathname)) {
    return sendJson(res, 200, { ok: true });
  }

  return sendError(res, 404, 'Unknown auth endpoint');
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const serveStatic = async (req, res, pathname) => {
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath === '/' ? 'index.html' : safePath);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'content-type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    sendError(res, 404, 'Build output not found. Run npm run build first.');
  }
};

createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/api/health') return sendJson(res, 200, { ok: true });
    if (pathname.startsWith('/api/entities/')) return await handleEntityApi(req, res, pathname);
    if (pathname.startsWith('/api/auth/')) return await handleAuthApi(req, res, pathname);
    return await serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    sendError(res, 500, error.message || 'Server error');
  }
}).listen(PORT, () => {
  console.log(`Dink Game server listening on port ${PORT}`);
});
