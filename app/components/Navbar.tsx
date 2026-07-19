"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="sticky top-0 z-10 w-full bg-white/90 backdrop-blur-md border-b border-line px-4 sm:px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <svg width="34" height="20" viewBox="0 0 120 40" className="shrink-0">
          <polyline
            points="0,20 25,20 32,6 40,34 48,20 120,20"
            fill="none"
            stroke="#3654F4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pulse-line"
          />
        </svg>
        <h1 className="font-display font-semibold text-[15px] text-ink tracking-tight">
          RepoPulse
        </h1>
      </div>

      {status === "loading" ? (
        <div className="h-8 w-24 bg-raised rounded-lg animate-pulse" />
      ) : session ? (
        <div className="flex items-center gap-3">
          {session.user?.image && (
            <img src={session.user.image} alt="" className="w-7 h-7 rounded-full ring-1 ring-line" />
          )}
          <span className="text-sm text-ink-muted hidden sm:inline font-medium">
            {session.user?.name}
          </span>
          <button
            onClick={() => signOut()}
            className="text-xs font-medium text-ink-muted hover:text-ink bg-raised hover:bg-line px-3 py-1.5 rounded-lg transition-colors border border-line"
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          onClick={() => signIn("github")}
          className="text-sm font-medium bg-signal hover:bg-signal/90 text-base px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Sign in with GitHub
        </button>
      )}
    </nav>
  );
}
