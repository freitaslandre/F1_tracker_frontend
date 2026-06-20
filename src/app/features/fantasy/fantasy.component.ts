import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { F1Service } from '../../core/services/f1.service';
import {
  FantasyConstructor,
  FantasyDriver,
  FantasyLeaderboardEntry,
  SavedFantasyTeam,
} from '../../core/models/f1.models';

interface WikipediaSummary {
  thumbnail?: {
    source?: string;
  };
  originalimage?: {
    source?: string;
  };
}

interface WikipediaSearchResponse {
  query?: {
    pages?: Record<
      string,
      {
        thumbnail?: {
          source?: string;
        };
      }
    >;
  };
}

const CAPTAIN_KEY = 'f1rm_fantasy_captain';

@Component({
  standalone: true,
  selector: 'app-fantasy',
  imports: [CommonModule],
  templateUrl: './fantasy.component.html',
})
export class FantasyComponent {
  private readonly service = inject(F1Service);
  private readonly http = inject(HttpClient);
  private readonly driverPhotoCache = new Map<string, Observable<string | undefined>>();
  private readonly constructorLogoCache = new Map<string, Observable<string | undefined>>();
  private readonly driverWikiTitles: Record<string, string> = {
    russell: 'George_Russell_(racing_driver)',
    antonelli: 'Andrea_Kimi_Antonelli',
    leclerc: 'Charles_Leclerc',
    hamilton: 'Lewis_Hamilton',
    norris: 'Lando_Norris',
    piastri: 'Oscar_Piastri',
    verstappen: 'Max_Verstappen',
    hadjar: 'Isack_Hadjar',
    alonso: 'Fernando_Alonso',
    stroll: 'Lance_Stroll',
    colapinto: 'Franco_Colapinto',
    gasly: 'Pierre_Gasly',
    lawson: 'Liam_Lawson',
    lindblad: 'Arvid_Lindblad',
    sainz: 'Carlos_Sainz_Jr.',
    albon: 'Alex_Albon',
    hulkenberg: 'Nico_Hülkenberg',
    bortoleto: 'Gabriel_Bortoleto',
    ocon: 'Esteban_Ocon',
    bearman: 'Oliver_Bearman',
    perez: 'Sergio_Pérez',
    bottas: 'Valtteri_Bottas',
  };
  private readonly constructorWikiTitles: Record<string, string> = {
    audi: 'Audi',
    cadillac: 'Cadillac',
  };

  readonly activeTab = signal<'drivers' | 'constructors'>('drivers');
  readonly searchTerm = signal('');
  readonly isLoading = signal(true);
  readonly error = signal<string | undefined>(undefined);

  readonly drivers = signal<FantasyDriver[]>([]);
  readonly constructors = signal<FantasyConstructor[]>([]);
  readonly selectedDrivers = signal<(FantasyDriver | null)[]>(Array.from({ length: 5 }, () => null));
  readonly selectedConstructors = signal<(FantasyConstructor | null)[]>(Array.from({ length: 2 }, () => null));
  readonly brokenConstructorLogos = signal<Record<string, boolean>>({});
  readonly captainId = signal<string | null>(localStorage.getItem(CAPTAIN_KEY));
  readonly leaderboard = signal<FantasyLeaderboardEntry[]>([]);
  readonly feedbackMessage = signal('Escolhe 5 pilotos e 2 construtores dentro do orçamento de 100M.');

