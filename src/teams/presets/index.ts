import type { TeamDefinition } from "../../domain.ts";
import { arg, aus, nz, sa } from "./southern.ts";
import { eng, fra, ire, ita, sco, wal } from "./northern.ts";

export const INTERNATIONAL_PRESETS: Record<string, TeamDefinition> = {
  nz,
  sa,
  ire,
  fra,
  eng,
  sco,
  aus,
  arg,
  wal,
  ita,
};

export const TEAMS: Record<0 | 1, TeamDefinition> = {
  0: INTERNATIONAL_PRESETS.ire,
  1: INTERNATIONAL_PRESETS.fra,
};
