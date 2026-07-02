import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

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

// Generates an Admin JWT
async function generateAdminJwt(secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const jwt = await create(
    { alg: "HS256", typ: "JWT" },
    { sub: "admin", role: "admin", exp: getNumericDate(24 * 60 * 60) }, // 24 hours
    key
  );
  return jwt;
}

// Verifies Admin JWT
async function verifyAdminJwt(token: string, secret: string) {
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
    return payload && payload.role === "admin";
  } catch (error) {
    return false;
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

    if (!JWT_SECRET) {
      throw new Error("CRITICAL: MEMBER_JWT_SECRET not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, token, payload } = body;

    // --- 1. LOGIN ---
    if (action === "login") {
      const { password } = payload;
      if (password === "Midnight2026") {
        const adminToken = await generateAdminJwt(JWT_SECRET);
        return new Response(
          JSON.stringify({ success: true, token: adminToken }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        throw new Error("Contraseña incorrecta");
      }
    }

    // --- REQUIRE AUTH FOR OTHER ACTIONS ---
    if (!token || !(await verifyAdminJwt(token, JWT_SECRET))) {
      throw new Error("Acceso denegado: Token inválido o expirado");
    }

    // --- 2. GET STATS ---
    if (action === "get_stats") {
      const { count: membersCount } = await supabase.from("members").select("*", { count: "exact", head: true });
      const { count: validCount } = await supabase.from("member_tickets").select("*", { count: "exact", head: true }).eq("status", "valid");
      const { count: usedCount } = await supabase.from("member_tickets").select("*", { count: "exact", head: true }).eq("status", "used");
      const { count: itemsCount } = await supabase.from("menu_items").select("*", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            members: membersCount || 0,
            validTickets: validCount || 0,
            usedTickets: usedCount || 0,
            menuItems: itemsCount || 0
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 3. EVENTS ---
    if (action === "list_events") {
      const { data: events, error: errEvents } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      if (errEvents) throw errEvents;
      return new Response(JSON.stringify({ success: true, events }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_event") {
      const { title, description, event_date, max_tickets_per_member, is_active } = payload;
      const { data: newEvent, error: errInsert } = await supabase.from("events").insert({
        title, description, event_date, max_tickets_per_member: parseInt(max_tickets_per_member) || 1, is_active: is_active === true
      }).select().single();
      if (errInsert) throw errInsert;
      return new Response(JSON.stringify({ success: true, event: newEvent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "edit_event") {
      const { id, title, description, event_date, max_tickets_per_member } = payload;
      const { data: updated, error: errUpd } = await supabase.from("events").update({
        title, description, event_date, max_tickets_per_member: parseInt(max_tickets_per_member) || 1
      }).eq("id", id).select().single();
      if (errUpd) throw errUpd;
      return new Response(JSON.stringify({ success: true, event: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "toggle_event") {
      const { id, is_active } = payload;
      const { data: updatedEvent, error: errUpdate } = await supabase.from("events").update({ is_active }).eq("id", id).select().single();
      if (errUpdate) throw errUpdate;
      return new Response(JSON.stringify({ success: true, event: updatedEvent }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- 4. MEMBERS ---
    if (action === "list_members") {
      const { data: members, error: errMem } = await supabase.from("members").select("*").order("created_at", { ascending: false });
      if (errMem) throw errMem;
      return new Response(JSON.stringify({ success: true, members }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_member_status") {
      const { id, status } = payload; // 'active', 'rejected', 'pending'
      const { data: updatedMem, error: errUpd } = await supabase.from("members").update({ status }).eq("id", id).select().single();
      if (errUpd) throw errUpd;
      return new Response(JSON.stringify({ success: true, member: updatedMem }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- 5. CARTA ---
    if (action === "list_carta") {
      const { data: items, error: errItems } = await supabase.from("menu_items").select("*, menu_categories(name)").order("created_at", { ascending: false });
      if (errItems) throw errItems;
      const { data: categories, error: errCat } = await supabase.from("menu_categories").select("*");
      return new Response(JSON.stringify({ success: true, items, categories }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create_carta_item") {
      const { category_id, name, price, is_active } = payload;
      const { data: newItem, error: errInsert } = await supabase.from("menu_items").insert({
        category_id, name, price: parseFloat(price) || 0, is_active: is_active === true
      }).select().single();
      if (errInsert) throw errInsert;
      return new Response(JSON.stringify({ success: true, item: newItem }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_carta_item") {
      const { id, name, price, is_active } = payload;
      const { data: updatedItem, error: errUpd } = await supabase.from("menu_items").update({ name, price, is_active }).eq("id", id).select().single();
      if (errUpd) throw errUpd;
      return new Response(JSON.stringify({ success: true, item: updatedItem }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_carta_item") {
      const { id } = payload;
      const { error: errDel } = await supabase.from("menu_items").delete().eq("id", id);
      if (errDel) throw errDel;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Unknown action");

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
