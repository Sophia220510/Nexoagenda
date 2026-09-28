"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  createBusinessAsAdmin,
  type CreateBusinessState,
} from "@/app/admin/actions";
import { AdminImageUpload } from "@/components/admin-image-upload";
import {
  featureDefinitions,
  getOperationProfile,
  operationProfiles,
  type FeatureFlags,
  type OperationProfile,
} from "@/lib/operation-profiles";

type UserInput = {
  name: string;
  username: string;
  password: string;
  role: "OWNER" | "PROFESSIONAL" | "RECEPTIONIST";
  is_professional: boolean;
  photo_url: string;
  active: boolean;
};
type ServiceInput = { name: string; price: string; duration_minutes: number };
const initialState: CreateBusinessState = {};
const categories = [
  ["BARBERSHOP", "Barbearia"],
  ["SALON", "Salão de beleza"],
  ["AESTHETICS", "Estética"],
  ["CLINIC", "Clínica"],
  ["OFFICE", "Consultório"],
  ["TATTOO", "Tatuagem"],
  ["MANICURE", "Manicure"],
  ["PERSONAL_TRAINER", "Personal trainer"],
  ["PET_SERVICE", "Pet / banho e tosa"],
  ["MASSAGE", "Massagem"],
  ["STUDIO", "Studio"],
  ["CONSULTING", "Consultoria"],
  ["OTHER", "Outro"],
];

