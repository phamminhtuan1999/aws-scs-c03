# Q037–Q072 independent verification

**36/36 questions and 156/156 choice units checked.** No images or matching/ordering units occur in this subset. Blind conclusions persisted at **2026-09-30 21:33:10 UTC** before first existing review access. Comparison completed at **2026-09-30 21:41:31 UTC**. Sources are opened primary AWS pages accessed 2026-09-30; no publication date guessed.

Frozen initial independent result: **26 verified, 7 ambiguous, 3 unresolved**. Final comparison proposal: **28 verified, 6 ambiguous, 2 unresolved**. Q048 and Q063 retain verified with medium confidence after distinguishing qualified viable answers from invalid choices; Q056 became ambiguous after extra AWS runbook evidence, while its frozen blind result remains unresolved.

## Artifacts and integration

- `independent.json` preserves initial blinded answer, status, Vietnamese option reasons, citations, issues and confidence.
- `comparison.json` compares all36 current keys/status/explanation/keywords/tips and proposes replacements for all36. Each of the156 option units has a reason, citation URLs and evidence-kind qualification.
- Read `records[].proposed.status`, `.answer` (canonical IDs or null), `.intended_answer` (qualified interpretation), `.candidate_answers`, `.confirmed_partial`, `.confidence`, `.explanation_vi.why_correct`, `.explanation_vi.others`, `.option_reviews`, `.keywords`, `.memory_tip_vi`, `.source_issues`, and `.citations`.
- `mandatory_changes` separates factual/validity corrections from `conditional_changes`; ordinary prose shortening is in `editorial_changes`.
- Verified limits: why_correct ≤60 whitespace tokens, every option reason ≤40, one conditional tip ≤35, ≤3 original English phrases validated against blind text. Ambiguous/unresolved proposals keep all choices in `others`.
- Only this output folder was written. No baseline review, app or output export was changed or run.

## Required factual and validity corrections

**Q045 — unresolved, no literal winner.** A/C contain malformed IAM keys; C uses `aws:RequestTag.CostCenter` instead of `aws:RequestTag/CostCenter`. Tag policy enforcement covers supported types, and untagged resources are outside tag-policy compliance. No literal choice guarantees every resource always has an approved tag. Intended C requires corrected syntax and scoped API/resource guardrails. [RequestTag syntax](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-requesttag), [tag-policy limits](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies-enforcement.html).

