import { Link } from 'react-router-dom';
import { BackIcon } from '../components/Icon';
import './Setup.css';

/** Routes whose screens aren't built yet exist so links resolve. */
export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="screen setup">
      <div className="screen__column">
        <header className="setup__header">
          <Link to="/" className="icon-button" aria-label="Back to home">
            <BackIcon />
          </Link>
          <h1 className="setup__title">{title}</h1>
          <span className="setup__spacer" aria-hidden="true" />
        </header>
        <p className="placeholder__text">Not on yet. Your rounds will be listed here soon — each one is already being kept.</p>
      </div>
    </div>
  );
}
