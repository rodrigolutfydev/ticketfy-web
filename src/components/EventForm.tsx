import { useState, type FormEvent, type ReactNode } from "react";
import { fieldError, hasUnmappedError } from "../api/client";
import type { EventCategory, EventDetails, EventInput } from "../api/types";
import { EVENT_CATEGORIES, categoryLabel, isEventCategory } from "../i18n/categories";
import { fromInputDateTime, toInputDateTime, UFS } from "../utils/format";
import { safeImageUrl } from "../utils/security";
import EventCover from "./EventCover";
import { Alert, Button, Field, Input, Select, Textarea } from "./ui";

interface Props {
  initial?: EventDetails;
  submitLabel: string;
  loading: boolean;
  error?: Error | null;
  onSubmit: (data: EventInput) => void;
}

const DESCRIPTION_MAX = 2000;
const API_FIELDS = ["imageUrl", "startsAt", "endsAt", "category"] as const;

// Formulário compartilhado por "criar evento" e "editar evento".
//
// Validação em duas camadas:
// 1. Atributos HTML (required, maxLength, type="url"): o navegador bloqueia
//    o envio e mostra a mensagem dele, sem nenhum código nosso.
// 2. A função validate() abaixo, para regras que o HTML não expressa
//    (fim depois do início, foto só em https).
// A API valida tudo de novo com Bean Validation: isto é só para o usuário
// descobrir o erro antes de esperar a resposta.
export default function EventForm({ initial, submitLabel, loading, error, onSubmit }: Props) {
  // Um único objeto de estado para o formulário inteiro.
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    imageUrl: initial?.imageUrl ?? "",
    venueName: initial?.venueName ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    startsAt: toInputDateTime(initial?.startsAt),
    endsAt: toInputDateTime(initial?.endsAt),
    category: initial?.category ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  // set("name") devolve a função que atualiza só o campo "name".
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [field]: e.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  function validate() {
    const found: typeof errors = {};
    if (form.imageUrl.trim() && !safeImageUrl(form.imageUrl)) {
      found.imageUrl = "Use um endereço que comece com https://";
    }
    if (!isEventCategory(form.category)) {
      found.category = "Escolha uma categoria.";
    }
    if (form.endsAt && form.startsAt && form.endsAt <= form.startsAt) {
      found.endsAt = "O fim precisa ser depois do início.";
    }
    if (!initial && form.startsAt && new Date(form.startsAt).getTime() < Date.now()) {
      found.startsAt = "Escolha uma data futura.";
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault(); // impede o navegador de recarregar a página (comportamento padrão do <form>)
    if (!validate()) return;
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      venueName: form.venueName.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.toUpperCase(),
      startsAt: fromInputDateTime(form.startsAt),
      endsAt: form.endsAt ? fromInputDateTime(form.endsAt) : null,
      // Campo vazio manda "" (e não null): no PUT, null mantém a foto antiga e "" remove.
      imageUrl: form.imageUrl.trim() ? safeImageUrl(form.imageUrl) : "",
      category: form.category as EventCategory,
    });
  }

  const previewUrl = safeImageUrl(form.imageUrl);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section title="Informações" description="O que as pessoas veem primeiro na página do evento.">
        <Field label="Nome do evento">
          <Input required maxLength={150} value={form.name} onChange={set("name")} placeholder="Ex.: Noite de Jazz na Praia" />
        </Field>
        <Field label="Categoria" hint="Ajuda o público a encontrar o evento na vitrine." error={errors.category ?? fieldError(error, "category")}>
          <Select required value={form.category} onChange={set("category")}>
            <option value="" disabled>
              Escolha uma categoria
            </option>
            {EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição" hint={`${form.description.length}/${DESCRIPTION_MAX} caracteres`}>
          <Textarea rows={5} maxLength={DESCRIPTION_MAX} value={form.description} onChange={set("description")} placeholder="Atrações, classificação, o que levar..." />
        </Field>
      </Section>

      <Section title="Foto de capa" description="Aparece no cartão do evento e no topo da página.">
        <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
          <Field
            label="Endereço da imagem"
            error={errors.imageUrl ?? fieldError(error, "imageUrl")}
            hint="Opcional. Link https de uma imagem já hospedada (formato paisagem, 16:9, fica melhor)."
          >
            <Input type="url" inputMode="url" maxLength={500} value={form.imageUrl} onChange={set("imageUrl")} placeholder="https://..." />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">Prévia</span>
            <div className="aspect-[16/9] overflow-hidden rounded-xl border border-line">
              <EventCover name={form.name || "Novo evento"} startsAt={form.startsAt ? fromInputDateTime(form.startsAt) : new Date().toISOString()} imageUrl={previewUrl} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Local" description="Onde o evento acontece.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do local">
            <Input required maxLength={150} value={form.venueName} onChange={set("venueName")} placeholder="Arena, teatro, bar..." />
          </Field>
          <Field label="Endereço">
            <Input required maxLength={255} value={form.address} onChange={set("address")} placeholder="Rua, número, bairro" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Cidade">
            <Input required maxLength={100} value={form.city} onChange={set("city")} />
          </Field>
          {/* Lista fechada de UFs: impossível digitar uma sigla que não existe. */}
          <Field label="UF">
            <Select required value={form.state} onChange={set("state")}>
              <option value="" disabled>
                Escolha
              </option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Data e horário" description="No fuso horário do seu navegador.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Início" error={errors.startsAt ?? fieldError(error, "startsAt")}>
            <Input required type="datetime-local" value={form.startsAt} onChange={set("startsAt")} />
          </Field>
          <Field label="Fim" hint="Opcional" error={errors.endsAt ?? fieldError(error, "endsAt")}>
            <Input type="datetime-local" min={form.startsAt || undefined} value={form.endsAt} onChange={set("endsAt")} />
          </Field>
        </div>
      </Section>

      {error && hasUnmappedError(error, API_FIELDS) && <Alert>{error.message}</Alert>}
      <div className="flex justify-end border-t border-line pt-6">
        <Button type="submit" size="lg" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

// Bloco com título à esquerda e campos à direita (vira coluna única no celular).
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5 md:grid-cols-[200px_1fr]">
      <legend className="sr-only">{title}</legend>
      <div>
        <p className="font-bold text-ink">{title}</p>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}
