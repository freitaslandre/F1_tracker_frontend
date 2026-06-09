export interface JolpicaCircuit {
  circuitId: string;
  url: string;
  circuitName: string;
  Location: {
    lat: string;
    long: string;
    locality: string;
    country: string;
  };
}

export interface JolpicaConstructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

export interface JolpicaDriver {
  driverId: string;
  permanentNumber: string;
  code: string;
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

export interface JolpicaRaceSummary {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: JolpicaCircuit;
  date: string;
  time: string;
}

export interface JolpicaRaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: JolpicaDriver;
  Constructor: JolpicaConstructor;
  grid: string;
  laps: string;
  status: string;
  Time?: {
    millis: string;
    time: string;
  };
  FastestLap?: {
    rank: string;
    lap: string;
    Time: {
      time: string;
    };
  };
}

export interface JolpicaRaceDetail extends JolpicaRaceSummary {
  Results: JolpicaRaceResult[];
}

export interface FantasyDriver {
  id: string;
  initials: string;
  name: string;
  team: string;
  price: number;
  points: number;
}

export interface FantasyConstructor {
  id: string;
  initials: string;
  name: string;
  nationality: string;
  price: number;
  points: number;
  logo?: string;
}

export interface FavoriteCircuit {
  circuitId: string;
  circuitName: string;
  country: string;
  raceName: string;
}
