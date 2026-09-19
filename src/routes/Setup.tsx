import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { BackIcon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { Toggle } from '../components/Toggle';
import { checkMic } from '../lib/recorder';
import { useDesktop } from '../lib/useMediaQuery';
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
 * Handoff §4.2. The mic is asked for when the user turns recording on, never
 * on load. If it is refused, the blocked card explains, the switch goes off
 * and quiet, and the round runs unrecorded — nothing here reads as an error
 * the user caused.
 */
export default function Setup() {
  const navigate = useNavigate();
  const desktop = useDesktop();
  const [round, setRound] = useState<RoundSettings>(() => roundSettingsOf(loadSettings()));
  const [micBlocked, setMicBlocked] = useState(() => loadSettings().micBlocked);
  const recording = round.recordAudio && !micBlocked;

  const setRecording = async (on: boolean) => {
    setRound((r) => ({ ...r, recordAudio: on }));
    if (on) setMicBlocked((await checkMic()) === 'blocked');
  };

  const askAgain = async () => {
    const result = await checkMic();
    setMicBlocked(result === 'blocked');
    if (result === 'granted') setRound((r) => ({ ...r, recordAudio: true }));
  };
  const set = <K extends keyof RoundSettings>(key: K) => (value: RoundSettings[K]) =>
    setRound((r) => ({ ...r, [key]: value }));

  const start = () => {
    // These choices become the defaults Home's big button uses next time.
    // While the mic is blocked, recording stays wanted but this round goes without.
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

            {micBlocked && (
              <div className="setup__blocked">
                <p className="setup__blocked-title">The mic is blocked</p>
                <p className="setup__blocked-text">
                  Your browser turned the microphone down for this site, so there'll be no recording to play back.
                  Everything else works exactly the same — topic, timer, ratings, notes.
                </p>
                <div className="setup__blocked-actions">
                  <button type="button" className="setup__ask" onClick={() => void askAgain()}>
                    Ask again
                  </button>
                  <a
                    className="setup__how"
                    href="https://support.google.com/chrome/answer/2693767"
                    target="_blank"
                    rel="noreferrer"
                  >
                    How to unblock it
                  </a>
                </div>
              </div>
            )}

            <Toggle
              id="record-toggle"
              label="Record this round"
              description={
                micBlocked
                  ? 'Off while the mic is blocked.'
                  : desktop
                    ? 'Stays in this browser, on this device. Delete it whenever you like.'
                    : 'Stays on your device. Delete it any time.'
              }
              checked={recording}
              disabled={micBlocked}
              onChange={(on) => void setRecording(on)}
            />
          </div>

          <div className="setup__footer">
            <Button type="submit" size="large" className="setup__start">
              {micBlocked ? 'Practice without recording' : 'Start the round'}
            </Button>
            <p className="setup__note">These become your defaults — Home's big button skips this screen next time.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