**Q047 — ambiguous A/C.** The current review treats future buckets as future accounts/Regions, although the stem never says that. C also covers new buckets in the existing account/Region scope. Aggregator is read-only; Lambda needs source-account permissions and event/remediation wiring. [Config aggregation behavior](https://docs.aws.amazon.com/config/latest/developerguide/aggregate-data.html).

**Q053 — keep A, fix guarantee/immutability claims.** Hourly scheduling alone does not guarantee RPO1h: start windows and backup completion/recovery-point age matter. Ordinary backup vaults are not automatically immutable; Vault Lock is optional. [Backup timing](https://docs.aws.amazon.com/aws-backup/latest/devguide/plan-options-and-configuration.html), [optional Vault Lock](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html).

**Q054 — ambiguous wording F.** AWS recommends assigning users, not groups, to management-account permission sets. F says user assignments only in management account; this is materially different from disallowing group assignments. Existing prose silently repairs the option. Recommendations are not mandatory technical prerequisites. Intended A,D,F requires wording correction. [Delegated-admin recommendations](https://docs.aws.amazon.com/singlesignon/latest/userguide/delegated-admin.html).

**Q056 — ambiguous, intended A with inference.** EC2 docs state existing tracked connections survive SG changes, and document immediate interruption of originally untracked flows. They do not expressly guarantee that adding/removing temporary allow-all rules converts a currently tracked SSH session instantly. The AWS containment runbook does use original → all-access → containment SGs, providing positive pattern evidence, but replaces SGs on ENIs rather than proving the exact same-SG rule-edit variant. C/D also block required forensic SSH. The linked Re:Post article returned403. [EC2 connection tracking](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-connection-tracking.html), [AWS containment runbook](https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-awssupport-containec2instance.html).

**Q061 — keep A,D, qualify scope.** Trusted IP list does not suppress every finding type; public IPv4 and DNS/Runtime finding exceptions apply. Do not say TXT is the only supported format. [Trusted lists](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_upload-lists.html).

**Q062 — unresolved, only B confirmed partial.** E asks last user login, which cannot prove unauthorized API-key usage. Even access-key last-used aggregates do not identify attacker and all resources/actions. The required investigative action is CloudTrail, missing from choices; B/E cannot be graded fully valid. [Credential report fields](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html), [exposed-key response](https://docs.aws.amazon.com/IAM/latest/UserGuide/securing_access-keys.html).

**Q065 — keep C, qualify automation.** DRS agents and default staging provide continuous replication and fast launch capability; they do not by themselves imply automatic fault detection and failover without configured trigger/runbook/API workflow. [DRS capabilities](https://docs.aws.amazon.com/drs/latest/userguide/what-is-drs.html).

**Q070 — ambiguous, intended A.** Current runbook describes creating a new trail and TrailName as a new-trail name. Existing review records uncertainty about an already stopped existing trail but still calls it unconditionally verified. Keep the API/scope caveat and periodic-rule delay. [AWS-EnableCloudTrail](https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-enablecloudtrail.html), [Config periodic rule](https://docs.aws.amazon.com/config/latest/developerguide/cloudtrail-enabled.html).

**Q039 — keep D.** Narrow the old absolute assertion that all cross-account roles must be in the resource account; that describes this chosen role-assumption design, while resource-policy designs can grant a source-account principal access.

## Conditional interpretation findings

- Q040: revoke sessions A immediately stops stolen old sessions; D robustly blocks old/new credentials during4h. D as unique winner depends on continuing EC2 compromise. New request denial does not prove termination of already-authorized download streams.
- Q041: B is intended managed cost-anomaly service; billing delay and analysis schedule do not prove absolute earliest alert ordering against every custom hourly export checker. Keep ambiguous.
- Q048: retain verified A,C,F at medium confidence for the natural common-caller interpretation of errors in some accounts. E can still fail if auditor uses separate bad credential profiles; do not say it is impossible universally.
- Q051: conditioned Allow SCP needs a real allowlist without other broad allows; header-only enforcement can reject omitted headers even with default KMS.
- Q052: correct EventBridge wiring C does not guarantee an isolation SG cuts established tracked outbound traffic.
- Q055/Q057/Q058: preserve metadata → protections/tags → disk → memory → isolation ordering; policy name/path mandatory but identical permissions recommended; KMS D is only a possible cause if no other direct grant exists.
- Q063: retain verified C at medium confidence: a fresh role session is a viable additional step protecting URL lifetime. Existing instance-profile credentials are already temporary; presigned URLs are bearer tokens and do not bind recipient identity. [Presigned expiry rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).
- Q064/Q072: Shield metric location depends on protected resource; permission-set AWS-account session duration is distinct from portal session/CLI refresh. Firewall Manager currently has no CloudWatch metrics/alarms enabled. [CloudWatch scope](https://docs.aws.amazon.com/waf/latest/developerguide/monitoring-cloudwatch.html).

## All36 comparison

| ID | Current key | Final proposed status | Canonical answer | Qualified intended answer | Changes |
|---|---|---|---|---|---|
| Q037 | B | verified | B | B | Rút gọn |
| Q038 | C | verified | C | C | Rút gọn |
| Q039 | D | verified | D | D | Bắt buộc |
| Q040 | D | ambiguous | null | D | Có điều kiện |
| Q041 | B | ambiguous | null | B | Có điều kiện |
| Q042 | A,D | verified | A,D | A,D | Rút gọn |
| Q043 | D | verified | D | D | Rút gọn |
| Q044 | C | verified | C | C | Rút gọn |
| Q045 | C | unresolved | null | C | Bắt buộc |
| Q046 | A | verified | A | A | Rút gọn |
| Q047 | A | ambiguous | null | A | Bắt buộc |
| Q048 | A,C,F | verified | A,C,F | A,C,F | Có điều kiện |
| Q049 | B | verified | B | B | Rút gọn |
| Q050 | A,B | verified | A,B | A,B | Rút gọn |
| Q051 | A | verified | A | A | Có điều kiện |
| Q052 | C | verified | C | C | Có điều kiện |
| Q053 | A | verified | A | A | Bắt buộc |
| Q054 | A,D,F | ambiguous | null | A,D,F | Bắt buộc |
| Q055 | B,C,E | verified | B,C,E | B,C,E | Có điều kiện |
| Q056 | A | ambiguous | null | A | Bắt buộc |
| Q057 | A | verified | A | A | Có điều kiện |
| Q058 | D | verified | D | D | Có điều kiện |
| Q059 | A | verified | A | A | Rút gọn |
| Q060 | A | verified | A | A | Rút gọn |
| Q061 | A,D | verified | A,D | A,D | Bắt buộc |
| Q062 | B,E | unresolved | null |  | Bắt buộc |
| Q063 | C | verified | C | C | Có điều kiện |
| Q064 | D | verified | D | D | Có điều kiện |
| Q065 | C | verified | C | C | Bắt buộc |
| Q066 | A,B | verified | A,B | A,B | Rút gọn |
| Q067 | A | verified | A | A | Rút gọn |
| Q068 | B,E | verified | B,E | B,E | Rút gọn |
| Q069 | D | verified | D | D | Rút gọn |
| Q070 | A | ambiguous | null | A | Bắt buộc |
| Q071 | B | verified | B | B | Rút gọn |
| Q072 | B | verified | B | B | Có điều kiện |

## Attestation and source caveats

No existing keys, review files, answer snapshots or CLAUDE were read before initial independent persistence. Additional comparison-stage evidence is identified in `post_compare_evidence`; initial blind conclusions were not overwritten. The frozen independent keyword draft contains seven nonliteral phrase suggestions; every final replacement keyword matches the original blind text exactly. English old artifact-guide URL redirects; an opened AWS ja_jp URL retains the English artifact instructions. The live security-ir PDF cover is August27,2026, whereas search snippets showed older April7 content; the older snippet was not treated as the current live PDF.

