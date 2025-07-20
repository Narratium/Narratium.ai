/**
 * Get the current display username for character dialogues
 * Returns displayUsername if set, otherwise falls back to login username
 */
export function getDisplayUsername(): string {
  if (typeof window === "undefined") {
    return "";
  }
  
  const displayUsername = localStorage.getItem("displayUsername");
  const loginUsername = localStorage.getItem("username");
  
  return displayUsername || loginUsername || "";
}

/**
 * Set the display username for character dialogues
 */
export function setDisplayUsername(username: string): void {
  if (typeof window === "undefined") {
    return;
  }
  
  localStorage.setItem("displayUsername", username);
  
  // Trigger a custom event to notify components that username has changed
  window.dispatchEvent(new CustomEvent("displayUsernameChanged", {
    detail: { displayUsername: username },
  }));
}

/**
 * Reset display username to login username
 */
export function resetDisplayUsername(): void {
  if (typeof window === "undefined") {
    return;
  }
  
  const loginUsername = localStorage.getItem("username") || "";
  setDisplayUsername(loginUsername);
} 
