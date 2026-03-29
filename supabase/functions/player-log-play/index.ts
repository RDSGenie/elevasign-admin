/**
 * player-log-play
 *
 * Called by the Android player each time a media item finishes playing.
 * Inserts a row into signage.play_logs using the service role (bypasses RLS).
 *
 * Auth: device token (same JWT mechanism as player-heartbeat)
 *
 * Body: {
 *   screen_id: string,
 *   media_item_id: string | null,
 *   playlist_id: string | null,
 *   duration_ms: number | null,
 *   completed: boolean,
 *   played_at: string | null  // ISO timestamp; defaults to now()
 * }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller JWT (player must be authenticated)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } =
      await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      screen_id,
      media_item_id = null,
      playlist_id = null,
      duration_ms = null,
      completed = true,
      played_at = null,
    } = body as {
      screen_id: string;
      media_item_id?: string | null;
      playlist_id?: string | null;
      duration_ms?: number | null;
      completed?: boolean;
      played_at?: string | null;
    };

    if (!screen_id || typeof screen_id !== "string") {
      return new Response(JSON.stringify({ error: "screen_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify screen exists
    const { data: screen, error: screenError } = await adminClient
      .schema("signage")
      .from("screens")
      .select("id")
      .eq("id", screen_id)
      .maybeSingle();

    if (screenError || !screen) {
      return new Response(JSON.stringify({ error: "Screen not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert play log
    const { error: insertError } = await adminClient
      .schema("signage")
      .from("play_logs")
      .insert({
        screen_id,
        media_item_id: media_item_id ?? null,
        playlist_id: playlist_id ?? null,
        duration_ms: duration_ms ?? null,
        completed,
        played_at: played_at ?? new Date().toISOString(),
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