export function NewBusinessWizard() {
  const [state, action, pending] = useActionState(
    createBusinessAsAdmin,
    initialState,
  );
  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState({
    name: "",
    business_type: "OTHER",
    slug: "",
    phone: "",
    timezone: "America/Sao_Paulo",
    logo_url: "",
    operation_profile: "ESSENTIAL_TEAM" as OperationProfile,
    business_mode: "TEAM" as "SOLO" | "TEAM",
    feature_flags: getOperationProfile("ESSENTIAL_TEAM").features,
  });
  const [users, setUsers] = useState<UserInput[]>([
    {
      name: "",
      username: "",
      password: "",
      role: "OWNER",
      is_professional: true,
      photo_url: "",
      active: true,
    },
  ]);
  const [services, setServices] = useState<ServiceInput[]>([
    { name: "", price: "", duration_minutes: 60 },
  ]);
  const payload = useMemo(
    () => ({
      business,
      users,
      services: services.map((service) => ({
        name: service.name,
        price_cents: Math.round(Number(service.price.replace(",", ".")) * 100),
        duration_minutes: Number(service.duration_minutes),
      })),
    }),
    [business, users, services],
  );
  const updateUser = (index: number, patch: Partial<UserInput>) =>
    setUsers(
      users.map((user, item) =>
        item === index ? { ...user, ...patch } : user,
      ),
    );
  const updateService = (index: number, patch: Partial<ServiceInput>) =>
    setServices(
      services.map((service, item) =>
        item === index ? { ...service, ...patch } : service,
      ),
    );
  if (state.credentials)
    return (
      <section className="panel-card credential-result">
        <p className="eyebrow">Estabelecimento criado</p>
        <h2>Salve estas credenciais agora</h2>
        <p>As senhas não poderão ser consultadas novamente.</p>
        {state.credentials.map((credential) => (
          <div className="credential-row" key={credential.username}>
            <strong>{credential.label}</strong>
            <code>{credential.username}</code>
            <code>{credential.password}</code>
          </div>
        ))}
        <Link className="button" href={`/admin/empresas/${state.businessId}`}>
          Abrir estabelecimento
        </Link>
      </section>
    );
  return (
    <section className="panel-card wizard-card">
      <div className="wizard-progress">
        {[1, 2, 3, 4].map((number) => (
          <span className={number <= step ? "active" : ""} key={number}>
            {number}
          </span>
        ))}
      </div>
      {state.error && <p className="notice notice-error">{state.error}</p>}
      {step === 1 && (
        <div>
          <p className="eyebrow">1. Estabelecimento</p>
          <h2>Dados públicos</h2>
          <div className="form-stack">
            <div className="field-grid">
              <label>
                Nome
                <input
                  value={business.name}
                  onChange={(e) =>
                    setBusiness({
                      ...business,
                      name: e.target.value,
                      slug:
                        business.slug ||
                        e.target.value
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                    })
                  }
                />
              </label>
              <label>
                Categoria
                <select
                  value={business.business_type}
                  onChange={(e) =>
                    setBusiness({ ...business, business_type: e.target.value })
                  }
                >
                  {categories.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Slug
                <input
                  value={business.slug}
                  onChange={(e) =>
                    setBusiness({
                      ...business,
                      slug: e.target.value.toLowerCase(),
                    })
                  }
                />
              </label>
              <label>
                WhatsApp
                <input
                  value={business.phone}
                  onChange={(e) =>
                    setBusiness({ ...business, phone: e.target.value })
                  }
                />
              </label>
              <label>
                Timezone
                <input
                  value={business.timezone}
                  onChange={(e) =>
                    setBusiness({ ...business, timezone: e.target.value })
                  }
                />
              </label>
            </div>
            <AdminImageUpload
              label="Logo da empresa"
              scope="logos"
              value={business.logo_url}
              onChange={(logo_url) => setBusiness({ ...business, logo_url })}
            />
            <div className="operation-profile-section">
              <div>
                <p className="eyebrow">Estrutura da operação</p>
                <h3>Escolha um ponto de partida</h3>
                <p className="muted">
                  Personalize os recursos abaixo e altere tudo quando precisar.
                </p>
              </div>
              <div className="operation-profile-grid">
                {operationProfiles.map((profile) => (
                  <button
                    type="button"
                    key={profile.id}
                    className={`operation-profile-card ${business.operation_profile === profile.id ? "active" : ""}`}
                    onClick={() =>
                      setBusiness({
                        ...business,
                        operation_profile: profile.id,
                        business_mode: profile.businessMode,
                        feature_flags: { ...profile.features },
                      })
                    }
                  >
                    <strong>{profile.label}</strong>
                    <span>{profile.bestFor}</span>
                    <p>{profile.description}</p>
                  </button>
                ))}
              </div>
              <div className="feature-choice-grid">
                {featureDefinitions.map((feature) => (
                  <label className="feature-choice" key={feature.key}>
                    <input
                      type="checkbox"
                      checked={business.feature_flags[feature.key]}
                      onChange={(event) =>
                        setBusiness({
                          ...business,
                          feature_flags: {
                            ...business.feature_flags,
                            [feature.key]: event.target.checked,
                          } as FeatureFlags,
                        })
                      }
                    />
                    <span>
                      <strong>{feature.label}</strong>
                      <small>{feature.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {step === 2 && (
        <div>
          <p className="eyebrow">2. Acessos</p>
          <h2>Dono, recepção e profissionais</h2>
          {users.map((user, index) => (
            <div className="repeater-card" key={index}>
              <div className="field-grid">
                <label>
                  Nome
                  <input
                    value={user.name}
                    onChange={(e) =>
                      updateUser(index, { name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Username
                  <input
                    value={user.username}
                    onChange={(e) =>
                      updateUser(index, {
                        username: e.target.value.toLowerCase(),
                      })
                    }
                  />
                </label>
                <label>
                  Senha de acesso
                  <div>
                    <input
                      value={user.password}
                      onChange={(e) =>
                        updateUser(index, { password: e.target.value })
                      }
                    />
                  </div>
                </label>
                <label>
                  Role
                  <select
                    value={user.role}
                    disabled={index === 0}
                    onChange={(e) =>
                      updateUser(index, {
                        role: e.target.value as UserInput["role"],
                      })
                    }
                  >
                    <option value="OWNER">Dono</option>
                    <option value="PROFESSIONAL">Funcionário / profissional</option>
                    <option value="RECEPTIONIST">Recepcionista</option>
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={user.is_professional}
                    onChange={(e) =>
                      updateUser(index, { is_professional: e.target.checked })
                    }
                  />{" "}
                  Também atende clientes
                </label>
              </div>
              <AdminImageUpload
                label={`Foto de ${user.name || "usuário"}`}
                scope="profiles"
                value={user.photo_url}
                onChange={(photo_url) => updateUser(index, { photo_url })}
              />
              {index > 0 && (
                <button
                  type="button"
                  className="text-link danger"
                  onClick={() =>
                    setUsers(users.filter((_, item) => item !== index))
                  }
                >
                  Remover
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="button-ghost"
            onClick={() =>
              setUsers([
                ...users,
                {
                  name: "",
                  username: "",
                  password: "",
                  role: "PROFESSIONAL",
                  is_professional: true,
                  photo_url: "",
                  active: true,
                },
              ])
            }
          >
            + Adicionar pessoa
          </button>
        </div>
      )}
      {step === 3 && (
        <div>
          <p className="eyebrow">3. Serviços</p>
          <h2>Catálogo inicial</h2>
          {services.map((service, index) => (
            <div className="repeater-card field-grid" key={index}>
              <label>
                Nome
                <input
                  value={service.name}
                  onChange={(e) =>
                    updateService(index, { name: e.target.value })
                  }
                />
              </label>
              <label>
                Preço (R$)
                <input
                  inputMode="decimal"
                  value={service.price}
                  onChange={(e) =>
                    updateService(index, { price: e.target.value })
                  }
                />
              </label>
              <label>
                Duração padrão
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={service.duration_minutes}
                  onChange={(e) =>
                    updateService(index, {
                      duration_minutes: Number(e.target.value),
                    })
                  }
                />
              </label>
              {services.length > 1 && (
                <button
                  type="button"
                  className="text-link danger"
                  onClick={() =>
                    setServices(services.filter((_, item) => item !== index))
                  }
                >
                  Remover
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="button-ghost"
            onClick={() =>
              setServices([
                ...services,
                { name: "", price: "", duration_minutes: 60 },
              ])
            }
          >
            + Adicionar serviço
          </button>
        </div>
      )}
      {step === 4 && (
        <div>
          <p className="eyebrow">4. Resumo</p>
          <h2>Revise antes de criar</h2>
          <div className="summary-box">
            <strong>{business.name}</strong>
            <span>
              /{business.slug} ·{" "}
              {
                categories.find(
                  ([value]) => value === business.business_type,
                )?.[1]
              }
            </span>
            <span>
              {users.length} usuários · {services.length} serviços
            </span>
            <span>
              {getOperationProfile(business.operation_profile).label} ·{" "}
              {featureDefinitions.filter(({ key }) => business.feature_flags[key]).length}{" "}
              recursos ativos
            </span>
            {users.map((user) => (
              <code key={user.username}>
                {user.name}: {user.username}
              </code>
            ))}
          </div>
          <form action={action}>
            <input
              type="hidden"
              name="payload"
              value={JSON.stringify(payload)}
            />
            <button className="button" disabled={pending}>
              {pending ? "Criando com segurança..." : "Criar estabelecimento"}
            </button>
          </form>
        </div>
      )}
      <div className="wizard-actions">
        {step > 1 && (
          <button
            type="button"
            className="button-ghost"
            onClick={() => setStep(step - 1)}
          >
            Voltar
          </button>
        )}
        {step < 4 && (
          <button
            type="button"
            className="button"
            onClick={() => setStep(step + 1)}
          >
            Continuar
          </button>
        )}
      </div>
    </section>
  );
}
