export type Activity = {
  id: string;
  name: string;
  area: string;
  kind: string;
  lat: number;
  lng: number;
  duration: number;
  pricePerPerson: number;
  openMinute: number;
  closeMinute: number;
  lowWalking: boolean;
  description: string;
  source: string;
};
export type ActivityView = {
  activity: Activity;
  available: boolean;
  updatedAt: string;
};
export type Preferences = {
  date: string;
  people: number;
  budget: number;
  hours: number;
  focus: string;
  culture: string;
  lowWalking: boolean;
};
export type Stop = {
  activity: Activity;
  arrival: number;
  departure: number;
  travelMinutes: number;
  activityCost: number;
};
export type Plan = {
  stops: Stop[];
  totalCost: number;
  activityCost: number;
  transportCost: number;
  totalMinutes: number;
  returnMinute: number;
  score: number;
  assumptions: string[];
};
export type Trip = {
  id: string;
  preferences: Preferences;
  plan: Plan;
  revision: number;
  affectedIds: string[];
};
export type Recovery = {
  tripId: string;
  basedOnRevision: number;
  plan: Plan;
  retainedActivities: number;
  changedActivities: number;
  planToken: string;
};
export const money = (n: number) =>
  new Intl.NumberFormat("en-NP", { maximumFractionDigits: 0 }).format(n);
export const time = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const kindName: Record<string, string> = {
  bird: "Birdwatching",
  nature: "Nature",
  culture: "Culture",
  food: "Local food",
};
export async function api<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "Cannot reach Pulse. Check that the local server is running.",
    );
  }
  const data = await response
    .json()
    .catch(() => ({ message: "The server could not complete this request." }));
  if (!response.ok)
    throw new Error(
      data.message || data.detail || "Request could not be completed.",
    );
  return data;
}
