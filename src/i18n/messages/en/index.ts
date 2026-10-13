import type { Messages } from "../index";
import { admin } from "./admin";
import { base } from "./base";
import { buyer } from "./buyer";
import { labels } from "./labels";
import { legal } from "./legal";
import { organizer } from "./organizer";

export const en: Messages = { ...base, buyer, organizer, admin, labels, legal };
