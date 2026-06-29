import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

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
const safeBtoa = (value) => Buffer.from(value, 'utf8').toString('base64');
const createId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
const DATA_CLEAR_VERSION = '2026-06-29-clear-all-data';

const seedState = () => {
  const created = nowIso();

  return {
    __clear_version: DATA_CLEAR_VERSION,
    User: [],
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
    Game: [],
    Question: [],
    GamePlayer: [],
    Answer: [],
    Setting: [],
    Deposit: [],
    Broadcast: [],
    AntiCheatLog: [],
    WalletTransaction: [],
    Withdrawal: [],
    ChatMessage: [],
    GameBan: [],
  };
};

const ensureShape = (state) => {
  const next = state && typeof state === 'object' ? state : {};
  const seeded = seedState();
  ENTITY_NAMES.forEach((name) => {
    if (!Array.isArray(next[name])) next[name] = [];
    if (next[name].length === 0 && name === 'AdminUser') {
      next[name].push(...seeded[name]);
    }
  });
  next.__clear_version = DATA_CLEAR_VERSION;
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
    const stored = JSON.parse(await readFile(DATA_FILE, 'utf8'));
    if (stored?.__clear_version !== DATA_CLEAR_VERSION) {
      const seeded = seedState();
      await writeFile(DATA_FILE, JSON.stringify(seeded, null, 2));
      return seeded;
    }
    return ensureShape(stored);
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
    Question: { image_url: '', explanation: '', category: '', difficulty: 'medium', time_limit: 10, order_index: 0, is_active: true },
    GamePlayer: { total_score: 0, total_response_time_ms: 0, rank: null, questions_answered: 0, correct_answers: 0, is_disqualified: false, is_eliminated: false, disqualify_reason: '', warning_count: 0, wallet_credit: 0, prize_share: 0, joined_at: nowIso(), status: 'lobby' },
    Answer: { is_correct: null, points_earned: 0, speed_bonus: 0, is_scored: false, submitted_at: nowIso() },
    AdminUser: { role: 'viewer', is_active: true },
    Broadcast: { target: 'all', status: 'sent', recipient_count: 0, sent_at: nowIso() },
    Deposit: { amount: 0, status: 'pending', provider: 'chapa', purpose: 'wallet', currency: 'ETB' },
    AntiCheatLog: { severity: 'low', action_taken: '' },
    WalletTransaction: { amount: 0, type: 'credit', status: 'posted', source: 'manual', currency: 'ETB' },
    Withdrawal: { amount: 0, status: 'pending', provider: 'telebirr', currency: 'ETB' },
    ChatMessage: { message: '', is_system: false },
    GameBan: { reason: '', is_active: true, created_at: nowIso() },
  };
  return { ...(defaults[entityName] || {}), ...data };
};

const calculateGameFinancials = (game, deposits = []) => {
  const paidDeposits = deposits.filter((deposit) => deposit.game_id === game.id && deposit.status === 'paid');
  const gross = paidDeposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);
  const platformFeePercent = Number(game.platform_fee_percent ?? 25);
  const platformProfit = Math.round(gross * platformFeePercent / 100);
  const autoPool = Math.max(0, gross - platformProfit);
  const manualPool = Number(game.prize_amount || 0);
  const prizePool = Number(game.auto_prize_enabled ?? true) ? (manualPool || autoPool) : manualPool;

  return {
    gross,
    platformFeePercent,
    platformProfit,
    prizePool,
    paidCount: paidDeposits.length,
  };
};

const buildChapaReturnUrl = (returnUrl, txRef, demo = false) => {
  try {
    const url = new URL(returnUrl || '/deposit', 'http://localhost');
    url.searchParams.set('tx_ref', txRef);
    if (demo) url.searchParams.set('demo', '1');
    return url.toString();
  } catch {
    const separator = String(returnUrl || '').includes('?') ? '&' : '?';
    return `${returnUrl || '/deposit'}${separator}tx_ref=${encodeURIComponent(txRef)}${demo ? '&demo=1' : ''}`;
  }
};

const creditWinnerWallets = async (state, game) => {
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

const readTextBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,x-dink-user-id,x-dink-reset-token,x-dink-payout-token',
  });
  res.end(JSON.stringify(data));
};

const sendError = (res, statusCode, message) => sendJson(res, statusCode, { error: message });

const requirePayoutToken = (req, res) => {
  const payoutToken = process.env.DINK_ADMIN_PAYOUT_TOKEN || process.env.DINK_ADMIN_RESET_TOKEN;
  if (process.env.NODE_ENV === 'production' || payoutToken) {
    if (!payoutToken) {
      sendError(res, 403, 'Set DINK_ADMIN_PAYOUT_TOKEN before enabling remote payouts.');
      return false;
    }
    if (req.headers['x-dink-payout-token'] !== payoutToken) {
      sendError(res, 403, 'Invalid payout token.');
      return false;
    }
  }
  return true;
};

