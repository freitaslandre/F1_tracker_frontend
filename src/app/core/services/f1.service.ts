import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, concatMap, reduce, catchError, switchMap } from 'rxjs/operators';
import { FavoriteCircuit, FantasyConstructor, FantasyDriver, JolpicaRaceDetail, JolpicaRaceSummary } from '../models/f1.models';

const FAVORITES_KEY = 'f1rm_favorite_circuits';
const VOTES_KEY = 'f1rm_driver_votes';
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
    { id: 'hamilton', initials: 'LH', name: 'Lewis Hamilton', team: 'Mercedes', price: 23.9, points: 278 },
    { id: 'russell', initials: 'GR', name: 'George Russell', team: 'Mercedes', price: 28.2, points: 257 },
    { id: 'sargeant', initials: 'GS', name: 'Logan Sargeant', team: 'Williams', price: 12.8, points: 24 },
    { id: 'perez', initials: 'SP', name: 'Sergio Pérez', team: 'Red Bull', price: 27.5, points: 318 },
    { id: 'verstappen', initials: 'MV', name: 'Max Verstappen', team: 'Red Bull', price: 34.1, points: 760 },
    { id: 'leclerc', initials: 'CL', name: 'Charles Leclerc', team: 'Ferrari', price: 29.9, points: 262 },
    { id: 'giovinazzi', initials: 'AG', name: 'Antonio Giovinazzi', team: 'Sauber', price: 14.4, points: 36 },
    { id: 'antonelli', initials: 'ZA', name: 'Zane Antonelli', team: 'Alpine', price: 25.0, points: 142 },
  ];

  private readonly fantasyConstructors: FantasyConstructor[] = [
    { id: 'mercedes', initials: 'ME', name: 'Mercedes', nationality: 'German', price: 45.6, points: 620 },
    { id: 'red_bull', initials: 'RB', name: 'Red Bull', nationality: 'Austrian', price: 48.2, points: 655 },
    { id: 'ferrari', initials: 'FE', name: 'Ferrari', nationality: 'Italian', price: 42.0, points: 540 },
    { id: 'alpine', initials: 'AL', name: 'Alpine', nationality: 'French', price: 28.3, points: 312 },
  ];

  getFantasyDriversData(): FantasyDriver[] {
    return this.fantasyDrivers;
  }

  getFantasyConstructorsData(): FantasyConstructor[] {
    return this.fantasyConstructors;
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