  readonly selectedDriverCount = computed(() => this.selectedDrivers().filter(Boolean).length);
  readonly selectedConstructorCount = computed(() => this.selectedConstructors().filter(Boolean).length);
  readonly selectedDriverItems = computed(() =>
    this.selectedDrivers().filter((item): item is FantasyDriver => item !== null),
  );
  readonly selectedConstructorItems = computed(() =>
    this.selectedConstructors().filter((item): item is FantasyConstructor => item !== null),
  );
  readonly usedBudget = computed(() => {
    const driverTotal = this.selectedDriverItems()
      .reduce((sum, item) => sum + item.price, 0);

    const constructorTotal = this.selectedConstructorItems()
      .reduce((sum, item) => sum + item.price, 0);

    return Number((driverTotal + constructorTotal).toFixed(1));
  });
  readonly remainingBudget = computed(() => Math.max(0, 100 - this.usedBudget()));
  readonly budgetUsagePercent = computed(() => Math.min(100, Math.round(this.usedBudget())));
  readonly basePoints = computed(() => {
    const driverPoints = this.selectedDriverItems().reduce((sum, item) => sum + item.points, 0);
    const constructorPoints = this.selectedConstructorItems().reduce((sum, item) => sum + item.points, 0);
    return driverPoints + constructorPoints;
  });
  readonly captain = computed(() =>
    this.selectedDriverItems().find((driver) => driver.id === this.captainId()) ?? null,
  );
  readonly projectedPoints = computed(() => this.basePoints() + (this.captain()?.points ?? 0));
  readonly valueRating = computed(() => {
    if (this.usedBudget() === 0) {
      return 0;
    }
    return Number((this.projectedPoints() / this.usedBudget()).toFixed(1));
  });
  readonly isTeamValid = computed(
    () => this.selectedDriverCount() === 5 && this.selectedConstructorCount() === 2 && this.usedBudget() <= 100,
  );

