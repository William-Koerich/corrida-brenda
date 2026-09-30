export type RaceStatus = "not_started" | "running" | "finished";
export type Sex = "M" | "F";

export interface Race {
  id: string;
  name: string;
  distance_km: number;
  start_time: string | null;
  finished_at: string | null;
  status: RaceStatus;
  created_at: string;
}

export interface Athlete {
  id: string;
  race_id: string;
  name: string;
  age: number;
  sex: Sex;
  bib_number: number;
  created_at: string;
}

export interface Finish {
  id: string;
  race_id: string;
  athlete_id: string | null;
  finish_time: string;
  device_id: string | null;
  client_id: string;
  created_at: string;
}
