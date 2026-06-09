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

  private readonly driverMetadata: Record<string, { initials: string; team: string; price: number; points: number }> = {
    hamilton: { initials: 'LH', team: 'Mercedes', price: 23.9, points: 278 },
    russell: { initials: 'GR', team: 'Mercedes', price: 28.2, points: 257 },
    sargeant: { initials: 'GS', team: 'Williams', price: 12.8, points: 24 },
    perez: { initials: 'SP', team: 'Red Bull', price: 27.5, points: 318 },
    verstappen: { initials: 'MV', team: 'Red Bull', price: 34.1, points: 760 },
    leclerc: { initials: 'CL', team: 'Ferrari', price: 29.9, points: 262 },
    antonelli: { initials: 'ZA', team: 'Alpine', price: 25.0, points: 142 },
    albon: { initials: 'AL', team: 'Aston Martin', price: 19.4, points: 104 },
    alonso: { initials: 'ALO', team: 'Aston Martin', price: 27.8, points: 231 },
    bearman: { initials: 'BE', team: 'Ferrari', price: 21.3, points: 46 },
    bortoleto: { initials: 'BO', team: 'Aston Martin', price: 18.9, points: 28 },
  };

  private readonly constructorMetadata: Record<string, { initials: string; price: number; points: number; displayName?: string }> = {
    mercedes: { initials: 'ME', price: 30.8, points: 620 },
    red_bull: { initials: 'RB', price: 29.3, points: 655, displayName: 'Red Bull Racing' },
    ferrari: { initials: 'FE', price: 24.8, points: 540 },
    alpine: { initials: 'AL', price: 15.5, points: 312 },
    aston_martin: { initials: 'AM', price: 7.3, points: 406 },
    audi: { initials: 'AU', price: 3.0, points: 394 },
    cadillac: { initials: 'CA', price: 6.2, points: 342 },
    haas: { initials: 'HA', price: 10.4, points: 240 },
    mclaren: { initials: 'MC', price: 29.2, points: 512 },
    rb: { initials: 'RB', price: 9.3, points: 190, displayName: 'Racing Bulls (RB)' },
    williams: { initials: 'WI', price: 15.0, points: 196 },
  };

  getFantasyDriversData(): Observable<FantasyDriver[]> {
    return this.http.get<any>(`${API_URL}/2026/drivers.json`).pipe(
      map((res) => res?.MRData?.DriverTable?.Drivers ?? []),
      map((drivers: any[]) =>
        drivers.map((driver) => {
          const id = driver.driverId as string;
          const metadata = this.driverMetadata[id];
          const name = `${driver.givenName} ${driver.familyName}`;
          const initials = metadata?.initials ?? (driver.code ?? name.split(' ').map((part: string) => part[0]).join('').slice(0, 2)).toUpperCase();
          const team = metadata?.team ?? driver.nationality ?? 'Unknown';

          return {
            id,
            initials,
            name,
            team,
            price: metadata?.price ?? 16.0,
            points: metadata?.points ?? 10,
          } as FantasyDriver;
        }),
      ),
      catchError(() => of([])),
    );
  }

  getFantasyConstructorsData(): Observable<FantasyConstructor[]> {
    return this.http.get<any>(`${API_URL}/2026/constructors.json`).pipe(
      map((res) => res?.MRData?.ConstructorTable?.Constructors ?? []),
      map((constructors: any[]) =>
        constructors.map((constructor) => {
          const id = constructor.constructorId as string;
          const metadata = this.constructorMetadata[id];
          const initials = metadata?.initials ?? constructor.name
            .split(' ')
            .map((part: string) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return {
            id,
            initials,
            name: metadata?.displayName ?? constructor.name,
            nationality: constructor.nationality,
            price: metadata?.price ?? 28.0,
            points: metadata?.points ?? 10,
          } as FantasyConstructor;
        }),
      ),
      catchError(() => of([])),
    );
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
