import { redirect } from "next/navigation";
import { getAccount } from "./lib/server-api";

export default async function Home() {
  redirect((await getAccount()) ? "/dashboard" : "/signin");
}
