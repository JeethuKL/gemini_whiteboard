import { FunctionDeclaration, Type } from "@google/genai";
import { WhiteboardData, WhiteboardElement } from "../types/whiteboard";

export const whiteboardTools: FunctionDeclaration[] = [
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
            // Determine column based on text content or explicit positioning
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
              (el) => Math.abs(el.x - columnX) < 50 && el.y >= 180
            );

            const position = generateElementPosition(
              elementsInColumn.length,
              column
            );
            element.x = position.x;
            element.y = position.y;
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
