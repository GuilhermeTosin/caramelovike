import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  getPageHref?: (page: number) => string;
  onPageChange?: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
};

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 6, 7, "ellipsis-end", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis-start", totalPages - 6, totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages];
}

export default function Pagination({
  currentPage,
  totalPages,
  getPageHref,
  onPageChange,
  previousLabel = "Anterior",
  nextLabel = "Próxima",
  className = "",
}: PaginationProps) {
  const page = Math.max(1, Math.min(currentPage, totalPages));
  const items = getPaginationItems(page, totalPages);
  const goToPage = (nextPage: number) => onPageChange?.(Math.max(1, Math.min(nextPage, totalPages)));

  const renderPageButton = (pageNumber: number) => {
    const buttonProps = {
      type: "button" as const,
      variant: pageNumber === page ? "default" as const : "outline" as const,
      size: "sm" as const,
      className: "min-w-9 hidden sm:inline-flex",
    };

    if (getPageHref) {
      return (
        <Button asChild key={pageNumber} {...buttonProps}>
          <Link to={getPageHref(pageNumber)} aria-current={pageNumber === page ? "page" : undefined}>
            {pageNumber}
          </Link>
        </Button>
      );
    }

    return (
      <Button
        key={pageNumber}
        {...buttonProps}
        aria-current={pageNumber === page ? "page" : undefined}
        onClick={() => goToPage(pageNumber)}
      >
        {pageNumber}
      </Button>
    );
  };

  const renderNavigationButton = (direction: "previous" | "next") => {
    const nextPage = direction === "previous" ? page - 1 : page + 1;
    const disabled = direction === "previous" ? page <= 1 : page >= totalPages;
    const label = direction === "previous" ? previousLabel : nextLabel;
    const content = (
      <>
        {direction === "previous" ? <ChevronLeft className="w-4 h-4 mr-1" /> : null}
        <span className="hidden sm:inline">{label}</span>
        {direction === "next" ? <ChevronRight className="w-4 h-4 ml-1" /> : null}
      </>
    );

    if (disabled) {
      return <Button type="button" variant="outline" size="sm" disabled>{content}</Button>;
    }

    if (getPageHref) {
      return (
        <Button asChild type="button" variant="outline" size="sm">
          <Link to={getPageHref(nextPage)}>{content}</Link>
        </Button>
      );
    }

    return <Button type="button" variant="outline" size="sm" onClick={() => goToPage(nextPage)}>{content}</Button>;
  };

  return (
    <nav className={`flex flex-nowrap items-center justify-center gap-2 sm:flex-wrap ${className}`} aria-label="Paginação">
      {renderNavigationButton("previous")}
      <span className="sm:hidden text-xs font-medium text-muted-foreground whitespace-nowrap">
        Página {page} de {totalPages}
      </span>
      {items.map((item) =>
        typeof item === "number" ? renderPageButton(item) : (
          <span key={item} className="hidden sm:inline-flex items-center px-1 text-muted-foreground" aria-hidden="true">...</span>
        )
      )}
      {renderNavigationButton("next")}
    </nav>
  );
}
