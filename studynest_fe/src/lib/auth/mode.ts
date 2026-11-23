export type AuthMode = "cookie" | "dpop";

export const AUTH_MODE: AuthMode = process.env.NEXT_PUBLIC_AUTH_MODE === "dpop" ? "dpop" : "cookie";
export const isDpopMode: boolean = AUTH_MODE === "dpop";
