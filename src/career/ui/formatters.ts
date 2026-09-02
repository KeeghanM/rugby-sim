import type { Career, Fixture } from "../domain/index.ts";
export { getOvrClass, getPlayerOverall } from "../domain/index.ts";

export const formatDate = (date: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

export const formatMoney = (amount: number): string =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDist = (d: number): string =>
  d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`;

export const clubById = (career: Career, id: string) => {
  const club = career.season.clubs.find((candidate) => candidate.id === id);
  if (!club) throw new Error(`Unknown club: ${id}`);
  return club;
};

export const fixtureTeams = (career: Career, fixture: Fixture) => ({
  home: clubById(career, fixture.homeClubId),
  away: clubById(career, fixture.awayClubId),
});
