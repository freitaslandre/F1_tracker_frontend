import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, concatMap, reduce, catchError, switchMap } from 'rxjs/operators';
import { FavoriteCircuit, FantasyConstructor, FantasyDriver, JolpicaRaceDetail, JolpicaRaceSummary } from '../models/f1.models';

const FAVORITES_KEY = 'f1rm_favorite_circuits';
const VOTES_KEY = 'f1rm_driver_votes';
const FANTASY_TEAM_KEY = 'f1rm_fantasy_team';
const API_URL = 'https://api.jolpi.ca/ergast/f1';

@Injectable({
  providedIn: 'root',
})
export class F1Service {
  private readonly http = inject(HttpClient);
  private readonly favoriteCircuits = signal<FavoriteCircuit[]>(this.readJson(FAVORITES_KEY, []));
  private readonly driverVotes = signal<Record<string, string>>(this.readJson(VOTES_KEY, {}));

  readonly favorites = this.favoriteCircuits.asReadonly();
  readonly votes = this.driverVotes.asReadonly();
  readonly favoriteCount = computed(() => this.favoriteCircuits().length);

  private readonly fantasyDrivers: FantasyDriver[] = [
    { id: 'russell', name: 'George Russell', price: 28.2, points: 157, team: 'Mercedes', initials: 'GR' },
    { id: 'antonelli', name: 'Kimi Antonelli', price: 25.0, points: 309, team: 'Mercedes', initials: 'KA' },
    { id: 'leclerc', name: 'Charles Leclerc', price: 23.8, points: 152, team: 'Ferrari', initials: 'CL' },
    { id: 'hamilton', name: 'Lewis Hamilton', price: 23.9, points: 181, team: 'Ferrari', initials: 'LH' },
    { id: 'norris', name: 'Lando Norris', price: 29.5, points: 210, team: 'McLaren', initials: 'LN' },
    { id: 'piastri', name: 'Oscar Piastri', price: 22.0, points: 140, team: 'McLaren', initials: 'OP' },
    { id: 'verstappen', name: 'Max Verstappen', price: 32.0, points: 250, team: 'Red Bull Racing', initials: 'MV' },
    { id: 'hadjar', name: 'Isack Hadjar', price: 6.5, points: 15, team: 'Red Bull Racing', initials: 'IH' },
    { id: 'alonso', name: 'Fernando Alonso', price: 12.5, points: 95, team: 'Aston Martin', initials: 'FA' },
    { id: 'stroll', name: 'Lance Stroll', price: 8.5, points: 40, team: 'Aston Martin', initials: 'LS' },
    { id: 'colapinto', name: 'Franco Colapinto', price: 11.0, points: 58, team: 'Alpine', initials: 'FC' },
    { id: 'gasly', name: 'Pierre Gasly', price: 14.0, points: 92, team: 'Alpine', initials: 'PG' },
    { id: 'lawson', name: 'Liam Lawson', price: 7.5, points: 32, team: 'Racing Bulls', initials: 'LL' },
    { id: 'lindblad', name: 'Arvid Lindblad', price: 5.5, points: 10, team: 'Racing Bulls', initials: 'AL' },
    { id: 'sainz', name: 'Carlos Sainz', price: 18.5, points: 115, team: 'Williams', initials: 'CS' },
    { id: 'albon', name: 'Alex Albon', price: 13.0, points: 75, team: 'Williams', initials: 'AA' },
    { id: 'hulkenberg', name: 'Nico Hülkenberg', price: 11.5, points: 62, team: 'Audi', initials: 'NH' },
    { id: 'bortoleto', name: 'Gabriel Bortoleto', price: 7.0, points: 25, team: 'Audi', initials: 'GB' },
    { id: 'ocon', name: 'Esteban Ocon', price: 14.0, points: 88, team: 'Haas F1 Team', initials: 'EO' },
    { id: 'bearman', name: 'Oliver Bearman', price: 6.0, points: 20, team: 'Haas F1 Team', initials: 'OB' },
    { id: 'perez', name: 'Sergio Pérez', price: 15.0, points: 80, team: 'Cadillac', initials: 'SP' },
    { id: 'bottas', name: 'Valtteri Bottas', price: 8.0, points: 35, team: 'Cadillac', initials: 'VB' },
  ];

  private readonly fantasyConstructors: FantasyConstructor[] = [
    { id: 'mercedes', initials: 'ME', name: 'Mercedes', nationality: 'German', price: 30.8, points: 412 },
    { id: 'ferrari', initials: 'FE', name: 'Ferrari', nationality: 'Italian', price: 24.8, points: 352 },
    { id: 'mclaren', initials: 'MC', name: 'McLaren', nationality: 'British', price: 29.2, points: 401 },
    { id: 'red_bull', initials: 'RB', name: 'Red Bull Racing', nationality: 'Austrian', price: 29.3, points: 395 },
    { id: 'aston_martin', initials: 'AM', name: 'Aston Martin', nationality: 'British', price: 7.3, points: 64 },
    { id: 'alpine', initials: 'AL', name: 'Alpine', nationality: 'French', price: 15.5, points: 180 },
    { id: 'racing_bulls', initials: 'RB', name: 'Racing Bulls', nationality: 'British', price: 9.3, points: 85 },
    { id: 'williams', initials: 'WI', name: 'Williams', nationality: 'British', price: 15.0, points: 142 },
    { id: 'audi', initials: 'AU', name: 'Audi', nationality: 'German', price: 3.0, points: 12 },
    { id: 'haas', initials: 'HA', name: 'Haas F1 Team', nationality: 'American', price: 10.4, points: 98 },
    { id: 'cadillac', initials: 'CA', name: 'Cadillac', nationality: 'American', price: 6.2, points: 40 },
  ];

