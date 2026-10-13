import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEvent, getEvent, updateEvent } from "../../api/endpoints";
import type { EventInput } from "../../api/types";
import EventForm from "../../components/EventForm";
import { ErrorMessage, Loading } from "../../components/StateMessage";
import { BackLink, Card, PageTitle } from "../../components/ui";
import { isValidId } from "../../utils/security";
import NotFoundPage from "../NotFoundPage";
import OwnershipGuard from "./OwnershipGuard";
import { errorMessage } from "../../api/client";
import { useI18n } from "../../i18n/LocaleContext";
import { usePageTitle } from "../../hooks/usePageTitle";

// Mesma tela para criar (/organizer/events/new) e editar (/organizer/events/:id/edit).
export default function OrganizerEventFormPage() {
  const { id } = useParams();
  if (id === undefined) return <CreateEvent />;
  return isValidId(id) ? <EditEvent id={id} /> : <NotFoundPage />;
}

function CreateEvent() {
  const { t } = useI18n();
  const f = t.organizer.eventForm;
  usePageTitle(f.createTitle);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: EventInput) => createEvent(data),
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      // Vai direto para a aba de lotes: o próximo passo natural.
      navigate(`/organizer/events/${event.id}?tab=lotes`, { replace: true });
    },
  });

  return (
    <div className="max-w-4xl">
      <PageTitle title={f.createTitle} subtitle={f.createSubtitle} />
      <Card>
        <EventForm submitLabel={f.createSubmit} loading={mutation.isPending} error={mutation.error} onSubmit={mutation.mutate} />
      </Card>
    </div>
  );
}

function EditEvent({ id }: { id: string }) {
  const { t } = useI18n();
  const f = t.organizer.eventForm;
  usePageTitle(f.editTitle);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["event", id], queryFn: () => getEvent(id) });
  const mutation = useMutation({
    mutationFn: (input: EventInput) => updateEvent(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      navigate(`/organizer/events/${id}`, { replace: true });
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={errorMessage(error) ?? ""} />;

  return (
    <div className="max-w-4xl">
      <BackLink to={`/organizer/events/${id}`}>{f.backToEvent}</BackLink>
      <div className="mt-5">
        <PageTitle title={f.editTitle} />
        <OwnershipGuard event={data!}>
          <Card>
            <EventForm initial={data} submitLabel={f.editSubmit} loading={mutation.isPending} error={mutation.error} onSubmit={mutation.mutate} />
          </Card>
        </OwnershipGuard>
      </div>
    </div>
  );
}
