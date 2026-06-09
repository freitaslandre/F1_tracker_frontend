import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { F1Service } from '../../core/services/f1.service';
import { FantasyConstructor, FantasyDriver } from '../../core/models/f1.models';
import { take } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-fantasy',
  imports: [CommonModule],
  templateUrl: './fantasy.component.html',
  styles: [
    `
      :host {
        display: block;
        padding: 24px;
        color: #f8fafc;
        font-family: Inter, system-ui, sans-serif;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 24px;
      }

      .header h1 {
        margin: 0;
        font-size: 2rem;
      }

      .status-pill {
        padding: 10px 16px;
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.16);
        color: #bfdbfe;
        font-weight: 700;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) minmax(360px, 1.4fr);
        gap: 24px;
      }

      .panel {
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.1);
        border-radius: 24px;
        padding: 22px;
      }

      .panel h2 {
        margin: 0 0 16px;
        font-size: 1.2rem;
      }

      .budget-overview {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }

      .budget-card {
        padding: 16px;
        border-radius: 18px;
        background: rgba(30, 41, 59, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.08);
      }

      .budget-card strong {
        display: block;
        margin-bottom: 6px;
        color: #cbd5e1;
        font-size: 0.85rem;
      }

      .budget-card span {
        font-size: 1.25rem;
        font-weight: 800;
        color: #fff;
      }

      .slots {
        display: grid;
        gap: 14px;
      }

      .slot {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px dashed rgba(148, 163, 184, 0.18);
      }

      .slot.occupied {
        border-style: solid;
      }

      .slot-icon {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        background: linear-gradient(140deg, #0f172a, #1e3a8a);
        display: grid;
        place-items: center;
        color: #e2e8f0;
        font-weight: 800;
        font-size: 1rem;
      }

      .slot-body {
        flex: 1;
        min-width: 0;
      }

      .slot-body h3,
      .slot-body p {
        margin: 0;
      }

      .slot-body p {
        margin-top: 6px;
        color: #94a3b8;
        font-size: 0.92rem;
      }

      .slot-meta {
        display: grid;
        gap: 6px;
        text-align: right;
      }

      .slot-meta span {
        display: block;
        color: #e2e8f0;
        font-weight: 700;
      }

      .slot-meta small {
        color: #94a3b8;
        font-size: 0.8rem;
      }

      .slot button {
        border: 0;
        background: transparent;
        color: #fef2f2;
        font-size: 1.1rem;
        cursor: pointer;
      }

      .tab-list {
        display: flex;
        gap: 12px;
        margin-bottom: 18px;
      }

      .tab {
        padding: 10px 18px;
        border-radius: 999px;
        cursor: pointer;
        border: 1px solid transparent;
        color: #cbd5e1;
      }

      .tab.active {
        background: #0f172a;
        border-color: rgba(59, 130, 246, 0.36);
        color: #fff;
      }

      .search-bar {
        width: 100%;
        margin-bottom: 18px;
      }

      .search-bar input {
        width: 100%;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        background: #0f172a;
        color: #fff;
      }

      .selection-list {
        display: grid;
        gap: 12px;
      }

      .selection-item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 14px;
        align-items: center;
        padding: 16px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.1);
      }

      .selection-avatar {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        background: #1e293b;
        display: grid;
        place-items: center;
        color: #f8fafc;
        font-size: 1rem;
        font-weight: 800;
      }

      .selection-info {
        min-width: 0;
      }

      .selection-info h3 {
        margin: 0;
        font-size: 1rem;
      }

      .selection-info p {
        margin: 6px 0 0;
        color: #94a3b8;
        font-size: 0.88rem;
      }

      .selection-actions {
        display: grid;
        gap: 8px;
        justify-items: end;
      }

      .selection-actions span {
        color: #cbd5e1;
        font-weight: 700;
      }

      .selection-actions button {
        min-width: 100px;
        border: 0;
        border-radius: 999px;
        padding: 10px 16px;
        cursor: pointer;
        background: #2563eb;
        color: #fff;
        font-weight: 700;
        transition: background 180ms ease;
      }

      .selection-actions button:disabled {
        background: rgba(148, 163, 184, 0.24);
        cursor: not-allowed;
      }

      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 28px;
        gap: 16px;
      }

      .continue-button {
        border: 0;
        border-radius: 14px;
        padding: 14px 24px;
        font-size: 1rem;
        font-weight: 800;
        color: #fff;
        background: #2563eb;
        cursor: pointer;
      }

      .continue-button:disabled {
        background: rgba(37, 99, 235, 0.4);
        cursor: not-allowed;
      }
    `,
  ],
})
export class FantasyComponent {
  private readonly f1Service = inject(F1Service);

