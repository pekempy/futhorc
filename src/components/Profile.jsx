import { useState } from 'react';
import { DEFAULT_PROFILE, reset, getRank } from '../lib/progress.js';
import { transliterate } from '../lib/transliterate.js';
import { RUNES } from '../data/runes.js';
import { UNITS } from '../data/lessons.js';
import { accuracy, learnedCount } from '../lib/progress.js';

/**
 * You, your progress, and the words you want to practise writing.
 *
 * The old version of this screen asked for your date of birth, home address,
 * mother's and father's names - the exact set of answers used to recover
 * accounts elsewhere - and posted them to a server endpoint anyone could read.
 * The personalisation was a good idea; the collection and the storage were not.
 *
 * What's left is a free-form list of words you'd like to write in runes. It
 * never leaves this browser, except into your own hidden Drive folder if you
 * connect Drive. Nothing here is required, and none of it is an identity.
 */
export default function Profile({ state, update, user, onSignIn, onSignOut, signingIn }) {
  const [statusMsg, setStatusMsg] = useState('');

  const profile = state.profile || DEFAULT_PROFILE;
  const xp = state.xp || 0;
  const rank = getRank(xp);

  const say = (msg) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(''), 3000); };

  const handleChange = (key, value) => {
    update((s) => {
      if (!s.profile) s.profile = structuredClone(DEFAULT_PROFILE);
      s.profile[key] = value;
    });
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'futhorc-progress.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        update((s) => { Object.assign(s, imported); });
        say('Progress imported.');
      } catch {
        alert('That file isn\'t valid Futhorc progress.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Erase all progress and start again? This cannot be undone.')) {
      reset();
      window.location.reload();
    }
  };

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1>You</h1>
          <p className="muted">Your progress, and the words you'd like to practise.</p>
        </div>
        <div className="pill accent" style={{ fontSize: '1rem', padding: '0.4rem 0.9rem' }}>
          {rank.badge} {rank.title} ({xp} XP)
        </div>
      </div>

      {statusMsg && <div className="feedback ok">{statusMsg}</div>}

      <section className="stat-row">
        <div className="stat"><div className="v">{state.completedUnits.length}<span className="muted small">/{UNITS.length}</span></div><div className="k">Units done</div></div>
        <div className="stat"><div className="v">{learnedCount(state)}<span className="muted small">/{RUNES.length}</span></div><div className="k">Runes solid</div></div>
        <div className="stat"><div className="v">{accuracy(state) === null ? '-' : `${accuracy(state)}%`}</div><div className="k">Accuracy</div></div>
        <div className="stat"><div className="v">{state.streak || 0}</div><div className="k">Day streak</div></div>
      </section>

      <section className="card spread">
        <div className="row" style={{ gap: '0.75rem' }}>
          {user?.picture && <img src={user.picture} alt="" width="40" height="40" style={{ borderRadius: '50%' }} />}
          <div>
            {user ? (
              <>
                <strong style={{ fontSize: '1.05rem' }}>{user.name || user.email}</strong>
                <div className="small muted">
                  Signed in with Google · progress syncs to a hidden folder in your Drive
                </div>
              </>
            ) : (
              <>
                <strong style={{ fontSize: '1.05rem' }}>Not signed in</strong>
                <div className="small muted">
                  Everything works without an account - it just stays on this device.
                  Sign in with Google to carry your progress to another browser or the phone app.
                </div>
              </>
            )}
          </div>
        </div>
        <div className="row" style={{ gap: '0.5rem' }}>
          {user
            ? <button className="btn small ghost" onClick={onSignOut}>Sign out</button>
            : <button className="btn small primary" onClick={onSignIn} disabled={signingIn}>
                {signingIn ? 'Signing in…' : 'Sign in with Google'}
              </button>}
        </div>
      </section>

      <section className="card stack">
        <h2>Words you want to write</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Practice sheets and worksheets will use these, so you get to write things
          you actually care about rather than <em>the cat sat on the mat</em>.
          Kept on this device only - don't put anything here you'd mind losing.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <ProfileField
            label="What should we call you?"
            value={profile.name || ''}
            onChange={(v) => handleChange('name', v)}
          />
          <ProfileField
            label="People you'd like to write about"
            hint="First names, separated by commas"
            value={profile.people || ''}
            onChange={(v) => handleChange('people', v)}
          />
          <ProfileField
            label="Places that mean something to you"
            hint="Towns, streets, countries"
            value={profile.places || ''}
            onChange={(v) => handleChange('places', v)}
          />
          <ProfileField
            label="Things you like"
            hint="Food, colours, animals - anything"
            value={profile.likes || ''}
            onChange={(v) => handleChange('likes', v)}
          />
          <ProfileField
            label="What you do"
            hint="Job, study, or how you spend your time"
            value={profile.job || ''}
            onChange={(v) => handleChange('job', v)}
          />
          <ProfileField
            label="A hobby or interest"
            value={profile.hobby || ''}
            onChange={(v) => handleChange('hobby', v)}
          />
        </div>
      </section>

      <section className="card stack">
        <h3>Move your progress</h3>
        <p className="small muted" style={{ margin: 0 }}>
          A plain JSON file, if you'd rather not use Drive.
        </p>
        <div className="row">
          <button className="btn small" onClick={handleExport}>Export</button>
          <label className="btn small ghost" style={{ cursor: 'pointer' }}>
            Import
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <span className="grow" />
          <button className="btn small ghost" style={{ color: 'var(--bad)' }} onClick={handleReset}>
            Start again
          </button>
        </div>
      </section>
    </div>
  );
}

function ProfileField({ label, hint, value, onChange }) {
  const runic = value ? transliterate(value).text : '';
  return (
    <div className="stack" style={{ gap: '0.25rem' }}>
      <label className="field">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && !value && <div className="tiny muted">{hint}</div>}
      {value && (
        <div className="small muted row" style={{ gap: '0.4rem', marginTop: '0.1rem' }}>
          <span>Runes:</span>
          <span className="rune" style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>{runic}</span>
        </div>
      )}
    </div>
  );
}
