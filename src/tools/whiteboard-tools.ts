import { FunctionDeclaration, Type } from "@google/genai";
import { WhiteboardData, WhiteboardElement } from "../types/whiteboard";
import {
  jiraWhiteboardTools,
  processJiraToolCall,
  isMCPAvailable,
} from "./jira-whiteboard-tools";

// Combine original whiteboard tools with Jira-enhanced tools
export const whiteboardTools: FunctionDeclaration[] = [
  {
    name: "get_whiteboard_info",
    description: `Get current whiteboard state and task information. Use this to:
    
    **QUERY CAPABILITIES:**
    - Find tasks by text content (e.g., "find task about API integration")
    - List all tasks in a specific column (TO DO, IN PROGRESS, DONE)
    - Get task IDs for moving tasks between columns
    - Check current project status and task counts
    
    **SEARCH EXAMPLES:**
    - "Find tasks containing 'authentication'" 
    - "List all IN PROGRESS tasks"
    - "What tasks are in the DONE column?"
    - "Find task about mobile design"
    
    Always use this BEFORE trying to move/update existing tasks to get their IDs.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            "Search query - can be task text, column name (TODO/IN PROGRESS/DONE), or general description",
        },
        column: {
          type: Type.STRING,
          enum: ["todo", "inprogress", "done", "all"],
          description:
            "Specific column to search in, or 'all' for entire board",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "update_whiteboard",
    description: `Update the Kanban-style whiteboard with tasks and project items. The whiteboard has three columns:

    **KANBAN COLUMNS:**
    - TO DO (x: 100, color: yellow): New tasks to be started  
    - IN PROGRESS (x: 460, color: orange): Tasks being worked on
    - DONE (x: 820, color: green): Completed tasks
    
    **POSITIONING RULES:**
    - TO DO column: x=100, color="yellow"
    - IN PROGRESS column: x=460, color="orange" 
    - DONE column: x=820, color="green"
    - Y positions: 180, 270, 360, 450, etc. (90px spacing)
    
    **MOVING EXISTING TASKS:**
    - Use get_whiteboard_info first to find task IDs
    - Then use action="update" with the task ID and new position/color
    
    Use this when users:
    - Add new tasks → Place in TO DO column
    - Start working on something → Move to IN PROGRESS 
    - Complete tasks → Move to DONE
    - Organize project items → Use appropriate column
    - Update task status → Move between columns`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["add", "update", "remove", "replace"],
          description: "The action to perform on the whiteboard",
        },
        elements: {
          type: Type.ARRAY,
          description: "Array of elements to add or update",
          items: {
            type: Type.OBJECT,
            properties: {
              id: {
                type: Type.STRING,
                description:
                  "Unique identifier for the element. For new elements, use a descriptive name with timestamp",
              },
              type: {
                type: Type.STRING,
                enum: ["sticky", "flow-node", "mermaid", "embed"],
                description: "Type of whiteboard element",
              },
              x: {
                type: Type.NUMBER,
                description:
                  "X coordinate: TO DO=100, IN PROGRESS=500, DONE=900 (auto-assigned if not provided)",
              },
              y: {
                type: Type.NUMBER,
                description:
                  "Y coordinate: 220, 300, 380, 460... (auto-assigned based on column content)",
              },
              // Sticky note properties
              text: {
                type: Type.STRING,
                description:
                  "Task description or content. System will auto-detect column based on keywords like 'working on', 'completed', etc.",
              },
              color: {
                type: Type.STRING,
                enum: ["yellow", "blue", "green", "pink", "purple", "orange"],
                description:
                  "Color: yellow=TO DO, orange=IN PROGRESS, green=DONE (auto-assigned based on column)",
              },
              // Flow node properties
              label: {
                type: Type.STRING,
                description: "Label text for flow nodes",
              },
              shape: {
                type: Type.STRING,
                enum: ["rectangle", "diamond", "circle", "ellipse"],
                description: "Shape for flow nodes",
              },
              connections: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of element IDs this flow node connects to",
              },
              // Mermaid diagram properties
              mermaidCode: {
                type: Type.STRING,
                description: "Mermaid syntax code for diagrams",
              },
              // Embedded link properties
              url: {
                type: Type.STRING,
                description: "URL for embedded content",
              },
              embedType: {
                type: Type.STRING,
                enum: ["iframe", "video"],
                description: "Type of embedded content",
              },
            },
            required: ["id", "type", "x", "y"],
          },
        },
        elementIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Array of element IDs to remove (only for remove action)",
        },
        reasoning: {
          type: Type.STRING,
          description:
            "Brief explanation of why you're making these changes to the whiteboard",
        },
      },
      required: ["action", "reasoning"],
    },
  },
  {
    name: "move_task",
    description: `Move an existing task between Kanban columns by searching for it by text content. 
    
    **USAGE:**
    - "Move authentication task to IN PROGRESS" 
    - "Mark API integration as DONE"
    - "Move the mobile design task to TODO"
    
    This tool automatically:
    1. Finds the task by searching text content
    2. Moves it to the target column with correct position and color
    3. Handles multiple matches by moving the first found task
    
    Use this instead of update_whiteboard when you want to move existing tasks.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskText: {
          type: Type.STRING,
          description:
            "Text content to search for in existing tasks (partial match is fine)",
        },
        targetColumn: {
          type: Type.STRING,
          enum: ["todo", "inprogress", "done"],
          description: "Target column to move the task to",
        },
        reasoning: {
          type: Type.STRING,
          description: "Brief explanation of why you're moving this task",
        },
      },
      required: ["taskText", "targetColumn", "reasoning"],
    },
  },
  ...jiraWhiteboardTools,
];

