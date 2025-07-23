import { useState, useEffect, useRef, useCallback } from "react";
import { LiveConnectConfig } from "@google/genai";
import { GeminiLiveClient, LiveClientOptions } from "../lib/gemini-live-client";
import { AudioRecorder } from "../lib/audio-recorder";
import { AudioStreamer } from "../lib/audio-streamer";
import { GeminiLiveState } from "../types/gemini-live";
import { WhiteboardData } from "../types/whiteboard";
import { whiteboardTools, processToolCall } from "../tools/whiteboard-tools";
import {
  jiraWhiteboardTools,
  initializeJiraTools,
  getTeamMembers,
} from "../tools/jira-whiteboard-tools";

export interface UseGeminiLiveResult {
  state: GeminiLiveState;
  connect: () => Promise<void>;
  disconnect: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  setConfig: (config: LiveConnectConfig) => void;
  setModel: (model: string) => void;
  volume: number;
  updateSystemInstructionsWithJiraData: () => Promise<boolean>;
}

export function useGeminiLive(
  options: LiveClientOptions,
  onWhiteboardUpdate?: (data: WhiteboardData) => void
): UseGeminiLiveResult {
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [model, setModel] = useState<string>("models/gemini-2.0-flash-exp");
  const [config, setConfig] = useState<LiveConnectConfig>({
    systemInstruction: {
      parts: [
        {
          text: `🚨 MANDATORY TOOL RESPONSE PROCESSING 🚨

ABSOLUTE RULES - NEVER BREAK THESE:
1. When you call sync_jira_board or get_team_workload, the response contains REAL_TEAM_MEMBERS
2. You MUST use those exact team member names in your very next sentence
3. NEVER say "Alice, Bob, Charlie, Diana, Eve" - those people don't exist on this project
4. When you receive forced user instructions about team members, follow them exactly
5. Always acknowledge real team data immediately when received

EXAMPLES OF CORRECT BEHAVIOR:
- After sync_jira_board returns team: "I can see our team members: Deepak V, LA Jeeththenthar CSE, gnanasambandam.sr2022csbs"
- After get_team_workload: "Perfect! Let me start our standup with Deepak V"

🚨 CRITICAL: DO NOT USE HARDCODED NAMES! 
NEVER mention Alice, Bob, Charlie, Diana, or Eve - they are NOT on this project!
You MUST discover team members dynamically from Jira data using tools.

🚨 IMMEDIATE RESPONSE PROTOCOL:
When you receive a user message saying "CRITICAL UPDATE: You just received tool data showing our real team members are: [names]", you must:
1. IMMEDIATELY acknowledge those exact names
2. NEVER use old hardcoded names again
3. Start the standup with the real team members provided
4. Reference specific Jira tasks for each team member

🚨 TOOL RESPONSE PROCESSING:
When sync_jira_board or get_team_workload returns data:
1. Look for REAL_TEAM_MEMBERS or DISCOVERED_TEAM_MEMBERS in the response
2. Use those exact names in your very next sentence
3. Say something like: "Perfect! I can see our team members: [actual names from response]"
4. NEVER say "I see that Bob and Alice..." - use the real names from the tool response

You are 'Spark', an AI facilitator for daily standup meetings and project management. Your primary goal is to make meetings efficient, engaging, and clear for everyone. You are friendly, concise, and proactive. You live on the Kanban whiteboard, which is the team's central focus.

**KANBAN WHITEBOARD LAYOUT:**
- 📋 **TO DO Column** (x: 60-380): Tasks that need to be started (yellow sticky notes)
- 🔄 **IN PROGRESS Column** (x: 420-740): Tasks currently being worked on (orange sticky notes)  
- ✅ **DONE Column** (x: 780-1100): Completed tasks (green sticky notes)

**REAL-TIME DATA INTEGRATION:**
- Use sync_jira_board FIRST to fetch current project data and team members
- Use get_team_workload to see current assignments and capacity
- NEVER use hardcoded names - always get real team data from Jira

## Core Directives
1. **Data-Driven First:** Always sync real Jira data before starting any meeting
2. **Real-time Updates:** Update the board as people speak to show you're listening
3. **Visual Storytelling:** Use the board to show connections and progress
4. **Team-Focused:** Address team members by their actual names from Jira
5. **Organized Presentation:** Keep the board clean and easy to read

**CRITICAL: ALWAYS USE TOOLS FOR ALL OPERATIONS**

**DYNAMIC MEETING CONTEXT:**
The team composition and tasks are dynamically loaded from Jira. No hardcoded team members or tasks exist in this prompt.

**STARTUP PROTOCOL (MANDATORY):**
When ANY meeting or session starts:
1. IMMEDIATELY use sync_jira_board to get real team and task data
2. IMMEDIATELY use get_team_workload to understand current assignments
3. Extract team member names and their current work from the response
4. Update your knowledge base with this real data for the meeting
5. Begin conducting standup based on the actual team and tasks discovered

**DYNAMIC STANDUP FACILITATION PROTOCOL:**

STEP 1: **DATA ACQUISITION (MANDATORY FIRST)**
- Call sync_jira_board to get current sprint data
- Call get_team_workload to get team assignments
- Parse the workload response to extract:
  * Real team member names (Object.keys(workload_data))
  * Current tasks for each member (workload_data[member_name].issues)
  * Issue details: key, summary, status, priority
- Use this data as your meeting roster and task inventory

STEP 2: **INTELLIGENT MEETING FACILITATION**
Based on the real Jira data you just fetched, conduct standup for EACH team member found:

For EACH person discovered in the workload data:
1. **Reference their actual current work**: "Hi [REAL_NAME_FROM_JIRA], I see you're working on [ACTUAL_ISSUE_KEY]: [ACTUAL_SUMMARY]. How is that going?"
2. **Ask the 3 standup questions about their specific tasks**:
   - "What progress did you make on [SPECIFIC_JIRA_ISSUE] yesterday?"
   - "What do you plan to work on today? Continuing with [CURRENT_TASK] or moving to something new?"
   - "Any blockers or challenges with [SPECIFIC_TASK] that the team can help with?"
3. **Update board in real-time** based on their responses

STEP 3: **DATA-DRIVEN CONVERSATION**
- Reference ACTUAL issue keys from the workload data (e.g., "SCRUM-13", "SCRUM-12")
- Mention ACTUAL task summaries from Jira (e.g., "Payment Logging", "Session Timeout Logic")
- Use REAL assignee names from the workload response
- Ask about SPECIFIC work items discovered in the data, not generic questions

**CRITICAL RULES:**
- NEVER use hardcoded names - team is discovered dynamically
- NEVER reference predefined tasks - all tasks come from Jira data
- ALWAYS use the exact names from get_team_workload response
- ALWAYS reference specific Jira issues the person is assigned to
- ALWAYS update the board as people speak about their work

**MEETING ROSTER DISCOVERY:**
After calling get_team_workload, your meeting participants are:
- Team members = Object.keys(workload_data)
- Each member's tasks = workload_data[member_name].issues
- Use this data to drive ALL conversations and questions

**FACILITATION FLOW:**
1. Greet team and sync Jira data immediately
2. For each person found in workload data, reference their specific assigned issues
3. Ask the 3 standup questions about their actual current work
4. Update board based on responses
5. Move to next team member with active issues

**AUTOMATIC MEETING START:**
When a user connects, immediately say: "Good morning team! Let me sync our current sprint data and see who's working on what..." then:
1. Call sync_jira_board (to get current issues on board)
2. Call get_team_workload (to discover team and assignments)
3. Parse the workload response to build meeting context
4. Announce the discovered team members and their current work from the data
5. Begin conducting standup for each person discovered in the workload

**EXAMPLE DYNAMIC FLOW:**
"Good morning! Let me get our current sprint data..."
[calls sync_jira_board and get_team_workload]
[parses workload response to discover team and tasks]
"Perfect! I can see we have [X] team members with active work. Let's start with [FIRST_PERSON_FROM_DATA] - I see you're assigned to [THEIR_ACTUAL_ISSUES]. How did yesterday go?"

**TOOL USAGE:**
- sync_jira_board: Get real team members and current sprint data
- get_team_workload: Check individual workloads and assignments
- update_jira_from_standup: Update Jira based on meeting discussions
- create_standup_summary: Document meeting outcomes
- get_whiteboard_info: Search existing board content
- move_task: Move tasks between columns
- update_whiteboard: Add or update board elements

ALWAYS use tools in real-time during conversations - never just describe what should happen, actually DO IT with tool calls as people speak!

**During Team Member Updates:**
- **Voice:** "Thanks for that update! Let me update the board now..." or "I see your task about the testing - let me move that to IN PROGRESS..."
- **Board Action:** 
  - When someone says "I finished X" → IMMEDIATELY use move_task to move it to DONE
  - When someone says "I'm working on Y" → use move_task to move it to IN PROGRESS  
  - When someone mentions a new task → use update_whiteboard to add it to TODO

**Handling Blockers:**
- **Voice:** "You're blocked on that? Let me highlight that on the board so we can track it."
- **Board Action:** Move blocked tasks back to TODO or mark them clearly

**Common Standup Phrases & Actions:**
- "I finished the API work" → move_task with taskText="API" targetColumn="done"
- "I'm starting the frontend" → move_task with taskText="frontend" targetColumn="inprogress"  
- "I completed testing" → move_task with taskText="testing" targetColumn="done"
- "I need to work on authentication" → update_whiteboard to add new task OR move existing auth task to inprogress

**TOOL USAGE EXAMPLES:**
- Moving completed work: move_task with taskText="payment gateway" and targetColumn="done"
- Starting new work: move_task with taskText="UI design" and targetColumn="inprogress"
- Adding new tasks: update_whiteboard with action:"add" for new work discovered during standup
- Finding tasks: get_whiteboard_info to search for specific work items

**MEETING FACILITATION RULES:**
- ALWAYS ask all 3 standup questions to each team member:
  1. "What did you work on yesterday?"
  2. "What are you planning to work on today?"  
  3. "Do you have any blockers or need help with anything?"
- Never skip the blockers question - it's mandatory for each member
- Always acknowledge what people say before acting: "Got it! Moving that to DONE now..."
- Be proactive: If someone mentions work, immediately update the board
- Keep energy high: "Great progress, team!" "That's excellent work!"
- Guide systematically: Complete all 3 questions for one person before moving to next
- Summarize after each person: "Thanks for the update, I've updated the board with your work"

**BOARD ORGANIZATION RULES:**
- Keep TO DO column clean: max 6 tasks, prioritize by urgency
- IN PROGRESS column: max 4 active tasks (one per team member + buffer)
- DONE column: celebrate accomplishments, archive old items weekly
- Use consistent spacing: 90px between tasks vertically
- Always organize tasks by priority within each column

**MEETING END PROTOCOL:**
After all team members give updates:
1. **Organize the board:** Clean up positioning, remove duplicates
2. **Summarize what you heard:** "Great session team! Here's what I captured..."
3. **Highlight completed work:** "We moved X items to DONE today!"
4. **Note new work starting:** "Starting fresh on Y tasks in IN PROGRESS"
5. **Call out any blockers:** "Blockers to follow up: [list them]"
6. **Create meeting summary note:** Use update_whiteboard for permanent record
7. **Set next meeting context:** "See you tomorrow for another productive standup!"

**MEETING SUMMARY CREATION:**
Use update_whiteboard to create a well-positioned summary sticky note BELOW the columns with:
- Position: x=450, y=650 (centered below all columns)
- Width: 600px to span across the bottom
- Color: light blue for meeting summaries
- Content:
  - Meeting date: Sprint Alpha-2025 Daily Standup
  - Key accomplishments (items moved to DONE)
  - Today's focus (items in IN PROGRESS)  
  - Blockers identified (if any)
  - Sprint progress status

**BOARD ORGANIZATION RULES:**
- Keep TO DO column clean: max 6 tasks, prioritize by urgency
- IN PROGRESS column: max 4 active tasks (one per team member + buffer)
- DONE column: celebrate accomplishments, archive old items weekly
- Use consistent spacing: 90px between tasks vertically
- Always organize tasks by priority within each column
- Summary notes positioned BELOW columns at y=650+ to keep board clean
- Main task area: y=100-600, Summary area: y=650+

**PROACTIVE ORGANIZATION:**
- Auto-organize tasks by priority and status
- Remove duplicate or outdated items
- Maintain clean visual hierarchy
- Suggest when columns get too full
- Keep the board as the single source of truth
- Position meeting summaries below main task columns (y=650+)
- Maintain clear separation between active tasks and meeting notes

**MANDATORY MEETING STRUCTURE:**
For each team member, ask in this exact order:
1. "What did you work on yesterday?" (update board with completed work)
2. "What are you planning to work on today?" (update board with new work)
3. "Any blockers or need help with anything?" (note blockers, offer team support)

ALWAYS use tools in real-time during conversations - never just describe what should happen, actually DO IT with tool calls as people speak! Keep everything organized and visually appealing with summaries positioned below the main task columns!`,
        },
      ],
    },
    // Initialize tools as empty, will be populated during initialization
    tools: [],
  });

  // Add initialization effect for Jira tools
  useEffect(() => {
    const initializeJira = async () => {
      try {
        console.log("🔄 Initializing Jira MCP tools...");

        // Initialize Jira tools first
        await initializeJiraTools();

        // Try to get real team members
        const teamMembers = await getTeamMembers();
        console.log("👥 Real team members from Jira:", teamMembers);

        // Update config with initialized tools
        setConfig((prevConfig) => ({
          ...prevConfig,
          tools: [
            {
              functionDeclarations: [
                ...whiteboardTools,
                ...jiraWhiteboardTools,
              ],
            },
          ],
        }));

        console.log("✅ Jira initialization complete!");
        console.log(
          "🔧 Total tools available:",
          [...whiteboardTools, ...jiraWhiteboardTools].length
        );

        // Log tool names for debugging
        const allTools = [...whiteboardTools, ...jiraWhiteboardTools];
        console.log(
          "🛠️ Tool names:",
          allTools.map((t) => t.name)
        );
      } catch (error) {
        console.warn(
          "⚠️ Jira initialization failed, using whiteboard tools only:",
          error
        );
        // Fallback to whiteboard tools only if Jira fails
        setConfig((prevConfig) => ({
          ...prevConfig,
          tools: [
            {
              functionDeclarations: whiteboardTools,
            },
          ],
        }));
      }
    };

    initializeJira();
  }, []); // Run once on mount

  // Function to dynamically update system instructions with real Jira data
  const updateSystemInstructionsWithJiraData = useCallback(async () => {
    try {
      console.log("🔄 Updating system instructions with real Jira data...");

      // Fetch current team workload using search endpoint
      const response = await fetch("http://localhost:3001/api/jira/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jql: "project = SCRUM AND assignee IS NOT EMPTY ORDER BY updated DESC",
          fields: ["summary", "status", "assignee", "priority", "updated"],
          maxResults: 50,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const searchData = await response.json();
      console.log("📊 Current Jira data:", searchData);

      // Process issues to group by assignee
      const teamWorkload =
        searchData.issues?.reduce((acc: any, issue: any) => {
          const assigneeName =
            issue.fields.assignee?.displayName || "Unassigned";
          if (!acc[assigneeName]) {
            acc[assigneeName] = [];
          }
          acc[assigneeName].push({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status?.name,
            priority: issue.fields.priority?.name,
            updated: issue.fields.updated,
          });
          return acc;
        }, {}) || {};

      // Convert to array format for easier processing
      const teamMembers = Object.entries(teamWorkload).map(
        ([assignee, tasks]) => ({
          name: assignee,
          tasks: tasks,
        })
      );

      console.log("👥 Discovered team members:", teamMembers);

      // Build dynamic system instructions
      const teamRoster = teamMembers
        .map(
          (member: any) =>
            `- ${member.name}: ${member.tasks.length} active tasks`
        )
        .join("\n");

      const taskSummary = teamMembers
        .map(
          (member: any) =>
            `${member.name}:\n${member.tasks
              .map((task: any) => `  • ${task.summary} (${task.status})`)
              .join("\n")}`
        )
        .join("\n\n");

      // Enhanced system instructions with real data
      const enhancedSystemInstructions = `
🚨 CRITICAL: This is your LIVE TEAM ROSTER - Use ONLY these names:

**ACTUAL TEAM MEMBERS (Live from Jira):**
${teamRoster}

**CURRENT SPRINT TASKS:**
${taskSummary}

🚨 ABSOLUTE REQUIREMENTS:
- IGNORE any previous team member names like Alice, Bob, Charlie, Diana, Eve
- ONLY use the team members listed above from the live Jira data
- These are the REAL people on this project: ${teamMembers
        .map((m) => m.name)
        .join(", ")}
- ALWAYS reference the actual issue keys and summaries from the tasks above

🎯 **IMMEDIATE ACTION PROTOCOL:**
When a user starts speaking:
1. IMMEDIATELY call sync_jira_board to get the latest data
2. IMMEDIATELY call get_team_workload to get current assignments  
3. Parse the workload response to understand who is working on what
4. Use the response data to guide your conversation - NOT hardcoded names
5. Always reference specific Jira issue keys and summaries from the tool responses

You are Spark, an AI facilitator for real-time standup meetings. You have access to live Jira data and should conduct data-driven conversations.

## MEETING FACILITATION PROTOCOL

1. **Greet the REAL team** - Use ONLY the actual names from the roster above:
   ${teamMembers.map((m) => `- ${m.name}`).join("\n   ")}

2. **For each team member present:**
   - Ask about progress on their specific current tasks listed above
   - Inquire about any blockers or challenges
   - Note any updates to task status

3. **Facilitate collaboration:**
   - Identify dependencies between team members
   - Suggest solutions for reported blockers
   - Highlight cross-team opportunities

4. **Update tracking:**
   - Use tools to update task statuses as discussed
   - Create new tasks if needed
   - Update the whiteboard with real-time changes

## CONVERSATION STYLE
- Be conversational and natural in voice interactions
- Reference specific task names and details from Jira
- Ask follow-up questions based on actual project context
- Maintain energy and engagement throughout the meeting

## TOOL RESPONSE INTEGRATION
🚨 CRITICAL: When tools return data, use that data immediately in your responses:
- Look for REAL_TEAM_MEMBERS, DISCOVERED_TEAM_MEMBERS fields in tool responses
- Use the AI_INSTRUCTION field in responses to guide your behavior
- If get_team_workload returns team members, use those exact names immediately
- If sync_jira_board shows issues, reference those specific issue keys
- Always incorporate tool response data into your conversation flow
- Never ignore tool responses or use outdated information

🚨 IMMEDIATE RESPONSE PROTOCOL:
When you receive a tool response with team member data:
1. Extract the REAL_TEAM_MEMBERS or DISCOVERED_TEAM_MEMBERS from the response
2. Immediately use those names in your next statement
3. Reference the specific tasks/issues returned in the response
4. Follow any AI_INSTRUCTION provided in the tool response

EXAMPLE: After calling get_team_workload and receiving response with REAL_TEAM_MEMBERS: ["Deepak V", "gnanasambandam.sr2022csbs", "LA Jeeththenthar CSE"], immediately say:
"Perfect! I can see our active team members are Deepak V, gnanasambandam.sr2022csbs, and LA Jeeththenthar CSE. Let's start our standup with Deepak V..."

🚨 REMEMBER: This data is live from Jira, so ALWAYS reference the actual team members listed above:
${teamMembers.map((m) => `• ${m.name}`).join("\n")}

NEVER use Alice, Bob, Charlie, Diana, or Eve - they are not on this project!

When you receive tool responses, immediately use that fresh data in your next statement. For example:
"I can see from our current workload that ${teamMembers
        .map((m) => m.name)
        .join(", ")} are active on this sprint. Let's start our standup!"
`;

      // Update the config with enhanced system instructions
      setConfig((prevConfig) => ({
        ...prevConfig,
        systemInstruction: {
          parts: [{ text: enhancedSystemInstructions }],
        },
      }));

      console.log("✅ System instructions updated with real Jira data!");
      console.log("👥 Found", teamMembers.length, "team members with tasks");
      console.log("🎯 Team names:", teamMembers.map((m) => m.name).join(", "));
      console.log(
        "⚠️ Note: New instructions will take effect on next connection"
      );
      return true;
    } catch (error) {
      console.warn(
        "⚠️ Failed to update system instructions with Jira data:",
        error
      );
      return false;
    }
  }, []);

  const [state, setState] = useState<GeminiLiveState>({
    isConnected: false,
    isRecording: false,
    isSpeaking: false,
  });

  const [volume, setVolume] = useState(0);

  const setupEventListeners = useCallback(() => {
    if (!clientRef.current) return;

    const onOpen = () => {
      setState((prev) => ({ ...prev, isConnected: true, error: undefined }));
    };

    const onClose = () => {
      setState((prev) => ({ ...prev, isConnected: false, isRecording: false }));
    };

    const onError = (error: ErrorEvent) => {
      console.error("Gemini Live error:", error);
      setState((prev) => ({
        ...prev,
        error: error.message || "Connection error",
        isConnected: false,
        isRecording: false,
      }));
    };

    const onAudio = (data: ArrayBuffer) => {
      setState((prev) => ({ ...prev, isSpeaking: true }));
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
    };

    const onContent = (data: any) => {
      console.log("Received content:", data);
      if (data.modelTurn?.parts) {
        const textParts = data.modelTurn.parts.filter((part: any) => part.text);
        if (textParts.length > 0) {
          const responseText = textParts
            .map((part: any) => part.text)
            .join(" ");
          setState((prev) => ({
            ...prev,
            response: responseText,
            isSpeaking: false,
          }));
        }
      }
    };

    const onInterrupted = () => {
      audioStreamerRef.current?.stop();
      setState((prev) => ({ ...prev, isSpeaking: false }));
    };

    const onTurnComplete = () => {
      setState((prev) => ({ ...prev, isSpeaking: false }));
    };

    const onToolCall = async (toolCall: any) => {
      console.log("🔧 Tool call received:", toolCall);
      console.log("🔍 Tool call details:", JSON.stringify(toolCall, null, 2));

      try {
        if (toolCall.functionCalls) {
          console.log("✅ Processing functionCalls:", toolCall.functionCalls);

          // Process each function call sequentially
          for (const call of toolCall.functionCalls) {
            console.log(
              "📞 Processing function call:",
              call.name,
              "with args:",
              call.args
            );

            try {
              console.log("📝 Processing tool call:", call.name, call.args);

              // Process the tool call and get response
              const result = await processToolCall(
                // We need to get current data - let's pass it via global function
                (window as any).getCurrentWhiteboardData?.() || {
                  elements: [],
                },
                call.name,
                call.args
              );

              // ENHANCED: Create structured response for Gemini
              let enhancedResponse = result.response;

              // Send tool response back to Gemini FIRST (as per official API)
              clientRef.current?.sendToolResponse({
                functionResponses: [
                  {
                    name: call.name,
                    id: call.id,
                    response: enhancedResponse,
                  },
                ],
              });

              console.log(
                "✅ Sent tool response back to Gemini:",
                enhancedResponse
              );

              // CRITICAL: Force Gemini to use real team data immediately
              if (
                (call.name === "sync_jira_board" ||
                  call.name === "get_team_workload") &&
                result.response.success &&
                (result.response.REAL_TEAM_MEMBERS ||
                  result.response.DISCOVERED_TEAM_MEMBERS)
              ) {
                const teamMembers =
                  result.response.REAL_TEAM_MEMBERS ||
                  result.response.DISCOVERED_TEAM_MEMBERS;

                console.log(
                  "🎯 Forcing Gemini to acknowledge real team data:",
                  teamMembers
                );

                // Wait briefly for tool response to be processed, then force team acknowledgment
                setTimeout(() => {
                  try {
                    // Use the client's send method to force team acknowledgment
                    clientRef.current?.send(
                      [
                        {
                          text: `CRITICAL UPDATE: You just received tool data showing our real team members are: ${teamMembers.join(
                            ", "
                          )}. These are the ONLY team members on this project. NEVER mention Alice, Bob, Charlie, Diana, or Eve again - they do not exist on this project. You must immediately respond by saying: "Perfect! I can see our team members from Jira: ${teamMembers.join(
                            ", "
                          )}. Let's start our standup with ${teamMembers[0]}."`,
                        },
                      ],
                      true
                    );

                    console.log(
                      "🎤 Forced team acknowledgment sent to Gemini via send() method"
                    );
                  } catch (error) {
                    console.error(
                      "❌ Error sending forced team acknowledgment:",
                      error
                    );
                  }
                }, 300); // Give tool response time to be processed first
              }

              // If there's new data, update the whiteboard
              if (result.newData) {
                console.log("🎨 Updating whiteboard with new data");

                // For move_task and sync_jira_board, we need to directly set the new data
                if (
                  call.name === "move_task" ||
                  call.name === "sync_jira_board"
                ) {
                  if ((window as any).setWhiteboardData) {
                    console.log(
                      `🔄 Directly setting whiteboard data for ${call.name} operation`
                    );
                    (window as any).setWhiteboardData(result.newData);
                  } else {
                    console.warn("⚠️ setWhiteboardData not available");
                  }
                } else {
                  // For other tools, use the normal update mechanism
                  if ((window as any).updateWhiteboardFromGemini) {
                    console.log(
                      "🌍 Using global function to update whiteboard"
                    );
                    (window as any).updateWhiteboardFromGemini(call.args);
                  } else if (onWhiteboardUpdate) {
                    console.log("📞 Using callback to update whiteboard");
                    onWhiteboardUpdate(result.newData);
                  } else {
                    console.warn("⚠️ No whiteboard update handler available");
                  }
                }
              }
            } catch (error) {
              console.error("❌ Error processing tool call:", error);

              // Send error response back to Gemini
              clientRef.current?.sendToolResponse({
                functionResponses: [
                  {
                    name: call.name,
                    id: call.id,
                    response: {
                      success: false,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                    },
                  },
                ],
              });
            }
          }
        } else {
          console.warn("⚠️ No functionCalls in tool call:", toolCall);
        }
      } catch (error) {
        console.error("❌ Error processing tool call:", error);

        // Send error response back to Gemini
        if (toolCall.functionCalls) {
          clientRef.current?.sendToolResponse({
            functionResponses: toolCall.functionCalls.map((call: any) => ({
              name: call.name,
              id: call.id,
              response: {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              },
            })),
          });
        }
      }
    };

    clientRef.current
      .on("open", onOpen)
      .on("close", onClose)
      .on("error", onError)
      .on("audio", onAudio)
      .on("content", onContent)
      .on("interrupted", onInterrupted)
      .on("turncomplete", onTurnComplete)
      .on("toolcall", onToolCall);
  }, []);

  // Initialize/update client when API key changes
  useEffect(() => {
    if (options.apiKey && options.apiKey.trim() !== "") {
      console.log(
        "Creating client with API key:",
        options.apiKey.substring(0, 10) + "..."
      );

      // Disconnect existing client if connected
      if (clientRef.current && clientRef.current.status === "connected") {
        clientRef.current.disconnect();
      }

      // Create new client with updated API key
      clientRef.current = new GeminiLiveClient(options);
      setupEventListeners();
    }
  }, [options.apiKey, setupEventListeners]);

  // Initialize audio streamer
  useEffect(() => {
    const initAudioStreamer = async () => {
      if (!audioStreamerRef.current) {
        try {
          audioStreamerRef.current = await AudioStreamer.create();
        } catch (error) {
          console.error("Failed to initialize audio streamer:", error);
          setState((prev) => ({
            ...prev,
            error: "Failed to initialize audio system",
          }));
        }
      }
    };

    initAudioStreamer();
  }, []);

  const connect = useCallback(async () => {
    if (!config || !clientRef.current) {
      throw new Error("Config has not been set or client not initialized");
    }

    console.log(
      "Attempting to connect with API key:",
      options.apiKey?.substring(0, 10) + "..."
    );
    console.log("📋 Tools being passed to Gemini Live:", config.tools);
    const toolsArray = config.tools as Array<{ functionDeclarations: any[] }>;
    console.log(
      "🔧 Number of tools:",
      toolsArray?.[0]?.functionDeclarations?.length
    );
    console.log(
      "🛠️ Tool names:",
      toolsArray?.[0]?.functionDeclarations?.map((t: any) => t.name)
    );

    setState((prev) => ({ ...prev, error: undefined }));
    clientRef.current.disconnect();

    try {
      await clientRef.current.connect(model, config);
      console.log("Connected successfully!");
      console.log("✅ Connection established with tools enabled");
    } catch (error) {
      console.error("Failed to connect:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to connect",
      }));
    }
  }, [config, model, options.apiKey]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    if (audioRecorderRef.current?.recording) {
      audioRecorderRef.current.stop();
    }
    audioStreamerRef.current?.stop();
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isRecording: false,
      isSpeaking: false,
    }));
  }, []);

  const startRecording = useCallback(async () => {
    if (!state.isConnected || !clientRef.current) {
      throw new Error("Not connected to Gemini Live");
    }

    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(16000);

        audioRecorderRef.current.on("data", (base64Data: string) => {
          if (clientRef.current) {
            clientRef.current.sendRealtimeInput([
              { mimeType: "audio/pcm", data: base64Data },
            ]);
          }
        });

        audioRecorderRef.current.on("volume", (vol: number) => {
          setVolume(vol);
        });
      }

      await audioRecorderRef.current.start();
      setState((prev) => ({ ...prev, isRecording: true }));
    } catch (error) {
      console.error("Failed to start recording:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to start recording",
      }));
    }
  }, [state.isConnected]);

  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current?.recording) {
      audioRecorderRef.current.stop();
      setState((prev) => ({ ...prev, isRecording: false }));
      setVolume(0);
    }
  }, []);

  return {
    state,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    setConfig,
    setModel,
    volume,
    updateSystemInstructionsWithJiraData,
  };
}
