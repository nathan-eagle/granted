import Workspace from "@/components/Workspace";
import { ensureSession } from "@/lib/session-store";

export default async function Home() {
  const initialState = await ensureSession();
  return <Workspace initialState={initialState} />;
}
