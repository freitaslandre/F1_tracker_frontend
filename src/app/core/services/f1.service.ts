import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, concatMap, reduce, catchError, switchMap } from 'rxjs/operators';
import { FavoriteCircuit, JolpicaRaceDetail, JolpicaRaceSummary } from '../models/f1.models';

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
        if (found && Array.isArray((found as any).Results) && (found as any).Results.length > 0) {
          return of(found as JolpicaRaceDetail);
        }

        // If the schedule doesn't include results, fetch the results endpoint for the season
        return this.http.get<any>(`${API_URL}/${season}/results.json`).pipe(
          map((res) => res?.MRData?.RaceTable?.Races ?? []),
          map((resultsRaces: any[]) => resultsRaces.find((r) => r.round === round)),
          catchError(() => of(undefined)),
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