  getFantasyDriversData(): Observable<FantasyDriver[]> {
    return of(this.fantasyDrivers);
  }

  getFantasyConstructorsData(): Observable<FantasyConstructor[]> {
    return of(this.fantasyConstructors);
  }

  saveFantasyTeam(driverIds: string[], constructorIds: string[]): void {
    localStorage.setItem(FANTASY_TEAM_KEY, JSON.stringify({ drivers: driverIds, constructors: constructorIds }));
  }

  loadFantasyTeam(): { drivers: string[]; constructors: string[] } {
    const raw = localStorage.getItem(FANTASY_TEAM_KEY);
    if (!raw) {
      return { drivers: [], constructors: [] };
    }

    try {
      const parsed = JSON.parse(raw) as { drivers?: string[]; constructors?: string[] };
      return {
        drivers: Array.isArray(parsed.drivers) ? parsed.drivers.filter((id) => typeof id === 'string') : [],
        constructors: Array.isArray(parsed.constructors) ? parsed.constructors.filter((id) => typeof id === 'string') : [],
      };
    } catch {
      localStorage.removeItem(FANTASY_TEAM_KEY);
      return { drivers: [], constructors: [] };
    }
  }

  private fetchRaces(season: number): Observable<JolpicaRaceDetail[]> {
    // Use the "races" endpoint to get the full season schedule (not only completed results)
    return this.http.get<any>(`${API_URL}/${season}/races.json`).pipe(
      map((res) => res?.MRData?.RaceTable?.Races ?? []),
    );
  }

  getCurrentSeasonRaces(): Observable<JolpicaRaceSummary[]> {
    return this.getSeasonRaces(new Date().getUTCFullYear());
  }

  getSeasonRaces(season: number): Observable<JolpicaRaceSummary[]> {
    return this.fetchRaces(season).pipe(
      map((races) =>
        races.map((race) => ({
          season: race.season,
          round: race.round,
          url: race.url,
          raceName: race.raceName,
          Circuit: race.Circuit,
          date: race.date,
          time: race.time,
        })),
      ),
    );
  }

  getRaceDetail(season: number, round: string): Observable<JolpicaRaceDetail | undefined> {
    return this.fetchRaces(season).pipe(
      switchMap((races) => {
        const found = races.find((race) => race.round === round);
        if (!found) return of(undefined);

        // Try to enrich the calendar entry with results from results.json, but
        // return the calendar entry even if results are unavailable.
        return this.http.get<any>(`${API_URL}/${season}/results.json`).pipe(
          map((res) => res?.MRData?.RaceTable?.Races ?? []),
          map((resultsRaces: any[]) => {
            const resRace = resultsRaces.find((r) => r.round === round);
            return resRace && resRace.Results && resRace.Results.length > 0
              ? ({ ...found, Results: resRace.Results } as JolpicaRaceDetail)
              : (found as JolpicaRaceDetail);
          }),
          catchError(() => of(found as JolpicaRaceDetail)),
        );
      }),
    );
  }

  /**
   * Fetch all races from the first F1 season (1950) until the current year.
   * Calls the Jolpica `races.json` endpoint for each season sequentially and
   * concatenates the results into a single array sorted by season and round.
   */
  getAllRacesHistory(): Observable<JolpicaRaceSummary[]> {
    const startSeason = 1950;
    const endSeason = new Date().getUTCFullYear();
    const seasons = Array.from({ length: endSeason - startSeason + 1 }, (_, i) => startSeason + i);

    return from(seasons).pipe(
      concatMap((season) =>
        this.http.get<any>(`${API_URL}/${season}/races.json`).pipe(
          map((res) => res?.MRData?.RaceTable?.Races ?? []),
          catchError(() => of([])),
        ),
      ),
      reduce((acc: JolpicaRaceDetail[], races: JolpicaRaceDetail[]) => acc.concat(races), []),
      map((races) =>
        races
          .map((race) => ({
            season: race.season,
            round: race.round,
            url: race.url,
            raceName: race.raceName,
            Circuit: race.Circuit,
            date: race.date,
            time: race.time,
          }))
          .sort((a, b) => Number(a.season) - Number(b.season) || Number(a.round) - Number(b.round)),
      ),
    );
  }

  toggleFavoriteCircuit(race: JolpicaRaceDetail): void {
    const favorite: FavoriteCircuit = {
      circuitId: race.Circuit.circuitId,
      circuitName: race.Circuit.circuitName,
      country: race.Circuit.Location.country,
      raceName: race.raceName,
    };

    const exists = this.favoriteCircuits().some((item) => item.circuitId === favorite.circuitId);
    const next = exists
      ? this.favoriteCircuits().filter((item) => item.circuitId !== favorite.circuitId)
      : [...this.favoriteCircuits(), favorite];

    this.favoriteCircuits.set(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  isFavorite(circuitId: string): boolean {
    return this.favoriteCircuits().some((item) => item.circuitId === circuitId);
  }

  voteDriver(round: string, driverId: string): void {
    const next = { ...this.driverVotes(), [round]: driverId };
    this.driverVotes.set(next);
    localStorage.setItem(VOTES_KEY, JSON.stringify(next));
  }

  selectedDriverForRound(round: string): string | undefined {
    return this.driverVotes()[round];
  }

  private readJson<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      localStorage.removeItem(key);
      return fallback;
    }
  }
}
