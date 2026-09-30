import { LifeSpecimen } from '../core/models';
import { SpecimenStoragePort } from '../ports/specimen-storage.port';

const SPECIMEN_STORAGE_KEY = 'parallel_life_specimens_v1';

export class LocalSpecimenAdapter implements SpecimenStoragePort {
  getAll(): LifeSpecimen[] {
    const raw = localStorage.getItem(SPECIMEN_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  save(specimen: LifeSpecimen): void {
    const list = this.getAll();
    const existingIdx = list.findIndex(s => s.id === specimen.id);
    if (existingIdx >= 0) {
      list[existingIdx] = specimen;
    } else {
      list.unshift(specimen);
    }
    localStorage.setItem(SPECIMEN_STORAGE_KEY, JSON.stringify(list));
  }

  remove(id: string): void {
    const list = this.getAll().filter(s => s.id !== id);
    localStorage.setItem(SPECIMEN_STORAGE_KEY, JSON.stringify(list));
  }

  clear(): void {
    localStorage.removeItem(SPECIMEN_STORAGE_KEY);
  }
}
