// backend/controller/ai.controller.js
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ============ INITIALIZE APIS ============

// Google Gemini - UPDATED MODEL NAME
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("✅ Google Gemini AI ready (using gemini-1.5-flash)");
  }
} catch (error) {
  console.log("⚠️ Gemini init error:", error.message);
}

// Groq API
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (GROQ_API_KEY) {
  console.log("✅ Groq API ready");
}

// ============ GEMINI AI - UPDATED MODEL ============
async function getGeminiResponse(message) {
  if (!genAI) return null;
  
  try {
    // Updated model name - gemini-1.5-flash is the current free model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(message);
    const response = await result.response;
    const reply = response.text();
    console.log("✅ Response from Gemini");
    return reply;
  } catch (error) {
    console.log("Gemini failed:", error.message);
    return null;
  }
}

// ============ GROQ AI - FIXED ============
async function getGroqResponse(message) {
  if (!GROQ_API_KEY) return null;
  
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "You are a helpful AI assistant. Answer questions thoroughly and helpfully." 
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );
    
    if (response.data?.choices?.[0]?.message?.content) {
      console.log("✅ Response from Groq");
      return response.data.choices[0].message.content;
    }
    return null;
  } catch (error) {
    console.log("Groq failed:", error.response?.data?.error?.message || error.message);
    return null;
  }
}

// ============ COMPLETE C PROGRAMMING RESPONSES (FALLBACK) ============
function getCProgrammingResponse(message) {
  const lower = message.toLowerCase();
  
  // Write a C program
  if (lower.includes("write a c program") || lower.includes("c code for")) {
    if (lower.includes("reverse string")) {
      return `Here's a complete C program to reverse a string:

\`\`\`c
#include <stdio.h>
#include <string.h>

int main() {
    char str[100], temp;
    int i, j;
    
    printf("Enter a string: ");
    fgets(str, sizeof(str), stdin);
    
    // Remove newline character
    str[strcspn(str, "\\n")] = 0;
    
    j = strlen(str) - 1;
    for(i = 0; i < j; i++, j--) {
        temp = str[i];
        str[i] = str[j];
        str[j] = temp;
    }
    
    printf("Reversed string: %s\\n", str);
    return 0;
}
\`\`\`

**How it works:** The program swaps characters from the beginning and end until it reaches the middle.`;
    }
    
    if (lower.includes("factorial")) {
      return `Here's a C program to calculate factorial:

\`\`\`c
#include <stdio.h>

int factorial(int n) {
    if(n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int num;
    printf("Enter a number: ");
    scanf("%d", &num);
    
    if(num < 0) {
        printf("Factorial is not defined for negative numbers\\n");
    } else {
        printf("Factorial of %d is %d\\n", num, factorial(num));
    }
    return 0;
}
\`\`\`

**Explanation:** The function calls itself recursively until it reaches 1.`;
    }
    
    if (lower.includes("prime")) {
      return `Here's a C program to check if a number is prime:

\`\`\`c
#include <stdio.h>

int isPrime(int n) {
    if(n <= 1) return 0;
    for(int i = 2; i <= n/2; i++) {
        if(n % i == 0) return 0;
    }
    return 1;
}

int main() {
    int num;
    printf("Enter a number: ");
    scanf("%d", &num);
    
    if(isPrime(num))
        printf("%d is a prime number\\n", num);
    else
        printf("%d is not a prime number\\n", num);
    return 0;
}
\`\`\`

**How it works:** The program checks if the number is divisible by any number from 2 to n/2.`;
    }
    
    if (lower.includes("fibonacci")) {
      return `Here's a C program to print Fibonacci series:

\`\`\`c
#include <stdio.h>

int main() {
    int n, first = 0, second = 1, next;
    
    printf("Enter number of terms: ");
    scanf("%d", &n);
    
    printf("Fibonacci Series: ");
    for(int i = 0; i < n; i++) {
        printf("%d ", first);
        next = first + second;
        first = second;
        second = next;
    }
    printf("\\n");
    return 0;
}
\`\`\`

**How it works:** Each number is the sum of the two preceding ones.`;
    }
  }
  
  // Explain concepts
  if (lower.includes("explain") || lower.includes("what is")) {
    if (lower.includes("pointer")) {
      return `**Pointers in C - Explained**

A pointer is a variable that stores the memory address of another variable.

**Simple Example:**
\`\`\`c
int num = 42;      // regular variable
int *ptr = &num;   // pointer storing address of num
\`\`\`

**Why Use Pointers?**
• Efficient array/string handling
• Dynamic memory allocation
• Function parameters (pass by reference)

**Common Use:**
\`\`\`c
int x = 10;
int *ptr = &x;
*ptr = 20;  // This changes x to 20!
\`\`\`

Want me to explain pointer arithmetic or double pointers?`;
    }
    
    if (lower.includes("malloc")) {
      return `**malloc() in C - Dynamic Memory Allocation**

malloc() allocates memory on the heap at runtime.

**Syntax:**
\`\`\`c
int *arr = (int*)malloc(5 * sizeof(int));
\`\`\`

**Example:**
\`\`\`c
#include <stdlib.h>

int *arr = (int*)malloc(5 * sizeof(int));
if(arr == NULL) {
    printf("Memory allocation failed\\n");
}
arr[0] = 10;
free(arr);  // Always free memory!
\`\`\`

**Key Points:**
• Returns NULL if allocation fails
• Memory contains garbage values (not initialized)
• Must use free() to prevent memory leaks`;
    }
  }
  
  return null;
}

