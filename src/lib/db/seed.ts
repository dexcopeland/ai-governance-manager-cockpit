import { addDays, formatISO, subDays } from "date-fns";
import { getDb, getSqlite } from "./index";
import { migrate } from "./migrate";
import { newId } from "@/lib/id";
import {
  actionItems,
  aiSystemLifecycleEvents,
  aiSystems,
  attestations,
  customMetrics,
  decisions,
  dispositions,
  evaluationGateAnswers,
  evaluationScores,
  exceptions,
  hardGates,
  intakeSubmissions,
  meetings,
  agendaItems,
  policies,
  policyFrameworkMaps,
  policyVersions,
  regulatoryItems,
  regulatorySources,
  riskFactors,
  riskMethodologyVersions,
  tierObligations,
  users,
} from "./schema";

function iso(d: Date): string {
  return formatISO(d, { representation: "complete" });
}

function day(offset: number): string {
  return formatISO(addDays(new Date(), offset), { representation: "date" });
}

export function seed(force = false) {
  migrate();
  const sqlite = getSqlite();
  const db = getDb();

  const existing = sqlite.prepare("SELECT COUNT(*) as c FROM users").get() as {
    c: number;
  };
  if (existing.c > 0 && !force) {
    console.log("Database already seeded. Pass --force to reseed.");
    return;
  }

  if (force) {
    sqlite.exec(`
      DELETE FROM audit_events;
      DELETE FROM evaluation_gate_answers;
      DELETE FROM evaluation_scores;
      DELETE FROM attestations;
      DELETE FROM policy_framework_maps;
      DELETE FROM policy_versions;
      DELETE FROM policies;
      DELETE FROM dispositions;
      DELETE FROM regulatory_items;
      DELETE FROM regulatory_sources;
      DELETE FROM agenda_items;
      DELETE FROM action_items;
      DELETE FROM decisions;
      DELETE FROM meetings;
      DELETE FROM exceptions;
      DELETE FROM intake_submissions;
      DELETE FROM ai_system_lifecycle_events;
      DELETE FROM ai_systems;
      DELETE FROM tier_obligations;
      DELETE FROM hard_gates;
      DELETE FROM risk_factors;
      DELETE FROM risk_methodology_versions;
      DELETE FROM custom_metrics;
      DELETE FROM users;
    `);
  }

  const adminId = newId("usr");
  const gmId = newId("usr");
  const committeeId = newId("usr");
  const submitterId = newId("usr");
  const execId = newId("usr");
  const auditorId = newId("usr");
  const techOwnerId = newId("usr");

  db.insert(users)
    .values([
      {
        id: adminId,
        email: "admin@example.com",
        name: "Avery Admin",
        role: "admin",
        businessUnit: "AI Governance",
      },
      {
        id: gmId,
        email: "governance@example.com",
        name: "Morgan Governance",
        role: "governance_manager",
        businessUnit: "AI Governance",
      },
      {
        id: committeeId,
        email: "committee@example.com",
        name: "Casey Committee",
        role: "committee_member",
        businessUnit: "Legal",
      },
      {
        id: submitterId,
        email: "submitter@example.com",
        name: "Sam Submitter",
        role: "submitter",
        businessUnit: "Customer Support",
      },
      {
        id: execId,
        email: "executive@example.com",
        name: "Eden Executive",
        role: "executive",
        businessUnit: "Office of the CEO",
      },
      {
        id: auditorId,
        email: "auditor@example.com",
        name: "Alex Auditor",
        role: "auditor",
        businessUnit: "Internal Audit",
      },
      {
        id: techOwnerId,
        email: "tech@example.com",
        name: "Taylor Tech",
        role: "submitter",
        businessUnit: "Engineering",
      },
    ])
    .run();

  const methodId = newId("meth");
  db.insert(riskMethodologyVersions)
    .values({
      id: methodId,
      version: 1,
      name: "Default Risk Methodology v1",
      effectiveFrom: day(-90),
      isActive: true,
      notes: "Weighted sliders with EU AI Act hard gates.",
    })
    .run();

  const factorDefs = [
    {
      key: "data_sensitivity",
      label: "Data sensitivity",
      guidance: "1 = public data; 5 = special category / biometric.",
      weight: 1.4,
    },
    {
      key: "autonomy",
      label: "Autonomy level",
      guidance: "1 = human-in-the-loop always; 5 = fully autonomous action.",
      weight: 1.2,
    },
    {
      key: "individual_impact",
      label: "Impact on individuals",
      guidance: "1 = negligible; 5 = legal/financial/health consequences.",
      weight: 1.5,
    },
    {
      key: "transparency",
      label: "Transparency difficulty",
      guidance: "1 = easy to explain; 5 = opaque / black-box.",
      weight: 1.0,
    },
    {
      key: "human_oversight",
      label: "Human oversight gap",
      guidance: "1 = strong oversight; 5 = limited or none.",
      weight: 1.3,
    },
  ];

  const factorIds = factorDefs.map((f, i) => {
    const id = newId("fac");
    db.insert(riskFactors)
      .values({
        id,
        methodologyVersionId: methodId,
        key: f.key,
        label: f.label,
        guidance: f.guidance,
        weight: f.weight,
        sortOrder: i + 1,
      })
      .run();
    return { ...f, id };
  });

  const gateProhibited = newId("gate");
  const gateMinors = newId("gate");
  const gateConsequential = newId("gate");
  db.insert(hardGates)
    .values([
      {
        id: gateProhibited,
        methodologyVersionId: methodId,
        key: "prohibited_practice",
        label: "EU AI Act prohibited practice indicator",
        description:
          "Use case appears to involve a prohibited practice under Article 5.",
        effect: "block",
        forcedTier: null,
        blocksApproval: true,
      },
      {
        id: gateMinors,
        methodologyVersionId: methodId,
        key: "minors_data",
        label: "Uses data about minors",
        description: "Processing personal data of persons under 18.",
        effect: "force_tier",
        forcedTier: "high",
        blocksApproval: false,
      },
      {
        id: gateConsequential,
        methodologyVersionId: methodId,
        key: "consequential_automated",
        label: "Consequential automated decisions",
        description:
          "Automated decisions with legal or similarly significant effects on individuals.",
        effect: "force_tier",
        forcedTier: "high",
        blocksApproval: false,
      },
    ])
    .run();

  for (const tier of [
    {
      tier: "low" as const,
      cadence: 365,
      artifacts: ["use_case_register"],
      approvals: ["business_owner"],
    },
    {
      tier: "medium" as const,
      cadence: 180,
      artifacts: ["use_case_register", "transparency_note"],
      approvals: ["business_owner", "governance_manager"],
    },
    {
      tier: "high" as const,
      cadence: 90,
      artifacts: [
        "use_case_register",
        "impact_assessment",
        "human_oversight_plan",
      ],
      approvals: ["governance_manager", "committee"],
    },
    {
      tier: "critical" as const,
      cadence: 30,
      artifacts: [
        "use_case_register",
        "impact_assessment",
        "human_oversight_plan",
        "board_brief",
      ],
      approvals: ["committee", "executive_sponsor"],
    },
  ]) {
    db.insert(tierObligations)
      .values({
        id: newId("obl"),
        methodologyVersionId: methodId,
        tier: tier.tier,
        requiredArtifacts: JSON.stringify(tier.artifacts),
        requiredApprovals: JSON.stringify(tier.approvals),
        reviewCadenceDays: tier.cadence,
        policyTierMatch: tier.tier,
      })
      .run();
  }

  const systemChatId = newId("sys");
  const systemResumeId = newId("sys");
  const systemFraudId = newId("sys");

  db.insert(aiSystems)
    .values([
      {
        id: systemChatId,
        name: "Support Copilot",
        description: "Agent-assist chatbot for customer support tickets.",
        intendedPurpose: "Draft replies for support agents; human sends.",
        businessOwnerId: submitterId,
        technicalOwnerId: techOwnerId,
        lifecycleState: "deployed",
        deploymentContext: "Production SaaS, US + EU customers",
        dataCategories: JSON.stringify(["customer_tickets", "contact_info"]),
        modelDependencies: JSON.stringify([
          "OpenAI GPT-4o (third-party)",
          "Internal retrieval index",
        ]),
        vendorType: "hybrid",
        riskTier: "medium",
        euClassification: "limited_risk",
        nextReviewDate: day(-5),
        createdById: gmId,
      },
      {
        id: systemResumeId,
        name: "Resume Ranker",
        description: "Ranks applicants for open roles using resume embeddings.",
        intendedPurpose: "Prioritize candidate shortlists for recruiters.",
        businessOwnerId: submitterId,
        technicalOwnerId: techOwnerId,
        lifecycleState: "in_review",
        deploymentContext: "HRIS-integrated pilot",
        dataCategories: JSON.stringify(["resume_text", "employment_history"]),
        modelDependencies: JSON.stringify(["Vendor: HireSense Rank API"]),
        vendorType: "third_party",
        riskTier: "high",
        euClassification: "high_risk",
        nextReviewDate: day(20),
        createdById: gmId,
      },
      {
        id: systemFraudId,
        name: "Claims Fraud Screen",
        description: "Flags insurance claims for potential fraud review.",
        intendedPurpose: "Route high-risk claims to investigators.",
        businessOwnerId: submitterId,
        technicalOwnerId: techOwnerId,
        lifecycleState: "approved",
        deploymentContext: "Batch scoring nightly",
        dataCategories: JSON.stringify(["claims", "payment_history"]),
        modelDependencies: JSON.stringify(["Internal XGBoost model"]),
        vendorType: "internal",
        riskTier: "high",
        euClassification: "high_risk",
        nextReviewDate: day(45),
        createdById: gmId,
      },
    ])
    .run();

  db.insert(aiSystemLifecycleEvents)
    .values([
      {
        id: newId("lce"),
        systemId: systemChatId,
        fromState: null,
        toState: "proposed",
        reason: "Initial intake approved",
        changedById: gmId,
        changedAt: iso(subDays(new Date(), 120)),
      },
      {
        id: newId("lce"),
        systemId: systemChatId,
        fromState: "proposed",
        toState: "approved",
        reason: "Committee approved with transparency obligations",
        changedById: committeeId,
        changedAt: iso(subDays(new Date(), 100)),
      },
      {
        id: newId("lce"),
        systemId: systemChatId,
        fromState: "approved",
        toState: "deployed",
        reason: "Production rollout complete",
        changedById: techOwnerId,
        changedAt: iso(subDays(new Date(), 80)),
      },
      {
        id: newId("lce"),
        systemId: systemResumeId,
        fromState: null,
        toState: "proposed",
        reason: "New HR use case submitted",
        changedById: submitterId,
        changedAt: iso(subDays(new Date(), 14)),
      },
      {
        id: newId("lce"),
        systemId: systemResumeId,
        fromState: "proposed",
        toState: "in_review",
        reason: "Governance review started",
        changedById: gmId,
        changedAt: iso(subDays(new Date(), 10)),
      },
    ])
    .run();

  const intakeScoredId = newId("int");
  const intakePendingId = newId("int");
  db.insert(intakeSubmissions)
    .values([
      {
        id: intakeScoredId,
        title: "Resume Ranker for campus recruiting",
        purpose: "Shortlist campus applicants faster during peak season.",
        dataInvolved: "Resumes, education history, optionally demographic fields from ATS.",
        affectedPopulations: "Job applicants (including recent graduates).",
        vendorModelDetails: "HireSense Rank API + internal orchestration.",
        useCaseCategory: "employment",
        status: "evaluated",
        submitterId,
        assignedToId: gmId,
        slaDueAt: iso(subDays(new Date(), 2)),
        methodologyVersionId: methodId,
        compositeScore: 3.8,
        resultingTier: "high",
        gateTriggered: "consequential_automated",
        obligationSnapshot: JSON.stringify({
          tier: "high",
          requiredArtifacts: [
            "use_case_register",
            "impact_assessment",
            "human_oversight_plan",
          ],
          requiredApprovals: ["governance_manager", "committee"],
          reviewCadenceDays: 90,
        }),
        evaluationRationale:
          "Employment decisions are high-risk under EU AI Act Annex III; consequential automation gate fired.",
        linkedSystemId: systemResumeId,
        submittedAt: iso(subDays(new Date(), 14)),
        evaluatedAt: iso(subDays(new Date(), 10)),
        evaluatedById: gmId,
      },
      {
        id: intakePendingId,
        title: "Marketing content rewriter",
        purpose: "Rewrite campaign copy for brand tone.",
        dataInvolved: "Public marketing briefs; no customer PII.",
        affectedPopulations: "None directly; internal marketers.",
        vendorModelDetails: "Anthropic Claude via vendor SaaS.",
        useCaseCategory: "marketing",
        status: "submitted",
        submitterId,
        assignedToId: gmId,
        slaDueAt: iso(addDays(new Date(), 2)),
        methodologyVersionId: methodId,
        submittedAt: iso(subDays(new Date(), 1)),
      },
    ])
    .run();

  for (const f of factorIds) {
    const score =
      f.key === "individual_impact" ? 5 : f.key === "data_sensitivity" ? 4 : 3;
    db.insert(evaluationScores)
      .values({
        id: newId("scr"),
        intakeId: intakeScoredId,
        factorId: f.id,
        score,
        rationale: `Scored ${score} based on ${f.label.toLowerCase()} for employment screening.`,
      })
      .run();
  }

  db.insert(evaluationGateAnswers)
    .values([
      {
        id: newId("ega"),
        intakeId: intakeScoredId,
        gateId: gateProhibited,
        triggered: false,
        rationale: "No prohibited practice indicators.",
      },
      {
        id: newId("ega"),
        intakeId: intakeScoredId,
        gateId: gateMinors,
        triggered: false,
        rationale: "Applicants are 18+.",
      },
      {
        id: newId("ega"),
        intakeId: intakeScoredId,
        gateId: gateConsequential,
        triggered: true,
        rationale: "Ranking influences who advances in hiring.",
      },
    ])
    .run();

  const policyTransparencyId = newId("pol");
  const policyImpactId = newId("pol");
  const policyHumanId = newId("pol");
  const pv1 = newId("pv");
  const pv2 = newId("pv");
  const pv3 = newId("pv");

  db.insert(policies)
    .values([
      {
        id: policyTransparencyId,
        slug: "ai-transparency",
        title: "AI Transparency & Disclosure Policy",
        ownerId: gmId,
        currentVersionId: pv1,
      },
      {
        id: policyImpactId,
        slug: "ai-impact-assessment",
        title: "AI Impact Assessment Policy",
        ownerId: gmId,
        currentVersionId: pv2,
      },
      {
        id: policyHumanId,
        slug: "human-oversight",
        title: "Human Oversight Standard",
        ownerId: gmId,
        currentVersionId: pv3,
      },
    ])
    .run();

  db.insert(policyVersions)
    .values([
      {
        id: pv1,
        policyId: policyTransparencyId,
        version: 1,
        body: "All AI systems interacting with individuals must disclose AI involvement and provide a human escalation path.",
        plainLanguageSummary:
          "Tell people when they are interacting with AI, and always offer a human.",
        changeRationale: "Initial publication.",
        applicableRiskTiers: JSON.stringify(["medium", "high", "critical"]),
        applicableCategories: JSON.stringify(["customer_facing", "employment", "marketing"]),
        applicableRoles: JSON.stringify(["submitter", "governance_manager"]),
        effectiveDate: day(-100),
        reviewDate: day(80),
        createdById: gmId,
      },
      {
        id: pv2,
        policyId: policyImpactId,
        version: 1,
        body: "High-risk and critical systems require a documented impact assessment before approval.",
        plainLanguageSummary:
          "If the AI can significantly affect people, write an impact assessment first.",
        changeRationale: "Initial publication.",
        applicableRiskTiers: JSON.stringify(["high", "critical"]),
        applicableCategories: JSON.stringify(["employment", "credit", "insurance"]),
        applicableRoles: JSON.stringify(["governance_manager", "committee_member"]),
        effectiveDate: day(-100),
        reviewDate: day(80),
        createdById: gmId,
      },
      {
        id: pv3,
        policyId: policyHumanId,
        version: 1,
        body: "Automated decisions with significant effects require documented human oversight and override capability.",
        plainLanguageSummary:
          "A person must be able to review and override high-stakes automated decisions.",
        changeRationale: "Initial publication.",
        applicableRiskTiers: JSON.stringify(["high", "critical"]),
        applicableCategories: JSON.stringify(["employment", "credit", "insurance"]),
        applicableRoles: JSON.stringify(["governance_manager", "committee_member"]),
        effectiveDate: day(-100),
        reviewDate: day(80),
        createdById: gmId,
      },
    ])
    .run();

  const maps: Array<[string, string, string, string]> = [
    [pv1, "NIST_AI_RMF", "GOVERN.1.2", "GOVERN 1.2 — Trustworthy AI characteristics"],
    [pv1, "EU_AI_ACT", "Art.50", "Article 50 — Transparency obligations"],
    [pv1, "ISO_42001", "A.5.2", "A.5.2 — AI policy"],
    [pv2, "NIST_AI_RMF", "MAP.2.1", "MAP 2.1 — Categorize AI risks"],
    [pv2, "EU_AI_ACT", "Art.9", "Article 9 — Risk management system"],
    [pv2, "ISO_42001", "A.6.1.2", "A.6.1.2 — AI system impact assessment process"],
    [pv3, "NIST_AI_RMF", "MANAGE.1.1", "MANAGE 1.1 — Risk response prioritization"],
    [pv3, "EU_AI_ACT", "Art.14", "Article 14 — Human oversight"],
    [pv3, "ISO_42001", "8.4", "8.4 — AI system impact assessment"],
  ];
  for (const [versionId, framework, referenceId, label] of maps) {
    db.insert(policyFrameworkMaps)
      .values({
        id: newId("pfm"),
        policyVersionId: versionId,
        framework,
        referenceId,
        label,
      })
      .run();
  }

  db.insert(attestations)
    .values([
      {
        id: newId("att"),
        policyVersionId: pv1,
        userId: submitterId,
        status: "pending",
        dueAt: day(7),
      },
      {
        id: newId("att"),
        policyVersionId: pv1,
        userId: techOwnerId,
        status: "completed",
        dueAt: day(-3),
        completedAt: iso(subDays(new Date(), 1)),
      },
      {
        id: newId("att"),
        policyVersionId: pv2,
        userId: gmId,
        status: "completed",
        dueAt: day(-10),
        completedAt: iso(subDays(new Date(), 12)),
      },
    ])
    .run();

  db.insert(exceptions)
    .values({
      id: newId("exc"),
      version: 1,
      systemId: systemChatId,
      policyId: policyTransparencyId,
      requirementSummary: "Real-time AI disclosure in chat widget",
      rationale:
        "Legacy widget cannot show disclosure until Q3 redesign; agents verbally disclose.",
      compensatingControls:
        "Agent script requires verbal disclosure; audit sampling weekly.",
      riskAcceptorId: execId,
      status: "active",
      expiresAt: day(12),
      createdById: gmId,
    })
    .run();

  const sourceIds = [
    {
      id: newId("src"),
      name: "Federal Register (AI-related)",
      url: "https://www.federalregister.gov/api/v1/documents.rss?conditions%5Bterm%5D=artificial+intelligence",
      region: "US",
    },
    {
      id: newId("src"),
      name: "EU Official Journal",
      url: "https://eur-lex.europa.eu/OJ/direct-access.html",
      region: "EU",
      feedType: "url",
    },
    {
      id: newId("src"),
      name: "NIST AI news",
      url: "https://www.nist.gov/news-events/news/rss.xml",
      region: "US",
    },
    {
      id: newId("src"),
      name: "ISO standards updates",
      url: "https://www.iso.org/rss/standardupdates",
      region: "Global",
    },
  ];
  db.insert(regulatorySources)
    .values(
      sourceIds.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        feedType: s.feedType ?? "rss",
        region: s.region,
        isActive: true,
      })),
    )
    .run();

  const regPending = newId("reg");
  const regAction = newId("reg");
  const regMonitor = newId("reg");
  db.insert(regulatoryItems)
    .values([
      {
        id: regPending,
        sourceId: sourceIds[0].id,
        title: "Draft federal guidance on AI procurement transparency",
        summary: "Proposed guidance for agencies procuring AI systems.",
        url: "https://example.com/us-ai-procurement",
        publishedAt: day(-2),
        status: "pending",
      },
      {
        id: regAction,
        sourceId: sourceIds[1].id,
        title: "Commission clarifies deployer logging for high-risk AI",
        summary: "Additional expectations for Article 26 deployer logs.",
        url: "https://example.com/eu-deployer-logs",
        publishedAt: day(-8),
        status: "dispositioned",
      },
      {
        id: regMonitor,
        sourceId: sourceIds[2].id,
        title: "NIST publishes measurement companion note",
        summary: "Optional measurement practices for MAP/MEASURE functions.",
        url: "https://example.com/nist-measure",
        publishedAt: day(-20),
        status: "dispositioned",
      },
    ])
    .run();

  const actionFromReg = newId("act");
  db.insert(dispositions)
    .values([
      {
        id: newId("disp"),
        itemId: regAction,
        disposition: "action_required",
        notes: "Update Human Oversight Standard logging section; brief committee.",
        decidedById: gmId,
        decidedAt: iso(subDays(new Date(), 6)),
        linkedPolicyIds: JSON.stringify([policyHumanId]),
        linkedSystemIds: JSON.stringify([systemFraudId, systemResumeId]),
        spawnedActionItemId: actionFromReg,
      },
      {
        id: newId("disp"),
        itemId: regMonitor,
        disposition: "monitor",
        notes: "No immediate policy change; revisit next quarter.",
        decidedById: gmId,
        decidedAt: iso(subDays(new Date(), 18)),
        linkedPolicyIds: JSON.stringify([]),
        linkedSystemIds: JSON.stringify([]),
      },
    ])
    .run();

  const meetingId = newId("mtg");
  db.insert(meetings)
    .values({
      id: meetingId,
      title: "AI Governance Committee — July",
      meetingDate: day(-7),
      attendees: JSON.stringify([
        "Morgan Governance",
        "Casey Committee",
        "Eden Executive",
      ]),
      notes: "Reviewed Resume Ranker evaluation; approved pending impact assessment.",
      status: "completed",
      createdById: gmId,
    })
    .run();

  db.insert(agendaItems)
    .values([
      {
        id: newId("ag"),
        meetingId,
        title: "Resume Ranker intake approval",
        sourceType: "intake",
        sourceId: intakeScoredId,
        sortOrder: 1,
        isManual: false,
      },
      {
        id: newId("ag"),
        meetingId,
        title: "Support Copilot overdue review",
        sourceType: "review",
        sourceId: systemChatId,
        sortOrder: 2,
        isManual: false,
      },
    ])
    .run();

  const decisionId = newId("dec");
  db.insert(decisions)
    .values({
      id: decisionId,
      meetingId,
      summary: "Approve Resume Ranker to proceed to impact assessment stage",
      rationale:
        "High-risk employment use case with clear business need; gates and scores support high tier.",
      conditions: "Impact assessment and human oversight plan due in 30 days.",
      dissent: null,
      approverId: committeeId,
      linkedSystemIds: JSON.stringify([systemResumeId]),
      linkedIntakeIds: JSON.stringify([intakeScoredId]),
      linkedPolicyIds: JSON.stringify([policyImpactId, policyHumanId]),
    })
    .run();

  db.insert(actionItems)
    .values([
      {
        id: newId("act"),
        meetingId,
        decisionId,
        title: "Complete AI impact assessment for Resume Ranker",
        ownerId: submitterId,
        dueAt: day(20),
        status: "open",
      },
      {
        id: actionFromReg,
        meetingId: null,
        decisionId: null,
        title: "Update Human Oversight Standard for deployer logging",
        ownerId: gmId,
        dueAt: day(-1),
        status: "open",
      },
      {
        id: newId("act"),
        meetingId,
        decisionId,
        title: "Schedule Support Copilot periodic review",
        ownerId: gmId,
        dueAt: day(5),
        status: "open",
      },
    ])
    .run();

  db.insert(customMetrics)
    .values([
      {
        id: newId("met"),
        name: "Overdue inventory reviews",
        description: "Systems with next_review_date in the past",
        entity: "ai_systems",
        aggregation: "count",
        filterJson: JSON.stringify({ overdueReview: true }),
        isDefault: true,
        createdById: gmId,
      },
      {
        id: newId("met"),
        name: "Open action items past due",
        description: "Action items open and past due date",
        entity: "action_items",
        aggregation: "count",
        filterJson: JSON.stringify({ overdueOpen: true }),
        isDefault: true,
        createdById: gmId,
      },
      {
        id: newId("met"),
        name: "High-risk systems",
        description: "Inventory systems tiered high or critical",
        entity: "ai_systems",
        aggregation: "count",
        filterJson: JSON.stringify({ tiers: ["high", "critical"] }),
        isDefault: true,
        createdById: gmId,
      },
    ])
    .run();

  console.log("Seed data loaded.");
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].includes("seed");
if (isMain) {
  const force = process.argv.includes("--force");
  seed(force);
}
