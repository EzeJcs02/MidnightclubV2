import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as base64 from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const ALLOWED_ORIGINS = [
  "https://midnightclub.com.ar",
  "https://www.midnightclub.com.ar",
  "https://mcss26.github.io"
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function verifyJwt(token: string, secret: string) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const payload = await verify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const JWT_SECRET = Deno.env.get("MEMBER_JWT_SECRET")!;

    if (!JWT_SECRET || JWT_SECRET === "change-this-in-production") {
      throw new Error("CRITICAL: MEMBER_JWT_SECRET not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, token, event_id } = body;

    // Verify authentication
    if (!token) throw new Error("Missing authentication token");
    const payload = await verifyJwt(token, JWT_SECRET);
    if (!payload || !payload.id) throw new Error("Invalid or expired session");
    
    const member_id = payload.id;

    // Route: List active events and user's tickets
    if (action === "list_events") {
      const { data: events, error: errEvents } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .order("event_date", { ascending: true });
        
      if (errEvents) throw errEvents;

      const { data: tickets, error: errTickets } = await supabase
        .from("member_tickets")
        .select("*, events(title, event_date)")
        .eq("member_id", member_id);

      if (errTickets) throw errTickets;

      return new Response(
        JSON.stringify({ success: true, events, tickets }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: Generate a ticket
    if (action === "generate_ticket") {
      if (!event_id) throw new Error("Missing event ID");

      // 1. Get event details to check limits
      const { data: event, error: errEvent } = await supabase
        .from("events")
        .select("*")
        .eq("id", event_id)
        .single();

      if (errEvent || !event || !event.is_active) {
        throw new Error("Event not found or inactive");
      }

      // 2. Count existing tickets for this member + event
      const { count, error: errCount } = await supabase
        .from("member_tickets")
        .select("*", { count: "exact", head: true })
        .eq("member_id", member_id)
        .eq("event_id", event_id);

      if (errCount) throw errCount;

      if ((count || 0) >= event.max_tickets_per_member) {
        return new Response(
          JSON.stringify({ success: false, error: "Has alcanzado el límite de entradas para este evento." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Generate secure QR string
      const randomStr = crypto.randomUUID().split("-")[0].toUpperCase();
      const qrCodeString = `MC-TICKET-${event_id.substring(0,6).toUpperCase()}-${member_id.substring(0,6).toUpperCase()}-${randomStr}`;

      // 4. Insert ticket
      const { data: newTicket, error: errInsert } = await supabase
        .from("member_tickets")
        .insert({
          member_id,
          event_id,
          qr_code: qrCodeString,
          status: "valid"
        })
        .select()
        .single();

      if (errInsert) {
        if (errInsert.code === "23505") { // unique violation
          throw new Error("Ya posees una entrada idéntica generada recientemente. Intenta de nuevo.");
        }
        throw errInsert;
      }

      return new Response(
        JSON.stringify({ success: true, ticket: newTicket }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown action");

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
