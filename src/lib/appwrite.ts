import { Client, Account, TablesDB, type Models } from "appwrite";

const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID;

export { ENDPOINT, PROJECT_ID, DATABASE_ID, TABLE_ID };

export function createClient() {
  return new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

export function createAccount(client: Client) {
  return new Account(client);
}

export function createTablesDB(client: Client) {
  return new TablesDB(client);
}

export type AppwriteUser = Models.User<Models.Preferences>;

export interface NoteData {
  title: string;
  content: string;
  color: string | null;
  userId: string;
}

export type Note = Models.Row & NoteData;

export async function listUsers(endpoint: string, projectId: string): Promise<AppwriteUser[]> {
  const res = await fetch(`${endpoint}/users`, {
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to list users");
  const data = await res.json();
  return data.users;
}
