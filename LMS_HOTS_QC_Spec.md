# LMS HOTS Question Quality Control (QC) System — Detailed Spec (SMP/SMA Indonesia)

This document specifies an LMS feature where **teacher-authored questions/quizzes** are **AI-reviewed** for **Bloom level (1–6), HOTS, difficulty, and boundedness**, then **double-checked by admins** for mismatches and risk. **Student-facing AI remains hint-only**.

---

## 1) Objective

Build a Question QC pipeline for these core subjects:
- **Science (IPA)**
- **Math (Matematika)**
- **English**
- **Civics (PPKn)**
- **Economy (Ekonomi)**

The system must:
1. Allow teachers to author questions and self-tag **difficulty** (Easy/Medium/Hard).
2. Run **AI pre-review** producing:
   - **Primary Bloom level (1–6)**
   - **HOTS** flag + strength
   - **Difficulty prediction** (score 1–10 + label)
   - **Boundedness** (B0/B1/B2)
   - Risk flags (ambiguity, missing info, reading overload, out-of-grade, etc.)
   - Suggested edits (make easier/clearer/more HOTS)
3. Route risky items to **Admin Moderation Queue** for review/override.
4. Maintain **Student AI = hint-only**, with quotas and teacher visibility.
5. Use **post-release student performance** to calibrate difficulty labels over time.

---

## 2) Definitions (System Truth)

### 2.1 Bloom’s Taxonomy (Revised) — Primary Level
Assign **one primary level** based on the *highest cognitive action required to earn full credit*:
1. **Remember** (Mengingat)
2. **Understand** (Memahami)
3. **Apply** (Menerapkan)
4. **Analyze** (Menganalisis)
5. **Evaluate** (Mengevaluasi)
6. **Create** (Mencipta)

> **Bloom ≠ Difficulty**. A Bloom 4 item can be easy if well-scaffolded and bounded.

### 2.2 HOTS
**HOTS = Bloom 4–6** AND includes at least one **HOTS signal**:
- Compare/contrast with reasoning
- Identify relationships/patterns/inference
- Debug reasoning / error analysis
- Evaluate options using criteria/trade-offs
- Create/design solution under constraints

**HOTS Strength**
- **S2 (Strong)**: explicit **criteria/constraints/evidence/debug** required
- **S1 (Medium)**: “explain why” but weaker structure; evidence/criteria optional or unclear
- **S0 (Weak)**: sounds HOTS (“analyze...”) but output is still recall/summary

### 2.3 Boundedness
Measures whether a question is **well-bounded** so SMP/SMA students can answer without confusion.

- **B2 (Good)**: enough info provided + clear output format + time/scope + rubric criteria
- **B1 (Partial)**: some elements unclear (output, rubric, scope) but still answerable
- **B0 (Bad)**: requires external research / missing key info / ambiguous grading

> B0 should automatically route to admin and/or require revision.

### 2.4 Difficulty (Separate from Bloom)
Compute a **0–10 score** from:
- **Steps/complexity (0–4)**
- **Prerequisite load (0–3)**
- **Reading/data load (0–3)**

Map:
- **0–3 = Easy**
- **4–6 = Medium**
- **7–10 = Hard**

---

## 3) Roles & Permissions

### Teacher
- Create/edit questions
- Attach materials (text, image, table, dataset)
- Assign teacher-declared difficulty
- Submit for AI review
- Receive AI report and suggested edits
- Respond to admin return requests
- View student hint usage and performance analytics (aggregate)

### Admin/Moderator
- View moderation queue
- Override tags (Bloom, HOTS, difficulty, boundedness)
- Approve/publish or return to teacher
- Edit question content (optional; configurable)
- Audit logs of decisions

### Student
- Attempt questions/quizzes
- Use **hint-only AI** within quotas
- Participate in peer review (optional)

---

## 4) Supported Question Types (MVP)

- **MCQ** (single correct)
- **Short answer** (structured)
- **CER response** (Claim–Evidence–Reasoning)
- **Case-based** (scenario)
- **Data interpretation** (table/graph)
- **Error analysis** (debug a wrong solution)

---

## 5) End-to-End Workflow

### 5.1 State Machine
- `DRAFT`
- `SUBMITTED_FOR_AI_REVIEW`
- `AI_REVIEWED`
- `ADMIN_REVIEW_REQUIRED`
- `RETURNED_TO_TEACHER`
- `APPROVED`
- `PUBLISHED`
- `ARCHIVED`

