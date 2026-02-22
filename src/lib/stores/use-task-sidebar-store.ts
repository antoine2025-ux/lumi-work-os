import { create } from "zustand"

interface TaskSidebarState {
  isOpen: boolean
  taskId: string | null
  open: (taskId: string) => void
  close: () => void
  // Add callback for task updates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTaskUpdate?: (updatedTask: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOnTaskUpdate: (callback: (updatedTask: any) => void) => void
}

export const useTaskSidebarStore = create<TaskSidebarState>((set) => ({
  isOpen: false,
  taskId: null,
  open: (taskId: string) => set({ isOpen: true, taskId }),
  close: () => set({ isOpen: false, taskId: null }),
  onTaskUpdate: undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOnTaskUpdate: (callback: (updatedTask: any) => void) => set({ onTaskUpdate: callback }),
}))

