import { clubDisplayName } from "@/lib/club-display-name";
import {
  FOOTBALL_MATCHES_PER_TEAM,
  chanceFields,
  footballScorerChances,
  footballSeasonProgress,
  footballTitleChances,
} from "@/lib/football-award-chances";
import { cachedUpstreamFetch } from "@/lib/sports-upstream-cache";
import { buildClubTeamInfo, resolveClubCode } from "@/lib/league-standings";
import { capForecast } from "@/lib/match-forecast";
import type { LeagueStandings } from "@/lib/premier-league-types";
import type { MatchInfo } from "@/lib/types";

const COMMENTARY_MAX = 300;

export interface PremierLeagueAwardContender {
  rank: number;
  label: string;
  teamCode: string;
  teamName: string;
  crest?: string;
  stat: number;
  statLabel: string;
  /** Appearances behind a scoring rate. Absent on the attack and defence lists. */
  playedMatches?: number;
}

export interface PremierLeagueAward {
  id: string;
  name: string;
  emoji: string;
  description: string;
  contenders: PremierLeagueAwardContender[];
}

export interface PremierLeagueChanceContender extends PremierLeagueAwardContender {
  /** Largest-remainder whole percent. Values on a card sum to 100. */
  winChance: number;
  /** Smoothed share before whole-point rounding. */
  winChanceExact: number;
  /** "21%" or "<1%". A positive share never renders as "0%". */
  winChanceLabel: string;
}

/** Title and Golden Boot cards, same shape as the La Liga award cards. */
export interface PremierLeagueChanceAward {
  id: string;
  name: string;
  sponsor: string;
  emoji: string;
  description: string;
  progress: number;
  commentary: string;
  contenders: PremierLeagueChanceContender[];
}

export interface PremierLeagueAwardsModel {
  chanceAwards: PremierLeagueChanceAward[];
  tableAwards: PremierLeagueAward[];
}

interface FootballDataScorer {
  player: { name: string };
  team: { name: string; tla?: string | null; crest?: string | null };
  playedMatches?: number | null;
  goals: number;
  assists?: number | null;
}

async function fetchPremierLeagueScorers(limit = 8): Promise<PremierLeagueAwardContender[] | null> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await cachedUpstreamFetch(
      `https://api.football-data.org/v4/competitions/PL/scorers?limit=${limit}`,
      { headers: { "X-Auth-Token": apiKey } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { scorers?: FootballDataScorer[] };
    const rows = data.scorers ?? [];
    if (rows.length === 0) return null;

    return rows.map((row, index) => {
      const code = resolveClubCode(row.team.name, row.team.tla);
      const team = buildClubTeamInfo(code, row.team.name, row.team.crest ?? undefined);
      return {
        rank: index + 1,
        label: row.player.name,
        teamCode: code,
        teamName: clubDisplayName(team),
        crest: team.crest,
        stat: row.goals ?? 0,
        statLabel: "goals",
        playedMatches: row.playedMatches ?? 0,
      };
    });
  } catch {
    return null;
  }
}

function topBy(
  standings: LeagueStandings,
  pick: (row: LeagueStandings["rows"][number]) => number,
  statLabel: string,
  limit = 4
): PremierLeagueAwardContender[] {
  return [...standings.rows]
    .sort((a, b) => pick(b) - pick(a) || a.position - b.position)
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      label: clubDisplayName(row.team),
      teamCode: row.team.code,
      teamName: clubDisplayName(row.team),
      crest: row.team.crest,
      stat: pick(row),
      statLabel,
    }));
}

function titleCommentary(
  contenders: PremierLeagueChanceContender[],
  progress: number
): string {
  const [leader, chase] = contenders;
  if (!leader) {
    return capForecast(
      "The title race opens with Matchday 1 — 38 games, one champion.",
      COMMENTARY_MAX
    );
  }
  if (!chase) {
    return capForecast(
      `${leader.label} lead the table on ${leader.stat} pts (about a ${leader.winChanceLabel} title chance with the matches still to play). ${progress}% of the season is played.`,
      COMMENTARY_MAX
    );
  }
  if (leader.stat === chase.stat) {
    return capForecast(
      `${leader.label} and ${chase.label} are level on ${leader.stat} pts (${leader.winChanceLabel} and ${chase.winChanceLabel} title chances). A club that cannot catch them even by winning every remaining match shows under 1%. ${progress}% of the season is played.`,
      COMMENTARY_MAX
    );
  }
  return capForecast(
    `${leader.label} lead on ${leader.stat} pts (${leader.winChanceLabel} title chance), with ${chase.label} on ${chase.stat} at ${chase.winChanceLabel}. A club that cannot catch the leader even by winning every remaining match shows under 1%. ${progress}% of the season is played.`,
    COMMENTARY_MAX
  );
}

