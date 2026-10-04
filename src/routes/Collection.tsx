import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { BackIcon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { TopicCard } from '../components/TopicCard';
import { answeredRounds, dayLabel } from '../lib/activity';
import { mmss } from '../lib/format';
import type { Session } from '../lib/sessions';
import { CATEGORIES, TOPICS, type Category, type Difficulty, type Topic } from '../lib/topics';
import './Collection.css';

/*
 * The card collection (handoff §4.7). Every topic is a card, collected by
 * answering it — a saved round of 10 seconds or more, the same rule as Prep's
 * "you've answered this one before". Nothing new is stored: the collection is
 * read from saved rounds, so it follows the account between devices.
 *
 * Collected cards show their face. The rest show their back, with category and
 * rarity but not the topic, so finding one is still a small surprise.
 */

const ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

type Filter = Category | 'all';

export default function Collection() {
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<Topic | null>(null);

  // Rounds on each collected topic, newest first.
  const byTopic = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of answeredRounds()) map.set(s.topicId, [...(map.get(s.topicId) ?? []), s]);
    for (const list of map.values()) list.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
    return map;
  }, []);

  const collected = TOPICS.filter((t) => byTopic.has(t.id)).length;
  const categories = filter === 'all' ? CATEGORIES : CATEGORIES.filter((c) => c.value === filter);

  return (
    <div className="screen collection">
      <div className="screen__column">
        <header className="collection__header">
          <Link to="/" className="icon-button" aria-label="Back to home">
            <BackIcon />
          </Link>
          <h1 className="collection__title">Collection</h1>
          <span className="collection__spacer" aria-hidden="true" />
        </header>

        <section className="collection__summary">
          <p className="collection__count">
            <span className="collection__number">{collected}</span> of {TOPICS.length}
          </p>
          <p className="collection__lede">
            {collected === 0
              ? 'Answer a topic for ten seconds or more and its card is yours.'
              : 'cards collected. Answer a new topic and its card turns face up.'}
          </p>
          <div
            className="collection__bar"
            role="progressbar"
            aria-label="Cards collected"
            aria-valuemin={0}
            aria-valuemax={TOPICS.length}
            aria-valuenow={collected}
          >
            <span style={{ width: `${(collected / TOPICS.length) * 100}%` }} />
          </div>
        </section>

        <div className="collection__filters" role="group" aria-label="Show category">
          {([{ value: 'all', label: 'All' }, ...CATEGORIES] as { value: Filter; label: string }[]).map((c) => (
            <button
              key={c.value}
              type="button"
              className="collection__filter"
              aria-pressed={filter === c.value}
              onClick={() => setFilter(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <main className="collection__sections">
          {categories.map((c) => {
            const cards = TOPICS.filter((t) => t.category === c.value).sort(
              (a, b) => ORDER[a.difficulty] - ORDER[b.difficulty],
            );
            const have = cards.filter((t) => byTopic.has(t.id)).length;
            return (
              <section key={c.value} className="collection__section" aria-labelledby={`cat-${c.value}`}>
                <h2 className="collection__section-title" id={`cat-${c.value}`}>
                  <span>{c.label}</span>
                  <span className="collection__section-count">
                    {have} of {cards.length}
                  </span>
                </h2>
                <ul className="collection__grid">
                  {cards.map((t) => {
                    const rounds = byTopic.get(t.id);
                    return (
                      <li key={t.id}>
                        {rounds ? (
                          <TopicCard
                            topic={t}
                            side="face"
                            onClick={() => setOpen(t)}
                            label={`${t.text} Answered ${rounds.length} ${rounds.length === 1 ? 'time' : 'times'}.`}
                            foot={`${rounds.length > 1 ? `×${rounds.length} · ` : ''}${dayLabel(Date.parse(rounds[0].startedAt))}`}
                          />
                        ) : (
                          <TopicCard topic={t} side="back" label={`Not collected yet: a ${t.difficulty} ${c.label} card`} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </main>
      </div>

      <Sheet open={open !== null} title={open?.text ?? ''} onCancel={() => setOpen(null)}>
        {open && (
          <>
            <p className="sheet__text">
              Answered {byTopic.get(open.id)!.length === 1 ? 'once' : `${byTopic.get(open.id)!.length} times`}.
              Open a round to hear it back.
            </p>
            <ul className="collection__rounds">
              {byTopic.get(open.id)!.map((s) => (
                <li key={s.id}>
                  <Link to={`/history/${s.id}`} className="collection__round">
                    <span>{dayLabel(Date.parse(s.startedAt))}</span>
                    <span className="collection__round-time">{mmss(s.spokenSeconds)} spoken</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="sheet__actions">
              <Button variant="secondary" onClick={() => setOpen(null)} data-autofocus>
                Close
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
