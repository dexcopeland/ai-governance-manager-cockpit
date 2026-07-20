import { getSqlite } from "./index";

const STATEMENTS = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  business_unit TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_systems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  intended_purpose TEXT NOT NULL,
  business_owner_id TEXT REFERENCES users(id),
  technical_owner_id TEXT REFERENCES users(id),
  lifecycle_state TEXT NOT NULL DEFAULT 'proposed',
  deployment_context TEXT,
  data_categories TEXT NOT NULL DEFAULT '[]',
  model_dependencies TEXT NOT NULL DEFAULT '[]',
  vendor_type TEXT NOT NULL DEFAULT 'internal',
  risk_tier TEXT,
  eu_classification TEXT,
  next_review_date TEXT,
  intake_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ai_system_lifecycle_events (
  id TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES ai_systems(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  reason TEXT NOT NULL,
  changed_by_id TEXT REFERENCES users(id),
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS risk_methodology_versions (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS risk_factors (
  id TEXT PRIMARY KEY,
  methodology_version_id TEXT NOT NULL REFERENCES risk_methodology_versions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  guidance TEXT NOT NULL,
  weight REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hard_gates (
  id TEXT PRIMARY KEY,
  methodology_version_id TEXT NOT NULL REFERENCES risk_methodology_versions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  effect TEXT NOT NULL,
  forced_tier TEXT,
  blocks_approval INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tier_obligations (
  id TEXT PRIMARY KEY,
  methodology_version_id TEXT NOT NULL REFERENCES risk_methodology_versions(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  required_artifacts TEXT NOT NULL DEFAULT '[]',
  required_approvals TEXT NOT NULL DEFAULT '[]',
  review_cadence_days INTEGER NOT NULL,
  policy_tier_match TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intake_submissions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  data_involved TEXT NOT NULL,
  affected_populations TEXT NOT NULL,
  vendor_model_details TEXT NOT NULL,
  use_case_category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitter_id TEXT NOT NULL REFERENCES users(id),
  assigned_to_id TEXT REFERENCES users(id),
  sla_due_at TEXT,
  methodology_version_id TEXT REFERENCES risk_methodology_versions(id),
  composite_score REAL,
  resulting_tier TEXT,
  gate_triggered TEXT,
  obligation_snapshot TEXT,
  evaluation_rationale TEXT,
  linked_system_id TEXT REFERENCES ai_systems(id),
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  evaluated_at TEXT,
  evaluated_by_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
  factor_id TEXT NOT NULL REFERENCES risk_factors(id),
  score INTEGER NOT NULL,
  rationale TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_gate_answers (
  id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL REFERENCES intake_submissions(id) ON DELETE CASCADE,
  gate_id TEXT NOT NULL REFERENCES hard_gates(id),
  triggered INTEGER NOT NULL,
  rationale TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id),
  current_version_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS policy_versions (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  body TEXT NOT NULL,
  plain_language_summary TEXT,
  change_rationale TEXT NOT NULL,
  applicable_risk_tiers TEXT NOT NULL DEFAULT '[]',
  applicable_categories TEXT NOT NULL DEFAULT '[]',
  applicable_roles TEXT NOT NULL DEFAULT '[]',
  effective_date TEXT NOT NULL,
  review_date TEXT,
  created_by_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS policy_framework_maps (
  id TEXT PRIMARY KEY,
  policy_version_id TEXT NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  framework TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  label TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS policy_fw_unique ON policy_framework_maps(policy_version_id, framework, reference_id);

CREATE TABLE IF NOT EXISTS attestations (
  id TEXT PRIMARY KEY,
  policy_version_id TEXT NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  due_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exceptions (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  system_id TEXT NOT NULL REFERENCES ai_systems(id),
  policy_id TEXT NOT NULL REFERENCES policies(id),
  requirement_summary TEXT NOT NULL,
  rationale TEXT NOT NULL,
  compensating_controls TEXT NOT NULL,
  risk_acceptor_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT NOT NULL,
  created_by_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS regulatory_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  feed_type TEXT NOT NULL DEFAULT 'rss',
  region TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_fetched_at TEXT
);

CREATE TABLE IF NOT EXISTS regulatory_items (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES regulatory_sources(id),
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dispositions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES regulatory_items(id) ON DELETE CASCADE,
  disposition TEXT NOT NULL,
  notes TEXT NOT NULL,
  decided_by_id TEXT REFERENCES users(id),
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  linked_policy_ids TEXT NOT NULL DEFAULT '[]',
  linked_system_ids TEXT NOT NULL DEFAULT '[]',
  spawned_action_item_id TEXT
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date TEXT NOT NULL,
  attendees TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_by_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agenda_items (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_manual INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  rationale TEXT NOT NULL,
  conditions TEXT,
  dissent TEXT,
  approver_id TEXT REFERENCES users(id),
  linked_system_ids TEXT NOT NULL DEFAULT '[]',
  linked_intake_ids TEXT NOT NULL DEFAULT '[]',
  linked_policy_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  meeting_id TEXT REFERENCES meetings(id),
  decision_id TEXT REFERENCES decisions(id),
  title TEXT NOT NULL,
  owner_id TEXT REFERENCES users(id),
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custom_metrics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  entity TEXT NOT NULL,
  aggregation TEXT NOT NULL DEFAULT 'count',
  filter_json TEXT NOT NULL DEFAULT '{}',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_by_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id),
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function migrate() {
  const sqlite = getSqlite();
  sqlite.exec(STATEMENTS);
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].includes("migrate");
if (isMain) {
  migrate();
  console.log("Migrations applied.");
}