// Helper function to generate Kanban-aware positions for new elements
export function generateElementPosition(
  index: number = 0,
  column: "todo" | "inprogress" | "done" = "todo"
): {
  x: number;
  y: number;
} {
  // Kanban column X positions
  const kanbanColumns = {
    todo: 100,
    inprogress: 460,
    done: 820,
  };

  // Y positions with proper spacing
  const startY = 180;
  const spacingY = 90;

  return {
    x: kanbanColumns[column],
    y: startY + index * spacingY,
  };
}

// Helper function to get current whiteboard information
export function getWhiteboardInfo(
  currentData: WhiteboardData,
  query: string,
  column?: string
): any {
  console.log(
    "🔍 Searching whiteboard with query:",
    query,
    "in column:",
    column
  );

  const allTasks = currentData.elements.filter((el) => el.type === "sticky");

  // Filter by column if specified
  let filteredTasks = allTasks;
  if (column && column !== "all") {
    switch (column) {
      case "todo":
        filteredTasks = allTasks.filter((el) => el.x >= 60 && el.x <= 380);
        break;
      case "inprogress":
        filteredTasks = allTasks.filter((el) => el.x >= 420 && el.x <= 740);
        break;
      case "done":
        filteredTasks = allTasks.filter((el) => el.x >= 780 && el.x <= 1100);
        break;
    }
  }

  // Search by text content
  const queryLower = query.toLowerCase();
  const matchingTasks = filteredTasks.filter((task) => {
    if (task.type === "sticky") {
      return task.text.toLowerCase().includes(queryLower);
    }
    return false;
  });

  // Determine current column for each task
  const tasksWithColumns = matchingTasks.map((task) => {
    let currentColumn = "other";
    if (task.x >= 60 && task.x <= 380) currentColumn = "todo";
    else if (task.x >= 420 && task.x <= 740) currentColumn = "inprogress";
    else if (task.x >= 780 && task.x <= 1100) currentColumn = "done";

    return {
      id: task.id,
      text: task.type === "sticky" ? task.text : "",
      currentColumn,
      x: task.x,
      y: task.y,
      color: task.type === "sticky" ? task.color : "unknown",
    };
  });

  const result = {
    query,
    searchColumn: column || "all",
    totalTasks: allTasks.length,
    matchingTasks: tasksWithColumns,
    columnCounts: {
      todo: allTasks.filter((el) => el.x >= 60 && el.x <= 380).length,
      inprogress: allTasks.filter((el) => el.x >= 420 && el.x <= 740).length,
      done: allTasks.filter((el) => el.x >= 780 && el.x <= 1100).length,
    },
  };

  console.log("🔍 Search results:", result);
  return result;
}

