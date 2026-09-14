export type RequestStatus = "idle" | "loading" | "success";

export type TripStatus = "OPEN" | "CLOSED";

export type TripCurrency = "EUR" | "USD";

/** Raw trip shape as returned by the API (dates as "yyyy-MM-dd" strings). */
export interface Trip {
  id: string;
  title: string;
  windowStart: string;
  windowEnd: string;
  status: TripStatus;
  createdAt: string;
}

/** Trip window parsed into real Dates, for feeding the DayPicker. */
export interface TripWindow {
  title: string;
  windowStart: Date;
  windowEnd: Date;
  status: TripStatus;
}

export interface Participant {
  id: string;
  name: string;
  budgetAmount: number;
  budgetCurrency: TripCurrency;
  editToken: string;
}

export interface SummaryResponse {
  availabilityByDate: Record<string, number>;
  budget: number | null;
  totalParticipants: number;
}

export interface CreateTripForm {
  title: string;
  windowStart: string;
  windowEnd: string;
}

export interface JoinTripForm {
  name: string;
  budgetAmount: string;
  budgetCurrency: TripCurrency;
}

/** Status of the trip-window fetch that gates JoinForm's calendar. */
export type TripFetchStatus = "loading" | "ready" | "error";

export interface AuthUser {
  name: string;
  email: string;
}
