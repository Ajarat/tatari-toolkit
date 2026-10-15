/** What the app needs from a cloud-save backend. Supabase implements it today. */
export type CloudUser = { id: string; email: string };

export type AuthEvent = 'initial' | 'signed-in' | 'signed-out' | 'other';

export interface CloudSync {
  signIn(email: string, password: string): Promise<void>;
  /** Returns whether the user has to confirm their email before signing in. */
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  onAuthChange(callback: (user: CloudUser | null, event: AuthEvent) => void): void;
  /** The stored save for the signed-in user, or null if they haven't saved yet. */
  pull(): Promise<{ data: unknown; updatedAt: string } | null>;
  push(data: unknown, updatedAt: string): Promise<void>;
}
