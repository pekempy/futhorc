import { getRank, addXP } from '../lib/progress.js';
import { getAccounts, getCurrentUser } from '../lib/auth.js';

export default function Leaderboard({ state, update }) {
  const currentUser = getCurrentUser();
  const xp = currentUser ? (currentUser.progress?.xp || 0) : (state.xp || 0);
  const streak = currentUser ? (currentUser.progress?.streak || 1) : (state.streak || 1);
  const bestStreak = currentUser ? (currentUser.progress?.bestStreak || 1) : (state.bestStreak || 1);
  const rank = getRank(xp);

  const dailyTasks = [
    { id: 'unit', text: 'Complete at least 1 Lesson Unit', reward: 50, done: (state.completedUnits || []).length > 0 },
    { id: 'practice', text: 'Complete a Practice session', reward: 40, done: (state.sessionCount || 0) > 0 },
    { id: 'profile', text: 'Set up your Name & Details in Profile', reward: 30, done: !!(state.profile?.name) },
  ];

  const handleClaimTask = (taskId, reward) => {
    update((s) => {
      if (!s.completedDailyTasks) s.completedDailyTasks = [];
      if (!s.completedDailyTasks.includes(taskId)) {
        s.completedDailyTasks.push(taskId);
        addXP(s, reward);
      }
    });
  };

  // Fetch real registered accounts from storage
  const registeredAccounts = getAccounts();
  const leaderboardEntries = registeredAccounts.map((acc) => {
    const userXp = acc.progress?.xp || 0;
    const userStreak = acc.progress?.streak || 1;
    const userRank = getRank(userXp);
    const isCurrent = currentUser && currentUser.id === acc.id;
    return {
      id: acc.id,
      name: acc.profile?.name || acc.username,
      username: acc.username,
      rank: userRank.title,
      badge: userRank.badge,
      xp: userXp,
      streak: userStreak,
      isUser: isCurrent,
    };
  });

  const fullLeaderboard = leaderboardEntries.sort((a, b) => b.xp - a.xp);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1>Daily Challenges & Leaderboard</h1>
          <p className="muted">
            Track your streak, complete daily challenges, and rise up the Runic Leaderboard!
          </p>
        </div>
      </div>

      {/* Streak & XP Cards */}
      <div className="stat-row">
        <div className="stat">
          <div className="v" style={{ color: 'var(--accent)' }}>🔥 {streak}</div>
          <div className="k">Day Streak</div>
        </div>
        <div className="stat">
          <div className="v">⭐ {xp}</div>
          <div className="k">Total XP</div>
        </div>
        <div className="stat">
          <div className="v">{rank.badge}</div>
          <div className="k">{rank.title}</div>
        </div>
        <div className="stat">
          <div className="v">🏆 {bestStreak}</div>
          <div className="k">Best Streak</div>
        </div>
      </div>

      {/* Daily Challenges */}
      <div className="card stack">
        <h2>📅 Today's Daily Challenges</h2>
        <div className="stack" style={{ gap: '0.6rem' }}>
          {dailyTasks.map((t) => {
            const isCompleted = (state.completedDailyTasks || []).includes(t.id) || t.done;
            return (
              <div
                key={t.id}
                className="spread"
                style={{
                  background: isCompleted ? 'var(--good-soft)' : 'var(--surface-2)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  <strong>{t.text}</strong>
                  <div className="small muted">Reward: +{t.reward} XP</div>
                </div>
                {isCompleted ? (
                  <span className="pill good">✓ Claimed (+{t.reward} XP)</span>
                ) : (
                  <button className="btn small primary" onClick={() => handleClaimTask(t.id, t.reward)}>
                    Claim +{t.reward} XP
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card stack">
        <h2>🏆 Futhorc Scholar Leaderboard</h2>
        <p className="small muted">Ranks updated dynamically based on lifetime XP earned by registered accounts.</p>

        {fullLeaderboard.length === 0 ? (
          <div className="card center stack" style={{ background: 'var(--surface-2)', padding: '1.5rem' }}>
            <div style={{ fontSize: '2.2rem' }}>📜</div>
            <h3>No Registered Accounts Yet</h3>
            <p className="small muted" style={{ maxWidth: '420px', margin: '0 auto' }}>
              Guests do not appear on the Leaderboard. Sign up or log in to feature your account, earned XP, and streak on the Leaderboard!
            </p>
          </div>
        ) : (
          <table className="chart">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Scholar</th>
                <th>Title</th>
                <th>Streak</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {fullLeaderboard.map((item, index) => (
                <tr
                  key={index}
                  style={item.isUser ? { background: 'var(--accent-soft)', fontWeight: 600 } : undefined}
                >
                  <td>#{index + 1}</td>
                  <td>
                    {item.name} {item.isUser && <span className="pill accent">You</span>}
                  </td>
                  <td>
                    {item.badge} {item.rank}
                  </td>
                  <td>🔥 {item.streak} days</td>
                  <td><strong>{item.xp} XP</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
