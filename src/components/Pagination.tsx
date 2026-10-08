import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui";

interface Props {
  page: number; // começa em 0, igual ao Spring Data
  totalPages: number;
  onChange: (page: number) => void;
}

// Navegação entre páginas de uma listagem paginada da API.
export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-3">
      <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={16} aria-hidden /> Anterior
      </Button>
      <span className="text-sm text-muted" aria-current="page">
        Página {page + 1} de {totalPages}
      </span>
      <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>
        Próxima <ChevronRight size={16} aria-hidden />
      </Button>
    </nav>
  );
}
