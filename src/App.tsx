import { useState, useEffect, useCallback } from "react";
import {
  createClient,
  createAccount,
  createTablesDB,
  listUsers,
  ENDPOINT,
  PROJECT_ID,
  DATABASE_ID,
  TABLE_ID,
} from "./lib/appwrite";
import type { AppwriteUser, Note } from "./lib/appwrite";
import { ID, Query } from "appwrite";

const NOTE_COLORS = ["#f472b6", "#60a5fa", "#4ade80", "#fbbf24", "#a78bfa", "#fb923c"];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Tab = "notes" | "users";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppwriteUser | null>(null);
  const [users, setUsers] = useState<AppwriteUser[]>([]);
  const [impersonatedUser, setImpersonatedUser] = useState<AppwriteUser | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("notes");

  const [email, setEmail] = useState("sarah@demo.test");
  const [password, setPassword] = useState("password123");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const isImpersonator = currentUser?.impersonator === true;
  const isImpersonating = impersonatedUser !== null;
  const activeUserId = isImpersonating ? impersonatedUser.$id : currentUser?.$id;

  const getActiveClient = useCallback(() => {
    const client = createClient();
    if (impersonatedUser) {
      client.setImpersonateUserId(impersonatedUser.$id);
    }
    return client;
  }, [impersonatedUser]);

  const fetchNotes = useCallback(
    async (userId: string, impersonateId?: string) => {
      const client = createClient();
      if (impersonateId) {
        client.setImpersonateUserId(impersonateId);
      }
      const tablesDB = createTablesDB(client);
      const res = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [Query.equal("userId", userId), Query.orderDesc("$createdAt")],
      });
      setNotes(res.rows as Note[]);
    },
    []
  );

  // Auto-detect session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const client = createClient();
        const account = createAccount(client);
        const user = await account.get();
        setCurrentUser(user);

        await fetchNotes(user.$id);

        if (user.impersonator) {
          const allUsers = await listUsers(ENDPOINT, PROJECT_ID);
          setUsers(allUsers.filter((u) => u.$id !== user.$id));
        }
      } catch {
        // No active session
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [fetchNotes]);

  const login = async () => {
    setError(null);
    setLoading(true);
    try {
      const client = createClient();
      const account = createAccount(client);
      await account.createEmailPasswordSession({ email, password });
      const user = await account.get();
      setCurrentUser(user);

      await fetchNotes(user.$id);

      if (user.impersonator) {
        const allUsers = await listUsers(ENDPOINT, PROJECT_ID);
        setUsers(allUsers.filter((u) => u.$id !== user.$id));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const impersonate = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const impClient = createClient().setImpersonateUserId(userId);
      const impAccount = createAccount(impClient);
      const impUser = await impAccount.get();
      setImpersonatedUser(impUser);
      setTab("notes");

      await fetchNotes(userId, userId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Impersonation failed");
    } finally {
      setLoading(false);
    }
  };

  const stopImpersonating = async () => {
    setImpersonatedUser(null);
    setEditingNote(null);
    setTab("notes");
    if (currentUser) {
      await fetchNotes(currentUser.$id);
    }
  };

  const createNote = async () => {
    if (!activeUserId || !newTitle.trim()) return;
    setLoading(true);
    try {
      const client = getActiveClient();
      const tablesDB = createTablesDB(client);
      const color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: ID.unique(),
        data: {
          title: newTitle.trim(),
          content: newContent.trim(),
          color,
          userId: activeUserId,
        },
      });
      setNewTitle("");
      setNewContent("");
      await fetchNotes(activeUserId, impersonatedUser?.$id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create note");
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async () => {
    if (!editingNote || !activeUserId) return;
    setLoading(true);
    try {
      const client = getActiveClient();
      const tablesDB = createTablesDB(client);
      await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: editingNote.$id,
        data: {
          title: editTitle.trim(),
          content: editContent.trim(),
        },
      });
      setEditingNote(null);
      await fetchNotes(activeUserId, impersonatedUser?.$id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update note");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const logout = async () => {
    try {
      const account = createAccount(createClient());
      await account.deleteSession({ sessionId: "current" });
    } catch { /* ignore */ }
    setCurrentUser(null);
    setUsers([]);
    setImpersonatedUser(null);
    setNotes([]);
  };

  // Loading state
  if (loading && !currentUser) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-header">
            <h1>Notes</h1>
            <p>Checking session...</p>
          </div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!currentUser) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-header">
            <h1>Notes</h1>
            <p>Sign in to your account</p>
          </div>
          {error && <div className="error-banner">{error}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login();
            }}
          >
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="app">
      {isImpersonating && (
        <div className="impersonation-banner">
          <div className="banner-content">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              Viewing as <strong>{impersonatedUser.name}</strong>
            </span>
          </div>
          <button className="btn-stop" onClick={stopImpersonating}>
            Stop impersonating
          </button>
        </div>
      )}

      <div className="layout">
        <nav className="sidebar">
          <div className="sidebar-top">
            <div className="app-logo">N</div>
            <span className="app-name">Notes</span>
          </div>

          <div className="sidebar-nav">
            <button
              className={`nav-item ${tab === "notes" ? "active" : ""}`}
              onClick={() => setTab("notes")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Notes
            </button>

            {isImpersonator && !isImpersonating && (
              <button
                className={`nav-item ${tab === "users" ? "active" : ""}`}
                onClick={() => setTab("users")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                Users
              </button>
            )}
          </div>

          <div className="sidebar-bottom">
            <div className="user-pill">
              <div
                className="avatar-sm"
                style={{ background: `hsl(${currentUser.name.charCodeAt(0) * 7}, 45%, 45%)` }}
              >
                {getInitials(currentUser.name)}
              </div>
              <div className="user-pill-info">
                <span className="user-pill-name">{currentUser.name}</span>
                {isImpersonator && <span className="badge-imp">Admin</span>}
              </div>
              <button className="btn-icon" onClick={logout} title="Sign out">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </nav>

        <main className="content">
          {error && <div className="error-banner">{error}</div>}

          {tab === "notes" && (
            <>
              <div className="content-header">
                <h1>{isImpersonating ? `${impersonatedUser.name}'s Notes` : "My Notes"}</h1>
                <span className="count-badge">{notes.length}</span>
              </div>

              <div className="create-note">
                <input
                  type="text"
                  placeholder="Note title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newContent.trim() && createNote()}
                />
                <textarea
                  placeholder="Write something..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={2}
                />
                <div className="create-note-actions">
                  <button
                    className="btn-primary btn-auto"
                    onClick={createNote}
                    disabled={!newTitle.trim() || loading}
                  >
                    Add note
                  </button>
                </div>
              </div>

              <div className="notes-grid">
                {notes.map((note) => (
                  <div
                    key={note.$id}
                    className="note-card"
                    style={{ "--note-color": note.color || "#666" } as React.CSSProperties}
                  >
                    {editingNote?.$id === note.$id ? (
                      <div className="note-edit">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                        />
                        <div className="edit-actions">
                          <button className="btn-primary btn-sm btn-auto" onClick={updateNote} disabled={loading}>
                            Save
                          </button>
                          <button className="btn-ghost btn-sm" onClick={() => setEditingNote(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="note-color-dot" />
                        <h4>{note.title}</h4>
                        <p>{note.content || "\u00A0"}</p>
                        <div className="note-footer">
                          <span className="note-time">{timeAgo(note.$createdAt)}</span>
                          <button className="btn-ghost btn-sm" onClick={() => startEdit(note)}>
                            Edit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="empty-notes">
                    <p>No notes yet. Create your first one above.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "users" && (
            <>
              <div className="content-header">
                <h1>Users</h1>
                <span className="count-badge">{users.length}</span>
              </div>

              <div className="users-grid">
                {users.map((user) => (
                  <div key={user.$id} className="user-card">
                    <div
                      className="avatar"
                      style={{ background: `hsl(${user.name.charCodeAt(0) * 7}, 45%, 45%)` }}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div className="user-card-info">
                      <span className="user-card-name">{user.name}</span>
                      <span className="user-card-email">{user.email}</span>
                    </div>
                    <button className="btn-accent" onClick={() => impersonate(user.$id)}>
                      Impersonate
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
