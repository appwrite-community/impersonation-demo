import { Client, Account, TablesDB, type Models } from "appwrite";

const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID;

export const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
export const account = new Account(client);
export const tablesDB = new TablesDB(client);

export function impersonatedClient(userId: string) {
  const c = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setImpersonateUserId(userId);
  return { account: new Account(c), tablesDB: new TablesDB(c) };
}

export async function listUsers(): Promise<AppwriteUser[]> {
  const res = await fetch(`${ENDPOINT}/users`, {
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": PROJECT_ID,
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to list users");
  const data = await res.json();
  return data.users;
}

export type AppwriteUser = Models.User<Models.Preferences>;

export interface NoteData {
  title: string;
  content: string;
  color: string | null;
  userId: string;
}

export type Note = Models.Row & NoteData;
