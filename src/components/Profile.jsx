import { useState } from 'react';
import { DEFAULT_PROFILE, reset, getRank } from '../lib/progress.js';
import { getCurrentUser, logoutUser, updateCurrentUser } from '../lib/auth.js';
import { transliterate } from '../lib/transliterate.js';
import AuthModal from './AuthModal.jsx';

export default function Profile({ state, update }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const currentUser = getCurrentUser();
  const profile = currentUser ? (currentUser.profile || DEFAULT_PROFILE) : (state.profile || DEFAULT_PROFILE);

  const handleChange = (key, value) => {
    if (currentUser) {
      updateCurrentUser((user) => {
        if (!user.profile) user.profile = structuredClone(DEFAULT_PROFILE);
        user.profile[key] = value;
      });
    }
    update((s) => {
      if (!s.profile) s.profile = structuredClone(DEFAULT_PROFILE);
      s.profile[key] = value;
    });
  };

  const handleLogout = () => {
    logoutUser();
    setStatusMsg('Logged out successfully.');
    setTimeout(() => setStatusMsg(''), 3000);
    window.location.reload();
  };

  const handleExport = () => {
    const exportData = currentUser ? currentUser : state;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `futhorc_profile_${(profile.name || 'user').toLowerCase().replace(/\s+/g, '_')}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (currentUser) {
          updateCurrentUser((u) => {
            if (imported.profile) u.profile = imported.profile;
            if (imported.progress) u.progress = imported.progress;
          });
        }
        update((s) => {
          Object.assign(s, imported);
        });
        setStatusMsg('Profile and progress imported successfully!');
        setTimeout(() => setStatusMsg(''), 3000);
      } catch (err) {
        alert('Invalid JSON profile file.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all progress and profile data? This cannot be undone.')) {
      reset();
      window.location.reload();
    }
  };

  const xp = currentUser ? (currentUser.progress?.xp || 0) : (state.xp || 0);
  const rank = getRank(xp);

  if (!currentUser) {
    return (
      <div className="stack" style={{ maxWidth: '460px', margin: '2rem auto' }}>
        {showAuthModal && (
          <AuthModal
            onAuthSuccess={() => {
              setShowAuthModal(false);
              window.location.reload();
            }}
            onClose={() => setShowAuthModal(false)}
          />
        )}
        <div className="card center stack" style={{ padding: '2rem' }}>
          <div style={{ fontSize: '3rem', color: 'var(--accent)' }}>🔒</div>
          <h2>Profile Access Required</h2>
          <p className="muted small">
            Please log in or sign up for an account to view and customize your personal profile details and custom worksheets.
          </p>
          <button className="btn primary" onClick={() => setShowAuthModal(true)}>
            🔑 Log In / Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {showAuthModal && (
        <AuthModal
          onAuthSuccess={() => {
            setShowAuthModal(false);
            window.location.reload();
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      <div className="spread">
        <div>
          <h1>Profile & Account Settings</h1>
          <p className="muted">
            Manage your password-protected account and customize your personal worksheet details.
          </p>
        </div>
        <div className="pill accent" style={{ fontSize: '1rem', padding: '0.4rem 0.9rem' }}>
          {rank.badge} {rank.title} ({xp} XP)
        </div>
      </div>

      {statusMsg && <div className="feedback ok">{statusMsg}</div>}

      {/* Account Authentication Banner */}
      <div className="card spread" style={{ background: 'var(--surface-2)' }}>
        <div className="row" style={{ gap: '0.75rem' }}>
          <div style={{ fontSize: '2rem' }}>👤</div>
          <div>
            {currentUser ? (
              <>
                <strong style={{ fontSize: '1.1rem' }}>{currentUser.username}</strong>
                <div className="small muted">Email: {currentUser.email || 'None'} · Password Protected Account</div>
              </>
            ) : (
              <>
                <strong style={{ fontSize: '1.1rem' }}>Guest Scribe</strong>
                <div className="small muted">You are currently using a local guest profile. Sign up or log in to sync progress across sessions!</div>
              </>
            )}
          </div>
        </div>

        <div className="row" style={{ gap: '0.5rem' }}>
          {currentUser ? (
            <button className="btn small ghost" onClick={handleLogout}>Log Out</button>
          ) : (
            <>
              <button className="btn small primary" onClick={() => setShowAuthModal(true)}>Sign Up / Log In</button>
            </>
          )}
        </div>
      </div>

      {/* Profile Details Form */}
      <div className="card stack">
        <h2>Personal Details for Worksheets</h2>
        <p className="small muted">
          Fill in your details below. Your personal worksheets will generate custom runic exercises based on your inputs.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <ProfileField
            label="Your Full Name"
            value={profile.name || ''}
            onChange={(val) => handleChange('name', val)}
          />
          <ProfileField
            label="Birthday / Date of Birth"
            value={profile.birthday || ''}
            onChange={(val) => handleChange('birthday', val)}
          />
          <ProfileField
            label="Hometown / Place of Birth"
            value={profile.hometown || ''}
            onChange={(val) => handleChange('hometown', val)}
          />
          <ProfileField
            label="Address / Current Residence"
            value={profile.address || ''}
            onChange={(val) => handleChange('address', val)}
          />
          <ProfileField
            label="Job / Occupation"
            value={profile.job || ''}
            onChange={(val) => handleChange('job', val)}
          />
          <ProfileField
            label="Mother's Name"
            value={profile.mother || ''}
            onChange={(val) => handleChange('mother', val)}
          />
          <ProfileField
            label="Father's Name"
            value={profile.father || ''}
            onChange={(val) => handleChange('father', val)}
          />
          <ProfileField
            label="Partner / Spouse Name"
            value={profile.partner || ''}
            onChange={(val) => handleChange('partner', val)}
          />
          <ProfileField
            label="Children's Names"
            value={profile.children || ''}
            onChange={(val) => handleChange('children', val)}
          />
          <ProfileField
            label="Pet Names"
            value={profile.petNames || ''}
            onChange={(val) => handleChange('petNames', val)}
          />
          <ProfileField
            label="Favorite Food"
            value={profile.favoriteFood || ''}
            onChange={(val) => handleChange('favoriteFood', val)}
          />
          <ProfileField
            label="Favorite Color"
            value={profile.favoriteColor || ''}
            onChange={(val) => handleChange('favoriteColor', val)}
          />
          <ProfileField
            label="Hobby / Interest"
            value={profile.hobby || ''}
            onChange={(val) => handleChange('hobby', val)}
          />
        </div>
      </div>

      {/* Export / Import Data */}
      <div className="card stack">
        <h3>Backup & Progress Transfer</h3>
        <p className="small muted">
          Export your complete progress, XP, streak, and profile to a JSON file to transfer between devices.
        </p>
        <div className="row">
          <button className="btn small" onClick={handleExport}>📥 Export Profile JSON</button>
          <label className="btn small ghost" style={{ cursor: 'pointer' }}>
            📤 Import Profile JSON
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <span className="grow" />
          <button className="btn small ghost" style={{ color: 'var(--bad)' }} onClick={handleReset}>
            Reset Account Progress
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value, onChange }) {
  const runic = value ? transliterate(value).text : '';
  return (
    <div className="stack" style={{ gap: '0.25rem' }}>
      <label className="field">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <div className="small muted row" style={{ gap: '0.4rem', marginTop: '0.1rem' }}>
          <span>Runes:</span>
          <span className="rune" style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>{runic}</span>
        </div>
      )}
    </div>
  );
}
