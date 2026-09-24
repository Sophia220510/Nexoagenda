import { ResetPasswordForm } from "@/components/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase=await createClient(); const [identities,profiles,members]=await Promise.all([supabase.from("login_identities").select("user_id,username,active,must_change_password,created_at").order("created_at",{ascending:false}),supabase.from("profiles").select("id,full_name"),supabase.from("business_members").select("user_id,role,businesses(name)")]);
  return <><header className="page-header"><div><p className="eyebrow">Plataforma</p><h1>Usuários</h1><p className="muted">Usernames e acessos. Senhas existentes nunca são exibidas.</p></div></header><section className="panel-card"><div className="list">{(identities.data??[]).map((identity)=>{const profile=profiles.data?.find((item)=>item.id===identity.user_id);const member=members.data?.find((item)=>item.user_id===identity.user_id);return <article className="user-admin-row" key={identity.user_id}><div><strong>{profile?.full_name??identity.username}</strong><p>@{identity.username} · {member?.role??"PLATFORM_ADMIN"} · {identity.active?"ativo":"inativo"}{identity.must_change_password?" · troca de senha pendente":""}</p></div><ResetPasswordForm userId={identity.user_id} /></article>})}</div></section></>;
}
