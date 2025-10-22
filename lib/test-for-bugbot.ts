/**
 * Test file to verify Bugbot is working
 * This file intentionally contains patterns that Bugbot should catch
 */

// TODO: Bugbot should flag this console.log
console.log("Testing Bugbot!");

// TODO: Bugbot should suggest proper error handling here
export async function fetchUserData(userId: string) {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    return data; // No error handling for failed requests
}

// TODO: Bugbot should flag this 'any' type
export function processData(input: any) {
    return input.toString();
}

// TODO: Bugbot should suggest this could cause performance issues
export function expensiveOperation(items: number[]) {
    for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
            // Nested loop - O(n²) complexity
            if (items[i] === items[j] && i !== j) {
                console.log("Found duplicate"); // Another console.log
            }
        }
    }
}

// TODO: This is good code - Bugbot should be happy
export function wellWrittenFunction(name: string): string {
    if (!name) {
        throw new Error("Name is required");
    }
    return `Hello, ${name}!`;
}
