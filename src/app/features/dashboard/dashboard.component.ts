import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { F1Service } from '../../core/services/f1.service';
import { JolpicaRaceSummary, SeasonStandings } from '../../core/models/f1.models';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly f1Service = inject(F1Service);

  protected readonly seasons = Array.from({ length: new Date().getUTCFullYear() - 1950 + 1 }, (_, i) => new Date().getUTCFullYear() - i).reverse().reverse();
  protected readonly season = signal<number>(new Date().getUTCFullYear());
  protected readonly races = signal<JolpicaRaceSummary[]>([]);
  protected readonly standings = signal<SeasonStandings | null>(null);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly viewMode = signal<'races' | 'standings'>('races');

  constructor() {
    effect((onCleanup) => {
      const seasonValue = this.season();
      const mode = this.viewMode();
      this.isLoading.set(true);
      this.error.set(null);

      const sub =
        mode === 'standings'
          ? this.f1Service.getSeasonStandings(seasonValue).subscribe({
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
          : this.f1Service.getSeasonRaces(seasonValue).subscribe({
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
    this.viewMode.set('standings');
  }

  protected selectSeason(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.season.set(Number(target.value));
  }

  protected showRaces(): void {
    this.viewMode.set('races');
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
}
