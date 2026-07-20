import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const roles = [
  "admin",
  "governance_manager",
  "committee_member",
  "submitter",
  "executive",
  "auditor",
] as const;
export type Role = (typeof roles)[number];

export const lifecycleStates = [
  "proposed",
  "in_review",
  "approved",
  "deployed",
  "under_monitoring",
  "decommissioned",
] as const;
export type LifecycleState = (typeof lifecycleStates)[number];

export const riskTiers = ["low", "medium", "high", "critical"] as const;
export type RiskTier = (typeof riskTiers)[number];

export const euClassifications = [
  "prohibited",
  "high_risk",
  "limited_risk",
  "minimal_risk",
] as const;
export type EuClassification = (typeof euClassifications)[number];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull().$type<Role>(),
  businessUnit: text("business_unit"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const aiSystems = sqliteTable("ai_systems", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  intendedPurpose: text("intended_purpose").notNull(),
  businessOwnerId: text("business_owner_id").references(() => users.id),
  technicalOwnerId: text("technical_owner_id").references(() => users.id),
  lifecycleState: text("lifecycle_state")
    .notNull()
    .$type<LifecycleState>()
    .default("proposed"),
  deploymentContext: text("deployment_context"),
  dataCategories: text("data_categories").notNull().default("[]"),
  modelDependencies: text("model_dependencies").notNull().default("[]"),
  vendorType: text("vendor_type").notNull().default("internal"),
  riskTier: text("risk_tier").$type<RiskTier>(),
  euClassification: text("eu_classification").$type<EuClassification>(),
  nextReviewDate: text("next_review_date"),
  intakeId: text("intake_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  createdById: text("created_by_id").references(() => users.id),
});

export const aiSystemLifecycleEvents = sqliteTable("ai_system_lifecycle_events", {
  id: text("id").primaryKey(),
  systemId: text("system_id")
    .notNull()
    .references(() => aiSystems.id, { onDelete: "cascade" }),
  fromState: text("from_state").$type<LifecycleState>(),
  toState: text("to_state").notNull().$type<LifecycleState>(),
  reason: text("reason").notNull(),
  changedById: text("changed_by_id").references(() => users.id),
  changedAt: text("changed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const riskMethodologyVersions = sqliteTable("risk_methodology_versions", {
  id: text("id").primaryKey(),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  effectiveFrom: text("effective_from").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const riskFactors = sqliteTable("risk_factors", {
  id: text("id").primaryKey(),
  methodologyVersionId: text("methodology_version_id")
    .notNull()
    .references(() => riskMethodologyVersions.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  label: text("label").notNull(),
  guidance: text("guidance").notNull(),
  weight: real("weight").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const hardGates = sqliteTable("hard_gates", {
  id: text("id").primaryKey(),
  methodologyVersionId: text("methodology_version_id")
    .notNull()
    .references(() => riskMethodologyVersions.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  effect: text("effect").notNull(),
  forcedTier: text("forced_tier").$type<RiskTier>(),
  blocksApproval: integer("blocks_approval", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const tierObligations = sqliteTable("tier_obligations", {
  id: text("id").primaryKey(),
  methodologyVersionId: text("methodology_version_id")
    .notNull()
    .references(() => riskMethodologyVersions.id, { onDelete: "cascade" }),
  tier: text("tier").notNull().$type<RiskTier>(),
  requiredArtifacts: text("required_artifacts").notNull().default("[]"),
  requiredApprovals: text("required_approvals").notNull().default("[]"),
  reviewCadenceDays: integer("review_cadence_days").notNull(),
  policyTierMatch: text("policy_tier_match").notNull(),
});

export const intakeStatuses = [
  "draft",
  "submitted",
  "in_review",
  "evaluated",
  "approved",
  "rejected",
] as const;
export type IntakeStatus = (typeof intakeStatuses)[number];

export const intakeSubmissions = sqliteTable("intake_submissions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  purpose: text("purpose").notNull(),
  dataInvolved: text("data_involved").notNull(),
  affectedPopulations: text("affected_populations").notNull(),
  vendorModelDetails: text("vendor_model_details").notNull(),
  useCaseCategory: text("use_case_category").notNull(),
  status: text("status").notNull().$type<IntakeStatus>().default("submitted"),
  submitterId: text("submitter_id")
    .notNull()
    .references(() => users.id),
  assignedToId: text("assigned_to_id").references(() => users.id),
  slaDueAt: text("sla_due_at"),
  methodologyVersionId: text("methodology_version_id").references(
    () => riskMethodologyVersions.id,
  ),
  compositeScore: real("composite_score"),
  resultingTier: text("resulting_tier").$type<RiskTier>(),
  gateTriggered: text("gate_triggered"),
  obligationSnapshot: text("obligation_snapshot"),
  evaluationRationale: text("evaluation_rationale"),
  linkedSystemId: text("linked_system_id").references(() => aiSystems.id),
  submittedAt: text("submitted_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  evaluatedAt: text("evaluated_at"),
  evaluatedById: text("evaluated_by_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const evaluationScores = sqliteTable("evaluation_scores", {
  id: text("id").primaryKey(),
  intakeId: text("intake_id")
    .notNull()
    .references(() => intakeSubmissions.id, { onDelete: "cascade" }),
  factorId: text("factor_id")
    .notNull()
    .references(() => riskFactors.id),
  score: integer("score").notNull(),
  rationale: text("rationale").notNull(),
});

export const evaluationGateAnswers = sqliteTable("evaluation_gate_answers", {
  id: text("id").primaryKey(),
  intakeId: text("intake_id")
    .notNull()
    .references(() => intakeSubmissions.id, { onDelete: "cascade" }),
  gateId: text("gate_id")
    .notNull()
    .references(() => hardGates.id),
  triggered: integer("triggered", { mode: "boolean" }).notNull(),
  rationale: text("rationale").notNull(),
});

export const policies = sqliteTable("policies", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  ownerId: text("owner_id").references(() => users.id),
  currentVersionId: text("current_version_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const policyVersions = sqliteTable("policy_versions", {
  id: text("id").primaryKey(),
  policyId: text("policy_id")
    .notNull()
    .references(() => policies.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  body: text("body").notNull(),
  plainLanguageSummary: text("plain_language_summary"),
  changeRationale: text("change_rationale").notNull(),
  applicableRiskTiers: text("applicable_risk_tiers").notNull().default("[]"),
  applicableCategories: text("applicable_categories").notNull().default("[]"),
  applicableRoles: text("applicable_roles").notNull().default("[]"),
  effectiveDate: text("effective_date").notNull(),
  reviewDate: text("review_date"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const policyFrameworkMaps = sqliteTable(
  "policy_framework_maps",
  {
    id: text("id").primaryKey(),
    policyVersionId: text("policy_version_id")
      .notNull()
      .references(() => policyVersions.id, { onDelete: "cascade" }),
    framework: text("framework").notNull(),
    referenceId: text("reference_id").notNull(),
    label: text("label").notNull(),
  },
  (t) => [
    uniqueIndex("policy_fw_unique").on(
      t.policyVersionId,
      t.framework,
      t.referenceId,
    ),
  ],
);

export const attestations = sqliteTable("attestations", {
  id: text("id").primaryKey(),
  policyVersionId: text("policy_version_id")
    .notNull()
    .references(() => policyVersions.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("pending"),
  dueAt: text("due_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const exceptions = sqliteTable("exceptions", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  version: integer("version").notNull().default(1),
  systemId: text("system_id")
    .notNull()
    .references(() => aiSystems.id),
  policyId: text("policy_id")
    .notNull()
    .references(() => policies.id),
  requirementSummary: text("requirement_summary").notNull(),
  rationale: text("rationale").notNull(),
  compensatingControls: text("compensating_controls").notNull(),
  riskAcceptorId: text("risk_acceptor_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("active"),
  expiresAt: text("expires_at").notNull(),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const regulatorySources = sqliteTable("regulatory_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  feedType: text("feed_type").notNull().default("rss"),
  region: text("region").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastFetchedAt: text("last_fetched_at"),
});

export const regulatoryItems = sqliteTable("regulatory_items", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").references(() => regulatorySources.id),
  title: text("title").notNull(),
  summary: text("summary"),
  url: text("url"),
  publishedAt: text("published_at"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const dispositions = sqliteTable("dispositions", {
  id: text("id").primaryKey(),
  itemId: text("item_id")
    .notNull()
    .references(() => regulatoryItems.id, { onDelete: "cascade" }),
  disposition: text("disposition").notNull(),
  notes: text("notes").notNull(),
  decidedById: text("decided_by_id").references(() => users.id),
  decidedAt: text("decided_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  linkedPolicyIds: text("linked_policy_ids").notNull().default("[]"),
  linkedSystemIds: text("linked_system_ids").notNull().default("[]"),
  spawnedActionItemId: text("spawned_action_item_id"),
});

export const meetings = sqliteTable("meetings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  meetingDate: text("meeting_date").notNull(),
  attendees: text("attendees").notNull().default("[]"),
  notes: text("notes"),
  status: text("status").notNull().default("scheduled"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const agendaItems = sqliteTable("agenda_items", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
});

export const decisions = sqliteTable("decisions", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  rationale: text("rationale").notNull(),
  conditions: text("conditions"),
  dissent: text("dissent"),
  approverId: text("approver_id").references(() => users.id),
  linkedSystemIds: text("linked_system_ids").notNull().default("[]"),
  linkedIntakeIds: text("linked_intake_ids").notNull().default("[]"),
  linkedPolicyIds: text("linked_policy_ids").notNull().default("[]"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const actionItems = sqliteTable("action_items", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id").references(() => meetings.id),
  decisionId: text("decision_id").references(() => decisions.id),
  title: text("title").notNull(),
  ownerId: text("owner_id").references(() => users.id),
  dueAt: text("due_at"),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const customMetrics = sqliteTable("custom_metrics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  entity: text("entity").notNull(),
  aggregation: text("aggregation").notNull().default("count"),
  filterJson: text("filter_json").notNull().default("{}"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id").references(() => users.id),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
