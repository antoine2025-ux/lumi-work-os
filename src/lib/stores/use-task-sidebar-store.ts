import { create } from "zustand"

interface TaskSidebarState {
  isOpen: boolean
  taskId: string | null
  open: (taskId: string) => void
  close: () => void
  // Add callback for task updates
  onTaskUpdate?: (updatedTask: any) => void
  setOnTaskUpdate: (callback: (updatedTask: any) => void) => void
}

export const useTaskSidebarStore = create<TaskSidebarState>((set) => ({
  isOpen: false,
  taskId: null,
  open: (taskId: string) => set({ isOpen: true, taskId }),
  close: () => set({ isOpen: false, taskId: null }),
  onTaskUpdate: undefined,
  setOnTaskUpdate: (callback: (updatedTask: any) => void) => set({ onTaskUpdate: callback }),
}))

