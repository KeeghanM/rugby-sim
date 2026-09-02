import { escapeHtml } from "../../../html.ts";
import { registerStyles } from "../../../ui/index.ts";
import { CLUBS } from "../../domain/index.ts";

const ONBOARDING_STYLES = `
  .career-onboarding {
    display: grid;
    grid-template-columns: minmax(320px, 0.85fr) minmax(500px, 1.15fr);
    min-height: 100dvh;
    background:
      linear-gradient(90deg, #090e17 0%, #0f172a 100%),
      repeating-linear-gradient(0deg, transparent 0 39px, rgb(56 189 248 / 3%) 40px);
  }
  .career-intro {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: clamp(2rem, 6vw, 6rem);
    color: #f8fafc;
    border-right: 1px solid rgb(255 255 255 / 10%);
    background: radial-gradient(circle at 20% 30%, #1e3a5f 0%, transparent 60%);
  }
  .career-intro h1 {
    margin: 0.8rem 0 1.2rem;
    font-size: clamp(2.4rem, 5vw, 4.5rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: #ffffff;
  }
  .career-intro p {
    max-width: 28rem;
    color: #94a3b8;
    font-size: 0.95rem;
    line-height: 1.6;
  }
  .career-create {
    align-self: center;
    width: min(640px, calc(100% - 3rem));
    margin: 3rem auto;
    padding: clamp(2rem, 4vw, 3.5rem);
    border: 1px solid rgb(255 255 255 / 15%);
    border-radius: 0.75rem;
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    box-shadow: 0 20px 45px rgb(0 0 0 / 70%);
  }
  .career-create > label {
    display: grid;
    gap: 0.45rem;
    margin-bottom: 1.5rem;
    font-size: 0.72rem;
    font-weight: 800;
    color: #94a3b8;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .career-create input {
    border: 1px solid #334155;
    border-radius: 0.4rem;
    background: #020617;
    color: #f8fafc;
    padding: 0.7rem 0.9rem;
    font-size: 1rem;
    font-weight: 600;
    outline: none;
    transition: border-color 0.15s;
  }
  .career-create input:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 2px rgb(56 189 248 / 20%);
  }
  .career-club-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  .career-club-options button {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 0.45rem;
    background: #090e17;
    color: #cbd5e1;
    cursor: pointer;
    padding: 0.75rem 0.9rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.85rem;
    transition: background 0.15s, border-color 0.15s;
  }
  .career-club-options button:hover {
    background: #1e293b;
  }
  .career-club-options button.selected {
    background: #1e293b;
    border-color: var(--club, #38bdf8);
    box-shadow: inset 0 0 0 1px var(--club, #38bdf8);
    color: #f8fafc;
  }
`;

registerStyles("career-onboarding", ONBOARDING_STYLES);

export const renderCareerSetup = (
  selectedClubId: string,
  loadError: string | null,
): string => `<main class="career-onboarding">
  <section class="career-intro">
    <span>Rugby Sim</span>
    <h1>Take the club.<br />Shape the season.</h1>
    <p>Ten rounds. One league. Every decision builds toward match day.</p>
    <button type="button" data-exhibition>Open Match Lab</button>
  </section>
  <form class="career-create" data-create-career>
    <span class="career-kicker">New career</span>
    <h2>Sign your first contract</h2>
    ${loadError ? `<div class="career-save-error"><strong>Save could not be loaded.</strong><span>${escapeHtml(loadError)}</span><button type="button" data-delete-save>Delete damaged save</button></div>` : ""}
    <label>Manager name<input name="managerName" required maxlength="40" autocomplete="name" placeholder="Your name" /></label>
    <fieldset><legend>Choose club</legend><div class="career-club-options">${CLUBS.map((club) => `<button type="button" data-club-id="${club.id}" aria-pressed="${club.id === selectedClubId}" class="${club.id === selectedClubId ? "selected" : ""}" style="--club:${club.color}"><i></i><span>${escapeHtml(club.name)}</span></button>`).join("")}</div></fieldset>
    <button class="career-primary" type="submit">Begin career</button>
  </form>
</main>`;
