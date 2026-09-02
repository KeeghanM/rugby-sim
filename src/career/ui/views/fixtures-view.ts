import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import type { Career, Fixture } from "../../domain/index.ts";
import { formatDate, fixtureTeams } from "../formatters.ts";

const FIXTURES_STYLES = `
  .career-rounds {
    display: grid;
    gap: 1.4rem;
  }
  .career-round {
    border-left: 3px solid #334155;
    border-radius: 0 0.45rem 0.45rem 0;
    background: rgba(15, 23, 42, 0.4);
    padding: 0.75rem 1rem;
  }
  .career-round.current {
    border-color: var(--club, #38bdf8);
    background: rgba(56, 189, 248, 0.05);
  }
  .career-round h3 {
    margin: 0 0 0.6rem;
    font-size: 0.92rem;
    font-weight: 750;
    color: #f8fafc;
  }
  .career-fixture {
    display: grid;
    grid-template-columns: 8rem 1fr 4.5rem 1fr;
    align-items: center;
    border-top: 1px solid rgb(255 255 255 / 8%);
    padding: 0.6rem 0.4rem;
    font-size: 0.82rem;
  }
  .career-fixture.managed {
    background: rgba(56, 189, 248, 0.1);
    font-weight: 700;
  }
  .career-fixture time {
    color: #94a3b8;
    font-size: 0.74rem;
  }
  .career-fixture .home {
    text-align: right;
    color: #f8fafc;
  }
  .career-fixture strong {
    text-align: center;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #38bdf8;
  }
`;

registerStyles("career-fixtures", FIXTURES_STYLES);

export const renderFixture = (career: Career, fixture: Fixture): string => {
  const { home, away } = fixtureTeams(career, fixture);
  const managed =
    home.id === career.managedClubId || away.id === career.managedClubId;
  return `<div class="career-fixture ${managed ? "managed" : ""}">
    <time>${formatDate(fixture.date)}</time>
    <span class="fixture-club home">${escapeHtml(home.name)}</span>
    <strong>${fixture.result ? `${fixture.result.homeScore} - ${fixture.result.awayScore}` : "v"}</strong>
    <span class="fixture-club">${escapeHtml(away.name)}</span>
  </div>`;
};

export const renderFixtures = (
  career: Career,
): string => `<section class="career-section">
  <header>
    <div>
      <span class="career-kicker">Full calendar</span>
      <h2>Fixtures & results</h2>
    </div>
    <span>10 rounds</span>
  </header>
  <div class="career-rounds">${Array.from(
    { length: 10 },
    (_, index) => index + 1,
  )
    .map(
      (round) =>
        `<section class="career-round ${round === career.currentRound ? "current" : ""}">
          <h3>Round ${round}</h3>
          ${career.season.fixtures
            .filter((fixture) => fixture.round === round)
            .map((fixture) => renderFixture(career, fixture))
            .join("")}
        </section>`,
    )
    .join("")}</div>
</section>`;
