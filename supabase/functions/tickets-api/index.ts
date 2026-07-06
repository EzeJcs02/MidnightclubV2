import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as base64 from "https://deno.land/std@0.177.0/encoding/base64.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

const ALLOWED_ORIGINS = [
  "https://midnightclub.com.ar",
  "https://www.midnightclub.com.ar",
  "https://mcss26.github.io",
  "https://midnightclub-v2-chi.vercel.app",
  "https://midnightclub-v2-ezejcs02s-projects.vercel.app",
  "https://midnightclub-v2-git-main-ezejcs02s-projects.vercel.app"
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
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
    const SCANNER_PIN = Deno.env.get("SCANNER_PIN")!;

    if (!JWT_SECRET || JWT_SECRET === "change-this-in-production") {
      throw new Error("CRITICAL: MEMBER_JWT_SECRET not configured");
    }
    if (!SCANNER_PIN) {
      throw new Error("CRITICAL: SCANNER_PIN not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, token, event_id } = body;

    // Verify authentication for member actions
    let member_id = null;
    if (action !== "validate_ticket") {
      if (!token) throw new Error("Missing authentication token");
      const payload = await verifyJwt(token, JWT_SECRET);
      if (!payload || !payload.sub) throw new Error("Invalid or expired session");
      member_id = payload.sub;
    }

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
        if (errInsert.code === "MCX01") { // trigger: límite excedido (chequeo atómico)
          return new Response(
            JSON.stringify({ success: false, error: "Has alcanzado el límite de entradas para este evento." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw errInsert;
      }

      return new Response(
        JSON.stringify({ success: true, ticket: newTicket }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Route: Validate a ticket (For Scanner Panel)
    if (action === "validate_ticket") {
      const { qr_code, pin } = body;

      const logScan = (entry: { ticketType: string; eventId: string | null; result: "accepted" | "rejected"; reason?: string }) => {
        supabase.from("ticket_scans").insert({
          qr_code: qr_code || null,
          ticket_type: entry.ticketType,
          event_id: entry.eventId,
          result: entry.result,
          reason: entry.reason || null,
        }).then(({ error }) => { if (error) console.error("scan log error:", error); });
      };

      // Simple security for the scanner panel (PIN code)
      if (pin !== SCANNER_PIN) {
        logScan({ ticketType: "unknown", eventId: null, result: "rejected", reason: "pin incorrecto" });
        throw new Error("PIN de seguridad incorrecto");
      }
      if (!qr_code) throw new Error("Falta el código QR");

      // Buscar el ticket (primero como entrada de socio, después como entrada paga)
      const { data: ticket, error: errFind } = await supabase
        .from("member_tickets")
        .select("*, events(title), members(nombre)")
        .eq("qr_code", qr_code)
        .maybeSingle();

      if (ticket) {
        if (ticket.status === "used") {
          logScan({ ticketType: "member", eventId: ticket.event_id, result: "rejected", reason: "ya usada" });
          return new Response(
            JSON.stringify({ success: false, error: "ESTA ENTRADA YA FUE USADA", ticket }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (ticket.status !== "valid") {
          logScan({ ticketType: "member", eventId: ticket.event_id, result: "rejected", reason: "no válida" });
          return new Response(
            JSON.stringify({ success: false, error: "ESTA ENTRADA NO ES VÁLIDA", ticket }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: errUpdate } = await supabase
          .from("member_tickets")
          .update({ status: "used" })
          .eq("id", ticket.id);

        if (errUpdate) throw errUpdate;

        logScan({ ticketType: "member", eventId: ticket.event_id, result: "accepted" });
        return new Response(
          JSON.stringify({ success: true, message: "ENTRADA VÁLIDA", ticket }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // No es entrada de socio: probar como entrada paga
      const { data: paidTicket, error: errFindPaid } = await supabase
        .from("paid_tickets")
        .select("*, events(title)")
        .eq("qr_code", qr_code)
        .maybeSingle();

      if (!paidTicket) {
        logScan({ ticketType: "unknown", eventId: null, result: "rejected", reason: "código no encontrado" });
        throw new Error("CÓDIGO INVÁLIDO O NO ENCONTRADO");
      }

      if (paidTicket.status === "used") {
        logScan({ ticketType: "paid", eventId: paidTicket.event_id, result: "rejected", reason: "ya usada" });
        return new Response(
          JSON.stringify({ success: false, error: "ESTA ENTRADA YA FUE USADA", ticket: paidTicket }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (paidTicket.status !== "valid") {
        logScan({ ticketType: "paid", eventId: paidTicket.event_id, result: "rejected", reason: "no válida" });
        return new Response(
          JSON.stringify({ success: false, error: "ESTA ENTRADA NO ES VÁLIDA", ticket: paidTicket }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: errUpdatePaid } = await supabase
        .from("paid_tickets")
        .update({ status: "used" })
        .eq("id", paidTicket.id);

      if (errUpdatePaid) throw errUpdatePaid;

      logScan({ ticketType: "paid", eventId: paidTicket.event_id, result: "accepted" });
      return new Response(
        JSON.stringify({ success: true, message: "ENTRADA VÁLIDA", ticket: paidTicket }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown action");

  } catch (error) {
    console.error("tickets-api error:", error);
    // Los errores de Postgrest/Postgres traen ".code" (SQLSTATE) y pueden filtrar
    // detalles del schema; los mensajes que lanzamos nosotros ("new Error(...)") no.
    const clientMessage = (error && typeof error === "object" && "code" in error)
      ? "Error interno del servidor"
      : (error?.message || "Error interno del servidor");
    return new Response(
      JSON.stringify({ success: false, error: clientMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
