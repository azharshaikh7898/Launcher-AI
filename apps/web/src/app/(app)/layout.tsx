import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/session";

// One provider for every signed-in page, so moving between them doesn't reload the session.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
