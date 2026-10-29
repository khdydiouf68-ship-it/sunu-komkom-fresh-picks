import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { readCatalog } from "./catalog.functions";
import { mergeCatalog } from "./catalog-shared";

export const catalogOptions = queryOptions({ queryKey: ["catalog"], queryFn: () => readCatalog(), staleTime: 30000 });
export function useCatalog() {
  const { data } = useSuspenseQuery(catalogOptions);
  return mergeCatalog(data.map(({ displayImage, ...p }) => ({ ...p, image: displayImage })));
}