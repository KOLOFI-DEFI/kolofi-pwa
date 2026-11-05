import { shortDate } from '@/core/format'
import { useReputation } from '@/core/data'
import { Button, EmptyState, Eyebrow, Header, Icon, Notice, Screen, Skeleton, cx, errorText } from '@/ui'
import { Gauge } from '@/ui/charts'
import { bandOf, bands } from './bands'
import r from './reputation.module.css'

const signed = (points: number) => (points > 0 ? `+${points}` : points < 0 ? `−${Math.abs(points)}` : '0')

/* ═════════ Reputation (board 21, was "Trust score") ═════════ */
export function Reputation() {
  const { data: rep, isError, error, refetch } = useReputation()

  if (isError) {
    return (
      <Screen tabs header={<Header title="Reputation" />}>
        <EmptyState icon="info" title="Couldn’t load your reputation" action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}>
          {errorText(error)}
        </EmptyState>
      </Screen>
    )
  }
  if (!rep) {
    return (
      <Screen tabs header={<Header title="Reputation" />}>
        <div className={r.layout}>
          <Skeleton h={300} r={24} />
          <Skeleton h={300} r={24} />
        </div>
      </Screen>
    )
  }

  const band = bands.find((b) => b.key === rep.band) ?? bandOf(rep.score)
  const above = [...bands].reverse().find((b) => b.min > rep.score)
  const gained = rep.score - rep.starting_score

  return (
    <Screen tabs header={<Header title="Reputation" sub="How circles see you" />}>
      {rep.circles_barred && (
        <Notice tone="flare" icon="lock" style={{ marginBottom: 18 }}>
          <strong>You can’t join new circles right now.</strong> Your wallet and savings work as normal. Keep up any circle you’re already in to rebuild your score.
        </Notice>
      )}

      <div className={r.layout}>
        <div className={r.left}>
          {/* ── Gauge ── */}
          <section className={r.gaugeCard}>
            <Gauge value={rep.score} max={rep.max_score} size={270}>
              <div className={r.score}>{rep.score}</div>
              <Eyebrow style={{ fontSize: 10, marginTop: 4 }}>Out of {rep.max_score}</Eyebrow>
              <span className={r.band} data-band={band.key}>
                {band.label}
              </span>
            </Gauge>
            <div className={r.gaugeFoot}>
              <div>
                <span className={r.footLabel}>Started at</span>
                <span className={r.footValue}>{rep.starting_score}</span>
              </div>
              <div>
                <span className={r.footLabel}>Change</span>
                <span className={cx(r.footValue, gained > 0 && r.pos, gained < 0 && r.neg)}>{signed(gained)}</span>
              </div>
              <div>
                <span className={r.footLabel}>{above ? `To ${above.label}` : 'Band'}</span>
                <span className={r.footValue}>{above ? above.min - rep.score : 'Top'}</span>
              </div>
            </div>
          </section>

          {/* ── Phone: two-up cards from the board ── */}
          <div className={r.twoUp}>
            <div className={r.upCard}>
              <Eyebrow style={{ fontSize: 10 }}>{band.label}</Eyebrow>
              <div className={r.upText}>{band.short}</div>
            </div>
            <div className={r.nextCard}>
              <Eyebrow style={{ fontSize: 10 }}>{above ? `At ${above.min} · ${above.min - rep.score} to go` : 'Top band'}</Eyebrow>
              <div className={r.upText}>{above ? `You reach ${above.label}.` : 'Keep paying on time to stay here.'}</div>
            </div>
          </div>

          {/* ── Tablet & desktop: the band ladder ── */}
          <section className={cx(r.panel, r.ladderPanel)}>
            <h2 className={r.panelTitle}>What your band means</h2>
            <ol className={r.ladder}>
              {bands.map((b, i) => {
                const max = i === 0 ? rep.max_score : bands[i - 1]!.min - 1
                return (
                  <li key={b.key} className={cx(r.rung, b.key === band.key && r.rungOn)}>
                    <span className={r.rungRange}>
                      {b.min}–{max}
                    </span>
                    <span>
                      <span className={r.rungName}>
                        {b.label}
                        {b.key === band.key && <span className={r.you}>You</span>}
                      </span>
                      <span className={r.rungText}>{b.text}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>

          {rep.appeal && (
            <div className={r.appeal}>
              <Icon name="info" size={18} />
              <span>{rep.appeal}</span>
            </div>
          )}
        </div>

        <div className={r.right}>
          {/* ── How points work ── */}
          <section className={r.panel}>
            <div className={r.panelHead}>
              <h2 className={r.panelTitle}>How points work</h2>
              <span className={r.panelNote}>Everyone starts at {rep.starting_score}</span>
            </div>
            <div className={r.table}>
              <div className={r.thead} aria-hidden>
                <span>Event</span>
                <span>Points</span>
              </div>
              {rep.weights.map((w) => (
                <div key={w.type} className={r.weight}>
                  <span className={cx(r.sign, w.points > 0 ? r.signPos : r.signNeg)} aria-hidden>
                    {w.points > 0 ? '+' : '−'}
                  </span>
                  <span className={r.wText}>{w.description}</span>
                  <span className={cx(r.points, w.points > 0 ? r.pos : r.neg)}>{signed(w.points)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Recent changes ── */}
          <section className={r.panel}>
            <div className={r.panelHead}>
              <h2 className={r.panelTitle}>Recent changes</h2>
            </div>
            {rep.recent_events.length === 0 ? (
              <EmptyState icon="star" title="No changes yet">
                Pay circle contributions on time and finish circles to grow your score.
              </EmptyState>
            ) : (
              <div className={r.table}>
                <div className={cx(r.thead, r.historyHead)} aria-hidden>
                  <span>Event</span>
                  <span>Date</span>
                  <span>Points</span>
                  <span>Score after</span>
                </div>
                {rep.recent_events.map((e, i) => (
                  <div key={`${e.type}-${e.created_at}-${i}`} className={r.event}>
                    <span className={cx(r.eventDot, e.points >= 0 ? r.signPos : r.signNeg)} aria-hidden />
                    <span className={r.eventMain}>
                      <span className={r.eventTitle}>{e.description}</span>
                      <span className={r.eventDate}>{shortDate(e.created_at)}</span>
                    </span>
                    <span className={r.eventDateCol}>{shortDate(e.created_at)}</span>
                    <span className={cx(r.points, e.points >= 0 ? r.pos : r.neg)}>{signed(e.points)}</span>
                    <span className={r.after}>{e.score_after}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </Screen>
  )
}
