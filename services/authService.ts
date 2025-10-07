import { ref, get, set } from "firebase/database";
import { database } from "./firebase";

export interface User {
  username: string;
  password: string;
  createdAt: number;
}

// Initialize admin user in database
export const initializeAdminUser = async (): Promise<void> => {
  try {
    const adminRef = ref(database, "users/admin");
    const snapshot = await get(adminRef);

    if (!snapshot.exists()) {
      console.log("🔧 Creating admin user...");
      await set(adminRef, {
        username: "admin",
        password: "1234",
        createdAt: Date.now(),
      });
      console.log("✅ Admin user created");
    }
  } catch (error) {
    console.error("❌ Failed to initialize admin user:", error);
  }
};

// Validate password format
export const validatePassword = (
  password: string
): { valid: boolean; message: string } => {
  if (password.length < 6 || password.length > 12) {
    return { valid: false, message: "รหัสผ่านต้องมีความยาว 6-12 ตัวอักษร" };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
    password
  );

  if (!hasLetter || !hasNumberOrSpecial) {
    return {
      valid: false,
      message: "รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขหรืออักขระพิเศษ",
    };
  }

  return { valid: true, message: "" };
};

// Sign up new user
export const signUp = async (
  username: string,
  password: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate username
    if (!username || username.trim().length < 3) {
      return {
        success: false,
        message: "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร",
      };
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message };
    }

    // Check if username already exists
    const userRef = ref(database, `users/${username}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return { success: false, message: "ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว" };
    }

    // Create new user
    await set(userRef, {
      username,
      password,
      createdAt: Date.now(),
    });

    console.log("✅ User created:", username);
    return { success: true, message: "สร้างบัญชีผู้ใช้สำเร็จ" };
  } catch (error) {
    console.error("❌ Sign up failed:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างบัญชี" };
  }
};

// Sign in user
export const signIn = async (
  username: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> => {
  try {
    if (!username || !password) {
      return { success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
    }

    const userRef = ref(database, `users/${username}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      return { success: false, message: "ไม่พบชื่อผู้ใช้นี้ในระบบ" };
    }

    const userData = snapshot.val() as User;

    if (userData.password !== password) {
      return { success: false, message: "รหัสผ่านไม่ถูกต้อง" };
    }

    console.log("✅ User signed in:", username);
    return { success: true, message: "เข้าสู่ระบบสำเร็จ", user: userData };
  } catch (error) {
    console.error("❌ Sign in failed:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" };
  }
};

// Get current user from localStorage
export const getCurrentUser = (): string | null => {
  return localStorage.getItem("currentUser");
};

// Set current user in localStorage
export const setCurrentUser = (username: string): void => {
  localStorage.setItem("currentUser", username);
};

// Clear current user from localStorage
export const clearCurrentUser = (): void => {
  localStorage.removeItem("currentUser");
};

// Get all users (for admin or filtering)
export const getAllUsers = async (): Promise<string[]> => {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      return Object.keys(snapshot.val());
    }

    return [];
  } catch (error) {
    console.error("❌ Failed to get users:", error);
    return [];
  }
};