function scorerCommentary(contenders: PremierLeagueChanceContender[], progress: number): string {
  const [leader, chase] = contenders;
  if (!leader) {
    return capForecast(
      "The Golden Boot race starts with the first goal of the season.",
      COMMENTARY_MAX
    );
  }
  if (!chase || leader.stat === chase.stat) {
    return capForecast(
      `${leader.label} (${leader.teamName}) leads the scoring charts with ${leader.stat} ${leader.statLabel} (${leader.winChanceLabel} projected). A player who cannot catch up even with a hat-trick in every match left shows under 1%. ${progress}% of the campaign is done.`,
      COMMENTARY_MAX
    );
  }
  return capForecast(
    `${leader.label} leads on ${leader.stat} ${leader.statLabel} (${leader.winChanceLabel} projected), chased by ${chase.label} on ${chase.stat} (${chase.winChanceLabel}). Rates are blended toward the scoring average, and the spread tightens as the matches run out.`,
    COMMENTARY_MAX
  );
}

export async function buildPremierLeagueAwards(
  standings: LeagueStandings,
  _matches: MatchInfo[]
): Promise<PremierLeagueAwardsModel> {
  const progress = footballSeasonProgress(standings.rows.map((row) => row.played));
  const seasonNotStarted = standings.rows.every((row) => row.played === 0);
  const chanceAwards: PremierLeagueChanceAward[] = [];

  if (seasonNotStarted) {
    chanceAwards.push({
      id: "title",
      name: "Premier League Title",
      sponsor: "Championship race",
      emoji: "🏆",
      description:
        "Projected final points from the current rate, blended toward the league average. The spread tightens as the matches run out.",
      progress: 0,
      contenders: [],
      commentary: capForecast(
        "The contestants are yet to be seen — 20 clubs, blank scorecards, and a whole lot of optimism. Kickoff writes the first chapter.",
        COMMENTARY_MAX
      ),
    });
  } else {
    const titleRows = standings.rows.slice(0, 5);
    const titleChances = footballTitleChances(
      titleRows.map((row) => row.points),
      titleRows.map((row) => row.played),
      {
        totals: standings.rows.map((row) => row.points),
        played: standings.rows.map((row) => row.played),
      }
    );
    const titleContenders: PremierLeagueChanceContender[] = titleRows.map((row, index) => ({
      rank: index + 1,
      label: clubDisplayName(row.team),
      teamCode: row.team.code,
      teamName: clubDisplayName(row.team),
      crest: row.team.crest,
      stat: row.points,
      statLabel: "pts",
      ...chanceFields(titleChances, index),
    }));
    chanceAwards.push({
      id: "title",
      name: "Premier League Title",
      sponsor: "Championship race",
      emoji: "🏆",
      description:
        "Projected final points from the current rate, blended toward the league average. The spread tightens as the matches run out.",
      progress,
      contenders: titleContenders,
      commentary: titleCommentary(titleContenders, progress),
    });
  }

  const scorers = await fetchPremierLeagueScorers();
  if (scorers && scorers.length > 0) {
    const playedByCode = new Map(standings.rows.map((row) => [row.team.code, row.played]));
    const scorerRows = scorers.map((row) => {
      const teamPlayed = playedByCode.get(row.teamCode) ?? 0;
      const played =
        (row.playedMatches ?? 0) > 0
          ? row.playedMatches!
          : Math.max(teamPlayed, row.stat > 0 ? 1 : 0);
      return {
        ...row,
        played,
        remaining: Math.max(0, FOOTBALL_MATCHES_PER_TEAM - teamPlayed),
      };
    });
    const shown = scorerRows.slice(0, 5);
    const scorerChances = footballScorerChances(
      shown.map((row) => ({
        goals: row.stat,
        played: row.played,
        remaining: row.remaining,
      })),
      {
        totals: scorerRows.map((row) => row.stat),
        played: scorerRows.map((row) => row.played),
      }
    );
    const scorerContenders: PremierLeagueChanceContender[] = shown.map((row, index) => ({
      ...row,
      rank: index + 1,
      ...chanceFields(scorerChances, index),
    }));
    chanceAwards.push({
      id: "golden-boot",
      name: "Golden Boot",
      sponsor: "Top scorer race",
      emoji: "⚽",
      description:
        "Projected goals from the scoring rate and the matches the club has left. A player who cannot catch up even with a hat-trick every match left shows under 1%.",
      progress,
      contenders: scorerContenders,
      commentary: scorerCommentary(scorerContenders, progress),
    });
  }

  const tableAwards: PremierLeagueAward[] = [];

  tableAwards.push({
    id: "attack",
    name: "Top attack",
    emoji: "🔥",
    description: "Highest goals scored — the league's most prolific attacks.",
    contenders: topBy(standings, (r) => r.goalsFor, "GF"),
  });

  tableAwards.push({
    id: "defense",
    name: "Best defence",
    emoji: "🧱",
    description: "Fewest goals conceded. Same table maths, opposite end.",
    contenders: [...standings.rows]
      .filter((r) => r.played > 0)
      .sort((a, b) => a.goalsAgainst - b.goalsAgainst || a.position - b.position)
      .slice(0, 4)
      .map((row, index) => ({
        rank: index + 1,
        label: clubDisplayName(row.team),
        teamCode: row.team.code,
        teamName: clubDisplayName(row.team),
        crest: row.team.crest,
        stat: row.goalsAgainst,
        statLabel: "GA",
      })),
  });

  return { chanceAwards, tableAwards };
}
