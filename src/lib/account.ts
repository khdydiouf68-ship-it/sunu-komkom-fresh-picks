import { queryOptions } from "@tanstack/react-query";
import { myProfile } from "./account.functions";

export const profileOptions = queryOptions({ queryKey: ["my-profile"], queryFn: () => myProfile() });
