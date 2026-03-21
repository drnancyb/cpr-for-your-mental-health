import React, { createContext, useState, useCallback } from 'react';

export interface Filters {
  location: string[];
  gender: string | null;
  specialty: string | null;
  therapy_type: string | null;
  insurance: string | null;
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  location: [],
  gender: null,
  specialty: null,
  therapy_type: null,
  insurance: null,
  search: '',
};

interface FiltersContextValue {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
}

export const FiltersContext = createContext<FiltersContextValue>({
  filters: DEFAULT_FILTERS,
  setFilters: () => {},
  updateFilter: () => {},
  clearFilters: () => {},
  activeFilterCount: 0,
});

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);

  const setFilters = useCallback((newFilters: Filters) => {
    setFiltersState(newFilters);
  }, []);

  const updateFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount =
    (filters.location.length > 0 ? 1 : 0) +
    (filters.gender ? 1 : 0) +
    (filters.specialty ? 1 : 0) +
    (filters.therapy_type ? 1 : 0) +
    (filters.insurance ? 1 : 0);

  return (
    <FiltersContext.Provider value={{ filters, setFilters, updateFilter, clearFilters, activeFilterCount }}>
      {children}
    </FiltersContext.Provider>
  );
}
