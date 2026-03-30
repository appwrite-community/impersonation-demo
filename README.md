# Impersonation Demo

A notes app built with React, TypeScript, and [Appwrite](https://appwrite.io) that demonstrates the **user impersonation** feature. An admin with the impersonator capability can browse all users, impersonate any of them, and view or create notes as that user.

This is the companion project for the [Build a notes app with user impersonation](https://appwrite.io/blog/post/user-impersonation-tutorial) tutorial.

## Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/appwrite-community/impersonation-demo.git
cd impersonation-demo
pnpm install
```

2. Copy `.env.example` to `.env` and fill in your Appwrite project details:

```bash
cp .env.example .env
```

3. In the Appwrite Console, create the following:

- A database with ID `notes-app`
- A table with ID `notes` containing columns: `title` (text, required), `content` (text, required), `color` (text), `userId` (text, required)
- Table permissions: **Create** for Users role
- **Row security** enabled
- At least two users, one with the **impersonator** capability enabled

4. Start the dev server:

```bash
pnpm run dev
```

## How it works

- Any user can sign in and create their own notes
- Users with the impersonator capability see a **Users** tab in the sidebar
- Clicking **Impersonate** on a user switches the app context to that user using `client.setImpersonateUserId()`
- An amber banner appears at the top showing who you are viewing as
- Notes created while impersonating are owned by the impersonated user
- Clicking **Stop impersonating** returns to the admin's own view

## Tech stack

- [React](https://react.dev) + TypeScript
- [Vite](https://vite.dev)
- [Appwrite](https://appwrite.io) (Auth, Databases, User Impersonation)
