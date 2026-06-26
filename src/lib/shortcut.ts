import {
  isRegistered,
  register,
  unregister,
  unregisterAll,
} from "@tauri-apps/plugin-global-shortcut";

export function convertToShortcut(event: KeyboardEvent): string {
  const keys: string[] = [];

  // Check if modifier keys are pressed
  if (event.ctrlKey) {
    keys.push("Ctrl");
  } else if (event.metaKey) {
    keys.push("Cmd");
  }
  if (event.altKey) {
    keys.push("Alt");
  }
  if (event.shiftKey) {
    keys.push("Shift");
  }

  // Get the main key pressed
  let mainKey = event.key;

  // Ignore standalone modifier keys
  if (mainKey === "Control" || mainKey === "Meta" || mainKey === "Alt" || mainKey === "Shift") {
    mainKey = "";
  }

  // Convert special key names to standard format
  const keyMap: Record<string, string> = {
    " ": "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Escape: "Esc",
    Enter: "Enter",
  };

  // Function keys: F1-F12 are allowed as standalone shortcuts (no modifier required)
  const functionKeyMatch = mainKey.match(/^F(\d{1,2})$/i);
  if (functionKeyMatch) {
    const num = parseInt(functionKeyMatch[1], 10);
    if (num >= 1 && num <= 24) {
      keys.push(mainKey.toUpperCase());
      const shortcut = keys.join("+");
      console.log("Captured shortcut:", shortcut);
      return shortcut;
    }
  }

  // Must have modifier keys for non-function-key shortcuts
  if (!keys.length) {
    return "";
  }

  // Use mapped value if key exists in keyMap
  if (keyMap[mainKey]) {
    mainKey = keyMap[mainKey];
  } else if (mainKey.length === 1) {
    // Ensure single character keys are uppercase
    mainKey = mainKey.toUpperCase();
  }

  // Add main key to array
  keys.push(mainKey);

  // Build final shortcut string
  const shortcut = keys.join("+");
  console.log("Captured shortcut:", shortcut);
  return shortcut;
}

export async function registerShortcut(
  shortcut: string,
  callback: () => void,
  oldShortcut?: string
): Promise<{ success: boolean; error?: string }> {
  if (oldShortcut) {
    await unregisterShortcut(oldShortcut);
  }
  await unregisterShortcut(shortcut);
  try {
    await register(shortcut, (event) => {
      if (event.state === "Pressed") {
        callback();
      }
    });
    console.log("Shortcut registered successfully:", shortcut);
    return { success: true };
  } catch (e) {
    const errorMsg = String(e);
    console.error("Failed to register shortcut:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function unregisterShortcut(shortcut?: string): Promise<void> {
  if (!shortcut) {
    return;
  }
  try {
    if (!(await isRegistered(shortcut))) {
      return;
    }
    await unregister(shortcut);
  } catch (e) {
    console.error("Failed to unregister shortcut:", e);
  }
}

export async function unregisterAllShortcut(): Promise<void> {
  await unregisterAll();
}
