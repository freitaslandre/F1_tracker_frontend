import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, concatMap, reduce, catchError, tap } from 'rxjs/operators';
import { AuthUser } from './auth.service';
import {
  DriverVote,
  FavoriteCircuit,
  FantasyConstructor,
  FantasyDriver,
  JolpicaRaceDetail,
  JolpicaRaceResult,
  JolpicaRaceSummary,
  SavedFantasyTeam,
} from '../models/f1.models';

const TOKEN_KEY = 'f1rm_token';
const BACKEND_URL = 'http://localhost:3000/api';

interface UserProfileResponse {
  user: AuthUser;
  favorites: FavoriteCircuit[];
  fantasyTeam: SavedFantasyTeam | null;
  votes: DriverVote[];
}

interface FantasyTeamResponse {
  team: SavedFantasyTeam | null;
}

@Injectable({
  providedIn: 'root',
})
export class F1Service {
  private readonly http = inject(HttpClient);
  private readonly favoriteCircuits = signal<FavoriteCircuit[]>([]);
  private readonly driverVotes = signal<Record<string, string>>({});
  private readonly fantasyTeamState = signal<SavedFantasyTeam | null>(null);

  readonly favorites = this.favoriteCircuits.asReadonly();
  readonly fantasyTeam = this.fantasyTeamState.asReadonly();
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
    { id: 'mercedes', initials: 'ME', name: 'Mercedes', nationality: 'German', price: 30.8, points: 412, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/mercedes.png' },
    { id: 'ferrari', initials: 'FE', name: 'Ferrari', nationality: 'Italian', price: 24.8, points: 352, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/ferrari.png' },
    { id: 'mclaren', initials: 'MC', name: 'McLaren', nationality: 'British', price: 29.2, points: 401, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/mclaren.png' },
    { id: 'red_bull', initials: 'RB', name: 'Red Bull Racing', nationality: 'Austrian', price: 29.3, points: 395, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/red-bull-racing.png' },
    { id: 'aston_martin', initials: 'AM', name: 'Aston Martin', nationality: 'British', price: 7.3, points: 64, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/aston-martin.png' },
    { id: 'alpine', initials: 'AL', name: 'Alpine', nationality: 'French', price: 15.5, points: 180, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/alpine.png' },
    { id: 'racing_bulls', initials: 'RB', name: 'Racing Bulls', nationality: 'British', price: 9.3, points: 85, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/kick-sauber.png' },
    { id: 'williams', initials: 'WI', name: 'Williams', nationality: 'British', price: 15.0, points: 142, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/williams.png' },
    { id: 'haas', initials: 'HA', name: 'Haas F1 Team', nationality: 'American', price: 10.4, points: 98, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/haas.png' },
    { id: 'audi', initials: 'AU', name: 'Audi', nationality: 'German', price: 3.0, points: 12, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/audi.png' },
    { id: 'cadillac', initials: 'CA', name: 'Cadillac', nationality: 'American', price: 6.2, points: 40, logo: 'https://media.formula1.com/content/dam/fom-website/teams/2024/cadillac.png' },
  ];

  getFantasyDriversData(): Observable<FantasyDriver[]> {
    return of(this.fantasyDrivers);
  }

  getFantasyConstructorsData(): Observable<FantasyConstructor[]> {
    return of(this.fantasyConstructors);
  }

  saveFantasyTeam(
    drivers: FantasyDriver[],
    constructors: FantasyConstructor[],
    budgetUsed: number,
  ): Observable<FantasyTeamResponse> {
    return this.http.put<FantasyTeamResponse>(
      `${BACKEND_URL}/fantasy/team`,
      {
        drivers,
        constructors,
        budgetLimit: 100,
        budgetUsed,
      },
      this.authOptions(),
    ).pipe(tap((response) => this.fantasyTeamState.set(response.team)));
  }

  loadFantasyTeam(): Observable<FantasyTeamResponse> {
    return this.http
      .get<FantasyTeamResponse>(`${BACKEND_URL}/fantasy/team`, this.authOptions())
      .pipe(tap((response) => this.fantasyTeamState.set(response.team)));
  }

  deleteFantasyTeam(): Observable<void> {
    return this.http
      .delete<void>(`${BACKEND_URL}/fantasy/team`, this.authOptions())
      .pipe(tap(() => this.fantasyTeamState.set(null)));
  }

  private fetchRaces(season: number): Observable<JolpicaRaceDetail[]> {
    return this.http.get<JolpicaRaceDetail[]>(`${BACKEND_URL}/f1/races?season=${season}`);
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
      map((races) => races.find((race) => race.round === round)),
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
        this.fetchRaces(season).pipe(catchError(() => of([]))),
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
      locality: race.Circuit.Location.locality,
      country: race.Circuit.Location.country,
      raceName: race.raceName,
    };

    const exists = this.favoriteCircuits().some((item) => item.circuitId === favorite.circuitId);
    if (exists) {
      this.http
        .delete(`${BACKEND_URL}/f1/favorites/${encodeURIComponent(favorite.circuitId)}`, this.authOptions())
        .subscribe({
          next: () => {
            this.favoriteCircuits.update((items) =>
              items.filter((item) => item.circuitId !== favorite.circuitId),
            );
          },
        });
      return;
    }

    this.http
      .post<FavoriteCircuit>(`${BACKEND_URL}/f1/favorites`, favorite, this.authOptions())
      .subscribe({
        next: (saved) => {
          this.favoriteCircuits.update((items) => [...items, { ...favorite, ...saved }]);
        },
      });
  }

  isFavorite(circuitId: string): boolean {
    return this.favoriteCircuits().some((item) => item.circuitId === circuitId);
  }

  voteDriver(race: JolpicaRaceDetail, result: JolpicaRaceResult): void {
    const driverName = `${result.Driver.givenName} ${result.Driver.familyName}`.trim();
    const payload = {
      raceSeason: race.season,
      raceRound: race.round,
      raceName: race.raceName,
      driverId: result.Driver.driverId,
      driverName,
    };

    this.http.post<DriverVote>(`${BACKEND_URL}/f1/vote`, payload, this.authOptions()).subscribe({
      next: (saved) => {
        this.driverVotes.update((votes) => ({
          ...votes,
          [this.voteKey(saved.raceSeason, saved.raceRound)]: saved.driverId,
        }));
      },
    });
  }

  selectedDriverForRace(race: JolpicaRaceDetail): string | undefined {
    return this.driverVotes()[this.voteKey(race.season, race.round)];
  }

  refreshProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${BACKEND_URL}/user/profile`, this.authOptions()).pipe(
      tap((profile) => {
        this.favoriteCircuits.set(profile.favorites);
        this.fantasyTeamState.set(profile.fantasyTeam);
        this.driverVotes.set(
          profile.votes.reduce<Record<string, string>>((acc, vote) => {
            acc[this.voteKey(vote.raceSeason, vote.raceRound)] = vote.driverId;
            return acc;
          }, {}),
        );
      }),
    );
  }

  private authOptions(): { headers: HttpHeaders } {
    const token = localStorage.getItem(TOKEN_KEY) ?? '';
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  private voteKey(season: string, round: string): string {
    return `${season}-${round}`;
  }

}
