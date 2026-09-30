export type RequestStatus = "idle" | "loading" | "success";

export type TripStatus = "OPEN" | "VOTING" | "CONFIRMED" | "PLANNING" | "CLOSED";

export type DestinationType = "MOUNTAIN" | "BEACH" | "CITY" | "ROADTRIP" | "INDIFFERENT";

export type Interest = "GASTRONOMY" | "CULTURE" | "NIGHTLIFE" | "SPORT" | "NATURE" | "RELAX";

export type ProposalAngle = "CONSENSUS" | "BUDGET" | "AMBITIOUS";

export type TripCurrency = "EUR" | "USD";

/** Raw trip shape as returned by the API (dates as "yyyy-MM-dd" strings). */
export interface Trip {
  id: string;
  title: string;
  windowStart: string;
  windowEnd: string;
  status: TripStatus;
  createdAt: string;
  creatorId: string;
  preferredDurationDays: number | null;
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
  destinationType: DestinationType | null;
  originCity: string | null;
  interests: Interest[];
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
  preferredDurationDays: string;
}

export interface JoinTripForm {
  name: string;
  budgetAmount: string;
  budgetCurrency: TripCurrency;
  destinationType: DestinationType | "";
  originCity: string;
  interests: Interest[];
  notes: string;
}

/** Status of the trip-window fetch that gates JoinForm's calendar. */
export type TripFetchStatus = "loading" | "ready" | "error";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface TripProposalItem {
  id: string;
  angle: ProposalAngle;
  destination: string;
  country: string;
  fitScore: number;
  whyFits: string;
  tradeoffs: string;
  days: string[];
  costBreakdown: { transport: number; lodging: number; food: number; activities: number };
  estimatedCostPerPerson: number;
  currency: string;
  overBudgetCount: number;
  bestDates: { start: string; end: string };
  votes: number;
}

export interface ProposalsResponse {
  tripId: string;
  status: TripStatus;
  generation: number | null;
  model: string | null;
  generatedAt: string | null;
  myVoteProposalId: string | null;
  proposals: TripProposalItem[];
}

export interface TripTask {
  id: string;
  title: string;
  assigneeId: string | null;
  done: boolean;
}
