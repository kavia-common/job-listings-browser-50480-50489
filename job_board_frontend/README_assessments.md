Skill Assessments (localStorage-backed)

- Visit /assessments to browse tests. 
- MCQ and Coding tests are seeded in localStorage on first load.
- Attempts are stored under localStorage key "assessmentAttempts".
- Derived skill scores are stored under "skillScores" and shown on the Profile page under "Skill Scores".
- Results history available at /assessments/results.

Notes:
- Coding runner uses new Function for lightweight evaluation. It runs only client-side and is restricted to the provided function signature.
- To reset all data, clear browser localStorage for this site.
