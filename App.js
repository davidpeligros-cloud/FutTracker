import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  NativeAdSlot,
  getSubscriptionStatus,
  initializeMonetization,
  purchasePremiumPlan,
  restorePremiumPurchases,
  showInterstitialAd,
  showRewardedAd,
} from './services/monetization';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const COLORS = {
  bg: '#05070c',
  surface: '#0b1019',
  card: '#111722ee',
  cardElevated: '#182131',
  cardBorder: '#2a3448',
  accent: '#34d399',
  accentDim: '#07352d',
  accentGlow: '#34d39955',
  red: '#ff375f',
  gold: '#ffd60a',
  blue: '#0a84ff',
  text: '#f5f7fb',
  muted: '#8e9bb1',
  live: '#ff375f',
};

const LEAGUES = [
  { id: 'fifa.world', label: 'Mundial 2026', icon: '🏆' },
  { id: 'eng.1', label: 'Premier League', icon: '🏴' },
  { id: 'esp.1', label: 'La Liga', icon: '🇪🇸' },
  { id: 'ger.1', label: 'Bundesliga', icon: '🇩🇪' },
  { id: 'ita.1', label: 'Serie A', icon: '🇮🇹' },
  { id: 'fra.1', label: 'Ligue 1', icon: '🇫🇷' },
  { id: 'usa.1', label: 'MLS', icon: '🇺🇸' },
  { id: 'mex.1', label: 'Liga MX', icon: '🇲🇽' },
  { id: 'uefa.champions', label: 'Champions', icon: '⭐' },
];

const API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const STORAGE_KEY = 'futbol_live_state_v3';
const DEFAULT_FREE_LIMITS = {
  notifications: 3,
};
const INTERSTITIAL_COOLDOWN_MS = 45000;
const AD_BREAK_INTERVAL = 3;
const LIVE_REFRESH_MS = 60000;
const PUSH_BACKEND_URL = process.env.EXPO_PUBLIC_PUSH_BACKEND_URL || '';
const EAS_PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
const PREMIUM_PLANS = [
  { id: 'lifetime', label: 'Pago único', price: '5,99', accent: 'Sin suscripción', description: 'Desbloquea Premium para siempre con un único pago.' },
];
const ALERT_TYPES = [
  { id: 'goal', label: 'Gol', priority: 'high' },
  { id: 'penalty', label: 'Penalti', priority: 'high' },
  { id: 'red', label: 'Roja', priority: 'high' },
  { id: 'start', label: 'Inicio', priority: 'high' },
  { id: 'half', label: 'Descanso', priority: 'high' },
  { id: 'final', label: 'Final', priority: 'high' },
  { id: 'injury', label: 'Lesión', priority: 'medium' },
  { id: 'transfer', label: 'Fichaje', priority: 'medium' },
  { id: 'callup', label: 'Convocatoria', priority: 'medium' },
  { id: 'streak', label: 'Racha', priority: 'low' },
  { id: 'summary', label: 'Resumen', priority: 'low' },
  { id: 'debate', label: 'Debate', priority: 'low' },
];
const DEFAULT_PROFILE = {
  onboardingDone: false,
  favoriteTeam: 'Real Madrid',
  favoriteLeague: 'fifa.world',
  favoriteSelection: 'España',
  favoritePlayer: 'Vinícius Jr.',
  alertTypes: ['goal', 'red', 'start', 'final'],
  preferredHour: 'evening',
  detailLevel: 'premium',
};
const DEFAULT_ENTITLEMENTS = {
  premiumPlan: null,
  coins: 120,
  xp: 240,
  adRewardsClaimed: 0,
  hasSeenPaywall: false,
  notificationsEnabled: true,
};

const normalizeSavedProfile = (savedProfile = {}) => ({
  ...DEFAULT_PROFILE,
  ...savedProfile,
  favoriteSelection: {
    Spain: 'España',
    Brazil: 'Brasil',
    France: 'Francia',
    England: 'Inglaterra',
    Germany: 'Alemania',
    Mexico: 'México',
  }[savedProfile.favoriteSelection] || savedProfile.favoriteSelection || DEFAULT_PROFILE.favoriteSelection,
  favoritePlayer: savedProfile.favoritePlayer === 'Vinicius Jr.' ? 'Vinícius Jr.' : savedProfile.favoritePlayer || DEFAULT_PROFILE.favoritePlayer,
});

const normalizeSavedEntitlements = (savedEntitlements = {}) => ({
  ...DEFAULT_ENTITLEMENTS,
  ...savedEntitlements,
  coins: savedEntitlements.coins ?? savedEntitlements.monedas ?? DEFAULT_ENTITLEMENTS.coins,
});

const TEAM_FOCUS = [
  'Real Madrid',
  'Barcelona',
  'Liverpool',
  'Manchester City',
  'Arsenal',
  'Chelsea',
  'Bayern Munich',
  'PSG',
  'Inter',
  'Juventus',
];
const SELECTION_OPTIONS = ['España', 'Brasil', 'Argentina', 'Francia', 'Inglaterra', 'Portugal', 'Alemania', 'México'];

const TEAM_VISUALS = {
  arsenal: { flag: '🏴', primary: '#ef0107', secondary: '#ffffff' },
  barcelona: { flag: '🇪🇸', primary: '#a50044', secondary: '#004d98' },
  'bayern munich': { flag: '🇩🇪', primary: '#dc052d', secondary: '#0066b2' },
  'borussia dortmund': { flag: '🇩🇪', primary: '#fde100', secondary: '#000000' },
  chelsea: { flag: '🏴', primary: '#034694', secondary: '#ffffff' },
  france: { flag: '🇫🇷', primary: '#002395', secondary: '#ed2939' },
  germany: { flag: '🇩🇪', primary: '#000000', secondary: '#dd0000' },
  inter: { flag: '🇮🇹', primary: '#0068a8', secondary: '#000000' },
  italy: { flag: '🇮🇹', primary: '#0066cc', secondary: '#ffffff' },
  juventus: { flag: '🇮🇹', primary: '#000000', secondary: '#ffffff' },
  liverpool: { flag: '🏴', primary: '#c8102e', secondary: '#00b2a9' },
  'manchester city': { flag: '🏴', primary: '#6cabdd', secondary: '#1c2c5b' },
  'manchester united': { flag: '🏴', primary: '#da291c', secondary: '#fbe122' },
  mexico: { flag: '🇲🇽', primary: '#006847', secondary: '#ce1126' },
  psg: { flag: '🇫🇷', primary: '#004170', secondary: '#da291c' },
  'paris saint-germain': { flag: '🇫🇷', primary: '#004170', secondary: '#da291c' },
  portugal: { flag: '🇵🇹', primary: '#006600', secondary: '#ff0000' },
  'real madrid': { flag: '🇪🇸', primary: '#febd11', secondary: '#ffffff' },
  spain: { flag: '🇪🇸', primary: '#aa151b', secondary: '#f1bf00' },
  england: { flag: '🏴', primary: '#ffffff', secondary: '#cf142b' },
  'south africa': { flag: '🇿🇦', primary: '#007a4d', secondary: '#ffb612' },
  'corea del sur': { flag: '🇰🇷', primary: '#c60c30', secondary: '#003478' },
  'south korea': { flag: '🇰🇷', primary: '#c60c30', secondary: '#003478' },
  chequia: { flag: '🇨🇿', primary: '#11457e', secondary: '#d7141a' },
  czechia: { flag: '🇨🇿', primary: '#11457e', secondary: '#d7141a' },
  usa: { flag: '🇺🇸', primary: '#3c3b6e', secondary: '#b22234' },
  'united states': { flag: '🇺🇸', primary: '#3c3b6e', secondary: '#b22234' },
};

const FALLBACK_PLAYERS = [
  { id: 1, name: 'Vinícius Jr.', team: 'Real Madrid', pos: 'EX', age: 23, goals: 22, assists: 14, mins: 2700, rating: 8.6, yellow: 3, red: 0 },
  { id: 2, name: 'Robert Lewandowski', team: 'Barcelona', pos: 'DC', age: 35, goals: 28, assists: 7, mins: 2650, rating: 8.4, yellow: 1, red: 0 },
  { id: 3, name: 'Kylian Mbappé', team: 'Real Madrid', pos: 'DC', age: 25, goals: 31, assists: 10, mins: 2800, rating: 8.9, yellow: 2, red: 0 },
  { id: 4, name: 'Erling Haaland', team: 'Man City', pos: 'DC', age: 23, goals: 35, assists: 5, mins: 2750, rating: 9.1, yellow: 2, red: 0 },
  { id: 5, name: 'Pedri', team: 'Barcelona', pos: 'MC', age: 22, goals: 9, assists: 18, mins: 2580, rating: 8.5, yellow: 4, red: 0 },
];

const formaColor = (f) => (f === 'W' ? COLORS.accent : f === 'D' ? COLORS.gold : COLORS.red);

const normalizeKey = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();

const withHashColor = (value = '') => {
  const palette = ['#00e5a0', '#3b82f6', '#f97316', '#e11d48', '#8b5cf6', '#22c55e', '#facc15'];
  const key = normalizeKey(value);
  const index = key.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
};

function getTeamLogo(team = {}) {
  const logo = team.logos?.find((item) => item.href)?.href || team.logo || team.darkLogo || team.defaultLogo;
  return typeof logo === 'string' ? logo : null;
}

function getTeamVisual(team = {}) {
  const displayName = team.displayName || team.name || '';
  const abbreviation = team.abbreviation || displayName.slice(0, 3).toUpperCase() || 'FC';
  const mapped = TEAM_VISUALS[normalizeKey(displayName)] || TEAM_VISUALS[normalizeKey(abbreviation)] || {};
  const primary = team.color ? `#${team.color.replace('#', '')}` : mapped.primary || withHashColor(displayName || abbreviation);
  const secondary = team.alternateColor ? `#${team.alternateColor.replace('#', '')}` : mapped.secondary || COLORS.bg;

  return {
    flag: mapped.flag || abbreviation,
    primary,
    secondary,
    crest: getTeamLogo(team),
  };
}

