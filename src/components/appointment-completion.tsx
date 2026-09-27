"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Plus,
  UserX,
} from "lucide-react";
import {
  completeAppointment,
  resolveUnattendedAppointment,
  type CompletionState,
} from "@/app/actions/appointments";
import { formatCurrency } from "@/lib/format";

type Service = {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
};

type Payment = { method: string; amount: string };

const paymentMethods = [
  ["PIX", "PIX"],
  ["CASH", "Dinheiro"],
  ["DEBIT_CARD", "Cartão de débito"],
  ["CREDIT_CARD", "Cartão de crédito"],
  ["OTHER", "Outro"],
] as const;

function cents(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 100)) : 0;
}

function decimal(value: number) {
  return (value / 100).toFixed(2).replace(".", ",");
}

export function AppointmentCompletion({
  appointmentId,
  customerName,
  originalServiceId,
  services,
  canDiscount,
  canComplete,
}: {
  appointmentId: string;
  customerName: string;
  originalServiceId: string;
  services: Service[];
  canDiscount: boolean;
  canComplete: boolean;
}) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([originalServiceId]);
  const [discount, setDiscount] = useState("0,00");
  const [discountReason, setDiscountReason] = useState("");
  const initialTotal =
    services.find((item) => item.id === originalServiceId)?.price_cents ?? 0;
  const [payments, setPayments] = useState<Payment[]>([
    { method: "PIX", amount: decimal(initialTotal) },
  ]);
  const [state, action, pending] = useActionState(
    completeAppointment,
    {} as CompletionState,
  );

  const gross = useMemo(
    () =>
      services
        .filter((service) => selected.includes(service.id))
        .reduce((sum, service) => sum + service.price_cents, 0),
    [selected, services],
  );
  const discountCents = canDiscount ? Math.min(cents(discount), gross) : 0;
  const total = gross - discountCents;
  const received = payments.reduce(
    (sum, payment) => sum + cents(payment.amount),
    0,
  );

  function toggleService(id: string) {
    const next = selected.includes(id)
      ? selected.filter((serviceId) => serviceId !== id)
      : [...selected, id];
    if (!next.length) return;
    const nextGross = services
      .filter((service) => next.includes(service.id))
      .reduce((sum, service) => sum + service.price_cents, 0);
    setSelected(next);
    if (payments.length === 1)
      setPayments([{ ...payments[0], amount: decimal(nextGross) }]);
  }

  if (!canComplete) {
    return (
      <div className="completion-locked">
        <strong>Atendimento ainda em andamento</strong>
        <p>
          A confirmação ficará disponível assim que o horário previsto terminar.
        </p>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="completion-flow">
        <div className="completion-progress">
          <span className="active">1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>
        <p className="eyebrow">Confirmação operacional</p>
        <h2>Esse atendimento aconteceu?</h2>
        <button
          className="completion-choice is-primary"
          type="button"
          onClick={() => setStep(2)}
        >
          <Check />{" "}
          <span>
            <strong>Sim, cliente foi atendido</strong>
            <small>Informar serviços e pagamento</small>
          </span>
          <ChevronRight />
        </button>
        <form action={resolveUnattendedAppointment}>
          <input type="hidden" name="appointment_id" value={appointmentId} />
          <input type="hidden" name="outcome" value="NO_SHOW" />
          <button className="completion-choice" type="submit">
            <UserX />{" "}
            <span>
              <strong>Cliente não compareceu</strong>
              <small>Não gera receita nem comissão</small>
            </span>
          </button>
        </form>
        <details className="completion-cancel">
          <summary>
            <CircleX /> Atendimento foi cancelado
          </summary>
          <form action={resolveUnattendedAppointment}>
            <input type="hidden" name="appointment_id" value={appointmentId} />
            <input type="hidden" name="outcome" value="CANCELLED" />
            <textarea
              name="reason"
              maxLength={500}
              placeholder="Motivo do cancelamento"
            />
            <button className="button-danger">Confirmar cancelamento</button>
          </form>
        </details>
      </div>
    );
  }

  return (
    <form action={action} className="completion-flow">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <input
        type="hidden"
        name="service_ids"
        value={JSON.stringify(selected)}
      />
      <input
        type="hidden"
        name="payments"
        value={JSON.stringify(
          payments
            .filter((payment) => cents(payment.amount) > 0)
            .map((payment) => ({
              method: payment.method,
              amount_cents: cents(payment.amount),
            })),
        )}
      />
      <input type="hidden" name="discount_cents" value={discountCents} />
      <input type="hidden" name="discount_reason" value={discountReason} />
      <div className="completion-progress">
        {[1, 2, 3, 4].map((number) => (
          <span className={number <= step ? "active" : ""} key={number}>
            {number}
          </span>
        ))}
      </div>

      {step === 2 && (
        <div className="completion-step">
          <p className="eyebrow">Serviços realizados</p>
          <h2>O que foi feito?</h2>
          <p className="muted">
            O serviço agendado já está selecionado. Ajuste para refletir o
            atendimento real.
          </p>
          <div className="completion-services">
            {services.map((service) => (
              <button
                type="button"
                className={selected.includes(service.id) ? "selected" : ""}
                onClick={() => toggleService(service.id)}
                key={service.id}
              >
                <span>
                  {selected.includes(service.id) ? <Check /> : <Plus />}
                </span>
                <div>
                  <strong>{service.name}</strong>
                  <small>{service.duration_minutes} min</small>
                </div>
                <b>{formatCurrency(service.price_cents)}</b>
              </button>
            ))}
          </div>
          <div className="completion-total">
            <span>Total dos serviços</span>
            <strong>{formatCurrency(gross)}</strong>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="completion-step">
          <p className="eyebrow">Pagamento</p>
          <h2>Como o cliente pagou?</h2>
          <div className="payment-list">
            {payments.map((payment, index) => (
              <div className="payment-row" key={index}>
                <select
                  value={payment.method}
                  onChange={(event) =>
                    setPayments(
                      payments.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, method: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  {paymentMethods.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <label>
                  <span>R$</span>
                  <input
                    inputMode="decimal"
                    value={payment.amount}
                    onChange={(event) =>
                      setPayments(
                        payments.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, amount: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                {payments.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remover pagamento"
                    onClick={() =>
                      setPayments(
                        payments.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="button-ghost payment-add"
            onClick={() =>
              setPayments([...payments, { method: "PIX", amount: "0,00" }])
            }
          >
            <Plus /> Dividir pagamento
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => setPayments([])}
          >
            Ainda não pagou
          </button>
          {canDiscount && (
            <div className="discount-box">
              <label>
                Desconto (R$)
                <input
                  inputMode="decimal"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
              </label>
              {discountCents > 0 && (
                <label>
                  Motivo obrigatório
                  <input
                    value={discountReason}
                    onChange={(event) => setDiscountReason(event.target.value)}
                    minLength={3}
                    maxLength={500}
                  />
                </label>
              )}
            </div>
          )}
          <div className="completion-totals">
            <span>
              Total realizado <b>{formatCurrency(total)}</b>
            </span>
            <span>
              Recebido <b>{formatCurrency(received)}</b>
            </span>
            <span>
              Pendente <b>{formatCurrency(Math.max(0, total - received))}</b>
            </span>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="completion-step completion-review">
          <p className="eyebrow">Confirmação final</p>
          <h2>Atendimento de {customerName}</h2>
          <div>
            {services
              .filter((service) => selected.includes(service.id))
              .map((service) => (
                <p key={service.id}>
                  <span>{service.name}</span>
                  <b>{formatCurrency(service.price_cents)}</b>
                </p>
              ))}
          </div>
          {discountCents > 0 && (
            <p>
              <span>Desconto</span>
              <b>- {formatCurrency(discountCents)}</b>
            </p>
          )}
          <hr />
          <p className="review-total">
            <span>Total realizado</span>
            <b>{formatCurrency(total)}</b>
          </p>
          <p>
            <span>Recebido</span>
            <b>{formatCurrency(received)}</b>
          </p>
          <p>
            <span>Status</span>
            <b>
              {received === 0
                ? "Não pago"
                : received < total
                  ? "Parcial"
                  : "Pago"}
            </b>
          </p>
          <small>
            A comissão será calculada pelas regras do profissional e congelada
            neste atendimento.
          </small>
          {state.error && <p className="notice notice-error">{state.error}</p>}
        </div>
      )}

      <footer className="completion-actions">
        <button
          type="button"
          className="button-ghost"
          onClick={() => setStep(step - 1)}
        >
          <ChevronLeft /> Voltar
        </button>
        {step < 4 ? (
          <button
            type="button"
            className="button"
            disabled={
              (step === 2 && !selected.length) ||
              (step === 3 &&
                (received > total ||
                  (discountCents > 0 && discountReason.trim().length < 3)))
            }
            onClick={() => setStep(step + 1)}
          >
            Continuar <ChevronRight />
          </button>
        ) : (
          <button className="button" disabled={pending}>
            {pending ? "Confirmando com segurança..." : "Confirmar atendimento"}
          </button>
        )}
      </footer>
    </form>
  );
}
