import { LeaderboardEntry } from '../types/game';

export function exportLeaderboardToCSV(
  roomCode: string,
  leaderboard: LeaderboardEntry[],
  eventName: string = 'PSYCH - E-Cell SVNIT'
) {
  const headers = ['Rank', 'Player Name', 'Total Score', 'Player ID'];
  const rows = leaderboard.map((entry) => [
    entry.rank,
    `"${entry.displayName.replace(/"/g, '""')}"`,
    entry.totalScore,
    `"${entry.playerId}"`,
  ]);

  const csvContent = [
    `# Event: ${eventName}`,
    `# Room Code: ${roomCode}`,
    `# Exported At: ${new Date().toISOString()}`,
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `PSYCH_${roomCode}_Leaderboard.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
