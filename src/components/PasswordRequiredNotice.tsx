import { Link } from "react-router";
import { useI18n } from "../i18n/LocaleContext";
import { SET_PASSWORD_PATH } from "../utils/account";
import { Alert } from "./ui";

// Conta criada pelo Google, sem senha: as ações que pedem a senha mostram
// este aviso com o caminho para definir uma.
export default function PasswordRequiredNotice() {
  const { t } = useI18n();
  return (
    <Alert type="warning">
      {t.passwordRequired.text}{" "}
      <Link to={SET_PASSWORD_PATH} className="font-semibold text-ink underline underline-offset-2 hover:text-accent-text">
        {t.passwordRequired.link}
      </Link>
    </Alert>
  );
}
