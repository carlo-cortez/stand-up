import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { BackIcon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { newIntent } from '../lib/liveRound';
import {
  loadSettings,
  roundSettingsOf,
  saveSettings,
  type PrepSeconds,
  type RoundSettings,
  type TargetSeconds,
} from '../lib/settings';
import { CATEGORIES, DIFFICULTIES, type Category } from '../lib/topics';
import './Setup.css';

const CATEGORY_OPTIONS: { value: Category | 'surprise'; label: string }[] = [
  { value: 'surprise', label: 'Surprise me' },
  ...CATEGORIES,
];

const PREP_OPTIONS: { value: PrepSeconds; label: string }[] = [
  { value: 15, label: '15 sec' },
  { value: 30, label: '30 sec' },
  { value: 60, label: '60 sec' },
];

const TARGET_OPTIONS: { value: TargetSeconds; label: string }[] = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
];

/*
 * Handoff §4.2. The recording toggle is Phase 2 and deliberately absent:
 * nothing records yet, and a switch that does nothing would be a lie.
 */
export default function Setup() {
  const navigate = useNavigate();
  const [round, setRound] = useState<RoundSettings>(() => roundSettingsOf(loadSettings()));
  const set = <K extends keyof RoundSettings>(key: K) => (value: RoundSettings[K]) =>
    setRound((r) => ({ ...r, [key]: value }));

  const start = () => {
    // These choices become the defaults Home's big button uses next time.
    saveSettings(round);
    navigate('/round', { state: newIntent(round) });
  };

  return (
    <div className="screen setup">
      <div className="screen__column">
        <header className="setup__header">
          <Link to="/" className="icon-button" aria-label="Back to home">
            <BackIcon />
          </Link>
          <h1 className="setup__title">Set the round</h1>
          <span className="setup__spacer" aria-hidden="true" />
        </header>

        <form
          className="setup__form"
          onSubmit={(event) => {
            event.preventDefault();
            start();
          }}
        >
          <div className="setup__fields">
            <SegmentedControl
              legend="Topics"
              name="category"
              layout="pills"
              options={CATEGORY_OPTIONS}
              value={round.category}
              onChange={set('category')}
            />
            <div className="setup__grid">
              <SegmentedControl
                legend="Difficulty"
                name="difficulty"
                options={DIFFICULTIES}
                value={round.difficulty}
                onChange={set('difficulty')}
              />
              <SegmentedControl
                legend="Prep time"
                name="prep"
                options={PREP_OPTIONS}
                value={round.prepSeconds}
                onChange={set('prepSeconds')}
              />
              <SegmentedControl
                legend="Speaking time"
                name="speaking"
                options={TARGET_OPTIONS}
                value={round.targetSeconds}
                onChange={set('targetSeconds')}
              />
            </div>
          </div>

          <div className="setup__footer">
            <Button type="submit" size="large" className="setup__start">
              Start the round
            </Button>
            <p className="setup__note">These become your defaults — Home's big button skips this screen next time.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
