import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const SUBSCRIPTIONS_FILE = join(DATA_DIR, 'subscriptions.json');
const SCORES_FILE = join(DATA_DIR, 'scores.json');
const PORT = Number(process.env.PORT || 8787);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 60000);
const API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

const LEAGUES = [
  { id: 'fifa.world', label: 'Mundial 2026' },
  { id: 'eng.1', label: 'Premier League' },
  { id: 'esp.1', label: 'La Liga' },
  { id: 'ger.1', label: 'Bundesliga' },
  { id: 'ita.1', label: 'Serie A' },
  { id: 'fra.1', label: 'Ligue 1' },
  { id: 'usa.1', label: 'MLS' },
  { id: 'mex.1', label: 'Liga MX' },
  { id: 'uefa.champions', label: 'Champions' },
];

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await ensureDataDir();
  await writeFile(file, JSON.stringify(value, null, 2));
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

function isExpoPushToken(token) {
  return typeof token === 'string' && (token.startsWith('ExpoPushToken[') || token.startsWith('ExponentPushToken['));
}

function normalizeTeam(value = '') {
  return value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseMatch(event, league) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find((item) => item.homeAway === 'home') || {};
  const away = competitors.find((item) => item.homeAway === 'away') || {};
  const statusType = event.status?.type || {};

  return {
    id: event.id,
    leagueId: league.id,
    leagueLabel: league.label,
    live: statusType.state === 'in',
    completed: Boolean(statusType.completed),
    minute: event.status?.displayClock || statusType.shortDetail || '',
    home: home.team?.displayName || 'Local',
    away: away.team?.displayName || 'Visitante',
    homeScore: Number.parseInt(home.score || '0', 10),
    awayScore: Number.parseInt(away.score || '0', 10),
  };
}

async function fetchLeagueMatches(league) {
  const response = await fetch(`${API_BASE}/${league.id}/scoreboard?lang=es&region=es`);
  if (!response.ok) throw new Error(`ESPN ${league.id}: ${response.status}`);
  const data = await response.json();
  return (data.events || []).map((event) => parseMatch(event, league));
}

function shouldNotify(subscription, match) {
  if (!subscription.alertTypes?.includes('goal')) return false;
  if (subscription.selectedLeague === match.leagueId || subscription.favoriteLeague === match.leagueId) return true;

  const favoriteTeam = normalizeTeam(subscription.favoriteTeam);
  if (!favoriteTeam) return false;

  return normalizeTeam(match.home).includes(favoriteTeam) || normalizeTeam(match.away).includes(favoriteTeam);
}

async function sendExpoPush(messages) {
  if (messages.length === 0) return;

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push failed: ${response.status} ${text}`);
  }
}

async function pollScores() {
  const subscriptions = await readJson(SUBSCRIPTIONS_FILE, {});
  const subscribedUsers = Object.values(subscriptions);
  if (subscribedUsers.length === 0) return { checked: 0, sent: 0 };

  const previousScores = await readJson(SCORES_FILE, {});
  const nextScores = {};
  const messages = [];

  const leagueIds = new Set(
    subscribedUsers.flatMap((subscription) => [subscription.selectedLeague, subscription.favoriteLeague]).filter(Boolean)
  );
  const leaguesToCheck = LEAGUES.filter((league) => leagueIds.has(league.id));

  for (const league of leaguesToCheck) {
    const matches = await fetchLeagueMatches(league);

    matches.forEach((match) => {
      nextScores[match.id] = {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      };

      const previous = previousScores[match.id];
      if (!previous || !match.live) return;

      const goals = [];
      if (match.homeScore > previous.homeScore) goals.push(match.home);
      if (match.awayScore > previous.awayScore) goals.push(match.away);
      if (goals.length === 0) return;

      subscribedUsers.forEach((subscription) => {
        if (!shouldNotify(subscription, match)) return;

        goals.forEach((teamName) => {
          messages.push({
            to: subscription.token,
            sound: 'default',
            title: `Gol de ${teamName}`,
            body: `${match.home} ${match.homeScore} - ${match.awayScore} ${match.away}`,
            data: {
              matchId: match.id,
              leagueId: match.leagueId,
            },
          });
        });
      });
    });
  }

  await writeJson(SCORES_FILE, { ...previousScores, ...nextScores });
  await sendExpoPush(messages);
  return { checked: leaguesToCheck.length, sent: messages.length };
}

async function registerSubscription(payload) {
  if (!isExpoPushToken(payload.token)) {
    return { ok: false, error: 'Invalid Expo push token' };
  }

  const subscriptions = await readJson(SUBSCRIPTIONS_FILE, {});
  subscriptions[payload.token] = {
    token: payload.token,
    favoriteTeam: payload.favoriteTeam || '',
    favoriteLeague: payload.favoriteLeague || 'fifa.world',
    selectedLeague: payload.selectedLeague || payload.favoriteLeague || 'fifa.world',
    alertTypes: Array.isArray(payload.alertTypes) ? payload.alertTypes : ['goal'],
    updatedAt: new Date().toISOString(),
  };
  await writeJson(SUBSCRIPTIONS_FILE, subscriptions);
  return { ok: true };
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, jsonHeaders);
    response.end();
    return;
  }

  try {
    if (request.method === 'GET' && request.url === '/health') {
      const subscriptions = await readJson(SUBSCRIPTIONS_FILE, {});
      response.writeHead(200, jsonHeaders);
      response.end(JSON.stringify({ ok: true, subscriptions: Object.keys(subscriptions).length }));
      return;
    }

    if (request.method === 'POST' && request.url === '/register') {
      const result = await registerSubscription(await readBody(request));
      response.writeHead(result.ok ? 200 : 400, jsonHeaders);
      response.end(JSON.stringify(result));
      return;
    }

    if (request.method === 'POST' && request.url === '/poll') {
      const result = await pollScores();
      response.writeHead(200, jsonHeaders);
      response.end(JSON.stringify({ ok: true, ...result }));
      return;
    }

    response.writeHead(404, jsonHeaders);
    response.end(JSON.stringify({ ok: false, error: 'Not found' }));
  } catch (error) {
    response.writeHead(500, jsonHeaders);
    response.end(JSON.stringify({ ok: false, error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`FutTracker push backend running on port ${PORT}`);
  pollScores().catch((error) => console.error('Initial poll failed:', error));
  setInterval(() => {
    pollScores()
      .then((result) => console.log('Poll complete:', result))
      .catch((error) => console.error('Poll failed:', error));
  }, POLL_INTERVAL_MS);
});
