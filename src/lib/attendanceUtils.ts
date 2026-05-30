/**
 * Utility functions for attendance status badges and formatting
 */

export type AttendanceStatus = "PRESENT" | "ABSENT" | "WFH" | "LEAVE";

export interface StatusBadgeConfig {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * Get badge configuration for an attendance status
 */
export const getStatusBadgeConfig = (status: AttendanceStatus): StatusBadgeConfig => {
  switch (status) {
    case "PRESENT":
      return {
        label: "Present",
        bgColor: "bg-green-100",
        textColor: "text-green-800",
        borderColor: "border-green-300",
      };
    case "ABSENT":
      return {
        label: "Absent",
        bgColor: "bg-red-100",
        textColor: "text-red-800",
        borderColor: "border-red-300",
      };
    case "WFH":
      return {
        label: "Work From Home",
        bgColor: "bg-blue-100",
        textColor: "text-blue-800",
        borderColor: "border-blue-300",
      };
    case "LEAVE":
      return {
        label: "Leave",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-800",
        borderColor: "border-yellow-300",
      };
    default:
      return {
        label: status,
        bgColor: "bg-gray-100",
        textColor: "text-gray-800",
        borderColor: "border-gray-300",
      };
  }
};

/**
 * Get CSS class string for status badge
 */
export const getStatusBadgeClass = (status: AttendanceStatus): string => {
  const config = getStatusBadgeConfig(status);
  return `${config.bgColor} ${config.textColor} border ${config.borderColor}`;
};

/**
 * Check if status counts as present
 * WFH should be treated as present for statistics
 */
export const isPresent = (status: AttendanceStatus): boolean => {
  return status === "PRESENT" || status === "WFH";
};

/**
 * Format attendance percentage
 */
export const formatAttendancePercentage = (presentDays: number, totalDays: number): string => {
  if (totalDays === 0) return "0%";
  const percentage = (presentDays / totalDays) * 100;
  return `${percentage.toFixed(1)}%`;
};
