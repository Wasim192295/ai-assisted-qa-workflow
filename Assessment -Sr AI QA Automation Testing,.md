Assessment -Sr AI QA Automation Testing, to be submitted within 2-3days  
Submission - Please share your submission via: 
• GitHub repository link (preferred), or 
• ZIP file with code and documentation 
Assessment Title - Build an AI-Assisted End-to-End Test Automation Workflow 

Objective 
Design and implement a lightweight system that demonstrates how AI can support the QA 
lifecycle end-to-end, including: 
• Generating manual test cases 
• Converting manual test cases into automation 
• Enabling human review 
• Analyzing execution failures using AI 
This is not expected to be production ready. We are more interested in your approach, design 
decisions, and problem-solving.

Problem Statement 
Build a prototype that supports the following workflow: 
1. Input acceptance criteria 
2. Generate manual UI and API test cases 
3. Accept manually created UI/API test cases as input 
4. Convert approved test cases into Playwright automation scripts 
5. Provide a human review step/interface before finalizing automation 
6. Accept automation execution results/reports 
7. Use AI to categorize test failures 

Sample Input (You may use this or define your own) 
Feature: User Login 
Acceptance Criteria: 
• User can log in with valid credentials 
• Invalid credentials should show an error 
• Username and password are mandatory 
• Locked users cannot log in 
• Login API returns appropriate status codes

Requirements 
1. Test Case Generation 
• Generate structured manual UI and API test cases 
• Clearly distinguish between UI and API coverage 
2. Manual Test Input 
• Allow manual test cases to be provided as input 
• System should process both generated and user-provided test cases 
3. Automation Script Generation 
• Convert selected test cases into Playwright scripts 
• At minimum, demonstrate representative UI and/or API scenarios 
4. Human Review Step 
• Provide a simple way for a user to: 
o Review generated test cases 
o Review generated automation scripts 
o Approve/reject/edit before execution 
(This can be CLI, basic UI, or structured files—no need for advanced UI) 
5. Execution Report Handling 
• Accept test execution output (can be mocked or sample data) 
• Parse and process failure results 
6. AI-Based Failure Categorization 
Classify failures into categories such as: 
• Script/locator issue 
• Product defect 
• Environment issue 
• Test data issue 
• Assertion mismatch 
Explain your approach and how AI is used. 

Constraints 
• Use Playwright for automation 
• Scope can be limited to one feature/workflow 
• Solution can be a prototype (not production-grade) 
• You may mock external dependencies if required 
• Focus on design, workflow, and reasoning over UI polish 
Deliverables 
Please submit the following: 
1. Code Repository 
• Complete source code 
• Instructions to run locally 
2. README  
Include: 
• Architecture overview 
• Approach and design decisions 
• How AI was used (include prompts/workflow) 
• Assumptions and limitations 
• What is implemented vs mocked 
3. Sample Outputs 
• Generated test cases 
• Generated Playwright scripts 
• Sample execution results 
• Failure categorization output 
4. Design Note 
Briefly describe: 
• How this solution can scale 
• Where human validation is critical 
• What improvements you would make with more time 