function TeamCrest({ uri, fallback, color, size = 34, style }) {
  const [failed, setFailed] = useState(false);
  const boxStyle = [
    styles.crestBox,
    {
      width: size,
      height: size,
      borderRadius: Math.max(10, Math.round(size * 0.32)),
      backgroundColor: color || COLORS.card,
    },
    style,
  ];

  return (
    <View style={boxStyle}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          resizeMode="contain"
          onError={() => setFailed(true)}
          style={{ width: size * 0.78, height: size * 0.78 }}
        />
      ) : (
        <Text style={[styles.crestFallbackText, { fontSize: Math.max(11, Math.round(size * 0.34)) }]}>{fallback}</Text>
      )}
    </View>
  );
}

function useEntranceAnimation(trigger) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, trigger]);

  return {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
      {
        scale: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };
}

function useLoopPulse(duration = 2800) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [duration, pulse]);

  return pulse;
}

function AmbientBackground() {
  const pulse = useLoopPulse(4200);
  const translateY = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.38, 0.62] });

  return (
    <View pointerEvents="none" style={styles.ambientLayer}>
      <Animated.View style={[styles.ambientGlowTop, { opacity, transform: [{ translateY }, { scale }] }]} />
      <Animated.View style={[styles.ambientGlowBottom, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.4] }) }]} />
      <View style={styles.pitchLine} />
    </View>
  );
}

function StatTile({ label, value, tone = 'neutral' }) {
  const entranceStyle = useEntranceAnimation(`${label}-${value}`);

  return (
    <Animated.View style={[styles.statTile, tone === 'accent' && styles.statTileAccent, tone === 'gold' && styles.statTileGold, entranceStyle]}>
      <Text style={styles.statTileLabel}>{label}</Text>
      <Text style={styles.statTileValue}>{value}</Text>
    </Animated.View>
  );
}

function HomeHeroMatch({ match }) {
  if (!match) return null;

  return (
    <View style={styles.homeHeroMatchStrip}>
      <View style={styles.homeHeroTeams}>
        <TeamCrest uri={match.homeCrest} fallback={match.homeBadge} color={match.homeColor} size={30} />
        <View style={styles.homeHeroVs}>
          <Text style={styles.homeHeroVsText}>{match.live ? `${match.homeScore} - ${match.awayScore}` : match.time}</Text>
          <Text style={styles.homeHeroVsMeta}>{match.live ? 'EN DIRECTO' : 'PRÓXIMO'}</Text>
        </View>
        <TeamCrest uri={match.awayCrest} fallback={match.awayBadge} color={match.awayColor} size={30} />
      </View>
    </View>
  );
}

function InsightPill({ label, value, tone = 'neutral' }) {
  return (
    <View style={[styles.insightPill, tone === 'accent' && styles.insightPillAccent, tone === 'gold' && styles.insightPillGold]}>
      <Text style={styles.insightPillLabel}>{label}</Text>
      <Text style={styles.insightPillValue}>{value}</Text>
    </View>
  );
}

function AdBanner({ title, subtitle, cta, onPress }) {
  return (
    <View style={styles.adBanner}>
      <View style={styles.adMark}>
        <Text style={styles.adMarkText}>Patrocinado</Text>
      </View>
      <Text style={styles.adTitle}>{title}</Text>
      <Text style={styles.adSubtitle}>{subtitle}</Text>
      <NativeAdSlot style={styles.nativeAdSlot} />
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.adButton}>
        <Text style={styles.adButtonText}>{cta}</Text>
      </TouchableOpacity>
    </View>
  );
}

function AdBreak({ placement, onPress }) {
  const copy = {
    feed: {
      title: 'Patrocinado',
      subtitle: 'Gratis gracias a anuncios',
    },
    match: {
      title: 'Ad break',
      subtitle: 'Premium quita pausas',
    },
    premium: {
      title: 'Sin anuncios',
      subtitle: 'Desbloquea Premium',
    },
  }[placement] || {
    title: 'Patrocinado',
    subtitle: 'Contenido gratuito',
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.adBreak}>
      <View style={styles.adBreakLeft}>
        <Text style={styles.adBreakBadge}>AD</Text>
        <View style={styles.adBreakTextWrap}>
          <Text style={styles.adBreakTitle}>{copy.title}</Text>
          <Text style={styles.adBreakSubtitle}>{copy.subtitle}</Text>
        </View>
      </View>
      <NativeAdSlot style={styles.nativeAdSlotCompact} />
      <Text style={styles.adBreakAction}>Premium</Text>
    </TouchableOpacity>
  );
}

function PlanCard({ plan, onPress, highlight, disabled }) {
  const entranceStyle = useEntranceAnimation(plan.id);

  return (
    <Animated.View style={entranceStyle}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        disabled={disabled}
        style={[styles.planCard, highlight && styles.planCardHighlight, disabled && styles.planCardDisabled]}
      >
        <View style={styles.planHeaderRow}>
          <Text style={styles.planLabel}>{plan.label}</Text>
          <Text style={styles.planAccent}>{plan.accent}</Text>
        </View>
        <Text style={styles.planPrice}>EUR {plan.price}</Text>
        <Text style={styles.planDescription}>{plan.description}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ChoiceChip({ label, selected, onPress, compact }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.choiceChip, selected && styles.choiceChipSelected, compact && styles.choiceChipCompact]}
    >
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function LiveDot() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });

  return (
    <View style={styles.liveDotRow}>
      <View style={styles.liveDotWrap}>
        <Animated.View style={[styles.liveDotHalo, { opacity, transform: [{ scale }] }]} />
        <View style={styles.liveDot} />
      </View>
      <Text style={styles.liveDotLabel}>LIVE</Text>
    </View>
  );
}

