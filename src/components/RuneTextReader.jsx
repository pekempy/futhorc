import { useState } from 'react';
import SpeakButton from './SpeakButton.jsx';

/**
 * Renders runic text with live word-by-word audio highlighting when played aloud.
 */
export default function RuneTextReader({ runic, label = 'Listen', className = 'rune', fontSize, style = {} }) {
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  if (!runic) return null;

  // Split into runic words and punctuation/separator delimiters
  const parts = runic.split(/([\s᛫,.:;!?]+)/);
  let wordCounter = 0;

  return (
    <div className="rune-reader-container stack" style={{ gap: '0.6rem' }}>
      <div
        className={className}
        style={{
          fontSize,
          lineHeight: 1.8,
          wordBreak: 'break-word',
          ...style,
        }}
      >
        {parts.map((part, idx) => {
          const isWord = /[^\s᛫,.:;!?]/.test(part);
          const currentWordIdx = isWord ? wordCounter++ : -1;
          const isActive = isWord && currentWordIdx === activeWordIndex;

          if (!isWord) return <span key={idx}>{part}</span>;

          return (
            <span
              key={idx}
              className={`rune-word-item ${isActive ? 'active-reading-word' : ''}`}
              style={{
                backgroundColor: isActive ? 'var(--accent-soft, rgba(217, 163, 67, 0.25))' : 'transparent',
                color: isActive ? 'var(--accent, #d9a343)' : 'inherit',
                borderRadius: '4px',
                padding: '0.12rem 0.25rem',
                margin: '0 -0.1rem',
                boxShadow: isActive ? '0 0 0 1.5px var(--accent, #d9a343)' : 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              {part}
            </span>
          );
        })}
      </div>
      <div className="row">
        <SpeakButton runic={runic} label={label} onWordChange={setActiveWordIndex} />
      </div>
    </div>
  );
}