// Helper function to move a task by text search
export function moveTaskByText(
  currentData: WhiteboardData,
  taskText: string,
  targetColumn: "todo" | "inprogress" | "done",
  reasoning: string
): WhiteboardData {
  console.log(
    "🚚 Moving task with text:",
    taskText,
    "to column:",
    targetColumn,
    "- Reason:",
    reasoning
  );

  // Log all current tasks for debugging
  const allStickyTasks = currentData.elements.filter(
    (el) => el.type === "sticky"
  );
  console.log("📋 All available sticky tasks:");
  allStickyTasks.forEach((task) => {
    const stickyTask = task as any;
    let currentColumn = "other";
    if (task.x >= 60 && task.x <= 380) currentColumn = "todo";
    else if (task.x >= 420 && task.x <= 740) currentColumn = "inprogress";
    else if (task.x >= 780 && task.x <= 1100) currentColumn = "done";

    console.log(`  - ${task.id}: "${stickyTask.text}" (in ${currentColumn})`);
  });

  // Find task by text content with flexible matching
  const searchTextLower = taskText.toLowerCase();
  const possibleMatches = allStickyTasks.filter((el) => {
    const taskTextLower = (el as any).text?.toLowerCase() || "";
    return (
      taskTextLower.includes(searchTextLower) ||
      searchTextLower.includes(taskTextLower) ||
      // Try matching individual words
      taskTextLower
        .split(" ")
        .some((word: string) => searchTextLower.includes(word)) ||
      searchTextLower.split(" ").some((word) => taskTextLower.includes(word))
    );
  });

  console.log(
    `🔍 Found ${possibleMatches.length} possible matches:`,
    possibleMatches.map((t) => (t as any).text)
  );

  const taskToMove = possibleMatches[0]; // Take the first match

  if (!taskToMove) {
    console.warn("⚠️ Task not found with text:", taskText);
    console.warn(
      "💡 Available task texts:",
      allStickyTasks.map((t) => (t as any).text)
    );
    return currentData;
  }

  console.log(
    "✅ Found task to move:",
    taskToMove.id,
    (taskToMove as any).text
  );

  // Get target position
  const targetPosition = generateElementPosition(0, targetColumn);

  // Count existing tasks in target column to get proper Y position
  const targetX = targetPosition.x;
  const tasksInTargetColumn = currentData.elements.filter(
    (el) => Math.abs(el.x - targetX) < 50 && el.y >= 180
  );

  const newY = 180 + tasksInTargetColumn.length * 90;
  const newColor =
    targetColumn === "todo"
      ? "yellow"
      : targetColumn === "inprogress"
      ? "orange"
      : "green";

  // Update the task
  const updatedElements = currentData.elements.map((el) => {
    if (el.id === taskToMove.id) {
      return {
        ...el,
        x: targetX,
        y: newY,
        color: newColor,
      } as any;
    }
    return el;
  });

  const result = {
    ...currentData,
    elements: updatedElements,
  };

  console.log("🎯 Task moved successfully to", targetColumn, "column");
  return result;
}

// Helper function to determine which Kanban column based on content/context
export function determineKanbanColumn(
  text: string
): "todo" | "inprogress" | "done" {
  const lowerText = text.toLowerCase();

  // Done indicators
  if (
    lowerText.includes("done") ||
    lowerText.includes("completed") ||
    lowerText.includes("finished") ||
    lowerText.includes("✅") ||
    lowerText.includes("complete")
  ) {
    return "done";
  }

  // In Progress indicators
  if (
    lowerText.includes("working") ||
    lowerText.includes("progress") ||
    lowerText.includes("doing") ||
    lowerText.includes("started") ||
    lowerText.includes("🔄") ||
    lowerText.includes("current")
  ) {
    return "inprogress";
  }

  // Default to todo
  return "todo";
}

// Helper function to process any tool call and return appropriate response
export async function processToolCall(
  currentData: WhiteboardData,
  toolName: string,
  toolArgs: any
): Promise<{ newData?: WhiteboardData; response: any }> {
  console.log(`🔧 Processing tool call: ${toolName}`, toolArgs);

  // Check if this is a Jira tool
  const jiraToolNames = [
    "sync_jira_board",
    "update_jira_from_standup",
    "get_team_workload",
    "create_standup_summary",
  ];
  if (jiraToolNames.includes(toolName)) {
    // Check if MCP is available
    if (!isMCPAvailable()) {
      return {
        response: {
          success: false,
          error:
            "Jira integration is not available. Please configure MCP Atlassian client first.",
        },
      };
    }

    // Process Jira tool call (async)
    return await processJiraToolCall(currentData, toolName, toolArgs);
  }

  switch (toolName) {
    case "get_whiteboard_info":
      const info = getWhiteboardInfo(
        currentData,
        toolArgs.query,
        toolArgs.column
      );
      return {
        response: {
          success: true,
          data: info,
          message: `Found ${info.matchingTasks.length} matching tasks`,
        },
      };

    case "move_task":
      const newData = moveTaskByText(
        currentData,
        toolArgs.taskText,
        toolArgs.targetColumn,
        toolArgs.reasoning
      );
      return {
        newData,
        response: {
          success: true,
          message: `Moved task containing "${toolArgs.taskText}" to ${toolArgs.targetColumn} column`,
        },
      };

    case "update_whiteboard":
      const updatedData = processWhiteboardToolCall(currentData, toolArgs);
      return {
        newData: updatedData,
        response: {
          success: true,
          message: "Whiteboard updated successfully",
        },
      };

    default:
      console.warn("❓ Unknown tool:", toolName);
      return {
        response: {
          success: false,
          error: `Unknown tool: ${toolName}`,
        },
      };
  }
}

