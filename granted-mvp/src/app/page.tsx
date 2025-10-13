import { cookies } from "next/headers";
import Workspace from "@/components/Workspace";
import { ensureSession, PROJECT_COOKIE } from "@/lib/session-store";
import { createSupabaseServerClient } from "@/lib/supabase-server-auth";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const projectId = cookieStore.get(PROJECT_COOKIE)?.value ?? null;

  const initialState = await ensureSession({
    projectIdFromClient: projectId,
    authUserId: user?.id ?? null,
    authEmail: user?.email ?? null,
  });
  return <Workspace initialState={initialState} />;
}
