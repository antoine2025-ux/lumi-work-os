import { create } from "zustand"

interface TaskSidebarState {
  isOpen: boolean
  taskId: string | null
  open: (taskId: string) => void
  close: () => void
}

export const useTaskSidebarStore = create<TaskSidebarState>((set) => ({
  isOpen: false,
  taskId: null,
  open: (taskId: string) => set({ isOpen: true, taskId }),
  close: () => set({ isOpen: false, taskId: null }),
}))

