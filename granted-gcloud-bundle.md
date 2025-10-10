This file is a merged representation of a subset of the codebase, containing files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching these patterns are excluded: __pycache__/**, *.pyc, *.md
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
config/
  NSF SBIR.yaml
.gcloudignore
chat_complete.py
document.py
llm_helpers.py
main.py
requirements.txt
web_summary.py
```

# Files

## File: config/NSF SBIR.yaml
````yaml
document_name: NSF SBIR
draft_order: 
  - NSF - SBIR - 1. Draft Technical Objectives
  - NSF - SBIR - 2. Project Pitch
  - NSF - SBIR - 3. Expanded Technical Objectives
  - NSF - SBIR - 4. Project Summary
  - "NSF - SBIR - 5.1 Project Description: Elevator Pitch"
  - "NSF - SBIR - 5.2 Project Description: Commercial Opportunity"
  - "NSF - SBIR - 5.3 Project Description: Technical Solution"
  - "NSF - SBIR - 5.4 Project Description: Company and Team"
  - "NSF - SBIR - 5.5 Project Description: Technical Discussion and R&D Plan"
  - "NSF - SBIR - 5.6 Project Description: Broader Impacts"
output_order: 
  - NSF - SBIR - 2. Project Pitch
  - NSF - SBIR - 4. Project Summary
  - "NSF - SBIR - 5.1 Project Description: Elevator Pitch"
  - "NSF - SBIR - 5.2 Project Description: Commercial Opportunity"
  - "NSF - SBIR - 5.3 Project Description: Technical Solution"
  - "NSF - SBIR - 5.4 Project Description: Company and Team"
  - "NSF - SBIR - 5.5 Project Description: Technical Discussion and R&D Plan"
  - "NSF - SBIR - 5.6 Project Description: Broader Impacts"
reviewer_characteristics: |
 You are an experienced grant writing consultant and an NSF SBIR reviewer with a strong background in artificial intelligence and machine learning technologies, 
 specifically in the field of natural language processing and data-driven methodologies. You have a deep understanding of the complexities and intricacies of the 
 grant writing process, having worked with numerous non-profit organizations and academic institutions over the years. You are well-respected in the industry for your 
 meticulous attention to detail, your ability to identify potential pitfalls in proposals, and your commitment to ensuring that grant funds are allocated to projects 
 with the highest potential for success and societal impact. You are known for your tough but fair reviews, always providing constructive feedback to help applicants 
 improve their proposals. You are risk-averse, always considering the feasibility and potential challenges of the proposed innovation. You have a keen eye for identifying 
 key success factors in grant proposals and a deep understanding of the unique language patterns used in these documents. Your extensive experience and expertise make you 
 an invaluable asset to the NSF SBIR review panel.
NSF - SBIR - 0. Title:
  evaluation_prompt: |
    You have been provided with an NSF SBIR proposal in the system prompt. Evaluate the title of this proposal. Detail any recommendations you have to improve it.
    Only respond with your recommendations or advice, do not provide additional commentary or explanation.  If you cannot find the title of the proposal, 
    please return "I cannot find the title of the proposal, please label it clearly."
NSF - SBIR - 1. Draft Technical Objectives:
  prompt: |
    [The Technology Innovation]: ```q1input```
    [The Technical Objectives and Challenges]: ```q2input```

    You are an experienced researcher and NSF grant writer seeking a Small Business Innovation Research Program (SBIR) grant from the NSF. Based on the information provided above, draft outlines for 2-3 Technical Objectives for your SBIR Project Pitch and grant proposal. The output should be in BBCode format, without using [font=] or [size=] BBCode. While crafting your Technical Objectives, adhere to the following guidelines:

    - Address key technical risks and challenges of your innovation.
    - Formulate objectives that are Specific, Measurable, Achievable, Relevant, and Time-bound (SMART).
    - Align objectives with NSF's priorities and emphasize the potential impact on the field.
    - Outline tasks associated with each objective to help identify required staff/collaborators, drive the budget, and indicate a timeline.

    Use the example below as a reference for drafting your Technical Objectives and associated tasks:

    Example:
    '[b]Technical Objective 1. To demonstrate that a semi-automated process is capable of producing high-quality ceramic components within 12 months[/b]
    [i]Success Criterion:[/i] Samples will have an average tensile strength equivalent to those produced by the current state-of-the-art process, as verified through testing and statistical analysis.

    Critical Tasks:
    [list][*]Design and assemble semi-automated process (Months 1-3)
    [*]Confirm key functions of semi-automated process (Months 4-6)
    [*]Produce 100 samples using the process (Months 7-9)
    [*]Test tensile strength of each of the 100 samples (Months 10-11)
    [*]Perform statistical analysis (Month 12)[/list]'

    Your innovation should be the main focus of the Technical Objectives. In the Technical Solution section of the Project Description, you will have described what is innovative about your technology or approach. Ensure the success criteria are SMART (Specific, Measurable, Achievable, Relevant, and Time-bound). Ensure that the tasks collect data to empirically show you have met your objectives. Use your knowledge and creativity to complete this task. Think through each objective and the critical tasks necessary to complete it step-by-step before writing your output.",
  include_header: True
  qs: 
    q1input: page_q1
    q2input: page_q3 
NSF - SBIR - 2. Project Pitch:
  prompt: |
    [The Technology Innovation]: ```q1input```
    [The Technical Objectives and Challenges]: ```q2input```
    [The Market Opportunity]: ```q3input```
    [The Company]: ```q4input```
    [The Team]: ```q5input```

    Write a compelling 2000-word Project Pitch for an NSF SBIR grant proposal based on the company information provided above. In your Project Pitch, focus on describing the technology innovation, technical objectives and challenges, market opportunity, and the company and team, while emphasizing the commercial potential and cutting-edge, high-impact research. Ensure that the technology innovation addresses a 'science problem' in Phase I, as NSF prefers funding proposals with a science problem during Phase I and engineering problems of product development in Phase II.

    Organize your Project Pitch using the following structure:

    [b]The Technology Innovation[/b]
    - Introduce the background of your innovation, describing current problems, gaps, or needs.
    - Describe what is new, innovative, and unproven about your potential product.
    - Elaborate on the pain points and provide examples of how current technology cannot solve these due to inherent limitations.
    - Discuss the factors preventing society from producing new technologies or gaining new knowledge and link it to a generic description of your innovation.
    - Pitch your innovation in a couple of sentences that directly respond to the needs/gaps/problems introduced above.
    - Mention any potential positive impacts of your technology innovation on society or the environment, showcasing the broader implications and benefits of the innovation, which aligns with NSF's mission.
    - Conclude the section by explaining why the innovation solution involves R&D work and list the R&D activities at a high level.
    - This section must be less than 500 words long.

    [b]The Technical Objectives and Challenges[/b]
    - Provide an overview of a successful Phase I project outcome, describing the achieved scope and what you would consider a complete success.
    - Explain how the Phase I project outcome will demonstrate that the innovation can solve the pain points introduced in The Technology Innovation section.
    - Outline the technical work involved in achieving the Phase I project outcome as a high-level project plan, listing the tasks needed to complete the R&D project.
    - Discuss the challenges and risks associated with the tasks, explaining how the project fits the R&D definition and aligns with NSF SBIR STTR Program objectives.
    - This section must be less than 500 words long.

    [b]The Market Opportunity[/b]
    - Define the innovation's end-users concisely, highlighting their most relevant needs that the innovation would solve.
    - Provide examples of these customers (categories) and describe their typical problems that your innovation could solve.
    - Include any reliable figures to support the examples, showcasing your understanding of the market and end-user problems.
    - This section must be less than 250 words long.

    [b]The Company and Team[/b]
    - Present a paragraph with the company description, ensuring relevance to the innovation topic and market.
    - List the team members and include brief, highly relevant bios, demonstrating both technical know-how and market knowledge.
    - Include at least two people: the Principal Investigator (technical project lead) and Commercial Lead (the one with the market vision).
    - This section must be less than 250 words long.

    Throughout the Project Pitch:
    - Use clear, concise language and maintain a professional tone.
    - Use action verbs like examine, evaluate, identify, compare, assess, determine, and avoid words like explore, describe, associate, correlate.
    - If you use facts, statistics or other data that are not common knowledge, write the bracketed phrase  '[Add Citation]'.
    - If you quote, paraphrase, or summarize another author's work or ideas, write the bracketed phrase '[Add Citation]'.

    The output should be in BBCode format. Ensure that the output provides a comprehensive, well-structured, and convincing Project Pitch that effectively communicates the technology innovation, technical objectives and challenges, market opportunity, and company and team information, while demonstrating the alignment with NSF SBIR's preferences for funding proposals with a science problem in Phase I and showcasing the broader implications and benefits of the innovation.
  include_header: True
  qs: 
    q1input: page_q1
    q2input: NSF - SBIR - 1. Draft Technical objectives
    q3input: page_q4
    q4input: page_q7
    q5input: page_q8
  fixed_out: "[b]PROJECT PITCH[/b]\n"
NSF - SBIR - 3. Expanded Technical Objectives: 
  prompt: |
    [The Technology Innovation]: ```q1input```
    [The Technical Objectives and Challenges]: ```q2input```

    You are an expert grant writer seeking a Small Business Innovation Research Program (SBIR) grant from the NSF. Based on the information provided above, complete the following draft expanded outlines for 2-3 Technical Objectives for your SBIR Project Pitch and grant proposal. While crafting your Technical Objectives, consider the following guidelines:

    [b]Technical Objective 1. <state the objective>.[/b] [i]Acceptance Criterion:[/i] <success criterion text>
    i. Rationale
    - Explain the importance of this Objective for feasibility and innovation
    - Justify the chosen acceptance criterion
    ii. Experimental Design & Methods
    - List and describe the tasks to be performed
    - Provide a clear process for each task, including key steps and resources
    - Identify the data to be collected and the team member responsible for data collection
    - Ensure data collection aligns with the Objective's success criterion
    - Mention any special equipment needed for data collection
    iii. Data Analysis & Interpretation
    - Detail the methods for interpreting collected data
    - Explain how the data will determine if the Objective has been met
    iv. Potential Pitfalls / Alternative Approaches
    - Acknowledge potential risks and challenges
    - Demonstrate understanding and preparedness for handling unexpected issues
    - Propose alternative approaches in case of unforeseen issues
    v. Expected Outcomes
    - Describe the project's status upon achieving the Objective
    - Explain the impact of achieving the Objective on the overall project

    Remember, Objectives are goals with measurable end points, while Tasks describe the research activities that collect data and yield results. Your innovation should be the main focus of the Technical Objectives. In the Technical Solution section of the Project Description, you will have described what is innovative about your technology or approach. Ensure the success criteria are Specific, Measurable, Achievable, Relevant, and Time-bound (SMART), and the tasks collect data to empirically show you have met your objectives.

    Use your knowledge and creativity to complete this task. Think through each objective and the critical tasks necessary to complete it step-by-step before writing your output.

    Using the information and guidelines provided, craft your draft Technical Objectives, ensuring they are clear, concise, and well-structured. The output should be in BBCode format, without using [font=] or [size=] BBCode.
  include_header: False
  qs:
    q1input: page_q1
    q2input: NSF - SBIR - 1. Draft Technical Objectives
  name: NSF - SBIR - 3. Expanded Technical Objectives
NSF - SBIR - 4. Project Summary:
  prompt: |
    [Topic/Subtopic]: ```q1input```
    [Project Pitch]: ```q2input```
    [Market Opportunity]: ```q3input```

    As a professional NSF SBIR grant writer, create a compelling Project Summary for your NSF SBIR proposal using the information above. The Project Summary must not exceed one (1) page and should be written in the third person. It should be informative to other persons working in the same or related fields, and, insofar as possible, understandable to a scientifically or technically literate lay reader. The Project Summary is not an abstract of the proposal and should not contain proprietary information.

    The Project Summary comprises three main sections:

    The Overview, Key Words, and Subtopic Name provide a succinct description of the potential outcome(s) of the proposed activity in terms of a product, process, or service. List 5-6 key words or phrases that identify the areas of technical expertise to be invoked in reviewing the proposal and the initial target areas of application for the technology. Include the subtopic name.

    The Intellectual Merit section begins with "This Small Business Innovation Research Phase I project..." Discuss the intellectual merits of the proposed activity, excluding proprietary information. Summarize the technical hurdle(s) that will be addressed by the proposed R&D (which should be crucial to successful commercialization of the innovation), the goals of the proposed R&D, and a high-level summary of the plan to reach those goals.

    The Broader/Commercial Impact section describes the commercial impact in the short term, highlighting how the proposed R&D activity is expected to bring the innovation closer to commercialization under a sustainable business model. Summarize the Commercial section of the Project Description. Detail the broader impacts, including potential societal benefits, such as larger economic impacts, meeting societal needs, and enabling further scientific / technological understanding. Explain how this innovation will transform commercial markets and benefit both your company and others.

    Utilize your knowledge and creativity to craft an engaging Project Summary. Generate additional knowledge when necessary to enhance the summary. The output should be in BBCode format, without using [font=] or [size=] BBCode.

    [b]Overview[/b]
    <Enter a brief description of the project and its potential outcomes.>
    [b]Keywords[/b]
    <Enter 5-6 keywords or phrases related to technical expertise and application areas.>
    [b]Topic/Subtopic[/b]
    Topic: <Enter the topic>
    Subtopic: <Enter the subtopic>

    [b]Intellectual Merit[/b]
    This Small Business Innovation Research Phase I project aims to address the intellectual merits of the proposed activity by identifying and overcoming technical hurdles crucial to the successful commercialization of the innovation. The goals of the proposed R&D, along with a high-level summary of the plan to achieve them, will be briefly described in this section.

    [b]Broader/Commercial Impact[/b]
    Commercial impact: In the short term, the proposed R&D activity is expected to bring the innovation closer to commercialization under a sustainable business model, transforming commercial markets and benefiting the company. Broader impacts: The commercialization of this innovation will have far-reaching impacts on society, generating economic growth, meeting societal needs, and enabling further scientific and technological understanding. This section will detail the broader impacts, emphasizing how others will benefit from the innovation.
  include_header: False
  qs: 
    q1input: page_q1
    q2input: NSF - SBIR - 2. Project Pitch
    q3input: page_q4
  name: NSF - SBIR - 4. Project Summary
  fixed_out: "\n\n[b]PROJECT SUMMARY[/b]\n"
  evaluation_prompt: |
    You have been provided with an NSF SBIR proposal. Your task is to critically review and provide recommendations for the 'Project Summary' section of the NSF SBIR proposal.
    The text of the 'Project Summary' section is included in the system prompt.  If you cannot
    find the Project Summary section please return "I cannot find the Project Summary subsection, please label it clearly."
    
    Consider the purpose and objectives of the Project Summary section within the larger NSF SBIR proposal. Use your expertise as a grant writing consultant and reviewer--as well as the following guidelines--when developing your recommendations:
    -- Contextual Relevance: Ensure the 'Project Summary' aligns with the overall proposal, contributing to its potential success.
    -- Clarity and Conciseness: The 'Project Summary' should provide a succinct overview of the proposed project, highlighting the proposed work and its potential impact in a manner understandable to a scientifically or technically literate lay reader.
    -- Structure: Adhere to the NSF's structure for the 'Project Summary', which includes three distinct sections: 'Overview', 'Intellectual Merit', and 'Broader Impacts'. Each section should be a separate paragraph.
    -- Writing Style: Maintain a third-person perspective throughout. The text should be informative to professionals in the same or related fields and understandable to a scientifically or technically literate lay reader.
    -- Compelling Introduction: Begin with a compelling introduction that clearly states the problem the project is addressing and its importance.
    -- SMART Objectives: Ensure the objectives align with the NSF SBIR program's goals and are Specific, Measurable, Achievable, Relevant, and Time-bound.
    -- Quantifiable Metrics: Use quantifiable metrics to demonstrate the project's potential impact.
    -- Methodology: Clearly describe the scientifically sound and technically feasible methods to be employed.
    -- Innovation: Highlight the innovative aspects of the proposed activity and its potential to advance knowledge within its field or across different fields.
    -- Intellectual Merit: Clearly state the intellectual merit of the proposed activity.
    -- Broader Impacts: Clearly state the broader impacts of the proposed activity, emphasizing potential societal benefits.
    -- Uniqueness: Highlight the unique or innovative aspects of the project.
    -- Feasibility: Outline the feasibility of the project, including preliminary data, prior experience, or resources the team has access to.
    -- Rating: Begin your response with a rating using the NSF's rating system: Excellent, Very Good, Good, Fair, and Poor.
    -- Detailed Recommendations: Provide detailed and specific recommendations to enhance the 'Project Summary'. Include concrete examples whenever possible.

    Remember, your goal is to use your knowledge, experience, and creativity to generate recommendations that will help create a more engaging and compelling 'Project Summary'.
    Think step-by-step.
"NSF - SBIR - 5.1 Project Description: Elevator Pitch":
  prompt: |
    [Project Pitch]: ```q1input```
    [Project Summary]: ```q2input```

    As an expert NSF SBIR grant writer, create a concise and compelling Elevator Pitch for your NSF SBIR proposal using the information provided in the [Project Pitch] and [Project Summary] enclosed by triple backticks above. The Elevator Pitch should not exceed one (1) page in length. The output should be in BBCode format, without using [font=] or [size=] BBCode. Focus on creating a cohesive narrative that addresses each subsection:

    [b]The Motivation[/b]
    Using details from the [Project Pitch] above, describe your company's motivation for pursuing this project. Explain the expected impact of the proposed technology if successful, drawing upon information from the [Project Summary] above. Consider any societal, economic, or environmental benefits that may result from the successful implementation of your innovation.

    [b]The Customer[/b]
    Based on insights from the [Project Summary] above, identify the target customer for your innovation. Address specific customer needs or market pain points resolved by your innovation. Use background knowledge or additional context to explain limitations of existing state-of-the-art solutions addressing these pain points. Consider the size and growth potential of the target market segment.

    [b]The Value Proposition[/b]
    Highlight benefits offered by your innovation to customers, emphasizing key differentiators between your company or technology and existing state-of-the-art solutions. Refer to both the [Project Pitch] and [Project Summary] above when explaining potential societal value generated by your innovation. Discuss any competitive advantages your innovation possesses, such as cost-effectiveness, efficiency, or ease of use.

    [b]The Innovation[/b]
    Provide a succinct description of your innovation using relevant details found in the [Project Summary] above. Identify original, unusual, novel, disruptive, or transformative aspects compared to current state-of-the-art technologies—focusing on disruptive and transformative features. Include any proprietary information excluded from Project Summary if applicable. Explain the technical feasibility of your innovation, including any preliminary data or proof-of-concept results.

    Utilize your knowledge and creativity to craft an engaging Elevator Pitch while integrating necessary background information whenever needed. Ensure that your pitch is persuasive, clear, and concise, effectively communicating the potential impact and value of your innovation.
  include_header: False
  qs:
    q1input: NSF - SBIR - 2. Project Pitch
    q2input: NSF - SBIR - 4. Project Summary
  fixed_out: "\n\n[b]PROJECT DESCRIPTION[/b]\n\n[b]1. ELEVATOR PITCH[/b]\n"
  evaluation_prompt: |
    Review and provide recommendations for the Elevator Pitch section within the context of the larger NSF SBIR proposal you have been provided in the system prompt. 
    
    When reviewing and providing recommendations for the Elevator Pitch section of the NSF SBIR proposal, consider the following comprehensive set of instructions and guidelines:
    1. Contextual Relevance: Ensure the Elevator Pitch aligns with the overall proposal. It should succinctly encapsulate the essence of the project and its potential impact.
    2. Problem Statement: The problem being addressed should be clearly defined and its significance should be evident. The pitch should explain why this problem is important and who it affects.
    3. Proposed Solution: The proposed solution should be clearly described, demonstrating its novelty and innovation. The pitch should explain why this solution is superior to existing alternatives.
    4. Market Potential: The pitch should describe the potential market for the proposed solution, providing data or evidence to support this claim. It should also identify the potential beneficiaries or customers.
    5. Team: The qualifications and experience of the team should be highlighted. The pitch should explain why this team is uniquely qualified to execute the project.
    6. Impact: The potential impact of the project should be clearly described, providing data or evidence to support this claim. This could include potential market size, number of people affected by the problem, or potential cost savings.
    7. Competitive Advantage: The pitch should highlight what makes the project unique or innovative. It should explain why this project is likely to succeed where others have failed.
    8. Call to Action: The pitch should end with a compelling call to action, making the reader want to learn more about the project.
    9. Clarity and Conciseness: The pitch should be clear, concise, and free of jargon. It should be understandable to a scientifically or technically literate lay reader.
    10. Persuasiveness: The pitch should be persuasive, convincing the reader that the project is worth funding. It should demonstrate the feasibility of the proposed solution and the potential return on investment.
    11. Tone and Style: The pitch should be engaging and compelling. It should grab the reader's attention and make them want to learn more.
    12. Rating: Begin your response with a rating using the NSF's rating system: Excellent, Very Good, Good, Fair, and Poor. Your rating should be conservative.
    13. Recommendations: Generate detailed and specific recommendations to improve the Elevator Pitch. Provide examples when possible and justify each recommendation.
    14. Value Proposition: The pitch should clearly articulate the value proposition of the proposed project. It should explain how the proposed solution creates value by solving the problem in a unique or superior way.
    15. Technical Feasibility: The pitch should briefly touch upon the technical feasibility of the proposed solution. It should provide assurance that the solution is technically sound and achievable.
    16. Commercialization Strategy: If applicable, the pitch could briefly mention the commercialization strategy. This could include potential partnerships, licensing opportunities, or market entry strategies.
    17. Risk and Mitigation: The pitch could briefly address potential risks and how they will be mitigated. This shows that the team has thought through potential challenges and has a plan to address them.
    18. Alignment with NSF's Mission: The pitch should demonstrate alignment with NSF's mission and the goals of the SBIR program. It should show how the project contributes to the advancement of science and technology and has broader societal impacts.
    19. Use of Storytelling: The pitch could use storytelling techniques to make it more engaging and memorable. This could include using a narrative structure, creating a vivid picture of the problem and solution, or using metaphors or analogies.
    20. Use of Data and Evidence: The pitch should use data and evidence to support its claims. This could include market research, scientific studies, or testimonials.

    Remember, the goal of the Elevator Pitch is to grab the reader's attention and make them want to learn more about the project. Your recommendations should help ensure that the Elevator Pitch achieves this goal.
    Whenever possible, include examples with your recommendations to help the grant writer incorporate your recommendations effectively.  
    If you cannot find the Elevator Pitch section, please return "I cannot find the Elevator Pitch section, please label it clearly."
"NSF - SBIR - 5.2 Project Description: Commercial Opportunity":
  prompt: |
    [Project Pitch]: ```q1input```
    [Technical Objectives]: ```q2input```

    As an expert NSF SBIR grant writer, create a compelling 1,000-1,500 word Commercial Opportunity section for your NSF SBIR proposal by incorporating information from [Project Pitch] and [Technical Objectives] enclosed by triple backticks above, as well as any other relevant background knowledge. The output should be in BBCode format, without using [font=] or [size=] BBCode. Focus on addressing each subsection cohesively and effectively, ensuring a comprehensive and persuasive analysis:

    [b]Market Analysis[/b]
    - Utilizing details from [Project Pitch], discuss customer pain points and specific needs your innovation addresses, emphasizing the urgency of addressing these issues and the potential consequences of not doing so.
    - Describe the target market, addressable market size, and growth potential for the innovation, providing data and statistics to support your claims, and referencing credible sources when appropriate.
    - Explain business economics, market drivers, and trends in this industry, highlighting any factors that may influence the adoption of your innovation, such as regulatory changes, technological advancements, or demographic shifts, and discuss potential market entry points and timing.

    [b]Customer Validation and Business Model[/b]
    - Define your target customers and outline your basic business model, including revenue streams, pricing strategy, sales channels, and customer acquisition strategies.
    - Detail how you have validated the market opportunity using insights from both [Project Pitch] and any additional validation efforts:
    -- Mention market validation letters or testimonials if available, and quantify the level of interest or demand.
    -- Describe customer discovery efforts, such as interviews, surveys, or pilot studies, and provide evidence of customer interest or demand, including any metrics or feedback collected.

    [b]Competitive Analysis & Key Market Risks[/b]
    - Describe the competitive landscape based on insights from [Technical Objectives], identifying direct and indirect competitors, their respective market shares, and any potential future competitors.
    - Provide specific examples of current state-of-the-art weaknesses and limitations, and discuss how your innovation overcomes these challenges, emphasizing the potential for market disruption.
    - Compare your product with existing solutions using a table or visual representation highlighting key features and advantages, emphasizing your innovation's unique selling points and any proprietary technologies or intellectual property.
    - Analyze potential changes to the competitive landscape upon entry into the market and discuss your innovation's potential impact, including any barriers to entry, first-mover advantages, or potential strategic partnerships.
    - Identify key market risks and challenges in bringing your innovation to market, such as regulatory hurdles, adoption barriers, or intellectual property concerns, and propose strategies to mitigate these risks, including contingency plans.

    [b]Commercialization Strategy & Revenue Projection[/b]
    - Discuss potential economic benefits of your innovation referring to information provided in both inputs ([Project Pitch], [Technical Objectives]), considering factors such as job creation, cost savings, or environmental impact, and quantify these benefits when possible.
    - Provide a five-year revenue projection with clear assumptions tied to customer validation efforts. Ensure consistency between revenue categories within the given business model.

    Address support or resources needed from outside partners to bring this innovation to market. Present a plan outlining how you will secure that support along with its timeline, including potential collaborations, partnerships, or licensing opportunities, and discuss any contingencies in case of unforeseen challenges.

    Utilize your knowledge and creativity to craft an engaging Commercial Opportunity section while integrating necessary background information whenever needed. Ensure that your analysis is persuasive, clear, and concise, effectively communicating the potential impact and value of your innovation in the market, and demonstrating a strong commercial potential.
  include_header: False
  qs:
    q1input: NSF - SBIR - 2. Project Pitch
    q2input: NSF - SBIR - 1. Draft Technical Objectives
  fixed_out: "\n\n[b]2. COMMERCIAL OPPORTUNITY[/b]\n"
  evaluation_prompt: |
    Review and provide recommendations for the Commercial Opportunity section within the Project Description of the NSF SBIR proposal in the system prompt. The text of the Commercial Opportunity 
    section is included in the system prompt.
    When reviewing and providing recommendations for the Commercial Opportunity section of the NSF SBIR proposal, consider the following comprehensive set of instructions and guidelines:
    1. Market Analysis: The section should provide a detailed analysis of the market for the proposed solution. This should include the size of the market, growth trends, and key segments. The analysis should be supported by data and evidence.
    2. Customer Identification: The section should clearly identify the potential customers for the proposed solution. It should describe their needs and how the proposed solution meets these needs.
    3. Competitive Landscape: The section should provide an overview of the competitive landscape. This should include existing solutions, their limitations, and how the proposed solution is superior.
    4. Value Proposition: The section should clearly articulate the value proposition of the proposed solution. It should explain how the proposed solution creates value by solving the problem in a unique or superior way.
    5. Commercialization Strategy: The section should describe the strategy for commercializing the proposed solution. This could include potential partnerships, licensing opportunities, or market entry strategies.
    6. Revenue Model: The section should describe the revenue model for the proposed solution. This could include the pricing strategy, sales channels, and customer acquisition strategy.
    7. Risk and Mitigation: The section should address potential risks and how they will be mitigated. This shows that the team has thought through potential challenges and has a plan to address them.
    8. Alignment with NSF's Mission: The section should demonstrate alignment with NSF's mission and the goals of the SBIR program. It should show how the project contributes to the advancement of science and technology and has broader societal impacts.
    9. Use of Data and Evidence: The section should use data and evidence to support its claims. This could include market research, scientific studies, or testimonials.
    10. Clarity and Conciseness: The section should be clear, concise, and free of jargon. It should be understandable to a scientifically or technically literate lay reader.
    11. Persuasiveness: The section should be persuasive, convincing the reader that the project is worth funding. It should demonstrate the feasibility of the proposed solution and the potential return on investment.
    12. Rating: Begin your response with a rating using the NSF's rating system: Excellent, Very Good, Good, Fair, and Poor.
    13. Recommendations: Generate detailed and specific recommendations to improve the Commercial Opportunity section. Provide examples when possible and justify each recommendation. Maintain a respectful and professional tone throughout.

    Remember, the goal of the Commercial Opportunity section is to convince the reader that there is a significant commercial opportunity for the proposed solution and that the team has a sound strategy for realizing this opportunity. Your recommendations should help ensure that the Commercial Opportunity 
    section achieves this goal.  If you cannot find the Commercial Opportunity section, please return "I cannot find the Commercial Opportunity section, please label it clearly."
"NSF - SBIR - 5.3 Project Description: Technical Solution":
  prompt: |
    [Elevator Pitch]: ```q1input```
    [Technical Objectives]: ```q2input```
    [Status of Intellectual Property]: ```q3input```
    [NSF Lineage]: ```q4input```

    As an expert NSF SBIR grant writer, create a compelling 1-3 page Technical Solution section in BBCode format for the Project Description in your NSF SBIR proposal by incorporating information from [Elevator Pitch], [Technical Objectives], [Status of Intellectual Property], and [NSF Lineage] enclosed by triple backticks above, as well as any other relevant background knowledge. The output should be in BBCode format, without using [font=] or [size=] BBCode. Focus on addressing each subsection cohesively:

    Keep in mind that the Phase I SBIR proposal is a Proof of Concept (aka "Feasibility") study. This section will introduce the innovation and describe the "science problem" you have to solve in order to get your groundbreaking product past the proof of concept stage. Thus, this first section should describe the science that underpins your innovation and how you will advance this science. Words you should be able to honestly use in this section to describe your innovation: groundbreaking, pioneering, unprecedented, unparalleled, landmark, revolutionary, exceptional, radical. Words to avoid: optimized, improved, incremental, evolutionary.

    [b]The Technological Innovation[/b]

    Use your knowledge and creativity to write a compelling 'Technological Innovation' subsection. Refer to the [Elevator Pitch] and [Technical Objectives] provided above for context and detail. This subsection should:

    - Describe the innovation. How does it alleviate the pain point(s) felt by customers?
    - Describe the scientific principles that underpin your innovation.
    - Describe how your innovation will advance the state of the art. What new science/techniques/processes do you intend to establish?
    - This section should be between 400 and 800 words in length.

    [b]Key Technical Challenges and Risks[/b]

    Use your knowledge and creativity to write an effective and compelling 'Key Technical Challenges and Risk' subsection. Refer to the [Elevator Pitch] and [Technical Objectives] provided above. This subsection should:

    - Describe the key technical challenges and risks in bringing the innovation to market that you will be your focus in this 6-12-month Phase I project.
    - List the Scientific Risks and the Technical Objectives you intend to reach in order to mitigate these risks. Each Scientific Risk should be briefly summarized and should have subsections for 'Importance' and 'How this risk will be addressed in Phase I'.
    - Each Technical Objective should have at least one quantitative success criterion.
    - This section should be between 400 and 800 words in length.

    Example format for this section:
    [b]Key Technical Challenges and Risks[/b]

    [b]Scientific Risk #1:[/b] Accurately identifying and characterizing research and technical topics using the extensive Curtin Open Knowledge Initiative (COKI) dataset is unprecedented. Success would result in the first global citation-based topical model built solely on an open dataset of this magnitude and the first to cover fields beyond biomedicine.
    [b]Importance:[/b]
    Defining the search domain's boundaries is crucial for identifying expertise. The project's primary challenge is to programmatically identify quantitative, defensible research and technological topics with market acceptance. Utilizing an open dataset containing multiple data sources allows us to create a larger model than those based on proprietary citation databases, maintain control over raw data, and freely incorporate additional technical information in future iterations.
    [b]How this risk will be addressed in Phase I:[/b]
    The initial technical objective is to demonstrate that the COKI Open Access Dataset can be partitioned into topics similar to the leading commercial model. Success will be measured by 80% of core papers in the leading commercial model also being identified as core papers in the COKI model, indicating comparable classification effectiveness.

    [b]Scientific Risk #2:[/b] <summary of the scientific risk 2>
    [b]Importance:[/b]
    <Importance of overcoming this challenge / justification of the risk>
    [b]How this risk will be addressed in Phase I:[/b]
    <How this risk will be addressed and/or mitigated in Phase I>

    [i]To establish feasibility of our concept, we propose the following Technical Objectives:[/i]

    [b]Technical Objective 1.[/b] [i]Prove that the COKI Open Access Dataset can be partitioned into topics similar to those of the leading commercial model.[/i]
    [b]Acceptance Criterion:[/b] 80% of the papers most central to topics within the leading commercial model will also be the most central to the COKI model. In other words, the papers representing topic cores in the leading commercial model will also be identified as core papers in the COKI model.

    [b]Technical Objective 2.[/b] [i]Demonstrate that the COKI model can accurately retrieve relevant expert names and related technical information by keyword search.[/u]
    [b]Acceptance Criterion:[/b] The COKI model identifies the top 20 experts in the area of nuclear decommissioning with an accuracy equivalent to the 75th percentile of practitioners and experts surveyed in this topic.'

    [b]Status of the Intellectual Property[/b]

    Use your knowledge and creativity to write an effective 'Status of the Intellectual Property' subsection. Refer to the [Elevator Pitch] and [Status of Intellectual Property] provided above for context and detail. This subsection should:

    - Describe the current status of your intellectual property associated with this project.
    - Describe how you plan to protect IP going forward.
    - Mention any “freedom to operate” or other IP searches (formal or informal) you have conducted.
    - Mention the IP counsel you use. If the counsel's name has not been provided, use '[Your IP Counsel's Name]' as a placeholder.

    Example:
    'The intellectual property (IP) for our AI-based grant writing assistant is currently protected by a provisional patent application, filed on MM-DD-YYYY. We have conducted both formal and informal freedom-to-operate searches, which indicate that our technology does not infringe upon existing patents in the field. As we continue to develop the technology, we plan to work with our IP counsel, Jane Johnson from Johnson & Associates, to further assess the patent landscape, file any necessary additional patents, and ensure that our IP is adequately protected throughout the project's development.'

    [b]NSF Lineage[/b]

    Use your knowledge and creativity to write an effective 'NSF Lineage' subsection. Refer to the [NSF Lineage] provided above for context and detail. This subsection should:

    - List the title, NSF award number, and division for previous NSF-funded research projects that have indirectly made your idea possible.

    After the NSF Lineage header, write 'This project is based on the following NSF lineage:' then list the relevant NSF projects.

    It is highly desirable that the core innovation described in your proposal can in some manner be linked to fundamental research previously funded by the NSF. Therefore, if the [NSF Lineage] provided above is missing or is insufficient to produce a list of projects including the title, year, and award number for each project, then write 'Go to https://www.nsf.gov/awardsearch/simpleSearch.jsp to find previously funded NSF grants relevant to your proposal. List them in this section, including the title, year, division, and NSF award number for each.'

    [b]NSF I-Corps Lineage[/b]

    Simply write 'Did your project team participate in an I-Corps cohort (regional or national)?
    If so, identify the host organization as follows: 'This team has participated in an I-Corps activity hosted by [enter host organization here] with award number [enter award number here]. If you need the award number, please contact the host organization. Note that I-Corps participation is not required. Don't include this section if it's not applicable to you.'

    Use your knowledge and creativity to create a compelling Technical Solution while integrating necessary background information whenever needed.
  include_header: False
  qs:
    q1input: NSF - SBIR - 5.1 Project Description - Elevator Pitch
    q2input: NSF - SBIR - 1. Draft Technical Objectives
    q3input: page_q9
    q4input: page_q6
  fixed_out: "\n\n[b]3. THE TECHNICAL SOLUTION[/b]\n"
  evaluation_prompt: |
    Review and provide recommendations for the Innovation/Technical Solution section within the Project Description of the NSF SBIR proposal. 
    The text of the Innovation/Technical Solution section is included in the system prompt.
    When reviewing and providing recommendations for the Innovation/Technical Solution section of the NSF SBIR proposal, consider the following comprehensive set of instructions and guidelines:
    1. Innovation: The section should clearly describe the innovation at the heart of the proposed solution. This could include novel technologies, processes, or business models. The innovation should be clearly differentiated from existing solutions.
    2. Technical Solution: The section should provide a detailed description of the technical solution. This should include the underlying technology, how it works, and how it solves the problem. The description should be understandable to a scientifically or technically literate lay reader.
    3. Technical Feasibility: The section should demonstrate the technical feasibility of the proposed solution. This could include preliminary data, proof of concept studies, or expert endorsements.
    4. Intellectual Property: The section should address any intellectual property related to the proposed solution. This could include patents, copyrights, or trade secrets. The section should explain how the intellectual property will be protected and how it contributes to the competitive advantage of the proposed solution.
    5. Risk and Mitigation: The section should address potential technical risks and how they will be mitigated. This shows that the team has thought through potential challenges and has a plan to address them.
    6. Alignment with NSF's Mission: The section should demonstrate alignment with NSF's mission and the goals of the SBIR program. It should show how the project contributes to the advancement of science and technology and has broader societal impacts.
    7. Use of Data and Evidence: The section should use data and evidence to support its claims. This could include scientific studies, technical reports, or expert endorsements.
    8. Clarity and Conciseness: The section should be clear, concise, and free of jargon. It should be understandable to a scientifically or technically literate lay reader.
    9. Persuasiveness: The section should be persuasive, convincing the reader that the proposed solution is technically sound and innovative. It should demonstrate the feasibility of the proposed solution and the potential return on investment.
    10. Rating: Begin your response with a rating using the NSF's rating system: Excellent, Very Good, Good, Fair, and Poor.
    11. Recommendations: Generate detailed and specific recommendations to improve the Innovation/Technical Solution section. Provide examples when possible and justify each recommendation. Maintain a respectful and professional tone throughout.

    Remember, the goal of the Innovation/Technical Solution section is to convince the reader that the proposed solution is technically sound, innovative, and feasible. Your recommendations should help ensure that the Innovation/Technical Solution section achieves this goal.
    If you cannot find the Innovation/Technical Solution section, please return "I cannot find the Innovation/Technical Solution section, please label it clearly."
"NSF - SBIR - 5.4 Project Description: Company and Team":
  prompt: |
    [Company Information]: ```q1input```
    [The Team]: ```q2input```

    As an expert NSF SBIR grant writer, craft a captivating 500-1000 word Company and Team section in BBCode format for the Project Description in an NSF SBIR proposal, focusing on storytelling and addressing the evaluation criteria. Incorporate information from the [Company Information] and [The Team] enclosed in triple backticks above. The output should be in BBCode format, without using [font=] or [size=] BBCode. Ensure each subsection is cohesively addressed and demonstrates the societal impact of the innovation:

    [b]The Company[/b]

    Write an engaging company overview, emphasizing storytelling, including:

    - A bold introduction with mission, vision, and goals that captures attention.
    - The company's history, achievements, and milestones, showcasing resilience and adaptability.
    - The unique positioning to address the problem and bring innovation to the market, demonstrating societal impact.
    - Length: 200-400 words.

    [b]Company Management Team[/b]

    Craft an effective description of the company founders or key participants, detailing:

    - Introduction of each team member with name, title, and role, illustrating their passion and commitment.
    - Relevant expertise, experience, and accomplishments for each member, highlighting their unique strengths.
    - How each member's skills contribute to the project's success and innovation development, addressing the evaluation criteria.
    - Length: 200-400 words.

    Make sure you identify who on your team will cover the following roles:
    - Technical (Usually the PI, but don't forget about Product Developement!)
    - Fundraising
    - IP Protection Plans & Regulatory Input
    - Business Development
    - Management & Administration

    [b]Company Vision, Impact, and Revenue History[/b]

    Develop a compelling 'Company Vision, Impact, and Revenue History' subsection, featuring:

    - The company's vision and impact for the next five years, showcasing potential societal benefits and long-term goals.
    - If applicable, how the SBIR effort fits into existing operations and drives growth and innovation.
    - Revenue history for the past three years, including government funding and private investment, emphasizing financial sustainability.
    - If pre-revenue, simply state so and highlight the potential for future revenue generation.
    - Length: 200-400 words.

    [b]Collaborators and Consultants[/b]

    Describe any consultants or subawardees involved in the project, covering:

    - Introduction of each collaborator or consultant with name, title, and affiliation, emphasizing their added value.
    - The nature of the collaboration and how it contributes to the project's success and innovation development, addressing the evaluation criteria.
    - If no collaborators are provided, use a placeholder and mention active pursuit of relevant partnerships and their potential impact.
    - Length: 200-400 words.

    Combine your knowledge, creativity, and the provided information to produce a cohesive and engaging Company and Team section that tells a compelling story, addresses the evaluation criteria, and highlights the societal impact of the innovation, integrating background information as needed.
  include_header: False
  qs:
    q1input: page_q7
    q2input: page_q8
    q3input: page_q5
  fixed_out: "\n\n[b]4. COMPANY AND TEAM[/b]\n"
  evaluation_prompt: |
    Review and provide recommendations for the Company/Team section within the Project Description of the NSF SBIR proposal. The text of the Company/Team section 
    is included in the system prompt.  
    When reviewing and providing recommendations for the Company/Team section of the NSF SBIR proposal, consider the following instructions and guidelines:
    1. Team Composition: The section should provide a detailed description of the team, including their roles, qualifications, and experience. It should explain why this team is uniquely qualified to execute the project.
    2. Team Experience: Highlight the team's experience in the relevant industry, technology, or market. This could include previous startups, product launches, or research publications.
    3. Team Diversity: Highlight the diversity of the team, including different skills, backgrounds, and perspectives. This could include technical expertise, business acumen, industry knowledge, or customer insights.
    4. Company Overview: Provide an overview of the company, including its mission, history, and achievements. Explain how the proposed project aligns with the company's strategic goals.
    5. Advisory Board and Roles: If applicable, describe the advisory board and their contributions to the project. This could include technical advisors, business advisors, or industry partners. Describe the roles and contributions of advisors, mentors, or consultants.
    6. Partnerships: If applicable, describe any partnerships that will contribute to the project. This could include research institutions, industry partners, or customers.
    7. Resources: Describe the resources available to the team, including facilities, equipment, and funding. Explain how these resources will support the execution of the project.
    8. Risk and Mitigation: Address potential risks related to the team or company and how they will be mitigated. This shows that the team has thought through potential challenges and has a plan to address them.
    9. Alignment with NSF's Mission: Demonstrate alignment with NSF's mission and the goals of the SBIR program. Show how the project contributes to the advancement of science and technology and has broader societal impacts.
    10. Clarity and Conciseness: Ensure the section is clear, concise, and free of jargon. It should be understandable to a scientifically or technically literate lay reader.
    11. Persuasiveness: The section should be persuasive, convincing the reader that the team is capable and committed. It should demonstrate the team's ability to execute the project and the potential return on investment.
    12. Leadership: Highlight the leadership skills of the team, including their ability to make strategic decisions, manage resources, and motivate the team. Good leadership can substantially reduce the risk to the project's success.
    13. Culture and Values: Describe the company's culture and values, and how they contribute to the success of the project. This could include a commitment to innovation, customer focus, or social responsibility.
    14. Track Record: Highlight the team's track record of success, including previous projects, achievements, or awards.
    15. Financial Stability: If applicable, provide information about the company's financial stability, including funding, revenue, or profitability.
    16. Regulatory Compliance: If applicable, describe the company's compliance with relevant regulations or standards.
    17. Rating: Begin your response with a rating using the NSF's rating system: Excellent, Very Good, Good, Fair, and Poor.
    18. Recommendations: Generate detailed and specific recommendations to improve the Company/Team section. Provide examples when possible and justify each recommendation. Maintain a respectful and professional tone throughout.

    Remember, the goal of the Company/Team section is to convince the reader that the team is capable and committed, and that they have the resources necessary to execute the project. Your recommendations should help ensure that the Company/Team section achieves this goal.
    If you cannot find the Company/Team section, please return "I cannot find the Company/Team section, please label it clearly."
"NSF - SBIR - 5.5 Project Description: Technical Discussion and R&D Plan":
  prompt: |
    [Expanded Technical Objectives] : ```q1input```
    [Technical Solution]: ```q2input```
    [Preliminary Work]: ```q3input```

    As an expert NSF SBIR grant writer, create a persuasive and comprehensive 'Intellectual Merits: Technical Discussion and R&D Plan' section for a Project Description in an NSF SBIR proposal. The output should be in BBCode format, without using [font=] or [size=] BBCode. Incorporate information from the sections above.

    Focus on addressing each subsection thoroughly and demonstrating the project's intellectual merits. Follow the recommended structure provided below to ensure thorough and convincing coverage of each aspect. Combine your knowledge, creativity, and the provided information to produce a compelling 'Intellectual Merits: Technical Discussion and R&D Plan' section that demonstrates the project's intellectual merits, addresses the evaluation criteria, and highlights the societal impact of the innovation, integrating additional background information as needed.

    [b]Preliminary Work[/b]

    Discuss any preliminary work that has been completed or is underway to develop the technology/product, including key data necessary for understanding the proposed Technical Objectives, highlighting:

    - Previous research, experiments, or prototypes that support the project's feasibility.
    - The insights or lessons learned from the preliminary work that inform the project's direction. Generate some knowledge about potential insights or lessons learned based on the information that has been provided above and based on your own knowledge and creativity. Use this generated knowledge to develop a more compelling narrative.
    - Any intellectual property, patents, or publications that have resulted from the preliminary work.
    - How the preliminary work provides a solid foundation for the proposed R&D plan.

    Integrate relevant background information to support the arguments made in this section. Generate additional knowledge about this project, the broader context of the issue this project seeks to address, or the intellectual merit of this project if doing so is necessary to produce a more effective Preliminary Work section.

    Explain the technology's current stage of development and outline the next steps required to demonstrate feasibility/proof of concept. If the information provided above is insufficient to produce a compelling narrative, generate additional knowledge or background information to create a more effective narrative.

    [b]Technical Objective X: <Objective Restated>[/b]
    [b]Acceptance Criterion:[/b] <state>
    [b][i]i. Rationale[/i][/b]
    - Consider what you know about the technical innovation proposed within this project, the problem it seeks to solve, and the way in which this particular technical objective fits within the broader context of this SBIR proposal.
    - Consider the significance of this technical objective and why it is critical to successfully completing this project.
    - If there are gaps in the information you have been provided, or the information you have been provided is insufficient for any other reason, generate some knowledge about this technical objective and how it fits within the broader project.
    - Using your knowledge, creativity, and the information you have generated, explain the importance of this Objective for feasibility in a detailed and compelling narrative.
    - Justify the chosen acceptance criterion, considering customer demands or requests. This justification should be provided as a detailed and persuasive narrative between 300-600 words in length.

    [b][i]ii. Experimental Design & Methods[/i][/b]
    - Think about the tasks necessary to successfully complete this technical objective. For each task, consider why it is important and how it contributes to the overall technical objective.
    - List tasks to be performed, providing a recipe-like description with key ingredients and processes.
    - After each task, explain why it is important and how it is meant to contribute to the overall success of the objective. Use clear descriptions in plain language.
    - Think about each task. Consider what you know about it and how it fits into the broader context of the project. Describe the task in greater detail, including why it is important and how it fits into the larger project.
    - Describe the way the task will be completed, data collection, and assignment of team members responsible for it. If you don't know the name of the appropriate team member, create a placeholder name for them based on their role or necessary skillset. For instance, [Data Scientist Team Member], [Nurse Team Member], etc.
    - Ensure data collection addresses the Objective success criterion.
    - Mention any special equipment required for data collection.

    [b][i]iii. Data Analysis & Interpretation[/i][/b]
    - Consider the tasks associated with this technical objective and the position of this technical objective within the larger context of the project.
    - Generate some knowledge about this technical objective and what types of data analyses would be most useful to the project in respect to this technical objective.
    - Use what you know about the project and any broader context you are aware of to describe the data analysis and interpretation methods that might be required for this technical objective. Use your knowledge and creativity to generate some knowledge to help you write a more compelling Data Analysis & Interpretation section if necessary.
    - Explain how the data will inform the achievement of the Objective.
    - This section should be 120-300 words in length.

    [b][i]iv. Potential Pitfalls / Alternative Approaches[/i][/b]
    - Consider all the details you know about this Technical Objective, all the details you know about the broader SBIR project, all the details you know about other SBIR projects, and consider all the details you know about grant writing best practices.
    - Use this information to generate some knowledge about potential pitfalls specific to this technical objective and what alternative approaches might be possible to overcome them if necessary.
    - Select the 1 or 2 most likely or most significant potential pitfalls.
    - In a detailed narrative, explain the potential pitfall(s), why it is significant, and what you have done or will do to prevent it, work around it, or the alternate approach you will take if it becomes necessary to do so. This narrative should be between 150-400 words in length.

    [b][i]v. Expected Outcomes[/i][/b]
    - Write a detailed narrative between 100-300 words in length about the expected outcomes of the project upon achieving this Objective. Generate some additional knowledge about the technical objective if necessary.
    - State the expected status of the project upon achieving this Objective.
    - Show optimism in achieving success and reaching the Objective while providing concrete details and evidence to support the narrative.

    For example:
    'Upon the successful completion of this Objective, we expect to create a research model based on the Crossref dataset that effectively clusters or groups research topics in a manner that is easily recognizable by experts. The topics in the Acme Corp model will be characterized by metadata gathered and produced during the model’s creation, such as high-frequency key phrases, author organizations, journal categories, etc. We anticipate that the Acme Corp model will contain similar topics to those found in the XXX model, with a substantial overlap between topics based on DOIs common to both models. Our goal is for at least 80% of the most central documents within the XXX model, which we refer to as the topic core, to also be core documents within the Acme Corp model.'

    [b]Project Development Chart[/b]

    Create a 12-month timeline that shows:

    - Timing for each Technical Objective.
    - The person/organization responsible for completing each Objective or critical task.
    - Key milestones or decision points in the project timeline.
  include_header: False
  qs:
    q1input: "NSF - SBIR - 3. Expanded Technical Objectives"
    q2input: "NSF - SBIR - 5.3 Project Description: Technical Solution"
    q3input : page_q9
  fixed_out: "\n\n[b]5. TECHNICAL DISCUSSION and R&D PLAN[/b]\n"
  evaluation_prompt: |
    Review and provide recommendations for the Technical Discussion section within the Project Description of the NSF SBIR proposal.  The text of the Technical Discussion
    section is included in the system prompt.  
    When reviewing and providing recommendations for the Intellectual Merits: Technical Discussion and R&D Plan section of the NSF SBIR proposal, consider the following instructions and guidelines:
    1. Technical Discussion: The section should provide a detailed discussion of the technical aspects of the proposed solution. This should include the underlying technology, how it works, and how it solves the problem. The discussion should be understandable to a scientifically or technically literate lay reader.
    2. Intellectual Merits: The section should clearly describe the intellectual merits of the proposed solution. This could include novel technologies, processes, or business models. The intellectual merits should be clearly differentiated from existing solutions.
    3. R&D Plan: The section should provide a detailed research and development (R&D) plan. This should include the objectives, methods, and timeline for the R&D activities. The plan should be realistic and achievable within the project period.
    4. Technical Feasibility: The section should demonstrate the technical feasibility of the proposed solution. This could include preliminary data, proof of concept studies, or expert endorsements.
    5. Risk and Mitigation: The section should address potential technical risks and how they will be mitigated. This shows that the team has thought through potential challenges and has a plan to address them.
    6. Alignment with NSF's Mission: The section should demonstrate alignment with NSF's mission and the goals of the SBIR program. It should show how the project contributes to the advancement of science and technology and has broader societal impacts.
    7. Use of Data and Evidence: The section should use data and evidence to support its claims. This could include scientific studies, technical reports, or expert endorsements.
    8. Clarity and Conciseness: The section should be clear, concise, and free of jargon. It should be understandable to a scientifically or technically literate lay reader.
    9. Persuasiveness: The section should be persuasive, convincing the reader that the proposed solution is technically sound and innovative. It should demonstrate the feasibility of the proposed solution and the potential return on investment.
    10. Rating: Begin your response with a rating using the NSF's rating system: Excellent, Very Good, Good, Fair, and Poor.
    11. Recommendations: Generate detailed and specific recommendations to improve the Intellectual Merits: Technical Discussion and R&D Plan section. Provide examples when possible and justify each recommendation. Maintain a respectful and professional tone throughout.

    Remember, the goal of the Intellectual Merits: Technical Discussion and R&D Plan section is to convince the reader that the proposed solution is technically sound, innovative, and feasible. Your recommendations should help ensure that the 
    Intellectual Merits: Technical Discussion and R&D Plan section achieves this goal.
    If you cannot find the Intellectual Merits: Technical Discussion and R&D Plan section, please return "I cannot find the Intellectual Merits: Technical Discussion and R&D Plan section, please label it clearly."
"NSF - SBIR - 5.6 Project Description: Broader Impacts":
  prompt: |
    [Project Information]: ```q1input```

    As an expert NSF SBIR grant writer, create a persuasive and comprehensive 'Broader Impacts' section for a Project Description in an NSF SBIR proposal. Incorporate information from the [Project Information] above. The output should be in BBCode format, without using [font=] or [size=] BBCode.

    Below are some possible subsections for the 'Broader Impacts'. You may use any of these subsections, or create your own based on the information you know about the proposal from the [Project Information] above. Create 2-3 Broader Impacts subsections. The total text should not be more than 1 page or 600 words in length. Focus on addressing each subsection you choose thoroughly and demonstrating the project's broader impacts. Ensure thorough and convincing coverage of each aspect. Combine your knowledge, creativity, and the provided [Project Information] above to produce a compelling 'Broader Impacts' section that demonstrates the project's societal and economic benefits, addresses the evaluation criteria, and highlights the ripple effects of the innovation, integrating additional background information as needed. Format your response so it is visually appealing.

    Begin by generating knowledge about the technology, its objectives, and its broader context based on the information provided above. Use this knowledge to inform the rest of the discussion.

    [b]Economic Competitiveness[/b]
    - Consider the potential impact of the proposed product or service on the economic competitiveness of the United States.
    - Generate some knowledge about the market size, growth rate, and potential savings or revenue generation based on the information provided above and your own knowledge and creativity.
    - Explain how the proposed product or service will contribute to the economic competitiveness of the United States in a detailed and compelling narrative between 100-300 words in length.

    [b]]Health and Welfare[/b]
    - If applicable, discuss how the proposed product or service will advance the health and welfare of the American public.
    - Generate some knowledge about the potential improvements in healthcare outcomes, cost savings, or other benefits based on the information provided above and your own knowledge and creativity.
    - Explain how the proposed product or service will contribute to the health and welfare of the American public in a detailed and compelling narrative between 100-300 words in length.

    [b]National Defense[/b]
    - If applicable, discuss how the proposed product or service will support the national defense of the United States.
    - Generate some knowledge about the potential improvements in defense capabilities, cost savings, or other benefits based on the information provided above and your own knowledge and creativity.
    - Explain how the proposed product or service will contribute to the national defense of the United States in a detailed and compelling narrative between 100-300 words in length.

    [b]Partnerships between Academia and Industry[/b]
    - If applicable, discuss how the proposed product or service will enhance partnerships between academia and industry in the United States.
    - Generate some knowledge about the potential collaborations, knowledge transfer, or other benefits based on the information provided above and your own knowledge and creativity.
    - Explain how the proposed product or service will contribute to enhancing partnerships between academia and industry in the United States in a detailed and compelling narrative between 100-300 words in length.

    [b]STEM Workforce Development[/b]
    - If applicable, discuss how the proposed product or service will contribute to the development of an American STEM workforce that is globally competitive.
    - Generate some knowledge about the potential improvements in STEM education, teacher development, or other benefits based on the information provided above and your own knowledge and creativity.
    - Explain how the proposed product or service will contribute to the development of an American STEM workforce that is globally competitive in a detailed and compelling narrative between 100-300 words in length.

    [b]Public Scientific Literacy and Engagement[/b]
    - If applicable, discuss how the proposed product or service will improve public scientific literacy and engagement with science and technology in the United States.
    - Generate some knowledge about the potential improvements in public understanding, interest, or other benefits based on the information provided above and your own knowledge and creativity.
    - Explain how the proposed product or service will contribute to improving public scientific literacy and engagement with science and technology in the United States in a detailed and compelling narrative between 100-300 words in length.

    [b]Expanding Participation of Underrepresented Groups[/b]
    - If applicable, discuss how the proposed product or service will expand the participation of women and individuals from underrepresented groups in STEM.
    - Generate some knowledge about the potential improvements in diversity, inclusion, or other benefits based on the information provided above and your own knowledge and creativity.
    - Explain how the proposed product or service will contribute to expanding the participation of women and individuals from underrepresented groups in STEM in a detailed and compelling narrative between 100-300 words in length.

    To the extent possible, include statistics that quantify these broader impacts. For example: 'Existing technology results in over XXX tons of landfill waste per year, resulting in over $YYY millions. Our product has the potential to reduce this waste by ZZ%, resulting in a savings of…'
  include_header: False
  qs:
    q1input: "NSF - SBIR - 2. Project Pitch"
  fixed_out: "\n\n[b]6. REFERENCES CITED[/b]\n\n\Provide a comprehensive listing of relevant references, including patent numbers and other relevant intellectual property citations. A list of References Cited must be uploaded into the system.\n\n[b]7. BROADER IMPACTS[/b]\n"
````

## File: .gcloudignore
````
# This file specifies files that are *not* uploaded to Google Cloud
# using gcloud. It follows the same syntax as .gitignore, with the addition of
# "#!include" directives (which insert the entries of the given .gitignore-style
# file at that point).
#
# For more information, run:
#   $ gcloud topic gcloudignore
#
.gcloudignore
# If you would like to upload your .git directory, .gitignore file or files
# from your .gitignore file, remove the corresponding line
# below:
.git
.gitignore

node_modules
````

## File: chat_complete.py
````python
import openai
import requests
from llm_helpers import initialize_data, add_error, chat_complete_openai
import document

def chat_complete(request, api_key, request_timeout=540, evaluation=False):
    
    data = initialize_data(request.get_json())
    DEBUG = data['debug']
    if DEBUG: print(data)
    response_function = "add_response"

    if data['model_title'] in ["NSF SBIR"]:
        single_shot = document.Document(data['model_title'])
        if evaluation:
             bubble_data = single_shot.evaluate(data, api_key, request_timeout)
             response_function = "nsf_response"
        else:
            bubble_data = single_shot.draft(data, api_key, request_timeout)
    else:
        bubble_data = chat_complete_openai(data, api_key, request_timeout)
    
    # Set the URL for the Bubble.io API endpoint 
    if 'initialize_url' in data:
        bubble_api_url = data['initialize_url']
    elif data['branch'] =="live":
        bubble_api_url = 'https://grantedai.com/api/1.1/wf/' + response_function
    else:
        bubble_api_url =  'https://grantedai.com/version-' + data['branch'] + '/api/1.1/wf/' + response_function # for actually triggering the workflow
    if DEBUG: print("API URL:",bubble_api_url)  

    # Make the API request to trigger the workflow
    if DEBUG: print("Sending to Bubble.io",data['email'], data['model_title'])  
    response = requests.post(bubble_api_url, data=bubble_data)
    return(response.text)
````

## File: document.py
````python
import requests
import yaml
import time
from llm_helpers import chat_complete_openai

class Document:
    def __init__(self, model_name):
        self.model_name = model_name
        self.config_file = "config/"+ model_name + ".yaml"
        with open(self.config_file,'r', encoding='utf-8') as file:
            self.document = yaml.safe_load(file)

    def split_body(self, body):
        scratchpad = {}
        counter = 0
        user_inputs = body.split("qinput:")
        for user_input in user_inputs:
            scratchpad["page_q"+str(counter)] = user_input
            counter += 1
        return(scratchpad)
    
    def sub_user_inputs(self, body, scratchpad, page):
        for key,value in self.document[page]['qs'].items():
            if value in scratchpad.keys():
                value = scratchpad[value]
                body = body.replace(key,value)
        return(body)

    def get_section_title(self, section):
        for key in self.document.keys():
            if section in key:
                return(key)


    def evaluate(self, page_data, my_secret_value, request_timeout=540):
        #section_title = self.document['output_order'][int(page_data['section'])]
        section_title = self.get_section_title("Project Summary")
        if page_data['debug']: print("Evaluating section:",section_title)
        
        system_prompt = page_data['prompt']
        
        evaluation_prompt = 'Make this sound better'
        if 'evaluation_prompt' in self.document[section_title].keys():
            evaluation_prompt = self.document[section_title]['evaluation_prompt']
        user_prompt = self.document['reviewer_characteristics']+ "\n" + evaluation_prompt
        if page_data['debug']: print("User Prompt:",user_prompt[0:100])
        if page_data['debug']: print("System Prompt:",system_prompt[0:100])

        # Data to be sent
        data = {
            "email": page_data['email'],
            "branch": page_data['branch'],
            "debug": page_data['debug'],
            "system_prompt" : system_prompt,
            "body" : user_prompt,
            "model_title": page_data['model_title'],
        }

        response = chat_complete_openai(data, my_secret_value)
       
        # need full bubble_data to get the final output
        bubble_data = {"tokens" : response['tokens'], "model": page_data['model_title'], "response_id": page_data['response_id'], "email": page_data['email'], "text": response['text']}
        return(bubble_data)

    def draft(self, page_data, my_secret_value, request_timeout=540):       
        # get the qs from the page_data
        tokens = 0
        scratchpad = self.split_body(page_data['body'])
       
        for page in self.document['draft_order']:
            # construct body from model_data and project_data
            body = ""
            if self.document[page]['include_header']: body += scratchpad['page_q0']
            body += self.document[page]['prompt']
            body = self.sub_user_inputs(body, scratchpad, page)

            # Data to be sent
            data = {
                "email": page_data['email'],
                "branch": page_data['branch'],
                "debug": "True",
                "body" : body,
                "model_title": page_data['model_title'],
                "project_id": page_data['project_id']
                }
            
            response = chat_complete_openai(data, my_secret_value)
            if response['error']:   
                time.sleep(20)  # Pause for 20 seconds
                if page_data['debug']: print("Retrying OpenAI call due to error")
                response = chat_complete_openai(data, my_secret_value)

            text = response['text']
            tokens += response['tokens']

            scratchpad[page] = text

        output = ""
        for page in self.document['output_order']:
            if 'fixed_out' in self.document[page].keys():
                output += self.document[page]['fixed_out'] + "\n"
            output += scratchpad[page] + "\n"
                                    
        # need full bubble_data to get the final output
        bubble_data = {"tokens" : tokens, "model": page_data['model_title'], "project": page_data['project_id'], "email": page_data['email'], "text": output}
        return(bubble_data)
````

## File: llm_helpers.py
````python
import openai
import requests

def add_error(error_message, email, branch, DEBUG):
    bubble_data = {"exception": error_message, "email": email}
    if branch =="live":
        bubble_api_url = 'https://grantedai.com/api/1.1/wf/add_error'
    else:
        bubble_api_url =  'https://grantedai.com/version-' + branch + '/api/1.1/wf/add_error' # for actually triggering the workflow
    if DEBUG: print("API URL: ",bubble_api_url)  
    if DEBUG: print("Sending to Bubble.io: ",error_message)  
    response = requests.post(bubble_api_url, data=bubble_data)
    return(response.text)

def initialize_data(request_json):
    default_data = {
        "body": "", 
        "model_title": "Humor", 
        "branch": "live",
        "email": "nathan.eagle@gmail.com",
        "project_id": "1683121929445x949068210706579500",
        "debug": False}
    
    if not request_json: 
        return(default_data)
    
    for key, value in default_data.items():
        if key not in request_json:
            request_json[key] = value

    return(request_json)

def chat_complete_openai(data, api_key, request_timeout=540, temperature=0.3, top_p=0.3):
    openai.api_key = api_key
    tokens = 0
    text = ""
    error = False
    DEBUG = data['debug']
    
    system_prompt = "You are a helpful grant writer"
    if 'system_prompt' in data:
        system_prompt = data['system_prompt']

    try:
        if DEBUG: print("Sending to OpenAI with body %s" % data['body'][0:100])
        if DEBUG: print("Sending to OpenAI with prompt %s" % system_prompt)
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data['body']},
                ],
            temperature=temperature,
            top_p=top_p,
            request_timeout=request_timeout,
            )
        text = response['choices'][0]['message']['content']
        tokens = response['usage']['total_tokens']
        if DEBUG: print("Received from OpenAI")
    except openai.error.InvalidRequestError as e:
        if DEBUG: print(e)
        error = True
        if "reduce the length" in str(e):
            text = "Error generating response.  The input is too long, please reduce length and try again."
        else:
            text = "Error generating response."
        add_error(str(e), data['email'], data['branch'], DEBUG)
    except Exception as e:
        if DEBUG: print(e)
        error = True
        text = "Error generating response, please try again."
        add_error(str(e), data['email'], data['branch'], DEBUG)

    if DEBUG: print("GPT returned: "+text[0:100])

    bubble_data = {"tokens" : tokens, "model": data['model_title'], "email": data['email'], "text": text, "error": error}
    if 'project_id' in data.keys(): bubble_data["project"] = data['project_id']
    if 'response_id' in data.keys(): bubble_data["response_id"] = data['response_id']


    return(bubble_data)
````

## File: main.py
````python
import openai
import requests
import os
from web_summary import web_summary
from chat_complete import chat_complete


from google.cloud import secretmanager

# accessing openai api key through google secrets manager

project_id = 'python-backend-v1'
client = secretmanager.SecretManagerServiceClient()
name = f"projects/{project_id}/secrets/OPENAI_API_KEY/versions/2"
response = client.access_secret_version(request={"name": name})
my_secret_value = response.payload.data.decode("UTF-8")
openai.api_key = my_secret_value

FUNCTION_TIMEOUT = 538

def main(request):
    
    """Responds to any HTTP request.
    Args:
        request (flask.Request): HTTP request object.
    Returns:
        The response text or any set of values that can be turned into a
        Response object using
        `make_response <http://flask.pocoo.org/docs/1.0/api/#flask.Flask.make_response>`.
    """
    
    # switch based on function
    func = ''
    if request.headers and 'function' in request.headers:
        func = request.headers.get('function')
    if request.args and 'function' in request.args:
        func = request.args.get('function')
    
    if func == 'web_summary':
        return(web_summary(request, api_key=my_secret_value, request_timeout=FUNCTION_TIMEOUT))
    elif func == 'chat_complete':
        return(chat_complete(request, api_key=my_secret_value, request_timeout=FUNCTION_TIMEOUT))
    elif func == 'nsf_complete':
        return(chat_complete(request, api_key=my_secret_value, request_timeout=FUNCTION_TIMEOUT, evaluation=True))
    else:
        if func != '':
            return(f'Function {func} not found')
        else:
            return f'Hello World!'
````

## File: requirements.txt
````
openai
bs4
requests
tiktoken
google-cloud-secret-manager==2.10.0
PyYAML==6.0
````

## File: web_summary.py
````python
from urllib import parse
import bs4
import tiktoken
import requests
import re
import openai

encoding = tiktoken.encoding_for_model("gpt-4")
MAX_TOKENS = 8000
MAX_TOKENS_CHUNK = 4000

def find_valid_url(url):
    stripped_url = url.replace('http://', '').replace('https://', '').replace('www.', '')
    
    # Generate all possible variations
    url_variations = [
        url,  # include the original url as the first item
        f'http://{stripped_url}',
        f'https://{stripped_url}',
        f'http://www.{stripped_url}',
        f'https://www.{stripped_url}',
    ]
    
    valid_url = None
    for url in url_variations:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                valid_url = url
                break
        except requests.exceptions.RequestException:
            continue
    return valid_url


def text_summary(text, prompt, DEBUG=False, request_timeout=540):
    if DEBUG: print("Summarizing a text of %d tokens" % len(encoding.encode(text)))
    sentences = text.split('.')
    summarized_text = ""
    chunk_counter = 0

    while len(sentences) > 0:
        chunk = ""
        while len(encoding.encode(chunk)) < MAX_TOKENS_CHUNK and len(sentences)>0:
            chunk += sentences.pop(0)
        chunk_counter += 1
        if DEBUG: print("Chunk %d: %d tokens" % (chunk_counter, len(encoding.encode(chunk))))
        try:
            response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are an expert assistant."},
                        {"role": "user", "content":  prompt + chunk},
                        ],
                    temperature=0,
                    max_tokens = 999,
                    request_timeout=request_timeout,
                    )
            summarized_text += response['choices'][0]['message']['content']
        except:
            return("Web summarization encountered an error.")
    if chunk_counter > 1: summarized_text = text_summary(summarized_text, prompt, DEBUG)
    return(summarized_text)

def web_summary(request, api_key, request_timeout=540):
    """Responds to any HTTP request.
    Args:
        request (flask.Request): HTTP request object.
    Returns:
        The response text or any set of values that can be turned into a
        Response object using
        `make_response <http://flask.pocoo.org/docs/1.0/api/#flask.Flask.make_response>`.
    """
    BLANK_MESSAGE = "No information provided. "

    PROMPTS = {"mission": "Summarize the following text in a few sentences that capture the mission of the organization: ",
               "rfp": "Summarize the following text in a few sentences the capture the most important details of the funding opportunity: ",
               "applicant": "Summarize the following text in a few sentences that capture information about the grant applicant: "}

    openai.api_key = api_key

    DEBUG = False
    if request.args and 'debug' in request.args:
        DEBUG = True
        print("Debugging mode on")

    prompt = "Summarize the following text in a few sentences: "
    if request.args and 'reader' in request.args:
        reader = request.args.get('reader')
        if reader in PROMPTS.keys():
            prompt = PROMPTS[reader]
            
    valid_url = None
    if request.args and 'URL' in request.args:
        URL = request.args.get('URL')
        valid_url = find_valid_url(URL)

    if valid_url is None:
        return(BLANK_MESSAGE)
    else:
        page = requests.get(valid_url)
        soup = bs4.BeautifulSoup(page.content, "html.parser")
        text = soup.get_text() # dont need strip =True because next line takes care of it
        text = repr(re.sub(r'\s+', ' ', text)) # converts consecutive newline and space to single space
        tokens = encoding.encode(text)
        if len(tokens) > MAX_TOKENS: text = encoding.decode(tokens[0:MAX_TOKENS])
        # timeout estimate 
        timeout = int(request_timeout / int(max(1,min(MAX_TOKENS,len(tokens)) / MAX_TOKENS_CHUNK)))
        if DEBUG: 
            print("Timeout estimate per single call: %d seconds" % timeout) 
        return(text_summary(text, prompt, DEBUG, request_timeout=timeout))
````
