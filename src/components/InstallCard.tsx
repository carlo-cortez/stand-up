import { useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { ShareIcon } from './Icon';
import { dismissInstall, useInstall } from '../lib/install';
import './InstallCard.css';

/*
 * "Add to home screen" (handoff §4.1). On Home it waits until after the first
 * round and can be put away for good; in Settings it's always there until the
 * app is installed. Renders nothing where there's nothing useful to offer.
 */
export function InstallCard({ onDismiss }: { onDismiss?: () => void }) {
  const { installed, how, install } = useInstall();
  const [declined, setDeclined] = useState(false);

  // After a "no" there's nothing left to offer, but the card stays for this
  // visit to say where to find it, rather than vanishing mid-thought.
  if (installed || (!how && !declined)) return null;

  return (
    <Card className="install">
      <h2 className="install__title">Add Stand Up to your home screen</h2>
      <p className="install__text">
        It opens full screen, like an app, and works without a connection — one tap from your next round.
      </p>
      {declined ? null : how === 'ios' ? (
        <p className="install__steps">
          In Safari, tap <ShareIcon /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        </p>
      ) : (
        <Button
          variant="secondary"
          onClick={async () => {
            if (!(await install())) {
              setDeclined(true);
              // Home won't offer it again; Settings keeps the way in.
              if (onDismiss) dismissInstall();
            }
          }}
        >
          Add to home screen
        </Button>
      )}
      {declined && <p className="install__note">No problem. It's here in Settings whenever you want it.</p>}
      {onDismiss && !declined && (
        <button type="button" className="install__dismiss" onClick={onDismiss}>
          Not now
        </button>
      )}
    </Card>
  );
}
