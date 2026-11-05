import { create } from 'zustand';

export const useBusStore = create((set) => ({
  routes: [],
  stops: [],
  graph: { nodes: {}, edges: {} },

  from: null,
  to: null,
  selectedRoute: null,

  idsResult: null,
  bfsResult: null,
  isSearching: false,
  searchError: null,

  currentStep: 0,
  isPlaying: false,
  playbackSpeed: 500,

  setRoutes: (routes) => set({ routes }),
  setStops: (stops) => set({ stops }),
  setGraph: (graph) => set({ graph }),

  setFrom: (location) => set({ from: location }),
  setTo: (location) => set({ to: location }),
  setSelectedRoute: (routeId) => set({ selectedRoute: routeId }),

  setIDSResult: (result) => set({ idsResult: result }),
  setBFSResult: (result) => set({ bfsResult: result }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setSearchError: (error) => set({ searchError: error }),

  setCurrentStep: (step) => set({ currentStep: step }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  resetSearch: () =>
    set({
      from: null,
      to: null,
      idsResult: null,
      bfsResult: null,
      currentStep: 0,
      isPlaying: false,
      searchError: null
    }),

  clearResults: () =>
    set({
      idsResult: null,
      bfsResult: null,
      currentStep: 0,
      isPlaying: false,
      searchError: null
    })
}));
