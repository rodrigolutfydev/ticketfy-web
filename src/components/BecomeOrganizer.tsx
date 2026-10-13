import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, ScanLine, Layers } from "lucide-react";
import { becomeOrganizer } from "../api/endpoints";
import { ApiError, errorMessage } from "../api/client";
import { useI18n } from "../i18n/LocaleContext";
import { Alert, Button } from "./ui";

export default function BecomeOrganizer() {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const mutation = useMutation({
    mutationFn: becomeOrganizer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
    onError: (error) => {
      if (error instanceof ApiError && error.problemType === "invalid-role-change") {
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    },
  });

  const icons = [<CalendarPlus size={18} />, <Layers size={18} />, <ScanLine size={18} />];
  const perks = t.becomeOrganizer.perks.map((text, index) => ({ icon: icons[index], text }));

  return (
    <div className="space-y-5">
      <ul className="space-y-2.5">
        {perks.map((perk) => (
          <li key={perk.text} className="flex items-center gap-3 text-sm text-muted">
            <span className="text-accent-text">{perk.icon}</span>
            {perk.text}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">{t.becomeOrganizer.noApproval}</p>
      <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
        {t.becomeOrganizer.submit}
      </Button>
      {mutation.error && <Alert>{errorMessage(mutation.error)}</Alert>}
    </div>
  );
}
