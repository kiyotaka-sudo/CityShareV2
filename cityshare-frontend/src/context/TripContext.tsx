import React, { createContext, PropsWithChildren, useMemo, useReducer } from 'react';
import { Trip } from '../types';

interface TripState {
  trips: Trip[];
  selectedTrip: Trip | null;
}

type TripAction =
  | { type: 'SET_TRIPS'; payload: Trip[] }
  | { type: 'SELECT_TRIP'; payload: Trip | null };

const reducer = (state: TripState, action: TripAction): TripState => {
  switch (action.type) {
    case 'SET_TRIPS':
      return { ...state, trips: action.payload };
    case 'SELECT_TRIP':
      return { ...state, selectedTrip: action.payload };
    default:
      return state;
  }
};

export const TripContext = createContext<{
  trips: Trip[];
  selectedTrip: Trip | null;
  setTrips: (trips: Trip[]) => void;
  selectTrip: (trip: Trip | null) => void;
} | undefined>(undefined);

export function TripProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, { trips: [], selectedTrip: null });

  const value = useMemo(() => ({
    ...state,
    setTrips: (trips: Trip[]) => dispatch({ type: 'SET_TRIPS', payload: trips }),
    selectTrip: (trip: Trip | null) => dispatch({ type: 'SELECT_TRIP', payload: trip })
  }), [state]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