// Helper function to process tool call and update whiteboard data
export function processWhiteboardToolCall(
  currentData: WhiteboardData,
  toolCall: any
): WhiteboardData {
  const { action, elements, elementIds, reasoning } = toolCall;

  console.log(`🎨 Whiteboard Tool: ${action} - ${reasoning}`);
  console.log("📊 Current data:", currentData);
  console.log("📝 Tool call elements:", elements);

  let newData = { ...currentData };

  switch (action) {
    case "add":
      if (elements) {
        const newElements = elements.map((element: any, index: number) => {
          // For sticky notes, use Kanban-aware positioning
          if (element.type === "sticky" && (!element.x || !element.y)) {
            // Check if this is a meeting summary (contains "standup" or "summary")
            const isSummary =
              element.text &&
              (element.text.toLowerCase().includes("standup") ||
                element.text.toLowerCase().includes("summary") ||
                element.text.toLowerCase().includes("sprint alpha"));

            if (isSummary) {
              // Position summary below columns
              element.x = 450; // Centered
              element.y = 650; // Below main task area
              element.color = element.color || "blue"; // Light blue for summaries
              element.width = 600; // Wider for summary content
            } else {
              // Determine column based on text content for regular tasks
              let column: "todo" | "inprogress" | "done" = "todo";

              if (element.text) {
                column = determineKanbanColumn(element.text);
              }

              // Set appropriate color based on column
              if (!element.color) {
                element.color =
                  column === "todo"
                    ? "yellow"
                    : column === "inprogress"
                    ? "orange"
                    : "green";
              }

              // Count existing elements in the target column to determine Y position
              const columnX =
                column === "todo" ? 100 : column === "inprogress" ? 460 : 820;
              const elementsInColumn = currentData.elements.filter(
                (el) =>
                  Math.abs(el.x - columnX) < 50 && el.y >= 180 && el.y < 650
              );

              const position = generateElementPosition(
                elementsInColumn.length,
                column
              );
              element.x = position.x;
              element.y = position.y;
            }
          } else if (!element.x || !element.y) {
            // For non-sticky elements, use default positioning
            const position = generateElementPosition(
              currentData.elements.length + index
            );
            element.x = position.x;
            element.y = position.y;
          }

          // Ensure element has proper type-specific properties
          return validateAndFixElement(element);
        });

        newData.elements = [...currentData.elements, ...newElements];
      }
      break;

    case "update":
      if (elements) {
        newData.elements = currentData.elements.map((existing) => {
          const update = elements.find((el: any) => el.id === existing.id);
          return update
            ? { ...existing, ...validateAndFixElement(update) }
            : existing;
        });
      }
      break;

    case "remove":
      if (elementIds) {
        newData.elements = currentData.elements.filter(
          (element) => !elementIds.includes(element.id)
        );
      }
      break;

    case "replace":
      if (elements) {
        const validElements = elements.map((element: any, index: number) => {
          if (!element.x || !element.y) {
            const position = generateElementPosition(index);
            element.x = position.x;
            element.y = position.y;
          }
          return validateAndFixElement(element);
        });
        newData.elements = validElements;
      }
      break;
  }

  console.log("✅ Processed whiteboard update:", newData);
  console.log(
    "📈 Element count change:",
    currentData.elements.length,
    "→",
    newData.elements.length
  );

  return newData;
}

function validateAndFixElement(element: any): WhiteboardElement {
  console.log("🔧 Validating element:", element);

  // Ensure required base properties
  const baseElement = {
    id: element.id || `element-${Date.now()}`,
    x: element.x || 100,
    y: element.y || 100,
    type: element.type,
  };

  console.log("🏗️ Base element:", baseElement);

  // Add type-specific properties
  switch (element.type) {
    case "sticky":
      const stickyElement = {
        ...baseElement,
        type: "sticky" as const,
        text: element.text || "New note",
        color: element.color || "yellow",
      };
      console.log("📄 Created sticky note:", stickyElement);
      return stickyElement;

    case "flow-node":
      return {
        ...baseElement,
        type: "flow-node" as const,
        label: element.label || "New Node",
        shape: element.shape || "rectangle",
        connections: element.connections || [],
      };

    case "mermaid":
      return {
        ...baseElement,
        type: "mermaid" as const,
        mermaidCode: element.mermaidCode || "graph TD\n    A --> B",
      };

    case "embed":
      return {
        ...baseElement,
        type: "embed" as const,
        url: element.url || "",
        embedType: element.embedType || "iframe",
      };

    default:
      throw new Error(`Unknown element type: ${element.type}`);
  }
}