### 5.2 Flow
1. Teacher creates question (**DRAFT**)
2. Teacher clicks **Submit for review**
3. System triggers **AI QC job**
4. AI report saved; status becomes **AI_REVIEWED**
5. Routing rules decide:
   - Auto-approve → **APPROVED**
   - Else → **ADMIN_REVIEW_REQUIRED**
6. Admin reviews:
   - Approve and publish
   - Override tags and publish
   - Return to teacher with required edits (**RETURNED_TO_TEACHER**)

### 5.3 Post-Release Calibration Loop
After students attempt:
- Collect performance telemetry (accuracy, time-on-task, hint usage)
- Compute empirical difficulty suggestion
- Surface admin task: “Update difficulty label?”

---

## 6) Subject Rubric (Bloom/HOTS Signals & Checks)

This rubric is used by:
- Teachers (authoring guidance)
- AI QC (classification rules)
- Admin moderation (checklist)

### 6.1 Science (IPA)
**Bloom signals**
- B1: recall terms/laws/units
- B2: explain concept; interpret simple diagram
- B3: apply formula/standard scenario
- B4: interpret data; variables; cause-effect; compare experiments
- B5: critique conclusions; choose best method using criteria (validity, reliability, safety)
- B6: design investigation/solution under constraints (tools, time, controls)

**HOTS strong triggers**
- data/graph interpretation with reasoning
- experimental design with constraints/controls
- evaluation using explicit criteria

**Common risk flags**
- missing variables/control definition
- too complex datasets for grade
- requires outside niche knowledge

### 6.2 Math
**Bloom signals**
- B1: recall formula/definition
- B2: explain meaning of steps; interpret representation
- B3: solve using known procedure
- B4: compare strategies; debug errors; case analysis; pattern/structure analysis
- B5: judge method correctness/efficiency using criteria
- B6: construct model/rule; generalization; create problem/solution under constraints

**HOTS strong triggers**
- error analysis (debug)
- compare 2 methods + justify choice
- modeling with assumptions

**Common risk flags**
- ambiguous constraints leading to multiple correct answers
- too many steps with no scaffold
- heavy reading word problems

### 6.3 English
**Bloom signals**
- B1: vocab/grammar recall
- B2: summarize/paraphrase; main idea
- B3: apply grammar/vocab to produce a short text
- B4: analyze tone/structure/purpose; compare perspectives; identify fallacies (requires text evidence)
- B5: evaluate argument credibility/strength using criteria (bias, relevance, evidence)
- B6: create/transform text for audience/purpose with constraints

**HOTS strong triggers**
- requires evidence from text
- evaluates arguments with criteria
- rewrite/transform for specified audience/purpose

**Common risk flags**
- reading too long (SMP >300 words; SMA >500 words) without scaffold
- cultural knowledge not provided
- missing writing rubric

### 6.4 Civics (PPKn)
**Bloom signals**
- B1: recall principles/institutions
- B2: explain meaning/values; roles
- B3: apply rules/values to a straightforward case
- B4: analyze stakeholders; rights/duties conflicts; causal chain
- B5: evaluate policy/action using criteria (justice, legality, public good, rights)
- B6: propose program/policy for school/community with constraints + steps + success metrics

**HOTS strong triggers**
- explicit criteria & trade-offs
- stakeholder table / cause-effect mapping
- constrained solution proposal with implementation steps

**Common risk flags**
- opinion-only prompts without criteria
- scenario lacking context
- sensitive topics needing neutrality

### 6.5 Economy (Ekonomi)
**Bloom signals**
- B1: define terms (inflation, demand, GDP)
- B2: explain relationships (cause-effect) simply
- B3: compute/basic interpretation (graphs, simple metrics)
- B4: analyze trends, causal chains, compare market outcomes using data/scenario
- B5: evaluate policy options with criteria (efficiency, equity, stability, feasibility)
- B6: design strategy/business/policy proposal with assumptions + constraints + risk

**HOTS strong triggers**
- decision table with criteria + trade-offs
- data interpretation + justification
- constrained policy/business proposal

**Common risk flags**
- claims without evidence requirement
- ambiguous variables/timeframe
- math-heavy without required data/formula

