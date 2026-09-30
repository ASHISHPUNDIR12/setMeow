import type { Metadata } from "next";
import Dashboard from "./dashboard";

export const metadata: Metadata = {
  title: "Setmeow — thoughtful work, together",
  description: "A calmer workspace for teams to plan, move, and make progress.",
};

export default function Home() {
  return <Dashboard />;
}
