import { useMsg } from "@/providers/MessagesProvider";

export function useTypedMsg<T>(domain: string): T | undefined {
  return useMsg(domain) as unknown as T | undefined;
}