---

## 7) AI QC Output Schema (Strict JSON)

AI must output **only JSON** and comply with the schema below.

```json
{
  "primary_bloom_level": 1,
  "secondary_bloom_levels": [2],
  "hots": {
    "flag": false,
    "strength": "S0",
    "signals": []
  },
  "boundedness": "B2",
  "difficulty": {
    "score_1_10": 4,
    "label": "medium",
    "reasons": ["2-4 steps", "moderate reading/data load"]
  },
  "quality": {
    "clarity_score_0_100": 82,
    "ambiguity_flags": [],
    "missing_info_flags": [],
    "grade_fit_flags": []
  },
  "alignment": {
    "subject_match_score_0_100": 90,
    "topic_match_score_0_100": 85
  },
  "suggested_edits": [
    {
      "goal": "reduce_ambiguity",
      "change_summary": "Add constraints and output format",
      "before": "original text snippet",
      "after": "proposed replacement snippet"
    }
  ],
  "confidence": {
    "bloom": 0.78,
    "hots": 0.74,
    "difficulty": 0.66,
    "boundedness": 0.81
  },
  "model_version": "qc-v1"
}
```

**Hard requirements**
- `primary_bloom_level` is integer 1–6
- `boundedness` is one of `B0`, `B1`, `B2`
- `hots.strength` is one of `S0`, `S1`, `S2`
- `difficulty.score_1_10` is integer 1–10 (or 0–10 if you prefer)

---

## 8) Routing Rules to Admin Queue (Economic Feasibility)

### 8.1 Admin Queue Triggers
Send to admin when any of these are true:
- Teacher says **Easy** but AI difficulty score **>= 7**
- Teacher says **Hard** but AI difficulty score **<= 3**
- Teacher marks HOTS but AI `primary_bloom_level <= 3` OR `hots.strength = S0`
- `boundedness = B0`
- Any ambiguity/missing-info flags present
- Any confidence metric < **0.65** (bloom/hots/difficulty/boundedness)

### 8.2 Auto-Approve
Auto-approve if:
- `boundedness = B2`
- All confidence metrics >= **0.70**
- Difficulty label matches teacher OR differs by at most 1 band (easy vs medium)
- No major flags

---

## 9) Admin Moderation UI Spec

### 9.1 Queue List
Columns:
- Subject, grade band
- Teacher difficulty vs AI difficulty
- AI Bloom + HOTS (flag + strength)
- Boundedness
- Flag count
- Lowest confidence metric

Sort priority:
1) `B0` boundedness
2) Easy ↔ Hard mismatch
3) Low confidence
4) Teacher HOTS claim but AI says low Bloom/weak HOTS

### 9.2 Review Detail View
Panels:
- Question prompt + attachments + answer key/rubric
- Teacher metadata (difficulty, intended Bloom optional)
- AI QC summary:
  - Bloom/HOTS/difficulty/boundedness
  - Top flags
  - Suggested edits (copy/apply)

Actions:
- Approve (optional tag override)
- Return to teacher (pre-filled feedback)
- Edit question (optional)
- Archive/reject

---

## 10) Teacher Feedback UX (Behavior Change)

When returned:
- Show 1–2 sentence reason: e.g., “B0: missing required data” or “Easy vs Hard mismatch due to 7-step reasoning.”
- Show rubric violations:
  - boundedness issue (input/output/scope/rubric)
  - HOTS weakness (no criteria/evidence/constraints)
- Offer 2 suggested rewrites:
  - Make easier (add scaffold/template)
  - Make more HOTS (add criteria/constraints/evidence)

---

## 11) Student Hint-only AI Spec (Hard Guardrails)

### 11.1 Allowed Hint Modes
- Clarify question in simpler language
- Ask Socratic guiding questions
- Suggest next step (not final answer)
- Rubric checklist (“Do you have evidence?”)
- Provide sentence starters / structure template
- Explain concept background (but not compute final numeric answer)

### 11.2 Disallowed
- Direct final answers
- Full end-to-end solution
- Revealing MCQ keys
- Writing full essay responses

### 11.3 Enforcement
- Role-based endpoints
- Hint quotas per question (SMP 3; SMA 5 recommended)
- Log all hint requests/responses (HintLogs) for auditing
- Teacher dashboard shows hint usage rate per question/class

