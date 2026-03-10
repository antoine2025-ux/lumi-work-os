import { create } from 'zustand'

interface ActivePageState {
  activePageId: string | null
  activePageTitle: string
  setActivePage: (id: string, title: string) => void
  setActivePageTitle: (title: string) => void
  clearActivePage: () => void
}

export const useActivePageStore = create<ActivePageState>((set) => ({
  activePageId: null,
  activePageTitle: '',
  setActivePage: (id, title) => set({ activePageId: id, activePageTitle: title }),
  setActivePageTitle: (title) => set((s) => (s.activePageId ? { activePageTitle: title } : s)),
  clearActivePage: () => set({ activePageId: null, activePageTitle: '' }),
}))
