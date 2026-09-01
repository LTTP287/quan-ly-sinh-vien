import { UserProfile } from "@/types/database";
import { getStoredClasses, getStoredStudents } from "@/lib/classStore";

export const MOCK_LECTURER: UserProfile = {
  id: "lecturer-uuid-1",
  email: "lecturer@university.edu.vn",
  full_name: "TS. Nguyễn Văn A",
  role: "lecturer",
  created_at: new Date().toISOString(),
};

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

// Student Login by Student Code + Password
export async function loginStudent(studentCode: string, password?: string): Promise<AuthResponse> {
  const cleanCode = studentCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: "Vui lòng nhập Mã Sinh Viên" };
  }
  
  // Search across all stored classes for student
  let matchedStudent: UserProfile | undefined;
  if (typeof window !== 'undefined') {
    const classes = getStoredClasses();
    for (const cls of classes) {
      const students = getStoredStudents(cls.id);
      const found = students.find((s) => s.student_code?.toUpperCase() === cleanCode);
      if (found) {
        matchedStudent = found;
        break;
      }
    }
  }

  const userToLogin: UserProfile = matchedStudent || {
    id: `student-${cleanCode}`,
    email: `${cleanCode.toLowerCase()}@student.university.edu.vn`,
    student_code: cleanCode,
    full_name: `Sinh Viên ${cleanCode}`,
    role: "student",
    created_at: new Date().toISOString(),
  };

  return {
    success: true,
    user: userToLogin,
  };
}

// Lecturer Login by Email + Password
export async function loginLecturer(email: string, password?: string): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: "Vui lòng nhập Email Giảng viên" };
  }

  return {
    success: true,
    user: {
      id: `lecturer-${cleanEmail}`,
      email: cleanEmail,
      full_name: cleanEmail.includes("nguyen") ? "TS. Nguyễn Văn A" : "Giảng viên Học Phần",
      role: "lecturer",
      created_at: new Date().toISOString(),
    },
  };
}