  protected readonly budgetCap = 100;
  protected readonly drivers = signal<FantasyDriver[]>([]);
  protected readonly constructors = signal<FantasyConstructor[]>([]);
  protected readonly searchTerm = signal('');
  protected readonly activeTab = signal<'drivers' | 'constructors'>('drivers');
  protected readonly selectedDrivers = signal<(FantasyDriver | null)[]>(Array.from({ length: 5 }, () => null));
  protected readonly selectedConstructors = signal<(FantasyConstructor | null)[]>(Array.from({ length: 2 }, () => null));
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  private remainingLoads = 2;

  protected readonly usedBudget = computed(() => {
    const driverTotal = this.selectedDrivers()
      .filter((item): item is FantasyDriver => item !== null)
      .reduce((sum, item) => sum + item.price, 0);

    const constructorTotal = this.selectedConstructors()
      .filter((item): item is FantasyConstructor => item !== null)
      .reduce((sum, item) => sum + item.price, 0);

    return Number((driverTotal + constructorTotal).toFixed(1));
  });

  protected readonly remainingBudget = computed(() => Number((this.budgetCap - this.usedBudget()).toFixed(1)));

  protected readonly selectedDriverCount = computed(() => this.selectedDrivers().filter(Boolean).length);
  protected readonly selectedConstructorCount = computed(() => this.selectedConstructors().filter(Boolean).length);
  protected readonly isTeamComplete = computed(
    () => this.selectedDriverCount() === 5 && this.selectedConstructorCount() === 2,
  );

  protected readonly isTeamValid = computed(
    () => this.isTeamComplete() && this.remainingBudget() >= 0,
  );

  protected readonly filteredDrivers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.drivers().filter((driver) => {
      const label = `${driver.name} ${driver.team}`.toLowerCase();
      return !term || label.includes(term);
    });
  });

  protected readonly filteredConstructors = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.constructors().filter((constructor) => {
      const label = constructor.name.toLowerCase();
      return !term || label.includes(term);
    });
  });

  constructor() {
    this.f1Service
      .getFantasyDriversData()
      .pipe(take(1))
      .subscribe({
        next: (drivers) => {
          this.drivers.set(drivers);
          this.checkLoaded();
        },
        error: () => {
          this.error.set('Não foi possível carregar os pilotos de 2026.');
          this.checkLoaded();
        },
      });

    this.f1Service
      .getFantasyConstructorsData()
      .pipe(take(1))
      .subscribe({
        next: (constructors) => {
          this.constructors.set(constructors);
          this.checkLoaded();
        },
        error: () => {
          this.error.set('Não foi possível carregar as equipas de 2026.');
          this.checkLoaded();
        },
      });
  }

  private checkLoaded(): void {
    this.remainingLoads -= 1;
    if (this.remainingLoads <= 0) {
      this.isLoading.set(false);
    }
  }

  protected selectTab(tab: 'drivers' | 'constructors'): void {
    this.activeTab.set(tab);
    this.searchTerm.set('');
  }

  protected addDriver(driver: FantasyDriver): void {
    if (!this.canAddDriver(driver)) {
      return;
    }

    const nextDrivers = [...this.selectedDrivers()];
    const firstEmpty = nextDrivers.findIndex((item) => item === null);
    if (firstEmpty === -1) {
      return;
    }

    nextDrivers[firstEmpty] = driver;
    this.selectedDrivers.set(nextDrivers);
  }

  protected removeDriver(index: number): void {
    const nextDrivers = [...this.selectedDrivers()];
    nextDrivers[index] = null;
    this.selectedDrivers.set(nextDrivers);
  }

  protected addConstructor(item: FantasyConstructor): void {
    if (!this.canAddConstructor(item)) {
      return;
    }

    const nextConstructors = [...this.selectedConstructors()];
    const firstEmpty = nextConstructors.findIndex((slot) => slot === null);
    if (firstEmpty === -1) {
      return;
    }

    nextConstructors[firstEmpty] = item;
    this.selectedConstructors.set(nextConstructors);
  }

  protected removeConstructor(index: number): void {
    const nextConstructors = [...this.selectedConstructors()];
    nextConstructors[index] = null;
    this.selectedConstructors.set(nextConstructors);
  }

  protected isDriverSelected(driver: FantasyDriver): boolean {
    return this.selectedDrivers().some((item) => item?.id === driver.id);
  }

  protected isConstructorSelected(item: FantasyConstructor): boolean {
    return this.selectedConstructors().some((slot) => slot?.id === item.id);
  }

  protected canAddDriver(driver: FantasyDriver): boolean {
    return (
      this.selectedDriverCount() < 5 &&
      !this.isDriverSelected(driver) &&
      this.remainingBudget() >= driver.price
    );
  }

  protected canAddConstructor(item: FantasyConstructor): boolean {
    return (
      this.selectedConstructorCount() < 2 &&
      !this.isConstructorSelected(item) &&
      this.remainingBudget() >= item.price
    );
  }

  protected formatPrice(value: number): string {
    return `$${value.toFixed(1)}M`;
  }
}