const getOrCreateUser = async (profile = {}, userId) => {
  const state = await readState();
  let user = userId ? state.User.find((item) => item.id === userId) : null;

  if (!user && profile.email) user = state.User.find((item) => item.email === profile.email);

  if (!user) {
    user = {
      id: createId('user'),
      full_name: profile.full_name || profile.email?.split('@')[0] || 'Dink user',
      username: profile.username || profile.email?.split('@')[0] || 'player',
      email: profile.email || `${createId('player')}@dink.local`,
      telegram_id: profile.telegram_id || '',
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
  } else {
    Object.assign(user, {
      full_name: profile.full_name || user.full_name,
      username: profile.username || user.username,
      email: profile.email || user.email,
      telegram_id: profile.telegram_id || user.telegram_id,
      telegram_linked: profile.telegram_id ? true : user.telegram_linked,
      telegram_username: profile.telegram_username || user.telegram_username,
      photo_url: profile.photo_url || user.photo_url,
    });
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
    if (entityName === 'Question') {
      record.options = (record.options || []).slice(0, 4);
      if (record.options.length < 3 || record.options.length > 4) return sendError(res, 400, 'Questions must have 3 or 4 answers');
    }
    if (entityName === 'Withdrawal' && Number(record.amount || 0) < 100) return sendError(res, 400, 'Minimum Telebirr withdrawal is 100 ETB');
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
    if (entityName === 'Question') {
      state[entityName][index].options = (state[entityName][index].options || []).slice(0, 4);
      if (state[entityName][index].options.length < 3 || state[entityName][index].options.length > 4) return sendError(res, 400, 'Questions must have 3 or 4 answers');
    }
    if (entityName === 'Game' && state[entityName][index].status === 'ended') {
      await creditWinnerWallets(state, state[entityName][index]);
    }
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

const handlePaymentApi = async (req, res, pathname) => {
  if (req.method === 'POST' && pathname === '/api/payments/chapa/initialize') {
    const body = await readJsonBody(req);
    const state = await readState();
    const created = nowIso();
    const amount = Number(body.amount || 0);
    if (amount <= 0) return sendError(res, 400, 'Amount must be greater than 0');

    const txRef = body.tx_ref || `DINK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const deposit = {
      ...applyDefaults('Deposit', {
        user_id: body.user_id,
        game_id: body.game_id || '',
        amount,
        phone: body.phone || '',
        email: body.email || '',
        status: 'pending',
        provider: 'chapa',
        purpose: body.purpose || 'wallet',
        chapa_tx_ref: txRef,
      }),
      id: createId('deposit'),
      created_date: created,
      updated_date: created,
    };

    const returnUrlWithTx = buildChapaReturnUrl(body.return_url, txRef);
    let checkoutUrl = buildChapaReturnUrl(body.return_url, txRef, true);
    if (process.env.CHAPA_SECRET_KEY) {
      const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          amount: String(amount),
          currency: 'ETB',
          email: body.email || `${body.user_id || 'player'}@dinkgame.et`,
          first_name: body.first_name || 'Dink',
          last_name: body.last_name || 'User',
          phone_number: body.phone || '',
          tx_ref: txRef,
          callback_url: body.callback_url,
          return_url: returnUrlWithTx,
          customization: { title: 'Dink Game Wallet', description: 'Wallet deposit for Dink Game' },
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.status !== 'success') return sendError(res, 502, payload.message || 'Chapa initialization failed');
      checkoutUrl = payload.data?.checkout_url || checkoutUrl;
      deposit.chapa_checkout_url = checkoutUrl;
    } else {
      deposit.chapa_checkout_url = checkoutUrl;
      deposit.demo_checkout = true;
    }

    state.Deposit.push(deposit);
    await writeState(state);
    return sendJson(res, 201, { deposit, checkout_url: checkoutUrl });
  }

  if (req.method === 'POST' && pathname === '/api/payments/chapa/verify') {
    const body = await readJsonBody(req);
    const txRef = body.tx_ref;
    if (!txRef) return sendError(res, 400, 'tx_ref is required');
    const state = await readState();
    const deposit = state.Deposit.find((item) => item.chapa_tx_ref === txRef || item.id === body.deposit_id);
    if (!deposit) return sendError(res, 404, 'Deposit not found');

    let paid = !process.env.CHAPA_SECRET_KEY && body.demo_paid !== false;
    if (process.env.CHAPA_SECRET_KEY) {
      const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`, {
        headers: { authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
      });
      const payload = await response.json();
      paid = response.ok && payload.status === 'success' && payload.data?.status === 'success';
    }

    if (paid && deposit.status !== 'paid') {
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
      await writeState(state);
    }

    return sendJson(res, 200, { deposit: clone(deposit), paid });
  }

  if (req.method === 'POST' && pathname === '/api/payments/chapa/transfer') {
    if (!requirePayoutToken(req, res)) return undefined;
    const body = await readJsonBody(req);
    const state = await readState();
    const withdrawal = state.Withdrawal.find((item) => item.id === body.withdrawal_id);
    if (!withdrawal) return sendError(res, 404, 'Withdrawal not found');
    if (Number(withdrawal.amount || 0) < 100) return sendError(res, 400, 'Minimum Telebirr withdrawal is 100 ETB');

    const user = state.User.find((item) => item.id === withdrawal.user_id);
    const reference = body.reference || withdrawal.chapa_transfer_ref || `DINK-PAYOUT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let transfer = { reference, status: 'demo_queued' };

    if (process.env.CHAPA_SECRET_KEY) {
      const response = await fetch('https://api.chapa.co/v1/transfers', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          account_name: body.account_name || user?.full_name || withdrawal.phone || 'Dink Game winner',
          account_number: body.account_number || withdrawal.phone,
          amount: String(Number(withdrawal.amount || 0)),
          currency: 'ETB',
          reference,
          bank_code: body.bank_code || process.env.CHAPA_TRANSFER_BANK_CODE || 'telebirr',
        }),
      });
      const payload = await response.json();
      if (!response.ok || payload.status !== 'success') return sendError(res, 502, payload.message || 'Chapa transfer failed');
      transfer = payload.data || { reference, status: payload.status };
    }

    withdrawal.chapa_transfer_ref = reference;
    withdrawal.transfer_status = transfer.status || 'processing';
    withdrawal.status = ['success', 'paid'].includes(String(transfer.status).toLowerCase()) ? 'paid' : 'processing';
    withdrawal.processed_at = nowIso();
    withdrawal.updated_date = nowIso();
    await writeState(state);
    return sendJson(res, 200, { withdrawal: clone(withdrawal), transfer });
  }

  if (req.method === 'POST' && pathname === '/api/payments/chapa/transfer/verify') {
    if (!requirePayoutToken(req, res)) return undefined;
    const body = await readJsonBody(req);
    const state = await readState();
    const withdrawal = state.Withdrawal.find((item) => item.id === body.withdrawal_id || item.chapa_transfer_ref === body.reference);
    if (!withdrawal) return sendError(res, 404, 'Withdrawal not found');
    const reference = body.reference || withdrawal.chapa_transfer_ref;
    let transfer = { reference, status: withdrawal.transfer_status || 'processing' };

    if (process.env.CHAPA_SECRET_KEY && reference) {
      const response = await fetch(`https://api.chapa.co/v1/transfers/verify/${encodeURIComponent(reference)}`, {
        headers: { authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
      });
      const payload = await response.json();
      if (response.ok && payload.status === 'success') transfer = payload.data || { reference, status: payload.status };
    }

    const statusText = String(transfer.status || '').toLowerCase();
    withdrawal.transfer_status = transfer.status || withdrawal.transfer_status || 'processing';
    if (['success', 'paid'].includes(statusText)) withdrawal.status = 'paid';
    withdrawal.updated_date = nowIso();
    await writeState(state);
    return sendJson(res, 200, { withdrawal: clone(withdrawal), transfer });
  }

  if (req.method === 'POST' && pathname === '/api/payments/chapa/webhook') {
    const raw = await readTextBody(req);
    if (process.env.CHAPA_WEBHOOK_SECRET) {
      const signature = req.headers['x-chapa-signature'] || req.headers['chapa-signature'];
      const digest = crypto.createHmac('sha256', process.env.CHAPA_WEBHOOK_SECRET).update(raw).digest('hex');
      if (signature !== digest) return sendError(res, 401, 'Invalid webhook signature');
    }
    const payload = raw ? JSON.parse(raw) : {};
    const txRef = payload.tx_ref || payload.trx_ref || payload.data?.tx_ref;
    if (!txRef) return sendJson(res, 200, { ok: true });
    const state = await readState();
    const deposit = state.Deposit.find((item) => item.chapa_tx_ref === txRef);
    if (deposit && deposit.status !== 'paid') {
      deposit.status = 'paid';
      deposit.verified_at = nowIso();
      deposit.updated_date = nowIso();
      const user = state.User.find((item) => item.id === deposit.user_id);
      if (user && deposit.purpose === 'wallet') {
        user.wallet_balance = Number(user.wallet_balance || 0) + Number(deposit.amount || 0);
        user.updated_date = nowIso();
      }
      await writeState(state);
    }
    return sendJson(res, 200, { ok: true });
  }

  return sendError(res, 404, 'Unknown payment endpoint');
};

const handleAdminApi = async (req, res, pathname) => {
  if (req.method === 'POST' && pathname === '/api/admin/reset-data') {
    const resetToken = process.env.DINK_ADMIN_RESET_TOKEN;
    if (process.env.NODE_ENV === 'production' || resetToken) {
      if (!resetToken) return sendError(res, 403, 'Set DINK_ADMIN_RESET_TOKEN before enabling remote reset.');
      if (req.headers['x-dink-reset-token'] !== resetToken) return sendError(res, 403, 'Invalid reset token.');
    }
    const seeded = seedState();
    await writeState(seeded);
    return sendJson(res, 200, { ok: true });
  }

  return sendError(res, 404, 'Unknown admin endpoint');
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
    if (pathname.startsWith('/api/payments/')) return await handlePaymentApi(req, res, pathname);
    if (pathname.startsWith('/api/admin/')) return await handleAdminApi(req, res, pathname);
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