  readonly filteredDrivers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.drivers().filter((driver) =>
      !term ||
      driver.name.toLowerCase().includes(term) ||
      driver.team.toLowerCase().includes(term) ||
      driver.initials.toLowerCase().includes(term),
    );
  });

  readonly filteredConstructors = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.constructors().filter((constructor) =>
      !term ||
      constructor.name.toLowerCase().includes(term) ||
      constructor.nationality.toLowerCase().includes(term) ||
      constructor.initials.toLowerCase().includes(term),
    );
  });

  readonly saveMessage = signal<string | null>(null);
  readonly recommendations = computed(() => {
    const selectedIds = new Set([
      ...this.selectedDriverItems().map((driver) => driver.id),
      ...this.selectedConstructorItems().map((constructor) => constructor.id),
    ]);
    const remaining = this.remainingBudget();
    return [...this.drivers(), ...this.constructors()]
      .filter((item) => !selectedIds.has(item.id) && item.price <= remaining)
      .sort((a, b) => (b.points / b.price) - (a.points / a.price))
      .slice(0, 4);
  });
  constructor() {
    this.loadFantasyData();
  }

  selectTab(value: 'drivers' | 'constructors'): void {
    this.activeTab.set(value);
    this.searchTerm.set('');
  }

  toggleDriver(driver: FantasyDriver): void {
    const selectedIndex = this.selectedDrivers().findIndex((item) => item?.id === driver.id);
    if (selectedIndex !== -1) {
      this.removeDriver(selectedIndex);
      return;
    }

    this.addDriver(driver);
  }

  toggleConstructor(constructor: FantasyConstructor): void {
    const selectedIndex = this.selectedConstructors().findIndex((item) => item?.id === constructor.id);
    if (selectedIndex !== -1) {
      this.removeConstructor(selectedIndex);
      return;
    }

    this.addConstructor(constructor);
  }

  addDriver(driver: FantasyDriver): void {
    if (!this.canAddDriver(driver)) {
      this.feedbackMessage.set(this.driverDisabledReason(driver) || 'Não foi possível adicionar este piloto.');
      return;
    }

    this.selectedDrivers.update((current) => {
      const next = [...current];
      const firstEmpty = next.findIndex((item) => item === null);
      if (firstEmpty === -1) {
        return current;
      }

      next[firstEmpty] = driver;
      return next;
    });

    if (!this.captainId()) {
      this.setCaptain(driver);
    }

    this.saveMessage.set(null);
    this.feedbackMessage.set(`${driver.name} adicionado à equipa.`);
  }

  removeDriver(index: number): void {
    const removedDriver = this.selectedDrivers()[index];
    this.selectedDrivers.update((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });

    if (removedDriver?.id === this.captainId()) {
      const nextCaptain = this.selectedDrivers().find((driver) => driver !== null) ?? null;
      this.setCaptain(nextCaptain);
    }

    this.saveMessage.set(null);
    this.feedbackMessage.set(removedDriver ? `${removedDriver.name} removido da equipa.` : 'Slot de piloto limpo.');
  }

  addConstructor(constructor: FantasyConstructor): void {
    if (!this.canAddConstructor(constructor)) {
      this.feedbackMessage.set(this.constructorDisabledReason(constructor) || 'Não foi possível adicionar este construtor.');
      return;
    }

    this.selectedConstructors.update((current) => {
      const next = [...current];
      const firstEmpty = next.findIndex((item) => item === null);
      if (firstEmpty === -1) {
        return current;
      }

      next[firstEmpty] = constructor;
      return next;
    });

    this.saveMessage.set(null);
    this.feedbackMessage.set(`${constructor.name} adicionado aos construtores.`);
  }

  removeConstructor(index: number): void {
    const removedConstructor = this.selectedConstructors()[index];
    this.selectedConstructors.update((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });

    this.saveMessage.set(null);
    this.feedbackMessage.set(removedConstructor ? `${removedConstructor.name} removido da equipa.` : 'Slot de construtor limpo.');
  }

  canAddDriver(driver: FantasyDriver): boolean {
    return (
      this.selectedDriverCount() < 5 &&
      !this.selectedDrivers().some((item) => item?.id === driver.id) &&
      this.usedBudget() + driver.price <= 100
    );
  }

  canAddConstructor(constructor: FantasyConstructor): boolean {
    return (
      this.selectedConstructorCount() < 2 &&
      !this.selectedConstructors().some((item) => item?.id === constructor.id) &&
      this.usedBudget() + constructor.price <= 100
    );
  }

  isDriverSelected(driver: FantasyDriver): boolean {
    return this.selectedDrivers().some((item) => item?.id === driver.id);
  }

  isConstructorSelected(constructor: FantasyConstructor): boolean {
    return this.selectedConstructors().some((item) => item?.id === constructor.id);
  }

  driverDisabledReason(driver: FantasyDriver): string | null {
    if (this.isDriverSelected(driver)) {
      return null;
    }
    if (this.selectedDriverCount() >= 5) {
      return 'Remove um piloto para abrir espaço.';
    }
    if (this.usedBudget() + driver.price > 100) {
      return `Faltam ${(this.usedBudget() + driver.price - 100).toFixed(1)}M de orçamento.`;
    }
    return null;
  }

  constructorDisabledReason(constructor: FantasyConstructor): string | null {
    if (this.isConstructorSelected(constructor)) {
      return null;
    }
    if (this.selectedConstructorCount() >= 2) {
      return 'Remove um construtor para abrir espaço.';
    }
    if (this.usedBudget() + constructor.price > 100) {
      return `Faltam ${(this.usedBudget() + constructor.price - 100).toFixed(1)}M de orçamento.`;
    }
    return null;
  }

  resetTeam(): void {
    this.selectedDrivers.set(Array.from({ length: 5 }, () => null));
    this.selectedConstructors.set(Array.from({ length: 2 }, () => null));
    this.setCaptain(null);
    this.saveMessage.set(null);
    this.feedbackMessage.set('Equipa limpa. Podes começar uma nova estratégia.');
    this.service.deleteFantasyTeam().pipe(take(1)).subscribe({
      next: () => this.loadLeaderboard(),
      error: () => this.loadLeaderboard(),
    });
  }

  setCaptain(driver: FantasyDriver | null): void {
    this.captainId.set(driver?.id ?? null);
    if (driver) {
      localStorage.setItem(CAPTAIN_KEY, driver.id);
      return;
    }
    localStorage.removeItem(CAPTAIN_KEY);
  }

  constructorLogoUrl(constructor: FantasyConstructor | null): Observable<string | undefined> {
    if (!constructor) {
      return of(undefined);
    }

    if (constructor.logo && !this.brokenConstructorLogos()[constructor.id]) {
      return of(constructor.logo);
    }

    const cached = this.constructorLogoCache.get(constructor.id);
    if (cached) {
      return cached;
    }

    const title = this.constructorWikiTitles[constructor.id];
    if (!title) {
      return of(undefined);
    }

    const logoUrl = this.http
      .get<WikipediaSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .pipe(
        map((summary) => summary.thumbnail?.source ?? summary.originalimage?.source),
        catchError(() => of(undefined)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    this.constructorLogoCache.set(constructor.id, logoUrl);
    return logoUrl;
  }

  markConstructorLogoBroken(constructorId: string): void {
    this.brokenConstructorLogos.update((current) => ({ ...current, [constructorId]: true }));
  }

  continue(): void {
    if (!this.isTeamValid()) {
      this.feedbackMessage.set('Completa 5 pilotos e 2 construtores dentro dos 100M antes de guardar.');
      return;
    }

    const drivers = this.selectedDrivers().filter((item): item is FantasyDriver => item !== null);
    const constructors = this.selectedConstructors().filter((item): item is FantasyConstructor => item !== null);

    this.service.saveFantasyTeam(drivers, constructors, this.usedBudget()).subscribe({
      next: () => {
        this.saveMessage.set('Equipa guardada com sucesso. A projeção já inclui o capitão em DRS.');
        this.feedbackMessage.set('Equipa guardada na base de dados e pronta para o leaderboard.');
        this.loadLeaderboard();
      },
      error: () => {
        this.saveMessage.set(null);
        this.error.set('Não foi possível guardar a equipa.');
      },
    });
  }

  formatPrice(value: number): string {
    return `$${value.toFixed(1)}M`;
  }

  driverPhotoUrl(driver: FantasyDriver): Observable<string | undefined> {
    const cached = this.driverPhotoCache.get(driver.id);
    if (cached) {
      return cached;
    }

    const title = encodeURIComponent(this.driverWikiTitles[driver.id] ?? driver.name.replaceAll(' ', '_'));
    const photoUrl = this.http
      .get<WikipediaSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
      .pipe(
        map((summary) => summary.thumbnail?.source ?? summary.originalimage?.source),
        switchMap((summaryPhoto) => summaryPhoto ? of(summaryPhoto) : this.searchDriverPhoto(driver.name)),
        catchError(() => of(undefined)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    this.driverPhotoCache.set(driver.id, photoUrl);
    return photoUrl;
  }

  private searchDriverPhoto(driverName: string): Observable<string | undefined> {
    const query = encodeURIComponent(`${driverName} racing driver`);
    return this.http
      .get<WikipediaSearchResponse>(
        `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=160&format=json&origin=*`,
      )
      .pipe(
        map((response) => {
          const pages = Object.values(response.query?.pages ?? {});
          return pages[0]?.thumbnail?.source;
        }),
        catchError(() => of(undefined)),
      );
  }

  private loadFantasyData(): void {
    this.isLoading.set(true);
    this.error.set(undefined);

    forkJoin({
      drivers: this.service.getFantasyDriversData(),
      constructors: this.service.getFantasyConstructorsData(),
      savedTeam: this.service.loadFantasyTeam().pipe(catchError(() => of({ team: null }))),
      leaderboard: this.service.getFantasyLeaderboard().pipe(catchError(() => of([]))),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ drivers, constructors, savedTeam, leaderboard }) => {
          this.drivers.set(drivers);
          this.constructors.set(constructors);
          this.leaderboard.set(leaderboard);
          this.restoreSavedTeam(drivers, constructors, savedTeam.team);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar os dados de fantasy.');
          this.isLoading.set(false);
        },
      });
  }

  private loadLeaderboard(): void {
    this.service.getFantasyLeaderboard().pipe(take(1)).subscribe({
      next: (leaderboard) => this.leaderboard.set(leaderboard),
      error: () => this.leaderboard.set([]),
    });
  }

  private restoreSavedTeam(
    drivers: FantasyDriver[],
    constructors: FantasyConstructor[],
    saved: SavedFantasyTeam | null,
  ): void {
    if (!saved) {
      return;
    }

    const savedDriverIds = saved.drivers
      .sort((a, b) => a.positionIndex - b.positionIndex)
      .map((driver) => driver.externalId);
    const savedConstructorIds = saved.constructors
      .sort((a, b) => a.positionIndex - b.positionIndex)
      .map((constructor) => constructor.externalId);

    const resolvedDrivers = Array.from({ length: 5 }, (_, idx) => {
      const driverId = savedDriverIds[idx];
      return drivers.find((driver) => driver.id === driverId) ?? null;
    });

    const resolvedConstructors = Array.from({ length: 2 }, (_, idx) => {
      const constructorId = savedConstructorIds[idx];
      return constructors.find((constructor) => constructor.id === constructorId) ?? null;
    });

    this.selectedDrivers.set(resolvedDrivers);
    this.selectedConstructors.set(resolvedConstructors);

    const savedCaptain = this.captainId();
    const captainStillExists = resolvedDrivers.some((driver) => driver?.id === savedCaptain);
    if (!captainStillExists) {
      this.setCaptain(resolvedDrivers.find((driver) => driver !== null) ?? null);
    }
  }
}
