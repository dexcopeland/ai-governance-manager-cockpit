import { getSqlite } from "./index";
import { migrate } from "./migrate";
import { seed } from "./seed";

let ready = false;

export function ensureDb() {
  if (ready) return;
  migrate();
  const count = getSqlite().prepare("SELECT COUNT(*) as c FROM users").get() as {
    c: number;
  };
  if (count.c === 0) {
    seed(false);
  }
  ready = true;
}