// ============ MAIN AI FUNCTION ============
export const chatWithMentor = async (req, res) => {
  try {
    let { message, mode = "general", aiProvider = "auto" } = req.body;
    
    if (typeof message === 'object' && message !== null) {
      message = message.message || JSON.stringify(message);
    }
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: "Message is required" });
    }
    
    console.log(`📝 Question: "${message.substring(0, 50)}..."`);

    let reply = null;
    let usedProvider = null;

    // Try Gemini first (updated model)
    if (aiProvider === "gemini" || aiProvider === "auto") {
      reply = await getGeminiResponse(message);
      if (reply) usedProvider = "gemini";
    }
    
    // Try Groq if Gemini fails
    if (!reply && (aiProvider === "groq" || aiProvider === "auto")) {
      reply = await getGroqResponse(message);
      if (reply) usedProvider = "groq";
    }
    
    // Use C programming fallback
    if (!reply) {
      reply = getCProgrammingResponse(message);
      if (reply) usedProvider = "c-fallback";
    }
    
    // Ultimate fallback - always answer
    if (!reply) {
      reply = `I'm here to help with C programming! 💻

**You asked:** "${message}"

**Here's what I can help with:**

📚 **C Programming Topics:**
• Write C programs (reverse string, factorial, prime numbers)
• Explain pointers, malloc, arrays, strings
• Debug your code
• Explain concepts

**Try these specific questions:**
• "Write a C program to reverse a string"
• "Explain pointers in C"
• "How to use malloc?"
• "C program for factorial"

What specific C programming question do you have? I'll give you a detailed answer! 🚀`;
      usedProvider = "fallback";
    }

    res.status(200).json({ reply, usedProvider });
    
  } catch (error) {
    console.error("AI error:", error.message);
    res.status(200).json({ 
      reply: "I'm here to help with C programming! Ask me to write C code, explain pointers, or help with any C programming concept. What would you like to know? 💻"
    });
  }
};

// ============ C PROGRAMMING HELP ENDPOINT ============
export const cProgrammingHelp = async (req, res) => {
  try {
    const { code, question } = req.body;
    let reply = await getGeminiResponse(question || code);
    if (!reply) reply = await getGroqResponse(question || code);
    if (!reply) reply = getCProgrammingResponse(question || code);
    if (!reply) reply = "Share your C code and I'll help you debug it! What specific issue are you facing?";
    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ reply: "Error processing your request. Please try again!" });
  }
};