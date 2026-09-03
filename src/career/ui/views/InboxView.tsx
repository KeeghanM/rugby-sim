import type React from 'react'
import { clubById, formatDist } from '../formatters.ts'
import { useCareerStore } from '../store.ts'

export const InboxView: React.FC = () => {
  const career = useCareerStore((state) => state.career)
  const selectedMessageId = useCareerStore((state) => state.selectedMessageId)
  const setSelectedMessageId = useCareerStore((state) => state.setSelectedMessageId)
  const readInboxMessage = useCareerStore((state) => state.readInboxMessage)
  const deleteInboxMessageById = useCareerStore((state) => state.deleteInboxMessageById)
  const clearReadMessages = useCareerStore((state) => state.clearReadMessages)
  const setViewPlayerId = useCareerStore((state) => state.setViewPlayerId)

  if (!career) return null

  const selectedMsg = career.inbox.find((m) => m.id === selectedMessageId)

  // If viewing a match report message
  if (selectedMsg?.matchReport) {
    const report = selectedMsg.matchReport
    const isHome = report.homeClubId === career.managedClubId
    const userScore = isHome ? report.homeScore : report.awayScore
    const oppScore = isHome ? report.awayScore : report.homeScore
    const won = userScore > oppScore
    const drawn = userScore === oppScore
    const outcomeText = drawn ? 'DRAW' : won ? 'VICTORY' : 'DEFEAT'
    const outcomeColor = drawn ? '#facc15' : won ? '#4ade80' : '#ef4444'

    const hStats = report.homeTeamStats
    const aStats = report.awayTeamStats

    const myClub = clubById(career, career.managedClubId)
    const mySquadIds = new Set(myClub.squad.map((p) => p.id))
    const myPlayers = report.players
      ? report.players
          .filter((p) => p.clubId === career.managedClubId || mySquadIds.has(p.playerId))
          .sort((a, b) => a.number - b.number)
      : []

    return (
      <section className="career-section">
        <header style={{ flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              width: '100%',
              marginBottom: '0.5rem',
            }}
          >
            <button
              type="button"
              className="career-secondary-btn"
              onClick={() => setSelectedMessageId(null)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              ← Back to Inbox
            </button>
            <button
              type="button"
              className="career-swap-btn"
              onClick={() => deleteInboxMessageById(selectedMsg.id)}
              style={{
                color: '#f87171',
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                marginLeft: 'auto',
              }}
            >
              🗑 Delete Message
            </button>
          </div>
          <div>
            <span className="career-kicker">Round {report.round} Official Match Report</span>
            <h2>{selectedMsg.title}</h2>
          </div>
          <span
            className="group-tag"
            style={{
              background: `${outcomeColor}22`,
              color: outcomeColor,
              borderColor: `${outcomeColor}55`,
              fontSize: '0.85rem',
              padding: '0.25rem 0.6rem',
            }}
          >
            {outcomeText}
          </span>
        </header>

        {/* Scoreboard Display */}
        <div
          className={`match-report-scoreboard ${won ? 'win' : drawn ? 'draw' : 'loss'}`}
          style={{
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgb(255 255 255 / 15%)',
            borderRadius: '0.65rem',
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1.25rem',
          }}
        >
          <div
            className="match-report-score-label"
            style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '0.4rem',
            }}
          >
            FULL TIME SCORE
          </div>
          <div
            className="match-report-scoreline"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1.5rem',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#f8fafc',
              flexWrap: 'wrap',
            }}
          >
            <span>{report.homeClubName}</span>
            <span
              style={{
                fontFamily: 'ui-monospace, monospace',
                color: '#38bdf8',
                fontSize: '2.2rem',
              }}
            >
              {report.homeScore} - {report.awayScore}
            </span>
            <span>{report.awayClubName}</span>
          </div>
        </div>

        {/* Contest & Set Piece Comparison */}
        {hStats && aStats && (
          <div
            className="match-report-comparison"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgb(255 255 255 / 10%)',
              borderRadius: '0.55rem',
              padding: '1.25rem',
              marginBottom: '1.25rem',
            }}
          >
            <span className="career-kicker" style={{ marginBottom: '0.75rem', display: 'block' }}>
              Set Piece & Breakdown Stats
            </span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                textAlign: 'center',
                fontSize: '0.82rem',
              }}
            >
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.6rem',
                  borderRadius: '0.35rem',
                }}
              >
                <span
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.68rem',
                    display: 'block',
                  }}
                >
                  RUCKS WON
                </span>
                <strong>
                  {hStats.rucksWon}/{hStats.rucksWon + hStats.rucksLost}
                </strong>{' '}
                vs{' '}
                <strong>
                  {aStats.rucksWon}/{aStats.rucksWon + aStats.rucksLost}
                </strong>
              </div>
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.6rem',
                  borderRadius: '0.35rem',
                }}
              >
                <span
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.68rem',
                    display: 'block',
                  }}
                >
                  SCRUMS WON
                </span>
                <strong>
                  {hStats.scrumsWon}/{hStats.scrumsWon + hStats.scrumsLost}
                </strong>{' '}
                vs{' '}
                <strong>
                  {aStats.scrumsWon}/{aStats.scrumsWon + aStats.scrumsLost}
                </strong>
              </div>
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.6rem',
                  borderRadius: '0.35rem',
                }}
              >
                <span
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.68rem',
                    display: 'block',
                  }}
                >
                  LINEOUTS WON
                </span>
                <strong>
                  {hStats.lineoutsWon}/{hStats.lineoutsWon + hStats.lineoutsLost}
                </strong>{' '}
                vs{' '}
                <strong>
                  {aStats.lineoutsWon}/{aStats.lineoutsWon + aStats.lineoutsLost}
                </strong>
              </div>
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.6rem',
                  borderRadius: '0.35rem',
                }}
              >
                <span
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.68rem',
                    display: 'block',
                  }}
                >
                  MAULS WON
                </span>
                <strong>
                  {hStats.maulsWon}/{hStats.maulsWon + hStats.maulsLost}
                </strong>{' '}
                vs{' '}
                <strong>
                  {aStats.maulsWon}/{aStats.maulsWon + aStats.maulsLost}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Individual Match Player Stats */}
        {myPlayers.length > 0 && (
          <div>
            <span className="career-kicker" style={{ marginBottom: '0.5rem', display: 'block' }}>
              {myClub.name} Player Match Ratings & Performance
            </span>
            <div className="career-table-wrap">
              <table className="career-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                    <th>Player</th>
                    <th>Position Slot</th>
                    <th style={{ textAlign: 'right' }}>Distance</th>
                    <th style={{ textAlign: 'right' }}>Carried</th>
                    <th style={{ textAlign: 'center' }}>Tackles</th>
                    <th style={{ textAlign: 'center' }}>Tries</th>
                    <th style={{ textAlign: 'center' }}>Breaks</th>
                    <th style={{ textAlign: 'center' }}>Passes</th>
                    <th style={{ textAlign: 'center' }}>Kicks</th>
                    <th style={{ textAlign: 'center' }}>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {myPlayers.map((p) => {
                    const s = p.stats
                    const tacklesTotal = s.tacklesMade + s.tacklesMissed
                    return (
                      <tr key={p.playerId}>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="player-num-badge"
                            style={{
                              background: myClub.color,
                              width: '22px',
                              height: '22px',
                              fontSize: '0.7rem',
                            }}
                          >
                            {p.number}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="career-link-btn" onClick={() => setViewPlayerId(p.playerId)}>
                            <strong>{p.name}</strong>
                          </button>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.role}</td>
                        <td style={{ textAlign: 'right' }}>{formatDist(s.distanceCovered)}</td>
                        <td style={{ textAlign: 'right', color: '#38bdf8' }}>{formatDist(s.distanceCarried)}</td>
                        <td style={{ textAlign: 'center' }}>
                          {s.tacklesMade}/{tacklesTotal}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            color: s.triesScored > 0 ? '#facc15' : 'inherit',
                            fontWeight: s.triesScored > 0 ? 800 : 'inherit',
                          }}
                        >
                          {s.triesScored}
                        </td>
                        <td style={{ textAlign: 'center' }}>{s.lineBreaks}</td>
                        <td style={{ textAlign: 'center' }}>
                          {s.successfulPasses}/{s.totalPasses}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {s.successfulKicks}/{s.totalKicks}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            color: s.penaltiesConceded > 0 ? '#f87171' : 'inherit',
                          }}
                        >
                          {s.penaltiesConceded}p / {s.knockOns}k / {s.forwardPasses}f
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    )
  }

  // If viewing a standard text message
  if (selectedMsg) {
    return (
      <section className="career-section">
        <header style={{ flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              width: '100%',
              marginBottom: '0.5rem',
            }}
          >
            <button
              type="button"
              className="career-secondary-btn"
              onClick={() => setSelectedMessageId(null)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              ← Back to Inbox
            </button>
            <button
              type="button"
              className="career-swap-btn"
              onClick={() => deleteInboxMessageById(selectedMsg.id)}
              style={{
                color: '#f87171',
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                marginLeft: 'auto',
              }}
            >
              🗑 Delete Message
            </button>
          </div>
          <div>
            <span className="career-kicker">Club Communication</span>
            <h2>{selectedMsg.title}</h2>
          </div>
        </header>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgb(255 255 255 / 10%)',
            borderRadius: '0.55rem',
            padding: '1.5rem',
            fontSize: '0.95rem',
            color: '#f8fafc',
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0 }}>{selectedMsg.message}</p>
        </div>
      </section>
    )
  }

  const unreadCount = career.inbox.filter((message) => !message.read).length
  const readCount = career.inbox.length - unreadCount

  return (
    <section className="career-section">
      <header style={{ flexWrap: 'wrap' }}>
        <div>
          <span className="career-kicker">Club communications</span>
          <h2>Inbox</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {unreadCount} unread · {career.inbox.length} total
          </span>
          {readCount > 0 && (
            <button
              type="button"
              className="career-secondary-btn"
              onClick={clearReadMessages}
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
            >
              Clear Read
            </button>
          )}
        </div>
      </header>
      <div className="career-inbox">
        {career.inbox.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.9rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '0.45rem',
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>📭</div>
            Your inbox is clean. No messages to display.
          </div>
        ) : (
          career.inbox.map((message) => (
            <div key={message.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
              <button
                type="button"
                onClick={() => readInboxMessage(message.id)}
                className={message.read ? 'read' : ''}
                style={{ flex: 1 }}
              >
                <i />
                <span>
                  <strong>{message.title}</strong>
                  <small>{message.message}</small>
                </span>
              </button>
              <button
                type="button"
                className="career-swap-btn"
                onClick={() => deleteInboxMessageById(message.id)}
                title="Delete message"
                style={{
                  padding: '0 0.75rem',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                }}
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
