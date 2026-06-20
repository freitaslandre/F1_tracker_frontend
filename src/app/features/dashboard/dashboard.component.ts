import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { F1Service } from '../../core/services/f1.service';
import { JolpicaRaceSummary, SeasonStandings } from '../../core/models/f1.models';

interface WikipediaSummary {
  thumbnail?: {
    source?: string;
  };
  originalimage?: {
    source?: string;
  };
}

type SeasonSelection = number | 'all-time';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [AsyncPipe, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly f1Service = inject(F1Service);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly currentYear = new Date().getUTCFullYear();
  private readonly imageCache = new Map<string, Observable<string | undefined>>();

  protected readonly seasons = Array.from({ length: this.currentYear - 1950 + 1 }, (_, i) => this.currentYear - i).reverse().reverse();
  protected readonly season = signal<SeasonSelection>(this.getInitialSeason());
  protected readonly seasonLabel = computed(() => this.season() === 'all-time' ? 'All-time' : String(this.season()));
  protected readonly races = signal<JolpicaRaceSummary[]>([]);
  protected readonly standings = signal<SeasonStandings | null>(null);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly viewMode = signal<'races' | 'standings'>(this.getInitialViewMode());
  protected readonly searchTerm = signal('');
  protected readonly raceStatusFilter = signal<'all' | 'completed' | 'upcoming'>('all');
  protected readonly countryFilter = signal('all');
  protected readonly availableCountries = computed(() =>
    [...new Set(this.races().map((race) => race.Circuit.Location.country).filter(Boolean))].sort(),
  );
  protected readonly filteredRaces = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.raceStatusFilter();
    const country = this.countryFilter();

    return this.races().filter((race) => {
      const matchesSearch =
        !term ||
        race.raceName.toLowerCase().includes(term) ||
        race.Circuit.circuitName.toLowerCase().includes(term) ||
        race.Circuit.Location.locality.toLowerCase().includes(term) ||
        race.Circuit.Location.country.toLowerCase().includes(term);
      const completed = this.isRaceCompleted(race);
      const matchesStatus =
        status === 'all' ||
        (status === 'completed' && completed) ||
        (status === 'upcoming' && !completed);
      const matchesCountry = country === 'all' || race.Circuit.Location.country === country;

      return matchesSearch && matchesStatus && matchesCountry;
    });
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const requestedSeasonParam = params.get('season');
      const requestedSeason = Number(requestedSeasonParam);
      const requestedView = params.get('view') === 'standings' ? 'standings' : 'races';

      if (requestedSeasonParam === 'all-time') {
        this.season.set('all-time');
        this.viewMode.set('races');
        return;
      }

      if (Number.isInteger(requestedSeason) && requestedSeason >= 1950 && requestedSeason <= this.currentYear) {
        this.season.set(requestedSeason);
      }
      this.viewMode.set(requestedView);
    });

    effect((onCleanup) => {
      const seasonValue = this.season();
      const mode = this.viewMode();
      this.isLoading.set(true);
      this.error.set(null);

      const sub =
        mode === 'standings'
          ? this.f1Service.getSeasonStandings(Number(seasonValue)).subscribe({
              next: (standings) => {
                this.standings.set(standings);
                this.isLoading.set(false);
              },
              error: () => {
                this.error.set('Não foi possível carregar as classificações desta temporada.');
                this.standings.set(null);
                this.isLoading.set(false);
              },
            })
          : (seasonValue === 'all-time'
              ? this.f1Service.getAllRacesHistory()
              : this.f1Service.getSeasonRaces(seasonValue)
            ).subscribe({
              next: (races) => {
                this.races.set(races);
                this.isLoading.set(false);
              },
              error: () => {
                this.error.set('Não foi possível carregar as corridas desta temporada.');
                this.races.set([]);
                this.isLoading.set(false);
              },
            });

      onCleanup(() => sub.unsubscribe());
    });
  }

  protected showStandings(): void {
    if (this.season() === 'all-time') {
      this.season.set(this.currentYear);
    }
    this.viewMode.set('standings');
    this.updateDashboardUrl();
  }

  protected selectSeason(season: SeasonSelection): void {
    this.season.set(season === 'all-time' ? 'all-time' : Number(season));
    if (season === 'all-time') {
      this.viewMode.set('races');
    }
    this.clearFilters();
    this.updateDashboardUrl();
  }

  protected showRaces(): void {
    this.viewMode.set('races');
    this.updateDashboardUrl();
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.raceStatusFilter.set('all');
    this.countryFilter.set('all');
  }

  protected isRaceCompleted(race: JolpicaRaceSummary): boolean {
    try {
      const date = race.date ?? '';
      const time = race.time ?? '';
      const dateTime = time ? new Date(`${date}T${time}`) : new Date(date);
      return dateTime.getTime() <= Date.now();
    } catch {
      return false;
    }
  }

  protected wikipediaImageUrl(url: string | undefined): Observable<string | undefined> {
    if (!url) {
      return of(undefined);
    }

    const cached = this.imageCache.get(url);
    if (cached) {
      return cached;
    }

    const title = this.wikipediaTitleFromUrl(url);
    if (!title) {
      return of(undefined);
    }

    const imageUrl = this.http
      .get<WikipediaSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
      .pipe(
        map((summary) => summary.thumbnail?.source ?? summary.originalimage?.source),
        catchError(() => of(undefined)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    this.imageCache.set(url, imageUrl);
    return imageUrl;
  }

  protected initials(...parts: string[]): string {
    return parts
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private getInitialSeason(): SeasonSelection {
    const requestedSeasonParam = this.route.snapshot.queryParamMap.get('season');
    if (requestedSeasonParam === 'all-time') {
      return 'all-time';
    }

    const requestedSeason = Number(requestedSeasonParam);
    return Number.isInteger(requestedSeason) && requestedSeason >= 1950 && requestedSeason <= this.currentYear
      ? requestedSeason
      : this.currentYear;
  }

  private getInitialViewMode(): 'races' | 'standings' {
    return this.route.snapshot.queryParamMap.get('view') === 'standings' ? 'standings' : 'races';
  }

  private updateDashboardUrl(): void {
    void this.router.navigate(['/dashboard'], {
      queryParams: {
        season: this.season(),
        view: this.viewMode(),
      },
      replaceUrl: true,
    });
  }

  private wikipediaTitleFromUrl(url: string): string | undefined {
    try {
      const parsedUrl = new URL(url);
      const title = parsedUrl.pathname.split('/wiki/')[1];
      return title ? encodeURIComponent(decodeURIComponent(title)) : undefined;
    } catch {
      return undefined;
    }
  }
}
