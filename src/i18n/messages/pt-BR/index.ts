import { admin } from "./admin";
import { base } from "./base";
import { buyer } from "./buyer";
import { labels } from "./labels";
import { legal } from "./legal";
import { organizer } from "./organizer";

export const ptBR = { ...base, buyer, organizer, admin, labels, legal };
