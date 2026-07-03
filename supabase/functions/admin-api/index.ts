import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v2.8/mod.ts";

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

// Rate limiting config (mismo patrón que auth-member)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function checkRateLimit(identifier: string): { allowed: boolean; resetIn: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (record && now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(identifier);
  }

  const current = loginAttempts.get(identifier);
  if (!current) {
    return { allowed: true, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  return {
    allowed: current.count < MAX_LOGIN_ATTEMPTS,
    resetIn: Math.max(0, RATE_LIMIT_WINDOW_MS - (now - current.firstAttempt)),
  };
}

function recordLoginAttempt(identifier: string): void {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

function clearLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
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
    const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")!;

    if (!JWT_SECRET) {
      throw new Error("CRITICAL: MEMBER_JWT_SECRET not configured");
    }
    if (!ADMIN_PASSWORD) {
      throw new Error("CRITICAL: ADMIN_PASSWORD not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action, token, payload } = body;

    // --- 1. LOGIN ---
    if (action === "login") {
      const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
      const rateCheck = checkRateLimit(clientIP);
      if (!rateCheck.allowed) {
        const resetMinutes = Math.ceil(rateCheck.resetIn / 60000);
        return new Response(
          JSON.stringify({ success: false, error: `Demasiados intentos. Reintenta en ${resetMinutes} minutos.` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }

      const { password } = payload;
      if (password === ADMIN_PASSWORD) {
        clearLoginAttempts(clientIP);
        const adminToken = await generateAdminJwt(JWT_SECRET);
        return new Response(
          JSON.stringify({ success: true, token: adminToken }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        recordLoginAttempt(clientIP);
        throw new Error("Contraseña incorrecta");
      }
    }

    // --- REQUIRE AUTH FOR OTHER ACTIONS ---
    if (!token || !(await verifyAdminJwt(token, JWT_SECRET))) {
      throw new Error("Acceso denegado: Token inválido o expirado");
    }

    const getDateBounds = (monthStr?: string) => {
      let startOfMonth, endOfMonth;
      if (monthStr && monthStr.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = monthStr.split("-");
        startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
        endOfMonth = new Date(parseInt(year), parseInt(month), 1);
      } else {
        const now = new Date();
        startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
      return { startStr: startOfMonth.toISOString(), endStr: endOfMonth.toISOString() };
    };

    // --- 2. GET STATS ---
    if (action === "get_stats") {
      const { startStr, endStr } = getDateBounds(payload?.month);
      
      const { count: qrPagos } = await supabase.from("paid_tickets").select("*", { count: "exact", head: true }).gte("created_at", startStr).lt("created_at", endStr);
      const { count: qrMembers } = await supabase.from("member_tickets").select("*", { count: "exact", head: true }).gte("created_at", startStr).lt("created_at", endStr);
      
      const { count: ingresosEscaneadosMembers } = await supabase.from("member_tickets").select("*", { count: "exact", head: true }).eq("status", "used").gte("created_at", startStr).lt("created_at", endStr);
      const { count: ingresosEscaneadosPagos } = await supabase.from("paid_tickets").select("*", { count: "exact", head: true }).eq("status", "used").gte("created_at", startStr).lt("created_at", endStr);
      
      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            qrPagos: qrPagos || 0,
            qrMembers: qrMembers || 0,
            ingresosEscaneados: (ingresosEscaneadosMembers || 0) + (ingresosEscaneadosPagos || 0),
            ingresosRechazados: 0 // No backend table for rejected scans yet
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 3. EVENTS ---
    if (action === "list_events") {
      const { startStr, endStr } = getDateBounds(payload?.month);
      const { data: events, error: errEvents } = await supabase.from("events").select("*").gte("event_date", startStr).lt("event_date", endStr).order("created_at", { ascending: false });
      if (errEvents) throw errEvents;

      // Estadísticas por evento: socios (member_tickets, gratis) vs clientes pagos (paid_tickets)
      const eventsWithStats = await Promise.all((events || []).map(async (ev) => {
        const [memberEmitted, memberUsed, paidRows] = await Promise.all([
          supabase.from("member_tickets").select("*", { count: "exact", head: true }).eq("event_id", ev.id),
          supabase.from("member_tickets").select("*", { count: "exact", head: true }).eq("event_id", ev.id).eq("status", "used"),
          supabase.from("paid_tickets").select("amount, status").eq("event_id", ev.id),
        ]);

        const paidList = paidRows.data || [];
        const revenue = paidList.reduce((sum, r) => sum + Number(r.amount || 0), 0);

        return {
          ...ev,
          stats: {
            memberEmitted: memberEmitted.count || 0,
            memberUsed: memberUsed.count || 0,
            paidSold: paidList.length,
            paidUsed: paidList.filter((r) => r.status === "used").length,
            revenue,
          },
        };
      }));

      return new Response(JSON.stringify({ success: true, events: eventsWithStats }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    console.error("admin-api error:", error);
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
