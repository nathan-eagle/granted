"use client";

import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
}

const ensuredSupabaseUrl: string = supabaseUrl;
const ensuredSupabaseAnonKey: string = supabaseAnonKey;

export function createSupabaseBrowserClient(): SupabaseClient {
  return createBrowserClient(ensuredSupabaseUrl, ensuredSupabaseAnonKey);
}

export function useSupabaseBrowserClient(): SupabaseClient {
  return useMemo(() => createSupabaseBrowserClient(), []);
}