function MatchCard({ match, onPress }) {
  const entranceStyle = useEntranceAnimation(match.id);
  const pressScale = useRef(new Animated.Value(1)).current;
  const animatePress = (toValue) => {
    Animated.spring(pressScale, {
      toValue,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[entranceStyle, { transform: [...entranceStyle.transform, { scale: pressScale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => animatePress(0.985)}
        onPressOut={() => animatePress(1)}
        activeOpacity={0.78}
        style={[styles.card, { borderLeftColor: match.homeColor, borderLeftWidth: 4 }, match.live && styles.cardLive]}
      >
      <View style={styles.matchHeader}>
        <Text style={styles.matchLeague}>{match.league.toUpperCase()}</Text>
        {match.live ? (
          <View style={styles.liveInfo}>
            <LiveDot />
            <Text style={styles.liveInfoText}>EN DIRECTO · {match.minute || ''}</Text>
          </View>
        ) : (
          <Text style={styles.matchTime}>{match.time}</Text>
        )}
      </View>
      <View style={styles.matchRow}>
        <View style={styles.matchTeam}>
          <View style={styles.matchTeamBadgeRow}>
            <TeamCrest uri={match.homeCrest} fallback={match.homeBadge} color={match.homeColor} />
            <Text style={styles.matchTeamText} numberOfLines={2}>{match.home}</Text>
          </View>
        </View>
        <View style={styles.matchScoreBox}>
          <Text style={[styles.matchScore, match.live ? styles.matchScoreLive : styles.matchScoreIdle]}>
            {match.live ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
          </Text>
        </View>
        <View style={styles.matchTeamRight}>
          <View style={styles.matchTeamBadgeRowRight}>
            <Text style={[styles.matchTeamText, styles.matchTeamTextRight]} numberOfLines={2}>{match.away}</Text>
            <TeamCrest uri={match.awayCrest} fallback={match.awayBadge} color={match.awayColor} />
          </View>
        </View>
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function TeamRow({ team, onPress, selected, compact = false }) {
  const entranceStyle = useEntranceAnimation(team.id);

  return (
    <Animated.View style={entranceStyle}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.78}
        style={[styles.teamRow, compact && styles.teamRowCompact, { borderLeftColor: team.primaryColor, borderLeftWidth: 4 }, selected && styles.teamRowSelected]}
      >
      <Text style={[styles.teamPos, compact && styles.teamPosCompact]}>{team.pos}</Text>
      <View style={styles.teamIdentity}>
        <TeamCrest uri={team.crest} fallback={team.flag} color={team.primaryColor} size={compact ? 26 : 30} />
        <Text style={styles.teamName} numberOfLines={compact ? 2 : 1}>{team.name}</Text>
      </View>
      <Text style={styles.teamCell}>{team.pj}</Text>
      <Text style={[styles.teamCell, styles.teamPoints]}>{team.pts}</Text>
      {!compact && <Text style={styles.teamCell}>{team.pg}</Text>}
      {!compact && <Text style={styles.teamCell}>{team.pe}</Text>}
      {!compact && <Text style={[styles.teamCell, styles.teamLose]}>{team.pp}</Text>}
      <View style={[styles.teamFormaRow, compact && styles.teamFormaRowCompact]}>
        {team.forma.map((f, i) => (
          <View key={i} style={[styles.formaBullet, { backgroundColor: formaColor(f) }]} />
        ))}
      </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function TeamDetail({ team }) {
  if (!team) return null;
  const barW = (v, max) => `${Math.min(100, Math.round((v / max) * 100))}%`;

  return (
    <View style={[styles.detailCard, { borderColor: team.primaryColor }]}>
      <View style={styles.detailTitleRow}>
        <TeamCrest uri={team.crest} fallback={team.flag} color={team.primaryColor} size={46} />
        <View>
          <Text style={styles.detailTitle}>{team.name}</Text>
          <Text style={styles.detailLeague}>{team.league}</Text>
        </View>
      </View>
      <View style={styles.detailRow}>
        {[['Goles a favor', team.gf, 80, COLORS.accent], ['Goles en contra', team.gc, 80, COLORS.red]].map(([label, value, max, color]) => (
          <View key={label} style={styles.detailStat}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, { color }]}>{value}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: barW(value, max), backgroundColor: color }]} />
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.detailSubheading}>Forma reciente</Text>
      <View style={styles.formaRow}>
        {team.forma.map((f, i) => (
          <View key={i} style={[styles.formaTag, { borderColor: formaColor(f), backgroundColor: `${formaColor(f)}30` }]}>
            <Text style={[styles.formaTagText, { color: formaColor(f) }]}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlayerCard({ player, selected, onPress }) {
  const entranceStyle = useEntranceAnimation(player.id);

  return (
    <Animated.View style={entranceStyle}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.78} style={[styles.playerCard, selected && styles.playerCardSelected]}>
      <View style={styles.playerHeader}>
        <View>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerMeta}>{player.team} · {player.pos}</Text>
        </View>
        <Text style={styles.playerRating}>{player.rating}</Text>
      </View>
      {selected && (
        <View style={styles.playerStatsGrid}>
          {[
            ['⚽ Goles', player.goals],
            ['🅰️ Asist.', player.assists],
            ['⏱ Minutos', player.mins],
            ['🟨 Amarillas', player.yellow],
            ['🟥 Rojas', player.red],
            ['🎂 Edad', player.age],
          ].map(([label, value]) => (
            <View key={label} style={styles.playerStatBox}>
              <Text style={styles.playerStatLabel}>{label}</Text>
              <Text style={styles.playerStatValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function SearchBar({ value, onChange }) {
  return (
    <View style={styles.searchWrapper}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Buscar equipo o jugador..."
        placeholderTextColor={COLORS.muted}
        style={styles.searchInput}
      />
    </View>
  );
}

const MAIN_NAV = [
  { id: 'home', label: 'Inicio', icon: '⌂' },
  { id: 'live', label: 'En directo', icon: '●' },
  { id: 'explore', label: 'Explorar', icon: '⌕' },
  { id: 'profile', label: 'Perfil', icon: '◌' },
];

const EXPLORE_TABS = [
  { id: 'schedule', label: 'Horarios', icon: '📅' },
  { id: 'teams', label: 'Equipos', icon: '🏟️' },
  { id: 'players', label: 'Jugadores', icon: '👤' },
  { id: 'competitions', label: 'Competiciones', icon: '🏆' },
];

function formatMatchTime(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseMatch(event, leagueLabel) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const homeCompetitor = competitors.find((c) => c.homeAway === 'home') || {};
  const awayCompetitor = competitors.find((c) => c.homeAway === 'away') || {};
  const statusObj = event.status || {};
  const statusType = statusObj.type || {};
  const live = statusType.state === 'in';
  const minute = live ? statusObj.displayClock || statusType.shortDetail || statusType.detail || '' : null;
  const time = !live ? formatMatchTime(event.date) : null;
  const homeScore = parseInt(homeCompetitor.score || '0', 10);
  const awayScore = parseInt(awayCompetitor.score || '0', 10);
  const homeVisual = getTeamVisual(homeCompetitor.team);
  const awayVisual = getTeamVisual(awayCompetitor.team);

  return {
    id: event.id,
    home: homeCompetitor.team?.displayName || 'Local',
    away: awayCompetitor.team?.displayName || 'Visitante',
    homeScore,
    awayScore,
    minute,
    time,
    league: leagueLabel,
    live,
    homeBadge: homeVisual.flag,
    awayBadge: awayVisual.flag,
    homeColor: homeVisual.primary,
    awayColor: awayVisual.primary,
    homeSecondaryColor: homeVisual.secondary,
    awaySecondaryColor: awayVisual.secondary,
    homeCrest: homeVisual.crest,
    awayCrest: awayVisual.crest,
    homeTeam: homeCompetitor.team || {},
    awayTeam: awayCompetitor.team || {},
  };
}

function parseTeam(entry, leagueLabel, index) {
  const teamObj = entry.team || {};
  const stats = entry.stats || [];
  const visual = getTeamVisual(teamObj);
  
  const getStat = (name) => {
    const stat = stats.find(s => s.name === name);
    return stat ? stat.value : '-';
  };

  // Generate deterministic recent form based on team name and stats
  const hashString = teamObj.displayName || teamObj.name || '';
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    hash = hashString.charCodeAt(i) + ((hash << 5) - hash);
  }

  const w = parseInt(getStat('wins') || '0', 10) || 0;
  const d = parseInt(getStat('ties') || '0', 10) || 0;
  const l = parseInt(getStat('losses') || '0', 10) || 0;
  const total = w + d + l;
  
  let forma = [];
  if (total > 0) {
    const pW = w / total;
    const pD = d / total;
    for (let i = 0; i < 5; i++) {
      const val = Math.abs(Math.sin(hash + i));
      if (val < pW) forma.push('W');
      else if (val < pW + pD) forma.push('D');
      else forma.push('L');
    }
  } else {
    forma = ['W', 'D', 'L', 'W', 'D'];
  }

  return {
    id: teamObj.id || index.toString(),
    name: teamObj.displayName || teamObj.name || 'Equipo',
    league: leagueLabel,
    pos: getStat('rank') || (index + 1),
    pts: getStat('points'),
    pj: getStat('gamesPlayed'),
    pg: getStat('wins'),
    pe: getStat('ties'),
    pp: getStat('losses'),
    gf: getStat('pointsFor'),
    gc: getStat('pointsAgainst'),
    forma,
    flag: visual.flag,
    primaryColor: visual.primary,
    secondaryColor: visual.secondary,
    crest: visual.crest,
  };
}

function buildTeamsFromMatches(matches, leagueLabel) {
  const teamMap = {};

  matches.forEach((match) => {
    [
      { team: match.homeTeam, fallbackName: match.home },
      { team: match.awayTeam, fallbackName: match.away },
    ].forEach(({ team, fallbackName }) => {
      const id = team?.id || fallbackName;
      if (!id || teamMap[id]) return;

      const visual = getTeamVisual({ ...team, displayName: team?.displayName || fallbackName });
      teamMap[id] = {
        id,
        name: team?.displayName || fallbackName || 'Equipo',
        league: leagueLabel,
        pos: '-',
        pts: '-',
        pj: '-',
        pg: '-',
        pe: '-',
        pp: '-',
        gf: 0,
        gc: 0,
        forma: ['W', 'D', 'L', 'W', 'D'],
        flag: visual.flag,
        primaryColor: visual.primary,
        secondaryColor: visual.secondary,
        crest: visual.crest,
      };
    });
  });

  return Object.values(teamMap).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const [activeNav, setActiveNav] = useState('home');
  const [exploreTab, setExploreTab] = useState('schedule');
  const [selectedLeague, setSelectedLeague] = useState('fifa.world');
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetail, setMatchDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [entitlements, setEntitlements] = useState(DEFAULT_ENTITLEMENTS);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState('premium');
  const [hydrated, setHydrated] = useState(false);
  const [monetizationMode, setMonetizationMode] = useState({ revenueCat: 'demo', ads: 'test' });
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const contentAnim = useRef(new Animated.Value(1)).current;
  const lastInterstitialAt = useRef(0);
  const previousScoreRef = useRef({});
  const hasScoreBaselineRef = useRef(false);
  const notificationsReadyRef = useRef(false);
  const isCompact = windowWidth < 380;
  const isWide = windowWidth >= 720;
  const maxContentWidth = 720;
  const contentFrameStyle = isWide ? styles.contentFrame : null;
  const bottomNavWideStyle = isWide
    ? {
        left: Math.max(20, (windowWidth - maxContentWidth) / 2 + 16),
        right: Math.max(20, (windowWidth - maxContentWidth) / 2 + 16),
      }
    : null;

  useEffect(() => {
    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.profile) setProfile(normalizeSavedProfile(parsed.profile));
          if (parsed.entitlements) setEntitlements(normalizeSavedEntitlements(parsed.entitlements));
          if (MAIN_NAV.some((item) => item.id === parsed.activeNav)) setActiveNav(parsed.activeNav);
          if (parsed.exploreTab) setExploreTab(parsed.exploreTab);
          if (parsed.selectedLeague) setSelectedLeague(parsed.selectedLeague);
        }
      } catch (e) {
        console.warn('Error loading saved state:', e);
      } finally {
        setHydrated(true);
      }
    };

    hydrate();
  }, []);

  useEffect(() => {
    const bootMonetization = async () => {
      const mode = await initializeMonetization();
      setMonetizationMode(mode);

      const subscription = await getSubscriptionStatus();
      if (subscription.isPremium) {
        setEntitlements((current) => ({
          ...current,
          premiumPlan: subscription.planId || current.premiumPlan || 'premium',
          purchaseSource: subscription.source,
          notificationsEnabled: true,
        }));
      }
    };

    bootMonetization();
  }, []);

  useEffect(() => {
    const prepareNotifications = async () => {
      if (Platform.OS === 'web') return;

      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('goals', {
            name: 'Goles y directos',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: COLORS.accent,
          });
        }

        const currentPermissions = await Notifications.getPermissionsAsync();
        const finalPermissions = currentPermissions.granted
          ? currentPermissions
          : await Notifications.requestPermissionsAsync();

        notificationsReadyRef.current = Boolean(finalPermissions.granted);
        if (finalPermissions.granted && EAS_PROJECT_ID) {
          const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
          setPushToken(tokenResponse.data);
        }
      } catch (error) {
        notificationsReadyRef.current = false;
      }
    };

    prepareNotifications();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload = {
      profile,
      entitlements,
      activeNav,
      exploreTab,
      selectedLeague,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch((e) =>
      console.warn('Error saving state:', e)
    );
  }, [hydrated, profile, entitlements, activeNav, exploreTab, selectedLeague]);

  useEffect(() => {
    if (!hydrated || !pushToken || !PUSH_BACKEND_URL) return;

    const registerPushSubscription = async () => {
      try {
        await fetch(`${PUSH_BACKEND_URL.replace(/\/$/, '')}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: pushToken,
            favoriteTeam: profile.favoriteTeam,
            favoriteLeague: profile.favoriteLeague,
            selectedLeague,
            alertTypes: profile.alertTypes,
          }),
        });
      } catch (error) {
        console.warn('Error registering push token:', error);
      }
    };

    registerPushSubscription();
  }, [hydrated, pushToken, profile.favoriteTeam, profile.favoriteLeague, profile.alertTypes, selectedLeague]);

  useEffect(() => {
    if (hydrated && !profile.onboardingDone) {
      setShowOnboarding(true);
      setActiveNav('home');
    } else if (hydrated) {
      setShowOnboarding(false);
    }
  }, [hydrated, profile.onboardingDone]);

  useEffect(() => {
    contentAnim.setValue(0);
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeNav, selectedLeague, contentAnim]);

  const contentAnimatedStyle = {
    opacity: contentAnim,
    transform: [
      {
        translateY: contentAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  const availablePlayers = players.length > 0 ? players : FALLBACK_PLAYERS;
  const isPremium = Boolean(entitlements.premiumPlan);
  const notificationQuotaLeft = isPremium ? Infinity : Math.max(0, DEFAULT_FREE_LIMITS.notifications - entitlements.adRewardsClaimed);
  const isWeb = Platform.OS === 'web';

  const openPaywall = (reason = 'premium') => {
    setPaywallReason(reason);
    setShowPaywall(true);
    setEntitlements((current) => ({ ...current, hasSeenPaywall: true }));
  };

  const purchasePlan = async (planId) => {
    const selectedPlan = PREMIUM_PLANS.find((plan) => plan.id === planId);
    if (!selectedPlan) return;

    setPurchaseLoading(true);
    const result = await purchasePremiumPlan(planId);
    setPurchaseLoading(false);

    if (!result.success) {
      if (!result.cancelled) {
        Alert.alert('Compra no completada', 'No hemos podido activar Premium todavía. Revisa RevenueCat o inténtalo de nuevo.');
      }
      return;
    }

    setEntitlements((current) => ({
      ...current,
      premiumPlan: result.planId || planId,
      purchaseSource: result.demo ? 'demo' : result.source || 'revenuecat',
      coins: current.coins + 200,
      notificationsEnabled: true,
    }));
    setShowPaywall(false);
  };

  const restorePurchases = async () => {
    setPurchaseLoading(true);
    const result = await restorePremiumPurchases();
    setPurchaseLoading(false);

    if (!result.success) {
      Alert.alert('Sin compras activas', 'No he encontrado una compra Premium activa para restaurar.');
      return;
    }

    setEntitlements((current) => ({
      ...current,
      premiumPlan: result.planId || 'premium',
      purchaseSource: result.source || 'revenuecat',
      notificationsEnabled: true,
    }));
    setShowPaywall(false);
  };

  const claimRewardedAd = async (source = 'coins') => {
    setAdLoading(true);
    const result = await showRewardedAd(source);
    setAdLoading(false);

    if (!result.rewarded) {
      Alert.alert('Anuncio no completado', 'Para recibir la recompensa hay que terminar el anuncio.');
      return;
    }

    setEntitlements((current) => ({
      ...current,
      coins: current.coins + 25,
      adRewardsClaimed: current.adRewardsClaimed + 1,
    }));
  };

  const completeOnboarding = () => {
    setProfile((current) => ({ ...current, onboardingDone: true }));
    setSelectedLeague(profile.favoriteLeague);
    setActiveNav('home');
    setShowOnboarding(false);
  };

  const maybeShowInterstitial = async (placement = 'navigation') => {
    if (isPremium) return;

    const now = Date.now();
    if (now - lastInterstitialAt.current < INTERSTITIAL_COOLDOWN_MS) return;

    lastInterstitialAt.current = now;
    await showInterstitialAd(placement);
  };

  const switchNav = (nextNav) => {
    if (nextNav !== activeNav) {
      maybeShowInterstitial('navigation');
    }
    setActiveNav(nextNav);
  };

  const handleMatchPress = (match) => {
    maybeShowInterstitial('match');
    setSelectedMatch(match);
    setMatchDetail(null);
    setLoadingDetail(true);
    loadMatchDetail(match.id);
  };

  const loadMatchDetail = async (matchId) => {
    try {
      const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${selectedLeague}/summary?event=${matchId}`);
      if (response.ok) {
        const data = await response.json();
        setMatchDetail(data);
      }
    } catch (e) {
      console.warn('Error loading match details:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const notifyGoal = async (match, teamName, newScore, oldScore) => {
    if (!notificationsReadyRef.current || !entitlements.notificationsEnabled || !profile.alertTypes.includes('goal')) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Gol de ${teamName}`,
        body: `${match.home} ${match.homeScore} - ${match.awayScore} ${match.away}`,
        data: {
          matchId: match.id,
          oldScore,
          newScore,
        },
        sound: true,
      },
      trigger: null,
    });
  };

  const detectScoreChanges = (nextMatches) => {
    const nextScores = {};

    nextMatches.forEach((match) => {
      nextScores[match.id] = {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      };

      const previous = previousScoreRef.current[match.id];
      if (!hasScoreBaselineRef.current || !previous || !match.live) return;

      if (match.homeScore > previous.homeScore) {
        notifyGoal(match, match.home, match.homeScore, previous.homeScore);
      }

      if (match.awayScore > previous.awayScore) {
        notifyGoal(match, match.away, match.awayScore, previous.awayScore);
      }
    });

    previousScoreRef.current = nextScores;
    hasScoreBaselineRef.current = true;
  };

  useEffect(() => {
    hasScoreBaselineRef.current = false;
    previousScoreRef.current = {};
    loadLeagueData(selectedLeague);
    const interval = setInterval(() => loadLeagueData(selectedLeague, { silent: true }), LIVE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [selectedLeague]);

  const loadLeagueData = async (leagueId, options = {}) => {
    if (!options.silent) setLoading(true);
    setError(null);

    try {
      const leagueInfo = LEAGUES.find((league) => league.id === leagueId) || LEAGUES[0];
      const scoreboardResponse = await fetch(`${API_BASE}/${leagueId}/scoreboard?lang=es&region=es`);
      if (!scoreboardResponse.ok) throw new Error('Error al cargar partidos');
      const scoreboardData = await scoreboardResponse.json();
      const events = scoreboardData.events || [];

      const parsedMatches = events.map((event) => parseMatch(event, leagueInfo.label));
      detectScoreChanges(parsedMatches);
      setMatches(parsedMatches);

      try {
        const standingsResponse = await fetch(`https://site.api.espn.com/apis/v2/sports/soccer/${leagueId}/standings?lang=es&region=es`);
        if (standingsResponse.ok) {
          const standingsData = await standingsResponse.json();
          const entries = standingsData.children?.[0]?.standings?.entries || [];
          const parsedTeams = entries.map((entry, index) => parseTeam(entry, leagueInfo.label, index));
          setTeams(parsedTeams.length > 0 ? parsedTeams : buildTeamsFromMatches(parsedMatches, leagueInfo.label));
        } else {
          setTeams(buildTeamsFromMatches(parsedMatches, leagueInfo.label));
        }
      } catch (standingsError) {
        console.warn('Error loading standings:', standingsError);
        setTeams(buildTeamsFromMatches(parsedMatches, leagueInfo.label));
      }

      // Fetch statistics for players
      try {
        const statsResponse = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/statistics`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          const statsArray = statsData.stats || [];
          const goalsLeaders = statsArray[0]?.leaders || [];
          const assistsLeaders = statsArray[1]?.leaders || [];
          
          const allLeaders = {};
          
          const processLeaders = (leaders) => {
            leaders.forEach((lead) => {
              const athlete = lead.athlete || {};
              if (!athlete.id) return;
              const athleteStats = athlete.statistics || [];
              
              const getPlayerStat = (name) => {
                const st = athleteStats.find(s => s.name === name);
                return st ? st.value : 0;
              };

              const goals = getPlayerStat('totalGoals');
              const assists = getPlayerStat('goalAssists');
              const apps = getPlayerStat('appearances');
              
              // Calculate a rating between 7.0 and 9.5 based on goals and assists
              const rating = (7.0 + Math.min(2.5, (goals * 0.15) + (assists * 0.08) + (apps * 0.015))).toFixed(1);

              let pos = lead.value === goals ? 'DEL' : 'MED';
              const existing = allLeaders[athlete.id];
              if (existing && existing.pos === 'DEL') {
                pos = 'DEL';
              }

              allLeaders[athlete.id] = {
                id: athlete.id,
                name: athlete.displayName || 'Jugador',
                team: athlete.team?.displayName || 'Equipo',
                pos,
                age: athlete.age || 25,
                goals,
                assists,
                mins: apps * 82, // Estimate minutes
                rating,
                yellow: Math.round(apps * 0.08),
                red: Math.round(apps * 0.005),
              };
            });
          };
          
          processLeaders(goalsLeaders);
          processLeaders(assistsLeaders);
          
          const parsedPlayers = Object.values(allLeaders).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
          setPlayers(parsedPlayers.length > 0 ? parsedPlayers : FALLBACK_PLAYERS);
        } else {
          setPlayers(FALLBACK_PLAYERS);
        }
      } catch (err) {
        console.warn('Error loading player stats:', err);
        setPlayers(FALLBACK_PLAYERS);
      }

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      setError(err.message || 'Error desconocido');
      setMatches([]);
      setTeams([]);
      setPlayers(FALLBACK_PLAYERS);
    } finally {
      if (!options.silent) setLoading(false);
    }
  };

  const liveMatches = matches.filter((m) => m.live);
  const scheduledMatches = matches.filter((m) => !m.live);
  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.league.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPlayers = availablePlayers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.team.toLowerCase().includes(search.toLowerCase())
  );
  const leagueTitle = LEAGUES.find((league) => league.id === selectedLeague)?.label || 'Liga';
  const favoriteTeamMatch = teams.find((team) => team.name.toLowerCase() === profile.favoriteTeam.toLowerCase());
  const favoritePlayerMatch = availablePlayers.find((player) => player.name.toLowerCase().includes(profile.favoritePlayer.toLowerCase()));
  const favoriteLeague = LEAGUES.find((league) => league.id === profile.favoriteLeague) || LEAGUES[0];
  const favoriteMatches = matches.filter((match) =>
    match.home.toLowerCase().includes(profile.favoriteTeam.toLowerCase()) ||
    match.away.toLowerCase().includes(profile.favoriteTeam.toLowerCase())
  );
  const featuredHomeMatch = favoriteMatches[0] || liveMatches[0] || scheduledMatches[0] || null;
  const homeCommunityStory = liveMatches[0]
    ? `${liveMatches[0].home} presiona con intensidad frente a ${liveMatches[0].away}.`
    : `La jornada está lista y ya puedes seguir todo lo importante de ${profile.favoriteTeam}.`;

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, contentFrameStyle, isCompact && styles.headerCompact]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.brand, isCompact && styles.brandCompact]} numberOfLines={1}>Fut<Text style={styles.brandAccent}>Tracker</Text></Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {liveMatches.length} partidos en directo{lastUpdated ? ` · Act. ${lastUpdated}` : ''}
            </Text>
          </View>
          <View style={[styles.headerActions, isCompact && styles.headerActionsCompact]}>
            <TouchableOpacity 
              onPress={() => loadLeagueData(selectedLeague)} 
              style={styles.refreshButton}
              activeOpacity={0.7}
            >
              <Text style={styles.refreshButtonText}>↻</Text>
            </TouchableOpacity>
            <View style={styles.liveBadge}>
              <View style={styles.liveBadgeDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>
        </View>

        {activeNav === 'explore' && (
          <View style={[styles.tabBar, contentFrameStyle, isCompact && styles.tabBarCompact]}>
            {EXPLORE_TABS.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setExploreTab(item.id);
                  setSearch('');
                }}
                style={[styles.tabButton, exploreTab === item.id && styles.tabButtonActive]}
              >
                <Text style={styles.tabIcon}>{item.icon}</Text>
                <Text
                  style={[styles.tabLabel, isCompact && styles.tabLabelCompact, exploreTab === item.id && styles.tabLabelActive]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={[styles.leagueBar, contentFrameStyle]} 
          contentContainerStyle={styles.leagueBarContent}
        >
          {LEAGUES.map((league) => (
            <TouchableOpacity
              key={league.id}
              onPress={() => {
                setSelectedLeague(league.id);
                setSelectedTeam(null);
                setSelectedPlayer(null);
              }}
              style={[styles.leagueButton, selectedLeague === league.id && styles.leagueButtonActive]}
            >
              <Text style={[styles.leagueButtonText, selectedLeague === league.id && styles.leagueButtonTextActive]}>
                {league.icon} {league.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>Cargando datos reales...</Text>
          </View>
        )}

        {error && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>Error: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadLeagueData(selectedLeague)}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <Animated.View style={[styles.body, contentFrameStyle, isCompact && styles.bodyCompact, contentAnimatedStyle]}>
            {activeNav === 'home' && (
              <View style={styles.homeShell}>
                <View style={styles.homeHero}>
                  <View style={styles.homeHeroCopy}>
                    <Text style={styles.homeEyebrow}>Tu fútbol, a tu ritmo</Text>
                    <Text style={[styles.homeTitle, isCompact && styles.homeTitleCompact]} numberOfLines={1}>{profile.favoriteTeam}</Text>
                    <Text style={styles.homeSubtitle}>{favoriteLeague.label} · {profile.favoritePlayer}</Text>
                    <HomeHeroMatch match={featuredHomeMatch} />
                  </View>
                  <View style={styles.homeHeroBadge}>
                    <Text style={styles.homeHeroBadgeValue}>{entitlements.coins}</Text>
                    <Text style={styles.homeHeroBadgeLabel}>monedas</Text>
                  </View>
                </View>
                <View style={styles.homeGrid}>
                  <StatTile label="Directos" value={`${liveMatches.length}`} tone="accent" />
                  <StatTile label="Favorito" value={profile.favoriteTeam.split(' ')[0]} tone="gold" />
                  <StatTile label="Liga" value={favoriteLeague.label.replace(' League', '')} />
                  <StatTile label="Alertas" value={`${profile.alertTypes.length}`} />
                </View>
                {featuredHomeMatch ? (
                  <TouchableOpacity activeOpacity={0.85} onPress={() => handleMatchPress(featuredHomeMatch)} style={styles.homeFeatureCard}>
                    <Text style={styles.sectionTitle}>DESTACADO DE HOY</Text>
                    <View style={styles.featureMatchRow}>
                      <TeamCrest uri={featuredHomeMatch.homeCrest} fallback={featuredHomeMatch.homeBadge} color={featuredHomeMatch.homeColor} />
                      <View style={styles.featureMatchCenter}>
                        <Text style={styles.featureMatchLeague}>{featuredHomeMatch.league}</Text>
                        <Text style={styles.featureMatchScore}>{featuredHomeMatch.live ? `${featuredHomeMatch.homeScore} - ${featuredHomeMatch.awayScore}` : featuredHomeMatch.time}</Text>
                        <Text style={styles.featureMatchTeams} numberOfLines={2}>{featuredHomeMatch.home} vs {featuredHomeMatch.away}</Text>
                      </View>
                      <TeamCrest uri={featuredHomeMatch.awayCrest} fallback={featuredHomeMatch.awayBadge} color={featuredHomeMatch.awayColor} />
                    </View>
                  </TouchableOpacity>
                ) : null}
                <View style={styles.homeModuleRow}>
                  <View style={styles.homeModuleCard}>
                    <Text style={styles.homeModuleTitle}>Pulso de jornada</Text>
                    <Text style={styles.homeModuleValue}>{liveMatches.length || matches.length}</Text>
                    <Text style={styles.homeModuleMeta}>{liveMatches.length ? 'directos activos ahora' : 'partidos listos para revisar'}</Text>
                  </View>
                  <View style={styles.homeModuleCard}>
                    <Text style={styles.homeModuleTitle}>Predicción</Text>
                    <Text style={styles.homeModuleValue}>{featuredHomeMatch ? '1X' : 'Listo'}</Text>
                    <Text style={styles.homeModuleMeta}>{featuredHomeMatch ? `${featuredHomeMatch.home} no pierde según tendencia` : 'elige favoritos para afinar la home'}</Text>
                  </View>
                </View>
                <View style={styles.homeSectionStack}>
                  <View style={styles.homeSectionCard}>
                    <Text style={styles.sectionTitle}>RADAR FUTTRACKER</Text>
                    <Text style={styles.homeSectionLead}>{homeCommunityStory}</Text>
                    <View style={styles.insightRow}>
                      <InsightPill label="Racha" value={`${entitlements.xp} XP`} tone="gold" />
                      <InsightPill label="Alertas" value={isPremium ? 'Pro' : `${notificationQuotaLeft} libres`} tone="accent" />
                      <InsightPill label="Modo" value={isWeb ? 'Web' : 'App'} />
                    </View>
                  </View>
                  {isWeb && (
                    <View style={styles.webInstallCard}>
                      <Text style={styles.webInstallTitle}>FutTracker siempre a mano</Text>
                      <Text style={styles.webInstallText}>Abre esta web en el móvil y usa "Añadir a pantalla de inicio" para tenerla como app sin Play Store.</Text>
                    </View>
                  )}
                </View>
                {!isPremium && (
                  <AdBanner
                    title="Sin anuncios durante los directos"
                    subtitle="Premium elimina publicidad y desbloquea estadísticas avanzadas, mapas de calor y alertas rápidas."
                    cta="Ver premium"
                    onPress={() => openPaywall('home')}
                  />
                )}
                {!isPremium && <AdBreak placement="feed" onPress={() => openPaywall('home-ad-break')} />}
                {!isPremium && (
                  <TouchableOpacity onPress={() => claimRewardedAd('coins')} disabled={adLoading} activeOpacity={0.8} style={[styles.rewardButton, adLoading && styles.planCardDisabled]}>
                    <Text style={styles.rewardButtonText}>{adLoading ? 'Cargando anuncio...' : 'Ver anuncio y ganar 25 monedas'}</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.homeActionRow}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => switchNav('live')} style={styles.homeAction}>
                    <Text style={styles.homeActionText}>Ver directos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => switchNav('explore')} style={styles.homeActionSecondary}>
                    <Text style={styles.homeActionSecondaryText}>Explorar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeNav === 'live' && (
              <View>
                <Text style={styles.sectionTitle}>PARTIDOS EN DIRECTO · {leagueTitle}</Text>
                <View style={styles.cardStack}>
                  {liveMatches.length > 0 ? liveMatches.map((match, index) => (
                    <View key={match.id}>
                      <MatchCard match={match} onPress={() => handleMatchPress(match)} />
                      {!isPremium && (index + 1) % AD_BREAK_INTERVAL === 0 && <AdBreak placement="match" onPress={() => openPaywall('live-list')} />}
                    </View>
                  )) : <Text style={styles.emptyText}>No hay partidos en directo ahora mismo.</Text>}
                </View>
                {!isPremium && <AdBreak placement="premium" onPress={() => openPaywall('live-between-sections')} />}
                <Text style={styles.sectionTitle}>PRÓXIMOS PARTIDOS</Text>
                <View style={styles.cardStack}>
                  {scheduledMatches.length > 0 ? scheduledMatches.slice(0, 8).map((match, index) => (
                    <View key={match.id}>
                      <MatchCard match={match} onPress={() => handleMatchPress(match)} />
                      {!isPremium && (index + 1) % 2 === 0 && <AdBreak placement="feed" onPress={() => openPaywall('scheduled-list')} />}
                    </View>
                  )) : <Text style={styles.emptyText}>No hay próximos partidos disponibles.</Text>}
                </View>
              </View>
            )}

            {activeNav === 'explore' && exploreTab === 'schedule' && (
              <View>
                <Text style={styles.sectionTitle}>CALENDARIO · {leagueTitle}</Text>
                {!isPremium && <AdBreak placement="feed" onPress={() => openPaywall('schedule-top')} />}
                <View style={styles.cardStack}>
                  {matches.length > 0 ? matches.map((match, index) => (
                    <View key={match.id}>
                      <MatchCard match={match} onPress={() => handleMatchPress(match)} />
                      {!isPremium && (index + 1) % AD_BREAK_INTERVAL === 0 && <AdBreak placement="feed" onPress={() => openPaywall('schedule-list')} />}
                    </View>
                  )) : <Text style={styles.emptyText}>No hay partidos en el calendario.</Text>}
                </View>
              </View>
            )}

            {activeNav === 'explore' && exploreTab === 'teams' && (
              <View>
                <SearchBar value={search} onChange={setSearch} />
                {!isPremium && (
                  <AdBanner
                    title="Mejora tu experiencia"
                    subtitle="Comparadores avanzados, widgets y estadísticas profundas viven detrás de Premium."
                    cta="Desbloquear"
                    onPress={() => openPaywall('teams')}
                  />
                )}
                <View style={styles.tableHeader}>
                  {(isCompact ? ['#', 'Equipo', 'PJ', 'Pts', 'Forma'] : ['#', 'Equipo', 'PJ', 'Pts', 'G', 'E', 'P', 'Forma']).map((title) => (
                    <Text
                      key={title}
                      style={[
                        styles.tableHeaderText,
                        title === 'Equipo' ? styles.tableHeaderName : title === 'Forma' ? styles.tableHeaderForma : styles.tableHeaderCenter,
                        isCompact && title !== 'Equipo' && styles.tableHeaderCenterCompact,
                      ]}
                    >
                      {title}
                    </Text>
                  ))}
                </View>
                <View style={styles.cardStack}>
                  {filteredTeams.length > 0 ? filteredTeams.map((team, index) => (
                    <View key={team.id}>
                      <TeamRow
                        team={team}
                        selected={selectedTeam?.id === team.id}
                        onPress={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)}
                        compact={isCompact}
                      />
                      {!isPremium && (index + 1) % AD_BREAK_INTERVAL === 0 && <AdBreak placement="feed" onPress={() => openPaywall('teams-list')} />}
                    </View>
                  )) : <Text style={styles.emptyText}>No se encontraron equipos.</Text>}
                </View>
                <TeamDetail team={selectedTeam} />
              </View>
            )}

            {activeNav === 'explore' && exploreTab === 'players' && (
              <View>
                <SearchBar value={search} onChange={setSearch} />
                {!isPremium && (
                  <AdBanner
                    title="Explora sin anuncios"
                    subtitle="Mantén los directos limpios y desbloquea xG, heatmaps y alertas ultra rápidas con Premium."
                    cta="Ver Premium"
                    onPress={() => openPaywall('schedule')}
                  />
                )}
                <View style={styles.cardStack}>
                  {filteredPlayers.length > 0 ? filteredPlayers.map((player, index) => (
                    <View key={player.id}>
                      <PlayerCard
                        player={player}
                        selected={selectedPlayer?.id === player.id}
                        onPress={() => setSelectedPlayer(selectedPlayer?.id === player.id ? null : player)}
                      />
                      {!isPremium && (index + 1) % AD_BREAK_INTERVAL === 0 && <AdBreak placement="feed" onPress={() => openPaywall('players-list')} />}
                    </View>
                  )) : <Text style={styles.emptyText}>No se encontraron jugadores.</Text>}
                </View>
              </View>
            )}

            {activeNav === 'explore' && exploreTab === 'competitions' && (
              <View>
                <Text style={styles.sectionTitle}>COMPETICIONES</Text>
                <View style={styles.cardStack}>
                  {LEAGUES.map((league, index) => (
                    <View key={league.id}>
                      <TouchableOpacity activeOpacity={0.8} onPress={() => { maybeShowInterstitial('league'); setSelectedLeague(league.id); }} style={styles.competitionCard}>
                        <Text style={styles.competitionIcon}>{league.icon}</Text>
                        <View style={styles.competitionContent}>
                          <Text style={styles.competitionTitle}>{league.label}</Text>
                          <Text style={styles.competitionMeta}>{league.id}</Text>
                        </View>
                      </TouchableOpacity>
                      {!isPremium && (index + 1) % AD_BREAK_INTERVAL === 0 && <AdBreak placement="feed" onPress={() => openPaywall('competitions-list')} />}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {activeNav === 'profile' && (
              <View>
                <View style={styles.profileHero}>
                  <Text style={styles.sectionTitle}>PERFIL</Text>
                  <Text style={styles.profileTitle} numberOfLines={1}>{profile.favoriteTeam}</Text>
                  <Text style={styles.profileSubtitle}>{favoriteLeague.label} · {profile.favoritePlayer}</Text>
                </View>

                <View style={styles.profileStatsRow}>
                  <StatTile label="Monedas" value={`${entitlements.coins}`} />
                  <StatTile label="Plan" value={entitlements.premiumPlan || 'Gratis'} tone={isPremium ? 'gold' : 'neutral'} />
                  <StatTile label="Alertas" value={`${profile.alertTypes.length}`} />
                </View>

                {!isPremium && <AdBreak placement="premium" onPress={() => openPaywall('profile-top')} />}

                <View style={styles.profileCard}>
                  <Text style={styles.profileSectionTitle}>Favoritos</Text>
                  <View style={styles.choiceWrap}>
                    {TEAM_FOCUS.slice(0, 6).map((team) => (
                      <ChoiceChip key={team} label={team} selected={profile.favoriteTeam === team} onPress={() => setProfile((current) => ({ ...current, favoriteTeam: team }))} compact />
                    ))}
                  </View>
                </View>

                <View style={styles.profileCard}>
                  <Text style={styles.profileSectionTitle}>Alertas</Text>
                  <View style={styles.choiceWrap}>
                    {ALERT_TYPES.map((alert) => (
                      <ChoiceChip
                        key={alert.id}
                        label={alert.label}
                        selected={profile.alertTypes.includes(alert.id)}
                        onPress={() =>
                          setProfile((current) => ({
                            ...current,
                            alertTypes: current.alertTypes.includes(alert.id)
                              ? current.alertTypes.filter((item) => item !== alert.id)
                              : [...current.alertTypes, alert.id],
                          }))
                        }
                        compact
                      />
                    ))}
                  </View>
                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={() => claimRewardedAd('coins')} disabled={adLoading} style={[styles.rewardButton, adLoading && styles.planCardDisabled]}>
                  <Text style={styles.rewardButtonText}>{adLoading ? 'Cargando anuncio...' : 'Ver anuncio y ganar monedas'}</Text>
                </TouchableOpacity>

                {!isPremium && (
                  <TouchableOpacity activeOpacity={0.8} onPress={() => openPaywall('profile')} style={styles.upgradeCard}>
                    <Text style={styles.upgradeBadge}>Premium</Text>
                    <Text style={styles.upgradeTitle}>Quita anuncios y desbloquea estadísticas avanzadas, mapas de calor y alertas rápidas</Text>
                    <Text style={styles.upgradeMeta}>Pago único de 5,99 EUR. Sin suscripciones.</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
      <Modal visible={showOnboarding} animationType="slide" transparent={true} onRequestClose={() => setShowOnboarding(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isWide && styles.modalContentWide, styles.onboardingModal]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.onboardingScroll}>
              <Text style={styles.onboardingKicker}>Configuración inicial</Text>
              <Text style={styles.onboardingTitle}>Personaliza tu fútbol</Text>
              <Text style={styles.onboardingSubtitle}>Cinco pasos y la home ya se adapta a ti.</Text>

              <View style={styles.onboardingProgressTrack}>
                <View style={[styles.onboardingProgressFill, { width: `${((onboardingStep + 1) / 5) * 100}%` }]} />
              </View>

              {onboardingStep === 0 && (
                <View style={styles.onboardingCard}>
                  <Text style={styles.onboardingStepTitle}>Equipo favorito</Text>
                  <View style={styles.choiceWrap}>
                    {TEAM_FOCUS.map((team) => (
                      <ChoiceChip key={team} label={team} selected={profile.favoriteTeam === team} onPress={() => setProfile((current) => ({ ...current, favoriteTeam: team }))} />
                    ))}
                  </View>
                </View>
              )}

              {onboardingStep === 1 && (
                <View style={styles.onboardingCard}>
                  <Text style={styles.onboardingStepTitle}>Liga favorita</Text>
                  <View style={styles.choiceWrap}>
                    {LEAGUES.map((league) => (
                      <ChoiceChip key={league.id} label={league.label} selected={profile.favoriteLeague === league.id} onPress={() => { setProfile((current) => ({ ...current, favoriteLeague: league.id })); setSelectedLeague(league.id); }} />
                    ))}
                  </View>
                </View>
              )}

              {onboardingStep === 2 && (
                <View style={styles.onboardingCard}>
                  <Text style={styles.onboardingStepTitle}>Selección favorita</Text>
                  <View style={styles.choiceWrap}>
                    {SELECTION_OPTIONS.map((selection) => (
                      <ChoiceChip key={selection} label={selection} selected={profile.favoriteSelection === selection} onPress={() => setProfile((current) => ({ ...current, favoriteSelection: selection }))} />
                    ))}
                  </View>
                </View>
              )}

              {onboardingStep === 3 && (
                <View style={styles.onboardingCard}>
                  <Text style={styles.onboardingStepTitle}>Jugador favorito</Text>
                  <TextInput
                    value={profile.favoritePlayer}
                    onChangeText={(value) => setProfile((current) => ({ ...current, favoritePlayer: value }))}
                    placeholder="Escribe un jugador"
                    placeholderTextColor={COLORS.muted}
                    style={styles.onboardingInput}
                  />
                </View>
              )}

              {onboardingStep === 4 && (
                <View style={styles.onboardingCard}>
                  <Text style={styles.onboardingStepTitle}>Alertas</Text>
                  <View style={styles.choiceWrap}>
                    {ALERT_TYPES.map((alert) => (
                      <ChoiceChip
                        key={alert.id}
                        label={alert.label}
                        selected={profile.alertTypes.includes(alert.id)}
                        onPress={() =>
                          setProfile((current) => ({
                            ...current,
                            alertTypes: current.alertTypes.includes(alert.id)
                              ? current.alertTypes.filter((item) => item !== alert.id)
                              : [...current.alertTypes, alert.id],
                          }))
                        }
                        compact
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.onboardingActions}>
                <TouchableOpacity onPress={() => setOnboardingStep((current) => Math.max(0, current - 1))} activeOpacity={0.8} style={styles.onboardingSecondaryButton}>
                  <Text style={styles.onboardingSecondaryButtonText}>Atrás</Text>
                </TouchableOpacity>
                {onboardingStep < 4 ? (
                  <TouchableOpacity onPress={() => setOnboardingStep((current) => Math.min(4, current + 1))} activeOpacity={0.8} style={styles.onboardingPrimaryButton}>
                    <Text style={styles.onboardingPrimaryButtonText}>Siguiente</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={completeOnboarding} activeOpacity={0.8} style={styles.onboardingPrimaryButton}>
                    <Text style={styles.onboardingPrimaryButtonText}>Empezar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaywall} animationType="slide" transparent={true} onRequestClose={() => setShowPaywall(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isWide && styles.modalContentWide, styles.paywallModal]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.paywallScroll}>
              <Text style={styles.onboardingKicker}>Premium</Text>
              <Text style={styles.onboardingTitle}>Quita anuncios y desbloquea el nivel completo</Text>
              <Text style={styles.onboardingSubtitle}>Motivado por foco, no por fricción. Pagas por valor real.</Text>
              <Text style={styles.paywallModeText}>
                RevenueCat: {monetizationMode.revenueCat} · Ads: {monetizationMode.ads}
              </Text>

              <View style={styles.paywallFeatures}>
                {['Sin anuncios', 'xG completo', 'Mapas de calor', 'Comparador avanzado', 'Widgets premium', 'Alertas ultra rápidas'].map((feature) => (
                  <View key={feature} style={styles.paywallFeatureRow}>
                    <Text style={styles.paywallFeatureBullet}>•</Text>
                    <Text style={styles.paywallFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.planStack}>
                {PREMIUM_PLANS.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onPress={() => purchasePlan(plan.id)}
                    highlight={true}
                    disabled={purchaseLoading}
                  />
                ))}
              </View>

              <TouchableOpacity onPress={() => claimRewardedAd('coins')} disabled={adLoading} activeOpacity={0.8} style={[styles.rewardButton, adLoading && styles.planCardDisabled]}>
                <Text style={styles.rewardButtonText}>{adLoading ? 'Cargando anuncio...' : 'Ver anuncio y ganar recursos'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={restorePurchases} disabled={purchaseLoading} activeOpacity={0.8} style={styles.onboardingSecondaryButton}>
                <Text style={styles.onboardingSecondaryButtonText}>{purchaseLoading ? 'Conectando...' : 'Restaurar compras'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowPaywall(false)} activeOpacity={0.8} style={styles.onboardingSecondaryButton}>
                <Text style={styles.onboardingSecondaryButtonText}>Seguir gratis</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={[styles.bottomNav, bottomNavWideStyle, isCompact && styles.bottomNavCompact]}>
        {MAIN_NAV.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => switchNav(item.id)}
            activeOpacity={0.85}
            style={[styles.bottomNavButton, activeNav === item.id && styles.bottomNavButtonActive]}
          >
            <Text style={[styles.bottomNavIcon, activeNav === item.id && styles.bottomNavIconActive]}>{item.icon}</Text>
            <Text
              style={[styles.bottomNavText, isCompact && styles.bottomNavTextCompact, activeNav === item.id && styles.bottomNavTextActive]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={selectedMatch !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isWide && styles.modalContentWide]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalLeagueTitle}>{selectedMatch?.league?.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setSelectedMatch(null)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingDetail && (
              <View style={styles.modalLoaderContainer}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.modalLoaderText}>Cargando estadísticas en vivo...</Text>
              </View>
            )}

            {!loadingDetail && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Score section */}
                <View style={[styles.modalScoreCard, isCompact && styles.modalScoreCardCompact]}>
                  <View style={styles.modalScoreTeam}>
                    <TeamCrest
                      uri={selectedMatch?.homeCrest}
                      fallback={selectedMatch?.homeBadge}
                      color={selectedMatch?.homeColor || COLORS.accent}
                      size={isCompact ? 44 : 54}
                      style={styles.modalTeamBadge}
                    />
                    <Text style={styles.modalTeamName} numberOfLines={2}>{selectedMatch?.home}</Text>
                  </View>
                  <View style={styles.modalScoreBox}>
                    <Text style={[styles.modalScoreText, isCompact && styles.modalScoreTextCompact]}>
                      {selectedMatch?.live || matchDetail?.header?.competitions?.[0]?.status?.type?.completed ? `${selectedMatch?.homeScore} - ${selectedMatch?.awayScore}` : 'vs'}
                    </Text>
                    {selectedMatch?.live && (
                      <Text style={styles.modalLiveIndicator}>EN DIRECTO · {selectedMatch?.minute}</Text>
                    )}
                    {!selectedMatch?.live && matchDetail?.header?.competitions?.[0]?.status?.type?.completed && (
                      <Text style={styles.modalFinishedText}>FINALIZADO</Text>
                    )}
                  </View>
                  <View style={styles.modalScoreTeamRight}>
                    <TeamCrest
                      uri={selectedMatch?.awayCrest}
                      fallback={selectedMatch?.awayBadge}
                      color={selectedMatch?.awayColor || COLORS.accent}
                      size={isCompact ? 44 : 54}
                      style={styles.modalTeamBadge}
                    />
                    <Text style={[styles.modalTeamName, styles.modalTeamNameRight]} numberOfLines={2}>{selectedMatch?.away}</Text>
                  </View>
                </View>

                {/* Key events timeline */}
                {matchDetail?.keyEvents && matchDetail.keyEvents.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>INCIDENCIAS DEL PARTIDO</Text>
                    <View style={styles.timelineContainer}>
                      {(() => {
                        const eventsToShow = matchDetail.keyEvents.filter(e => e.scoringPlay || e.type?.text?.toLowerCase().includes('card'));
                        if (eventsToShow.length === 0) {
                          return <Text style={styles.emptyText}>No se registraron incidencias importantes.</Text>;
                        }
                        return eventsToShow.map((event) => {
                          const isHome = event.team?.id === matchDetail?.header?.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.id;
                          const icon = event.type?.text?.toLowerCase().includes('red') ? '🟥' : event.type?.text?.toLowerCase().includes('yellow') ? '🟨' : '⚽';
                          return (
                            <View key={event.id} style={[styles.timelineRow, isHome ? styles.timelineRowHome : styles.timelineRowAway]}>
                              <Text style={styles.timelineClock}>{event.clock?.displayValue || event.clock?.value + "'"}</Text>
                              <Text style={styles.timelineIcon}>{icon}</Text>
                              <View style={styles.timelineContent}>
                                <Text style={styles.timelineText}>{event.shortText || event.text}</Text>
                              </View>
                            </View>
                          );
                        });
                      })()}
                    </View>
                  </View>
                )}

                {/* Match Statistics */}
                {matchDetail?.boxscore?.teams && matchDetail.boxscore.teams.length === 2 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>ESTADÍSTICAS COMPARATIVAS</Text>
                    <View style={styles.statsContainer}>
                      {(() => {
                        const teamH = matchDetail.boxscore.teams[0];
                        const teamA = matchDetail.boxscore.teams[1];
                        
                        const parseStatVal = (valStr) => parseFloat(valStr.replace('%', '')) || 0;

                        const statsToCompare = [
                          { label: 'Posesión', key: 'possessionPct', max: 100 },
                          { label: 'Remates Totales', key: 'totalShots', max: 30 },
                          { label: 'Remates al Arco', key: 'shotsOnTarget', max: 15 },
                          { label: 'Tiros de Esquina', key: 'wonCorners', max: 15 },
                          { label: 'Faltas Cometidas', key: 'foulsCommitted', max: 25 },
                          { label: 'Tarjetas Amarillas', key: 'yellowCards', max: 6 },
                        ];

                        return statsToCompare.map((stat) => {
                          const getVal = (team, key) => {
                            const found = team.statistics?.find(s => s.name === key);
                            return found ? found.displayValue : '0';
                          };

                          const valHStr = getVal(teamH, stat.key);
                          const valAStr = getVal(teamA, stat.key);
                          const valH = parseStatVal(valHStr);
                          const valA = parseStatVal(valAStr);
                          const total = valH + valA || 1;

                          return (
                            <View key={stat.label} style={styles.statCompareRow}>
                              <View style={styles.statCompareLabelRow}>
                                <Text style={styles.statCompareValue}>{valHStr}</Text>
                                <Text style={styles.statCompareLabel}>{stat.label}</Text>
                                <Text style={styles.statCompareValueRight}>{valAStr}</Text>
                              </View>
                              <View style={styles.statCompareBarContainer}>
                                <View style={[styles.statCompareBarLeft, { flex: valH / total }]} />
                                <View style={styles.statCompareBarSpacer} />
                                <View style={[styles.statCompareBarRight, { flex: valA / total }]} />
                              </View>
                            </View>
                          );
                        });
                      })()}
                    </View>
                  </View>
                )}

                {/* Game Info Section */}
                {matchDetail?.gameInfo && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>DETALLES DEL ENCUENTRO</Text>
                    <View style={styles.gameInfoCard}>
                      {matchDetail.gameInfo.venue && (
                        <View style={styles.infoDetailRow}>
                          <Text style={styles.infoDetailLabel}>Estadio:</Text>
                          <Text style={styles.infoDetailValue}>
                            {matchDetail.gameInfo.venue.fullName}
                            {matchDetail.gameInfo.venue.address?.city ? ` (${matchDetail.gameInfo.venue.address.city})` : ''}
                          </Text>
                        </View>
                      )}
                      {matchDetail.gameInfo.referee && (
                        <View style={styles.infoDetailRow}>
                          <Text style={styles.infoDetailLabel}>Árbitro:</Text>
                          <Text style={styles.infoDetailValue}>{matchDetail.gameInfo.referee.displayName}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  ambientLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -90,
    right: -95,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#0c7f5f',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: 160,
    left: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#12365f',
  },
  pitchLine: {
    position: 'absolute',
    top: 170,
    left: -20,
    right: -20,
    height: 1,
    backgroundColor: '#ffffff10',
    transform: [{ rotate: '-8deg' }],
  },
  contentFrame: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  container: {
    paddingBottom: 132,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCompact: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  headerActionsCompact: {
    gap: 6,
  },
  brand: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.text,
  },
  brandCompact: {
    fontSize: 24,
  },
  brandAccent: {
    color: COLORS.accent,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.muted,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accentGlow,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.live,
    marginRight: 8,
  },
  liveBadgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#151b27',
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 22,
    padding: 4,
    overflow: 'hidden',
  },
  tabBarCompact: {
    marginHorizontal: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  tabButtonActive: {
    backgroundColor: COLORS.cardElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '700',
  },
  tabLabelCompact: {
    fontSize: 9,
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
  leagueBar: {
    marginTop: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  leagueBarContent: {
    gap: 10,
    paddingRight: 32,
  },
  leagueButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  leagueButtonActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  leagueButtonText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  leagueButtonTextActive: {
    color: COLORS.accent,
  },
  statusContainer: {
    padding: 24,
    alignItems: 'center',
  },
  statusText: {
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: COLORS.bg,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bodyCompact: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionTitle: {
    color: COLORS.muted,
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 12,
  },
  cardStack: {
    gap: 10,
  },
  card: {
    backgroundColor: '#0f1724f2',
    borderColor: '#2b3850',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 4,
  },
  cardLive: {
    borderColor: '#36e7a866',
    shadowColor: COLORS.accentGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 3,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchLeague: {
    color: COLORS.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  liveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveInfoText: {
    color: COLORS.live,
    fontSize: 11,
    fontWeight: '700',
  },
  matchTime: {
    color: COLORS.muted,
    fontSize: 11,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeam: {
    flex: 1,
  },
  matchTeamRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  matchTeamBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchTeamBadgeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  crestBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff30',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  crestFallbackText: {
    color: COLORS.text,
    fontWeight: '800',
  },
  matchTeamText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  matchTeamTextRight: {
    textAlign: 'right',
  },
  matchScoreBox: {
    minWidth: 64,
    alignItems: 'center',
  },
  matchScore: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  matchScoreLive: {
    color: COLORS.accent,
    fontSize: 26,
  },
  matchScoreIdle: {
    color: COLORS.muted,
  },
  liveDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDotWrap: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDotHalo: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.live,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.live,
  },
  liveDotLabel: {
    color: COLORS.live,
    fontSize: 11,
    fontWeight: '700',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  teamRowCompact: {
    gap: 6,
    paddingHorizontal: 8,
  },
  teamRowSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  teamPos: {
    width: 24,
    color: COLORS.muted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  teamPosCompact: {
    width: 20,
    fontSize: 11,
  },
  teamName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  teamIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamCell: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.muted,
  },
  teamPoints: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  teamLose: {
    color: COLORS.red,
  },
  teamFormaRow: {
    flexDirection: 'row',
    gap: 4,
    width: 50,
    justifyContent: 'flex-end',
  },
  teamFormaRowCompact: {
    width: 36,
    gap: 3,
  },
  formaBullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  detailCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  detailLeague: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailStat: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  detailSubheading: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 8,
  },
  formaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formaTag: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formaTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  playerCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  playerCardSelected: {
    borderColor: COLORS.accent,
    shadowColor: COLORS.accentGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  playerMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  playerRating: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  playerStatsGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  playerStatBox: {
    width: '48%',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  playerStatLabel: {
    color: COLORS.muted,
    fontSize: 10,
  },
  playerStatValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statTile: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#0d1420',
    borderColor: '#263246',
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
  },
  statTileAccent: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentDim,
  },
  statTileGold: {
    borderColor: COLORS.gold,
    backgroundColor: '#2b2616',
  },
  statTileLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  statTileValue: {
    marginTop: 6,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
  },
  insightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  insightPill: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  insightPillAccent: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  insightPillGold: {
    backgroundColor: '#2b2616',
    borderColor: COLORS.gold,
  },
  insightPillLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  insightPillValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  adBanner: {
    backgroundColor: '#151b27',
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
  },
  adMark: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentDim,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  adMarkText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  adTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
  adSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  nativeAdSlot: {
    marginTop: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  nativeAdSlotCompact: {
    width: 76,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  adBreak: {
    minHeight: 54,
    backgroundColor: '#101722',
    borderColor: '#253044',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adBreakLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adBreakBadge: {
    color: COLORS.gold,
    backgroundColor: '#2b2616',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
  },
  adBreakTextWrap: {
    flex: 1,
  },
  adBreakTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
  },
  adBreakSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
  },
  adBreakAction: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
  },
  adButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  adButtonText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '900',
  },
  planCard: {
    backgroundColor: '#101927',
    borderColor: '#2f4058',
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
  },
  planCardHighlight: {
    borderColor: COLORS.accent,
    backgroundColor: '#0b332d',
  },
  planCardDisabled: {
    opacity: 0.55,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
  },
  planAccent: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  planPrice: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 10,
  },
  planDescription: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  choiceChipCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  choiceChipSelected: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  choiceChipText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  choiceChipTextSelected: {
    color: COLORS.accent,
  },
  homeShell: {
    gap: 14,
  },
  homeHero: {
    backgroundColor: '#0f1826f5',
    borderColor: '#3c536f',
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 5,
  },
  homeHeroCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  homeEyebrow: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  homeTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  homeTitleCompact: {
    fontSize: 24,
  },
  homeSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  homeHeroMatchStrip: {
    marginTop: 16,
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffffff18',
    backgroundColor: '#05070c7a',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  homeHeroTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeHeroVs: {
    alignItems: 'center',
    minWidth: 64,
  },
  homeHeroVsText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  homeHeroVsMeta: {
    color: COLORS.accent,
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
  },
  homeHeroBadge: {
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  homeHeroBadgeValue: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '900',
  },
  homeHeroBadgeLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '800',
  },
  homeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  homeFeatureCard: {
    backgroundColor: '#0f1724',
    borderColor: '#2d3a50',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  featureMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  featureMatchCenter: {
    flex: 1,
  },
  featureMatchLeague: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  featureMatchScore: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  featureMatchTeams: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  homeActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  homeAction: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  homeActionSecondary: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  homeActionText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '900',
  },
  homeActionSecondaryText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
  },
  homeModuleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  homeModuleCard: {
    flex: 1,
    backgroundColor: '#101722',
    borderColor: '#28364d',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  homeModuleTitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  homeModuleValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  homeModuleMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  homeSectionStack: {
    gap: 10,
  },
  homeSectionCard: {
    backgroundColor: '#111a29',
    borderColor: '#2f4058',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  homeSectionLead: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  webInstallCard: {
    backgroundColor: '#0d1f1b',
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  webInstallTitle: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '900',
  },
  webInstallText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  homeCommunityCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  profileHero: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 10,
  },
  profileTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  profileSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  profileStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 10,
  },
  profileSectionTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  rewardButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardButtonText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '900',
  },
  upgradeCard: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  upgradeBadge: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  upgradeTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  upgradeMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
  },
  onboardingModal: {
    height: '90%',
  },
  onboardingScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  onboardingKicker: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  onboardingTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  onboardingSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  onboardingProgressTrack: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    overflow: 'hidden',
  },
  onboardingProgressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 999,
  },
  onboardingCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  onboardingStepTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  onboardingInput: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
  },
  onboardingActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  onboardingPrimaryButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  onboardingPrimaryButtonText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '900',
  },
  onboardingSecondaryButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  onboardingSecondaryButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '900',
  },
  paywallModal: {
    height: '92%',
  },
  paywallScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  paywallFeatures: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  paywallModeText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  paywallFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paywallFeatureBullet: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  paywallFeatureText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  planStack: {
    gap: 10,
  },
  competitionCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  competitionIcon: {
    fontSize: 20,
  },
  competitionContent: {
    flex: 1,
  },
  competitionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
  },
  competitionMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  searchWrapper: {
    marginBottom: 16,
  },
  searchInput: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: COLORS.text,
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tableHeaderName: {
    flex: 1,
    textAlign: 'left',
  },
  tableHeaderCenter: {
    width: 36,
    textAlign: 'center',
  },
  tableHeaderForma: {
    width: 50,
    textAlign: 'right',
  },
  tableHeaderCenterCompact: {
    width: 30,
  },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#111722f2',
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
  bottomNavCompact: {
    left: 10,
    right: 10,
    bottom: 10,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  bottomNavText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  bottomNavTextCompact: {
    fontSize: 9,
  },
  bottomNavTextActive: {
    color: COLORS.text,
  },
  bottomNavButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    gap: 3,
  },
  bottomNavButtonActive: {
    backgroundColor: COLORS.accentDim,
  },
  bottomNavIcon: {
    color: COLORS.muted,
    fontSize: 16,
  },
  bottomNavIconActive: {
    color: COLORS.accent,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  refreshButton: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#070b12',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    height: '85%',
    borderWidth: 1,
    borderColor: '#2f4058',
  },
  modalContentWide: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalLeagueTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  closeButton: {
    backgroundColor: COLORS.card,
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  modalLoaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  modalLoaderText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },
  modalScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f1724',
    borderColor: '#2d3a50',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 5,
  },
  modalScoreCardCompact: {
    padding: 14,
    borderRadius: 22,
  },
  modalScoreTeam: {
    flex: 1.2,
  },
  modalScoreTeamRight: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  modalTeamBadge: {
    marginBottom: 8,
  },
  modalTeamName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  modalTeamNameRight: {
    textAlign: 'right',
  },
  modalScoreBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScoreText: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  modalScoreTextCompact: {
    fontSize: 22,
  },
  modalLiveIndicator: {
    color: COLORS.live,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  modalFinishedText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  timelineContainer: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 12,
  },
  timelineRowHome: {},
  timelineRowAway: {},
  timelineClock: {
    color: COLORS.accent,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    width: 42,
  },
  timelineIcon: {
    fontSize: 14,
  },
  timelineContent: {
    flex: 1,
  },
  timelineText: {
    color: COLORS.text,
    fontSize: 12,
  },
  statsContainer: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  statCompareRow: {
    gap: 8,
  },
  statCompareLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCompareValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    width: 45,
  },
  statCompareValueRight: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    width: 45,
    textAlign: 'right',
  },
  statCompareLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  statCompareBarContainer: {
    height: 6,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statCompareBarLeft: {
    backgroundColor: COLORS.accent,
    height: '100%',
  },
  statCompareBarSpacer: {
    width: 2,
    backgroundColor: COLORS.bg,
  },
  statCompareBarRight: {
    backgroundColor: COLORS.red,
    height: '100%',
  },
  gameInfoCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  infoDetailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  infoDetailLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  infoDetailValue: {
    color: COLORS.text,
    fontSize: 12,
    flex: 1,
  },
});