---

## 12) Data Model (MVP)

### 12.1 Core Entities
- Users (role)
- Classes
- Subjects, Topics
- Questions (versioned)
- Rubrics
- AIReviews
- AdminReviews
- Assignments/Quizzes
- Submissions
- HintLogs
- PerformanceAggregates

### 12.2 Question
- `id`, `author_id`, `subject_id`, `topic_id`
- `grade_band` (SMP/SMA), `grade` (7–12)
- `type` (mcq/short/cer/case/data/error_analysis)
- `prompt`, `attachments[]`
- `teacher_difficulty_label` (easy/medium/hard)
- `expected_answer` (objective) OR `rubric_id` (open-ended)
- `status`, `version`, `parent_id`, timestamps

### 12.3 AIReview
- `question_id`
- `json_report` (validated against schema)
- indexed fields for searching: bloom, hots flag/strength, boundedness, difficulty label/score
- confidence metrics
- `model_version`, timestamp

### 12.4 AdminReview
- `question_id`, `reviewer_id`
- decision (approve/return/edit/archive)
- final tags (bloom/hots/difficulty/boundedness)
- notes, timestamp

### 12.5 PerformanceAggregates
- `question_id`
- `median_time`, `accuracy` (objective)
- `rubric_means` (open-ended)
- `hint_usage_rate`
- `empirical_difficulty_score`, `empirical_label`

---

## 13) Backend / API Requirements (MVP)

### 13.1 Key Endpoints (Conceptual)
- `POST /questions` create draft
- `PUT /questions/{id}` edit draft
- `POST /questions/{id}/submit` submit for AI review (enqueue job)
- `GET /questions/{id}/ai-review` fetch AI report
- `GET /admin/review-queue` list flagged items
- `POST /admin/review/{question_id}` approve/return/override
- `POST /submissions` create submission
- `POST /student/hints` hint-only endpoint (role-locked)

### 13.2 Async Processing
AI QC should run asynchronously via job queue to keep UX fast:
- on submit: enqueue `AI_QC_REVIEW(question_id)`
- on completion: write AIReview + update status

---

## 14) Non-Functional Requirements

- Audit logs for AI reviews + admin overrides
- Versioning: published question versions immutable
- Indonesian language support; tolerate mixed bilingual prompts
- Privacy: student responses protected; hint logs viewable by teacher/admin only
- Cost control: avoid expensive essay autograding by default; focus on QC + hinting

---

## 15) Acceptance Criteria (Testable)

### Teacher
- Can create question and submit for AI QC
- Receives AI tags + confidence + suggested edits
- If returned by admin, sees clear reasons and can resubmit revised version

### Admin
- Queue includes only items matching routing triggers
- Admin can approve/override/return quickly
- All decisions logged and traceable

### Student
- Hint-only AI cannot reveal final answers (spot tests)
- Hint quota enforced
- Teachers see hint usage stats

### Calibration
- System computes empirical difficulty from student data
- Admin sees suggested difficulty updates and can apply them

---

## 16) Milestones (Build Order)

1. Question authoring + status machine + versioning
2. AI QC job + JSON schema validation + AIReview storage
3. Routing rules + Admin queue UI
4. Teacher feedback UI + “apply suggested edits”
5. Student hint-only AI service + quotas + logging
6. Performance telemetry + empirical difficulty calibration dashboard

---

## Appendix A — Difficulty Score Rubric (0–10)

**Steps (0–4)**
- 0: 1 step
- 1: 2 steps
- 2: 3–4 steps
- 3: 5–6 steps
- 4: 7+ steps

**Prerequisite load (0–3)**
- 0: 1 concept
- 1: 2 concepts
- 2: 3 concepts
- 3: 4+ concepts

**Reading/data load (0–3)**
- 0: short and clear
- 1: moderate
- 2: heavy text or complex table
- 3: long + complex + unfamiliar context

Total:
- 0–3 Easy
- 4–6 Medium
- 7–10 Hard

---

## Appendix B — Boundedness Checklist (B2 target)

A question is B2 if it has:
- **Input**: all required info is provided (text/data/diagram/case)
- **Output**: expected format is clear (CER/table/flowchart/steps)
- **Scope**: time-box and constraints are clear
- **Rubric**: criteria for grading are explicit (3–4 dimensions)
