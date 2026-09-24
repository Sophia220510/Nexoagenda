import { createClient, type User } from "@supabase/supabase-js";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
] as const;

type RequiredEnv = (typeof REQUIRED_ENV)[number];
type Env = Record<RequiredEnv, string>;

function readEnv(): Env {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    throw new Error(`Variáveis ausentes em .env.local:\n${missing.map((name) => `- ${name}`).join("\n")}`);
  }
  return Object.fromEntries(REQUIRED_ENV.map((name) => [name, process.env[name]!.trim()])) as Env;
}

const internalIdentifier = (username: string) => `${username}@auth.nexo.invalid`;
function temporaryPassword() { const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"; const bytes=crypto.getRandomValues(new Uint8Array(20)); return Array.from(bytes,(byte)=>alphabet[byte%alphabet.length]).join(""); }

function addDateDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function nextWeekday(today: string, weekday: number, extraWeeks = 0) {
  const current = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const delta = ((weekday - current + 7) % 7 || 7) + extraWeeks * 7;
  return addDateDays(today, delta);
}

async function main() {
  const env = readEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function findUser(email: string) {
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
      if (match) return match;
      if (data.users.length < 1000) return null;
    }
    throw new Error(`Não foi possível concluir a busca do usuário ${email}.`);
  }

  async function ensureUser(username: string, password: string, fullName: string): Promise<User> {
    const email = internalIdentifier(username);
    const existing = await findUser(email);
    if (existing) { const { data,error }=await supabase.auth.admin.updateUserById(existing.id,{password,email_confirm:true,user_metadata:{full_name:fullName,username}}); if(error)throw error; return data.user; }
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName, username },
    });
    if (error) throw error;
    return data.user;
  }

  const credentials = { master: { username:"nexo.admin",password:temporaryPassword() }, lucas: { username:"lucas.owner",password:temporaryPassword() }, rafael: { username:"rafael.demo",password:temporaryPassword() }, pedro: { username:"pedro.demo",password:temporaryPassword() } };
  const master = await ensureUser(credentials.master.username, credentials.master.password, "Master Admin NEXO");
  const lucasUser = await ensureUser(credentials.lucas.username, credentials.lucas.password, "Lucas — Owner Demo");
  const rafaelUser = await ensureUser(credentials.rafael.username, credentials.rafael.password, "Rafael — Profissional Demo");
  const pedroUser = await ensureUser(credentials.pedro.username, credentials.pedro.password, "Pedro — Profissional Demo");

  for (const [user, fullName] of [[master, "Master Admin NEXO"], [rafaelUser, "Rafael"], [lucasUser, "Lucas"], [pedroUser, "Pedro"]] as const) {
    const { error } = await supabase.from("profiles").upsert({ id: user.id, full_name: fullName }, { onConflict: "id" });
    if (error) throw error;
  }
  const identityRows = [[master, credentials.master.username], [lucasUser, credentials.lucas.username], [rafaelUser, credentials.rafael.username], [pedroUser, credentials.pedro.username]] as const;
  for (const [user, username] of identityRows) {
    const { error } = await supabase.from("login_identities").upsert({ user_id:user.id, username, username_normalized:username, internal_auth_identifier:internalIdentifier(username), active:true, must_change_password:true }, { onConflict:"user_id" });
    if (error) throw error;
  }

  const { error: adminError } = await supabase.from("platform_admins").upsert({ user_id: master.id, active: true }, { onConflict: "user_id" });
  if (adminError) throw adminError;

  const { data: existingBusiness, error: businessLookupError } = await supabase.from("businesses").select("id").eq("slug", "barbearia-nexo-demo").maybeSingle();
  if (businessLookupError) throw businessLookupError;
  let businessId = existingBusiness?.id;
  if (businessId) {
    const { error } = await supabase.from("businesses").update({ name: "Barbearia NEXO Demo", business_type: "BARBERSHOP", phone: "+5511000000000", timezone: "America/Sao_Paulo", active: true }).eq("id", businessId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("businesses").insert({ name: "Barbearia NEXO Demo", business_type: "BARBERSHOP", slug: "barbearia-nexo-demo", phone: "+5511000000000", timezone: "America/Sao_Paulo", active: true }).select("id").single();
    if (error) throw error;
    businessId = data.id;
  }

  const memberRows = [
    { business_id: businessId, user_id: lucasUser.id, role: "OWNER" },
    { business_id: businessId, user_id: rafaelUser.id, role: "PROFESSIONAL" },
    { business_id: businessId, user_id: pedroUser.id, role: "PROFESSIONAL" },
  ];
  const { error: memberError } = await supabase.from("business_members").upsert(memberRows, { onConflict: "business_id,user_id" });
  if (memberError) throw memberError;

  async function ensureProfessional(userId: string, name: string, bio: string, completed: boolean) {
    const { data: current, error: lookupError } = await supabase.from("professionals").select("id").eq("business_id", businessId).eq("user_id", userId).maybeSingle();
    if (lookupError) throw lookupError;
    if (current) {
      const { error } = await supabase.from("professionals").update({ name, bio, active: true, setup_completed_at: completed ? new Date().toISOString() : null }).eq("id", current.id);
      if (error) throw error;
      return current.id;
    }
    const { data, error } = await supabase.from("professionals").insert({ business_id: businessId, user_id: userId, name, bio, active: true, setup_completed_at: completed ? new Date().toISOString() : null }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  const professionalIds = {
    Lucas: await ensureProfessional(lucasUser.id, "Lucas", "Proprietário e especialista em cortes modernos.", true),
    Rafael: await ensureProfessional(rafaelUser.id, "Rafael", "Especialista em cortes clássicos e barba.", false),
    Pedro: await ensureProfessional(pedroUser.id, "Pedro", "Especialista em corte, barba e platinado.", false),
  };

  const serviceDefinitions = [
    { name: "Corte masculino", description: "Corte personalizado e finalização.", price_cents: 5000, default_duration_minutes: 45 },
    { name: "Barba", description: "Modelagem, toalha quente e acabamento.", price_cents: 3500, default_duration_minutes: 30 },
    { name: "Corte + barba", description: "Experiência completa de corte e barba.", price_cents: 7500, default_duration_minutes: 75 },
    { name: "Acabamento", description: "Pezinho e acabamento rápido.", price_cents: 2000, default_duration_minutes: 15 },
    { name: "Sobrancelha", description: "Design e acabamento.", price_cents: 2000, default_duration_minutes: 15 },
    { name: "Luzes", description: "Clareamento e tonalização.", price_cents: 15000, default_duration_minutes: 120 },
    { name: "Platinado", description: "Descoloração e tonalização profissional.", price_cents: 20000, default_duration_minutes: 180 },
    { name: "Hidratação", description: "Tratamento e finalização.", price_cents: 6000, default_duration_minutes: 45 },
  ];
  const serviceIds: Record<string, string> = {};
  for (const definition of serviceDefinitions) {
    const { data: current, error: lookupError } = await supabase.from("services").select("id").eq("business_id", businessId).eq("name", definition.name).maybeSingle();
    if (lookupError) throw lookupError;
    if (current) {
      const { error } = await supabase.from("services").update({ ...definition, active: true }).eq("id", current.id);
      if (error) throw error;
      serviceIds[definition.name] = current.id;
    } else {
      const { data, error } = await supabase.from("services").insert({ business_id: businessId, ...definition, active: true }).select("id").single();
      if (error) throw error;
      serviceIds[definition.name] = data.id;
    }
  }

  const assignments = [
    ...serviceDefinitions.map((service) => ({ business_id: businessId, professional_id: professionalIds.Lucas, service_id: serviceIds[service.name], duration_override_minutes: service.name === "Corte masculino" ? 35 : null, active: true })),
    ...["Corte masculino", "Barba", "Corte + barba", "Acabamento"].map((name) => ({ business_id: businessId, professional_id: professionalIds.Rafael, service_id: serviceIds[name], duration_override_minutes: name === "Corte masculino" ? 45 : null, active: true })),
    ...["Corte masculino", "Barba", "Corte + barba", "Platinado"].map((name) => ({ business_id: businessId, professional_id: professionalIds.Pedro, service_id: serviceIds[name], duration_override_minutes: name === "Corte masculino" ? 50 : null, active: true })),
  ];
  const { error: assignmentError } = await supabase.from("professional_services").upsert(assignments, { onConflict: "professional_id,service_id" });
  if (assignmentError) throw assignmentError;

  const demoProfessionalIdList = Object.values(professionalIds);
  const { error: deleteHoursError } = await supabase.from("working_hours").delete().in("professional_id", demoProfessionalIdList);
  if (deleteHoursError) throw deleteHoursError;
  const hours: Array<{ business_id: string; professional_id: string; weekday: number; start_time: string; end_time: string }> = [];
  const addHours = (professionalId: string, days: number[], periods: Array<[string, string]>) => days.forEach((weekday) => periods.forEach(([start_time, end_time]) => hours.push({ business_id: businessId, professional_id: professionalId, weekday, start_time, end_time })));
  addHours(professionalIds.Rafael, [1, 2, 3, 4, 5], [["09:00", "12:00"], ["13:00", "18:00"]]);
  addHours(professionalIds.Rafael, [6], [["09:00", "14:00"]]);
  addHours(professionalIds.Lucas, [2, 3, 4, 5, 6], [["10:00", "13:00"], ["14:00", "19:00"]]);
  addHours(professionalIds.Pedro, [1, 3, 4, 5, 6], [["09:00", "12:00"], ["13:30", "18:00"]]);
  const { error: hoursError } = await supabase.from("working_hours").insert(hours);
  if (hoursError) throw hoursError;

  const { error: deleteRecurringError } = await supabase.from("recurring_blocks").delete().in("professional_id", demoProfessionalIdList);
  if (deleteRecurringError) throw deleteRecurringError;
  const { error: recurringError } = await supabase.from("recurring_blocks").insert({ business_id: businessId, professional_id: professionalIds.Lucas, weekday: 4, start_time: "16:00", end_time: "16:30", reason: "Intervalo", active: true });
  if (recurringError) throw recurringError;

  const customerDefinitions = [
    ["Gabriel Martins", "+5511000000101"], ["Matheus Lima", "+5511000000102"],
    ["André Santos", "+5511000000103"], ["Henrique Costa", "+5511000000104"],
    ["Bruno Almeida", "+5511000000105"], ["Caio Souza", "+5511000000106"],
  ] as const;
  const customerIds: Record<string, string> = {};
  for (const [name, phone] of customerDefinitions) {
    const { data, error } = await supabase.from("customers").upsert({ business_id: businessId, name, phone }, { onConflict: "business_id,phone" }).select("id").single();
    if (error) throw error;
    customerIds[name] = data.id;
  }

  const timezone = "America/Sao_Paulo";
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const appointmentDefinitions = [
    { key: "91000000-0000-4000-8000-000000000001", professional: "Rafael", service: "Corte masculino", customer: "Gabriel Martins", date: nextWeekday(today, 1), time: "09:00", duration: 45 },
    { key: "91000000-0000-4000-8000-000000000002", professional: "Lucas", service: "Corte masculino", customer: "Matheus Lima", date: nextWeekday(today, 2), time: "10:00", duration: 40 },
    { key: "91000000-0000-4000-8000-000000000003", professional: "Lucas", service: "Barba", customer: "André Santos", date: nextWeekday(today, 2), time: "11:00", duration: 30 },
    { key: "91000000-0000-4000-8000-000000000004", professional: "Pedro", service: "Corte masculino", customer: "Henrique Costa", date: nextWeekday(today, 3), time: "09:00", duration: 50 },
    { key: "91000000-0000-4000-8000-000000000005", professional: "Rafael", service: "Corte + barba", customer: "Bruno Almeida", date: nextWeekday(today, 5), time: "14:00", duration: 75 },
    { key: "91000000-0000-4000-8000-000000000006", professional: "Pedro", service: "Platinado", customer: "Caio Souza", date: nextWeekday(today, 6), time: "13:30", duration: 180 },
  ] as const;
  for (const appointment of appointmentDefinitions) {
    const startsAt = fromZonedTime(`${appointment.date} ${appointment.time}:00`, timezone);
    const endsAt = new Date(startsAt.getTime() + appointment.duration * 60_000);
    const row = {
      business_id: businessId,
      professional_id: professionalIds[appointment.professional],
      service_id: serviceIds[appointment.service],
      customer_id: customerIds[appointment.customer],
      starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), status: "CONFIRMED",
      notes: "Agendamento demonstrativo", public_idempotency_key: appointment.key,
    };
    const { data: current, error: lookupError } = await supabase.from("appointments").select("id").eq("business_id", businessId).eq("public_idempotency_key", appointment.key).maybeSingle();
    if (lookupError) throw lookupError;
    const result = current ? await supabase.from("appointments").update(row).eq("id", current.id) : await supabase.from("appointments").insert(row);
    if (result.error) throw result.error;
  }

  console.log("=====================================");
  console.log("NEXO AGENDA — CREDENCIAIS DE TESTE");
  console.log(`MASTER ADMIN\nUsuário: ${credentials.master.username}\nSenha temporária: ${credentials.master.password}`);
  console.log(`OWNER DEMO\nUsuário: ${credentials.lucas.username}\nSenha temporária: ${credentials.lucas.password}`);
  console.log(`RAFAEL\nUsuário: ${credentials.rafael.username}\nSenha temporária: ${credentials.rafael.password}`);
  console.log(`PEDRO\nUsuário: ${credentials.pedro.username}\nSenha temporária: ${credentials.pedro.password}`);
  console.log("=====================================");
  console.log(`Página pública: ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/barbearia-nexo-demo`);
  console.log(`Empresa: ${businessId}; profissionais: 3; serviços: ${serviceDefinitions.length}; clientes: ${customerDefinitions.length}; appointments: ${appointmentDefinitions.length}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Erro desconhecido no bootstrap.";
  console.error(`Bootstrap interrompido: ${message}`);
  process.exitCode = 1;
});
