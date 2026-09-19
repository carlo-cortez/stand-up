import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BackIcon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { applyTheme, loadSettings, saveSettings, type Theme } from '../lib/settings';
import './Setup.css';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/*
 * Phase 1 settings are theme only. The two delete-everything actions arrive
 * with recordings in Phase 2 — until there is data, there is nothing to delete.
 */
export default function Settings() {
  const [theme, setTheme] = useState<Theme>(() => loadSettings().theme);

  const change = (next: Theme) => {
    setTheme(next);
    saveSettings({ theme: next });
    applyTheme(next);
  };

  return (
    <div className="screen setup">
      <div className="screen__column">
        <header className="setup__header">
          <Link to="/" className="icon-button" aria-label="Back to home">
            <BackIcon />
          </Link>
          <h1 className="setup__title">Settings</h1>
          <span className="setup__spacer" aria-hidden="true" />
        </header>
        <div className="setup__form">
          <SegmentedControl legend="Theme" name="theme" options={THEME_OPTIONS} value={theme} onChange={change} />
        </div>
      </div>
    </div>
  );
}
